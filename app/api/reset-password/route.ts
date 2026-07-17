import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ResetPasswordBody = {
  token?: string;
  password?: string;
};

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordBody;

    const token = body.token?.trim();
    const password = body.password;

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Reset-Token und neues Passwort sind erforderlich.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
        },
        { status: 400 }
      );
    }

    const tokenHash = hashResetToken(token);
    const now = new Date();

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: {
          gt: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_OR_EXPIRED_TOKEN",
          error:
            "Der Link ist ungültig, abgelaufen oder wurde bereits verwendet.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const resetSuccessful = await prisma.$transaction(
      async (transaction) => {
        /*
         * updateMany stellt sicher, dass derselbe Link nicht durch zwei
         * gleichzeitige Anfragen mehrfach verwendet werden kann.
         */
        const updatedUser = await transaction.user.updateMany({
          where: {
            id: user.id,
            passwordResetTokenHash: tokenHash,
            passwordResetExpires: {
              gt: new Date(),
            },
          },
          data: {
            password: passwordHash,
            passwordResetTokenHash: null,
            passwordResetExpires: null,
            passwordResetRequestedAt: null,
          },
        });

        if (updatedUser.count !== 1) {
          return false;
        }

        /*
         * Alle bisherigen Sitzungen löschen.
         * Der Benutzer muss sich danach mit dem neuen Passwort anmelden.
         */
        await transaction.session.deleteMany({
          where: {
            userId: user.id,
          },
        });

        return true;
      }
    );

    if (!resetSuccessful) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_OR_EXPIRED_TOKEN",
          error:
            "Der Link ist ungültig, abgelaufen oder wurde bereits verwendet.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt anmelden.",
    });
  } catch (error) {
    console.error("RESET PASSWORD API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Passwort konnte momentan nicht geändert werden.",
      },
      { status: 500 }
    );
  }
}