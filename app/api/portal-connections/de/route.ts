import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  getGermanPortalConnectionsForUser,
} from "@/lib/portal-integrations/portal-connection.server";

import {
  getGermanPortalListingReadinessForUser,
} from "@/lib/portal-integrations/german-portal-listings.server";

import {
  getImmoScout24DeAccessSnapshot,
} from "@/lib/portal-integrations/immoscout24-de-access.server";

import type {
  GermanPortalId,
} from "@/lib/portal-integrations/types";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const PORTALS: readonly GermanPortalId[] = [
  "immoscout24_de",
  "immowelt_de",
  "kleinanzeigen_de",
  "wg_gesucht_de",
  "immobilien_de",
];


const LABELS: Record<
  GermanPortalId,
  string
> = {
  immoscout24_de:
    "ImmoScout24",

  immowelt_de:
    "immowelt",

  kleinanzeigen_de:
    "Kleinanzeigen",

  wg_gesucht_de:
    "WG-Gesucht",

  immobilien_de:
    "Immobilien.de",
};


export async function GET(
  request: NextRequest
) {

  try {

    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }


    const [
      connections,
      readiness,
    ] =
      await Promise.all([
        getGermanPortalConnectionsForUser(
          user.id
        ),

        getGermanPortalListingReadinessForUser(
          user.id
        ),
      ]);


    const immoScout24DeAccess =
      getImmoScout24DeAccessSnapshot();


    const byPortal =
      new Map(
        connections.map(
          (connection) => [
            connection.portal,
            connection,
          ]
        )
      );


    const portals =
      PORTALS.map(
        (portal) => {

          const connection =
            byPortal.get(portal);

          const comingSoon =
            portal !==
              "immoscout24_de";

          return {
            portal,

            label:
              LABELS[portal],

            status:
              connection?.status ??
              "not_configured",

            databaseConfigured:
              connection?.databaseConfigured ??
              false,

            access:
              portal ===
              "immoscout24_de"
                ? immoScout24DeAccess
                : null,

            availability:
              comingSoon
                ? "coming_soon"
                : "available",

            /*
             * Noch kein deutscher
             * Portal-Transport aktiv.
             */
            feedReady:
              false,

            candidateCount:
              comingSoon
                ? 0
                : readiness.candidateCount,

            listingCount:
              comingSoon
                ? 0
                : readiness.listingCount,

            waitingForUnlockCount:
              comingSoon
                ? 0
                : readiness.waitingForUnlockCount,

            validationErrorCount:
              0,
          };
        }
      );


    return NextResponse.json({
      success: true,

      market:
        "DE",

      publishEnabled:
        false,

      readiness,

      portals,
    });
  }
  catch (error) {

    console.error(
      "German portal connections API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "PORTAL_CONNECTIONS_DE_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}