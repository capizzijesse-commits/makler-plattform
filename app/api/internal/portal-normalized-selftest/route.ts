import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  mapPrismaListingToPortal,
} from "@/lib/portal-integrations/prisma-listing-adapter";


export const dynamic =
  "force-dynamic";


function countWords(
  value:
    string |
    undefined
): number {
  if (!value) {
    return 0;
  }

  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}


export async function GET(
  request:
    NextRequest
) {
  /*
   * READ_ONLY_PORTAL_NORMALIZED_SELFTEST_V1
   *
   * Nur lokale Entwicklung.
   * Kein Job.
   * Kein Queue-Eintrag.
   * Kein Portal-Request.
   * Kein Publishing.
   */
  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "PORTAL_NORMALIZED_SELFTEST_DISABLED",

        message:
          "Der Portal-Normalized-Selftest ist nur lokal verfügbar.",
      },
      {
        status:
          404,
      }
    );
  }


  const listingId =
    request.nextUrl
      .searchParams
      .get("listingId")
      ?.trim() ||
    null;


  const listing =
    await prisma.listing.findFirst({
      where: {
        archivedAt:
          null,

        ...(listingId
          ? {
              id:
                listingId,
            }
          : {}),
      },

      orderBy:
        listingId
          ? undefined
          : {
              updatedAt:
                "desc",
            },

      select: {
        id:
          true,

        projectName:
          true,

        street:
          true,

        location:
          true,

        postalCode:
          true,

        latitude:
          true,

        longitude:
          true,

        market:
          true,

        countryCode:
          true,

        propertyType:
          true,

        rooms:
          true,

        livingArea:
          true,

        plotArea:
          true,

        price:
          true,

        highlights:
          true,

        generatedVariants:
          true,

        locationDescription:
          true,

        archivedAt:
          true,

        createdAt:
          true,

        updatedAt:
          true,

        images: {
          orderBy: [
            {
              position:
                "asc",
            },
            {
              createdAt:
                "asc",
            },
          ],

          select: {
            url:
              true,

            fileName:
              true,

            mimeType:
              true,

            position:
              true,

            isPrimary:
              true,

            analysis:
              true,
          },
        },

        floorPlans: {
          orderBy: [
            {
              sortOrder:
                "asc",
            },
            {
              createdAt:
                "asc",
            },
          ],

          select: {
            url:
              true,

            fileName:
              true,

            mimeType:
              true,

            floorLevel:
              true,

            sortOrder:
              true,
          },
        },

        finance: {
          select: {
            marketingType:
              true,

            askingPrice:
              true,

            commissionRate:
              true,

            netRentMonthly:
              true,

            additionalCostsMonthly:
              true,

            heatingCostsMonthly:
              true,
          },
        },
      },
    });


  if (!listing) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "LISTING_NOT_FOUND",

        listingId,
      },
      {
        status:
          404,
      }
    );
  }


  const normalized =
    mapPrismaListingToPortal(
      listing,
      "de"
    );


  const images =
    normalized.localization
      .images ??
    [];

  const floorPlans =
    normalized.floorPlans ??
    [];

  const primaryImages =
    images.filter(
      (image) =>
        image.isPrimary ===
        true
    );


  const summary = {
    listingId:
      normalized.id,

    market:
      listing.market,

    countryCode:
      normalized.address
        .countryCode,

    title:
      normalized.localization
        .title,

    descriptionWords:
      countWords(
        normalized.localization
          .description
      ),

    propertyType:
      listing.propertyType,

    portalCategory:
      normalized.category ??
      null,

    locality:
      normalized.address
        .locality,

    postalCode:
      normalized.address
        .postalCode ??
      null,

    street:
      normalized.address
        .street ??
      null,

    streetNumber:
      normalized.address
        .streetNumber ??
      null,

    rooms:
      normalized.rooms ??
      null,

    livingArea:
      normalized.livingArea ??
      null,

    plotArea:
      normalized.plotArea ??
      null,

    offer:
      normalized.offer,

    imageCount:
      images.length,

    primaryImageCount:
      primaryImages.length,

    firstImage:
      images[0]
        ? {
            title:
              images[0].title ??
              null,

            position:
              images[0].position ??
              null,

            isPrimary:
              images[0].isPrimary ??
              false,

            hasAnalysis:
              Boolean(
                images[0].analysis
              ),
          }
        : null,

    floorPlanCount:
      floorPlans.length,

    hasDescription:
      Boolean(
        normalized.localization
          .description
      ),

    hasEquipment:
      Boolean(
        normalized.localization
          .equipment
      ),

    readyForPortalAdapter:
      Boolean(
        normalized.localization
          .title &&
        normalized.address
          .locality &&
        normalized.offer &&
        images.length > 0
      ),
  };


  return NextResponse.json(
    {
      success:
        true,

      mode:
        "read-only",

      publishing:
        false,

      summary,

      normalized,
    },
    {
      status:
        200,
    }
  );
}
