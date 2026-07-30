import { NextRequest, NextResponse } from "next/server";

import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
type AppLocale = "de" | "it" | "fr" | "en";

const LANGUAGE_NAMES: Record<AppLocale, string> = {
  de: "German (Swiss Standard German)",
  it: "Italian",
  fr: "French",
  en: "English",
};

const FLOOR_PLAN_MESSAGES = {
  de: {
    login: "Bitte melde dich erneut an.",
    pro: "Die Grundrissanalyse für Home Staging ist im Pro-Plan für CHF 79.90 pro Monat enthalten.",
    notConfigured: "Die AI-Verbindung ist nicht konfiguriert.",
    missingListingId: "Die Objekt-ID fehlt.",
    selectPdf: "Bitte wähle einen Grundriss als PDF aus.",
    pdfOnly: "Erlaubt sind ausschliesslich PDF-Dateien.",
    tooLarge: "Die Grundriss-PDF darf maximal 15 MB gross sein.",
    listingNotFound: "Das Objekt wurde nicht gefunden.",
    analyzeFailed: "Der Grundriss konnte momentan nicht analysiert werden.",
    noResult: "Die AI hat keine Grundrissauswertung zurückgegeben.",
    processFailed: "Der Grundriss konnte nicht verarbeitet werden.",
    analyzed: "Der Grundriss wurde analysiert.",
    notSpecified: "nicht angegeben",
  },
  it: {
    login: "Effettua nuovamente l’accesso.",
    pro: "L’analisi della planimetria per l’home staging è inclusa nel piano Pro da CHF 79.90 al mese.",
    notConfigured: "La connessione AI non è configurata.",
    missingListingId: "Manca l’ID dell’immobile.",
    selectPdf: "Seleziona una planimetria in formato PDF.",
    pdfOnly: "Sono consentiti esclusivamente file PDF.",
    tooLarge: "Il PDF della planimetria può avere una dimensione massima di 15 MB.",
    listingNotFound: "L’immobile non è stato trovato.",
    analyzeFailed: "Non è stato possibile analizzare momentaneamente la planimetria.",
    noResult: "L’AI non ha restituito alcuna analisi della planimetria.",
    processFailed: "Non è stato possibile elaborare la planimetria.",
    analyzed: "La planimetria è stata analizzata.",
    notSpecified: "non indicato",
  },
  fr: {
    login: "Veuillez vous reconnecter.",
    pro: "L’analyse du plan pour le home staging est incluse dans l’offre Pro à CHF 79.90 par mois.",
    notConfigured: "La connexion AI n’est pas configurée.",
    missingListingId: "L’identifiant du bien est manquant.",
    selectPdf: "Veuillez sélectionner un plan au format PDF.",
    pdfOnly: "Seuls les fichiers PDF sont autorisés.",
    tooLarge: "Le PDF du plan ne peut pas dépasser 15 MB.",
    listingNotFound: "Le bien n’a pas été trouvé.",
    analyzeFailed: "Le plan ne peut pas être analysé actuellement.",
    noResult: "L’AI n’a renvoyé aucune analyse du plan.",
    processFailed: "Le plan n’a pas pu être traité.",
    analyzed: "Le plan a été analysé.",
    notSpecified: "non indiqué",
  },
  en: {
    login: "Please sign in again.",
    pro: "Floor plan analysis for home staging is included in the Pro plan at CHF 79.90 per month.",
    notConfigured: "The AI connection is not configured.",
    missingListingId: "The property ID is missing.",
    selectPdf: "Please select a floor plan in PDF format.",
    pdfOnly: "Only PDF files are allowed.",
    tooLarge: "The floor plan PDF may be no larger than 15 MB.",
    listingNotFound: "The property was not found.",
    analyzeFailed: "The floor plan cannot be analysed at the moment.",
    noResult: "The AI did not return a floor plan analysis.",
    processFailed: "The floor plan could not be processed.",
    analyzed: "The floor plan was analysed.",
    notSpecified: "not specified",
  },
} satisfies Record<AppLocale, Record<string, string>>;

function normalizeLocale(value: unknown): AppLocale {
  return value === "it" || value === "fr" || value === "en"
    ? value
    : "de";
}


type OpenAIOutputContent = {
  type?: unknown;
  text?: unknown;
};

type OpenAIOutputItem = {
  type?: unknown;
  content?: unknown;
};

type OpenAIResponse = {
  output?: unknown;
  error?: {
    message?: unknown;
  };
};

type FloorPlanResult = {
  summary: string;
  stagingInstructions: string;
  rooms: string[];
};

