import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

type UploadClientPayload = {
  listingId?: unknown;
};

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
          throw new Error("Ungültige Upload-Daten.");
        }

        const listingId =
          typeof payload.listingId === "string"
            ? payload.listingId.trim()
            : "";

        if (!listingId) {
          throw new Error("Keine Objekt-ID angegeben.");
        }

        const listing = await prisma.listing.findFirst({
          where: {
            id: listingId,
            userId: user.id,
          },
          select: {
            id: true,
          },
        });

        if (!listing) {
          throw new Error(
            "Das Objekt wurde nicht gefunden."
          );
        }

        const expectedPathPrefix =
          `listing-images/${listing.id}/`;

        if (!pathname.startsWith(expectedPathPrefix)) {
          throw new Error("Ungültiger Speicherpfad.");
        }

        const storedImageCount =
          await prisma.listingImage.count({
            where: {
              listingId: listing.id,
            },
          });

        if (storedImageCount >= 10) {
          throw new Error(
            "Für dieses Objekt sind bereits 10 Bilder gespeichert."
          );
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            listingId: listing.id,
            userId: user.id,
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.info(
          "Objektbild erfolgreich zu Blob hochgeladen:",
          blob.pathname
        );
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("BILD-UPLOAD-FEHLER:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Das Bild konnte nicht hochgeladen werden.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}