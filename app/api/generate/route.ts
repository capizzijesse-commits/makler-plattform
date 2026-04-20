import { NextResponse } from "next/server";


export async function POST(req: Request) {
  
  const body = await req.json();

  const {
  location,
  rooms,
  livingArea,
  price,
  highlights
} = body;


 const prompt = `
Erstelle GENAU 2 unterschiedliche hochwertige Immobilieninserate für Immobilienmakler in der Schweiz.

Verwende AUSSCHLIESSLICH diese Angaben:
- Ort: ${location}
- Zimmer: ${rooms}
- Wohnfläche: ${livingArea} m²
- Preis: CHF ${price}
- Highlights: ${highlights || "keine"}

WICHTIG:
- Erfinde KEINE zusätzlichen Fakten.
- Erfinde KEIN Haus, KEIN Grundstück, KEINE Garage, KEIN Garten, KEIN Pool, KEINE Schlafzimmerzahl, wenn es nicht in den Angaben steht.
- Wenn etwas nicht angegeben wurde, dann nicht erwähnen.
- Verwende nur die Informationen aus den Eingaben.
- Der Text soll länger, hochwertiger und professioneller sein.
- Variante 1: emotional und verkaufsstark
- Variante 2: sachlich, professionell und seriös
- Jede Variante braucht einen Titel und einen Text.
- Der Text pro Variante soll ungefähr 120 bis 180 Wörter lang sein.
- Gib NUR gültiges JSON zurück, in genau diesem Format:

{
  "variants": [
    {
      "title": "Titel der Variante 1",
      "text": "Text der Variante 1"
    },
    {
      "title": "Titel der Variante 2",
      "text": "Text der Variante 2"
    }
  ]
}
`;

  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await completion.json();
  const text = data.choices?.[0]?.message?.content || "";

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {
      variants: [
        { title: "Variante 1", text: text },
        { title: "Variante 2", text: text },
      ],
    };
  }

  return NextResponse.json({
    variants: parsed.variants,
  });
}