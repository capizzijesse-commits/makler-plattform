import { put } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizeUserPlan } from "@/lib/plans";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_SERVER_UPLOAD_SIZE =
  4_000_000;

const MAX_IMAGE_COUNT = 10;
const SINGLE_OBJECT_IMAGE_COUNT = 5;

const ALLOWED_CONTENT_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

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
        { status: 401 }
      );
    }

    const formData =
      await request.formData();

    const listingIdValue =
      formData.get("listingId");

    const fileValue =
      formData.get("file");

    const listingId =
      typeof listingIdValue ===
      "string"
        ? listingIdValue.trim()
        : "";

    if (
      !listingId ||
      listingId.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Keine gültige Objekt-ID angegeben.",
        },
        { status: 400 }
      );
    }

    if (
      !(fileValue instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Keine Bilddatei erhalten.",
        },
        { status: 400 }
      );
    }

    const file = fileValue;

    if (
      !ALLOWED_CONTENT_TYPES.has(
        file.type
      ) ||
      file.size <= 0 ||
      file.size >
        MAX_SERVER_UPLOAD_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Bild ist ungültig oder für den sicheren Ersatz-Upload zu gross.",
        },
        { status: 400 }
      );
    }

    const listing =
      await prisma.listing.findFirst(
        {
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
            stripeCheckoutSessionId:
              true,
          },
        }
      );

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

    const normalizedPlan =
      normalizeUserPlan(user.plan);

    const hasSubscriptionImageAccess =
      normalizedPlan !== "free";

    const hasPaidSingleObjectImageAccess =
      listing.paymentModel ===
        "single_object" &&
      (
        listing.unlockStatus ===
          "paid" ||
        listing.paidAt !== null
      );

    const hasPendingSingleObjectCheckout =
      listing.paymentModel ===
        "single_object" &&
      listing.unlockStatus ===
        "pending" &&
      typeof listing
        .stripeCheckoutSessionId ===
        "string" &&
      listing.stripeCheckoutSessionId.startsWith(
        "cs_"
      );

    if (
      !hasSubscriptionImageAccess &&
      !hasPaidSingleObjectImageAccess &&
      !hasPendingSingleObjectCheckout
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

    const storedImageCount =
      await prisma.listingImage.count(
        {
          where: {
            listingId:
              listing.id,
          },
        }
      );

    if (
      storedImageCount >=
      maxImageCount
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Für dieses Objekt sind bereits ${maxImageCount} Bilder gespeichert.`,
        },
        { status: 400 }
      );
    }

    const safeFileName =
      file.name
        .normalize("NFKD")
        .replace(
          /[^a-zA-Z0-9._-]+/g,
          "-"
        )
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") ||
      "objektfoto.jpg";

    const blob = await put(
      `listing-images/${listing.id}/${safeFileName}`,
      file,
      {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
      }
    );

    /*
     * Exakten Blob-Pfad aus der
     * tatsächlichen URL übernehmen.
     */
    const storageKey =
      new URL(blob.url)
        .pathname
        .replace(/^\/+/, "");

    return NextResponse.json({
      success: true,
      blob: {
        url: blob.url,
        pathname: storageKey,
      },
    });
  } catch (error) {
    console.error(
      "SERVER-BILD-UPLOAD-FEHLER:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Bild konnte über den sicheren Ersatz-Upload nicht gespeichert werden.",
      },
      { status: 500 }
    );
  }
}