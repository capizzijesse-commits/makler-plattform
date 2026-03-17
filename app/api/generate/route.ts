import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json();

    if (!userInput) {
      return NextResponse.json({ error: "Kein Input vorhanden" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Du bist ein Assistent für insera-ai.ch. Antworte AUSSCHLIESSLICH im JSON-Format. Schema: { \"titel\": \"string\", \"beschreibung\": \"string\" }" 
        },
        { role: "user", content: userInput }
      ],
      response_format: { type: "json_object" } 
    });

    // WICHTIG: Das [0] ist zwingend erforderlich!
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("KI hat leeren Inhalt geliefert");
    }

    // Das parst den Text zu echtem JSON und schickt es ans Frontend
    return NextResponse.json(JSON.parse(content));
    
  } catch (error: any) {
    console.error("Generate API error:", error);
    // Gibt die genaue Fehlermeldung ans Frontend, damit wir sehen, was los ist
    return NextResponse.json(
      { error: "Fehler beim Generieren", details: error.message }, 
      { status: 500 }
    );
  }
}
