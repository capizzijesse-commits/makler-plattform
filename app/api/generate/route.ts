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
  location,
  propertyType,
  rooms,
  livingArea,
  price,
  style,
  tone,
  extras,
  variants,
} = await req.json();

const lage = location ?? "";
const preis = price ?? "";
const groesse = `${rooms ?? "-"} Zimmer / ${livingArea ?? "-"} m² / ${propertyType ?? "-"}`;
const besonderheiten = extras ?? "";
const stil = (style ?? "luxus") as Stil;
const sprache: Sprache = "de-CH";
const format: Format = "standard";
const nVariants = variants ?? 3;
    const n = Math.min(Math.max(Number(nVariants || 3), 1), 5);

const prompt = `
Du bist ein professioneller Immobilienmakler in der Schweiz.

Erstelle 3 unterschiedliche Inserattexte für folgende Immobilie.

Ort: ${location}
Zimmer: ${rooms}
Wohnfläche: ${livingArea} m²
Preis: ${price} CHF

Stil 1: Klassisch und sachlich (typisches Homegate Inserat)
Stil 2: Emotional und verkaufsstark
Stil 3: Luxus / Premium Stil

Jeder Text soll enthalten:
- Titel
- Beschreibung
- Highlights als Liste

Die Texte sollen professionell und realistisch für Immobilienportale sein.
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

let json: any;
try {
  json = JSON.parse(text);
} catch {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    json = JSON.parse(text.slice(start, end + 1));
  } else {
    throw new Error("Model returned non-JSON.");
  }
}

const normalized = {
  variants: (json?.variants ?? []).map((v: any) => ({
    title: v.title ?? "",
    text: v.raw ?? v.body ?? "",
    highlights: v.bullets ?? [],
    cta: v.cta ?? "",
  })),
};

return Response.json(normalized);
} catch (err: any) {
  return new Response(err?.message || "Server error", { status: 500 });
}
}