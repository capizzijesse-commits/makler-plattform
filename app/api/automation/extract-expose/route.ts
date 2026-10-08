import OpenAI, { toFile } from "openai";
import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as unzipper from "unzipper";
import { XMLParser } from "fast-xml-parser";

import { getAuthenticatedUser } from "@/lib/session";
import { recordUserActivityEvent } from "@/lib/user-activity.server";

import {
  completeAutomationMonitoringRun,
  getMonitoringErrorFields,
  recordAutomationMonitoringEvent,
  startAutomationMonitoringRun,
} from "@/lib/automation-monitoring.server";

import {
  extractPropertyPhotosFromPdf,
} from "@/lib/pdf-extract-property-photos.server";


const MODEL = process.env.OPENAI_LISTING_MODEL?.trim() || "gpt-4.1-mini";
const EXPOSE_PREFIX = "/automation-exposes/";
const MAX_EXPOSE_BYTES = 25 * 1024 * 1024;


// SPREADSHEET_TEXT_FAST_PATH_V1
const SPREADSHEET_CONTENT_TYPES =
  new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
  ]);

function isSpreadsheetDocument(
  fileName: string,
  fileType: string
): boolean {
  return (
    SPREADSHEET_CONTENT_TYPES.has(fileType) ||
    /\.(xlsx|xls|csv)$/i.test(fileName)
  );
}

const MAX_XLSX_XML_ENTRY_BYTES =
  6 * 1024 * 1024;

const MAX_XLSX_XML_TOTAL_BYTES =
  20 * 1024 * 1024;

