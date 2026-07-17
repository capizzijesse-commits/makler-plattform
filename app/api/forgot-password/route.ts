import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ForgotPasswordBody = {
  email?: string;
};

const GENERIC_SUCCESS_MESSAGE =
  "Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.";

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ForgotPasswordBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Bitte gib deine E-Mail-Adresse ein.",
        },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY fehlt.");

      return NextResponse.json(
        {
          success: false,
          error:
            "Der E-Mail-Versand ist derzeit nicht verfügbar.",
        },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        passwordResetRequestedAt: true,
      },
    });

    /*
     * Immer dieselbe Antwort zurückgeben.
     * Dadurch kann niemand prüfen, ob eine E-Mail registriert ist.
     */
    if (!user || !user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    /*
     * Verhindert wiederholten Versand innerhalb von 60 Sekunden.
     */
    if (
      user.passwordResetRequestedAt &&
      user.passwordResetRequestedAt.getTime() >
        Date.now() - 60 * 1000
    ) {
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: expiresAt,
        passwordResetRequestedAt: new Date(),
      },
    });

    const requestOrigin = new URL(request.url).origin;

    const configuredAppUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

    const appUrl =
      process.env.NODE_ENV === "development"
        ? requestOrigin
        : configuredAppUrl || requestOrigin;

    const resetUrl =
      `${appUrl}/reset-password?token=` +
      encodeURIComponent(rawToken);

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "info@inserat-ai.ch";

    const resend = new Resend(resendApiKey);

    const { error: resendError } = await resend.emails.send({
      from: `Inserat-AI <${fromEmail}>`,
      to: user.email,
      subject: "Passwort zurücksetzen – Inserat-AI",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#0f172a;">
          <h1 style="margin-bottom:16px;">
            Passwort zurücksetzen
          </h1>

          <p style="font-size:16px;line-height:1.7;">
            Hallo ${user.name},
          </p>

          <p style="font-size:16px;line-height:1.7;">
            Du hast angefordert, dein Passwort für Inserat-AI
            zurückzusetzen.
          </p>

          <a
            href="${resetUrl}"
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
            Neues Passwort festlegen
          </a>

          <p style="margin-top:28px;font-size:13px;color:#64748b;line-height:1.6;">
            Der Link ist 60 Minuten gültig und kann nur einmal
            verwendet werden.
          </p>

          <p style="font-size:13px;color:#64748b;line-height:1.6;">
            Falls du diese Anfrage nicht gestellt hast, kannst du
            diese E-Mail ignorieren.
          </p>

          <p style="font-size:13px;color:#64748b;word-break:break-all;">
            ${resetUrl}
          </p>
        </div>
      `,
      text:
        `Hallo ${user.name},\n\n` +
        `über diesen Link kannst du dein Inserat-AI-Passwort zurücksetzen:\n\n` +
        `${resetUrl}\n\n` +
        `Der Link ist 60 Minuten gültig und kann nur einmal verwendet werden.`,
    });

    if (resendError) {
      console.error("PASSWORD RESET RESEND ERROR:", resendError);

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordResetTokenHash: null,
          passwordResetExpires: null,
          passwordResetRequestedAt: null,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Die E-Mail konnte momentan nicht versendet werden. Bitte versuche es später erneut.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS_MESSAGE,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Anfrage konnte momentan nicht verarbeitet werden.",
      },
      { status: 500 }
    );
  }
}