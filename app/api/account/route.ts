import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

type AccountPayload = {
  name?: unknown;
  company?: unknown;
  phone?: unknown;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine aktive Sitzung gefunden.",
        },
        { status: 401 }
      );
    }

        const accountLogo =
      await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          companyLogoUrl: true,
        },
      });
return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        phone: user.phone,

        companyLogoUrl: accountLogo?.companyLogoUrl ?? null,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("ACCOUNT GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Die Kontodaten konnten nicht geladen werden.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine aktive Sitzung gefunden.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | AccountPayload
      | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "Ungültige Kontodaten.",
        },
        { status: 400 }
      );
    }

    const name = cleanText(body.name);
    const company = cleanText(body.company);
    const phone = cleanText(body.phone);

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        {
          success: false,
          error: "Der Name muss zwischen 2 und 80 Zeichen lang sein.",
        },
        { status: 400 }
      );
    }

    if (company.length > 120) {
      return NextResponse.json(
        {
          success: false,
          error: "Der Firmenname darf höchstens 120 Zeichen lang sein.",
        },
        { status: 400 }
      );
    }

    if (phone.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error: "Die Telefonnummer darf höchstens 40 Zeichen lang sein.",
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
        company: company || null,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true,

        companyLogoUrl: true,
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kontaktdaten wurden gespeichert.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("ACCOUNT PATCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Die Kontodaten konnten nicht gespeichert werden.",
      },
      { status: 500 }
    );
  }
}
