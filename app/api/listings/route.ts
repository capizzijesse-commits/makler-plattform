import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const text = value.trim();
  return text.length > 0 ? text : null;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const normalized =
    typeof value === "string"
      ? value.replace(/['’\s]/g, "").replace(",", ".")
      : value;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userEmail =
      typeof body.userEmail === "string"
        ? body.userEmail.trim().toLowerCase()
        : "";

    const location =
      typeof body.location === "string" ? body.location.trim() : "";

    const propertyType =
      typeof body.propertyType === "string"
        ? body.propertyType.trim()
        : "";

    if (!userEmail) {
      return NextResponse.json(
        { error: "Benutzer-E-Mail fehlt." },
        { status: 400 }
      );
    }

    if (!location || !propertyType) {
      return NextResponse.json(
        { error: "Ort und Objektart sind erforderlich." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Benutzer wurde nicht gefunden." },
        { status: 404 }
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
        highlights:
          Array.isArray(body.highlights)
            ? body.highlights
                .filter((item: unknown) => typeof item === "string")
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
        listing,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler beim Speichern des Objekts:", error);

    return NextResponse.json(
      { error: "Das Objekt konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
