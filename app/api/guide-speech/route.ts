import type { NextRequest } from "next/server";
import OpenAI from "openai";

import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportedLocale = "de" | "it" | "fr" | "en";

type GuideSpeechBody = {
  text?: unknown;
  locale?: unknown;
};

type SpeechCopy = {
  login: string;
  unavailable: string;
  invalidRequest: string;
  missingText: string;
  busy: string;
  failed: string;
};

const SPEECH_COPY: Record<SupportedLocale, SpeechCopy> = {
  de: {
    login: "Bitte zuerst einloggen.",
    unavailable:
      "Die Sprachausgabe ist momentan nicht verfügbar.",
    invalidRequest:
      "Die Sprachanfrage konnte nicht gelesen werden.",
    missingText:
      "Es wurde kein Text zum Vorlesen übermittelt.",
    busy:
      "Die Sprachausgabe ist momentan stark ausgelastet. Bitte versuche es gleich nochmals.",
    failed:
      "Die realistische Stimme konnte momentan nicht erstellt werden.",
  },
  it: {
    login: "Effettua prima l’accesso.",
    unavailable:
      "La riproduzione vocale non è momentaneamente disponibile.",
    invalidRequest:
      "Non è stato possibile leggere la richiesta vocale.",
    missingText:
      "Non è stato trasmesso alcun testo da leggere.",
    busy:
      "La riproduzione vocale è momentaneamente molto occupata. Riprova tra poco.",
    failed:
      "Non è stato possibile creare la voce realistica.",
  },
  fr: {
    login: "Veuillez d’abord vous connecter.",
    unavailable:
      "La synthèse vocale est momentanément indisponible.",
    invalidRequest:
      "La requête vocale n’a pas pu être lue.",
    missingText:
      "Aucun texte à lire n’a été transmis.",
    busy:
      "La synthèse vocale est momentanément très sollicitée. Veuillez réessayer dans un instant.",
    failed:
      "La voix réaliste n’a pas pu être créée.",
  },
  en: {
    login: "Please sign in first.",
    unavailable:
      "Voice playback is currently unavailable.",
    invalidRequest:
      "The voice request could not be read.",
    missingText:
      "No text was provided for reading aloud.",
    busy:
      "Voice playback is currently very busy. Please try again shortly.",
    failed:
      "The realistic voice could not be created.",
  },
};

const SPEECH_INSTRUCTIONS: Record<SupportedLocale, string> = {
  de: `
Sprich in natürlichem Schweizer Hochdeutsch.

Die Stimme soll:
- warm, modern und realistisch klingen
- freundlich, souverän und vertrauenswürdig wirken
- professionell zu Schweizer Immobilienmaklern passen
- ruhig, aber nicht langsam sprechen
- natürlich betonen und angenehme Pausen verwenden
- niemals wie eine übertriebene Werbestimme klingen
- Zahlen, Preise, Quadratmeter und Schweizer Ortsnamen klar aussprechen

Verwende Schweizer Sprachgefühl, aber keinen übertriebenen Dialekt.
`.trim(),
  it: `
Parla in italiano naturale e professionale, adatto al mercato immobiliare svizzero.

La voce deve:
- suonare calda, moderna e realistica
- risultare cordiale, sicura e affidabile
- adattarsi a professionisti immobiliari in Svizzera
- parlare con calma, ma senza essere lenta
- usare un’intonazione naturale e pause piacevoli
- non sembrare mai una voce pubblicitaria esagerata
- pronunciare chiaramente numeri, prezzi, metri quadrati e località svizzere
`.trim(),
  fr: `
Parlez dans un français naturel et professionnel, adapté au marché immobilier suisse.

La voix doit :
- être chaleureuse, moderne et réaliste
- paraître aimable, assurée et digne de confiance
- convenir aux professionnels de l’immobilier en Suisse
- parler calmement, sans être lente
- utiliser une intonation naturelle et des pauses agréables
- ne jamais ressembler à une voix publicitaire exagérée
- prononcer clairement les nombres, les prix, les mètres carrés et les localités suisses
`.trim(),
  en: `
Speak in natural, professional English suitable for the Swiss property market.

The voice should:
- sound warm, modern and realistic
- feel friendly, confident and trustworthy
- suit property professionals in Switzerland
- speak calmly without sounding slow
- use natural emphasis and comfortable pauses
- never sound like an exaggerated advertising voice
- pronounce numbers, prices, square metres and Swiss place names clearly
`.trim(),
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLocale(value: unknown): SupportedLocale {
  return value === "it" || value === "fr" || value === "en"
    ? value
    : "de";
}

function normalizeSpeechText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return null;
  }

  return text.slice(0, 4_000);
}

export async function POST(request: NextRequest) {
  let locale = normalizeLocale(
    request.headers.get("x-inserat-locale")
  );

  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        {
          success: false,
          error: SPEECH_COPY[locale].login,
        },
        {
          status: 401,
        }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          success: false,
          error: SPEECH_COPY[locale].unavailable,
        },
        {
          status: 500,
        }
      );
    }

    const rawBody: unknown = await request
      .json()
      .catch(() => null);

    if (!isRecord(rawBody)) {
      return Response.json(
        {
          success: false,
          error: SPEECH_COPY[locale].invalidRequest,
        },
        {
          status: 400,
        }
      );
    }

    const body = rawBody as GuideSpeechBody;
    locale = normalizeLocale(body.locale);
    const copy = SPEECH_COPY[locale];
    const text = normalizeSpeechText(body.text);

    if (!text) {
      return Response.json(
        {
          success: false,
          error: copy.missingText,
        },
        {
          status: 400,
        }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: text,
      response_format: "mp3",
      speed: 0.98,
      instructions: SPEECH_INSTRUCTIONS[locale],
    });

    const audioBuffer = Buffer.from(
      await speech.arrayBuffer()
    );

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GUIDE SPEECH ERROR:", error);

    const status =
      isRecord(error) &&
      typeof error.status === "number"
        ? error.status
        : 500;

    const copy = SPEECH_COPY[locale];

    if (status === 429) {
      return Response.json(
        {
          success: false,
          error: copy.busy,
        },
        {
          status: 429,
        }
      );
    }

    return Response.json(
      {
        success: false,
        error: copy.failed,
      },
      {
        status: 500,
      }
    );
  }
}
