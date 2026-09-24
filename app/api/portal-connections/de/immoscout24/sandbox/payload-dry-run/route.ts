import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  mapPrismaListingToPortal,
} from "@/lib/portal-integrations/prisma-listing-adapter";

import {
  buildImmoScout24DeApartmentBuyDryRun,
} from "@/lib/portal-integrations/immoscout24-de-payload.server";

import {
  getImmoScout24DeOAuthConfig,
} from "@/lib/portal-integrations/immoscout24-de-oauth.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


export async function GET(
  request: NextRequest
) {

  const user =
    await getAuthenticatedUser(
      request
    );


  if (!user) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "UNAUTHORIZED",

        publishEnabled:
          false,
      },
      {
        status:
          401,
      }
    );
  }


  try {

    const config =
      getImmoScout24DeOAuthConfig();


    if (
      config.environment !==
      "sandbox"
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_ONLY",

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    const listingId =
      request.nextUrl
        .searchParams
        .get(
          "listingId"
        )
        ?.trim() ??
      "";


    if (!listingId) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "LISTING_ID_REQUIRED",

          publishEnabled:
            false,
        },
        {
          status:
            400,
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

          archivedAt:
            null,

          countryCode:
            "DE",
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
          success:
            false,

          error:
            "ELIGIBLE_DE_LISTING_NOT_FOUND",

          publishEnabled:
            false,
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


    /*
     * Ausschliesslich fuer einen expliziten
     * Sandbox-Dry-Run.
     *
     * Keine DB-Aenderung.
     * Keine Verwendung im spaeteren
     * Production-Transport.
     *
     * Testadresse gemaess ImmoScout24
     * Sandbox-Testdaten-Richtlinie.
     */
    const useSandboxTestAddress =
      request.nextUrl
        .searchParams
        .get(
          "useSandboxTestAddress"
        ) ===
      "1";


    const normalizedForDryRun =
      useSandboxTestAddress
        ? {
            ...normalized,

            address: {
              ...normalized.address,

              street:
                "Invalidenstrasse",

              streetNumber:
                "65",

              postalCode:
                "10557",

              locality:
                "Berlin",

              countryCode:
                "DE",
            },
          }
        : normalized;


    const dryRun =
      buildImmoScout24DeApartmentBuyDryRun({
        listing:
          normalizedForDryRun,

        commissionRate:
          listing.finance
            ?.commissionRate ??
          null,
      });


    return NextResponse.json({
      success:
        true,

      environment:
        "sandbox",

      listingId:
        listing.id,

      unlockStatus:
        listing.unlockStatus,

      transferEligible:
        listing.unlockStatus === "paid" ||
        listing.unlockStatus === "included",

      mappingOnly:
        true,

      sandboxTestAddressApplied:
        useSandboxTestAddress,

      dryRun,

      networkRequestMade:
        false,

      objectCreated:
        false,

      productionEnabled:
        false,

      publishEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "[immoscout24-de] payload dry-run failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOSCOUT24_PAYLOAD_DRY_RUN_FAILED",

        productionEnabled:
          false,

        publishEnabled:
          false,
      },
      {
        status:
          500,
      }
    );
  }
}