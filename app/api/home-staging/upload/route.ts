import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const ROOM_TYPES = new Set([
  "livingRoom",
  "bedroom",
  "office",
  "diningRoom",
  "kidsRoom",
]);

const STYLES = new Set([
  "modern",
  "scandinavian",
  "luxurious",
  "minimalist",
]);

type UploadClientPayload = {
  listingId?: unknown;
  sourceImageId?: unknown;
  roomType?: unknown;
  style?: unknown;
  aiModel?: unknown;
  promptVersion?: unknown;
};

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload
      ) => {
        const user = await getAuthenticatedUser(request);

        if (!user) {
          throw new Error("Bitte zuerst einloggen.");
        }

        let payload: UploadClientPayload;

        try {
          payload = JSON.parse(
            clientPayload || "{}"
          ) as UploadClientPayload;
        } catch {
          throw new Error(
            "Ungültige Home-Staging-Daten."
          );
        }

        const listingId = requiredText(
          payload.listingId
        );
        const sourceImageId = requiredText(
          payload.sourceImageId
        );
        const roomType = requiredText(
          payload.roomType
        );
        const style = requiredText(payload.style);
        const aiModel = requiredText(
          payload.aiModel
        );
        const promptVersion = requiredText(
          payload.promptVersion
        );

        if (
          !listingId ||
          !sourceImageId ||
          !roomType ||
          !style ||
          !aiModel ||
          !promptVersion
        ) {
          throw new Error(
            "Die Angaben zur AI-Visualisierung sind unvollständig."
          );
        }

        if (!ROOM_TYPES.has(roomType)) {
          throw new Error("Ungültige Raumart.");
        }

        if (!STYLES.has(style)) {
          throw new Error(
            "Ungültiger Einrichtungsstil."
          );
        }

        if (
          aiModel !== "gpt-image-2" ||
          promptVersion !== "home-staging-v2-variants"
        ) {
          throw new Error(
            "Ungültige AI-Generierungsdaten."
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
            images: {
              where: {
                id: sourceImageId,
              },
              select: {
                id: true,
              },
              take: 1,
            },
          },
        });

        if (!listing) {
          throw new Error(
            "Das Objekt wurde nicht gefunden."
          );
        }

        if (!listing.images[0]) {
          throw new Error(
            "Das Originalbild wurde nicht gefunden."
          );
        }

        const expectedPathPrefix =
          `home-staging/${listing.id}/${sourceImageId}/`;

        if (!pathname.startsWith(expectedPathPrefix)) {
          throw new Error(
            "Ungültiger Home-Staging-Speicherpfad."
          );
        }

        return {
          allowedContentTypes: ["image/webp"],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            listingId: listing.id,
            sourceImageId,
            roomType,
            style,
            aiModel,
            promptVersion,
            userId: user.id,
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.info(
          "Home-Staging-Ergebnis zu Blob hochgeladen:",
          blob.pathname
        );
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error(
      "HOME-STAGING-UPLOAD-FEHLER:",
      error
    );

    const safeMessages = new Set([
      "Bitte zuerst einloggen.",
      "Ungültige Home-Staging-Daten.",
      "Die Angaben zur AI-Visualisierung sind unvollständig.",
      "Ungültige Raumart.",
      "Ungültiger Einrichtungsstil.",
      "Ungültige AI-Generierungsdaten.",
      "Das Objekt wurde nicht gefunden.",
      "Das Originalbild wurde nicht gefunden.",
      "Ungültiger Home-Staging-Speicherpfad.",
    ]);

    const message =
      error instanceof Error &&
      safeMessages.has(error.message)
        ? error.message
        : "Das Home-Staging-Bild konnte nicht hochgeladen werden.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}

