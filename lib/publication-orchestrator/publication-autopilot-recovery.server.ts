import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  isDevelopmentE2EListing,
} from "@/lib/development-e2e-access";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  runPublicationAutopilotAfterApproval,
} from "@/lib/publication-orchestrator/publication-autopilot.server";


export type PublicationAutopilotRecoveryResult = {
  /*
   * Alle READY-Runs, die vom DB-Lookup
   * gefunden wurden.
   */
  discovered:
    number;

  /*
   * Echte, berechtigte Runs,
   * die tatsächlich geprüft wurden.
   */
  scanned:
    number;

  skippedTestRuns:
    number;

  skippedIneligibleRuns:
    number;

  processed:
    number;

  stayedReady:
    number;

  progressed:
    number;

  failed:
    number;

  results:
    Array<{
      runId:
        string;

      listingId:
        string;

      userId:
        string;

      before:
        string;

      after:
        string;

      automationAttempted:
        boolean;

      error:
        string |
        null;
    }>;
};


function isKnownTestRun(
  input: {
    email:
      string |
      null;

    projectName:
      string |
      null;
  }
):
  boolean {

  const email =
    input.email
      ?.trim()
      .toLowerCase() ??
    "";

  const projectName =
    input.projectName
      ?.trim()
      .toLowerCase() ??
    "";


  /*
   * Niemals Selftest-User automatisch
   * durch den Production-Recovery schicken.
   */
  if (
    email.endsWith(
      "@example.invalid"
    )
  ) {

    return true;
  }


  /*
   * Bekannte Inserat-AI Development /
   * E2E Fixtures.
   */
  if (
    isDevelopmentE2EListing(
      input.projectName
    )
  ) {

    return true;
  }


  /*
   * Zusätzlicher Schutz für die bereits
   * vorhandenen historischen Test-Fixtures.
   */
  if (
    projectName.startsWith(
      "e2e automation test"
    ) ||
    projectName.startsWith(
      "autopilot selftest"
    )
  ) {

    return true;
  }


  return false;
}


/*
 * PUBLICATION AUTOPILOT RECOVERY V1
 *
 * Aufgabe:
 *
 * Freigegebene echte PublicationRuns,
 * die wegen externer Portal-/Transport-
 * Freigaben auf READY warten, werden
 * regelmäßig erneut geprüft.
 *
 * Sobald die bereits vorhandenen Gates
 * einen sicheren Transport erlauben,
 * übernimmt der bestehende Autopilot:
 *
 * READY
 *   -> Dispatch
 *   -> Worker
 *   -> Reconcile
 *
 * Keine Sicherheitsbarriere wird
 * aufgehoben oder umgangen.
 *
 * Test-/E2E-Fixtures und nicht
 * publishing-berechtigte Pläne werden
 * bewusst ignoriert.
 */
export async function recoverReadyPublicationRuns(
  input?: {
    limit?:
      number;
  }
):
  Promise<
    PublicationAutopilotRecoveryResult
  > {

  const requestedLimit =
    input
      ?.limit ??
    25;


  const limit =
    Math.max(
      1,
      Math.min(
        requestedLimit,
        100
      )
    );


  const runs =
    await prisma
      .publicationRun
      .findMany({
        where: {
          status:
            "ready",

          listing: {
            archivedAt:
              null,

            countryCode:
              "DE",

            brokerWorkflow: {
              marketingApprovedAt: {
                not:
                  null,
              },
            },
          },
        },

        orderBy: {
          updatedAt:
            "asc",
        },

        take:
          limit,

        select: {
          id:
            true,

          userId:
            true,

          listingId:
            true,

          status:
            true,

          listing: {
            select: {
              projectName:
                true,
            },
          },

          user: {
            select: {
              email:
                true,

              plan:
                true,
            },
          },
        },
      });


  const nonTestRuns =
    runs.filter(
      (run) =>
        !isKnownTestRun({
          email:
            run.user.email,

          projectName:
            run.listing.projectName,
        })
    );


  const skippedTestRuns =
    runs.length -
    nonTestRuns.length;


  const eligibleRuns =
    nonTestRuns.filter(
      (run) =>
        getPlanCapabilities(
          run.user.plan
        ).canUsePublishingCenter
    );


  const skippedIneligibleRuns =
    nonTestRuns.length -
    eligibleRuns.length;


  const results:
    PublicationAutopilotRecoveryResult[
      "results"
    ] =
      [];


  let processed =
    0;

  let stayedReady =
    0;

  let progressed =
    0;

  let failed =
    0;


  for (
    const run of
    eligibleRuns
  ) {

    try {

      const result =
        await runPublicationAutopilotAfterApproval({
          userId:
            run.userId,

          listingId:
            run.listingId,

          plan:
            run.user.plan,
        });


      processed +=
        1;


      const after =
        typeof result.state ===
          "string"
          ? result.state
          : "unknown";


      /*
       * Nur echte Orchestrator-
       * Fortschrittszustände zählen
       * als Fortschritt.
       */
      if (
        after ===
          "publishing" ||
        after ===
          "partial" ||
        after ===
          "published" ||
        after ===
          "action_required"
      ) {

        progressed +=
          1;
      }
      else {

        stayedReady +=
          1;
      }


      results.push({
        runId:
          run.id,

        listingId:
          run.listingId,

        userId:
          run.userId,

        before:
          run.status,

        after,

        automationAttempted:
          result
            .automationAttempted ===
          true,

        error:
          null,
      });
    }
    catch (
      error
    ) {

      failed +=
        1;


      results.push({
        runId:
          run.id,

        listingId:
          run.listingId,

        userId:
          run.userId,

        before:
          run.status,

        after:
          "error",

        automationAttempted:
          false,

        error:
          error instanceof
            Error
            ? error.message
                .slice(
                  0,
                  500
                )
            : "UNKNOWN_RECOVERY_ERROR",
      });
    }
  }


  return {
    discovered:
      runs.length,

    scanned:
      eligibleRuns.length,

    skippedTestRuns,

    skippedIneligibleRuns,

    processed,

    stayedReady,

    progressed,

    failed,

    results,
  };
}