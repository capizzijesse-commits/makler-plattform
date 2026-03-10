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

Jeder Text soll enthalten:
- Titel
- Beschreibung
- Highlights als Liste
- Einen kurzen professionellen Call-to-Action

Erstelle zusätzlich:
- einen professionellen Instagram-Post
- einen professionellen LinkedIn-Post
- einen professionellen Facebook-Post

Antworte nur mit gültigem JSON im folgenden Format:

{
  "variants": [
    {
      "title": "Titel des Inserats",
      "objectType": "Wohnung",
      "price": "CHF Preis",
      "text": "Ausführliche Beschreibung der Immobilie (3-5 Sätze).",
      "highlights": [
        "Highlight 1",
        "Highlight 2",
        "Highlight 3"
      ],
      "instagramPost": "Kurzer emotionaler Instagram-Post mit passenden Emojis.",
      "linkedinPost": "Professioneller LinkedIn-Post für Immobilienmakler.",
      "facebookPost": "Facebook-Post für Immobilieninteressenten."
    },
    {
      "title": "Titel Variante 2",
      "objectType": "Wohnung",
      "price": "CHF Preis",
      "text": "Ausführliche Beschreibung der Immobilie.",
      "highlights": [
        "Highlight 1",
        "Highlight 2",
        "Highlight 3"
      ],
      "instagramPost": "Instagram-Post",
      "linkedinPost": "LinkedIn-Post",
      "facebookPost": "Facebook-Post"
    },
    {
      "title": "Titel Variante 3",
      "objectType": "Wohnung",
      "price": "CHF Preis",
      "text": "Ausführliche Beschreibung der Immobilie.",
      "highlights": [
        "Highlight 1",
        "Highlight 2",
        "Highlight 3"
      ],
      "instagramPost": "Instagram-Post",
      "linkedinPost": "LinkedIn-Post",
      "facebookPost": "Facebook-Post"
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
        text: v.body ?? "",
        highlights: v.bullets ?? [],
        cta: v.cta ?? "",
      })),
      social: {
        instagram: json?.social?.instagram ?? "",
        linkedin: json?.social?.linkedin ?? "",
      },
    };

    return Response.json(normalized);
  } catch (err: any) {
    return new Response(err?.message || "Server error", { status: 500 });
  }
}