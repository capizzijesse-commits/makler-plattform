// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // oder gpt-3.5-turbo-0125
      messages: [
        { 
          role: "system", 
          content: "Du bist ein Assistent für insera-ai.ch. Antworte IMMER im JSON-Format. Nutze das Schema: { 'titel': 'string', 'beschreibung': 'string' }." 
        },
        { role: "user", content: userInput }
      ],
      // ENTSCHEIDEND: Erzwingt JSON-Ausgabe
      response_format: { type: "json_object" } 
    });

    const content = response.choices[0].message.content;
    
    if (!content) throw new Error("Leere Antwort vom Modell");

    // Sicher parsen
    return NextResponse.json(JSON.parse(content));
    
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json({ error: "Fehler beim Generieren" }, { status: 500 });
  }
}
