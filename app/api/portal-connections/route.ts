import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getPortalConnectionsForUser,
} from "@/lib/portal-integrations/portal-connection.server";

import {
  buildSwissRetsFeedForUser,
} from "@/lib/portal-integrations/swissrets-feed.server";

import type {
  SwissPortalId,
} from "@/lib/portal-integrations/types";

import {
  getAuthenticatedUser,
} from "@/lib/session";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const PORTAL_LABELS:
  Record<
    SwissPortalId,
    string
  > = {

  immoscout24_ch:
    "ImmoScout24",

  homegate_ch:
    "Homegate",

  newhome_ch:
    "newhome",
};


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


    const [
      connections,
      feed,
    ] =
      await Promise.all([
        getPortalConnectionsForUser(
          user.id
        ),

        buildSwissRetsFeedForUser(
          user.id
        ),
      ]);


    const feedReady =
      feed.valid &&
      feed.listingCount > 0;


    const portals =
      connections.map(
        (connection) => {

          const comingSoon =
            connection.portal ===
            "newhome_ch";


          return {
            portal:
              connection.portal,

            label:
              PORTAL_LABELS[
                connection.portal
              ],

            status:
              connection.status,

            databaseConfigured:
              connection.databaseConfigured,

            availability:
              comingSoon
                ? "coming_soon"
                : "available",

            /*
             * SwissRETS-Core ist aktuell
             * für ImmoScout24/Homegate
             * vorbereitet.
             *
             * newhome folgt später mit
             * eigenem Adapter/Transport.
             */
            feedReady:
              comingSoon
                ? false
                : feedReady,

            listingCount:
              comingSoon
                ? 0
                : feed.listingCount,

            validationErrorCount:
              comingSoon
                ? 0
                : feed.validationErrors.length,
          };
        }
      );


    return NextResponse.json({
      success: true,

      publishEnabled:
        false,

      feed: {
        valid:
          feed.valid,

        listingCount:
          feed.listingCount,

        validationErrorCount:
          feed.validationErrors.length,
      },

      portals,
    });
  }
  catch (error) {

    console.error(
      "Portal connections API failed:",
      error
    );


    return NextResponse.json(
      {
        success: false,

        error:
          "PORTAL_CONNECTIONS_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}
