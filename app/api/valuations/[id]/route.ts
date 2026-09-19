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

export const runtime =
  "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* VALUATION DETACH LISTING V1 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
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
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const valuationId =
      id.trim();

    if (!valuationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Bewertung.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      (await request.json()) as {
        action?: string;
      };

    if (
      body.action !==
        "detach_listing"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Bewertungsaktion.",
        },
        {
          status: 400,
        }
      );
    }

    const valuation =
      await prisma
        .valuation
        .findFirst({
          where: {
            id:
              valuationId,

            userId:
              user.id,
          },

          select: {
            id: true,
            listingId: true,
          },
        });

    if (!valuation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bewertung nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }

    if (!valuation.listingId) {
      return NextResponse.json({
        success: true,
        detached: false,
        alreadyDetached: true,
        previousListingId: null,
        workflowReset: false,
      });
    }

    const previousListingId =
      valuation.listingId;

    const result =
      await prisma.$transaction(
        async (tx) => {
          const listing =
            await tx.listing.findFirst({
              where: {
                id:
                  previousListingId,

                userId:
                  user.id,
              },

              select: {
                id: true,
              },
            });

          const workflow =
            listing
              ? await tx
                  .brokerWorkflow
                  .findUnique({
                    where: {
                      listingId:
                        previousListingId,
                    },

                    select: {
                      valuationId:
                        true,
                    },
                  })
              : null;

          await tx.valuation.update({
            where: {
              id:
                valuation.id,
            },

            data: {
              listingId:
                null,
            },
          });

          let workflowReset =
            false;

          if (
            workflow?.valuationId ===
              valuation.id
          ) {
            await tx
              .brokerWorkflow
              .update({
                where: {
                  listingId:
                    previousListingId,
                },

                data: {
                  currentStage:
                    "valuation",

                  valuationId:
                    null,

                  valuationCompletedAt:
                    null,

                  mandateConfirmedAt:
                    null,

                  packagePreparedAt:
                    null,

                  marketingApprovedAt:
                    null,

                  publicationStartedAt:
                    null,

                  publishedAt:
                    null,
                },
              });

            workflowReset =
              true;
          }

          return {
            workflowReset,
          };
        }
      );

    return NextResponse.json({
      success: true,
      detached: true,
      alreadyDetached: false,
      previousListingId,

      workflowReset:
        result.workflowReset,
    });
  } catch (error) {
    console.error(
      "[valuations/id:detach]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Objektverknüpfung konnte nicht gelöst werden.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
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
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      id,
    } =
      await context.params;

    const valuationId =
      id.trim();

    if (!valuationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Bewertung.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Wichtig:
     * id + userId verhindern,
     * dass fremde Bewertungen
     * geöffnet werden können.
     */
    const valuation =
      await prisma.valuation.findFirst({
        where: {
          id:
            valuationId,

          userId:
            user.id,
        },
      });

    if (!valuation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bewertung nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      userId:
        _userId,
      ...safeValuation
    } =
      valuation;

    return NextResponse.json({
      success: true,
      valuation:
        safeValuation,
    });
  } catch (error) {
    console.error(
      "[valuations/id]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Bewertung konnte nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}
