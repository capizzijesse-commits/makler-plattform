import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  isGermanPortalId,
} from "@/lib/portal-integrations/portal-publish-job-factory.server";

import {
  dispatchPublicationRun,
  isPublicationOrchestratorDispatchEnabled,
} from "@/lib/publication-orchestrator/publication-dispatcher.server";

import {
  reconcilePublicationRun,
} from "@/lib/publication-orchestrator/publication-reconciler.server";

import {
  executePortalPublishJob,
} from "@/lib/portal-integrations/portal-publish-dispatcher.server";

import {
  getPortalPublishTriggerGates,
  runPortalPublishTrigger,
} from "@/lib/portal-integrations/portal-publish-trigger.server";


type AutopilotState =
  | "not_eligible"
  | "market_not_supported"
  | "approval_required"
  | "no_portal_connections"
  | "ready"
  | "publishing"
  | "partial"
  | "published"
  | "action_required";


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


function samePortalSet(
  left:
    string[],
  right:
    string[]
) {

  if (
    left.length !==
    right.length
  ) {
    return false;
  }


  const a =
    [...left].sort();

  const b =
    [...right].sort();


  return a.every(
    (
      value,
      index
    ) =>
      value ===
      b[index]
  );
}


/*
 * PUBLICATION AUTOPILOT V1
 *
 * Eine bewusste Maklerfreigabe ist
 * der letzte manuelle Schritt.
 *
 * Danach:
 *
 * - Portalziele automatisch erkennen
 * - PublicationRun automatisch erzeugen
 * - ohne externe Freigabe -> READY
 * - mit vollständig freigegebenem Transport:
 *   Dispatcher -> Worker -> Reconcile
 *
 * Keine Sicherheitssperre wird umgangen.
 */
