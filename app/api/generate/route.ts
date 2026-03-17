import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "TEST_KEY",
});

export async function POST(req: Request) {
  try {
    console.log("API KEY:", process.env.OPENAI_API_KEY);
    const body = await req.json();

    const ortLage = body.ortLage || "";
    const zimmer = body.zimmer || "";
    const wohnflaeche = body.wohnflaeche || "";
    const preis = body.preis || "";
    const objektart = body.objektart || "";
    const stil = body.stil || "";
    const highlights = body.highlights || "";
    const region = body.region || "Schweiz";
    const output = body.output || "3 Varianten";

    const prompt = `
Erstelle ${output} professionelle Immobilieninserat-Texte auf Deutsch für die Region ${region}.

Objektdaten:
- Ort / Lage: ${ortLage}
- Zimmer: ${zimmer}
- Wohnfläche: ${wohnflaeche} m²
- Preis: ${preis} CHF
- Objektart: ${objektart}
- Stil: ${stil}
- Highlights: ${highlights}

Wichtig:
- Gib NUR gültiges JSON zurück
- Keine Erklärungen
- Keine Markdown-Codeblöcke
- Antworte exakt in diesem Format:

{
  "varianten": [
    {
      "titel": "Titel 1",
      "text": "Inserattext 1"
    },
    {
      "titel": "Titel 2",
      "text": "Inserattext 2"
    },
    {
      "titel": "Titel 3",
      "text": "Inserattext 3"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content:
            "Du bist ein professioneller Schweizer Immobilien-Texter. Du antwortest immer nur mit sauberem JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Keine Antwort von OpenAI erhalten." },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error("JSON Parse Fehler:", error, content);
      return NextResponse.json(
        { error: "Antwort konnte nicht als JSON gelesen werden." },
        { status: 500 }
      );
    }

    if (!parsed.varianten || !Array.isArray(parsed.varianten)) {
      return NextResponse.json(
        { error: "Ungültiges Antwortformat von OpenAI." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Generate API Fehler:", error);
    return NextResponse.json(
      { error: error?.message || "Fehler beim Generieren." },
      { status: 500 }
    );
  }
}