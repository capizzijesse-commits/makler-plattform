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
  runPublicationAutopilotAfterApproval,
} from "@/lib/publication-orchestrator/publication-autopilot.server";

export const runtime =
  "nodejs";

type WorkflowAction =
  | "valuation_completed"
  | "mandate_confirmed"
  | "mandate_revoked"
  | "package_prepared"
  | "package_revoked"
  | "marketing_approved"
  | "marketing_revoked"
  | "publication_started"
  | "published";

/* BROKER WORKFLOW VALUATION SUMMARY V1 */
type WorkflowValuationSummary = {
  id: string;
  addressLabel: string;
  currency: string;
  salePrice: number | null;
  salePriceLower: number | null;
  salePriceUpper: number | null;
  pricePerSqm: number | null;
  confidence: string | null;
  locationScore: number | null;
  provider: string | null;
  valuedAt: Date | null;
};

async function loadWorkflowValuation(
  userId: string,
  listingId: string,
  valuationId: string | null
): Promise<WorkflowValuationSummary | null> {
  if (!valuationId) {
    return null;
  }

  return prisma.valuation.findFirst({
    where: {
      id:
        valuationId,

      userId,

      listingId,

      status:
        "completed",
    },

    select: {
      id: true,

      addressLabel:
        true,

      currency:
        true,

      salePrice:
        true,

      salePriceLower:
        true,

      salePriceUpper:
        true,

      pricePerSqm:
        true,

      confidence:
        true,

      locationScore:
        true,

      provider:
        true,

      valuedAt:
        true,
    },
  });
}

/* BROKER WORKFLOW PACKAGE READINESS V1 */
function hasPreparedListingText(
  value: string | null
) {
  if (!value?.trim()) {
    return false;
  }

  try {
    const parsed =
      JSON.parse(value);

    return (
      Array.isArray(parsed) &&
      parsed.some((item) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return false;
        }

        const candidate =
          item as Record<
            string,
            unknown
          >;

        return (
          typeof candidate.title ===
            "string" &&
          candidate.title.trim()
            .length > 0 &&
          typeof candidate.text ===
            "string" &&
          candidate.text.trim()
            .length > 0
        );
      })
    );
  } catch {
    return false;
  }
}

async function loadPackageReadiness(
  userId: string,
  listingId: string
) {
  const listing =
    await prisma.listing.findFirst({
      where: {
        id:
          listingId,

        userId,
      },

      select: {
        location:
          true,

        postalCode:
          true,

        propertyType:
          true,

        livingArea:
          true,

        rooms:
          true,

        generatedVariants:
          true,

        images: {
          take:
            1,

          select: {
            id:
              true,
          },
        },
      },
    });

  if (!listing) {
    return null;
  }

  const coreDataReady =
    Boolean(
      listing.location?.trim() &&
      listing.postalCode?.trim() &&
      listing.propertyType?.trim() &&
      typeof listing.livingArea ===
        "number" &&
      listing.livingArea > 0 &&
      typeof listing.rooms ===
        "number" &&
      listing.rooms > 0
    );

  const imagesReady =
    listing.images.length > 0;

  const listingTextReady =
    hasPreparedListingText(
      listing.generatedVariants
    );

  return {
    coreDataReady,
    imagesReady,
    listingTextReady,

    ready:
      coreDataReady &&
      imagesReady &&
      listingTextReady,
  };
}

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

        valuation:
          null,

        persisted:
          false,
      });
    }

    const valuation =
      await loadWorkflowValuation(
        user.id,
        listing.id,
        workflow.valuationId
      );

    return NextResponse.json({
      success: true,
      workflow,
      valuation,
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
        "package_revoked",
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
        "package_prepared"
    ) {
      if (
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

      const packageReadiness =
        await loadPackageReadiness(
          user.id,
          listing.id
        );

      if (
        !packageReadiness ||
        !packageReadiness.ready
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Das Objektpaket ist noch nicht vollst\u00e4ndig vorbereitet.",

            code:
              "BROKER_PACKAGE_NOT_READY",

            readiness:
              packageReadiness,
          },
          {
            status: 409,
          }
        );
      }
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

      case "package_revoked":
        next.packagePreparedAt =
          null;

        next.marketingApprovedAt =
          null;

        next.publicationStartedAt =
          null;

        next.publishedAt =
          null;

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

    const valuation =
      await loadWorkflowValuation(
        user.id,
        listing.id,
        workflow.valuationId
      );

    /*
     * PUBLICATION_AUTOPILOT_V1
     *
     * "Vermarktung freigeben" ist ab jetzt
     * der letzte notwendige manuelle Schritt.
     *
     * Danach:
     *
     * - automatisch veröffentlichen, wenn möglich
     * - sonst automatisch READY setzen
     *
     * Ein Autopilot-Fehler darf die bereits
     * gespeicherte Maklerfreigabe nicht zerstören.
     */
    let publicationAutomation:
      Awaited<
        ReturnType<
          typeof runPublicationAutopilotAfterApproval
        >
      > |
      {
        state:
          "error";

        message:
          string;
      } |
      null =
        null;


    if (
      body.action ===
      "marketing_approved"
    ) {

      try {

        publicationAutomation =
          await runPublicationAutopilotAfterApproval({
            userId:
              user.id,

            listingId:
              listing.id,

            plan:
              user.plan,
          });
      }
      catch (
        automationError
      ) {

        console.error(
          "[publication-autopilot] failed",
          automationError
        );


        publicationAutomation = {
          state:
            "error",

          message:
            automationError instanceof
              Error
              ? automationError.message
              : "Publication Autopilot konnte nicht gestartet werden.",
        };
      }
    }


    return NextResponse.json({
      success: true,
      workflow,
      valuation,
      publicationAutomation,
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