export async function runPublicationAutopilotAfterApproval(
  input: {
    userId:
      string;

    listingId:
      string;

    plan:
      unknown;
  }
) {

  const capabilities =
    getPlanCapabilities(
      input.plan
    );


  if (
    !capabilities
      .canUsePublishingCenter
  ) {

    return {
      state:
        "not_eligible" as AutopilotState,

      runId:
        null,

      automationAttempted:
        false,
    };
  }


  const [
    listing,
    workflow,
  ] =
    await Promise.all([
      prisma.listing.findFirst({
        where: {
          id:
            input.listingId,

          userId:
            input.userId,

          archivedAt:
            null,
        },

        select: {
          id:
            true,

          countryCode:
            true,
        },
      }),

      prisma.brokerWorkflow.findUnique({
        where: {
          listingId:
            input.listingId,
        },

        select: {
          marketingApprovedAt:
            true,
        },
      }),
    ]);


  if (!listing) {

    throw new Error(
      "Listing für Publication Autopilot nicht gefunden."
    );
  }


  if (
    listing.countryCode !==
    "DE"
  ) {

    return {
      state:
        "market_not_supported" as AutopilotState,

      runId:
        null,

      automationAttempted:
        false,
    };
  }


  const approvedAt =
    workflow
      ?.marketingApprovedAt ??
    null;


  if (!approvedAt) {

    return {
      state:
        "approval_required" as AutopilotState,

      runId:
        null,

      automationAttempted:
        false,
    };
  }


  /*
   * Kundenverbindungen:
   *
   * configured =
   * Zugang vorhanden / vorbereitet.
   *
   * verified =
   * technisch verifiziert.
   */
  const allConnections =
    await prisma
      .portalConnection
      .findMany({
        where: {
          userId:
            input.userId,
        },

        select: {
          id:
            true,

          provider:
            true,

          portal:
            true,

          environment:
            true,

          status:
            true,
        },
      });


  const connections =
    allConnections.filter(
      (connection) =>
        isGermanPortalId(
          connection.portal
        ) &&
        (
          connection.status ===
            "configured" ||
          connection.status ===
            "verified"
        )
    );


  if (
    connections.length ===
    0
  ) {

    return {
      state:
        "no_portal_connections" as AutopilotState,

      runId:
        null,

      automationAttempted:
        false,
    };
  }


  const portalNames =
    connections.map(
      (connection) =>
        connection.portal
    );


  /*
   * Idempotenz:
   *
   * Nach derselben Maklerfreigabe
   * erzeugen Reloads oder Mehrfachklicks
   * keinen zweiten identischen Run.
   */
  const existingRun =
    await prisma
      .publicationRun
      .findFirst({
        where: {
          userId:
            input.userId,

          listingId:
            input.listingId,

          createdAt: {
            gte:
              approvedAt,
          },
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


  const existingPortals =
    existingRun
      ?.targets
      .filter(
        (target) =>
          target.kind ===
          "portal"
      )
      .map(
        (target) =>
          target.destination
      ) ??
    [];


  const reusable =
    Boolean(
      existingRun &&
      existingRun.targets.every(
        (target) =>
          target.kind ===
          "portal"
      ) &&
      samePortalSet(
        existingPortals,
        portalNames
      )
    );


  const run =
    reusable &&
    existingRun
      ? existingRun
      : await prisma
          .publicationRun
          .create({
            data: {
              userId:
                input.userId,

              listingId:
                input.listingId,

              /*
               * READY bedeutet:
               *
               * Inserat-AI hat alles vorbereitet.
               * Externe Übertragung kann bereits
               * laufen oder auf Portalzugang warten.
               */
              status:
                "ready",

              targets: {
                create:
                  connections.map(
                    (connection) => ({
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
                    })
                  ),
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


  /*
   * Bereits fertigen oder laufenden Run
   * niemals erneut starten.
   */
  if (
    run.status ===
      "published" ||
    run.status ===
      "publishing" ||
    run.status ===
      "partial" ||
    run.status ===
      "action_required"
  ) {

    return {
      state:
        run.status as AutopilotState,

      runId:
        run.id,

      summary:
        summarizeTargets(
          run.targets
        ),

      automationAttempted:
        false,

      reused:
        reusable,
    };
  }


  const gates =
    getPortalPublishTriggerGates();


  /*
   * V1 SAFE RULE:
   *
   * Wir starten den echten automatischen
   * Transport nur dann, wenn ALLE aktuell
   * ausgewählten Kundenverbindungen technisch
   * verifiziert und im derzeit unterstützten
   * Test-Transportmodus sind.
   *
   * Andernfalls bleibt das vollständige Paket
   * automatisch READY.
   */
  const everyConnectionExecutable =
    connections.every(
      (connection) =>
        connection.status ===
          "verified" &&
        connection.environment ===
          "test"
    );


  const canExecuteNow =
    everyConnectionExecutable &&
    isPublicationOrchestratorDispatchEnabled() &&
    gates.queueEnabled &&
    gates.workerEnabled &&
    gates.externalTransportEnabled;


  if (!canExecuteNow) {

    /*
     * Activity Center kann diesen Run bereits
     * als "Veröffentlichung vorbereitet"
     * anzeigen.
     */
    if (
      run.status !==
      "ready"
    ) {

      await prisma
        .publicationRun
        .update({
          where: {
            id:
              run.id,
          },

          data: {
            status:
              "ready",
          },
        });
    }


    return {
      state:
        "ready" as AutopilotState,

      runId:
        run.id,

      summary:
        summarizeTargets(
          run.targets
        ),

      automationAttempted:
        false,

      reused:
        reusable,

      gates: {
        orchestrator:
          isPublicationOrchestratorDispatchEnabled(),

        ...gates,
      },
    };
  }


  /*
   * Ab hier läuft alles ohne zweiten
   * Benutzer-Klick.
   */
  const dispatched =
    await dispatchPublicationRun({
      userId:
        input.userId,

      listingId:
        input.listingId,

      runId:
        run.id,
    });


  const worker =
    await runPortalPublishTrigger({
      execute:
        executePortalPublishJob,

      limit:
        10,
    });


  const reconciled =
    await reconcilePublicationRun({
      userId:
        input.userId,

      listingId:
        input.listingId,

      runId:
        run.id,
    });


  return {
    state:
      reconciled.run
        .status as AutopilotState,

    runId:
      reconciled.run.id,

    summary:
      reconciled.summary,

    automationAttempted:
      true,

    reused:
      reusable,

    portalJobsLinked:
      dispatched
        .portalJobsLinked,

    worker: {
      enabled:
        worker.enabled,

      claimed:
        worker.claimed,

      succeeded:
        worker.succeeded,

      failed:
        worker.failed,
    },

    gates: {
      orchestrator:
        isPublicationOrchestratorDispatchEnabled(),

      ...gates,
    },
  };
}