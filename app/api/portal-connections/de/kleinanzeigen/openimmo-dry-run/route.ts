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
  buildKleinanzeigenDeOpenImmoCandidate,
} from "@/lib/portal-integrations/kleinanzeigen-de-openimmo-candidate.server";

import {
  buildKleinanzeigenDeOpenImmoXmlV1,
} from "@/lib/portal-integrations/kleinanzeigen-de-openimmo-xml.server";


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
      buildKleinanzeigenDeOpenImmoCandidate(
        normalized
      );


    /*
     * Read-only Portal-Metadaten.
     *
     * Für kleinanzeigen_de wird
     * externalOwnerId ausschließlich
     * als explizit konfigurierte
     * OpenImmo Anbieter-ID verwendet.
     *
     * Wir generieren niemals selbst
     * eine openimmo_anid.
     */
    const kleinanzeigenConnection =
      await prisma.portalConnection.findUnique({
        where: {
          userId_portal: {
            userId:
              user.id,

            portal:
              "kleinanzeigen_de",
          },
        },
      });


    const openImmoXml =
      buildKleinanzeigenDeOpenImmoXmlV1({
        candidate,

        updatedAt:
          listing.updatedAt,

        provider: {
          company:
            listing.user.company,

          openImmoAnid:
            kleinanzeigenConnection
              ?.externalOwnerId ??
            null,

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
        "kleinanzeigen_de",

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
       * Kleinanzeigen Partnerprofil.
       */
      localXmlGenerationOnly:
        true,

      openImmoAnidConfigured:
        Boolean(
          kleinanzeigenConnection
            ?.externalOwnerId
            ?.trim()
        ),

      openImmoAnidSource:
        kleinanzeigenConnection
          ?.externalOwnerId
          ?.trim()
          ? "portal_connection_external_owner_id"
          : "missing",

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
      "[kleinanzeigen-de] OpenImmo dry-run failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "KLEINANZEIGEN_OPENIMMO_DRY_RUN_FAILED",

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