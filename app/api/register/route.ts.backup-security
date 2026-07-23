import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Name, E-Mail und Passwort sind erforderlich.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Das Passwort muss mindestens 8 Zeichen lang sein.",
        },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        {
          error:
            "Der E-Mail-Versand ist noch nicht konfiguriert.",
        },
        { status: 500 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        {
          error: "Diese E-Mail ist bereits registriert.",
        },
        { status: 409 }
      );
    }

    const emailVerificationToken = randomBytes(32).toString("hex");

    const emailVerificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    const passwordHash = await hashPassword(password);

    let user;

    if (existingUser) {
      // Noch nicht bestätigter Benutzer:
      // neuen Token erzeugen und E-Mail erneut versenden.
      user = await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          name,
          password: passwordHash,
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
        },
      });
    } else {
      const founderCount = await prisma.user.count({
        where: {
          isFounder: true,
        },
      });

      const getsFounderOffer = founderCount < 50;

      user = await prisma.user.create({
        data: {
          name,
          email,
          password: passwordHash,

          role: "user",
          plan: "free",

          freeGenerationsUsed: 0,
          freeGenerationLimit: 50,

          isFounder: getsFounderOffer,
          founderNumber: getsFounderOffer
            ? founderCount + 1
            : null,
          founderPriceCents: getsFounderOffer ? 1990 : null,

          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
        },
      });
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(req.url).origin
    ).replace(/\/$/, "");

    const verificationUrl =
      `${appUrl}/api/verify-email?token=` +
      encodeURIComponent(emailVerificationToken);

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "info@inserat-ai.ch";

    const resend = new Resend(resendApiKey);

    const { error: resendError } = await resend.emails.send({
      from: `Inserat-AI <${fromEmail}>`,
      to: email,
      subject: "E-Mail-Adresse bestätigen – Inserat-AI",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#0f172a;">
          <h1 style="margin-bottom:16px;">Willkommen bei Inserat-AI</h1>

          <p style="font-size:16px;line-height:1.7;">
            Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.
          </p>

          <a
            href="${verificationUrl}"
            style="
              display:inline-block;
              margin-top:20px;
              padding:14px 24px;
              border-radius:10px;
              background:#f59e0b;
              color:#111827;
              text-decoration:none;
              font-weight:700;
            "
          >
            E-Mail-Adresse bestätigen
          </a>

          <p style="margin-top:28px;font-size:13px;color:#64748b;line-height:1.6;">
            Der Bestätigungslink ist 24 Stunden gültig.
          </p>

          <p style="font-size:13px;color:#64748b;word-break:break-all;">
            ${verificationUrl}
          </p>
        </div>
      `,
      text:
        `Bitte bestätige deine E-Mail-Adresse:\n\n` +
        `${verificationUrl}\n\n` +
        `Der Link ist 24 Stunden gültig.`,
    });

    if (resendError) {
      console.error("RESEND ERROR:", resendError);

      return NextResponse.json(
        {
          error:
            "Das Konto wurde erstellt, aber die Bestätigungs-E-Mail konnte nicht versendet werden. Versuche die Registrierung erneut.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.",
        user: {
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER API ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler bei der Registrierung.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
