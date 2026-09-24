import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  getPortalConnectionsForUser,
} from "@/lib/portal-integrations/portal-connection.server";

import {
  buildSmgPublishPlanForUser,
} from "@/lib/portal-integrations/smg-publish-plan.server";

import type {
  SmgPortalId,
} from "@/lib/portal-integrations/types";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


function isSmgPortal(
  value: string | null
): value is SmgPortalId {

  return (
    value === "immoscout24_ch" ||
    value === "homegate_ch"
  );
}


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


    const portal =
      request.nextUrl
        .searchParams
        .get("portal");


    if (!isSmgPortal(portal)) {

      return NextResponse.json(
        {
          success: false,
          error:
            "INVALID_PORTAL",

          allowedPortals: [
            "immoscout24_ch",
            "homegate_ch",
          ],
        },
        {
          status: 400,
        }
      );
    }


    const connections =
      await getPortalConnectionsForUser(
        user.id
      );


    const connection =
      connections.find(
        (item) =>
          item.portal === portal
      );


    if (!connection) {

      return NextResponse.json(
        {
          success: false,
          error:
            "PORTAL_CONNECTION_NOT_FOUND",

          portal,
        },
        {
          status: 404,
        }
      );
    }


    const environment =
      connection.environment ===
      "production"
        ? "production"
        : "test";


    const plan =
      await buildSmgPublishPlanForUser({
        userId:
          user.id,

        portal,

        connectionStatus:
          connection.status,

        environment,
      });


    /*
     * WICHTIG:
     *
     * plan.payload wird absichtlich
     * NICHT an den Browser zurückgegeben.
     *
     * Dieser Endpoint ist nur für
     * Readiness / Safety / Diagnose.
     */
    return NextResponse.json({
      success: true,

      portal:
        plan.portal,

      connection: {
        status:
          connection.status,

        environment,

        databaseConfigured:
          connection
            .databaseConfigured,
      },

      publishAccess: {
        state:
          plan.accessState,

        transport:
          plan.transport,
      },

      payload: {
        prepared:
          plan.payloadPrepared,

        format:
          plan.payloadFormat,

        listingCount:
          plan.listingCount,

        validationErrorCount:
          plan.validationErrorCount,
      },

      safety: {
        mode:
          plan.safety.mode,

        canPrepare:
          plan.safety.canPrepare,

        canRunTransportTest:
          plan.safety
            .canRunTransportTest,

        canPublishProduction:
          plan.safety
            .canPublishProduction,

        reasons:
          plan.reasons,
      },

      publishEnabled:
        false,
    });

  }
  catch (error) {

    console.error(
      "[smg-plan] read-only plan failed",
      error
    );


    return NextResponse.json(
      {
        success: false,
        error:
          "SMG_PLAN_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}