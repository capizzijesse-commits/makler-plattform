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

type WorkflowAction =
  | "valuation_completed"
  | "mandate_confirmed"
  | "mandate_revoked"
  | "package_prepared"
  | "marketing_approved"
  | "marketing_revoked"
  | "publication_started"
  | "published";

function stageFromWorkflow(
  workflow: {
    valuationCompletedAt:
      Date | null;

    mandateConfirmedAt:
      Date | null;

    packagePreparedAt:
      Date | null;

    marketingApprovedAt:
      Date | null;

    publicationStartedAt:
      Date | null;

    publishedAt:
      Date | null;
  }
) {
  if (
    workflow.publishedAt
  ) {
    return "published";
  }

  if (
    workflow
      .publicationStartedAt
  ) {
    return "publication";
  }

  if (
    workflow
      .marketingApprovedAt
  ) {
    return "publication";
  }

  if (
    workflow
      .packagePreparedAt
  ) {
    return "approval";
  }

  if (
    workflow
      .mandateConfirmedAt
  ) {
    return "package";
  }

  if (
    workflow
      .valuationCompletedAt
  ) {
    return "mandate";
  }

  return "valuation";
}

async function ownedListing(
  request: NextRequest,
  id: string
) {
  const user =
    await getAuthenticatedUser(
      request
    );

  if (!user) {
    return {
      user: null,
      listing: null,
    };
  }

  const listing =
    await prisma.listing.findFirst({
      where: {
        id,
        userId:
          user.id,
      },

      select: {
        id: true,
      },
    });

  return {
    user,
    listing,
  };
}

export async function GET(
  request: NextRequest,
  context: {
    params:
      Promise<{
        id: string;
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

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Objekt wurde nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }

    const workflow =
      await prisma
        .brokerWorkflow
        .findUnique({
          where: {
            listingId:
              listing.id,
          },
        });

    if (!workflow) {
      return NextResponse.json({
        success: true,

        workflow: {
          listingId:
            listing.id,

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

        persisted:
          false,
      });
    }

    return NextResponse.json({
      success: true,
      workflow,
      persisted:
        true,
    });
  } catch (error) {
    console.error(
      "Broker workflow GET failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Makler-Workflow konnte nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params:
      Promise<{
        id: string;
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

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Objekt wurde nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }

    const body =
      (await request.json()) as {
        action?:
          WorkflowAction;

        valuationId?:
          string | null;
      };

    const allowedActions:
      WorkflowAction[] = [
        "valuation_completed",
        "mandate_confirmed",
        "mandate_revoked",
        "package_prepared",
        "marketing_approved",
        "marketing_revoked",
        "publication_started",
        "published",
      ];

    if (
      !body.action ||
      !allowedActions.includes(
        body.action
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Workflow-Aktion.",
        },
        {
          status: 400,
        }
      );
    }

    const current =
      await prisma
        .brokerWorkflow
        .findUnique({
          where: {
            listingId:
              listing.id,
          },
        });

    const now =
      new Date();

    /* BROKER WORKFLOW SERVER GATES V1 */

    if (
      body.action ===
        "valuation_completed"
    ) {
      const valuationId =
        typeof body.valuationId ===
          "string"
          ? body.valuationId.trim()
          : "";

      if (!valuationId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Eine abgeschlossene Bewertung ist erforderlich.",
          },
          {
            status: 409,
          }
        );
      }

      const completedValuation =
        await prisma
          .valuation
          .findFirst({
            where: {
              id:
                valuationId,

              userId:
                user.id,

              /* VALUATION MUST BELONG TO LISTING V1 */
              listingId:
                listing.id,

              status:
                "completed",

              valuedAt: {
                not:
                  null,
              },

              salePrice: {
                not:
                  null,
              },

              provider: {
                not:
                  null,
              },
            },

            select: {
              id:
                true,
            },
          });

      if (
        !completedValuation
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Die Bewertung ist noch nicht vollst\u00e4ndig abgeschlossen.",
          },
          {
            status: 409,
          }
        );
      }
    }

    if (
      body.action ===
        "mandate_confirmed" &&
      (
        !current
          ?.valuationCompletedAt ||
        !current
          ?.valuationId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Vermarktungsauftrag kann erst nach einer abgeschlossenen Bewertung best\u00e4tigt werden.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      body.action ===
        "package_prepared" &&
      !current
        ?.mandateConfirmedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Objektpaket kann erst nach best\u00e4tigtem Vermarktungsauftrag abgeschlossen werden.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      body.action ===
        "marketing_approved" &&
      !current
        ?.packagePreparedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Vermarktung kann erst nach einem fertig vorbereiteten Objektpaket freigegeben werden.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      body.action ===
        "publication_started" &&
      !current
        ?.marketingApprovedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Ver\u00f6ffentlichung kann erst nach der Vermarktungsfreigabe gestartet werden.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      body.action ===
        "published" &&
      !current
        ?.publicationStartedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ein Objekt kann erst nach gestarteter Ver\u00f6ffentlichung als ver\u00f6ffentlicht markiert werden.",
        },
        {
          status: 409,
        }
      );
    }

    const next = {
      valuationId:
        current
          ?.valuationId ??
        null,

      valuationCompletedAt:
        current
          ?.valuationCompletedAt ??
        null,

      mandateConfirmedAt:
        current
          ?.mandateConfirmedAt ??
        null,

      packagePreparedAt:
        current
          ?.packagePreparedAt ??
        null,

      marketingApprovedAt:
        current
          ?.marketingApprovedAt ??
        null,

      publicationStartedAt:
        current
          ?.publicationStartedAt ??
        null,

      publishedAt:
        current
          ?.publishedAt ??
        null,
    };

    switch (
      body.action
    ) {
      case "valuation_completed":
        next.valuationCompletedAt =
          now;

        next.valuationId =
          body.valuationId
            ?.trim() ||
          null;

        break;

      case "mandate_confirmed":
        next.mandateConfirmedAt =
          now;

        break;

      case "mandate_revoked":
        next.mandateConfirmedAt =
          null;

        next.packagePreparedAt =
          null;

        next.marketingApprovedAt =
          null;

        next.publicationStartedAt =
          null;

        next.publishedAt =
          null;

        break;

      case "package_prepared":
        next.packagePreparedAt =
          now;

        break;

      case "marketing_approved":
        next.marketingApprovedAt =
          now;

        break;

      case "marketing_revoked":
        next.marketingApprovedAt =
          null;

        next.publicationStartedAt =
          null;

        next.publishedAt =
          null;

        break;

      case "publication_started":
        next.publicationStartedAt =
          now;

        break;

      case "published":
        next.publicationStartedAt =
          next
            .publicationStartedAt ??
          now;

        next.publishedAt =
          now;

        break;
    }

    const currentStage =
      stageFromWorkflow(
        next
      );

    const workflow =
      await prisma
        .brokerWorkflow
        .upsert({
          where: {
            listingId:
              listing.id,
          },

          create: {
            listingId:
              listing.id,

            currentStage,

            ...next,
          },

          update: {
            currentStage,

            ...next,
          },
        });

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error(
      "Broker workflow PATCH failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Makler-Workflow konnte nicht aktualisiert werden.",
      },
      {
        status: 500,
      }
    );
  }
}
