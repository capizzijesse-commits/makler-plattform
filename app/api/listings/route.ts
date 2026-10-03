import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { normalizeUserPlan } from "@/lib/plans";
import { resolveListingAddress } from "@/lib/listing-location";
import { createStorageReadUrl } from "@/lib/storage/storage.server";

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

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  let text = value
    .trim()
    .replace(/[?']/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9.,+-]/g, "");

  if (!text) {
    return null;
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const decimals = text.length - lastComma - 1;

    text =
      decimals === 3
        ? text.replace(/,/g, "")
        : text.replace(",", ".");
  } else if (lastDot >= 0) {
    const decimals = text.length - lastDot - 1;

    if (decimals === 3) {
      text = text.replace(/\./g, "");
    }
  }

  const number = Number(text);

  return Number.isFinite(number)
    ? number
    : null;
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
    finance: true,
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


    const listingsWithDisplayImages =
      await Promise.all(
        listings.map(async (listing) => ({
          ...listing,
          images: await Promise.all(
            listing.images.map(
              async (image) => ({
                ...image,
                url:
                  image.url ||
                  (image.storageKey
                    ? await createStorageReadUrl(
                        image.storageKey,
                        3600
                      )
                    : ""),
              })
            )
          ),
        }))
      );

    const userPlan = normalizeUserPlan(user.plan);

    return NextResponse.json({
      success: true,
      listings: listingsWithDisplayImages.map((listing) => {
        const hasCoreAccess =
          userPlan !== "free" ||
          listing.unlockStatus === "paid" ||
          listing.unlockStatus === "included";

        return {
          ...listing,
          generatedVariants: hasCoreAccess
            ? parseJsonValue(listing.generatedVariants)
            : null,
          socialVariants: hasCoreAccess
            ? parseJsonValue(listing.socialVariants)
            : null,
          finance: hasCoreAccess
            ? listing.finance
            : null,
          imageAnalysis: hasCoreAccess
            ? listing.imageAnalysis
            : null,
          market: listing.market,
          locationDescription: hasCoreAccess
            ? listing.locationDescription
            : null,
          locationData: hasCoreAccess
            ? parseJsonValue(listing.locationData)
            : null,
          hasCoreAccess,
        };
      }),
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

    const listingMarket =
      body.market === "DE" ||
      body.market === "CH"
        ? body.market
        : null;

    const rawCountryCode =
      typeof body.countryCode === "string"
        ? body.countryCode.trim().toUpperCase()
        : "";

    const listingCountryCode =
      /^[A-Z]{2}$/.test(rawCountryCode)
        ? rawCountryCode
        : listingMarket;

    const street =
      optionalText(
        body.street
      );

    const postalCode =
      optionalText(
        body.postalCode
      );

    const location =
      typeof body.location === "string" ? body.location.trim() : "";

    const propertyType =
      typeof body.propertyType === "string"
        ? body.propertyType.trim()
        : "";

    const projectName =
      typeof body.projectName === "string"
        ? body.projectName.trim()
        : "";

    if (projectName.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte gib dem Projekt einen Namen mit mindestens 3 Zeichen.",
        },
        { status: 400 }
      );
    }

    if (projectName.length > 120) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Projektname darf maximal 120 Zeichen enthalten.",
        },
        { status: 400 }
      );
    }
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

    const resolvedLocation =
      street &&
      postalCode &&
      listingCountryCode
        ? await resolveListingAddress({
            countryCode:
              listingCountryCode,

            market:
              listingMarket,


            street,
            postalCode,
            city:
              location,
          })
        : null;

    const userPlan = normalizeUserPlan(user.plan);
    const usesSingleObjectPayment =
      userPlan === "free";

    const listing = await prisma.listing.create({
      data: {
        userId: user.id,
        paymentModel: usesSingleObjectPayment
          ? "single_object"
          : "subscription",
        unlockStatus: usesSingleObjectPayment
          ? "locked"
          : "included",
        projectName,
        market: listingMarket,

        countryCode:
          listingCountryCode,

        street,

        location,

        postalCode,

        latitude:
          resolvedLocation
            ?.latitude ??
          null,

        longitude:
          resolvedLocation
            ?.longitude ??
          null,

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
