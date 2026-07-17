import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

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

    if (!imageId) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine Bild-ID angegeben.",
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

    await del(image.url);

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

    if (!imageId) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine Bild-ID angegeben.",
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
        error: "Das Hauptbild konnte nicht geändert werden.",
      },
      { status: 500 }
    );
  }
}