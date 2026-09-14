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

import {
  evaluateChPortalLaunchReadiness,
  isChLaunchPortal,
} from "@/lib/portal-integrations/ch-portal-launch-readiness.server";

import {
  getSmgPublishAccessSnapshot,
} from "@/lib/portal-integrations/smg-publish-access.server";

import {
  getComparisPublishAccessSnapshot,
} from "@/lib/portal-integrations/comparis-publish-access.server";

import type {
  SwissPortalId,
} from "@/lib/portal-integrations/types";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  prisma,
} from "@/lib/prisma";


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

  comparis_ch:
    "Comparis",

  flatfox_ch:
    "Flatfox",

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
      candidateListingCount,
    ] =
      await Promise.all([
        getPortalConnectionsForUser(
          user.id
        ),

        buildSwissRetsFeedForUser(
          user.id
        ),
        prisma.listing.count({
          where: {
            userId:
              user.id,

            archivedAt:
              null,

            OR: [
              {
                countryCode:
                  "CH",
              },
              {
                countryCode:
                  null,
                market:
                  "CH",
              },
              {
                countryCode:
                  null,
                market:
                  null,
              },
            ],
          },
        }),
      ]);


    const feedReady =
      feed.valid &&
      feed.listingCount > 0;


    const smgPublishAccess =
      getSmgPublishAccessSnapshot();


    const comparisPublishAccess =
      getComparisPublishAccessSnapshot();


    const portals =
      connections.map(
        (connection) => {

          const comingSoon =
            connection.portal ===
              "comparis_ch" ||
            connection.portal ===
              "flatfox_ch" ||
            connection.portal ===
              "newhome_ch";


          const isSmgLaunchPortal =
            connection.portal ===
              "immoscout24_ch" ||
            connection.portal ===
              "homegate_ch";


          const isComparisLaunchPortal =
            connection.portal ===
              "comparis_ch";


          const launchSafety =
            isChLaunchPortal(
              connection.portal
            )
              ? evaluateChPortalLaunchReadiness({
                  portal:
                    connection.portal,

                  connectionStatus:
                    connection.status,

                  environment:
                    connection.environment ===
                    "production"
                      ? "production"
                      : "test",

                  transportConfigured:
                    isSmgLaunchPortal
                      ? (
                          smgPublishAccess
                            .accessConfirmed &&
                          smgPublishAccess
                            .transport !==
                          null
                        )
                      : isComparisLaunchPortal
                        ? (
                            comparisPublishAccess
                              .accessConfirmed &&
                            comparisPublishAccess
                              .transport !==
                            null
                          )
                        : false,

                  /*
                   * Solange kein aktueller
                   * Portal-Test erfolgreich
                   * abgeschlossen wurde,
                   * bleibt der Adapter bewusst
                   * unverifiziert.
                   */
                  adapterVerified:
                    isSmgLaunchPortal
                      ? smgPublishAccess
                          .adapterVerified
                      : isComparisLaunchPortal
                        ? comparisPublishAccess
                            .adapterVerified
                        : false,

                  /*
                   * ImmoScout24/Homegate:
                   * bestehender SwissRETS-Core.
                   *
                   * Comparis bekommt erst dann
                   * feedValid=true, wenn sein
                   * eigener aktueller Adapter
                   * implementiert ist.
                   */
                  feedValid:
                    connection.portal ===
                    "comparis_ch"
                      ? false
                      : feed.valid,

                  validationErrorCount:
                    connection.portal ===
                    "comparis_ch"
                      ? 0
                      : feed
                          .validationErrors
                          .length,

                  /*
                   * Harte Produktionssperre.
                   */
                  explicitPublishEnabled:
                    isSmgLaunchPortal
                      ? smgPublishAccess
                          .productionEnabled
                      : isComparisLaunchPortal
                        ? comparisPublishAccess
                            .productionEnabled
                        : false,
                })
              : null;


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

            candidateCount:
              comingSoon
                ? 0
                : candidateListingCount,

            waitingForUnlockCount:
              comingSoon
                ? 0
                : Math.max(
                    0,
                    candidateListingCount -
                      feed.listingCount
                  ),

            validationErrorCount:
              comingSoon
                ? 0
                : feed.validationErrors.length,

            safetyMode:
              launchSafety?.mode ??
              null,

            canPrepare:
              launchSafety?.
                canPrepare ??
              false,

            canRunTransportTest:
              launchSafety?.
                canRunTransportTest ??
              false,

            canPublishProduction:
              launchSafety?.
                canPublishProduction ??
              false,

            safetyReasons:
              launchSafety?.
                reasons ??
              [],

            launchProvider:
              launchSafety?.
                provider ??
              null,

            launchGroup:
              launchSafety?.
                launchGroup ??
              null,

            publishAccessState:
              isSmgLaunchPortal
                ? smgPublishAccess.state
                : isComparisLaunchPortal
                  ? comparisPublishAccess.state
                  : null,

            publishTransport:
              isSmgLaunchPortal
                ? smgPublishAccess.transport
                : isComparisLaunchPortal
                  ? comparisPublishAccess.transport
                  : null,

            publishAccessReason:
              isSmgLaunchPortal
                ? smgPublishAccess.reason
                : isComparisLaunchPortal
                  ? comparisPublishAccess.reason
                  : null,
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
