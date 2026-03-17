import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // RETTUNG: Wir suchen alle gängigen Namen ab, damit 'content' nie null ist
    const promptText = body.userInput || body.prompt || body.text || body.content;

    // Falls gar nichts gefunden wurde, geben wir eine klare Fehlermeldung zurück
    if (!promptText) {
      console.error("Frontend Fehler: Body enthält keine bekannten Keys", body);
      return NextResponse.json({ 
        error: "Kein Text empfangen. Bitte prüfen Sie, ob das Frontend 'userInput' sendet." 
      }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Du bist ein Assistent für insera-ai.ch. Antworte IMMER im JSON-Format: { \"titel\": \"string\", \"beschreibung\": \"string\" }." 
        },
        { 
          role: "user", 
          content: String(promptText) // Sicherstellen, dass es ein String ist
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("KI Antwort ist leer");

    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error("Generate API error:", error);
    return NextResponse.json({ 
      error: "Fehler bei der Generierung", 
      details: error.message 
    }, { status: 500 });
  }
}