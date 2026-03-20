import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
  const imageAnalysis = body.imageAnalysis || "";

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
Erstelle 3 hochwertige, deutlich unterschiedliche und professionelle Immobilieninserate als JSON.

WICHTIG:
- Antworte AUSSCHLIESSLICH als gültiges JSON
- Kein zusätzlicher Text
- Schreibe verkaufsstark, luxuriös, strukturiert und professionell
- Jeder Text soll ausführlich sein
- Jeder Text soll ungefähr 180 bis 260 Wörter haben
- Jede Variante soll stilistisch anders sein
- Jede Variante braucht einen klaren Titel

Format:
{
  "variants": [
    {
      "title": "...",
      "text": "...",
      "instagramPost": "...",
      "linkedinPost": "...",
      "facebookPost": "..."
    },
    {
      "title": "...",
      "text": "...",
      "instagramPost": "...",
      "linkedinPost": "...",
      "facebookPost": "..."
    },
    {
      "title": "...",
      "text": "...",
      "instagramPost": "...",
      "linkedinPost": "...",
      "facebookPost": "..."
    }
  ]
}

Daten:
Ort: ${location}
Zimmer: ${rooms}
Wohnfläche: ${livingArea}
Preis: ${price}
Objekt: ${propertyType}
Highlights: ${highlights}
Stil: ${styleText}
Bildanalyse: ${imageAnalysis || "Keine"}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content || "{}";
    console.log("AI RAW:", text);

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);
      return NextResponse.json(
        { error: "AI hat kein gültiges JSON geliefert" },
        { status: 500 }
      );
    }

    if (!parsed?.variants || !Array.isArray(parsed.variants) || parsed.variants.length === 0) {
      return NextResponse.json(
        { error: "Keine Varianten erhalten" },
        { status: 500 }
      );
    }
const safeVariants = parsed.variants.map((v: any, i: number) => ({
  title: v?.title?.trim() || `Exklusive Immobilie ${i + 1}`,
  text: v?.text?.trim() || "",
  instagramPost: v?.instagramPost?.trim() || "",
  linkedinPost: v?.linkedinPost?.trim() || "",
  facebookPost: v?.facebookPost?.trim() || "",
}));
return NextResponse.json({ variants: safeVariants });
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren" },
      { status: 500 }
    );
  }
}