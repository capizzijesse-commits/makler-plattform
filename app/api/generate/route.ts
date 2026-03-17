import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      location,
      rooms,
      livingArea,
      price,
      propertyType,
      highlights,
      styleText,
      imageAnalysis,
    } = await req.json();

    const prompt = `
Du bist ein professioneller Schweizer Immobilien-Texter.

Erstelle 3 hochwertige Inserat-Varianten für:

Ort: ${location}
Zimmer: ${rooms}
Fläche: ${livingArea} m²
Preis: ${price} CHF
Objekt: ${propertyType}
Highlights: ${highlights}
Stil: ${styleText}

Antwort als JSON im Format:

{
  "variants": [
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "";

    let json: any;

    try {
      json = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        json = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("Model returned non-JSON");
      }
    }

    const normalized = {
      variants: (json?.variants ?? []).map((v: any) => ({
        title: v.title ?? "",
        text: v.body ?? v.text ?? "",
      })),
    };

    return Response.json({ variants: normalized.variants });

  } catch (error) {
    console.error("Generate API error:", error);
    return Response.json(
      { error: "Fehler beim Generieren" },
      { status: 500 }
    );
  }
}