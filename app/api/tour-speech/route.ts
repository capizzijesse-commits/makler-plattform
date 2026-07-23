import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getPlanCapabilities,
  normalizeUserPlan,
} from "@/lib/plans";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const SUPPORTED_VOICES = [
  "marin",
  "coral",
  "shimmer",
  "cedar",
  "onyx",
  "echo",
] as const;

type SupportedVoice = (typeof SUPPORTED_VOICES)[number];

type SpeechRequestBody = {
  text?: unknown;
  voice?: unknown;
};

function isSupportedVoice(value: unknown): value is SupportedVoice {
  return (
    typeof value === "string" &&
    SUPPORTED_VOICES.includes(value as SupportedVoice)
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine aktive Sitzung gefunden.",
        },
        { status: 401 }
      );
    }

    const plan = normalizeUserPlan(user.plan);
    const capabilities = getPlanCapabilities(plan);

    if (!capabilities.canUseTourGuide) {
      return NextResponse.json(
        {
          success: false,
          error: "Die AI-Stimmen sind im Pro-Plan enthalten.",
        },
        { status: 403 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OPENAI_API_KEY ist nicht konfiguriert.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SpeechRequestBody;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = isSupportedVoice(body.voice) ? body.voice : "marin";

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "Es wurde kein Text für die Stimme übermittelt.",
        },
        { status: 400 }
      );
    }

    if (text.length > 7800) {
      return NextResponse.json(
        {
          success: false,
          error: "Der Audiotext ist zu lang. Bitte kürze ihn etwas.",
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      response_format: "mp3",
      speed: 0.94,
      instructions:
        "Sprich natürliches Schweizer Hochdeutsch. Klinge warm, ruhig, vertrauenswürdig und professionell – wie eine erfahrene Immobilienmaklerin oder ein erfahrener Immobilienmakler bei einer persönlichen Besichtigung. Verwende eine angenehme, menschliche Sprechmelodie, klare Aussprache und sinnvolle kurze Pausen. Vermeide eine übertriebene Werbestimme und vermeide einen roboterhaften Rhythmus.",
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": 'inline; filename="inserat-ai-tour.mp3"',
      },
    });
  } catch (error) {
    console.error("TOUR SPEECH API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Die AI-Stimme konnte nicht erzeugt werden.",
      },
      { status: 500 }
    );
  }
}
