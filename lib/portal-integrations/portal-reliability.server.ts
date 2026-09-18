import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import type {
  GermanPortalId,
} from "@/lib/portal-integrations/types";


export type PortalReliabilityEnvironment =
  | "test"
  | "production";


const GERMAN_PORTALS:
  readonly GermanPortalId[] = [
    "immoscout24_de",
    "immowelt_de",
    "kleinanzeigen_de",
    "wg_gesucht_de",
    "immobilien_de",
  ];


const MINIMUM_SAMPLE_SIZE =
  100;

const TARGET_SUCCESS_RATE =
  95;


function percentage(
  part:
    number,
  total:
    number
):
  number {

  if (
    total <=
    0
  ) {
    return 0;
  }

  return Number(
    (
      (
        part /
        total
      ) *
      100
    ).toFixed(
      2
    )
  );
}


async function getPortalReliabilitySnapshot(
  portal:
    GermanPortalId,
  environment:
    PortalReliabilityEnvironment
) {

  /*
   * Launch-Messung:
   *
   * Die letzten 100 ABGESCHLOSSENEN
   * Portal-Läufe.
   *
   * Pending / queued / processing /
   * geplante Retries zählen noch nicht
   * als abgeschlossen.
   */
  const settledJobs =
    await prisma.portalPublishJob.findMany({
      where: {
        portal,
        environment,

        OR: [
          {
            status:
              "succeeded",
          },
          {
            status:
              "failed",

            nextAttemptAt:
              null,
          },
        ],
      },

      orderBy: [
        {
          updatedAt:
            "desc",
        },
        {
          createdAt:
            "desc",
        },
      ],

      take:
        100,

      select: {
        id:
          true,

        status:
          true,

        attemptCount:
          true,

        maxAttempts:
          true,

        providerOperationState:
          true,

        errorCode:
          true,

        completedAt:
          true,

        failedAt:
          true,

        updatedAt:
          true,
      },
    });


  const pendingJobs =
    await prisma.portalPublishJob.count({
      where: {
        portal,
        environment,

        OR: [
          {
            status: {
              in: [
                "draft",
                "scheduled",
                "queued",
                "processing",
              ],
            },
          },
          {
            status:
              "failed",

            nextAttemptAt: {
              not:
                null,
            },
          },
        ],
      },
    });


  const sampleSize =
    settledJobs.length;


  const succeeded =
    settledJobs.filter(
      (
        job
      ) =>
        job.status ===
        "succeeded"
    );


  const immediateSucceeded =
    succeeded.filter(
      (
        job
      ) =>
        job.attemptCount <=
        1
    ).length;


  const retriedSucceeded =
    succeeded.filter(
      (
        job
      ) =>
        job.attemptCount >
        1
    ).length;


  const reconciliation =
    settledJobs.filter(
      (
        job
      ) =>
        job.status ===
          "failed" &&
        job.providerOperationState ===
          "reconciliation_required"
    ).length;


  const terminalFailed =
    settledJobs.filter(
      (
        job
      ) =>
        job.status ===
          "failed" &&
        job.providerOperationState !==
          "reconciliation_required"
    ).length;


  const automatedSucceeded =
    succeeded.length;


  const automatedSuccessRate =
    percentage(
      automatedSucceeded,
      sampleSize
    );


  const terminalFailureRate =
    percentage(
      terminalFailed,
      sampleSize
    );


  const reconciliationRate =
    percentage(
      reconciliation,
      sampleSize
    );


  const sampleReady =
    sampleSize >=
    MINIMUM_SAMPLE_SIZE;


  /*
   * Operationales 95%-Gate.
   *
   * Automatische Retries zählen
   * als automatischer Erfolg.
   *
   * Reconciliation zählt NICHT
   * als automatischer Erfolg.
   */
  const operationalGatePassed =
    sampleReady &&
    automatedSuccessRate >=
      TARGET_SUCCESS_RATE;


  const newestSettledAt =
    settledJobs[0]
      ?.updatedAt
      .toISOString() ??
    null;


  const oldestSettledAt =
    settledJobs[
      settledJobs.length -
      1
    ]
      ?.updatedAt
      .toISOString() ??
    null;


  return {
    portal,
    environment,

    sampleWindow:
      "last_100_settled_jobs",

    minimumSampleSize:
      MINIMUM_SAMPLE_SIZE,

    targetSuccessRate:
      TARGET_SUCCESS_RATE,

    sampleSize,
    sampleReady,

    automatedSucceeded,
    immediateSucceeded,
    retriedSucceeded,

    terminalFailed,
    reconciliation,

    pendingJobs,

    automatedSuccessRate,
    terminalFailureRate,
    reconciliationRate,

    operationalGatePassed,

    newestSettledAt,
    oldestSettledAt,
  };
}


export async function getGermanPortalReliabilityReport(
  input?: {
    environment?:
      PortalReliabilityEnvironment;
  }
) {

  const environment =
    input?.environment ??
    "test";


  const portals =
    await Promise.all(
      GERMAN_PORTALS.map(
        (
          portal
        ) =>
          getPortalReliabilitySnapshot(
            portal,
            environment
          )
      )
    );


  const readyPortals =
    portals.filter(
      (
        portal
      ) =>
        portal.sampleReady
    ).length;


  const passingPortals =
    portals.filter(
      (
        portal
      ) =>
        portal.operationalGatePassed
    ).length;


  return {
    generatedAt:
      new Date()
        .toISOString(),

    environment,

    scope:
      "operational_reliability_only",

    methodology: {
      sample:
        "last_100_settled_jobs_per_portal",

      minimumSampleSize:
        MINIMUM_SAMPLE_SIZE,

      targetSuccessRate:
        TARGET_SUCCESS_RATE,

      automatedRetryCountsAsSuccess:
        true,

      reconciliationCountsAsAutomaticSuccess:
        false,

      pendingJobsExcludedFromRate:
        true,
    },

    /*
     * WICHTIG:
     *
     * Das 95%-Gate misst nur
     * operative Zuverlässigkeit.
     *
     * Safety-Invarianten wie
     * Doppelpublikation / falscher User /
     * ungezahltes Listing werden später
     * separat als Hard Gate gemessen.
     */
    safetyInvariantGateMeasured:
      false,

    readyPortals,
    passingPortals,

    allOperationalGatesPassed:
      readyPortals ===
        GERMAN_PORTALS.length &&
      passingPortals ===
        GERMAN_PORTALS.length,

    portals,
  };
}