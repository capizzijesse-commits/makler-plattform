import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { normalizeUserPlan } from "@/lib/plans";

export const runtime = "nodejs";

const MAX_IMAGE_COUNT = 10;
const SINGLE_OBJECT_IMAGE_COUNT = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

type UploadClientPayload = {
  listingId?: unknown;
};

const SAFE_ERROR_MESSAGES = new Set([
  "Bitte zuerst einloggen.",
  "Ungültige Upload-Daten.",
  "Keine Objekt-ID angegeben.",
  "Das aktive Objekt wurde nicht gefunden.",
  "Ungültiger Speicherpfad.",
  "Bilder sind erst nach der Freischaltung dieser Immobilie verfügbar.",
  "Für dieses Objekt sind bereits 5 Bilder gespeichert.",
  "Für dieses Objekt sind bereits 10 Bilder gespeichert.",
]);

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

        if (!listingId || listingId.length > 128) {
          throw new Error("Keine Objekt-ID angegeben.");
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
            stripeCheckoutSessionId: true,
          },
        });

        if (!listing) {
          throw new Error(
            "Das aktive Objekt wurde nicht gefunden."
          );
        }

        const normalizedPlan =
          normalizeUserPlan(user.plan);

        const hasSubscriptionImageAccess =
          normalizedPlan !== "free";

        const hasPaidSingleObjectImageAccess =
          listing.paymentModel === "single_object" &&
          (
            listing.unlockStatus === "paid" ||
            listing.paidAt !== null
          );

        const hasPendingSingleObjectCheckout =
          listing.paymentModel === "single_object" &&
          listing.unlockStatus === "pending" &&
          typeof listing.stripeCheckoutSessionId ===
            "string" &&
          listing.stripeCheckoutSessionId.startsWith(
            "cs_"
          );

        if (
          !hasSubscriptionImageAccess &&
          !hasPaidSingleObjectImageAccess &&
          !hasPendingSingleObjectCheckout
        ) {
          throw new Error(
            "Bilder sind erst nach der Freischaltung dieser Immobilie verfügbar."
          );
        }

        const maxImageCount =
          hasSubscriptionImageAccess
            ? MAX_IMAGE_COUNT
            : SINGLE_OBJECT_IMAGE_COUNT;

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

        if (storedImageCount >= maxImageCount) {
          throw new Error(
            `Für dieses Objekt sind bereits ${maxImageCount} Bilder gespeichert.`
          );
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: MAX_IMAGE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            listingId: listing.id,
            userId: user.id,
          }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("BILD-UPLOAD-FEHLER:", error);

    const message =
      error instanceof Error &&
      SAFE_ERROR_MESSAGES.has(error.message)
        ? error.message
        : "Das Bild konnte nicht hochgeladen werden.";

    const status =
      message === "Bitte zuerst einloggen."
        ? 401
        : message ===
            "Bilder sind erst nach der Freischaltung dieser Immobilie verfügbar."
          ? 403
          : 400;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
