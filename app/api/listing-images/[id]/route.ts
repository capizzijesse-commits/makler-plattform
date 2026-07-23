import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_ID_LENGTH = 128;

async function deleteBlobFiles(urls: string[]): Promise<void> {
  const uniqueUrls = [
    ...new Set(
      urls.filter(
        (url) =>
          typeof url === "string" &&
          url.trim().length > 0
      )
    ),
  ];

  if (uniqueUrls.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    uniqueUrls.map((url) => del(url))
  );

  const failedCount = results.filter(
    (result) => result.status === "rejected"
  ).length;

  if (failedCount > 0) {
    console.error("BLOB-BEREINIGUNG UNVOLLSTÄNDIG:", {
      failedCount,
      totalCount: uniqueUrls.length,
    });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    const imageId = id?.trim();

    if (!imageId || imageId.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine gültige Bild-ID angegeben.",
        },
        { status: 400 }
      );
    }

    /*
     * Das Bild wird nur gefunden, wenn das zugehörige Objekt
     * dem angemeldeten Benutzer gehört.
     */
    const image = await prisma.listingImage.findFirst({
      where: {
        id: imageId,
        listing: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        listingId: true,
        isPrimary: true,
        url: true,
        homeStagingImages: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          error: "Das Bild wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    /*
     * Zuerst die Datenbank konsistent aktualisieren.
     * HomeStagingImage-Datensätze werden durch die
     * Prisma-Cascade automatisch mitgelöscht.
     */
    const nextPrimaryImage = await prisma.$transaction(
      async (transaction) => {
        await transaction.listingImage.delete({
          where: {
            id: image.id,
          },
        });

        if (!image.isPrimary) {
          return null;
        }

        const nextImage =
          await transaction.listingImage.findFirst({
            where: {
              listingId: image.listingId,
            },
            orderBy: [
              {
                position: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
            select: {
              id: true,
            },
          });

        if (!nextImage) {
          return null;
        }

        return transaction.listingImage.update({
          where: {
            id: nextImage.id,
          },
          data: {
            isPrimary: true,
          },
        });
      }
    );

    /*
     * Danach Original und alle dazugehörigen
     * Home-Staging-Dateien aus Blob entfernen.
     */
    await deleteBlobFiles([
      image.url,
      ...image.homeStagingImages.map(
        (stagingImage) => stagingImage.url
      ),
    ]);

    return NextResponse.json({
      success: true,
      message: "Bild wurde dauerhaft gelöscht.",
      deletedImageId: image.id,
      nextPrimaryImage,
    });
  } catch (error) {
    console.error("BILD-LÖSCHFEHLER:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Das Bild konnte nicht gelöscht werden.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    const imageId = id?.trim();

    if (!imageId || imageId.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine gültige Bild-ID angegeben.",
        },
        { status: 400 }
      );
    }

    const image = await prisma.listingImage.findFirst({
      where: {
        id: imageId,
        listing: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        listingId: true,
        isPrimary: true,
      },
    });

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          error: "Das Bild wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    if (image.isPrimary) {
      return NextResponse.json({
        success: true,
        message: "Dieses Bild ist bereits das Hauptbild.",
      });
    }

    const updatedImage = await prisma.$transaction(
      async (transaction) => {
        await transaction.listingImage.updateMany({
          where: {
            listingId: image.listingId,
          },
          data: {
            isPrimary: false,
          },
        });

        return transaction.listingImage.update({
          where: {
            id: image.id,
          },
          data: {
            isPrimary: true,
          },
        });
      }
    );

    return NextResponse.json({
      success: true,
      message: "Das Hauptbild wurde aktualisiert.",
      image: updatedImage,
    });
  } catch (error) {
    console.error("HAUPTBILD-FEHLER:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Hauptbild konnte nicht geändert werden.",
      },
      { status: 500 }
    );
  }
}
