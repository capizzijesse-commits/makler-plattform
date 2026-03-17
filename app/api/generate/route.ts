import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  console.log("API CALLED");
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

Erstelle 3 hochwertige Inserat-Varianten.

WICHTIG:
- Antworte AUSSCHLIESSLICH im JSON Format
- KEIN zusätzlicher Text
- KEINE Erklärungen
- KEIN Markdown

Format:

{
  "variants": [
    {
      "title": "Titel 1",
      "text": "Beschreibung 1"
    },
    {
      "title": "Titel 2",
      "text": "Beschreibung 2"
    },
    {
      "title": "Titel 3",
      "text": "Beschreibung 3"
    }
  ]
}

Daten:
Ort: ${location}
Zimmer: ${rooms}
Wohnfläche: ${livingArea}
Preis: ${price}
Typ: ${propertyType}
Highlights: ${highlights}
Stil: ${styleText}
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
  console.error("ERROR DETAILS:", error);
    return Response.json(
      { error: "Fehler beim Generieren" },
      { status: 500 }
    );
  }
}