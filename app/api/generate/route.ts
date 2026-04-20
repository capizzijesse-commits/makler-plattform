import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

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