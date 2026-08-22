import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const AI_MODEL = "gpt-image-2";

const PROMPT_VERSIONS = new Set([
  "home-staging-v2-variants",
  "home-staging-v3-architecture-lock",
]);

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

type SaveHomeStagingBody = {
  listingId?: unknown;
  sourceImageId?: unknown;
  url?: unknown;
  storageKey?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  roomType?: unknown;
  style?: unknown;
  aiModel?: unknown;
  promptVersion?: unknown;
};

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const text = requiredText(value);
  return text || null;
}

function isValidBlobUrl(
  urlText: string,
  storageKey: string
): boolean {
  try {
    const url = new URL(urlText);

    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(
        ".blob.vercel-storage.com"
      )
    ) {
      return false;
    }

    const pathname = decodeURIComponent(
      url.pathname.replace(/^\/+/, "")
    );

    return pathname === storageKey;
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
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

    const capabilities =
      getPlanCapabilities(user.plan);

if (!capabilities.canUseHomeStaging) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Virtuelles Home Staging ist im Pro-Plan für CHF 79.90 pro Monat enthalten.",
        },
        { status: 403 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as SaveHomeStagingBody | null;

    const listingId = requiredText(body?.listingId);
    const sourceImageId = requiredText(
      body?.sourceImageId
    );
    const url = requiredText(body?.url);
    const storageKey = requiredText(
      body?.storageKey
    );
    const roomType = requiredText(body?.roomType);
    const style = requiredText(body?.style);
    const aiModel = requiredText(body?.aiModel);
    const promptVersion = requiredText(
      body?.promptVersion
    );
    const mimeType = requiredText(body?.mimeType);

    const rawSizeBytes = Number(body?.sizeBytes);

    const sizeBytes =
      Number.isInteger(rawSizeBytes) &&
      rawSizeBytes > 0
        ? rawSizeBytes
        : null;

    if (
      !listingId ||
      !sourceImageId ||
      !url ||
      !storageKey ||
      !roomType ||
      !style ||
      !aiModel ||
      !promptVersion
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Angaben zur AI-Visualisierung sind unvollständig.",
        },
        { status: 400 }
      );
    }

    if (!ROOM_TYPES.has(roomType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Die gewählte Raumart ist ungültig.",
        },
        { status: 400 }
      );
    }

    if (!STYLES.has(style)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der gewählte Einrichtungsstil ist ungültig.",
        },
        { status: 400 }
      );
    }

    if (
      aiModel !== AI_MODEL ||
      !PROMPT_VERSIONS.has(promptVersion)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die AI-Generierungsdaten sind ungültig.",
        },
        { status: 400 }
      );
    }

    if (mimeType !== "image/webp") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Home-Staging-Ergebnis muss im WEBP-Format vorliegen.",
        },
        { status: 400 }
      );
    }

    if (
      sizeBytes === null ||
      sizeBytes > MAX_IMAGE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Bildgrösse ist ungültig. Maximal erlaubt sind 10 MB.",
        },
        { status: 400 }
      );
    }

    const expectedPathPrefix =
      `home-staging/${listingId}/${sourceImageId}/`;

    if (!storageKey.startsWith(expectedPathPrefix)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Speicherpfad gehört nicht zu diesem Objektbild.",
        },
        { status: 400 }
      );
    }

    if (!isValidBlobUrl(url, storageKey)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die übermittelte Blob-URL ist ungültig.",
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
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Objekt wurde nicht gefunden oder ist archiviert.",
        },
        { status: 404 }
      );
    }

    if (!listing.images[0]) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das zugehörige Originalbild wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    const existingImage =
      await prisma.homeStagingImage.findUnique({
        where: {
          storageKey,
        },
      });

    if (existingImage) {
      return NextResponse.json({
        success: true,
        message:
          "Die AI-Visualisierung war bereits gespeichert.",
        image: existingImage,
      });
    }

    const image =
      await prisma.homeStagingImage.create({
        data: {
          listingId: listing.id,
          sourceImageId: listing.images[0].id,
          url,
          storageKey,
          fileName: optionalText(body?.fileName),
          mimeType,
          sizeBytes,
          roomType,
          style,
          aiModel,
          promptVersion,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Die AI-Visualisierung wurde dauerhaft gespeichert.",
        image,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "HOME-STAGING-SPEICHERFEHLER:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die AI-Visualisierung konnte nicht gespeichert werden.",
      },
      { status: 500 }
    );
  }
}
