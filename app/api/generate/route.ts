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

Erstelle 3 hochwertige und deutlich unterschiedliche Inserat-Varianten für eine Immobilie in der Schweiz.

WICHTIG:
- Antworte AUSSCHLIESSLICH im JSON Format
- KEIN zusätzlicher Text
- KEINE Erklärungen
- KEIN Markdown

Jede Variante soll:
- ausführlicher sein
- verkaufsstärker formuliert sein
- hochwertig und professionell klingen
- emotionaler und attraktiver wirken
- nicht einfach nur Daten aufzählen
- sich sprachlich klar von den anderen Varianten unterscheiden

Variante 1:
- elegant
- luxuriös
- emotional
- hochwertig

Variante 2:
- modern
- verkaufsstark
- klar strukturiert
- professionell

Variante 3:
- wohnlich
- einladend
- charmant
- lebendig beschrieben

Wenn passend, integriere Vorteile wie:
- Lage
- Licht
- Ruhe
- Aussicht
- Komfort
- Alltagstauglichkeit
- Exklusivität
- Lebensqualität

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
  ],
  "social": {
    "instagram": "Instagram Post",
    "linkedin": "LinkedIn Post",
    "facebook": "Facebook Post"
  }
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