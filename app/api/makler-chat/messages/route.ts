import {
  randomUUID,
} from "node:crypto";

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


type MembershipRow = {
  conversationId: string;
};


type MessageRow = {
  id: string;
  conversationId: string;
  senderUserId:
    | string
    | null;
  senderType: string;
  content: string;
  createdAt: Date;
  senderName:
    | string
    | null;
  senderCompany:
    | string
    | null;
};


function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
}


function textValue(
  value: unknown,
  maxLength: number
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  return clean.slice(
    0,
    maxLength
  );
}


async function ensureMembership(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const rows =
    await prisma.$queryRaw<
      MembershipRow[]
    >`
      SELECT
        "conversationId"
      FROM
        "MaklerChatParticipant"
      WHERE
        "conversationId" =
          ${conversationId}
      AND
        "userId" =
          ${userId}
      LIMIT 1
    `;

  return Boolean(
    rows[0]
  );
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


    const conversationId =
      textValue(
        request.nextUrl
          .searchParams
          .get(
            "conversationId"
          ),
        120
      );


    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gespräch fehlt.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !await ensureMembership(
        conversationId,
        user.id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kein Zugriff auf dieses Gespräch.",
        },
        {
          status: 403,
        }
      );
    }


    const messages =
      await prisma.$queryRaw<
        MessageRow[]
      >`
        SELECT
          m."id",
          m."conversationId",
          m."senderUserId",
          m."senderType",
          m."content",
          m."createdAt",
          u."name"
            AS "senderName",
          u."company"
            AS "senderCompany"
        FROM
          "MaklerChatMessage" m
        LEFT JOIN
          "User" u
        ON
          u."id" =
            m."senderUserId"
        WHERE
          m."conversationId" =
            ${conversationId}
        ORDER BY
          m."createdAt" ASC
        LIMIT 200
      `;


    await prisma.$executeRaw`
      UPDATE
        "MaklerChatParticipant"
      SET
        "lastReadAt" =
          CURRENT_TIMESTAMP
      WHERE
        "conversationId" =
          ${conversationId}
      AND
        "userId" =
          ${user.id}
    `;


    return NextResponse.json({
      success: true,

      messages:
        messages.map(
          (message) => ({
            ...message,

            isMine:
              message
                .senderUserId ===
              user.id,
          })
        ),
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT MESSAGES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Nachrichten konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}


export async function POST(
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


    const body: unknown =
      await request
        .json()
        .catch(
          () => null
        );


    if (!isRecord(body)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Nachricht konnte nicht gelesen werden.",
        },
        {
          status: 400,
        }
      );
    }


    const conversationId =
      textValue(
        body.conversationId,
        120
      );


    const content =
      textValue(
        body.content,
        8_000
      );


    if (
      !conversationId ||
      !content
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gespräch oder Nachricht fehlt.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !await ensureMembership(
        conversationId,
        user.id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kein Zugriff auf dieses Gespräch.",
        },
        {
          status: 403,
        }
      );
    }


    const id =
      randomUUID();


    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO
          "MaklerChatMessage"
          (
            "id",
            "conversationId",
            "senderUserId",
            "senderType",
            "content",
            "createdAt"
          )
        VALUES
          (
            ${id},
            ${conversationId},
            ${user.id},
            'USER',
            ${content},
            CURRENT_TIMESTAMP
          )
      `,

      prisma.$executeRaw`
        UPDATE
          "MaklerChatConversation"
        SET
          "updatedAt" =
            CURRENT_TIMESTAMP
        WHERE
          "id" =
            ${conversationId}
      `,

      prisma.$executeRaw`
        UPDATE
          "MaklerChatParticipant"
        SET
          "lastReadAt" =
            CURRENT_TIMESTAMP
        WHERE
          "conversationId" =
            ${conversationId}
        AND
          "userId" =
            ${user.id}
      `,
    ]);


    return NextResponse.json({
      success: true,

      message: {
        id,
        conversationId,
        senderUserId:
          user.id,
        senderType:
          "USER",
        content,
        senderName:
          user.name,
        senderCompany:
          user.company ?? null,
        createdAt:
          new Date(),
        isMine:
          true,
      },
    });

  } catch (error) {
    console.error(
      "MAKLER CHAT MESSAGES POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Nachricht konnte nicht gesendet werden.",
      },
      {
        status: 500,
      }
    );
  }
}