import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY fehlt. Bitte die Datei .env.local kontrollieren.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Es wurde kein gültiges Bild übermittelt." },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      return NextResponse.json(
        {
          error:
            "Dieses Bildformat wird nicht unterstützt. Bitte JPG, PNG oder WEBP verwenden.",
        },
        { status: 400 }
      );
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error: "Das Bild ist zu gross. Maximal erlaubt sind 8 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "Du bist ein professioneller Schweizer Immobilienmarketing-Assistent. Analysiere Immobilienfotos sachlich und verkaufsstark. Erfinde keine Merkmale, die auf dem Bild nicht klar erkennbar sind.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Analysiere dieses Immobilienfoto. Beschreibe in 3 bis 5 deutschen Sätzen: " +
                "1. Was ist sichtbar? " +
                "2. Welche Ausstattungs- oder Wohnmerkmale sind erkennbar? " +
                "3. Welche verkaufsstarken Punkte dürfen für ein Immobilieninserat verwendet werden?",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${image.type};base64,${base64Image}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    const analysis = response.choices[0]?.message?.content?.trim();

    if (!analysis) {
      return NextResponse.json(
        {
          error: "Die KI hat keine Bildanalyse zurückgegeben.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("ANALYZE IMAGE API ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler bei der Bildanalyse.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}