function requiredText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function extractOutputText(
  response: OpenAIResponse
): string {
  if (!Array.isArray(response.output)) {
    return "";
  }

  const textParts: string[] = [];

  for (const item of response.output) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const outputItem =
      item as OpenAIOutputItem;

    if (!Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentPart of outputItem.content) {
      if (
        !contentPart ||
        typeof contentPart !== "object"
      ) {
        continue;
      }

      const part =
        contentPart as OpenAIOutputContent;

      if (
        part.type === "output_text" &&
        typeof part.text === "string"
      ) {
        textParts.push(part.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function cleanJsonText(value: string): string {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseFloorPlanResult(
  outputText: string,
  fallbackSummary: string
): FloorPlanResult {
  try {
    const parsed = JSON.parse(
      cleanJsonText(outputText)
    ) as {
      summary?: unknown;
      stagingInstructions?: unknown;
      rooms?: unknown;
    };

    const summary = requiredText(
      parsed.summary
    );

    const stagingInstructions = requiredText(
      parsed.stagingInstructions
    ).slice(0, 500);

    const rooms = Array.isArray(parsed.rooms)
      ? parsed.rooms
          .filter(
            (room): room is string =>
              typeof room === "string"
          )
          .map((room) => room.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    if (summary || stagingInstructions) {
      return {
        summary:
          summary ||
          fallbackSummary,
        stagingInstructions:
          stagingInstructions ||
          summary.slice(0, 500),
        rooms,
      };
    }
  } catch {
    // Fallback unterhalb.
  }

  return {
    summary: outputText,
    stagingInstructions:
      outputText.slice(0, 500),
    rooms: [],
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const locale = normalizeLocale(
    request.nextUrl.searchParams.get("locale")
  );
  const messages = FLOOR_PLAN_MESSAGES[locale];

  try {
    const user =
      await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.login,
        },
        { status: 401 }
      );
    }

    const capabilities =
      getPlanCapabilities(user.plan);

    if (!capabilities.canUseHomeStaging) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.pro,
        },
        { status: 403 }
      );
    }

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.notConfigured,
        },
        { status: 500 }
      );
    }

    const formData =
      await request.formData();

    const listingId = requiredText(
      formData.get("listingId")
    );

    const fileValue =
      formData.get("file");

    if (!listingId) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.missingListingId,
        },
        { status: 400 }
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.selectPdf,
        },
        { status: 400 }
      );
    }

    const isPdf =
      fileValue.type === "application/pdf" ||
      fileValue.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.pdfOnly,
        },
        { status: 400 }
      );
    }

    if (
      fileValue.size <= 0 ||
      fileValue.size > MAX_PDF_SIZE_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.tooLarge,
        },
        { status: 400 }
      );
    }

    const listing =
      await prisma.listing.findFirst({
        where: {
          id: listingId,
          userId: user.id,
          archivedAt: null,
        },
        select: {
          id: true,
          propertyType: true,
          rooms: true,
          livingArea: true,
          location: true,
        },
      });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.listingNotFound,
        },
        { status: 404 }
      );
    }

    const fileBuffer = Buffer.from(
      await fileValue.arrayBuffer()
    );

    const fileData =
      `data:application/pdf;base64,${fileBuffer.toString(
        "base64"
      )}`;

    const model =
      process.env.OPENAI_PDF_MODEL ||
      process.env.OPENAI_GUIDE_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-5-mini";

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          max_output_tokens: 1200,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_file",
                  filename:
                    fileValue.name ||
                    "grundriss.pdf",
                  file_data: fileData,
                },
                {
                  type: "input_text",
                  text: [
                    "Analyse this real-estate floor plan as support for virtual home staging.",
                    `Write every natural-language JSON value in ${LANGUAGE_NAMES[locale]}.`,
                    "",
                    "Known property data:",
                    `Property type: ${listing.propertyType || messages.notSpecified}`,
                    `Rooms: ${listing.rooms || messages.notSpecified}`,
                    `Living area: ${listing.livingArea || messages.notSpecified}`,
                    `Location: ${listing.location || messages.notSpecified}`,
                    "",
                    "Identify where legible:",
                    "- existing rooms and their likely use",
                    "- labelled areas or dimensions",
                    "- doors, windows, balconies and passages",
                    "- sensible furnishing and circulation zones",
                    "- important restrictions for furniture placement",
                    "",
                    "Never invent unreadable dimensions or structural details.",
                    "State uncertainties clearly.",
                    "",
                    "Return valid JSON only, without Markdown:",
                    "{",
                    '  "summary": "clear summary in the requested language",',
                    '  "stagingInstructions": "specific furnishing instruction in the requested language, maximum 500 characters",',
                    '  "rooms": ["room name in the requested language"]',
                    "}",
                  ].join("\n"),
                },
              ],
            },
          ],
        }),
        cache: "no-store",
      }
    );

    const openAIData =
      (await openAIResponse
        .json()
        .catch(() => ({}))) as OpenAIResponse;

    if (!openAIResponse.ok) {
      const openAIError =
        typeof openAIData.error?.message ===
        "string"
          ? openAIData.error.message
          : "";

      console.error(
        "Grundrissanalyse fehlgeschlagen:",
        openAIError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            messages.analyzeFailed,
        },
        {
          status:
            openAIResponse.status >= 400 &&
            openAIResponse.status < 600
              ? openAIResponse.status
              : 500,
        }
      );
    }

    const outputText =
      extractOutputText(openAIData);

    if (!outputText) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.noResult,
        },
        { status: 502 }
      );
    }

    const analysis =
      parseFloorPlanResult(
        outputText,
        messages.analyzed
      );

    return NextResponse.json({
      success: true,
      analysis,
      fileName: fileValue.name,
      model,
    });
  } catch (error) {
    console.error(
      "Fehler bei der Grundrissanalyse:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          messages.processFailed,
      },
      { status: 500 }
    );
  }
}
