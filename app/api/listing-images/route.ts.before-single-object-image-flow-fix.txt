import { del, head } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { normalizeUserPlan } from "@/lib/plans";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const SINGLE_OBJECT_IMAGE_COUNT = 5;
const MAX_STORAGE_KEY_LENGTH = 1024;
const MAX_INPUT_PIXELS = 40_000_000;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MIME_TYPE_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function optionalText(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

async function deleteBlobQuietly(url: string) {
  try {
    await del(url);
  } catch (error) {
    console.error(
      "Nicht registriertes Blob konnte nicht entfernt werden:",
      error
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Bitte zuerst einloggen.",
        },
        { status: 401 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as {
      listingId?: unknown;
      storageKey?: unknown;
      fileName?: unknown;

      /*
       * Diese alten Browserwerte werden absichtlich nicht mehr
       * als vertrauenswürdige Quelle verwendet:
       */
      url?: unknown;
      mimeType?: unknown;
      sizeBytes?: unknown;
    } | null;

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    const storageKey =
      typeof body?.storageKey === "string"
        ? body.storageKey.trim()
        : "";

    if (
      !listingId ||
      !storageKey ||
      listingId.length > 128 ||
      storageKey.length > MAX_STORAGE_KEY_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Objekt-ID oder Speicherpfad ist ungültig.",
        },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        userId: user.id,
        archivedAt: null,
      },
      select: {
        id: true,
        paymentModel: true,
        unlockStatus: true,
        paidAt: true,
      },
    });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das aktive Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    const normalizedPlan = normalizeUserPlan(user.plan);

    const hasSubscriptionImageAccess =
      normalizedPlan !== "free";

    const hasPaidSingleObjectImageAccess =
      listing.paymentModel === "single_object" &&
      (
        listing.unlockStatus === "paid" ||
        listing.paidAt !== null
      );

    if (
      !hasSubscriptionImageAccess &&
      !hasPaidSingleObjectImageAccess
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bilder sind erst nach der Freischaltung dieser Immobilie verfügbar.",
        },
        { status: 403 }
      );
    }

    const maxImageCount =
      hasSubscriptionImageAccess
        ? MAX_IMAGE_COUNT
        : SINGLE_OBJECT_IMAGE_COUNT;

    const expectedPathPrefix =
      `listing-images/${listing.id}/`;

    if (!storageKey.startsWith(expectedPathPrefix)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Bildpfad gehört nicht zu diesem Objekt.",
        },
        { status: 400 }
      );
    }

    /*
     * Wiederholte Registrierung desselben Uploads bleibt
     * problemlos möglich.
     */
    const existingImage =
      await prisma.listingImage.findUnique({
        where: {
          storageKey,
        },
      });

    if (existingImage) {
      if (existingImage.listingId !== listing.id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Der Speicherpfad ist bereits einem anderen Objekt zugeordnet.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        image: existingImage,
      });
    }

    /*
     * Metadaten direkt aus dem verbundenen Vercel-Blob-Store
     * laden. Browserangaben wie URL, MIME-Typ und Grösse
     * werden nicht mehr vertraut.
     */
    let blob: Awaited<ReturnType<typeof head>>;

    try {
      blob = await head(storageKey);
    } catch (error) {
      console.error(
        "BLOB-METADATEN KONNTEN NICHT GELADEN WERDEN:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Die hochgeladene Datei konnte nicht bestätigt werden.",
        },
        { status: 400 }
      );
    }

    if (
      blob.pathname !== storageKey ||
      !ALLOWED_CONTENT_TYPES.has(blob.contentType) ||
      blob.size <= 0 ||
      blob.size > MAX_IMAGE_SIZE
    ) {
      await deleteBlobQuietly(blob.url);

      return NextResponse.json(
        {
          success: false,
          error:
            "Die hochgeladene Datei ist kein zulässiges Bild.",
        },
        { status: 400 }
      );
    }

    /*
     * Das Bild ausschliesslich über die von Vercel bestätigte
     * URL laden. Dadurch kann der Browser keine beliebige
     * interne oder externe URL einschleusen.
     */
    const imageResponse = await fetch(blob.url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });

    if (!imageResponse.ok) {
      await deleteBlobQuietly(blob.url);

      return NextResponse.json(
        {
          success: false,
          error:
            "Das hochgeladene Bild konnte nicht geprüft werden.",
        },
        { status: 400 }
      );
    }

    const imageBytes =
      await imageResponse.arrayBuffer();

    if (
      imageBytes.byteLength <= 0 ||
      imageBytes.byteLength > MAX_IMAGE_SIZE
    ) {
      await deleteBlobQuietly(blob.url);

      return NextResponse.json(
        {
          success: false,
          error:
            "Das Bild ist leer oder überschreitet 10 MB.",
        },
        { status: 400 }
      );
    }

    let metadata: Awaited<
      ReturnType<ReturnType<typeof sharp>["metadata"]>
    >;

    try {
      metadata = await sharp(
        Buffer.from(imageBytes),
        {
          failOn: "error",
          limitInputPixels: MAX_INPUT_PIXELS,
        }
      ).metadata();
    } catch (error) {
      console.error(
        "UNGÜLTIGE BILDDATEN:",
        error
      );

      await deleteBlobQuietly(blob.url);

      return NextResponse.json(
        {
          success: false,
          error:
            "Die Datei enthält keine gültigen Bilddaten.",
        },
        { status: 400 }
      );
    }

    const detectedMimeType =
      metadata.format
        ? MIME_TYPE_BY_FORMAT[metadata.format]
        : undefined;

    if (
      !detectedMimeType ||
      detectedMimeType !== blob.contentType ||
      !metadata.width ||
      !metadata.height
    ) {
      await deleteBlobQuietly(blob.url);

      return NextResponse.json(
        {
          success: false,
          error:
            "Bildformat und Dateiinhalte stimmen nicht überein.",
        },
        { status: 400 }
      );
    }

    const storedImageCount =
      await prisma.listingImage.count({
        where: {
          listingId: listing.id,
        },
      });

    if (storedImageCount >= maxImageCount) {
      await deleteBlobQuietly(blob.url);

      return NextResponse.json(
        {
          success: false,
          error:
            `Für dieses Objekt sind bereits ${maxImageCount} Bilder gespeichert.`,
        },
        { status: 400 }
      );
    }

    const image = await prisma.listingImage.create({
      data: {
        listingId: listing.id,

        /*
         * Ausschliesslich bestätigte Vercel-Werte speichern.
         */
        url: blob.url,
        storageKey: blob.pathname,
        fileName: optionalText(
          body?.fileName,
          255
        ),
        mimeType: detectedMimeType,
        sizeBytes: imageBytes.byteLength,
        position: storedImageCount,
        isPrimary: storedImageCount === 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Bild wurde sicher mit dem Objekt verbunden.",
        image,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "BILDDATEN-SPEICHERFEHLER:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Bild konnte nicht mit dem Objekt verbunden werden.",
      },
      { status: 500 }
    );
  }
}
