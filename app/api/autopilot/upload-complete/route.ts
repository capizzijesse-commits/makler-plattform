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
  deleteObjects,
  headObject,
} from "@/lib/storage/storage.server";

export const runtime =
  "nodejs";

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  50 * 1024 * 1024;

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
  pathname?: unknown;
  fileName?: unknown;
  contentType?: unknown;
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

  return text.slice(
    0,
    180
  );
}

export async function POST(
  request: NextRequest
) {
  let uploadedPathname:
    | string
    | null = null;

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

    const pathname =
      typeof body.pathname ===
        "string"
        ? body.pathname.trim()
        : "";

    const fileName =
      safeFileName(
        body.fileName
      );

    const expectedContentType =
      typeof body.contentType ===
        "string"
        ? body.contentType.trim()
        : "";

    if (
      !listingId ||
      listingId.length > 128
    ) {
      throw new Error(
        "Ungültiger Autopilot-Entwurf."
      );
    }

    const expectedPrefix =
      `autopilot/${listingId}/uploads/`;

    if (
      !pathname ||
      !pathname.startsWith(
        expectedPrefix
      ) ||
      pathname.includes("..")
    ) {
      throw new Error(
        "Ungültiger Autopilot-Speicherpfad."
      );
    }

    if (!fileName) {
      throw new Error(
        "Ungültiger Dateiname."
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

    /*
     * Cleanup is only allowed after ownership and
     * Autopilot project validation succeeded.
     */
    uploadedPathname =
      pathname;

    const metadata =
      await headObject(
        pathname
      );

    const isPdf =
      metadata.contentType ===
      "application/pdf";

    const isImage =
      ALLOWED_IMAGE_TYPES.has(
        metadata.contentType
      );

    if (
      !isPdf &&
      !isImage
    ) {
      throw new Error(
        "Ungültiger Dateityp."
      );
    }

    if (
      expectedContentType &&
      metadata.contentType !==
        expectedContentType
    ) {
      throw new Error(
        "Dateityp stimmt nicht mit dem Upload überein."
      );
    }

    const maximumSize =
      isPdf
        ? MAX_DOCUMENT_SIZE
        : MAX_IMAGE_SIZE;

    if (
      metadata.size <= 0 ||
      metadata.size >
        maximumSize
    ) {
      throw new Error(
        "Ungültige Dateigröße."
      );
    }

    return NextResponse.json({
      success: true,
      pathname:
        metadata.pathname,
      url:
        metadata.url,
      contentType:
        metadata.contentType,
      size:
        metadata.size,
      fileName,
      kind:
        isPdf
          ? "document"
          : "image",
    });
  } catch (error) {
    if (uploadedPathname) {
      try {
        await deleteObjects(
          uploadedPathname
        );
      } catch (
        cleanupError
      ) {
        console.warn(
          "[autopilot/upload-complete-cleanup]",
          cleanupError
        );
      }
    }

    console.error(
      "[autopilot/upload-complete]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Upload konnte nicht bestätigt werden.",
      },
      {
        status: 400,
      }
    );
  }
}

