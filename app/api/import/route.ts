import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      location,
      propertyType,
      rooms,
      livingArea,
      price,
      style,
      extras,
      tone,
      variants = 3,
    } = body ?? {};

    const prompt = `
Du bist ein Top-Immobilientexter in der Schweiz.
Erstelle ${variants} Varianten eines Immobilien-Inserats.

Rahmen:
- Standort: ${location || "-"}
- Objekt: ${propertyType || "-"}
- Zimmer: ${rooms || "-"}
- Wohnfläche: ${livingArea || "-"} m²
- Preis: ${price || "-"} CHF
- Stil: ${style || "luxus/premium"}
- Ton: ${tone || "professionell, vertrauenswürdig"}
- Extras: ${extras || "-"}

Ausgabe:
- Gib JSON zurück: { "variants": [ { "title": "...", "text": "..." }, ... ] }
- Keine Markdown-Fences.
- Texte müssen hochwertig, klar strukturiert, ohne Übertreibungen sein.
`;

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = resp.output_text || "";

    // robustes JSON parsing
    let json: any = null;
    try {
      json = JSON.parse(raw);
    } catch {
      // fallback: wenn Modell nicht sauber JSON liefert
      json = {
        variants: [
          { title: "Inserat", text: raw.trim() || "Keine Ausgabe erhalten." },
        ],
      };
    }

    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}