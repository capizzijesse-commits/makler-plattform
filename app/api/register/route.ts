import {
  createHash,
  randomBytes,
} from "node:crypto";

import { NextResponse } from "next/server";
import { Resend } from "resend";

import { getAppUrl } from "@/lib/app-url";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type AppLocale =
  | "de"
  | "it"
  | "fr"
  | "en";

type RequestedPlan =
  | ""
  | "founder"
  | "single-object";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
  plan?: string;
  locale?: string;
};

type RegisterErrorCode =
  | "INVALID_JSON"
  | "MISSING_FIELDS"
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "INVALID_PASSWORD"
  | "SERVICE_UNAVAILABLE"
  | "EMAIL_SEND_FAILED"
  | "PROCESSING_FAILED";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supportedLocales: AppLocale[] = [
  "de",
  "it",
  "fr",
  "en",
];

const copy = {
  de: {
    success:
      "Falls die E-Mail-Adresse verwendet werden kann, wurde eine Bestätigungs-E-Mail versendet.",

    errors: {
      INVALID_JSON:
        "Die Registrierungsdaten sind ungültig.",
      MISSING_FIELDS:
        "Name, E-Mail und Passwort sind erforderlich.",
      INVALID_NAME:
        "Der Name muss zwischen 2 und 100 Zeichen lang sein.",
      INVALID_EMAIL:
        "Bitte gib eine gültige E-Mail-Adresse ein.",
      INVALID_PASSWORD:
        "Das Passwort muss zwischen 8 und 128 Zeichen lang sein.",
      SERVICE_UNAVAILABLE:
        "Die Registrierung ist momentan nicht verfügbar.",
      EMAIL_SEND_FAILED:
        "Die Bestätigungs-E-Mail konnte momentan nicht versendet werden.",
      PROCESSING_FAILED:
        "Die Registrierung konnte momentan nicht verarbeitet werden.",
    },

    email: {
      subject:
        "E-Mail-Adresse bestätigen – Inserat-AI",
      title:
        "Willkommen bei Inserat-AI",
      intro:
        "Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.",
      button:
        "E-Mail-Adresse bestätigen",
      expiry:
        "Der Bestätigungslink ist 24 Stunden gültig und kann nur einmal verwendet werden.",
      ignore:
        "Falls du kein Inserat-AI-Konto erstellt hast, ignoriere diese E-Mail und bestätige den Link nicht.",
    },
  },

  it: {
    success:
      "Se l’indirizzo e-mail può essere utilizzato, è stata inviata un’e-mail di conferma.",

    errors: {
      INVALID_JSON:
        "I dati di registrazione non sono validi.",
      MISSING_FIELDS:
        "Nome, e-mail e password sono obbligatori.",
      INVALID_NAME:
        "Il nome deve contenere da 2 a 100 caratteri.",
      INVALID_EMAIL:
        "Inserisci un indirizzo e-mail valido.",
      INVALID_PASSWORD:
        "La password deve contenere da 8 a 128 caratteri.",
      SERVICE_UNAVAILABLE:
        "La registrazione non è momentaneamente disponibile.",
      EMAIL_SEND_FAILED:
        "Al momento non è stato possibile inviare l’e-mail di conferma.",
      PROCESSING_FAILED:
        "Al momento non è stato possibile elaborare la registrazione.",
    },

    email: {
      subject:
        "Conferma il tuo indirizzo e-mail – Inserat-AI",
      title:
        "Benvenuto su Inserat-AI",
      intro:
        "Conferma il tuo indirizzo e-mail per attivare l’account.",
      button:
        "Conferma l’indirizzo e-mail",
      expiry:
        "Il link di conferma è valido per 24 ore e può essere utilizzato una sola volta.",
      ignore:
        "Se non hai creato un account Inserat-AI, ignora questa e-mail e non confermare il link.",
    },
  },

  fr: {
    success:
      "Si l’adresse e-mail peut être utilisée, un e-mail de confirmation a été envoyé.",

    errors: {
      INVALID_JSON:
        "Les données d’inscription ne sont pas valides.",
      MISSING_FIELDS:
        "Le nom, l’adresse e-mail et le mot de passe sont obligatoires.",
      INVALID_NAME:
        "Le nom doit comporter entre 2 et 100 caractères.",
      INVALID_EMAIL:
        "Veuillez saisir une adresse e-mail valide.",
      INVALID_PASSWORD:
        "Le mot de passe doit comporter entre 8 et 128 caractères.",
      SERVICE_UNAVAILABLE:
        "L’inscription est momentanément indisponible.",
      EMAIL_SEND_FAILED:
        "L’e-mail de confirmation n’a pas pu être envoyé pour le moment.",
      PROCESSING_FAILED:
        "L’inscription n’a pas pu être traitée pour le moment.",
    },

    email: {
      subject:
        "Confirmez votre adresse e-mail – Inserat-AI",
      title:
        "Bienvenue sur Inserat-AI",
      intro:
        "Veuillez confirmer votre adresse e-mail afin d’activer votre compte.",
      button:
        "Confirmer l’adresse e-mail",
      expiry:
        "Le lien de confirmation est valable pendant 24 heures et ne peut être utilisé qu’une seule fois.",
      ignore:
        "Si vous n’avez pas créé de compte Inserat-AI, ignorez cet e-mail et ne confirmez pas le lien.",
    },
  },

  en: {
    success:
      "If the email address can be used, a confirmation email has been sent.",

    errors: {
      INVALID_JSON:
        "The registration data is invalid.",
      MISSING_FIELDS:
        "Name, email and password are required.",
      INVALID_NAME:
        "The name must be between 2 and 100 characters long.",
      INVALID_EMAIL:
        "Please enter a valid email address.",
      INVALID_PASSWORD:
        "The password must be between 8 and 128 characters long.",
      SERVICE_UNAVAILABLE:
        "Registration is currently unavailable.",
      EMAIL_SEND_FAILED:
        "The confirmation email could not be sent at this time.",
      PROCESSING_FAILED:
        "The registration could not be processed at this time.",
    },

    email: {
      subject:
        "Confirm your email address – Inserat-AI",
      title:
        "Welcome to Inserat-AI",
      intro:
        "Please confirm your email address to activate your account.",
      button:
        "Confirm email address",
      expiry:
        "The confirmation link is valid for 24 hours and can only be used once.",
      ignore:
        "If you did not create an Inserat-AI account, ignore this email and do not confirm the link.",
    },
  },
} as const;

