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


  /*
   * RECOVERY PAGINATION V2
   *
   * Das Limit wird erst auf echte,
   * publishing-berechtigte Runs angewendet.
   *
   * Test-Fixtures und nicht berechtigte
   * Accounts dürfen echte Kunden-Runs
   * nicht durch ein vorgelagertes `take`
   * dauerhaft blockieren.
   */
  const pageSize =
    Math.max(
      25,
      Math.min(
        limit * 2,
        100
      )
    );


  const eligibleRuns:
    Array<{
      id:
        string;

      userId:
        string;

      listingId:
        string;

      status:
        string;

      user: {
        plan:
          string;
      };
    }> =
      [];


  let cursorId:
    string |
    null =
      null;

  let discovered =
    0;

  let skippedTestRuns =
    0;

  let skippedIneligibleRuns =
    0;

  let exhausted =
    false;


  while (
    eligibleRuns.length <
      limit &&
    !exhausted
  ) {

    const page:
      Array<{
        id:
          string;

        userId:
          string;

        listingId:
          string;

        status:
          string;

        listing: {
          projectName:
            string |
            null;
        };

        user: {
          email:
            string;

          plan:
            string;
        };
      }> =
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

          orderBy: [
            {
              updatedAt:
                "asc",
            },
            {
              id:
                "asc",
            },
          ],

          take:
            pageSize,

          ...(
            cursorId
              ? {
                  cursor: {
                    id:
                      cursorId,
                  },

                  skip:
                    1,
                }
              : {}
          ),

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


    if (page.length === 0) {
      break;
    }


    exhausted =
      page.length <
      pageSize;


    for (const run of page) {

      discovered +=
        1;


      if (
        isKnownTestRun({
          email:
            run.user.email,

          projectName:
            run.listing.projectName,
        })
      ) {

        skippedTestRuns +=
          1;

        continue;
      }


      if (
        !getPlanCapabilities(
          run.user.plan
        ).canUsePublishingCenter
      ) {

        skippedIneligibleRuns +=
          1;

        continue;
      }


      eligibleRuns.push({
        id:
          run.id,

        userId:
          run.userId,

        listingId:
          run.listingId,

        status:
          run.status,

        user: {
          plan:
            run.user.plan,
        },
      });


      if (
        eligibleRuns.length >=
        limit
      ) {
        break;
      }
    }


    cursorId =
      page[
        page.length - 1
      ].id;
  }


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
    discovered,

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