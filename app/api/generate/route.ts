import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      location,
      rooms,
      livingArea,
      price,
      propertyType,
      highlights,
      styleText,
    } = body;

    const prompt = `
Du bist ein professioneller Schweizer Immobilien-Texter.

Erstelle 3 hochwertige Inserat-Varianten.

WICHTIG:
- Antworte AUSSCHLIESSLICH im JSON Format
- KEIN zusätzlicher Text
- KEINE Erklärungen

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
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content;

    console.log("AI RAW:", text);

    let parsed;

    try {
      parsed = JSON.parse(text || "{}");
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);
      return NextResponse.json(
        { error: "AI hat kein gültiges JSON geliefert" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      { error: "Fehler beim Generieren" },
      { status: 500 }
    );
  }
}