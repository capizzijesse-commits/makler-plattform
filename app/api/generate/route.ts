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
Erstelle genau 3 hochwertige Inserat-Varianten für diese Immobilie.

Antworte NUR als gültiges JSON in genau diesem Format:

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
Bildanalyse: ${imageAnalysis || "keine"}
`;

 const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  response_format: { type: "json_object" },
  messages: [
    {
      role: "system",
      content:
        "Du antwortest ausschließlich mit gültigem JSON. Kein Markdown. Kein zusätzlicher Text.",
    },
    {
      role: "user",
      content: prompt,
    },
  ],
});
    const text =
      completion.choices?.[0]?.message?.content || "{}";

    let json;

    try {
      json = JSON.parse(text);
    } catch {
      console.error("JSON PARSE FAILED:", text);
      return Response.json(
        { error: "Ungültige AI-Antwort" },
        { status: 500 }
      );
    }

    const normalized = {
      variants: (json.variants || []).map((v: any) => ({
        title: v.title || "",
        text: v.text || "",
      })),
    };

    return Response.json(normalized);
  } catch (error) {
    console.error("ERROR DETAILS:", error);
    return Response.json(
      { error: "Fehler beim Generieren" },
      { status: 500 }
    );
  }
}