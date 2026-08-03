import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canUseListingCoreForUser } from "@/lib/listing-access";
import { prisma } from "@/lib/prisma";
import { normalizeUserPlan } from "@/lib/plans";
import { getAuthenticatedUser } from "@/lib/session";

const DEMO_GENERATION_LIMIT = 1;

async function releaseDemoGeneration(
  userId: string | null
) {
  if (!userId) {
    return;
  }

  await prisma.user
    .updateMany({
      where: {
        id: userId,
        freeGenerationsUsed: {
          gt: 0,
        },
      },
      data: {
        freeGenerationsUsed: {
          decrement: 1,
        },
      },
    })
    .catch(() => undefined);
}

export async function POST(req: NextRequest) {
  let demoReservationUserId: string | null = null;

  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        {
          error: "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

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

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    const hasListingAccess =
      await canUseListingCoreForUser({
        userId: user.id,
        plan: user.plan,
        listingId,
      });

    const isDemoPlan =
      normalizeUserPlan(user.plan) === "free";

    if (isDemoPlan && !hasListingAccess) {
      const reservation =
        await prisma.user.updateMany({
          where: {
            id: user.id,
            freeGenerationsUsed: {
              lt: DEMO_GENERATION_LIMIT,
            },
          },
          data: {
            freeGenerationsUsed: {
              increment: 1,
            },
          },
        });

      if (reservation.count !== 1) {
        return NextResponse.json(
          {
            error:
              "Die kostenlose Demo-Generierung wurde bereits verwendet. Schalte eine Immobilie für CHF 9.90 frei oder wähle den Founder-Plan.",
            code: "DEMO_LIMIT_REACHED",
          },
          {
            status: 403,
          }
        );
      }

      demoReservationUserId = user.id;
    }

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
      await releaseDemoGeneration(
        demoReservationUserId
      );

      demoReservationUserId = null;

      return NextResponse.json(
        { error: "Die AI-Ausgabe konnte nicht korrekt gelesen werden." },
        { status: 500 }
      );
    }

    if (!parsed.variants || !Array.isArray(parsed.variants)) {
      await releaseDemoGeneration(
        demoReservationUserId
      );

      demoReservationUserId = null;

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
      await releaseDemoGeneration(
        demoReservationUserId
      );

      demoReservationUserId = null;

      return NextResponse.json(
        { error: "Keine Varianten erhalten." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      variants: safeVariants,
    });
  } catch (error) {
    await releaseDemoGeneration(
      demoReservationUserId
    );

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