import OpenAI, { toFile } from "openai";
import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/session";

import {
  extractPropertyPhotosFromPdf,
} from "@/lib/pdf-extract-property-photos.server";

const MODEL = process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-4.1-mini";
const EXPOSE_PREFIX = "/automation-exposes/";
const MAX_EXPOSE_BYTES = 25 * 1024 * 1024;


// PDF_TEXT_FAST_PATH_V1
async function extractPdfTextFast(
  bytes: Uint8Array
): Promise<{
  text: string;
  pageCount: number;
  textPageCount: number;
}> {
  await import(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );

  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const loadingTask =
    pdfjs.getDocument({
      data:
        new Uint8Array(bytes),
      useSystemFonts:
        false,
    });

  const pdf =
    await loadingTask.promise;

  const pageTexts: string[] = [];

  try {
    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page =
        await pdf.getPage(
          pageNumber
        );

      try {
        const content =
          await page.getTextContent();

        const text =
          content.items
            .map((item) =>
              "str" in item
                ? item.str
                : ""
            )
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        if (text) {
          pageTexts.push(
            `[PAGE ${pageNumber}]\n${text}`
          );
        }
      } finally {
        page.cleanup();
      }
    }

    return {
      text:
        pageTexts.join(
          "\n\n"
        ),
      pageCount:
        pdf.numPages,
      textPageCount:
        pageTexts.length,
    };
  } finally {
    await loadingTask.destroy();
  }
}

function isPdfTextFastPathUsable(
  result: {
    text: string;
    pageCount: number;
    textPageCount: number;
  }
): boolean {
  const normalized =
    result.text.trim();

  if (
    normalized.length < 1000
  ) {
    return false;
  }

  if (
    result.textPageCount < 2
  ) {
    return false;
  }

  const textCoverage =
    result.pageCount > 0
      ? result.textPageCount /
        result.pageCount
      : 0;

  if (
    result.pageCount >= 4 &&
    textCoverage < 0.2
  ) {
    return false;
  }

  return true;
}

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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

