import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Stil = "luxus" | "modern" | "minimal";
type Sprache = "de-CH" | "de-DE" | "en";
type Format = "standard" | "homegate" | "immoscout";

function styleRules(stil: Stil) {
  if (stil === "luxus")
    return `Ton: hochwertig, elegant, aber nicht kitschig. Fokus: Exklusivität, Qualität, Atmosphäre.`;
  if (stil === "modern")
    return `Ton: modern, klar, zeitgemäss. Fokus: Funktionalität, Lifestyle, Licht, Raum, Komfort.`;
  return `Ton: minimalistisch, präzise, kurz & knackig. Keine Floskeln, keine Übertreibungen.`;
}

function formatRules(format: Format) {
  if (format === "homegate")
    return `Format: Homegate-geeignet. Klarer Titel, kurze Absätze, danach Highlights als Bulletpoints, am Schluss CTA. Keine Sonderzeichen-Orgien.`;
  if (format === "immoscout")
    return `Format: ImmoScout24-geeignet. Sehr scannbar, kurze Sätze, klare Benefits, starke Highlights, sauberer Abschluss.`;
  return `Format: Standard (Web/Print). Gute Struktur, gut lesbar.`;
}

function languageRules(sprache: Sprache) {
  if (sprache === "en") return `Language: English (professional real estate copy).`;
  if (sprache === "de-DE") return `Sprache: Deutsch (DE), formell.`;
  return `Sprache: Deutsch (CH), professionell.`;
}

export async function POST(req: Request) {
  try {
    const {
      lage,
      preis,
      groesse,
      besonderheiten,
      stil,
      sprache,
      format,
      nVariants,
    } = await req.json();

    const n = Math.min(Math.max(Number(nVariants || 3), 1), 5);

    const prompt = `
Du bist ein professioneller Immobilien-Copywriter.

${languageRules(sprache)}
${styleRules(stil)}
${formatRules(format)}

Objektdaten:
- Ort/Lage: ${lage}
- Preis: ${preis}
- Grösse/Typ: ${groesse}
- Besonderheiten: ${besonderheiten || "-"}

Erstelle ${n} unterschiedliche Varianten.

WICHTIG:
- Jede Variante hat: Titel, Fliesstext (2–4 Absätze), Highlights (5–7 Bulletpoints), CTA (1 Satz).
- Keine erfundenen Fakten (z.B. "Seesicht" nur wenn es in Besonderheiten steht).
- Preis nicht überbetonen, aber erwähnen wenn sinnvoll.
- Gib als Antwort ausschliesslich gültiges JSON im folgenden Schema zurück:

{
  "variants": [
    {
      "title": "...",
      "body": "...",
      "bullets": ["...", "..."],
      "cta": "...",
      "raw": "Kompletter Text wie für Copy/PDF"
    }
  ]
}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "Return only valid JSON. No markdown." },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || "";
    // JSON parsing robust
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      // fallback: versuchen JSON aus Text herauszuschneiden
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        json = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("Model returned non-JSON.");
      }
    }

    return Response.json(json);
  } catch (err: any) {
    return new Response(err?.message || "Server error", { status: 500 });
  }
}