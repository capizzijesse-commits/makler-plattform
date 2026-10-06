import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canUseListingCoreForUser } from "@/lib/listing-access";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BATCH_SIZE = 5;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type BatchAnalysis = {
  imageIndex: number;
  room?: unknown;
  condition?: unknown;
  visibleFacts?: unknown;
  strengths?: unknown;
  limitations?: unknown;
};

function cleanText(
  value: unknown,
  fallback: string
): string {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : fallback;
}

function cleanList(
  value: unknown,
  maximum: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim().length > 0
    )
    .map((item) => item.trim())
    .slice(0, maximum);
}

function buildAnalysis(
  parsed: BatchAnalysis
): string {
  const room =
    cleanText(
      parsed.room,
      "Nicht eindeutig bestimmbar"
    );

  const condition =
    cleanText(
      parsed.condition,
      "Nur eingeschraenkt beurteilbar"
    );

  const visibleFacts =
    cleanList(
      parsed.visibleFacts,
      5
    );

  const strengths =
    cleanList(
      parsed.strengths,
      2
    );

  const limitations =
    cleanList(
      parsed.limitations,
      2
    );

  return [
    "Raum oder Bereich: " + room,
    "Sichtbare Elemente: " +
      (
        visibleFacts.length > 0
          ? visibleFacts.join(", ")
          : "Keine sicheren Details"
      ),
    "Zustand und Eindruck: " +
      condition,
    "Vermarktungsrelevante Staerken: " +
      (
        strengths.length > 0
          ? strengths.join(", ")
          : "Keine eindeutig belegten Staerken"
      ),
    "Hinweise und Einschraenkungen: " +
      (
        limitations.length > 0
          ? limitations.join(", ")
          : "Keine besonderen Einschraenkungen"
      ),
  ].join("\n\n");
}

export async function POST(
  request: NextRequest
) {
  const startedAt =
    performance.now();

  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !process.env.OPENAI_API_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OPENAI_API_KEY fehlt.",
        },
        {
          status: 500,
        }
      );
    }

    const formData =
      await request.formData();

    const listingIdValue =
      formData.get("listingId");

    const listingId =
      typeof listingIdValue === "string"
        ? listingIdValue.trim()
        : "";

    const hasListingAccess =
      process.env.NODE_ENV ===
        "development" ||
      await canUseListingCoreForUser({
        userId: user.id,
        plan: user.plan,
        listingId,
      });

    if (!hasListingAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Bildanalyse ist f?r dieses Objekt erst nach der Freischaltung verf?gbar.",
          code:
            "LISTING_PAYMENT_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    const images =
      formData
        .getAll("images")
        .filter(
          (value): value is File =>
            value instanceof File
        );

    if (
      images.length === 0 ||
      images.length >
        MAX_BATCH_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pro Batch sind 1 bis 5 Bilder erlaubt.",
        },
        {
          status: 400,
        }
      );
    }

    for (const image of images) {
      if (
        !ALLOWED_IMAGE_TYPES.has(
          image.type
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Nicht unterstuetztes Bildformat.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        image.size >
        MAX_IMAGE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ein Bild ist groesser als 8 MB.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const content: Array<
      | {
          type: "text";
          text: string;
        }
      | {
          type: "image_url";
          image_url: {
            url: string;
            detail: "low";
          };
        }
    > = [
      {
        type: "text",
        text:
          "Analysiere jedes bereitgestellte Immobilienbild separat. " +
          "Erfinde keine nicht sichtbaren Fakten. " +
          "Gib ausschliesslich JSON zurueck. " +
          "imageIndex beginnt bei 0 und muss exakt der angegebenen Bildnummer entsprechen.\n\n" +
          'Format: {"analyses":[{"imageIndex":0,"room":"...","condition":"...","visibleFacts":["..."],"strengths":["..."],"limitations":["..."]}]}\n\n' +
          "Regeln: room maximal 5 Woerter; condition maximal 10 Woerter; " +
          "visibleFacts maximal 5 kurze Eintraege; strengths maximal 2; limitations maximal 2.",
      },
    ];

    for (
      let index = 0;
      index < images.length;
      index += 1
    ) {
      const image =
        images[index];

      const bytes =
        Buffer.from(
          await image.arrayBuffer()
        );

      content.push({
        type: "text",
        text:
          `Bild ${index}, Dateiname: ${image.name}`,
      });

      content.push({
        type: "image_url",
        image_url: {
          url:
            `data:${image.type};base64,` +
            bytes.toString("base64"),
          detail: "low",
        },
      });
    }

    console.info(
      "[IMAGE BATCH SPEED] openai-start",
      {
        imageCount:
          images.length,
        imageNames:
          images.map(
            (image) => image.name
          ),
        imageBytes:
          images.map(
            (image) => image.size
          ),
      }
    );

    const openai =
      new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY,
      });

    const response =
      await openai.chat.completions.create({
        model:
          "gpt-4.1-mini",
        temperature:
          0,
        max_tokens:
          1200,
        response_format: {
          type:
            "json_object",
        },
        messages: [
          {
            role: "user",
            content,
          },
        ],
      });

    const raw =
      response.choices[0]
        ?.message?.content
        ?.trim();

    if (!raw) {
      throw new Error(
        "Keine Batch-Bildanalyse erhalten."
      );
    }

    const parsed =
      JSON.parse(raw) as {
        analyses?: BatchAnalysis[];
      };

    const analyses =
      Array.isArray(
        parsed.analyses
      )
        ? parsed.analyses
            .filter(
              (
                item
              ): item is BatchAnalysis =>
                typeof item ===
                  "object" &&
                item !== null &&
                Number.isInteger(
                  item.imageIndex
                )
            )
            .sort(
              (a, b) =>
                a.imageIndex -
                b.imageIndex
            )
            .map((item) => ({
              imageIndex:
                item.imageIndex,
              analysis:
                buildAnalysis(
                  item
                ),
            }))
        : [];

    if (
      analyses.length !==
      images.length
    ) {
      throw new Error(
        `Batch-Bildanalyse unvollstaendig: erwartet ${images.length}, erhalten ${analyses.length}.`
      );
    }

    const durationMs =
      Math.round(
        performance.now() -
          startedAt
      );

    console.info(
      "[IMAGE BATCH SPEED] finished",
      {
        imageCount:
          images.length,
        imageNames:
          images.map(
            (image) => image.name
          ),
        imageBytes:
          images.map(
            (image) => image.size
          ),
        durationMs,
      }
    );

    return NextResponse.json({
      success: true,
      analyses,
      durationMs,
    });
  } catch (error) {
    console.error(
      "ANALYZE IMAGES API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unbekannter Fehler bei der Batch-Bildanalyse.",
      },
      {
        status: 500,
      }
    );
  }
}
