import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


type UserRow = {
  id: string;
  name: string;
  email: string;
  company:
    | string
    | null;
};


function maskEmail(
  email: string
): string {
  const parts =
    email.split("@");

  if (
    parts.length !== 2
  ) {
    return email;
  }

  const local =
    parts[0] || "";

  const domain =
    parts[1] || "";

  const visible =
    local.slice(0, 1);

  return `${visible}***@${domain}`;
}


export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }


    const query =
      (
        request.nextUrl
          .searchParams
          .get("q") || ""
      )
        .trim()
        .slice(0, 120);


    if (
      query.length < 2
    ) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }


    const pattern =
      `%${query}%`;


    const rows =
      await prisma.$queryRaw<
        UserRow[]
      >`
        SELECT
          "id",
          "name",
          "email",
          "company"
        FROM
          "User"
        WHERE
          "id" <> ${user.id}
        AND
          (
            "name" ILIKE ${pattern}
            OR
            COALESCE(
              "company",
              ''
            ) ILIKE ${pattern}
            OR
            "email" ILIKE ${pattern}
          )
        ORDER BY
          CASE
            WHEN LOWER("email") =
              LOWER(${query})
            THEN 0
            ELSE 1
          END,
          "name" ASC
        LIMIT 12
      `;


    const normalized =
      rows.map(
        (item) => ({
          id:
            item.id,

          name:
            item.name,

          company:
            item.company,

          email:
            item.email
              .toLowerCase() ===
            query.toLowerCase()
              ? item.email
              : null,

          emailHint:
            maskEmail(
              item.email
            ),
        })
      );


    return NextResponse.json({
      success: true,
      users:
        normalized,
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT USER SEARCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Nutzersuche ist momentan nicht verfügbar.",
      },
      {
        status: 500,
      }
    );
  }
}