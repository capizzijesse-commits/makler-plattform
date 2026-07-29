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
type TourLocale = "de" | "it" | "fr" | "en";

type SpeechRequestBody = {
  text?: unknown;
  voice?: unknown;
  locale?: unknown;
};

const TOUR_SPEECH_MESSAGES: Record<
  TourLocale,
  {
    noSession: string;
    proOnly: string;
    missingApiKey: string;
    missingText: string;
    textTooLong: string;
    failed: string;
    instructions: string;
  }
> = {
  de: {
    noSession: "Keine aktive Sitzung gefunden.",
    proOnly: "Die AI-Stimmen sind im Pro-Plan enthalten.",
    missingApiKey: "OPENAI_API_KEY ist nicht konfiguriert.",
    missingText: "Es wurde kein Text für die Stimme übermittelt.",
    textTooLong: "Der Audiotext ist zu lang. Bitte kürze ihn etwas.",
    failed: "Die AI-Stimme konnte nicht erzeugt werden.",
    instructions:
      "Sprich natürliches Schweizer Hochdeutsch. Klinge warm, ruhig, vertrauenswürdig und professionell – wie eine erfahrene Immobilienmaklerin oder ein erfahrener Immobilienmakler bei einer persönlichen Besichtigung. Verwende eine angenehme, menschliche Sprechmelodie, klare Aussprache und sinnvolle kurze Pausen. Vermeide eine übertriebene Werbestimme und einen roboterhaften Rhythmus.",
  },
  it: {
    noSession: "Non è stata trovata alcuna sessione attiva.",
    proOnly: "Le voci AI sono incluse nel piano Pro.",
    missingApiKey: "OPENAI_API_KEY non è configurata.",
    missingText: "Non è stato trasmesso alcun testo per la voce.",
    textTooLong: "Il testo audio è troppo lungo. Riducilo leggermente.",
    failed: "Non è stato possibile generare la voce AI.",
    instructions:
      "Parla in un italiano naturale, chiaro e professionale, adatto al mercato immobiliare svizzero. Usa un tono caldo, tranquillo e affidabile, come durante una visita personale condotta da un’agente immobiliare esperto. Mantieni una melodia umana, una pronuncia precisa e brevi pause sensate. Evita un tono pubblicitario eccessivo e un ritmo robotico.",
  },
  fr: {
    noSession: "Aucune session active n’a été trouvée.",
    proOnly: "Les voix AI sont incluses dans l’offre Pro.",
    missingApiKey: "OPENAI_API_KEY n’est pas configurée.",
    missingText: "Aucun texte n’a été transmis pour la voix.",
    textTooLong: "Le texte audio est trop long. Veuillez le raccourcir légèrement.",
    failed: "La voix AI n’a pas pu être générée.",
    instructions:
      "Parle dans un français naturel, clair et professionnel, adapté au marché immobilier suisse. Adopte un ton chaleureux, calme et digne de confiance, comme lors d’une visite personnelle menée par une agente ou un agent immobilier expérimenté. Utilise une mélodie humaine, une prononciation précise et de courtes pauses pertinentes. Évite une voix publicitaire excessive et un rythme robotique.",
  },
  en: {
    noSession: "No active session was found.",
    proOnly: "AI voices are included in the Pro plan.",
    missingApiKey: "OPENAI_API_KEY is not configured.",
    missingText: "No text was provided for the voice.",
    textTooLong: "The audio text is too long. Please shorten it slightly.",
    failed: "The AI voice could not be generated.",
    instructions:
      "Speak natural, clear and professional English suitable for the Swiss property market. Sound warm, calm and trustworthy, like an experienced real estate professional conducting a personal viewing. Use a pleasant human cadence, precise pronunciation and meaningful short pauses. Avoid an exaggerated advertising voice and a robotic rhythm.",
  },
};

function normalizeLocale(value: unknown): TourLocale {
  if (typeof value !== "string") {
    return "de";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("en")) return "en";

  return "de";
}

function resolveRequestLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  return normalizeLocale(request.headers.get("accept-language"));
}

function isSupportedVoice(value: unknown): value is SupportedVoice {
  return (
    typeof value === "string" &&
    SUPPORTED_VOICES.includes(value as SupportedVoice)
  );
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: TOUR_SPEECH_MESSAGES[locale].noSession,
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
          error: TOUR_SPEECH_MESSAGES[locale].proOnly,
        },
        { status: 403 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: TOUR_SPEECH_MESSAGES[locale].missingApiKey,
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SpeechRequestBody;
    locale = normalizeLocale(body.locale ?? locale);

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = isSupportedVoice(body.voice) ? body.voice : "marin";
    const messages = TOUR_SPEECH_MESSAGES[locale];

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: messages.missingText,
        },
        { status: 400 }
      );
    }

    if (text.length > 7800) {
      return NextResponse.json(
        {
          success: false,
          error: messages.textTooLong,
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
      instructions: messages.instructions,
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
        error: TOUR_SPEECH_MESSAGES[locale].failed,
      },
      { status: 500 }
    );
  }
}
