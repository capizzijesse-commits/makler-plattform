import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  HOME_STAGING_ROOM_CONDITIONS,
  HOME_STAGING_ROOM_TYPES,
  HOME_STAGING_STYLES,
  HOME_STAGING_TRANSFORMATIONS,
  buildTransformationBrief,
  type HomeStagingAnalysisInput,
  type HomeStagingRoomCondition,
  type HomeStagingRoomType,
  type HomeStagingStyle,
  type HomeStagingTransformation,
} from "@/lib/home-staging-quality";
import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANALYSIS_VERSION =
  "home-staging-room-analysis-v1";

const MAX_IMAGE_SIZE_BYTES =
  10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ROOM_TYPE_SET = new Set<string>(
  HOME_STAGING_ROOM_TYPES
);

const ROOM_CONDITION_SET = new Set<string>(
  HOME_STAGING_ROOM_CONDITIONS
);

const TRANSFORMATION_SET = new Set<string>(
  HOME_STAGING_TRANSFORMATIONS
);

const STYLE_SET = new Set<string>(
  HOME_STAGING_STYLES
);

type AnalyzeHomeStagingBody = {
  listingId?: unknown;
  sourceImageId?: unknown;
};

type OpenAIOutputContent = {
  type?: unknown;
  text?: unknown;
};

type OpenAIOutputItem = {
  content?: unknown;
};

type OpenAIResponse = {
  output?: unknown;
  error?: {
    message?: unknown;
  };
};

type RoomAnalysisResult =
  HomeStagingAnalysisInput & {
    analysisVersion:
      typeof ANALYSIS_VERSION;
    summary: string;
  };

function cleanText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanStringArray(
  value: unknown,
  maximumItems: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueValues =
    new Set<string>();

  for (const item of value) {
    const text = cleanText(item);

    if (!text) {
      continue;
    }

    uniqueValues.add(
      text.slice(0, 300)
    );

    if (
      uniqueValues.size >= maximumItems
    ) {
      break;
    }
  }

  return [...uniqueValues];
}

