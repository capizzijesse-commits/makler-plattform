import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text.length > 0 ? text : null;
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

    const body = (await request.json().catch(() => null)) as {
      listingId?: unknown;
      url?: unknown;
      storageKey?: unknown;
      fileName?: unknown;
      mimeType?: unknown;
      sizeBytes?: unknown;
    } | null;

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    const url =
      typeof body?.url === "string"
        ? body.url.trim()
        : "";

    const storageKey =
      typeof body?.storageKey === "string"
        ? body.storageKey.trim()
        : "";

    const rawSizeBytes = Number(body?.sizeBytes);

    const sizeBytes =
      Number.isInteger(rawSizeBytes) && rawSizeBytes >= 0
        ? rawSizeBytes
        : null;

    if (!listingId || !url || !storageKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Objekt-ID, Bild-URL und Speicherpfad sind erforderlich.",
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          success: false,
          error: "Das Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    const expectedPathPrefix =
      `listing-images/${listing.id}/`;

    if (!storageKey.startsWith(expectedPathPrefix)) {
      return NextResponse.json(
        {
          success: false,
          error: "Der Bildpfad gehört nicht zu diesem Objekt.",
        },
        { status: 400 }
      );
    }

    const existingImage =
      await prisma.listingImage.findUnique({
        where: {
          storageKey,
        },
      });

    if (existingImage) {
      return NextResponse.json({
        success: true,
        image: existingImage,
      });
    }

    const storedImageCount =
      await prisma.listingImage.count({
        where: {
          listingId: listing.id,
        },
      });

    if (storedImageCount >= 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Für dieses Objekt sind bereits 10 Bilder gespeichert.",
        },
        { status: 400 }
      );
    }

    const image = await prisma.listingImage.create({
      data: {
        listingId: listing.id,
        url,
        storageKey,
        fileName: optionalText(body?.fileName),
        mimeType: optionalText(body?.mimeType),
        sizeBytes,
        position: storedImageCount,
        isPrimary: storedImageCount === 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Bild wurde dauerhaft mit dem Objekt verbunden.",
        image,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("BILDDATEN-SPEICHERFEHLER:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Das Bild konnte nicht mit dem Objekt verbunden werden.",
      },
      { status: 500 }
    );
  }
}
