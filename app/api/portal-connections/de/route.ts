import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  configureGermanLaunchPortalConnection,
  getGermanPortalConnectionsForUser,
} from "@/lib/portal-integrations/portal-connection.server";

import {
  getGermanPortalListingReadinessForUser,
} from "@/lib/portal-integrations/german-portal-listings.server";

import {
  getImmoScout24DeAccessSnapshot,
} from "@/lib/portal-integrations/immoscout24-de-access.server";

import {
  getImmoweltDeAccessSnapshot,
} from "@/lib/portal-integrations/immowelt-de-access.server";

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


function isSameOriginMutation(
  request: NextRequest
): boolean {

  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return false;
  }

  try {

    const requestOrigin =
      new URL(
        origin
      ).origin;

    return (
      requestOrigin ===
      request.nextUrl.origin
    );
  }
  catch {
    return false;
  }
}


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

    const immoweltDeAccess =
      getImmoweltDeAccessSnapshot();


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
              "immoscout24_de" &&
            portal !==
              "immowelt_de";

          return {
            portal,

            label:
              LABELS[portal],

            status:
              connection?.status ??
              "not_configured",

            environment:
              connection?.environment ??
              null,

            databaseConfigured:
              connection?.databaseConfigured ??
              false,

            access:
              portal ===
              "immoscout24_de"
                ? immoScout24DeAccess
                : portal ===
                    "immowelt_de"
                  ? immoweltDeAccess
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

export async function PATCH(
  request: NextRequest
) {

  /*
   * Mutationen werden ausschliesslich
   * vom gleichen Origin akzeptiert.
   */
  if (
    !isSameOriginMutation(
      request
    )
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INVALID_REQUEST_ORIGIN",
      },
      {
        status:
          403,
      }
    );
  }


  try {

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
        },
        {
          status:
            401,
        }
      );
    }


    let rawBody:
      unknown;

    try {

      rawBody =
        await request.json();
    }
    catch {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_PORTAL_CONFIGURATION",
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !rawBody ||
      typeof rawBody !==
        "object" ||
      Array.isArray(
        rawBody
      )
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_PORTAL_CONFIGURATION",
        },
        {
          status:
            400,
        }
      );
    }


    const body =
      rawBody as
        Record<string, unknown>;


    const allowedKeys =
      new Set([
        "portal",
        "environment",
      ]);


    const hasUnexpectedKey =
      Object.keys(
        body
      ).some(
        (key) =>
          !allowedKeys.has(
            key
          )
      );


    const supportedPortal =
      body.portal ===
        "immoscout24_de" ||
      body.portal ===
        "immowelt_de";


    if (
      hasUnexpectedKey ||
      !supportedPortal ||
      body.environment !==
        "test"
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_PORTAL_CONFIGURATION",
        },
        {
          status:
            400,
        }
      );
    }


    const portal =
      body.portal as
        | "immoscout24_de"
        | "immowelt_de";


    const connection =
      await configureGermanLaunchPortalConnection({
        userId:
          user.id,

        portal,

        environment:
          "test",
      });


    return NextResponse.json({
      success:
        true,

      connection: {
        portal:
          connection.portal,

        provider:
          connection.provider,

        environment:
          connection.environment,

        status:
          connection.status,

        databaseConfigured:
          connection.databaseConfigured,

        lastVerifiedAt:
          connection.lastVerifiedAt,
      },

      /*
       * Dieser Setup-Pfad aktiviert
       * niemals Publishing.
       */
      publishEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "German portal configuration failed:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "PORTAL_CONFIGURATION_DE_FAILED",
      },
      {
        status:
          500,
      }
    );
  }
}