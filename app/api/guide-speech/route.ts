import type { NextRequest } from "next/server";
import OpenAI from "openai";

import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuideSpeechBody = {
  text?: unknown;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSpeechText(value: unknown): string | null {
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
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        {
          success: false,
          error: "Bitte zuerst einloggen.",
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
          error:
            "Die Sprachausgabe ist momentan nicht verfügbar.",
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
          error:
            "Die Sprachanfrage konnte nicht gelesen werden.",
        },
        {
          status: 400,
        }
      );
    }

    const body = rawBody as GuideSpeechBody;
    const text = normalizeSpeechText(body.text);

    if (!text) {
      return Response.json(
        {
          success: false,
          error:
            "Es wurde kein Text zum Vorlesen übermittelt.",
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
      instructions: `
Sprich auf Deutsch in natürlichem Schweizer Hochdeutsch.

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

    if (status === 429) {
      return Response.json(
        {
          success: false,
          error:
            "Die Sprachausgabe ist momentan stark ausgelastet. Bitte versuche es gleich nochmals.",
        },
        {
          status: 429,
        }
      );
    }

    return Response.json(
      {
        success: false,
        error:
          "Die realistische Stimme konnte momentan nicht erstellt werden.",
      },
      {
        status: 500,
      }
    );
  }
}
