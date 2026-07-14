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
      freeGenerationLimit: user.freeGenerationLimit,
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
          error: "Bitte E-Mail-Adresse und Passwort eingeben.",
        },
        { status: 400 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (
      adminEmail &&
      adminPassword &&
      email === adminEmail &&
      password === adminPassword
    ) {
      const adminUser = await prisma.user.upsert({
        where: {
          email: adminEmail,
        },
        update: {
          name: "Admin",
          role: "admin",
          plan: "admin",
          emailVerified: true,
        },
        create: {
          name: "Admin",
          email: adminEmail,
          password: await hashPassword(adminPassword),
          role: "admin",
          plan: "admin",
          emailVerified: true,
        },
      });

      return createLoginResponse(adminUser);
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
          error: "Ungültige E-Mail-Adresse oder falsches Passwort.",
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
          error: "Ungültige E-Mail-Adresse oder falsches Passwort.",
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

    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler beim Login.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}