type ExtractRequest = {
  fileUrl?: unknown;
  fileName?: unknown;
  fileType?: unknown;
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
  const raw =
    value && typeof value === "object"
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

// EXPOSE_PRICE_FIREWALL_V1
function normalizePriceDigits(
  value: string
): string {
  return value.replace(/\D/g, "");
}

function hasExplicitSalePriceEvidence(
  documentText: string,
  extractedPrice: string
): boolean {
  const priceDigits =
    normalizePriceDigits(
      extractedPrice
    );

  if (!priceDigits) {
    return false;
  }

  const normalizedDocument =
    documentText
      .replace(/[???`']/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const allowedLabels =
    /(?:kaufpreis|verkaufspreis|angebotspreis|asking\s+price|purchase\s+price|sale\s+price)/i;

  const forbiddenLabels =
    /(?:verkehrswert|steuerlicher\s+verkehrswert|ertragswert|versicherungswert|geb?udeversicherungswert|gebaeudeversicherungswert|steuerwert)/i;

  const chunks =
    normalizedDocument.split(
      /(?<=[.!?])\s+|\n+/g
    );

  for (const chunk of chunks) {
    if (!allowedLabels.test(chunk)) {
      continue;
    }

    if (forbiddenLabels.test(chunk)) {
      continue;
    }

    const chunkDigits =
      normalizePriceDigits(
        chunk
      );

    if (
      chunkDigits.includes(
        priceDigits
      )
    ) {
      return true;
    }
  }

  return false;
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
    type?: string;
    message?: string;
  };

  const signal = [
    candidate?.code,
    candidate?.type,
    candidate?.message,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    candidate?.status === 429 ||
    /insufficient_quota|billing_hard_limit|credits|quota|billing|429/i.test(signal)
  ) {
    return {
      status: 503,
      code: "AI_TEMPORARILY_UNAVAILABLE",
      message:
        "Die KI-Auswertung ist momentan nicht verfügbar. Deine Datei wurde nicht dauerhaft gespeichert. Sobald der API-Zugang wieder aktiv ist, kannst du denselben Ablauf erneut starten.",
    };
  }

  if (/file|pdf|document|download|fetch/i.test(signal)) {
    return {
      status: 502,
      code: "EXPOSE_FILE_PROCESSING_FAILED",
      message:
        "Das Exposé konnte technisch nicht gelesen werden. Bitte denselben Upload erneut versuchen.",
    };
  }

  return {
    status: 500,
    code: "EXPOSE_EXTRACTION_FAILED",
    message:
      "Das Exposé konnte gerade nicht automatisch ausgewertet werden. Bitte später erneut versuchen.",
  };
}

function isTrustedBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com") &&
      url.pathname.startsWith(EXPOSE_PREFIX)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        code: "UNAUTHORIZED",
        error: "Bitte zuerst anmelden.",
      },
      { status: 401 }
    );
  }

  let cleanupUrl = "";
  let openAiFileId = "";
  let openai: OpenAI | null = null;

  try {
    const body = (await request.json()) as ExtractRequest;
    const fileUrl = cleanString(body.fileUrl);
    const fileName = cleanString(body.fileName) || "expose.pdf";
    const fileType = cleanString(body.fileType) || "application/pdf";

    if (!fileUrl || !isTrustedBlobUrl(fileUrl)) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_FILE_URL",
          error: "Das hochgeladene Exposé konnte nicht verifiziert werden.",
        },
        { status: 400 }
      );
    }

    cleanupUrl = fileUrl;

    if (!ALLOWED_CONTENT_TYPES.has(fileType)) {
      return NextResponse.json(
        {
          success: false,
          code: "UNSUPPORTED_FILE_TYPE",
          error: "Bitte PDF, DOCX oder TXT als Exposé verwenden.",
        },
        { status: 415 }
      );
    }

    // EXPOSE_SPEED_PROFILE_V1
    const exposeProfileStartedAt = performance.now();
    let exposeProfileStepAt = exposeProfileStartedAt;

    const sourceResponse = await fetch(fileUrl, {
      cache: "no-store",
    });

    if (!sourceResponse.ok) {
      throw new Error(
        `EXPOSE_BLOB_DOWNLOAD_FAILED_${sourceResponse.status}`
      );
    }

    const bytes = new Uint8Array(await sourceResponse.arrayBuffer());

    console.log("[EXPOSE SPEED] blob-download", {
      durationMs: Math.round(performance.now() - exposeProfileStepAt),
      bytes: bytes.byteLength,
    });
    exposeProfileStepAt = performance.now();

    if (bytes.byteLength <= 0 || bytes.byteLength > MAX_EXPOSE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_FILE_SIZE",
          error: "Das Exposé darf maximal 25 MB gross sein.",
        },
        { status: 413 }
      );
    }

    // AUTOMATION_PDF_PROPERTY_PHOTOS_V1
    const pdfPropertyPhotosPromise =
      fileType === "application/pdf"
        ? extractPropertyPhotosFromPdf(
            Buffer.from(bytes),
            {
              maximumPhotos: 10,
              minimumConfidence: 0.7,
            }
          )
        : Promise.resolve({
            candidateCount: 0,
            propertyPhotoCount: 0,
            photos: [],
          });

    // PDF_TEXT_FAST_PATH_DECISION_V1
    let pdfFastText = "";
    let usePdfTextFastPath = false;

    if (
      fileType === "application/pdf"
    ) {
      const pdfTextStartedAt =
        performance.now();

      try {
        const pdfTextResult =
          await extractPdfTextFast(
            bytes
          );

        usePdfTextFastPath =
          isPdfTextFastPathUsable(
            pdfTextResult
          );

        if (
          usePdfTextFastPath
        ) {
          pdfFastText =
            pdfTextResult.text;
        }

        console.log(
          "[EXPOSE PDF TEXT FAST PATH]",
          {
            usable:
              usePdfTextFastPath,
            pages:
              pdfTextResult.pageCount,
            textPages:
              pdfTextResult.textPageCount,
            characters:
              pdfTextResult.text.length,
            durationMs:
              Math.round(
                performance.now() -
                  pdfTextStartedAt
              ),
          }
        );
      } catch (error) {
        console.warn(
          "[EXPOSE PDF TEXT FAST PATH] fallback",
          error
        );

        pdfFastText = "";
        usePdfTextFastPath = false;
      }
    }

    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // PDF_TEXT_FAST_PATH_EXECUTION_V1
    const extractionPrompt = `
Du bist die Fakten-Extraktion von Inserat-AI.
Lies den gelieferten Immobilien-Expos?-Inhalt und extrahiere ausschliesslich belegte Fakten.
Erfinde nichts und leite keine Vorteile ab, die nicht ausdr?cklich im Dokument stehen.

Gib NUR valides JSON in dieser Struktur zur?ck:
{
  "projectName": "kurzer interner Objektname, wenn sinnvoll aus den Fakten ableitbar",
  "countryCode": "CH oder DE oder AT",
  "street": "Strasse inkl. Hausnummer, nur falls vorhanden",
  "postalCode": "PLZ",
  "location": "Ort/Gemeinde",
  "propertyType": "Objektart",
  "rooms": "Zimmerzahl ohne Zusatztext",
  "livingArea": "Wohnfl?che als Zahl oder kurze belegte Angabe",
  "price": "Preis mit W?hrung, falls vorhanden",
  "highlights": "kommagetrennte belegte Ausstattungsmerkmale",
  "styleText": "kurze neutrale Stilbeschreibung nur wenn ausdr?cklich belegt, sonst leer",
  "sourceSummary": "maximal 2 kurze S?tze mit den wichtigsten belegten Fakten",
  "missingFields": ["Feldnamen, die f?r ein Immobilieninserat wichtig sind, aber im Dokument fehlen"]
}

Regeln:

ADRESSE:
- Adresse nur ?bernehmen, wenn sie ausdr?cklich im Dokument steht.
- "street" muss den vollst?ndigen ausdr?cklich genannten Strassennamen inklusive Hausnummer enthalten.
- Artikel oder Pr?positionen wie "Am", "Im" oder "An der" beibehalten, wenn sie Teil der Adresse sind.
- Eine vorhandene Hausnummer darf niemals entfernt werden.
- PLZ und Ort getrennt ausgeben.
- Keine Adresse oder PLZ erraten oder nachschlagen.

WOHNFL?CHE:
- "livingArea" muss die ausdr?cklich als Wohnfl?che bezeichnete Gesamtfl?che sein.
- Eine ausdr?cklich genannte "Netto Wohnfl?che", "Nettowohnfl?che" oder eindeutig gleichwertige Gesamt-Wohnfl?che hat Vorrang.
- Zahlen aus Ertragswert-, Bewertungs-, Kapitalisierungs-, Versicherungs- oder Vergleichstabellen sind keine Wohnfl?che.
- HNF, NNF, Geschossfl?che, Grundst?cksfl?che und einzelne Raumfl?chen nicht als livingArea verwenden, wenn eine explizite Gesamt-Wohnfl?che vorhanden ist.
- Den Wert exakt ?bernehmen.

PREIS:
- "price" darf NUR einen ausdr?cklich genannten Verkaufs-, Kauf-, Angebots- oder Verkaufspreis enthalten.
- Verkehrswert ist KEIN Verkaufspreis.
- Steuerlicher Verkehrswert ist KEIN Verkaufspreis.
- Ertragswert ist KEIN Verkaufspreis.
- Versicherungswert und Geb?udeversicherung sind KEIN Verkaufspreis.
- Grundst?ckswerte, Wertquoten und Einzelwerte sind KEIN Verkaufspreis.
- Wenn kein ausdr?cklicher Verkaufs-, Kauf- oder Angebotspreis vorhanden ist, MUSS "price" ein leerer String sein.

DATENSCHUTZ:
- Keine Namen von Eigent?mern, Verk?ufern, K?ufern oder Kontaktpersonen in sourceSummary, highlights oder styleText ausgeben.
- Personenbezogene Namen sind keine Inseratfakten.

ZUSAMMENFASSUNG:
- sourceSummary maximal 2 kurze S?tze.
- Nur inseratrelevante Objektfakten aufnehmen.
- Keine Bewertungswerte als Verkaufspreis darstellen.

ALLGEMEIN:
- Keine Sch?tzungen.
- Keine Fakten erfinden.
- Zahlen und Fl?chen exakt ?bernehmen.
- Unbekannte Werte als leeren String zur?ckgeben.
- Keine erfundenen Lagevorteile.
- Keine Zielgruppen erfinden.
`.trim();

    const aiStartedAt =
      performance.now();

    const response =
      usePdfTextFastPath
        ? await openai.responses.create({
            model: MODEL,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text:
                      extractionPrompt +
                      "\n\nDOKUMENT:\n\n" +
                      pdfFastText,
                  },
                ],
              },
            ],
            max_output_tokens: 1200,
          })
        : await (async () => {
            const uploadStartedAt =
              performance.now();

            const uploadable =
              await toFile(
                bytes,
                fileName,
                {
                  type: fileType,
                }
              );

            const uploaded =
              await openai.files.create({
                file: uploadable,
                purpose: "user_data",
              });

            openAiFileId =
              uploaded.id;

            console.log(
              "[EXPOSE SPEED] openai-file-upload",
              {
                durationMs:
                  Math.round(
                    performance.now() -
                      uploadStartedAt
                  ),
              }
            );

            return openai.responses.create({
              model: MODEL,
              input: [
                {
                  role: "user",
                  content: [
                    {
                      type: "input_file",
                      file_id:
                        uploaded.id,
                    },
                    {
                      type: "input_text",
                      text:
                        extractionPrompt,
                    },
                  ],
                },
              ],
              max_output_tokens: 1200,
            });
          })();

    console.log(
      "[EXPOSE SPEED] ai-extraction",
      {
        mode:
          usePdfTextFastPath
            ? "pdf-text-fast"
            : "full-file-fallback",
        durationMs:
          Math.round(
            performance.now() -
              aiStartedAt
          ),
      }
    );

    exposeProfileStepAt =
      performance.now();

    const extracted =
      normalizeResult(
        parseJsonObject(
          response.output_text || ""
        )
      );

    if (
      usePdfTextFastPath &&
      extracted.price &&
      !hasExplicitSalePriceEvidence(
        pdfFastText,
        extracted.price
      )
    ) {
      console.warn(
        "[EXPOSE PRICE FIREWALL] rejected",
        {
          extractedPrice:
            extracted.price,
        }
      );

      extracted.price = "";

      if (
        !extracted.missingFields.includes(
          "price"
        )
      ) {
        extracted.missingFields.push(
          "price"
        );
      }
    }

    const pdfPropertyPhotos =
      await pdfPropertyPhotosPromise;

    console.log("[EXPOSE PDF PHOTOS]", {
      candidateCount:
        pdfPropertyPhotos.candidateCount,
      propertyPhotoCount:
        pdfPropertyPhotos.propertyPhotoCount,
      returnedPhotos:
        pdfPropertyPhotos.photos.length,
    });

    const extractedPhotos =
      pdfPropertyPhotos.photos.map(
        (photo, index) => ({
          fileName:
            `expose-photo-${String(index + 1).padStart(2, "0")}.jpg`,
          mimeType: "image/jpeg",
          width: photo.width,
          height: photo.height,
          pageNumber: photo.pageNumber,
          imageIndex: photo.imageIndex,
          confidence: photo.confidence,
          reason: photo.reason,
          base64:
            photo.buffer.toString("base64"),
        })
      );

    // EXPOSE_ADDRESS_DIAGNOSTIC_V1
    console.log("[EXPOSE ADDRESS]", {
      street: extracted.street,
      postalCode: extracted.postalCode,
      location: extracted.location,
      missingFields: extracted.missingFields,
    });

    console.log("[EXPOSE SPEED] completed", {
      parseMs: Math.round(performance.now() - exposeProfileStepAt),
      totalMs: Math.round(performance.now() - exposeProfileStartedAt),
    });

    return NextResponse.json({
      success: true,
      extracted,
      extractedPhotos,
    });
  } catch (error) {
    console.error("AUTOMATION EXPOSE EXTRACTION ERROR:", error);
    const friendly = friendlyOpenAiError(error);

    return NextResponse.json(
      {
        success: false,
        code: friendly.code,
        error: friendly.message,
      },
      { status: friendly.status }
    );
  } finally {
    if (openai && openAiFileId) {
      await openai.files.delete(openAiFileId).catch((cleanupError) => {
        console.warn(
          "AUTOMATION OPENAI FILE CLEANUP WARNING:",
          cleanupError
        );
      });
    }

    if (cleanupUrl) {
      await del(cleanupUrl).catch((cleanupError) => {
        console.warn(
          "AUTOMATION EXPOSE CLEANUP WARNING:",
          cleanupError
        );
      });
    }
  }
}