function asArray<T>(
  value: T | T[] | undefined | null
): T[] {
  if (value == null) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

function spreadsheetColumnIndex(
  reference: string
): number {
  const letters =
    reference.match(
      /^[A-Z]+/i
    )?.[0] || "";

  let index = 0;

  for (
    const character
    of letters.toUpperCase()
  ) {
    index =
      index * 26 +
      (
        character.charCodeAt(0) -
        64
      );
  }

  return Math.max(
    0,
    index - 1
  );
}

function spreadsheetRichText(
  node: unknown
): string {
  if (node == null) {
    return "";
  }

  if (
    typeof node === "string" ||
    typeof node === "number"
  ) {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node
      .map(
        spreadsheetRichText
      )
      .join("");
  }

  if (
    typeof node === "object"
  ) {
    const record =
      node as Record<
        string,
        unknown
      >;

    if ("t" in record) {
      return spreadsheetRichText(
        record.t
      );
    }

    if ("r" in record) {
      return asArray(
        record.r
      )
        .map(
          spreadsheetRichText
        )
        .join("");
    }
  }

  return "";
}

function normalizeSpreadsheetNumber(
  value: string
): string {
  if (
    !/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(
      value
    )
  ) {
    return value;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return value;
  }

  return Number.parseFloat(
    number.toPrecision(15)
  ).toString();
}

async function extractXlsxText(
  bytes: Uint8Array,
  fileName: string
): Promise<string> {
  const directory =
    await unzipper.Open.buffer(
      Buffer.from(bytes)
    );

  let totalXmlBytes = 0;

  for (
    const entry
    of directory.files
  ) {
    if (
      !entry.path.endsWith(
        ".xml"
      ) &&
      !entry.path.endsWith(
        ".rels"
      )
    ) {
      continue;
    }

    const size =
      Number(
        entry.uncompressedSize || 0
      );

    if (
      size >
      MAX_XLSX_XML_ENTRY_BYTES
    ) {
      throw new Error(
        `Die Tabellen-Unterlage "${fileName}" enthält eine zu grosse XML-Datei.`
      );
    }

    totalXmlBytes += size;

    if (
      totalXmlBytes >
      MAX_XLSX_XML_TOTAL_BYTES
    ) {
      throw new Error(
        `Die Tabellen-Unterlage "${fileName}" ist entpackt zu gross.`
      );
    }
  }

  const parser =
    new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix:
        "@_",
      parseTagValue: false,
      trimValues: false,
    });

  const readXml =
    async (
      path: string,
      required = true
    ): Promise<
      Record<string, unknown> | null
    > => {
      const entry =
        directory.files.find(
          (item) =>
            item.path === path
        );

      if (!entry) {
        if (!required) {
          return null;
        }

        throw new Error(
          `Die Tabellen-Unterlage "${fileName}" ist unvollständig: ${path}`
        );
      }

      const buffer =
        await entry.buffer();

      if (
        buffer.length >
        MAX_XLSX_XML_ENTRY_BYTES
      ) {
        throw new Error(
          `Die Tabellen-Unterlage "${fileName}" enthält eine zu grosse XML-Datei.`
        );
      }

      return parser.parse(
        buffer.toString(
          "utf8"
        )
      ) as Record<
        string,
        unknown
      >;
    };

  const workbook =
    await readXml(
      "xl/workbook.xml"
    );

  const relationshipsXml =
    await readXml(
      "xl/_rels/workbook.xml.rels"
    );

  const sharedStringsXml =
    await readXml(
      "xl/sharedStrings.xml",
      false
    );

  const sharedRoot =
    sharedStringsXml
      ?.sst as
        | Record<
            string,
            unknown
          >
        | undefined;

  const sharedStrings =
    asArray(
      sharedRoot?.si
    ).map(
      spreadsheetRichText
    );

  const relationshipRoot =
    relationshipsXml
      ?.Relationships as
        | Record<
            string,
            unknown
          >
        | undefined;

  const relationships =
    new Map<
      string,
      string
    >();

  for (
    const relationship
    of asArray(
      relationshipRoot
        ?.Relationship
    )
  ) {
    if (
      !relationship ||
      typeof relationship !==
        "object"
    ) {
      continue;
    }

    const record =
      relationship as Record<
        string,
        unknown
      >;

    const id =
      String(
        record["@_Id"] || ""
      );

    const target =
      String(
        record["@_Target"] ||
          ""
      );

    if (
      id &&
      target.startsWith(
        "worksheets/"
      )
    ) {
      relationships.set(
        id,
        target
      );
    }
  }

  const workbookRoot =
    workbook?.workbook as
      | Record<
          string,
          unknown
        >
      | undefined;

  const sheetsRoot =
    workbookRoot?.sheets as
      | Record<
          string,
          unknown
        >
      | undefined;

  const sheets =
    asArray(
      sheetsRoot?.sheet
    );

  const sections: string[] =
    [];

  for (
    let index = 0;
    index < sheets.length;
    index += 1
  ) {
    const sheet =
      sheets[index];

    if (
      !sheet ||
      typeof sheet !==
        "object"
    ) {
      continue;
    }

    const sheetRecord =
      sheet as Record<
        string,
        unknown
      >;

    const sheetName =
      String(
        sheetRecord[
          "@_name"
        ] ||
          `Tabelle ${index + 1}`
      );

    const relationId =
      String(
        sheetRecord[
          "@_r:id"
        ] || ""
      );

    const target =
      relationships.get(
        relationId
      );

    if (!target) {
      continue;
    }

    const sheetXml =
      await readXml(
        "xl/" + target
      );

    const worksheet =
      sheetXml
        ?.worksheet as
          | Record<
              string,
              unknown
            >
          | undefined;

    const sheetData =
      worksheet
        ?.sheetData as
          | Record<
              string,
              unknown
            >
          | undefined;

    const csvLines: string[] =
      [];

    for (
      const row
      of asArray(
        sheetData?.row
      )
    ) {
      if (
        !row ||
        typeof row !==
          "object"
      ) {
        continue;
      }

      const rowRecord =
        row as Record<
          string,
          unknown
        >;

      const values: string[] =
        [];

      for (
        const cell
        of asArray(
          rowRecord.c
        )
      ) {
        if (
          !cell ||
          typeof cell !==
            "object"
        ) {
          continue;
        }

        const cellRecord =
          cell as Record<
            string,
            unknown
          >;

        const reference =
          String(
            cellRecord[
              "@_r"
            ] || ""
          );

        const column =
          spreadsheetColumnIndex(
            reference
          );

        while (
          values.length <
          column
        ) {
          values.push("");
        }

        const type =
          String(
            cellRecord[
              "@_t"
            ] || ""
          );

        let value = "";

        if (type === "s") {
          const sharedIndex =
            Number(
              cellRecord.v
            );

          value =
            Number.isInteger(
              sharedIndex
            )
              ? sharedStrings[
                  sharedIndex
                ] || ""
              : "";
        } else if (
          type ===
          "inlineStr"
        ) {
          value =
            spreadsheetRichText(
              cellRecord.is
            );
        } else {
          value =
            cellRecord.v == null
              ? ""
              : normalizeSpreadsheetNumber(
                  String(
                    cellRecord.v
                  )
                );
        }

        values.push(
          value.replace(
            /\r?\n/g,
            " "
          )
        );
      }

      const line =
        values.join(",");

      if (
        line.replace(
          /,/g,
          ""
        ).trim()
      ) {
        csvLines.push(
          line
        );
      }
    }

    const trimmed =
      csvLines
        .join("\n")
        .trim();

    if (!trimmed) {
      continue;
    }

    sections.push(
      [
        `TABELLE ${index + 1}: ${sheetName}`,
        trimmed,
      ].join("\n")
    );
  }

  const text =
    sections.join(
      "\n\n--- NAECHSTE TABELLE ---\n\n"
    );

  if (!text) {
    throw new Error(
      `Die Tabellen-Unterlage "${fileName}" enthält keine lesbaren Daten.`
    );
  }

  return text.slice(
    0,
    120000
  );
}

