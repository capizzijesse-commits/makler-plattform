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

export async function GET(request: NextRequest) {
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
const listings = await prisma.listing.findMany({
  where: {
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
  orderBy: {
    updatedAt: "desc",
  },
});

    return NextResponse.json({
      success: true,
      listings: listings.map((listing) => ({
        ...listing,
        generatedVariants: parseJsonValue(
          listing.generatedVariants
        ),
      })),
    });
  } catch (error) {
    console.error("Fehler beim Laden der Objekte:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Die Objekte konnten nicht geladen werden.",
      },
      { status: 500 }
    );
  }
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

    const body = await request.json();

    const location =
      typeof body.location === "string" ? body.location.trim() : "";

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

    const listing = await prisma.listing.create({
      data: {
        userId: user.id,
        location,
        postalCode: optionalText(body.postalCode),
        propertyType,
        rooms: optionalNumber(body.rooms),
        livingArea: optionalNumber(body.livingArea),
        price: price === null ? null : Math.round(price),
        highlights: Array.isArray(body.highlights)
          ? body.highlights
              .filter(
                (item: unknown): item is string =>
                  typeof item === "string"
              )
              .map((item: string) => item.trim())
              .filter(Boolean)
              .join(", ")
          : optionalText(body.highlights),
        style: optionalText(body.style),
        generatedVariants:
          body.generatedVariants === undefined
            ? null
            : JSON.stringify(body.generatedVariants),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Objekt wurde dauerhaft gespeichert.",
        listing: {
          ...listing,
          generatedVariants: parseJsonValue(
            listing.generatedVariants
          ),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler beim Speichern des Objekts:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Das Objekt konnte nicht gespeichert werden.",
      },
      { status: 500 }
    );
  }
}