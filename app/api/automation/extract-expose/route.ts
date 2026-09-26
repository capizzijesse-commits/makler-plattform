import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-4.1-mini";
const MAX_FILE_BYTES = 4_000_000;

type ExtractedExpose = {
  projectName: string;
  countryCode: "CH" | "DE" | "AT";
  street: string;
  postalCode: string;
  location: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  highlights: string;
  styleText: string;
  sourceSummary: string;
  missingFields: string[];
};

function emptyResult(): ExtractedExpose {
  return {
    projectName: "",
    countryCode: "CH",
    street: "",
    postalCode: "",
    location: "",
    propertyType: "",
    rooms: "",
    livingArea: "",
    price: "",
    highlights: "",
    styleText: "",
    sourceSummary: "",
    missingFields: [],
  };
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeResult(value: unknown): ExtractedExpose {
  const raw = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};

  const country = cleanString(raw.countryCode).toUpperCase();
  const countryCode: ExtractedExpose["countryCode"] =
    country === "DE" || country === "AT" ? country : "CH";

  const missingFields = Array.isArray(raw.missingFields)
    ? raw.missingFields.map(cleanString).filter(Boolean).slice(0, 20)
    : [];

  return {
    ...emptyResult(),
    projectName: cleanString(raw.projectName),
    countryCode,
    street: cleanString(raw.street),
    postalCode: cleanString(raw.postalCode),
    location: cleanString(raw.location),
    propertyType: cleanString(raw.propertyType),
    rooms: cleanString(raw.rooms),
    livingArea: cleanString(raw.livingArea),
    price: cleanString(raw.price),
    highlights: cleanString(raw.highlights),
    styleText: cleanString(raw.styleText),
    sourceSummary: cleanString(raw.sourceSummary),
    missingFields,
  };
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error("Das Exposé konnte nicht strukturiert ausgewertet werden.");
  }
}

function friendlyOpenAiError(error: unknown) {
  const candidate = error as {
    status?: number;
    code?: string;
    message?: string;
  };

  if (
    candidate?.status === 429 ||
    candidate?.code === "insufficient_quota" ||
    /credits|quota|billing/i.test(candidate?.message || "")
  ) {
    return {
      status: 503,
      code: "AI_TEMPORARILY_UNAVAILABLE",
      message:
        "Die KI-Auswertung ist derzeit nicht verfügbar. Deine Dateien bleiben unverändert – bitte später erneut versuchen.",
    };
  }

  return {
    status: 500,
    code: "EXPOSE_EXTRACTION_FAILED",
    message:
      "Das Exposé konnte gerade nicht automatisch ausgewertet werden. Bitte später erneut versuchen.",
  };
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, code: "UNAUTHORIZED", error: "Bitte zuerst anmelden." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, code: "FILE_REQUIRED", error: "Bitte ein Exposé auswählen." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: "FILE_TOO_LARGE",
          error: "Das Exposé darf für diesen ersten Automationslauf maximal 4 MB gross sein.",
        },
        { status: 413 }
      );
    }

    const allowed = new Set([
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);

    if (!allowed.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          code: "UNSUPPORTED_FILE_TYPE",
          error: "Bitte PDF, DOCX oder TXT als Exposé verwenden.",
        },
        { status: 415 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileData = `data:${file.type};base64,${bytes.toString("base64")}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: file.name || "expose.pdf",
              file_data: fileData,
            },
            {
              type: "input_text",
              text: `
Du bist die Fakten-Extraktion von Inserat-AI.
Lies das Immobilien-Exposé und extrahiere ausschliesslich belegte Fakten.
Erfinde nichts und leite keine Vorteile ab, die nicht ausdrücklich im Dokument stehen.

Gib NUR valides JSON in dieser Struktur zurück:
{
  "projectName": "kurzer interner Objektname, wenn sinnvoll aus den Fakten ableitbar",
  "countryCode": "CH oder DE oder AT",
  "street": "Strasse inkl. Hausnummer, nur falls vorhanden",
  "postalCode": "PLZ",
  "location": "Ort/Gemeinde",
  "propertyType": "Objektart",
  "rooms": "Zimmerzahl ohne Zusatztext",
  "livingArea": "Wohnfläche als Zahl oder kurze belegte Angabe",
  "price": "Preis mit Währung, falls vorhanden",
  "highlights": "kommagetrennte belegte Ausstattungsmerkmale",
  "styleText": "kurze neutrale Stilbeschreibung nur wenn ausdrücklich belegt, sonst leer",
  "sourceSummary": "maximal 2 kurze Sätze mit den wichtigsten belegten Fakten",
  "missingFields": ["Feldnamen, die für ein Immobilieninserat wichtig sind, aber im Dokument fehlen"]
}

Regeln:
- Unbekannte Werte als leeren String zurückgeben.
- Keine Schätzungen.
- Keine erfundenen Lagevorteile.
- Keine Zielgruppen erfinden.
- Zahlen, Flächen und Preise exakt übernehmen.
`.trim(),
            },
          ],
        },
      ],
      max_output_tokens: 1200,
    });

    const extracted = normalizeResult(parseJsonObject(response.output_text || ""));

    return NextResponse.json({ success: true, extracted });
  } catch (error) {
    console.error("AUTOMATION EXPOSE EXTRACTION ERROR:", error);
    const friendly = friendlyOpenAiError(error);

    return NextResponse.json(
      { success: false, code: friendly.code, error: friendly.message },
      { status: friendly.status }
    );
  }
}
