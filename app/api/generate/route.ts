import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { location, rooms, livingArea, price, highlights } = body;

  const prompt = `
Erstelle GENAU 3 unterschiedliche hochwertige Immobilieninserate für Immobilienmakler in der Schweiz.

Verwende AUSSCHLIESSLICH diese Angaben:
- Ort: ${location}
- Zimmer: ${rooms}
- Wohnfläche: ${livingArea} m²
- Preis: CHF ${price}
- Highlights: ${highlights || "keine"}

WICHTIG:
- Erfinde KEINE zusätzlichen Fakten.
- Erfinde KEIN Haus, KEIN Grundstück, KEINE Garage, KEIN Garten, KEIN Pool, KEINE Schlafzimmerzahl, KEIN Lift, KEINE Aussicht, wenn es nicht ausdrücklich in den Angaben steht.
- Wenn etwas nicht angegeben wurde, dann nicht erwähnen.
- Verwende nur die Informationen aus den Eingaben.
- Jede Variante soll ungefähr 120 bis 180 Wörter lang sein.
- Jede Variante braucht einen Titel und einen Text.
- Der Titel jeder Variante soll im Feld "title" stehen.
- Schreibe den Titel stark, hochwertig und verkaufsorientiert.
- Gib NUR gültiges JSON zurück, ohne Markdown, ohne Erklärung.

Varianten:
1. Emotional und einladend
2. Sachlich, professionell und seriös
3. Modern, verkaufsstark und digital optimiert

Zusätzlicher Hinweis:
Die Texte sollen so formuliert sein, dass sie später für Homegate, ImmoScout24, Newhome, Facebook, Instagram und LinkedIn weiterverwendet oder exportiert werden können.
Behaupte aber NICHT, dass das Inserat automatisch hochgeladen wurde.

Format:

{
  "variants": [
    {
      "title": "Emotionaler Titel",
      "text": "Emotionaler Text mit ungefähr 120 bis 180 Wörtern."
    },
    {
      "title": "Professioneller Titel",
      "text": "Professioneller Text mit ungefähr 120 bis 180 Wörtern."
    },
    {
      "title": "Moderner Titel",
      "text": "Moderner, verkaufsstarker und digital optimierter Text mit ungefähr 120 bis 180 Wörtern."
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
      temperature: 0.4,
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
        {
          title: "Fehler",
          text: "Die Ausgabe konnte nicht korrekt gelesen werden.",
        },
      ],
    };
  }

  return NextResponse.json({
    variants: parsed.variants || [],
  });
}