function isAppLocale(
  value: string | undefined
): value is AppLocale {
  return supportedLocales.includes(
    value as AppLocale
  );
}

function getRequestedPlan(
  value: string | undefined
): RequestedPlan {
  const normalized =
    value?.trim().toLowerCase();

  if (
    normalized === "founder" ||
    normalized === "single-object"
  ) {
    return normalized;
  }

  return "";
}

function hashVerificationToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function errorResponse(
  locale: AppLocale,
  errorCode: RegisterErrorCode,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      error:
        copy[locale].errors[errorCode],
    },
    {
      status,
    }
  );
}

export async function POST(
  request: Request
) {
  let locale: AppLocale = "de";

  try {
    let body: RegisterBody;

    try {
      body =
        (await request.json()) as RegisterBody;
    } catch {
      return errorResponse(
        locale,
        "INVALID_JSON",
        400
      );
    }

    if (isAppLocale(body.locale)) {
      locale = body.locale;
    }

    const name =
      body.name?.trim() ?? "";

    const email =
      body.email
        ?.trim()
        .toLowerCase() ?? "";

    /*
     * Das Passwort absichtlich nicht
     * mit trim() verändern.
     */
    const password =
      body.password ?? "";

    const requestedPlan =
      getRequestedPlan(body.plan);

    if (!name || !email || !password) {
      return errorResponse(
        locale,
        "MISSING_FIELDS",
        400
      );
    }

    if (
      name.length < 2 ||
      name.length > 100
    ) {
      return errorResponse(
        locale,
        "INVALID_NAME",
        400
      );
    }

    if (
      email.length > 254 ||
      !EMAIL_PATTERN.test(email)
    ) {
      return errorResponse(
        locale,
        "INVALID_EMAIL",
        400
      );
    }

    if (
      password.length < 8 ||
      password.length > 128
    ) {
      return errorResponse(
        locale,
        "INVALID_PASSWORD",
        400
      );
    }

    const resendApiKey =
      process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error(
        "RESEND_API_KEY fehlt."
      );

      return errorResponse(
        locale,
        "SERVICE_UNAVAILABLE",
        500
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          emailVerified: true,
          emailVerificationExpires: true,
        },
      });

    if (existingUser?.emailVerified) {
      return NextResponse.json({
        success: true,
        message: copy[locale].success,
      });
    }

    if (
      existingUser
        ?.emailVerificationExpires &&
      existingUser
        .emailVerificationExpires
        .getTime() >
        Date.now() +
          23 * 60 * 60 * 1000
    ) {
      return NextResponse.json({
        success: true,
        message: copy[locale].success,
      });
    }

    const rawVerificationToken =
      randomBytes(32).toString("hex");

    const verificationTokenHash =
      hashVerificationToken(
        rawVerificationToken
      );

    const emailVerificationExpires =
      new Date(
        Date.now() +
          24 * 60 * 60 * 1000
      );

    let userId: string;

    if (existingUser) {
      const updatedUser =
        await prisma.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            emailVerificationToken:
              verificationTokenHash,
            emailVerificationExpires,
          },
          select: {
            id: true,
          },
        });

      userId = updatedUser.id;
    } else {
      const passwordHash =
        await hashPassword(password);

      const createdUser =
        await prisma.user.create({
          data: {
            name,
            email,
            password: passwordHash,
            role: "user",
            plan: "free",
            freeGenerationsUsed: 0,
            freeGenerationLimit: 1,
            isFounder: false,
            founderNumber: null,
            founderPriceCents: null,
            emailVerified: false,
            emailVerificationToken:
              verificationTokenHash,
            emailVerificationExpires,
          },
          select: {
            id: true,
          },
        });

      userId = createdUser.id;
    }

    const appUrl =
      getAppUrl(request.url);

    const verificationParameters =
      new URLSearchParams({
        token: rawVerificationToken,
      });

    if (requestedPlan) {
      verificationParameters.set(
        "plan",
        requestedPlan
      );
    }

    const verificationUrl =
      appUrl +
      "/api/verify-email?" +
      verificationParameters.toString();

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "info@inserat-ai.ch";

    const resend =
      new Resend(resendApiKey);

    const emailCopy =
      copy[locale].email;

    const {
      error: resendError,
    } = await resend.emails.send({
      from:
        "Inserat-AI <" +
        fromEmail +
        ">",
      to: email,
      subject: emailCopy.subject,

      html: `
        <div
          style="
            font-family:Arial,sans-serif;
            max-width:600px;
            margin:auto;
            padding:32px;
            color:#0f172a;
          "
        >
          <div
            style="
              margin-bottom:24px;
              padding:22px;
              border-radius:18px;
              background:linear-gradient(
                135deg,
                #071020,
                #0f172a
              );
              color:#ffffff;
            "
          >
            <div
              style="
                color:#fbbf24;
                font-size:12px;
                font-weight:800;
                letter-spacing:0.14em;
              "
            >
              INSERAT-AI
            </div>

            <h1
              style="
                margin:10px 0 0;
                font-size:28px;
              "
            >
              ${emailCopy.title}
            </h1>
          </div>

          <p
            style="
              font-size:16px;
              line-height:1.7;
            "
          >
            ${emailCopy.intro}
          </p>

          <a
            href="${verificationUrl}"
            style="
              display:inline-block;
              margin-top:20px;
              padding:14px 24px;
              border-radius:12px;
              background:linear-gradient(
                135deg,
                #fcd34d,
                #f59e0b
              );
              color:#111827;
              text-decoration:none;
              font-weight:800;
            "
          >
            ${emailCopy.button}
          </a>

          <p
            style="
              margin-top:28px;
              font-size:13px;
              color:#64748b;
              line-height:1.6;
            "
          >
            ${emailCopy.expiry}
          </p>

          <p
            style="
              font-size:13px;
              color:#64748b;
              line-height:1.6;
            "
          >
            ${emailCopy.ignore}
          </p>

          <p
            style="
              font-size:12px;
              color:#94a3b8;
              word-break:break-all;
            "
          >
            ${verificationUrl}
          </p>
        </div>
      `,

      text:
        emailCopy.intro +
        "\n\n" +
        verificationUrl +
        "\n\n" +
        emailCopy.expiry +
        "\n\n" +
        emailCopy.ignore,
    });

    if (resendError) {
      console.error(
        "REGISTER VERIFICATION EMAIL ERROR:",
        resendError
      );

      await prisma.user.updateMany({
        where: {
          id: userId,
          emailVerificationToken:
            verificationTokenHash,
        },
        data: {
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      return errorResponse(
        locale,
        "EMAIL_SEND_FAILED",
        502
      );
    }

    return NextResponse.json({
      success: true,
      message: copy[locale].success,
    });
  } catch (error) {
    console.error(
      "REGISTER API ERROR:",
      error
    );

    return errorResponse(
      locale,
      "PROCESSING_FAILED",
      500
    );
  }
}