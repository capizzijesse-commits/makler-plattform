import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const location = body.location || "";
    const rooms = body.rooms || "";
    const livingArea = body.livingArea || "";
    const price = body.price || "";
    const highlights = body.highlights || "";

    const prompt = `
Erstelle GENAU 2 unterschiedliche hochwertige Immobilieninserate für Immobilienmakler in der Schweiz.

Angaben:
- Ort: ${location}
- Zimmer: ${rooms}
- Wohnfläche: ${livingArea} m²
- Preis: CHF ${price}
- Highlights / Lagevorteile: ${highlights || "keine"}

WICHTIG:
- Variante 1 soll emotionaler und verkaufsstark sein
- Variante 2 soll sachlicher und professioneller sein
- Beide Varianten sollen vollständig unterschiedlich formuliert sein
- Keine Aufzählungen im JSON
- Gib NUR gültiges JSON zurück
- Format exakt so:

{
  "variants": [
    "Text der Variante 1",
    "Text der Variante 2"
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content || "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);
      return NextResponse.json(
        { error: "AI hat kein gültiges JSON geliefert" },
        { status: 500 }
      );
    }

    if (!parsed?.variants || !Array.isArray(parsed.variants)) {
      return NextResponse.json(
        { error: "Keine Varianten erhalten" },
        { status: 500 }
      );
    }

    const safeVariants = parsed.variants
      .map((v: any) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .slice(0, 2);

    if (safeVariants.length === 0) {
      return NextResponse.json(
        { error: "Keine Varianten erhalten" },
        { status: 500 }
      );
    }

    if (body.demo) {
      return NextResponse.json({
        variants: safeVariants,
      });
    }

    return NextResponse.json({
      variants: safeVariants,
    });
  } catch (error) {
    console.error("GENERATE ERROR:", error);
    return NextResponse.json(
      { error: "Fehler beim Generieren" },
      { status: 500 }
    );
  }
}