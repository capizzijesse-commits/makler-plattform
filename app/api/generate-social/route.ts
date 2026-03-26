import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      title,
      text,
      location,
      propertyType,
      price,
      rooms,
      livingArea,
      highlights,
    } = await req.json();

    const prompt = `
Erstelle auf Basis dieses Immobilieninserats 3 Social-Media-Texte auf Deutsch.

Gib die Antwort als JSON zurück:
{
  "instagramPost": "...",
  "linkedinPost": "...",
  "facebookPost": "..."
}

WICHTIG:
- professionell und verkaufsstark
- keine Wiederholungen
- Instagram: max 300 Zeichen
- LinkedIn: max 500 Zeichen
- Facebook: max 400 Zeichen

Daten:
Titel: ${title}
Inserattext: ${text}
Ort: ${location}
Objekt: ${propertyType}
Preis: ${price}
Zimmer: ${rooms}
Wohnfläche: ${livingArea}
Highlights: ${highlights}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({
      instagramPost: parsed.instagramPost || "",
      linkedinPost: parsed.linkedinPost || "",
      facebookPost: parsed.facebookPost || "",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Social Posts" },
      { status: 500 }
    );
  }
}