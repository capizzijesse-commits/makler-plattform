import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function redirectToLogin(
  request: Request,
  status: string
) {
  const appUrl = getAppUrl(request.url);

  return NextResponse.redirect(
    new URL(`/login?verified=${status}`, appUrl)
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return redirectToLogin(request, "missing");
    }

    if (token.length > 128) {
      return redirectToLogin(request, "invalid");
    }

    const tokenHash = hashVerificationToken(token);
    const now = new Date();

    /*
     * Der Klartextvergleich bleibt nur vorübergehend erhalten,
     * damit bereits versendete alte Links weiterhin funktionieren.
     * Neue Registrierungen speichern ausschliesslich den Hash.
     */
    const tokenConditions = [
      {
        emailVerificationToken: tokenHash,
      },
      {
        emailVerificationToken: token,
      },
    ];

    const user = await prisma.user.findFirst({
      where: {
        emailVerified: false,
        emailVerificationExpires: {
          gt: now,
        },
        OR: tokenConditions,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return redirectToLogin(request, "invalid");
    }

    /*
     * Atomare Aktualisierung verhindert, dass derselbe Link
     * durch parallele Anfragen mehrfach verwendet wird.
     */
    const verifiedUser = await prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerified: false,
        emailVerificationExpires: {
          gt: new Date(),
        },
        OR: tokenConditions,
      },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    if (verifiedUser.count !== 1) {
      return redirectToLogin(request, "invalid");
    }

    return redirectToLogin(request, "success");
  } catch (error) {
    console.error("VERIFY EMAIL API ERROR:", error);

    try {
      return redirectToLogin(request, "error");
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die E-Mail-Adresse konnte momentan nicht bestätigt werden.",
        },
        { status: 500 }
      );
    }
  }
}
