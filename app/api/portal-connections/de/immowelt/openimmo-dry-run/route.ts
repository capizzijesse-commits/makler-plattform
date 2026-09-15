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
  buildImmoweltDeOpenImmoCandidate,
} from "@/lib/portal-integrations/immowelt-de-openimmo-candidate.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


export async function GET(
  request:
    NextRequest
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

        mappingOnly:
          true,

        databaseModified:
          false,

        networkRequestMade:
          false,

        uploadAttempted:
          false,

        publishRequestSent:
          false,

        productionEnabled:
          false,
      },
      {
        status:
          401,
      }
    );
  }


  try {

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

          mappingOnly:
            true,

          databaseModified:
            false,

          networkRequestMade:
            false,

          uploadAttempted:
            false,

          publishRequestSent:
            false,

          productionEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * Read-only:
     *
     * Nur ein eigenes,
     * nicht archiviertes DE-Objekt
     * darf ausgewertet werden.
     */
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

          listingId,

          mappingOnly:
            true,

          databaseModified:
            false,

          networkRequestMade:
            false,

          uploadAttempted:
            false,

          publishRequestSent:
            false,

          productionEnabled:
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


    const candidate =
      buildImmoweltDeOpenImmoCandidate(
        normalized
      );


    const transferEligible =
      listing.unlockStatus ===
        "paid" ||
      listing.unlockStatus ===
        "included";


    return NextResponse.json({
      success:
        true,

      portal:
        "immowelt_de",

      listingId:
        listing.id,

      unlockStatus:
        listing.unlockStatus,

      transferEligible,

      mappingOnly:
        true,

      candidateReady:
        candidate.ready,

      candidate,

      /*
       * Diese Flags bleiben bewusst
       * hart AUS.
       *
       * Die Route erzeugt keinen
       * immowelt Request.
       */
      immoweltProfileVerified:
        false,

      schemaValidated:
        false,

      transportConfigured:
        false,

      databaseReadOnly:
        true,

      databaseModified:
        false,

      networkRequestMade:
        false,

      ftpRequestMade:
        false,

      sftpRequestMade:
        false,

      uploadAttempted:
        false,

      publishRequestSent:
        false,

      productionEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "[immowelt-de] OpenImmo dry-run failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOWELT_OPENIMMO_DRY_RUN_FAILED",

        mappingOnly:
          true,

        databaseModified:
          false,

        networkRequestMade:
          false,

        uploadAttempted:
          false,

        publishRequestSent:
          false,

        productionEnabled:
          false,
      },
      {
        status:
          500,
      }
    );
  }
}