import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canUseListingCoreForUser } from "@/lib/listing-access";
import { getAuthenticatedUser } from "@/lib/session";
import { analyzeImageBatch } from "@/lib/image-batch-analyzer.server";

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

    const batchInputs =
      await Promise.all(
        images.map(
          async (image) => ({
            name: image.name,
            mimeType: image.type,
            bytes: Buffer.from(
              await image.arrayBuffer()
            ),
          })
        )
      );

    const analyses =
      await analyzeImageBatch(
        batchInputs
      );

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
