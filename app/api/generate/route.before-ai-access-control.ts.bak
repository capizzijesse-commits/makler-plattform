import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY fehlt auf dem Server." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const body = await req.json();

    const {
      location,
      rooms,
      livingArea,
      price,
      propertyType,
      highlights,
      styleText,
      imageAnalysis,
    } = body;

    const prompt = `
Erstelle GENAU 3 unterschiedliche hochwertige Immobilieninserate für Immobilienmakler in der Schweiz.

Verwende AUSSCHLIESSLICH diese Angaben:
- Ort: ${location || "-"}
- Objektart: ${propertyType || "-"}
- Zimmer: ${rooms || "-"}
- Wohnfläche: ${livingArea || "-"} m²
- Preis: CHF ${price || "-"}
- Highlights: ${highlights || "keine"}
- Stil: ${styleText || "hochwertig und modern"}
- Bildanalyse: ${imageAnalysis || "keine"}

WICHTIG:
- Erfinde KEINE zusätzlichen Fakten.
- Erfinde KEIN Haus, KEIN Grundstück, KEINE Garage, KEIN Garten, KEIN Pool, KEINE Schlafzimmerzahl, KEIN Lift, KEINE Aussicht, wenn es nicht ausdrücklich in den Angaben steht.
- Wenn etwas nicht angegeben wurde, dann nicht erwähnen.
- Verwende nur die Informationen aus den Eingaben.
- Jede Variante soll ungefähr 120 bis 180 Wörter lang sein.
- Jede Variante braucht einen Titel und einen Text.
- Der Titel jeder Variante soll im Feld "title" stehen.
- Schreibe den Titel hochwertig, klar und verkaufsorientiert.
- Gib NUR gültiges JSON zurück, ohne Markdown und ohne Erklärung.
- Schreibe in Schweizer Hochdeutsch. Verwende Schweizer Rechtschreibung ohne ß.

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content || "";

    let parsed: any;

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Die AI-Ausgabe konnte nicht korrekt gelesen werden." },
        { status: 500 }
      );
    }

    if (!parsed.variants || !Array.isArray(parsed.variants)) {
      return NextResponse.json(
        { error: "Keine Varianten erhalten." },
        { status: 500 }
      );
    }
const toSwissGerman = (value: string) =>
  value.replace(/ß/g, "ss").replace(/ẞ/g, "SS");

const safeVariants = parsed.variants
  .map((v: any, i: number) => ({
    title:
      typeof v?.title === "string" && v.title.trim()
        ? toSwissGerman(v.title.trim())
        : `Variante ${i + 1}`,
    text:
      typeof v?.text === "string" && v.text.trim()
        ? toSwissGerman(v.text.trim())
        : "",
  }))
  .filter((v: any) => v.text)
  .slice(0, 3);

    if (safeVariants.length === 0) {
      return NextResponse.json(
        { error: "Keine Varianten erhalten." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      variants: safeVariants,
    });
  } catch (error) {
    console.error("GENERATE ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler beim Generieren.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}