import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from "@/lib/password";
import {
  createUserSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export const runtime = "nodejs";

type LoginBody = {
  email?: string;
  password?: string;
};

type LoginUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  isFounder: boolean;
  founderNumber: number | null;
  founderPriceCents: number | null;
  freeGenerationsUsed: number;
  freeGenerationLimit: number;
  emailVerified: boolean;
};

const INVALID_LOGIN_MESSAGE =
  "Ungültige E-Mail-Adresse oder falsches Passwort.";

async function createLoginResponse(user: LoginUser) {
  const { token, expiresAt } = await createUserSession(user.id);

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      isFounder: user.isFounder,
      founderNumber: user.founderNumber,
      founderPriceCents: user.founderPriceCents,
      freeGenerationsUsed: user.freeGenerationsUsed,
      freeGenerationLimit: Math.min(user.freeGenerationLimit, 1),
      emailVerified: user.emailVerified,
    },
  });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(expiresAt)
  );

  return response;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_CREDENTIALS",
          error: "Bitte E-Mail-Adresse und Passwort eingeben.",
        },
        { status: 400 }
      );
    }

    if (email.length > 254 || password.length > 128) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CREDENTIALS",
          error: INVALID_LOGIN_MESSAGE,
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CREDENTIALS",
          error: INVALID_LOGIN_MESSAGE,
        },
        { status: 401 }
      );
    }

    const passwordIsValid = await verifyPassword(
      password,
      user.password
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CREDENTIALS",
          error: INVALID_LOGIN_MESSAGE,
        },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_VERIFIED",
          error:
            "Bitte bestätige zuerst deine E-Mail-Adresse. Prüfe auch deinen Spam-Ordner.",
        },
        { status: 403 }
      );
    }

    /*
     * Übergangsschutz für ältere Konten, deren Passwort eventuell
     * noch nicht als scrypt-Hash gespeichert wurde.
     */
    if (!isHashedPassword(user.password)) {
      const passwordHash = await hashPassword(password);

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: passwordHash,
        },
      });
    }

    return createLoginResponse(user);
  } catch (error) {
    console.error("LOGIN API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        code: "LOGIN_UNAVAILABLE",
        error:
          "Die Anmeldung konnte momentan nicht verarbeitet werden.",
      },
      { status: 500 }
    );
  }
}
