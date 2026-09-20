import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  isDevelopmentE2EListing,
} from "@/lib/development-e2e-access";

import {
  BROKER_MARKETING_APPROVAL_REQUIRED,
  isBrokerMarketingApproved,
} from "@/lib/broker-workflow/marketing-approval-guard.server";

import {
  isGermanPortalId,
  isPortalPublishQueueEnabled,
} from "@/lib/portal-integrations/portal-publish-job-factory.server";

import {
  dispatchPublicationRun,
  isPublicationOrchestratorDispatchEnabled,
  PublicationDispatchError,
} from "@/lib/publication-orchestrator/publication-dispatcher.server";

import {
  reconcilePublicationRun,
  PublicationReconcileError,
} from "@/lib/publication-orchestrator/publication-reconciler.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


type RequestedPortalTarget = {
  kind:
    "portal";

  portal:
    string;
};


type RequestedSocialTarget = {
  kind:
    "social";

  connectionId:
    string;
};


type RequestedTarget =
  | RequestedPortalTarget
  | RequestedSocialTarget;


type ResolvedTarget = {
  targetKey:
    string;

  kind:
    "portal" |
    "social";

  provider:
    string |
    null;

  destination:
    string;

  connectionId:
    string |
    null;

  externalAccountId:
    string |
    null;

  environment:
    string |
    null;

  status:
    "pending";
};


function noStore(
  response:
    NextResponse
) {

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}


function sameOrigin(
  request:
    NextRequest
) {

  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return false;
  }

  try {

    return (
      new URL(
        origin
      ).origin ===
      request.nextUrl.origin
    );
  }
  catch {

    return false;
  }
}


function isRecord(
  value:
    unknown
):
  value is Record<
    string,
    unknown
  > {

  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


function cleanText(
  value:
    unknown
) {

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}


function summarizeTargets(
  targets:
    Array<{
      status:
        string;
    }>
) {

  const count =
    (
      status:
        string
    ) =>
      targets.filter(
        (target) =>
          target.status ===
          status
      ).length;


  return {
    total:
      targets.length,

    pending:
      count(
        "pending"
      ),

    publishing:
      count(
        "publishing"
      ),

    published:
      count(
        "published"
      ),

    failed:
      count(
        "failed"
      ),

    actionRequired:
      count(
        "action_required"
      ),

    skipped:
      count(
        "skipped"
      ),
  };
}


async function ownedListing(
  request:
    NextRequest,
  listingId:
    string
) {

  const user =
    await getAuthenticatedUser(
      request
    );

  if (!user) {

    return {
      user:
        null,

      listing:
        null,
    };
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
      },

      select: {
        id:
          true,

        projectName:
          true,

        countryCode:
          true,
      },
    });


  return {
    user,
    listing,
  };
}


/*
 * PUBLICATION ORCHESTRATOR FOUNDATION V1
 *
 * GET:
 * Letzten persistenten Run inkl. Zielstatus laden.
 *
 * Noch KEIN Worker.
 * Noch KEIN Provider-Aufruf.
 */
export async function GET(
  request:
    NextRequest,
  context: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {

  try {

    const {
      id,
    } =
      await context.params;


    const {
      user,
      listing,
    } =
      await ownedListing(
        request,
        id
      );


    if (!user) {

      return noStore(
        NextResponse.json(
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
        )
      );
    }


    if (!listing) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "LISTING_NOT_FOUND",
          },
          {
            status:
              404,
          }
        )
      );
    }


    const run =
      await prisma.publicationRun.findFirst({
        where: {
          userId:
            user.id,

          listingId:
            listing.id,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        include: {
          targets: {
            orderBy: {
              createdAt:
                "asc",
            },
          },
        },
      });


    return noStore(
      NextResponse.json({
        success:
          true,

        run,

        capabilities: {
          planEligible:
            getPlanCapabilities(
              user.plan
            )
              .canUsePublishingCenter,

          orchestratorDispatchEnabled:
            isPublicationOrchestratorDispatchEnabled(),

          portalQueueEnabled:
            isPortalPublishQueueEnabled(),

          canDispatchPortals:
            getPlanCapabilities(
              user.plan
            )
              .canUsePublishingCenter &&
            isPublicationOrchestratorDispatchEnabled() &&
            isPortalPublishQueueEnabled(),

          /*
           * Social wird absichtlich erst
           * freigeschaltet, wenn der
           * Content-Snapshot/Dispatcher
           * vollständig abgesichert ist.
           */
          socialAutomaticDispatch:
            false,
        },

        summary:
          run
            ? summarizeTargets(
                run.targets
              )
            : {
                total:
                  0,

                pending:
                  0,

                publishing:
                  0,

                published:
                  0,

                failed:
                  0,

                actionRequired:
                  0,

                skipped:
                  0,
              },
      })
    );
  }
  catch (
    error
  ) {

    console.error(
      "[publication-run] GET failed",
      error
    );


    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "PUBLICATION_RUN_READ_FAILED",
        },
        {
          status:
            500,
        }
      )
    );
  }
}


