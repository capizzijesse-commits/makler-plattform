import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  prisma,
} from "@/lib/prisma";

import {
  mapPrismaListingToPortal,
} from "@/lib/portal-integrations/prisma-listing-adapter";

import {
  validateSwissRetsListings,
} from "@/lib/portal-integrations/swissrets-json.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


export async function GET(
  request: NextRequest
): Promise<NextResponse> {

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
            "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }


    const listingId =
      request.nextUrl
        .searchParams
        .get("listingId")
        ?.trim();


    if (!listingId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "LISTING_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }


    const listing =
      await prisma.listing.findFirst({
        where: {
          id:
            listingId,

          userId:
            user.id,
        },

        include: {
          finance:
            true,

          images: {
            orderBy: [
              {
                isPrimary:
                  "desc",
              },
              {
                position:
                  "asc",
              },
              {
                createdAt:
                  "asc",
              },
            ],
          },
        },
      });


    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "LISTING_NOT_FOUND",
        },
        {
          status: 404,
        }
      );
    }


    const isSwissCandidate =
      listing.countryCode ===
        "CH" ||
      (
        listing.countryCode ===
          null &&
        (
          listing.market ===
            "CH" ||
          listing.market ===
            null
        )
      );


    if (!isSwissCandidate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NOT_CH_LISTING",
        },
        {
          status: 400,
        }
      );
    }


    const normalized =
      mapPrismaListingToPortal(
        listing
      );


    const validationErrors =
      validateSwissRetsListings([
        normalized,
      ]);


    const feedEligible =
      listing.archivedAt ===
        null &&
      (
        listing.unlockStatus ===
          "paid" ||
        listing.unlockStatus ===
          "included"
      );


    return NextResponse.json({
      success: true,

      listing: {
        id:
          listing.id,

        projectName:
          listing.projectName,

        location:
          listing.location,

        postalCode:
          listing.postalCode,

        countryCode:
          listing.countryCode,

        market:
          listing.market,

        unlockStatus:
          listing.unlockStatus,

        archived:
          listing.archivedAt !==
          null,

        imageCount:
          listing.images.length,

        hasStreet:
          Boolean(
            listing.street?.trim()
          ),

        hasGeneratedVariants:
          Boolean(
            listing.generatedVariants
          ),
      },

      feedEligibility: {
        eligible:
          feedEligible,

        reason:
          feedEligible
            ? null
            : "Objekt ist noch nicht paid/included und bleibt deshalb ausserhalb des echten Portal-Feeds.",
      },

      swissRets: {
        valid:
          validationErrors.length ===
          0,

        validationErrorCount:
          validationErrors.length,

        validationErrors,
      },

      publishEnabled:
        false,
    });

  }
  catch (error) {

    console.error(
      "[smg-candidate] dry-run failed",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "CANDIDATE_DRY_RUN_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}