function extractOutputText(
  response: OpenAIResponse
): string {
  if (!Array.isArray(response.output)) {
    return "";
  }

  const parts: string[] = [];

  for (const outputItemValue of response.output) {
    if (
      !outputItemValue ||
      typeof outputItemValue !== "object"
    ) {
      continue;
    }

    const outputItem =
      outputItemValue as OpenAIOutputItem;

    if (!Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentValue of outputItem.content) {
      if (
        !contentValue ||
        typeof contentValue !== "object"
      ) {
        continue;
      }

      const content =
        contentValue as OpenAIOutputContent;

      if (
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function parseJsonObject(
  outputText: string
): Record<string, unknown> | null {
  const trimmed = outputText.trim();

  if (!trimmed) {
    return null;
  }

  const candidates: string[] = [trimmed];

  const fencedMatch =
    trimmed.match(
      /```(?:json)?\s*([\s\S]*?)```/i
    );

  if (fencedMatch?.[1]) {
    candidates.push(
      fencedMatch[1].trim()
    );
  }

  const firstBrace =
    trimmed.indexOf("{");

  const lastBrace =
    trimmed.lastIndexOf("}");

  if (
    firstBrace >= 0 &&
    lastBrace > firstBrace
  ) {
    candidates.push(
      trimmed.slice(
        firstBrace,
        lastBrace + 1
      )
    );
  }

  for (const candidate of candidates) {
    try {
      let parsed: unknown =
        JSON.parse(candidate);

      if (typeof parsed === "string") {
        parsed =
          JSON.parse(parsed);
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        continue;
      }

      const record =
        parsed as Record<string, unknown>;

      if (
        record.analysis &&
        typeof record.analysis === "object" &&
        !Array.isArray(record.analysis)
      ) {
        return record.analysis as
          Record<string, unknown>;
      }

      return record;
    } catch {
      continue;
    }
  }

  return null;
}

function matchAllowedValue(
  value: unknown,
  allowedValues: readonly string[]
): string {
  const cleaned =
    cleanText(value);

  if (!cleaned) {
    return "";
  }

  const directMatch =
    allowedValues.find(
      (allowedValue) =>
        allowedValue === cleaned
    );

  if (directMatch) {
    return directMatch;
  }

  const normalised =
    cleaned
      .replace(/[\s_-]+/g, "")
      .toLowerCase();

  return (
    allowedValues.find(
      (allowedValue) =>
        allowedValue
          .replace(/[\s_-]+/g, "")
          .toLowerCase() === normalised
    ) || ""
  );
}

function parseRoomAnalysis(
  outputText: string
): RoomAnalysisResult | null {
  const parsed =
    parseJsonObject(outputText);

  if (!parsed) {
    return null;
  }

  const roomType =
    matchAllowedValue(
      parsed.roomType ??
        parsed.room_type,
      HOME_STAGING_ROOM_TYPES
    );

  const roomTypeLabel =
    cleanText(
      parsed.roomTypeLabel ??
        parsed.room_type_label
    );

  const roomCondition =
    matchAllowedValue(
      parsed.roomCondition ??
        parsed.room_condition,
      HOME_STAGING_ROOM_CONDITIONS
    );

  const transformation =
    matchAllowedValue(
      parsed.transformation,
      HOME_STAGING_TRANSFORMATIONS
    );

  const style =
    matchAllowedValue(
      parsed.style,
      HOME_STAGING_STYLES
    );

  const summary =
    cleanText(
      parsed.summary ??
        parsed.description
    );

  const layoutGoal =
    cleanText(
      parsed.layoutGoal ??
        parsed.layout_goal
    );

  const furnitureScale =
    cleanText(
      parsed.furnitureScale ??
        parsed.furniture_scale
    );

  const confidenceValue =
    parsed.confidence;

  const confidence =
    typeof confidenceValue === "number" &&
    Number.isFinite(confidenceValue)
      ? Math.max(
          0,
          Math.min(1, confidenceValue)
        )
      : typeof confidenceValue === "string" &&
          Number.isFinite(
            Number(confidenceValue)
          )
        ? Math.max(
            0,
            Math.min(
              1,
              Number(confidenceValue)
            )
          )
        : 0;

  if (
    !ROOM_TYPE_SET.has(roomType) ||
    !ROOM_CONDITION_SET.has(
      roomCondition
    ) ||
    !TRANSFORMATION_SET.has(
      transformation
    ) ||
    !STYLE_SET.has(style) ||
    !roomTypeLabel ||
    !summary
  ) {
    console.error(
      "HOME-STAGING ANALYSIS VALIDATION FAILED:",
      {
        roomType,
        roomTypeLabel,
        roomCondition,
        transformation,
        style,
        summaryPresent:
          Boolean(summary),
        receivedKeys:
          Object.keys(parsed),
      }
    );

    return null;
  }

  return {
    analysisVersion:
      ANALYSIS_VERSION,

    roomType:
      roomType as HomeStagingRoomType,

    roomTypeLabel,

    roomCondition:
      roomCondition as HomeStagingRoomCondition,

    transformation:
      transformation as HomeStagingTransformation,

    style:
      style as HomeStagingStyle,

    confidence,

    summary,

    visibleFacts:
      cleanStringArray(
        parsed.visibleFacts ??
          parsed.visible_facts,
        20
      ),

    lockedArchitecture:
      cleanStringArray(
        parsed.lockedArchitecture ??
          parsed.locked_architecture,
        20
      ),

    warnings:
      cleanStringArray(
        parsed.warnings,
        12
      ),

    layoutGoal,

    furnitureScale,

    forbiddenElements:
      cleanStringArray(
        parsed.forbiddenElements ??
          parsed.forbidden_elements,
        20
      ),
  };
}

const ROOM_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,

  properties: {
    analysisVersion: {
      type: "string",
      enum: [ANALYSIS_VERSION],
    },

    roomType: {
      type: "string",
      enum: HOME_STAGING_ROOM_TYPES,
    },

    roomTypeLabel: {
      type: "string",
    },

    roomCondition: {
      type: "string",
      enum:
        HOME_STAGING_ROOM_CONDITIONS,
    },

    transformation: {
      type: "string",
      enum:
        HOME_STAGING_TRANSFORMATIONS,
    },

    style: {
      type: "string",
      enum: HOME_STAGING_STYLES,
    },

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },

    summary: {
      type: "string",
    },

    visibleFacts: {
      type: "array",
      items: {
        type: "string",
      },
    },

    lockedArchitecture: {
      type: "array",
      items: {
        type: "string",
      },
    },

    layoutGoal: {
      type: "string",
    },

    furnitureScale: {
      type: "string",
      enum: [
        "compact",
        "small",
        "medium",
        "large",
        "unclear",
      ],
    },

    forbiddenElements: {
      type: "array",
      items: {
        type: "string",
      },
    },

    warnings: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "analysisVersion",
    "roomType",
    "roomTypeLabel",
    "roomCondition",
    "transformation",
    "style",
    "confidence",
    "summary",
    "visibleFacts",
    "lockedArchitecture",
    "layoutGoal",
    "furnitureScale",
    "forbiddenElements",
    "warnings",
  ],
} as const;

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const startedAt = Date.now();

  try {
    const user =
      await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        { status: 401 }
      );
    }

    const capabilities =
      getPlanCapabilities(user.plan);

    if (
      !capabilities.canUseHomeStaging
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die professionelle Raumanalyse ist im Pro-Plan für CHF 79.90 pro Monat enthalten.",
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
            "Die Home-Staging-Analyse ist momentan nicht konfiguriert.",
        },
        { status: 500 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as
      | AnalyzeHomeStagingBody
      | null;

    const listingId =
      cleanText(body?.listingId);

    const sourceImageId =
      cleanText(body?.sourceImageId);

    if (
      !listingId ||
      !sourceImageId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Objekt und Ausgangsbild sind erforderlich.",
        },
        { status: 400 }
      );
    }

    const listing =
      await prisma.listing.findFirst({
        where: {
          id: listingId,
          userId: user.id,
        },

        select: {
          id: true,
          archivedAt: true,
          propertyType: true,
          rooms: true,
          livingArea: true,
          location: true,

          images: {
            where: {
              id: sourceImageId,
            },

            select: {
              id: true,
              url: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
            },

            take: 1,
          },
        },
      });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    if (listing.archivedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Für ein archiviertes Objekt kann keine Raumanalyse erstellt werden.",
        },
        { status: 400 }
      );
    }

    const sourceImage =
      listing.images[0];

    if (!sourceImage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das gewählte Originalbild wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    if (
      sourceImage.mimeType &&
      !ALLOWED_IMAGE_TYPES.has(
        sourceImage.mimeType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dieses Bildformat wird für die Raumanalyse nicht unterstützt.",
        },
        { status: 400 }
      );
    }

    if (
      sourceImage.sizeBytes !== null &&
      sourceImage.sizeBytes >
        MAX_IMAGE_SIZE_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Originalbild ist zu gross. Maximal erlaubt sind 10 MB.",
        },
        { status: 400 }
      );
    }

    const model =
      process.env
        .OPENAI_HOME_STAGING_ANALYSIS_MODEL ||
      process.env.OPENAI_GUIDE_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-5-mini";

    const prompt = [
      "Du bist ein professioneller Schweizer Immobilienfoto- und Home-Staging-Analyst.",
      "",
      "Analysiere ausschliesslich das tatsächlich sichtbare einzelne Immobilienfoto.",
      "Die Analyse dient einer objektbezogenen Raumtransformation ohne visuelle Floskeln.",
      "",
      "Zwingende Grundsätze:",
      "- Erfinde keine Räume, Masse, Materialien, Fenster, Türen, Ausblicke oder baulichen Elemente.",
      "- Verwende keine allgemeinen Werbeaussagen wie schön, traumhaft, exklusiv oder einladend.",
      "- Jede visibleFact muss konkret im Bild erkennbar sein.",
      "- Bei Unsicherheit muss der Punkt als unklar bezeichnet werden.",
      "- Objektdaten sind nur Kontext und dürfen das Foto niemals überstimmen.",
      "- Formuliere in professionellem Schweizer Standarddeutsch und verwende kein ß.",
      "",
      "Erkenne:",
      "1. die wahrscheinlichste Raumart",
      "2. den sichtbaren Möblierungs- oder Renovationszustand",
      "3. die fachlich passende Transformation",
      "4. konkrete sichtbare Merkmale",
      "5. alle zu schützenden baulichen Elemente",
      "6. einen realistischen Möblierungs- und Laufwegplan",
      "7. unzulässige oder räumlich unplausible Elemente",
      "8. Unsicherheiten und Einschränkungen",
      "",
      "Transformationslogik:",
      "- Leerer oder fast leerer Innenraum: furnishEmpty",
      "- Bereits möblierter Innenraum: redesignFurnished",
      "- Sichtbare Küche mit Renovationsbedarf: renovateKitchen",
      "- Sichtbares Bad mit Renovationsbedarf: renovateBathroom",
      "- Balkon, Terrasse oder Garten: designOutdoor",
      "- Unsichere Raumart oder Zustand: needsConfirmation",
      "- Ungeeignetes, stark abgeschnittenes oder nicht räumliches Foto: notRecommended",
      "",
      "Stilempfehlung:",
      "- Wähle modern, scandinavian, luxurious oder minimalist.",
      "- Die Empfehlung muss zur sichtbaren Raumgrösse, Helligkeit und vorhandenen Architektur passen.",
      "- Luxus darf niemals nur über Marmor, Gold, Bouclé oder übermässige Dekoration simuliert werden.",
      "",
      "Objektkontext:",
      `Objektart: ${listing.propertyType || "nicht angegeben"}`,
      `Zimmerzahl: ${listing.rooms ?? "nicht angegeben"}`,
      `Wohnfläche: ${listing.livingArea ?? "nicht angegeben"}`,
      `Ort: ${listing.location || "nicht angegeben"}`,
      "",
      "Die Zusammenfassung soll kurz und direkt für die Benutzeroberfläche geeignet sein.",
    ].join("\n");

    const openAIResponse =
      await fetch(
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

            max_output_tokens: 1800,

            input: [
              {
                role: "user",

                content: [
                  {
                    type: "input_text",
                    text: prompt,
                  },

                  {
                    type: "input_image",
                    image_url:
                      sourceImage.url,
                    detail: "high",
                  },
                ],
              },
            ],

            text: {
              format: {
                type: "json_schema",
                name:
                  "home_staging_room_analysis",
                strict: true,
                schema:
                  ROOM_ANALYSIS_SCHEMA,
              },
            },
          }),

          cache: "no-store",

          signal:
            AbortSignal.timeout(
              45_000
            ),
        }
      );

    const openAIData =
      (await openAIResponse
        .json()
        .catch(() => ({}))) as
        OpenAIResponse;

    if (!openAIResponse.ok) {
      const upstreamMessage =
        typeof openAIData.error
          ?.message === "string"
          ? openAIData.error.message
          : "";

      console.error(
        "HOME-STAGING ANALYSIS OPENAI ERROR:",
        {
          status:
            openAIResponse.status,
          message:
            upstreamMessage,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Das Raumfoto konnte momentan nicht analysiert werden.",

          details:
            process.env.NODE_ENV ===
            "development"
              ? upstreamMessage
              : undefined,
        },
        {
          status:
            openAIResponse.status >=
              400 &&
            openAIResponse.status < 600
              ? openAIResponse.status
              : 502,
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
            "Die AI hat keine Raumanalyse zurückgegeben.",
        },
        { status: 502 }
      );
    }

    const analysis =
      parseRoomAnalysis(outputText);

    if (!analysis) {
      console.error(
        "HOME-STAGING ANALYSIS INVALID OUTPUT:",
        outputText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Die Raumanalyse hatte ein ungültiges Format.",
        },
        { status: 502 }
      );
    }

    const transformationBrief =
      buildTransformationBrief(
        analysis
      );

    return NextResponse.json({
      success: true,

      analysis,

      transformationBrief,

      sourceImage: {
        id: sourceImage.id,
        url: sourceImage.url,
        fileName:
          sourceImage.fileName,
      },

      model,

      durationMs:
        Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      "HOME-STAGING ANALYSIS ERROR:",
      error
    );

    const isTimeout =
      error instanceof Error &&
      (
        error.name === "AbortError" ||
        error.name === "TimeoutError"
      );

    return NextResponse.json(
      {
        success: false,

        error: isTimeout
          ? "Die Raumanalyse hat zu lange gedauert. Bitte erneut versuchen."
          : "Das Raumfoto konnte nicht analysiert werden.",

        durationMs:
          Date.now() - startedAt,
      },
      {
        status: isTimeout
          ? 504
          : 500,
      }
    );
  }
}