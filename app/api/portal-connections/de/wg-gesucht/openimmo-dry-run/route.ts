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
  buildWgGesuchtDeOpenImmoCandidate,
} from "@/lib/portal-integrations/wg-gesucht-de-openimmo-candidate.server";

import {
  buildWgGesuchtDeOpenImmoXmlV1,
} from "@/lib/portal-integrations/wg-gesucht-de-openimmo-xml.server";


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
          user: {
            select: {
              name:
                true,

              email:
                true,

              company:
                true,

              phone:
                true,
            },
          },

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
      buildWgGesuchtDeOpenImmoCandidate(
        normalized
      );
    /*
     * WG-Gesucht API-/Provider-Profil
     * ist noch nicht bestätigt.
     *
     * Deshalb wird hier bewusst keine
     * externalOwnerId gelesen oder
     * als openimmo_anid verwendet.
     *
     * Fail-closed bis zur echten
     * Portalbestätigung.
     */

const openImmoXml =
      buildWgGesuchtDeOpenImmoXmlV1({
        candidate,

        updatedAt:
          listing.updatedAt,

        provider: {
          company:
            listing.user.company,
contactName:
            listing.user.name,

          contactEmail:
            listing.user.email,

          contactPhone:
            listing.user.phone,
        },
      });


    const transferEligible =
      listing.unlockStatus ===
        "paid" ||
      listing.unlockStatus ===
        "included";


    return NextResponse.json({
      success:
        true,

      portal:
        "wg_gesucht_de",

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
       * Rein lokale OpenImmo-
       * Generierung.
       *
       * Kein Transport und keine
       * Aussage über ein bestätigtes
       * WG-Gesucht API-/Partnerprofil.
       */
      localXmlGenerationOnly:
        true,

      apiProfileVerified:
        openImmoXml.apiProfileVerified,

      authProfileVerified:
        openImmoXml.authProfileVerified,

      providerIdProfileVerified:
        openImmoXml.providerIdProfileVerified,

      portalBlocker:
        openImmoXml.portalBlocker,

      xmlBuildReady:
        openImmoXml.ready,

      xmlGenerated:
        openImmoXml.xml !==
        null,

      xmlStandard:
        openImmoXml.standard,

      xmlVersion:
        openImmoXml.xmlVersion,

      xmlStandardRelease:
        openImmoXml.standardRelease,

      xmlErrors:
        openImmoXml.errors,

      xml:
        openImmoXml.xml,

      /*
       * Diese Flags bleiben bewusst
       * hart AUS.
       *
       * Die Route erzeugt keinen
       * Kein externer Portal-Request.
       */
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
      "[wg-gesucht-de] OpenImmo dry-run failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "WG_GESUCHT_DE_OPENIMMO_DRY_RUN_FAILED",

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