async function extractSpreadsheetText(
  bytes: Uint8Array,
  fileName: string
): Promise<string> {
  if (
    /\.csv$/i.test(
      fileName
    )
  ) {
    const text =
      new TextDecoder(
        "utf-8"
      )
        .decode(bytes)
        .trim();

    if (!text) {
      throw new Error(
        `Die Tabellen-Unterlage "${fileName}" enthält keine lesbaren Daten.`
      );
    }

    return text.slice(
      0,
      120000
    );
  }

  if (
    /\.xls$/i.test(
      fileName
    ) &&
    !/\.xlsx$/i.test(
      fileName
    )
  ) {
    throw new Error(
      "Legacy-XLS wird aus Sicherheitsgründen derzeit nicht verarbeitet. Bitte als XLSX oder CSV speichern."
    );
  }

  return extractXlsxText(
    bytes,
    fileName
  );
}

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
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
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

type ExtractDocumentRequest = {
  fileUrl?: unknown;
  fileName?: unknown;
  fileType?: unknown;
};

type ExtractRequest = ExtractDocumentRequest & {
  files?: unknown;
  skipPdfPhotoExtraction?: boolean;
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

// EXPOSE_LIVING_AREA_FIREWALL_V1
function extractExplicitNetLivingArea(
  documentText: string
): string {
  const match =
    documentText.match(
      /Netto\s+Wohnfl(?:\u00e4|ae)che\s*,\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i
    );

  if (!match?.[1]) {
    return "";
  }

  return match[1]
    .replace(",", ".")
    .trim();
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

// SPEED_BOOSTER_V2_LOCAL_FACTS
function extractLocalFastFacts(
  documentText: string
): ExtractedExpose {
  const result =
    emptyResult();

  const text =
    documentText
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ");

  const firstMatch = (
    patterns: RegExp[]
  ): string => {
    for (const pattern of patterns) {
      const match =
        text.match(pattern);

      if (match?.[1]) {
        return match[1]
          .trim()
          .replace(
            /\s+/g,
            " "
          );
      }
    }

    return "";
  };

  result.postalCode =
    firstMatch([
      /(?:PLZ|Postleitzahl)\s*[:\-]?\s*([0-9]{4,5})\b/i,
      /\b([0-9]{4})\s+[A-Z???][A-Za-z???????\- ]{2,50}\b/,
    ]);

  result.location =
    firstMatch([
      /(?:Ort|Gemeinde|Ortschaft)\s*[:\-]?\s*([^\n,;]{2,60})/i,
      /\b[0-9]{4}\s+([A-Z???][A-Za-z???????\- ]{2,50})\b/,
    ]);

  result.street =
    firstMatch([
      /(?:Strasse|Stra?e|Adresse)\s*[:\-]?\s*([^\n,;]{3,100})/i,
    ]);

  result.rooms =
    firstMatch([
      /(?:Zimmer|Zimmerzahl|Anzahl Zimmer)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i,
      /\b([0-9]+(?:[.,][0-9]+)?)\s*[- ]?Zimmer\b/i,
    ])
      .replace(",", ".");

  result.livingArea =
    extractExplicitNetLivingArea(
      text
    ) ||
    firstMatch([
      /(?:Wohnfl(?:\u00e4|ae)che)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i,
    ])
      .replace(",", ".");

  result.propertyType =
    firstMatch([
      /\b(Einfamilienhaus|Mehrfamilienhaus|Doppelhaush\u00e4lfte|Doppelhaushaelfte|Reihenhaus|Eigentumswohnung|Wohnung|Penthouse|Attikawohnung|Maisonette|Villa|Grundst\u00fcck|Grundstueck|Gewerbeobjekt)\b/i,
      /(?:Objektart|Objekttyp|Immobilientyp)\s*[:\-]?\s*([^\n,;]{3,80})/i,
    ]);

  const priceMatch =
    text.match(
      /(?:Kaufpreis|Verkaufspreis|Angebotspreis)\s*[:\-]?\s*((?:CHF|EUR|\u20ac)?\s*[0-9][0-9'.\s]*(?:[.,][0-9]{2})?\s*(?:CHF|EUR|\u20ac)?)/i
    );

  if (priceMatch?.[1]) {
    result.price =
      priceMatch[1]
        .trim()
        .replace(
          /\s+/g,
          " "
        );
  }

  const projectParts = [
    result.propertyType,
    result.location,
  ].filter(Boolean);

  if (
    projectParts.length === 2
  ) {
    result.projectName =
      projectParts.join(" ");
  }

  const required: Array<
    keyof ExtractedExpose
  > = [
    "postalCode",
    "location",
    "propertyType",
    "rooms",
    "livingArea",
  ];

  result.missingFields =
    required
      .filter(
        (field) =>
          !String(
            result[field] ?? ""
          ).trim()
      )
      .map(String);

  return result;
}

function isLocalFastFactsReady(
  facts: ExtractedExpose
): boolean {
  return Boolean(
    facts.postalCode &&
    facts.location &&
    facts.propertyType &&
    facts.rooms &&
    facts.livingArea
  );
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

  // AUTOMATION_MEDIA_PLAN_LIMIT_V1
  const automationPlan =
    String(user.plan ?? "")
      .trim()
      .toLowerCase();

  const automationAllowed =
    automationPlan === "pro" ||
    automationPlan === "agency" ||
    automationPlan === "admin";

  if (!automationAllowed) {
    return NextResponse.json(
      {
        success: false,
        code: "AUTOMATION_PLAN_REQUIRED",
        error:
          "Die Vollautomatisierung ist in deinem aktuellen Plan nicht enthalten.",
      },
      { status: 403 }
    );
  }

  const cleanupUrls: string[] = [];
  const openAiFileIds: string[] = [];
  let openai: OpenAI | null = null;

  let monitoringRunId:
    | string
    | null = null;

  let monitoringStartedAt:
    | number
    | null = null;

  try {
    const contentType =
      request.headers.get("content-type") || "";

    const directDocuments: Array<{
      fileUrl: string;
      fileName: string;
      fileType: string;
      bytes?: Uint8Array;
    }> = [];

    let files: Array<{
      fileUrl: string;
      fileName: string;
      fileType: string;
      bytes?: Uint8Array;
    }> = [];

    let skipPdfPhotoExtraction =
      false;

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const form =
        await request.formData();

      skipPdfPhotoExtraction =
        form.get(
          "skipPdfPhotoExtraction"
        ) === "true";

      const directFiles =
        form
          .getAll("files")
          .filter(
            (value): value is File =>
              value instanceof File
          );

      for (
        const directFile
        of directFiles
      ) {
        const bytes =
          new Uint8Array(
            await directFile.arrayBuffer()
          );

        directDocuments.push({
          fileUrl: "",
          fileName:
            directFile.name ||
            "unterlage.pdf",
          fileType:
            directFile.type ||
            "application/pdf",
          bytes,
        });
      }

      files =
        directDocuments;
    } else {
      const body =
        (await request.json()) as ExtractRequest;

      skipPdfPhotoExtraction =
        body.skipPdfPhotoExtraction ===
        true;

      const rawFiles =
        Array.isArray(body.files)
          ? body.files
          : [body];

      files =
        rawFiles
          .map((value) => {
            const raw =
              value &&
              typeof value === "object"
                ? (
                    value as Record<
                      string,
                      unknown
                    >
                  )
                : {};

            return {
              fileUrl:
                cleanString(
                  raw.fileUrl
                ),
              fileName:
                cleanString(
                  raw.fileName
                ) ||
                "unterlage.pdf",
              fileType:
                cleanString(
                  raw.fileType
                ) ||
                "application/pdf",
            };
          })
          .filter(
            (file) =>
              Boolean(file.fileUrl)
          );
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_FILE_URL",
          error:
            "Es wurden keine g?ltigen Objektunterlagen ?bermittelt.",
        },
        { status: 400 }
      );
    }

    const {
      fileUrl,
      fileName,
      fileType,
    } = files[0];

    console.log(
      "[EXPOSE SPEED] pdf-photo-mode",
      {
        skipPdfPhotoExtraction,
        documents: files.length,
      }
    );

    // MULTI_DOCUMENT_PREPARATION_V1
    const exposeProfileStartedAt = performance.now();
    let exposeProfileStepAt = exposeProfileStartedAt;

    for (const file of files) {
      const hasDirectBytes =
        file.bytes instanceof Uint8Array;

      if (
        !hasDirectBytes &&
        !isTrustedBlobUrl(file.fileUrl)
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_FILE_URL",
            error:
              "Eine hochgeladene Unterlage konnte nicht verifiziert werden.",
          },
          { status: 400 }
        );
      }

      if (
        !ALLOWED_CONTENT_TYPES.has(file.fileType) &&
        !isSpreadsheetDocument(
          file.fileName,
          file.fileType
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "UNSUPPORTED_FILE_TYPE",
            error:
              "Bitte nur PDF, DOCX, TXT, XLSX, XLS oder CSV als Objektunterlagen verwenden.",
          },
          { status: 415 }
        );
      }

      if (!hasDirectBytes) {
        cleanupUrls.push(
          file.fileUrl
        );
      }
    }

    monitoringStartedAt =
      performance.now();


    monitoringRunId =
      await startAutomationMonitoringRun({
        userId: user.id,
        documentCount: files.length,
        metadata: {
          version:
            "automation-monitoring-v1",
          route:
            "extract-expose",
          transport:
            contentType.includes(
              "multipart/form-data"
            )
              ? "multipart"
              : "json",
        },
      });



    await recordUserActivityEvent({
      userId: user.id,
      type: "automation_started",
      path: "/automation",
      metadata: {
        monitoringRunId,
        documentCount:
          files.length,
      },
    });

    const preparedDocuments =
      await Promise.all(
        files.map(async (file) => {
          const downloadStartedAt =
            performance.now();

          const bytes =
            file.bytes instanceof Uint8Array
              ? file.bytes
              : await (async () => {
                  const sourceResponse =
                    await fetch(
                      file.fileUrl,
                      {
                        cache: "no-store",
                      }
                    );

                  if (!sourceResponse.ok) {
                    throw new Error(
                      `EXPOSE_BLOB_DOWNLOAD_FAILED_${sourceResponse.status}`
                    );
                  }

                  return new Uint8Array(
                    await sourceResponse.arrayBuffer()
                  );
                })();

          if (
            bytes.byteLength <= 0 ||
            bytes.byteLength > MAX_EXPOSE_BYTES
          ) {
            throw Object.assign(
              new Error(
                `Die Unterlage "${file.fileName}" darf maximal 25 MB gross sein.`
              ),
              {
                code: "INVALID_FILE_SIZE",
                status: 413,
              }
            );
          }

          console.log(
            "[EXPOSE SPEED] document-download",
            {
              fileName: file.fileName,
              durationMs: Math.round(
                performance.now() -
                  downloadStartedAt
              ),
              bytes: bytes.byteLength,
            }
          );

          const shouldRenderPdfPages =
            file.fileType === "application/pdf" &&
            /(?:^|[\s_-])(eg|og|ug)(?:[\s_.-]|$)|grundriss|kataster|katasrer|lageplan|situationsplan|bauplan|abstellraum|geschossplan|parzellenplan|umgebungsplan|schnitt|ansicht|werkplan|architekturplan/i.test(
              file.fileName
            );

          const propertyPhotosPromise =
            file.fileType === "application/pdf" &&
            !skipPdfPhotoExtraction
              ? extractPropertyPhotosFromPdf(
                  Buffer.from(bytes),
                  {
                    minimumConfidence: 0.7,
                    renderPages:
                      shouldRenderPdfPages,
                  }
                )
              : Promise.resolve({
                  candidateCount: 0,
                  propertyPhotoCount: 0,
                  photos: [],
                });

          let fastText = "";
          let useFastText = false;

          if (
            isSpreadsheetDocument(
              file.fileName,
              file.fileType
            )
          ) {
            const spreadsheetStartedAt =
              performance.now();

            fastText =
              await extractSpreadsheetText(
                bytes,
                file.fileName
              );

            useFastText = true;

            console.log(
              "[EXPOSE SPREADSHEET TEXT]",
              {
                fileName:
                  file.fileName,
                characters:
                  fastText.length,
                durationMs:
                  Math.round(
                    performance.now() -
                      spreadsheetStartedAt
                  ),
              }
            );
          } else if (
            file.fileType ===
            "application/pdf"
          ) {
            const pdfTextStartedAt =
              performance.now();

            try {
              const pdfTextResult =
                await extractPdfTextFast(
                  bytes
                );

              useFastText =
                isPdfTextFastPathUsable(
                  pdfTextResult
                );

              if (useFastText) {
                fastText =
                  pdfTextResult.text;
              }

              console.log(
                "[EXPOSE PDF TEXT FAST PATH]",
                {
                  fileName:
                    file.fileName,
                  usable:
                    useFastText,
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
                file.fileName,
                error
              );

              fastText = "";
              useFastText = false;
            }
          }

          return {
            ...file,
            bytes,
            fastText,
            useFastText,
            propertyPhotosPromise,
          };
        })
      );


    const textDocuments =
      preparedDocuments.filter(
        (document) =>
          document.useFastText
      );

    const fileDocuments =
      preparedDocuments.filter(
        (document) =>
          !document.useFastText
      );

    const useTextFastPath =
      fileDocuments.length === 0;

    const combinedFastText =
      textDocuments
        .map(
          (document, index) =>
            `DOKUMENT ${index + 1}: ${document.fileName}\n\n${document.fastText}`
        )
        .join(
          "\n\n--- NAECHSTES DOKUMENT ---\n\n"
        );

    const localFastFacts =
      extractLocalFastFacts(
        combinedFastText
      );

    const localFastFactsReady =
      useTextFastPath &&
      isLocalFastFactsReady(
        localFastFacts
      );

    const canonicalLocalPropertyTypes =
      new Set([
        "Einfamilienhaus",
        "Mehrfamilienhaus",
        "Doppelhaush?lfte",
        "Doppelhaushaelfte",
        "Reihenhaus",
        "Eigentumswohnung",
        "Wohnung",
        "Penthouse",
        "Attikawohnung",
        "Maisonette",
        "Villa",
        "Grundst?ck",
        "Grundstueck",
        "Gewerbeobjekt",
      ]);

    const useLocalFactsFastPath =
      localFastFactsReady &&
      canonicalLocalPropertyTypes.has(
        localFastFacts.propertyType
      );

    console.log(
      "[SPEED BOOSTER V4 FAST PATH]",
      {
        enabled:
          useLocalFactsFastPath,
        propertyType:
          localFastFacts.propertyType,
      }
    );

    console.log(
      "[SPEED BOOSTER V3 LOCAL FACTS]",
      {
        ready:
          localFastFactsReady,
        projectName:
          localFastFacts.projectName,
        street:
          localFastFacts.street,
        postalCode:
          localFastFacts.postalCode,
        location:
          localFastFacts.location,
        propertyType:
          localFastFacts.propertyType,
        rooms:
          localFastFacts.rooms,
        livingArea:
          localFastFacts.livingArea,
        price:
          localFastFacts.price,
        missingFields:
          localFastFacts.missingFields,
      }
    );

    console.log(
      "[EXPOSE SPEED] documents-prepared",
      {
        documents:
          preparedDocuments.length,
        allFastText:
          useTextFastPath,
        textDocuments:
          textDocuments.length,
        fileDocuments:
          fileDocuments.length,
        durationMs:
          Math.round(
            performance.now() -
              exposeProfileStartedAt
          ),
      }
    );

    if (monitoringRunId) {
      await recordAutomationMonitoringEvent({
        runId: monitoringRunId,
        stage: "document_processing",
        status: "success",
        durationMs:
          Math.round(
            performance.now() -
            exposeProfileStartedAt
          ),
        metadata: {
          documents:
            preparedDocuments.length,
          textDocuments:
            textDocuments.length,
          fileDocuments:
            fileDocuments.length,
          fastText:
            useTextFastPath,
        },
      });

      await recordAutomationMonitoringEvent({
        runId: monitoringRunId,
        stage: "pdf_text",
        status: "success",
        metadata: {
          textDocuments:
            textDocuments.length,
          fileDocuments:
            fileDocuments.length,
          fastText:
            useTextFastPath,
        },
      });
    }

    if (!useLocalFactsFastPath) {
      openai = new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY,
      });
    }

    // PDF_TEXT_FAST_PATH_EXECUTION_V1
    const extractionPrompt = `
Du bist die Fakten-Extraktion von Inserat-AI.
Lies die gelieferten Immobilien-Unterlagen und extrahiere ausschliesslich belegte Fakten.
Die Unterlagen m\u00fcssen kein fertiges Expos\u00e9 sein.
Sie k\u00f6nnen z. B. aus Objektunterlagen, Notizen, Verkaufsunterlagen, Bewertungen oder einem bestehenden Expos\u00e9 bestehen.
Verwende nur Informationen, die in den gelieferten Unterlagen ausdr\u00fccklich belegt sind.
Erfinde nichts und leite keine Vorteile ab, die nicht ausdr\u00fccklich im Dokument stehen.

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
      useLocalFactsFastPath
        ? null
        : useTextFastPath
          ? await openai!.responses.create({
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
                      combinedFastText,
                  },
                ],
              },
            ],
            max_output_tokens: 1200,
          })
        : await (async () => {
            const uploadStartedAt =
              performance.now();

            const uploadedDocuments =
              await Promise.all(
                fileDocuments.map(
                  async (document) => {
                    const uploadable =
                      await toFile(
                        document.bytes,
                        document.fileName,
                        {
                          type:
                            document.fileType,
                        }
                      );

                    const uploaded =
                      await openai!.files.create({
                        file: uploadable,
                        purpose: "user_data",
                      });

                    openAiFileIds.push(
                      uploaded.id
                    );

                    return {
                      fileName:
                        document.fileName,
                      fileId:
                        uploaded.id,
                    };
                  }
                )
              );

            console.log(
              "[EXPOSE SPEED] openai-files-upload",
              {
                documents:
                  uploadedDocuments.length,
                durationMs:
                  Math.round(
                    performance.now() -
                      uploadStartedAt
                  ),
              }
            );

            const content = [
              ...uploadedDocuments.map(
                (document) => ({
                  type:
                    "input_file" as const,
                  file_id:
                    document.fileId,
                })
              ),
              {
                type:
                  "input_text" as const,
                text:
                  extractionPrompt +
                  (
                    combinedFastText
                      ? "\n\nBEREITS AUSGELESENE DOKUMENTE:\n\n" +
                        combinedFastText
                      : ""
                  ) +
                  "\n\nAlle gelieferten Dateien geh?ren zu demselben Immobilienobjekt. Werte die hochgeladenen Dateien und die bereits ausgelesenen Dokumenttexte gemeinsam aus und f?hre die belegten Fakten zu genau einem Objekt zusammen.",
              },
            ];

            return openai!.responses.create({
              model: MODEL,
              input: [
                {
                  role: "user",
                  content,
                },
              ],
              max_output_tokens: 1200,
            });
          })();

    console.log(
      "[EXPOSE AI USAGE]",
      {
        inputTokens:
          response?.usage?.input_tokens ??
          null,
        outputTokens:
          response?.usage?.output_tokens ??
          null,
        totalTokens:
          response?.usage?.total_tokens ??
          null,
        fastTextChars:
          combinedFastText.length,
      }
    );

    console.log(
      "[EXPOSE SPEED] ai-extraction",
      {
        mode:
          useLocalFactsFastPath
            ? "local-fast"
            : useTextFastPath
              ? "text-fast"
              : combinedFastText
                ? "mixed-text-file"
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
      useLocalFactsFastPath
        ? normalizeResult(
            localFastFacts
          )
        : normalizeResult(
            parseJsonObject(
              response?.output_text ||
                ""
            )
          );

    if (useLocalFactsFastPath) {
      extracted.sourceSummary =
        [
          extracted.propertyType,
          extracted.rooms
            ? extracted.rooms +
              " Zimmer"
            : "",
          extracted.livingArea
            ? extracted.livingArea +
              " m? Wohnfl?che"
            : "",
          [
            extracted.postalCode,
            extracted.location,
          ]
            .filter(Boolean)
            .join(" "),
        ]
          .filter(Boolean)
          .join(", ");
    }

    const explicitNetLivingArea =
      extractExplicitNetLivingArea(
        combinedFastText
      );

    if (explicitNetLivingArea) {
      extracted.livingArea =
        explicitNetLivingArea;

      extracted.missingFields =
        extracted.missingFields.filter(
          (field) =>
            field.toLowerCase() !==
            "livingarea"
        );

      console.log(
        "[EXPOSE LIVING AREA FIREWALL]",
        {
          livingArea:
            explicitNetLivingArea,
        }
      );
    }

    if (
      useTextFastPath &&
      extracted.price &&
      !hasExplicitSalePriceEvidence(
        combinedFastText,
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

    // MULTI_DOCUMENT_PDF_PHOTOS_V1
    const pdfPhotoResults =
      await Promise.all(
        preparedDocuments.map(
          (document) =>
            document.propertyPhotosPromise
        )
      );

    const candidateCount =
      pdfPhotoResults.reduce(
        (total, result) =>
          total +
          result.candidateCount,
        0
      );

    const propertyPhotoCount =
      pdfPhotoResults.reduce(
        (total, result) =>
          total +
          result.propertyPhotoCount,
        0
      );

    const allPdfPhotos =
      pdfPhotoResults.flatMap(
        (result) =>
          result.photos
      );

    const combinedPdfPhotos =
      allPdfPhotos;

    console.log(
      "[EXPOSE PDF PHOTOS]",
      {
        documents:
          preparedDocuments.length,
        candidateCount,
        propertyPhotoCount,
        returnedPhotos:
          combinedPdfPhotos.length,
      }
    );

    if (monitoringRunId) {
      await recordAutomationMonitoringEvent({
        runId: monitoringRunId,
        stage: "pdf_images",
        status: "success",
        metadata: {
          candidateCount,
          propertyPhotoCount,
          returnedPhotos:
            combinedPdfPhotos.length,
        },
      });
    }

    const extractedPhotos =
      combinedPdfPhotos.map(
        (photo, index) => ({
          fileName:
            `expose-photo-${String(
              index + 1
            ).padStart(2, "0")}.jpg`,
          mimeType: "image/jpeg",
          width: photo.width,
          height: photo.height,
          pageNumber:
            photo.pageNumber,
          imageIndex:
            photo.imageIndex,
          confidence:
            photo.confidence,
          reason:
            photo.reason,
          analysis:
            photo.analysis,
          base64:
            photo.buffer.toString(
              "base64"
            ),
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

    if (
      monitoringRunId &&
      monitoringStartedAt !== null
    ) {
      await recordAutomationMonitoringEvent({
        runId: monitoringRunId,
        stage: "expose_extraction",
        status: "success",
        durationMs:
          Math.round(
            performance.now() -
            monitoringStartedAt
          ),
        metadata: {
          returnedPhotos:
            extractedPhotos.length,
        },
      });

      await completeAutomationMonitoringRun({
        runId: monitoringRunId,
        status: "ready",
        readyReached: true,
        imageCount:
          extractedPhotos.length,
        totalDurationMs:
          Math.round(
            performance.now() -
            monitoringStartedAt
          ),
      });

      await recordUserActivityEvent({
        userId: user.id,
        type: "automation_ready",
        path: "/automation",
        metadata: {
          monitoringRunId,
          imageCount:
            extractedPhotos.length,
          durationMs:
            Math.round(
              performance.now() -
              monitoringStartedAt
            ),
        },
      });
    }

    return NextResponse.json({
      success: true,
      extracted,
      extractedPhotos,
    });
  } catch (error) {
    console.error("AUTOMATION EXPOSE EXTRACTION ERROR:", error);

    if (monitoringRunId) {
      const monitoringError =
        getMonitoringErrorFields(error);

      await completeAutomationMonitoringRun({
        runId: monitoringRunId,
        status: "failed",
        readyReached: false,
        totalDurationMs:
          monitoringStartedAt !== null
            ? Math.round(
                performance.now() -
                monitoringStartedAt
              )
            : undefined,
        errorStage:
          "expose_extraction",
        errorCode:
          monitoringError.errorCode,
        errorMessage:
          monitoringError.errorMessage,
      });

      await recordUserActivityEvent({
        userId: user.id,
        type: "automation_failed",
        path: "/automation",
        metadata: {
          monitoringRunId,
          errorStage:
            "expose_extraction",
        },
      });

    }

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
    if (openai) {
      await Promise.all(
        openAiFileIds.map((fileId) =>
          openai!.files.delete(fileId).catch((cleanupError) => {
            console.warn(
              "AUTOMATION OPENAI FILE CLEANUP WARNING:",
              cleanupError
            );
          })
        )
      );
    }

    await Promise.all(
      cleanupUrls.map((url) =>
        del(url).catch((cleanupError) => {
          console.warn(
            "AUTOMATION EXPOSE CLEANUP WARNING:",
            cleanupError
          );
        })
      )
    );
  }
}
