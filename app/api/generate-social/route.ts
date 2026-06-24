import { NextResponse } from "next/server";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
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
      email,
      demo,
    } = body;

    let user = null;

    if (!demo) {
      if (!email) {
        return NextResponse.json(
          { error: "Nicht eingeloggt. Bitte erneut anmelden." },
          { status: 401 }
        );
      }

      user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Benutzer wurde nicht gefunden." },
          { status: 404 }
        );
      }

      if (
        user.plan === "free" &&
        user.freeGenerationsUsed >= user.freeGenerationLimit
      ) {
        return NextResponse.json(
          {
           error: user.isFounder
  ? "Dein kostenloser Testzeitraum ist abgelaufen. Dein Founder-Plan startet danach automatisch für 19.90 CHF pro Monat. Bitte stelle sicher, dass dein Abo aktiv ist, um weiter Inserate zu erstellen."
  : "Dein kostenloser Testzeitraum ist abgelaufen. Bitte aktiviere einen Plan, um weiter Inserate zu erstellen.",
          },
          { status: 403 }
        );
      }
    }

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
- Jede Variante soll ungefähr 120 bis 180 Wörter lang sein.
- Jede Variante braucht einen Titel und einen Text.
- Gib NUR gültiges JSON zurück, ohne Markdown und ohne Erklärung.

Varianten:
1. Emotional und einladend
2. Sachlich, professionell und seriös
3. Modern, verkaufsstark und digital optimiert

Format:
{
  "variants": [
    {
      "title": "Emotionaler Titel",
      "text": "Emotionaler Text"
    },
    {
      "title": "Professioneller Titel",
      "text": "Professioneller Text"
    },
    {
      "title": "Moderner Titel",
      "text": "Moderner Text"
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

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Die KI-Ausgabe konnte nicht gelesen werden." },
        { status: 500 }
      );
    }

    if (!parsed.variants || !Array.isArray(parsed.variants)) {
      return NextResponse.json(
        { error: "Keine Varianten erhalten." },
        { status: 500 }
      );
    }

    const safeVariants = parsed.variants
      .map((v: any, i: number) => ({
        title:
          typeof v?.title === "string" && v.title.trim()
            ? v.title.trim()
            : `Variante ${i + 1}`,
        text:
          typeof v?.text === "string" && v.text.trim()
            ? v.text.trim()
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

    if (user && user.plan === "free") {
      await prisma.user.update({
        where: { email: user.email },
        data: {
          freeGenerationsUsed: {
            increment: 1,
          },
        },
      });
    }

    return NextResponse.json({
      variants: safeVariants,
    });
  } catch (error) {
    console.error("GENERATE ERROR:", error);

    return NextResponse.json(
      { error: "Fehler beim Generieren." },
      { status: 500 }
    );
  }
}