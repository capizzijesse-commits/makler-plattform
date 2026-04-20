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
Erstelle 2 unterschiedliche Immobilieninserate.

Gib die Antwort NUR als JSON im folgenden Format zurück:

{
  "variants": [
    {
      "title": "Titel 1",
      "text": "Text 1"
    },
    {
      "title": "Titel 2",
      "text": "Text 2"
    }
  ]
}

Keine Erklärungen, kein zusätzlicher Text.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

 const text = completion.choices[0]?.message?.content || "";

let parsed;

try {
  parsed = JSON.parse(text);
} catch (err) {
  return NextResponse.json(
    { error: "JSON konnte nicht gelesen werden" },
    { status: 500 }
  );
}

if (!parsed.variants || !Array.isArray(parsed.variants)) {
  return NextResponse.json(
    { error: "keine Varianten erhalten" },
    { status: 500 }
  );
}

return NextResponse.json({
  variants: parsed.variants
});

    const safeVariants = parsed.variants
      .map((v: any, i: number) => ({
        title:
          typeof v?.title === "string" && v.title.trim()
            ? v.title.trim()
            : `Variante ${i + 1}`,
        text:
          typeof v?.text === "string" && v.text.trim()
            ? v.text.trim()
            : "",
      }))
      .filter((v: any) => v.text)
      .slice(0, 2);

    if (safeVariants.length === 0) {
      return NextResponse.json(
        { error: "Keine Varianten erhalten" },
        { status: 500 }
      );
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