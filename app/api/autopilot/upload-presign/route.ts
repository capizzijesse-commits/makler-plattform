import {
  randomUUID,
} from "node:crypto";

import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  createR2PresignedUpload,
} from "@/lib/storage/r2-storage.server";

export const runtime =
  "nodejs";

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  50 * 1024 * 1024;

const MAX_IMAGE_COUNT =
  20;

const AUTOPILOT_PROJECT_NAME =
  "Autopilot-Entwurf";

const ALLOWED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

type RequestBody = {
  listingId?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  size?: unknown;
};

function safeFileName(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const text =
    value.trim();

  if (!text) {
    return null;
  }

  return text
    .slice(0, 180)
    .replace(
      /[^a-zA-Z0-9._-]+/g,
      "-"
    );
}

function extensionFor(
  contentType: string
): string {
  switch (contentType) {
    case "application/pdf":
      return ".pdf";

    case "image/jpeg":
      return ".jpg";

    case "image/png":
      return ".png";

    case "image/webp":
      return ".webp";

    default:
      throw new Error(
        "Ungültiger Dateityp."
      );
  }
}

export async function POST(
  request: NextRequest
) {
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

    const body =
      (
        await request.json()
      ) as RequestBody;

    const listingId =
      typeof body.listingId ===
        "string"
        ? body.listingId.trim()
        : "";

    const fileName =
      safeFileName(
        body.fileName
      );

    const contentType =
      typeof body.contentType ===
        "string"
        ? body.contentType.trim()
        : "";

    const size =
      typeof body.size ===
        "number" &&
      Number.isFinite(body.size)
        ? body.size
        : 0;

    if (
      !listingId ||
      listingId.length > 128
    ) {
      throw new Error(
        "Ungültiger Autopilot-Entwurf."
      );
    }

    if (!fileName) {
      throw new Error(
        "Ungültiger Dateiname."
      );
    }

    const isPdf =
      contentType ===
      "application/pdf";

    const isImage =
      ALLOWED_IMAGE_TYPES.has(
        contentType
      );

    if (
      !isPdf &&
      !isImage
    ) {
      throw new Error(
        "Ungültiger Dateityp."
      );
    }

    const maximumSize =
      isPdf
        ? MAX_DOCUMENT_SIZE
        : MAX_IMAGE_SIZE;

    if (
      size <= 0 ||
      size > maximumSize
    ) {
      throw new Error(
        "Ungültige Dateigröße."
      );
    }

    const listing =
      await prisma.listing
        .findFirst({
          where: {
            id:
              listingId,

            userId:
              user.id,

            archivedAt:
              null,
          },

          select: {
            id: true,
            projectName: true,
          },
        });

    if (
      !listing ||
      listing.projectName !==
        AUTOPILOT_PROJECT_NAME
    ) {
      throw new Error(
        "Autopilot-Entwurf wurde nicht gefunden."
      );
    }

    if (isImage) {
      const storedImageCount =
        await prisma.listingImage
          .count({
            where: {
              listingId:
                listing.id,
            },
          });

      if (
        storedImageCount >=
        MAX_IMAGE_COUNT
      ) {
        throw new Error(
          "Maximal 20 Bilder pro Autopilot-Durchlauf."
        );
      }
    }

    const extension =
      extensionFor(
        contentType
      );

    const pathname =
      [
        "autopilot",
        listing.id,
        "uploads",
        randomUUID() +
          extension,
      ].join("/");

    const signed =
      await createR2PresignedUpload({
        pathname,
        contentType,
        expiresInSeconds:
          300,
      });

    return NextResponse.json({
      success: true,
      pathname:
        signed.pathname,
      uploadUrl:
        signed.uploadUrl,
      expiresInSeconds:
        signed.expiresInSeconds,
      fileName,
      contentType,
      size,
    });
  } catch (error) {
    console.error(
      "[autopilot/upload-presign]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Upload konnte nicht vorbereitet werden.",
      },
      {
        status: 400,
      }
    );
  }
}
