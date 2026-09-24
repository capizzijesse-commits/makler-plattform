import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  prisma,
} from "@/lib/prisma";

import {
  createPortalPublishJob,
  markPortalPublishJobFailed,
  markPortalPublishJobSucceeded,
} from "@/lib/portal-integrations/portal-publish-job-store.server";


const SELFTEST_ENVIRONMENT =
  "selftest";


function assertSelftest(
  condition:
    unknown,
  message:
    string
):
  asserts condition {

  if (!condition) {

    throw new Error(
      `PORTAL_SELFTEST_ASSERTION_FAILED: ${message}`
    );
  }
}


export async function runPortalPublishSelftestV1() {

  if (
    process.env.NODE_ENV ===
    "production"
  ) {

    throw new Error(
      "PORTAL_SELFTEST_PRODUCTION_BLOCKED"
    );
  }


  const runId =
    randomUUID();

  const portal =
    `selftest_portal_${runId}`;

  const workerId =
    `selftest-worker-${runId}`;


  /*
   * Wir verwenden absichtlich einen bereits
   * vorhandenen *.invalid Selftest-User.
   *
   * Kein realer Nutzer wird ausgewählt.
   * Kein neuer User wird angelegt.
   */
  const user =
    await prisma.user.findFirst({
      where: {
        email: {
          startsWith:
            "portal-selftest-",

          endsWith:
            "@example.invalid",
        },
      },

      orderBy: {
        createdAt:
          "asc",
      },

      select: {
        id:
          true,

        email:
          true,
      },
    });


  if (!user) {

    throw new Error(
      "PORTAL_SELFTEST_USER_NOT_FOUND"
    );
  }


  let listingId:
    string |
    null =
      null;

  let connectionId:
    string |
    null =
      null;


  const checks:
    Array<{
      name:
        string;

      passed:
        boolean;
    }> =
      [];


  try {

    /*
     * Ausschliesslich temporäre Testdaten.
     * Environment = selftest.
     */
    const listing =
      await prisma.listing.create({
        data: {
          userId:
            user.id,

          projectName:
            `Portal Selftest ${runId}`,

          location:
            "Berlin",

          postalCode:
            "10557",

          countryCode:
            "DE",

          propertyType:
            "apartment",

          unlockStatus:
            "included",

          paymentModel:
            "subscription",
        },

        select: {
          id:
            true,
        },
      });

    listingId =
      listing.id;


    const connection =
      await prisma.portalConnection.create({
        data: {
          userId:
            user.id,

          provider:
            "selftest",

          portal,

          environment:
            SELFTEST_ENVIRONMENT,

          status:
            "verified",

          credentialSource:
            "selftest",

          lastVerifiedAt:
            new Date(),
        },

        select: {
          id:
            true,
        },
      });

    connectionId =
      connection.id;


    /*
     * TEST 1
     * Deterministic Idempotency:
     * Zwei identische Create-Aufrufe
     * müssen denselben Job ergeben.
     */
    const idempotencyInput = {
      userId:
        user.id,

      listingId:
        listing.id,

      connectionId:
        connection.id,

      action:
        "publish" as const,

      externalObjectId:
        "selftest-object-idempotency",

      payloadSnapshot: {
        selftest:
          true,

        case:
          "idempotency",

        value:
          1,
      },
    };


    const first =
      await createPortalPublishJob(
        idempotencyInput
      );

    const second =
      await createPortalPublishJob(
        idempotencyInput
      );


    assertSelftest(
      first.id ===
        second.id,
      "Identische Requests erzeugten unterschiedliche Job IDs."
    );


    const identicalJobCount =
      await prisma.portalPublishJob.count({
        where: {
          idempotencyKey:
            first.idempotencyKey,
        },
      });


    assertSelftest(
      identicalJobCount ===
        1,
      "Idempotency Key existiert mehrfach."
    );


    checks.push({
      name:
        "deterministic_idempotency",

      passed:
        true,
    });


    /*
     * TEST 2
     * Retry/Backoff:
     * Ein normaler Fehler beim ersten
     * Versuch muss einen Retry planen.
     */
    const retryJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          connection.id,

        externalObjectId:
          "selftest-object-retry",

        payloadSnapshot: {
          selftest:
            true,

          case:
            "retry",
        },
      });


    await prisma.portalPublishJob.update({
      where: {
        id:
          retryJob.id,
      },

      data: {
        status:
          "processing",

        attemptCount:
          1,

        lockedAt:
          new Date(),

        lockedBy:
          workerId,

        nextAttemptAt:
          null,
      },
    });


    const retryFailure =
      await markPortalPublishJobFailed({
        jobId:
          retryJob.id,

        workerId,

        errorCode:
          "SELFTEST_RETRYABLE",

        errorMessage:
          "Synthetic retryable selftest error.",
      });


    assertSelftest(
      retryFailure.count ===
        1,
      "Retryable Failure konnte Job nicht aktualisieren."
    );


    const retried =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            retryJob.id,
        },

        select: {
          status:
            true,

          nextAttemptAt:
            true,

          failedAt:
            true,
        },
      });


    assertSelftest(
      retried.status ===
        "failed",
      "Retryable Job ist nicht failed."
    );

    assertSelftest(
      retried.nextAttemptAt !==
        null,
      "Retryable Job erhielt keinen nächsten Versuch."
    );

    assertSelftest(
      retried.failedAt !==
        null &&
      retried.nextAttemptAt >
        retried.failedAt,
      "Retry Backoff liegt nicht nach dem Fehlerzeitpunkt."
    );


    checks.push({
      name:
        "retry_backoff",

      passed:
        true,
    });


    /*
     * TEST 3
     * Reconciliation:
     * Ambige externe Operation darf
     * KEINEN automatischen Retry bekommen.
     */
    const reconciliationJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          connection.id,

        externalObjectId:
          "selftest-object-reconciliation",

        payloadSnapshot: {
          selftest:
            true,

          case:
            "reconciliation",
        },
      });


    await prisma.portalPublishJob.update({
      where: {
        id:
          reconciliationJob.id,
      },

      data: {
        status:
          "processing",

        attemptCount:
          1,

        lockedAt:
          new Date(),

        lockedBy:
          workerId,

        nextAttemptAt:
          null,
      },
    });


    const reconciliationFailure =
      await markPortalPublishJobFailed({
        jobId:
          reconciliationJob.id,

        workerId,

        errorCode:
          "PORTAL_RECONCILIATION_REQUIRED",

        errorMessage:
          "Synthetic ambiguous provider result.",

        requiresReconciliation:
          true,
      });


    assertSelftest(
      reconciliationFailure.count ===
        1,
      "Reconciliation Failure konnte Job nicht aktualisieren."
    );


    const reconciliation =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            reconciliationJob.id,
        },

        select: {
          status:
            true,

          nextAttemptAt:
            true,

          providerOperationState:
            true,
        },
      });


    assertSelftest(
      reconciliation.status ===
        "failed",
      "Reconciliation Job ist nicht failed."
    );

    assertSelftest(
      reconciliation.nextAttemptAt ===
        null,
      "Reconciliation Job darf keinen automatischen Retry haben."
    );

    assertSelftest(
      reconciliation.providerOperationState ===
        "reconciliation_required",
      "Reconciliation State fehlt."
    );


    checks.push({
      name:
        "reconciliation_quarantine",

      passed:
        true,
    });


    /*
     * TEST 4
     * Worker Ownership:
     * Falscher Worker darf einen Job
     * NICHT als erfolgreich markieren.
     */
    const ownershipJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          connection.id,

        externalObjectId:
          "selftest-object-ownership",

        payloadSnapshot: {
          selftest:
            true,

          case:
            "worker_ownership",
        },
      });


    await prisma.portalPublishJob.update({
      where: {
        id:
          ownershipJob.id,
      },

      data: {
        status:
          "processing",

        attemptCount:
          1,

        lockedAt:
          new Date(),

        lockedBy:
          workerId,

        nextAttemptAt:
          null,
      },
    });


    const wrongWorkerResult =
      await markPortalPublishJobSucceeded({
        jobId:
          ownershipJob.id,

        workerId:
          `${workerId}-wrong`,

        externalPublicationId:
          "selftest-publication-wrong",
      });


    assertSelftest(
      wrongWorkerResult.count ===
        0,
      "Falscher Worker konnte Job verändern."
    );


    const correctWorkerResult =
      await markPortalPublishJobSucceeded({
        jobId:
          ownershipJob.id,

        workerId,

        externalPublicationId:
          "selftest-publication-correct",

        resultSnapshot: {
          selftest:
            true,

          case:
            "worker_ownership",

          result:
            "success",
        },
      });


    assertSelftest(
      correctWorkerResult.count ===
        1,
      "Richtiger Worker konnte Job nicht abschliessen."
    );


    const succeeded =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            ownershipJob.id,
        },

        select: {
          status:
            true,

          lockedBy:
            true,

          lockedAt:
            true,

          nextAttemptAt:
            true,

          providerOperationState:
            true,
        },
      });


    assertSelftest(
      succeeded.status ===
        "succeeded",
      "Job wurde nicht succeeded."
    );

    assertSelftest(
      succeeded.lockedBy ===
        null &&
      succeeded.lockedAt ===
        null,
      "Worker Lock wurde nach Success nicht entfernt."
    );

    assertSelftest(
      succeeded.nextAttemptAt ===
        null,
      "Succeeded Job darf keinen Retry besitzen."
    );

    assertSelftest(
      succeeded.providerOperationState ===
        "completed",
      "Provider Operation State ist nicht completed."
    );


    checks.push({
      name:
        "worker_lock_ownership",

      passed:
        true,
    });


    /*
     * TEST 5
     * Max Attempts:
     * Bei ausgeschöpften Versuchen darf
     * kein weiterer Retry geplant werden.
     */
    const exhaustedJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          connection.id,

        externalObjectId:
          "selftest-object-exhausted",

        maxAttempts:
          1,

        payloadSnapshot: {
          selftest:
            true,

          case:
            "max_attempts",
        },
      });


    await prisma.portalPublishJob.update({
      where: {
        id:
          exhaustedJob.id,
      },

      data: {
        status:
          "processing",

        attemptCount:
          1,

        lockedAt:
          new Date(),

        lockedBy:
          workerId,

        nextAttemptAt:
          null,
      },
    });


    const exhaustedFailure =
      await markPortalPublishJobFailed({
        jobId:
          exhaustedJob.id,

        workerId,

        errorCode:
          "SELFTEST_EXHAUSTED",

        errorMessage:
          "Synthetic exhausted selftest error.",
      });


    assertSelftest(
      exhaustedFailure.count ===
        1,
      "Exhausted Failure konnte Job nicht aktualisieren."
    );


    const exhausted =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            exhaustedJob.id,
        },

        select: {
          status:
            true,

          nextAttemptAt:
            true,

          attemptCount:
            true,

          maxAttempts:
            true,
        },
      });


    assertSelftest(
      exhausted.status ===
        "failed",
      "Exhausted Job ist nicht failed."
    );

    assertSelftest(
      exhausted.nextAttemptAt ===
        null,
      "Exhausted Job darf keinen Retry besitzen."
    );

    assertSelftest(
      exhausted.attemptCount >=
        exhausted.maxAttempts,
      "Max-Attempts Testzustand ist ungültig."
    );


    checks.push({
      name:
        "max_attempts_terminal",

      passed:
        true,
    });


    const selftestRows =
      await prisma.portalPublishJob.count({
        where: {
          listingId:
            listing.id,

          environment:
            SELFTEST_ENVIRONMENT,
        },
      });


    assertSelftest(
      selftestRows ===
        5,
      `Unerwartete Anzahl Selftest Jobs: ${selftestRows}`
    );


    return {
      success:
        true,

      version:
        "portal-publish-selftest-v1",

      environment:
        SELFTEST_ENVIRONMENT,

      portal,

      checks,

      passed:
        checks.filter(
          (
            check
          ) =>
            check.passed
        ).length,

      total:
        checks.length,

      launchStatisticsAffected:
        false,

      externalPortalCalled:
        false,

      productionTransportUsed:
        false,

      cleanupRequired:
        true,
    };
  }
  finally {

    /*
     * Immer aufräumen.
     *
     * Der bereits bestehende *.invalid
     * Selftest-User bleibt bewusst bestehen.
     */
    if (listingId) {

      await prisma.portalPublishJob.deleteMany({
        where: {
          listingId,
        },
      });
    }


    if (connectionId) {

      await prisma.portalConnection.deleteMany({
        where: {
          id:
            connectionId,

          environment:
            SELFTEST_ENVIRONMENT,
        },
      });
    }


    if (listingId) {

      await prisma.listing.deleteMany({
        where: {
          id:
            listingId,

          userId:
            user.id,
        },
      });
    }
  }
}