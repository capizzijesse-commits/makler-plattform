import "server-only";

import {
  prisma,
} from "@/lib/prisma";


export type PortalSafetyEnvironment =
  | "test"
  | "production";


const MAX_AUDITED_JOBS =
  5000;


const SENSITIVE_KEY_PATTERN =
  /^(accessToken|access_token|accessTokenSecret|access_token_secret|refreshToken|refresh_token|password|secret|clientSecret|client_secret|apiKey|api_key|authorization|cookie)$/i;


function containsSensitiveKey(
  value:
    unknown
):
  boolean {

  if (
    value ===
      null ||
    typeof value !==
      "object"
  ) {
    return false;
  }


  if (
    Array.isArray(
      value
    )
  ) {

    return value.some(
      (
        item
      ) =>
        containsSensitiveKey(
          item
        )
    );
  }


  for (
    const [
      key,
      nestedValue,
    ] of Object.entries(
      value as
        Record<
          string,
          unknown
        >
    )
  ) {

    if (
      SENSITIVE_KEY_PATTERN.test(
        key
      )
    ) {
      return true;
    }


    if (
      containsSensitiveKey(
        nestedValue
      )
    ) {
      return true;
    }
  }


  return false;
}


export async function getPortalSafetyGateReport(
  input?: {
    environment?:
      PortalSafetyEnvironment;
  }
) {

  const environment =
    input?.environment ??
    "test";


  /*
   * Nur lesender Audit.
   * Kein create/update/delete/upsert.
   */
  const jobs =
    await prisma.portalPublishJob.findMany({
      where: {
        environment,
      },

      orderBy: {
        createdAt:
          "desc",
      },

      take:
        MAX_AUDITED_JOBS,

      select: {
        id:
          true,

        userId:
          true,

        listingId:
          true,

        connectionId:
          true,

        provider:
          true,

        portal:
          true,

        action:
          true,

        status:
          true,

        providerOperationId:
          true,

        providerOperationState:
          true,

        payloadSnapshot:
          true,

        resultSnapshot:
          true,

        externalPublicationId:
          true,

        completedAt:
          true,

        failedAt:
          true,

        createdAt:
          true,

        listing: {
          select: {
            userId:
              true,

            unlockStatus:
              true,
          },
        },

        connection: {
          select: {
            userId:
              true,

            status:
              true,
          },
        },
      },
    });


  let listingOwnershipMismatch =
    0;

  let connectionOwnershipMismatch =
    0;

  let succeededWithoutUnlockedListing =
    0;

  let succeededWithReconciliationRequired =
    0;

  let sensitivePayloadSnapshot =
    0;

  let sensitiveResultSnapshot =
    0;

  let succeededMissingListingEvidence =
    0;

  let succeededMissingConnectionEvidence =
    0;


  const providerOperationCounts =
    new Map<
      string,
      number
    >();


  for (
    const job of
    jobs
  ) {

    /*
     * User / Listing müssen demselben
     * Eigentümer gehören.
     */
    if (
      job.listing &&
      job.listing.userId !==
        job.userId
    ) {
      listingOwnershipMismatch +=
        1;
    }


    /*
     * PortalConnection muss demselben
     * Eigentümer gehören.
     */
    if (
      job.connection &&
      job.connection.userId !==
        job.userId
    ) {
      connectionOwnershipMismatch +=
        1;
    }


    if (
      job.status ===
      "succeeded"
    ) {

      /*
       * Bei einem erfolgreichen Job muss
       * das Listing nachweisbar transfer-
       * berechtigt gewesen sein.
       */
      if (!job.listing) {

        succeededMissingListingEvidence +=
          1;
      }
      else if (
        job.listing.unlockStatus !==
          "paid" &&
        job.listing.unlockStatus !==
          "included"
      ) {

        succeededWithoutUnlockedListing +=
          1;
      }


      /*
       * Erfolgreicher Job ohne überprüfbare
       * Connection = Beweislücke.
       */
      if (!job.connection) {

        succeededMissingConnectionEvidence +=
          1;
      }


      /*
       * Ein Job darf niemals gleichzeitig
       * succeeded UND reconciliation_required
       * sein.
       */
      if (
        job.providerOperationState ===
        "reconciliation_required"
      ) {

        succeededWithReconciliationRequired +=
          1;
      }
    }


    /*
     * Snapshots dürfen keine Credential-
     * Schlüssel enthalten.
     */
    if (
      containsSensitiveKey(
        job.payloadSnapshot
      )
    ) {

      sensitivePayloadSnapshot +=
        1;
    }


    if (
      containsSensitiveKey(
        job.resultSnapshot
      )
    ) {

      sensitiveResultSnapshot +=
        1;
    }


    /*
     * Provider-Operation-ID sollte genau
     * einem Job gehören.
     */
    if (
      job.providerOperationId
    ) {

      providerOperationCounts.set(
        job.providerOperationId,
        (
          providerOperationCounts.get(
            job.providerOperationId
          ) ??
          0
        ) +
        1
      );
    }
  }


  const duplicateProviderOperationIds =
    Array.from(
      providerOperationCounts.values()
    ).filter(
      (
        count
      ) =>
        count >
        1
    ).length;


  const criticalViolations =
    listingOwnershipMismatch +
    connectionOwnershipMismatch +
    succeededWithoutUnlockedListing +
    succeededWithReconciliationRequired +
    sensitivePayloadSnapshot +
    sensitiveResultSnapshot +
    duplicateProviderOperationIds;


  /*
   * Eine Beweislücke ist nicht automatisch
   * ein bewiesener Verstoß.
   *
   * Aber für unser Launch-Gate gilt:
   * Was wir nicht beweisen können,
   * darf nicht PASS sein.
   */
  const evidenceGaps =
    succeededMissingListingEvidence +
    succeededMissingConnectionEvidence;


  /*
   * Ein leerer Audit ist KEIN Safety-Beweis.
   * Ohne geprüfte Jobs bleibt das Gate
   * bewusst "not_measured".
   */
  const measured =
    jobs.length >
    0;


  const passed =
    measured &&
    criticalViolations ===
      0 &&
    evidenceGaps ===
      0;


  return {
    generatedAt:
      new Date()
        .toISOString(),

    environment,

    scope: {
      jobsAudited:
        jobs.length,

      maximumJobsAudited:
        MAX_AUDITED_JOBS,
    },

    invariants: {
      listingOwnershipMismatch,

      connectionOwnershipMismatch,

      succeededWithoutUnlockedListing,

      succeededWithReconciliationRequired,

      duplicateProviderOperationIds,

      sensitivePayloadSnapshot,

      sensitiveResultSnapshot,
    },

    evidenceGaps: {
      succeededMissingListingEvidence,

      succeededMissingConnectionEvidence,

      total:
        evidenceGaps,
    },

    criticalViolations,

    safetyGate: {
      measured,

      passed,

      state:
        !measured
          ? "not_measured"
          : passed
            ? "pass"
            : "fail",
    },

    /*
     * Das ist noch NICHT alleine
     * "Launch Ready".
     *
     * Gesamtfreigabe braucht:
     *
     * Operational >= 95 %
     * UND
     * Safety Gate PASS.
     */
    launchReadyBySafetyAlone:
      false,
  };
}