/*
 * POST action=prepare
 *
 * Speichert AUSSCHLIESSLICH die vom Makler
 * ausgewaehlten Ziele als persistenten Run.
 *
 * WICHTIG:
 * - erzeugt KEINE Publish-Jobs
 * - startet KEINEN Worker
 * - ruft KEIN Portal auf
 * - ruft KEIN Social Network auf
 */
export async function POST(
  request:
    NextRequest,
  context: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {

  if (
    !sameOrigin(
      request
    )
  ) {

    return noStore(
      NextResponse.json(
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
      )
    );
  }


  try {

    const {
      id,
    } =
      await context.params;


    const {
      user,
      listing,
    } =
      await ownedListing(
        request,
        id
      );


    if (!user) {

      return noStore(
        NextResponse.json(
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
        )
      );
    }


    if (!listing) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "LISTING_NOT_FOUND",
          },
          {
            status:
              404,
          }
        )
      );
    }


    const capabilities =
      getPlanCapabilities(
        user.plan
      );


    const hasPublishingCenterAccess =
      capabilities
        .canUsePublishingCenter ||
      isDevelopmentE2EListing(
        listing.projectName
      );


    if (
      !hasPublishingCenterAccess
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "PRO_REQUIRED",
          },
          {
            status:
              403,
          }
        )
      );
    }


    const rawBody:
      unknown =
      await request.json();


    if (
      !isRecord(
        rawBody
      )
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_BODY",
          },
          {
            status:
              400,
          }
        )
      );
    }


    const action =
      cleanText(
        rawBody.action
      );


    if (
      action ===
      "reconcile"
    ) {

      const runId =
        cleanText(
          rawBody.runId
        );


      if (!runId) {

        return noStore(
          NextResponse.json(
            {
              success:
                false,

              error:
                "PUBLICATION_RUN_ID_REQUIRED",
            },
            {
              status:
                400,
            }
          )
        );
      }


      const result =
        await reconcilePublicationRun({
          userId:
            user.id,

          listingId:
            listing.id,

          runId,
        });


      return noStore(
        NextResponse.json({
          success:
            true,

          reconciled:
            true,

          ...result,
        })
      );
    }


    /*
     * prepare + dispatch duerfen weiterhin
     * nur nach ausdruecklicher Maklerfreigabe
     * ausgefuehrt werden.
     */
    const marketingApproved =
      await isBrokerMarketingApproved({
        userId:
          user.id,

        listingId:
          listing.id,
      });


    if (!marketingApproved) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              BROKER_MARKETING_APPROVAL_REQUIRED,
          },
          {
            status:
              409,
          }
        )
      );
    }


    /*
     * SAFE_PORTAL_STAGING_V1
     *
     * Dieser Schritt persistiert lediglich
     * idempotente Portal-Draft-Jobs.
     *
     * KEINE Queue.
     * KEIN Worker.
     * KEIN Provider-Netzwerk.
     */
    if (
      action ===
      "stage"
    ) {

      const runId =
        cleanText(
          rawBody.runId
        );


      if (!runId) {

        return noStore(
          NextResponse.json(
            {
              success:
                false,

              error:
                "PUBLICATION_RUN_ID_REQUIRED",
            },
            {
              status:
                400,
            }
          )
        );
      }


      const result =
        await dispatchPublicationRun(
          {
            userId:
              user.id,

            listingId:
              listing.id,

            runId,
          },
          {
            stageOnly:
              true,
          }
        );


      return noStore(
        NextResponse.json(
          {
            success:
              true,

            staged:
              true,

            dispatched:
              false,

            ...result,
          },
          {
            status:
              201,
          }
        )
      );
    }


    if (
      action ===
      "dispatch"
    ) {

      const runId =
        cleanText(
          rawBody.runId
        );


      if (!runId) {

        return noStore(
          NextResponse.json(
            {
              success:
                false,

              error:
                "PUBLICATION_RUN_ID_REQUIRED",
            },
            {
              status:
                400,
            }
          )
        );
      }


      const result =
        await dispatchPublicationRun({
          userId:
            user.id,

          listingId:
            listing.id,

          runId,
        });


      return noStore(
        NextResponse.json(
          {
            success:
              true,

            dispatched:
              true,

            ...result,
          },
          {
            status:
              202,
          }
        )
      );
    }


    if (
      action !==
      "prepare"
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_ACTION",
          },
          {
            status:
              400,
          }
        )
      );
    }


    if (
      !Array.isArray(
        rawBody.targets
      ) ||
      rawBody.targets.length ===
        0 ||
      rawBody.targets.length >
        20
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "PUBLICATION_TARGETS_REQUIRED",
          },
          {
            status:
              400,
          }
        )
      );
    }


    const requested:
      RequestedTarget[] =
        [];


    for (
      const rawTarget of
      rawBody.targets
    ) {

      if (
        !isRecord(
          rawTarget
        )
      ) {

        return noStore(
          NextResponse.json(
            {
              success:
                false,

              error:
                "INVALID_PUBLICATION_TARGET",
            },
            {
              status:
                400,
            }
          )
        );
      }


      const kind =
        cleanText(
          rawTarget.kind
        );


      if (
        kind ===
        "portal"
      ) {

        const portal =
          cleanText(
            rawTarget.portal
          );


        if (
          !portal ||
          !isGermanPortalId(
            portal
          )
        ) {

          return noStore(
            NextResponse.json(
              {
                success:
                  false,

                error:
                  "INVALID_PORTAL_TARGET",
              },
              {
                status:
                  400,
              }
            )
          );
        }


        requested.push({
          kind:
            "portal",

          portal,
        });

        continue;
      }


      if (
        kind ===
        "social"
      ) {

        const connectionId =
          cleanText(
            rawTarget.connectionId
          );


        if (!connectionId) {

          return noStore(
            NextResponse.json(
              {
                success:
                  false,

                error:
                  "INVALID_SOCIAL_TARGET",
              },
              {
                status:
                  400,
              }
            )
          );
        }


        requested.push({
          kind:
            "social",

          connectionId,
        });

        continue;
      }


      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_PUBLICATION_TARGET_KIND",
          },
          {
            status:
              400,
          }
        )
      );
    }


    const portalIds =
      Array.from(
        new Set(
          requested
            .filter(
              (
                target
              ):
                target is RequestedPortalTarget =>
                  target.kind ===
                  "portal"
            )
            .map(
              (target) =>
                target.portal
            )
        )
      );


    const socialConnectionIds =
      Array.from(
        new Set(
          requested
            .filter(
              (
                target
              ):
                target is RequestedSocialTarget =>
                  target.kind ===
                  "social"
            )
            .map(
              (target) =>
                target.connectionId
            )
        )
      );


    if (
      portalIds.length > 0 &&
      listing.countryCode !==
        "DE"
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "PORTAL_TARGET_MARKET_NOT_SUPPORTED",

            message:
              "Die aktuelle Portal-Publish-Foundation unterstuetzt in diesem Orchestrator-Schritt nur Deutschland.",
          },
          {
            status:
              409,
          }
        )
      );
    }


    const [
      portalConnections,
      socialConnections,
    ] =
      await Promise.all([
        portalIds.length > 0
          ? prisma.portalConnection.findMany({
              where: {
                userId:
                  user.id,

                portal: {
                  in:
                    portalIds,
                },
              },

              select: {
                id:
                  true,

                portal:
                  true,

                provider:
                  true,

                environment:
                  true,

                status:
                  true,
              },
            })
          : [],

        socialConnectionIds.length > 0
          ? prisma.socialConnection.findMany({
              where: {
                id: {
                  in:
                    socialConnectionIds,
                },

                userId:
                  user.id,
              },

              select: {
                id:
                  true,

                provider:
                  true,

                channel:
                  true,

                environment:
                  true,

                externalAccountId:
                  true,

                status:
                  true,
              },
            })
          : [],
      ]);


    const portalById =
      new Map(
        portalConnections.map(
          (connection) => [
            connection.portal,
            connection,
          ]
        )
      );


    const socialById =
      new Map(
        socialConnections.map(
          (connection) => [
            connection.id,
            connection,
          ]
        )
      );


    const resolved:
      ResolvedTarget[] =
        [];


    for (
      const target of
      requested
    ) {

      if (
        target.kind ===
        "portal"
      ) {

        const connection =
          portalById.get(
            target.portal
          );


        if (!connection) {

          return noStore(
            NextResponse.json(
              {
                success:
                  false,

                error:
                  "PORTAL_CONNECTION_NOT_FOUND",

                target:
                  target.portal,
              },
              {
                status:
                  409,
              }
            )
          );
        }


        const developmentE2EPortalPrepare =
          isDevelopmentE2EListing(
            listing.projectName
          ) &&
          target.portal ===
            "immoscout24_de" &&
          connection.environment ===
            "test" &&
          connection.status ===
            "configured";


        if (
          !developmentE2EPortalPrepare &&
          (
            connection.status !==
              "verified" ||
            connection.environment !==
              "test"
          )
        ) {

          return noStore(
            NextResponse.json(
              {
                success:
                  false,

                error:
                  "PORTAL_CONNECTION_NOT_READY",

                target:
                  target.portal,
              },
              {
                status:
                  409,
              }
            )
          );
        }


        resolved.push({
          targetKey:
            "portal:" +
            connection.portal,

          kind:
            "portal",

          provider:
            connection.provider,

          destination:
            connection.portal,

          connectionId:
            connection.id,

          externalAccountId:
            null,

          environment:
            connection.environment,

          status:
            "pending",
        });

        continue;
      }


      const connection =
        socialById.get(
          target.connectionId
        );


      if (!connection) {

        return noStore(
          NextResponse.json(
            {
              success:
                false,

              error:
                "SOCIAL_CONNECTION_NOT_FOUND",

              target:
                target.connectionId,
            },
            {
              status:
                409,
            }
          )
        );
      }


      if (
        connection.status !==
        "verified"
      ) {

        return noStore(
          NextResponse.json(
            {
              success:
                false,

              error:
                "SOCIAL_CONNECTION_NOT_READY",

              target:
                target.connectionId,
            },
            {
              status:
                409,
            }
          )
        );
      }


      resolved.push({
        targetKey:
          "social:" +
          connection.id,

        kind:
          "social",

        provider:
          connection.provider,

        destination:
          connection.channel,

        connectionId:
          connection.id,

        externalAccountId:
          connection.externalAccountId,

        environment:
          connection.environment,

        status:
          "pending",
      });
    }


    const unique =
      new Map<
        string,
        ResolvedTarget
      >();


    for (
      const target of
      resolved
    ) {

      unique.set(
        target.targetKey,
        target
      );
    }


    const targets =
      Array.from(
        unique.values()
      );


    if (
      targets.length ===
      0
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "PUBLICATION_TARGETS_REQUIRED",
          },
          {
            status:
              400,
          }
        )
      );
    }


    const run =
      await prisma.publicationRun.create({
        data: {
          userId:
            user.id,

          listingId:
            listing.id,

          status:
            "ready",

          targets: {
            create:
              targets,
          },
        },

        include: {
          targets: {
            orderBy: {
              createdAt:
                "asc",
            },
          },
        },
      });


    return noStore(
      NextResponse.json(
        {
          success:
            true,

          run,

          summary:
            summarizeTargets(
              run.targets
            ),

          dispatched:
            false,

          externalCalls:
            0,
        },
        {
          status:
            201,
        }
      )
    );
  }
  catch (
    error
  ) {

    if (
      error instanceof
        PublicationDispatchError ||
      error instanceof
        PublicationReconcileError
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              error.code,

            message:
              error.message,
          },
          {
            status:
              error.httpStatus,
          }
        )
      );
    }


    console.error(
      "[publication-run] POST failed",
      error
    );


    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "PUBLICATION_RUN_ACTION_FAILED",
        },
        {
          status:
            500,
        }
      )
    );
  }
}
