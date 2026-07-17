import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const text = value.trim();
  return text.length > 0 ? text : null;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value.replace(/['’\s]/g, "").replace(",", ".")
      : value;

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function parseJsonValue(value: string | null): unknown {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeHighlights(value: unknown): string | null {
  if (Array.isArray(value)) {
    const highlights = value
      .filter(
        (item: unknown): item is string =>
          typeof item === "string"
      )
      .map((item) => item.trim())
      .filter(Boolean);

    return highlights.length > 0
      ? highlights.join(", ")
      : null;
  }

  return optionalText(value);
}

export async function GET(
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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine Objekt-ID angegeben.",
        },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findFirst({
  where: {
    id,
    userId: user.id,
  },
  include: {
    images: {
      orderBy: [
        {
          isPrimary: "desc",
        },
        {
          position: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    },
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

   return NextResponse.json({
  success: true,
  listing: {
    ...listing,
    generatedVariants: parseJsonValue(
      listing.generatedVariants
    ),
    socialVariants: parseJsonValue(
      listing.socialVariants
    ),
  },
});
  } catch (error) {
    console.error("Fehler beim Laden des Objekts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Das Objekt konnte nicht geladen werden.",
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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Keine Objekt-ID angegeben.",
        },
        { status: 400 }
      );
    }

    const existingListing = await prisma.listing.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json(
        {
          success: false,
          error: "Das Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : "";

    const propertyType =
      typeof body.propertyType === "string"
        ? body.propertyType.trim()
        : "";

    if (!location || !propertyType) {
      return NextResponse.json(
        {
          success: false,
          error: "Ort und Objektart sind erforderlich.",
        },
        { status: 400 }
      );
    }

    const price = optionalNumber(body.price);

    const updatedListing = await prisma.listing.update({
      where: {
        id: existingListing.id,
      },
      data: {
        location,
        postalCode: optionalText(body.postalCode),
        propertyType,
        rooms: optionalNumber(body.rooms),
        livingArea: optionalNumber(body.livingArea),
        price: price === null ? null : Math.round(price),
        highlights: normalizeHighlights(body.highlights),
        style: optionalText(body.style),
generatedVariants:
  body.generatedVariants === undefined
    ? existingListing.generatedVariants
    : JSON.stringify(body.generatedVariants),
    socialVariants:
  body.socialVariants === undefined
    ? existingListing.socialVariants
    : JSON.stringify(body.socialVariants),
imageAnalysis:
  body.imageAnalysis === undefined
    ? existingListing.imageAnalysis
    : optionalText(body.imageAnalysis),
      },
    });
    

    return NextResponse.json({
      success: true,
      message: "Objekt wurde erfolgreich aktualisiert.",
      listing: {
        ...updatedListing,
        generatedVariants: parseJsonValue(
          updatedListing.generatedVariants
        ),
      },
    });
  } catch (error) {
    console.error("Fehler beim Bearbeiten des Objekts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Das Objekt konnte nicht aktualisiert werden.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const body = (await request.json().catch(() => null)) as {
      archived?: unknown;
    } | null;

    if (typeof body?.archived !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "Ungültiger Archivstatus.",
        },
        { status: 400 }
      );
    }

    const existingListing = await prisma.listing.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json(
        {
          success: false,
          error: "Das Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    const listing = await prisma.listing.update({
      where: {
        id: existingListing.id,
      },
      data: {
        archivedAt: body.archived ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: body.archived
        ? "Objekt wurde archiviert."
        : "Objekt wurde wieder aktiviert.",
      listing: {
        ...listing,
        generatedVariants: parseJsonValue(
          listing.generatedVariants
        ),
      },
    });
  } catch (error) {
    console.error("Fehler beim Archivieren des Objekts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Der Objektstatus konnte nicht geändert werden.",
      },
      { status: 500 }
    );
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

    const existingListing = await prisma.listing.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json(
        {
          success: false,
          error: "Das Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    await prisma.listing.delete({
      where: {
        id: existingListing.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Objekt wurde dauerhaft gelöscht.",
    });
  } catch (error) {
    console.error("Fehler beim Löschen des Objekts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Das Objekt konnte nicht gelöscht werden.",
      },
      { status: 500 }
    );
  }
}
