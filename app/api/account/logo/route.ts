import {
  del,
  put,
} from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_LOGO_SIZE =
  2 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

function extensionForMimeType(
  mimeType: string
): string {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
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


    const formData =
      await request.formData();

    const file =
      formData.get("file");


    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte ein Firmenlogo auswählen.",
        },
        {
          status: 400,
        }
      );
    }


    const mimeType =
      file.type
        .trim()
        .toLowerCase();


    if (
      !ALLOWED_TYPES.has(
        mimeType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Erlaubt sind JPG, PNG und WebP.",
        },
        {
          status: 400,
        }
      );
    }


    if (
      file.size <= 0 ||
      file.size > MAX_LOGO_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Firmenlogo darf maximal 2 MB gross sein.",
        },
        {
          status: 400,
        }
      );
    }


    const previous =
      await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          companyLogoUrl: true,
          companyLogoPathname: true,
        },
      });


    const extension =
      extensionForMimeType(
        mimeType
      );


    const blob =
      await put(
        `company-logos/${user.id}/logo.${extension}`,
        file,
        {
          access: "public",
          addRandomSuffix: true,
        }
      );


    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          companyLogoUrl:
            blob.url,
          companyLogoPathname:
            blob.pathname,
        },
        select: {
          companyLogoUrl: true,
        },
      });


    const previousBlob =
      previous?.companyLogoPathname ||
      previous?.companyLogoUrl;


    if (
      previousBlob &&
      previous?.companyLogoUrl !==
        blob.url
    ) {
      try {
        await del(
          previousBlob
        );
      } catch (deleteError) {
        console.warn(
          "ALTES FIRMENLOGO KONNTE NICHT GELÖSCHT WERDEN:",
          deleteError
        );
      }
    }


    return NextResponse.json({
      success: true,
      message:
        "Firmenlogo wurde gespeichert.",
      logoUrl:
        updatedUser.companyLogoUrl,
    });

  } catch (error) {
    console.error(
      "FIRMENLOGO UPLOAD FEHLER:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Firmenlogo konnte nicht gespeichert werden.",
      },
      {
        status: 500,
      }
    );
  }
}


export async function DELETE(
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


    const existing =
      await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          companyLogoUrl: true,
          companyLogoPathname: true,
        },
      });


    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        companyLogoUrl: null,
        companyLogoPathname: null,
      },
    });


    const existingBlob =
      existing?.companyLogoPathname ||
      existing?.companyLogoUrl;


    if (existingBlob) {
      try {
        await del(
          existingBlob
        );
      } catch (deleteError) {
        console.warn(
          "FIRMENLOGO KONNTE NICHT AUS BLOB GELÖSCHT WERDEN:",
          deleteError
        );
      }
    }


    return NextResponse.json({
      success: true,
      message:
        "Firmenlogo wurde entfernt.",
    });

  } catch (error) {
    console.error(
      "FIRMENLOGO DELETE FEHLER:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Firmenlogo konnte nicht entfernt werden.",
      },
      {
        status: 500,
      }
    );
  }
}