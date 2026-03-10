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
    } = await req.json();

    const prompt = `
Du bist ein professioneller Immobilienmakler in der Schweiz.

Erstelle 3 unterschiedliche Inserattexte für folgende Immobilie.
Der Kaufpreis MUSS im Text klar erwähnt werden (z.B. "Kaufpreis: CHF ...").

Ort: ${location}
Zimmer: ${rooms}
Wohnfläche: ${livingArea} m²
Preis: ${price} CHF
Objekt: ${propertyType}
Stilwunsch: ${styleText}

Highlights:
${highlights}

Stil 1: Klassisch und sachlich (typisches Homegate Inserat)
Stil 2: Emotional und verkaufsstark
Stil 3: Luxus / Premium Stil

Jede Variante soll enthalten:
- title
- objectType
- price
- text
- highlights (als Liste)
- cta
- instagramPost
- linkedinPost
- facebookPost

Antworte nur mit gültigem JSON in genau diesem Format:

{
  "variants": [
    {
      "title": "Titel Variante 1",
      "objectType": "${propertyType}",
      "price": "${price}",
      "text": "Beschreibung der Immobilie in 3 bis 5 Sätzen.",
      "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
      "cta": "Vereinbaren Sie noch heute einen Besichtigungstermin.",
      "instagramPost": "Kurzer emotionaler Instagram-Post.",
      "linkedinPost": "Professioneller LinkedIn-Post.",
      "facebookPost": "Facebook-Post für Interessenten."
    },
    {
      "title": "Titel Variante 2",
      "objectType": "${propertyType}",
      "price": "${price}",
      "text": "Beschreibung der Immobilie in 3 bis 5 Sätzen.",
      "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
      "cta": "Vereinbaren Sie noch heute einen Besichtigungstermin.",
      "instagramPost": "Kurzer emotionaler Instagram-Post.",
      "linkedinPost": "Professioneller LinkedIn-Post.",
      "facebookPost": "Facebook-Post für Interessenten."
    },
    {
      "title": "Titel Variante 3",
      "objectType": "${propertyType}",
      "price": "${price}",
      "text": "Beschreibung der Immobilie in 3 bis 5 Sätzen.",
      "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
      "cta": "Vereinbaren Sie noch heute einen Besichtigungstermin.",
      "instagramPost": "Kurzer emotionaler Instagram-Post.",
      "linkedinPost": "Professioneller LinkedIn-Post.",
      "facebookPost": "Facebook-Post für Interessenten."
    }
  ]
}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON. No markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || "";

    let json: any;

    try {
      json = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");

      if (start >= 0 && end > start) {
        json = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("Model returned non-JSON.");
      }
    }

    const normalized = {
      variants: (json?.variants ?? []).map((v: any) => ({
        title: v.title ?? "",
        objectType: v.objectType ?? propertyType ?? "",
        price: v.price ?? price ?? "",
        text: v.text ?? v.body ?? v.description ?? "",
        highlights: v.highlights ?? v.bullets ?? [],
        cta: v.cta ?? "",
        instagramPost: v.instagramPost ?? "",
        linkedinPost: v.linkedinPost ?? "",
        facebookPost: v.facebookPost ?? "",
      })),
    };

    return Response.json(normalized);
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}