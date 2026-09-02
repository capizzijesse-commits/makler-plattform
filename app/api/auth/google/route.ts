import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createUserSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export const runtime = "nodejs";

type GoogleAuthBody = {
  credential?: string;
};

const googleClient = new OAuth2Client();

function errorResponse(
  code: string,
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      code,
      error: message,
    },
    {
      status,
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    const clientId =
      process.env.GOOGLE_CLIENT_ID?.trim();

    if (!clientId) {
      console.error(
        "GOOGLE_CLIENT_ID fehlt."
      );

      return errorResponse(
        "GOOGLE_AUTH_UNAVAILABLE",
        "Die Google-Anmeldung ist momentan nicht verfügbar.",
        503
      );
    }

    let body: GoogleAuthBody;

    try {
      body =
        (await request.json()) as GoogleAuthBody;
    } catch {
      return errorResponse(
        "INVALID_REQUEST",
        "Die Google-Anmeldung konnte nicht verarbeitet werden.",
        400
      );
    }

    const credential =
      body.credential?.trim();

    if (!credential) {
      return errorResponse(
        "MISSING_GOOGLE_CREDENTIAL",
        "Die Google-Anmeldedaten fehlen.",
        400
      );
    }

    const ticket =
      await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

    const payload =
      ticket.getPayload();

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return errorResponse(
        "INVALID_GOOGLE_ACCOUNT",
        "Das Google-Konto konnte nicht verifiziert werden.",
        401
      );
    }

    const googleSub =
      payload.sub;

    const email =
      payload.email
        .trim()
        .toLowerCase();

    if (
      !email ||
      email.length > 254
    ) {
      return errorResponse(
        "INVALID_GOOGLE_ACCOUNT",
        "Das Google-Konto enthält keine gültige E-Mail-Adresse.",
        401
      );
    }

    const fallbackName =
      email.split("@")[0] ||
      "Inserat-AI Nutzer";

    const name =
      payload.name
        ?.trim()
        .slice(0, 100) ||
      fallbackName.slice(0, 100);

    /*
     * Zuerst über die stabile Google-ID suchen.
     */
    let user =
      await prisma.user.findUnique({
        where: {
          googleSub,
        },
      });

    if (!user) {
      const existingByEmail =
        await prisma.user.findUnique({
          where: {
            email,
          },
        });

      if (existingByEmail) {
        /*
         * Ein bestehendes Konto darf nur mit Google
         * verbunden werden, wenn dessen E-Mail bereits
         * über Inserat-AI bestätigt wurde.
         */
        if (
          !existingByEmail.emailVerified
        ) {
          return errorResponse(
            "ACCOUNT_LINK_REQUIRES_VERIFICATION",
            "Bitte bestätige zuerst deine bestehende Inserat-AI-E-Mail-Adresse.",
            409
          );
        }

        /*
         * Niemals ein bereits mit einem anderen
         * Google-Konto verbundenes Konto überschreiben.
         */
        if (
          existingByEmail.googleSub &&
          existingByEmail.googleSub !==
            googleSub
        ) {
          return errorResponse(
            "GOOGLE_ACCOUNT_CONFLICT",
            "Dieses Inserat-AI-Konto ist bereits mit einem anderen Google-Konto verbunden.",
            409
          );
        }

        user =
          await prisma.user.update({
            where: {
              id:
                existingByEmail.id,
            },
            data: {
              googleSub,
            },
          });
      } else {
        /*
         * Neues Google-Konto.
         * Kein erfundenes Passwort:
         * password bleibt null.
         */
        user =
          await prisma.user.create({
            data: {
              name,
              email,
              googleSub,
              password: null,
              role: "user",
              plan: "free",
              freeGenerationsUsed: 0,
              freeGenerationLimit: 1,
              isFounder: false,
              founderNumber: null,
              founderPriceCents: null,

              /*
               * Google hat die E-Mail des
               * ID-Tokens bereits bestätigt.
               */
              emailVerified: true,
              emailVerificationToken:
                null,
              emailVerificationExpires:
                null,
            },
          });
      }
    }

    /*
     * Zusätzlicher Konsistenzschutz:
     * Google-ID und E-Mail dürfen nicht
     * unerwartet auseinanderlaufen.
     */
    if (
      user.googleSub !== googleSub
    ) {
      return errorResponse(
        "GOOGLE_ACCOUNT_CONFLICT",
        "Das Google-Konto konnte nicht eindeutig zugeordnet werden.",
        409
      );
    }

    const {
      token,
      expiresAt,
    } = await createUserSession(
      user.id
    );

    const response =
      NextResponse.json({
        success: true,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: user.plan,
          isFounder:
            user.isFounder,
          founderNumber:
            user.founderNumber,
          founderPriceCents:
            user.founderPriceCents,
          freeGenerationsUsed:
            user.freeGenerationsUsed,
          freeGenerationLimit:
            Math.min(
              user.freeGenerationLimit,
              1
            ),
          emailVerified:
            user.emailVerified,
        },
      });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(
        expiresAt
      )
    );

    return response;
  } catch (error) {
    console.error(
      "GOOGLE AUTH API ERROR:",
      error
    );

    return errorResponse(
      "GOOGLE_AUTH_FAILED",
      "Die Google-Anmeldung konnte momentan nicht verarbeitet werden.",
      500
    );
  }
}