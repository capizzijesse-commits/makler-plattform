import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  prisma,
} from "@/lib/prisma";

import {
  claimDuePortalPublishJobs,
  createPortalPublishJob,
  markPortalPublishJobSucceeded,
  recoverStalePortalPublishJobs,
} from "@/lib/portal-integrations/portal-publish-job-store.server";


const SELFTEST_ENVIRONMENT =
  "selftest";

const CONTROL_ENVIRONMENT =
  "control-selftest";


function assertSelftest(
  condition:
    unknown,
  message:
    string
):
  asserts condition {

  if (!condition) {

    throw new Error(
      `PORTAL_WORKER_SELFTEST_ASSERTION_FAILED: ${message}`
    );
  }
}


export async function runPortalPublishWorkerSelftestV2() {

  if (
    process.env.NODE_ENV ===
    "production"
  ) {

    throw new Error(
      "PORTAL_WORKER_SELFTEST_PRODUCTION_BLOCKED"
    );
  }


  const runId =
    randomUUID();

  const workerId =
    `worker-selftest-${runId}`;

  const now =
    new Date(
      Date.now() +
      5_000
    );

  const staleAt =
    new Date(
      now.getTime() -
      5 * 60_000
    );


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

  const connectionIds:
    string[] =
      [];


  const checks:
    Array<{
      name:
        string;

      passed:
        boolean;
    }> =
      [];


  try {

    const listing =
      await prisma.listing.create({
        data: {
          userId:
            user.id,

          projectName:
            `Portal Worker Selftest ${runId}`,

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


    const selftestConnection =
      await prisma.portalConnection.create({
        data: {
          userId:
            user.id,

          provider:
            "selftest",

          portal:
            `worker_selftest_${runId}`,

          environment:
            SELFTEST_ENVIRONMENT,

          status:
            "verified",

          credentialSource:
            "selftest",

          lastVerifiedAt:
            now,
        },

        select: {
          id:
            true,
        },
      });

    connectionIds.push(
      selftestConnection.id
    );


    const controlConnection =
      await prisma.portalConnection.create({
        data: {
          userId:
            user.id,

          provider:
            "selftest-control",

          portal:
            `worker_control_${runId}`,

          environment:
            CONTROL_ENVIRONMENT,

          status:
            "verified",

          credentialSource:
            "selftest",

          lastVerifiedAt:
            now,
        },

        select: {
          id:
            true,
        },
      });

    connectionIds.push(
      controlConnection.id
    );


    /*
     * TEST 1:
     * Nur selftest darf geclaimt werden.
     */
    const scopedJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          selftestConnection.id,

        externalObjectId:
          `claim-selftest-${runId}`,

        payloadSnapshot: {
          selftest:
            true,

          case:
            "environment_claim_scope",
        },
      });


    /*
     * TEST 2:
     * Dieser Job liegt absichtlich
     * in einem anderen Environment.
     */
    const controlQueuedJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          controlConnection.id,

        externalObjectId:
          `claim-control-${runId}`,

        payloadSnapshot: {
          selftest:
            true,

          case:
            "control_environment_claim",
        },
      });


    const claimed =
      await claimDuePortalPublishJobs({
        workerId,

        limit:
          25,

        now,

        environment:
          SELFTEST_ENVIRONMENT,
      });


    assertSelftest(
      claimed.length ===
        1,
      `Erwartet 1 Claim, erhalten ${claimed.length}.`
    );

    assertSelftest(
      claimed[0]?.id ===
        scopedJob.id,
      "Falscher Job wurde geclaimt."
    );

    assertSelftest(
      claimed[0]?.environment ===
        SELFTEST_ENVIRONMENT,
      "Geclaimter Job hat falsches Environment."
    );


    checks.push({
      name:
        "scoped_claim_only_selftest",

      passed:
        true,
    });


    const controlQueuedAfter =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            controlQueuedJob.id,
        },

        select: {
          status:
            true,

          attemptCount:
            true,

          lockedAt:
            true,

          lockedBy:
            true,
        },
      });


    assertSelftest(
      controlQueuedAfter.status ===
        "queued",
      "Control Job Status wurde verändert."
    );

    assertSelftest(
      controlQueuedAfter.attemptCount ===
        0,
      "Control Job attemptCount wurde verändert."
    );

    assertSelftest(
      controlQueuedAfter.lockedAt ===
        null &&
      controlQueuedAfter.lockedBy ===
        null,
      "Control Job wurde gelockt."
    );


    checks.push({
      name:
        "control_claim_untouched",

      passed:
        true,
    });


    const finishScoped =
      await markPortalPublishJobSucceeded({
        jobId:
          scopedJob.id,

        workerId,

        externalPublicationId:
          `selftest-success-${runId}`,

        resultSnapshot: {
          selftest:
            true,

          result:
            "success",
        },
      });


    assertSelftest(
      finishScoped.count ===
        1,
      "Selftest Claim konnte nicht abgeschlossen werden."
    );


    /*
     * TEST 3:
     * Stale Lock vor Provider-Operation
     * => retryable.
     */
    const staleRetryJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          selftestConnection.id,

        externalObjectId:
          `stale-retry-${runId}`,

        payloadSnapshot: {
          selftest:
            true,

          case:
            "stale_before_operation",
        },
      });


    await prisma.portalPublishJob.update({
      where: {
        id:
          staleRetryJob.id,
      },

      data: {
        status:
          "processing",

        attemptCount:
          1,

        lockedAt:
          staleAt,

        lockedBy:
          `stale-worker-${runId}`,

        nextAttemptAt:
          null,

        providerOperationId:
          null,

        providerOperationState:
          null,
      },
    });


    const retryRecovery =
      await recoverStalePortalPublishJobs({
        now,

        lockTtlMs:
          60_000,

        environment:
          SELFTEST_ENVIRONMENT,
      });


    assertSelftest(
      retryRecovery.retryable ===
        1,
      `Erwartet 1 retryable Recovery, erhalten ${retryRecovery.retryable}.`
    );


    const staleRetryAfter =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            staleRetryJob.id,
        },

        select: {
          status:
            true,

          errorCode:
            true,

          nextAttemptAt:
            true,

          lockedAt:
            true,

          lockedBy:
            true,

          providerOperationState:
            true,
        },
      });


    assertSelftest(
      staleRetryAfter.status ===
        "failed",
      "Stale Retry Job ist nicht failed."
    );

    assertSelftest(
      staleRetryAfter.errorCode ===
        "WORKER_LOCK_STALE",
      "Stale Retry Job hat falschen ErrorCode."
    );

    assertSelftest(
      staleRetryAfter.nextAttemptAt !==
        null,
      "Stale Retry Job erhielt keinen Retry."
    );

    assertSelftest(
      staleRetryAfter.lockedAt ===
        null &&
      staleRetryAfter.lockedBy ===
        null,
      "Stale Retry Lock wurde nicht entfernt."
    );

    assertSelftest(
      staleRetryAfter.providerOperationState ===
        null,
      "Stale Retry Job ging fälschlich in Reconciliation."
    );


    checks.push({
      name:
        "stale_before_operation_retry",

      passed:
        true,
    });


    /*
     * Retry aus dem Weg stellen,
     * damit spätere Tests isoliert bleiben.
     */
    await prisma.portalPublishJob.update({
      where: {
        id:
          staleRetryJob.id,
      },

      data: {
        nextAttemptAt:
          new Date(
            now.getTime() +
            24 * 60 * 60_000
          ),
      },
    });


    /*
     * TEST 4:
     * Stale Lock nach Provider-Operation
     * => Reconciliation, kein Blind-Retry.
     */
    const ambiguousJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          selftestConnection.id,

        externalObjectId:
          `ambiguous-${runId}`,

        payloadSnapshot: {
          selftest:
            true,

          case:
            "stale_after_operation",
        },
      });


    await prisma.portalPublishJob.update({
      where: {
        id:
          ambiguousJob.id,
      },

      data: {
        status:
          "processing",

        attemptCount:
          1,

        lockedAt:
          staleAt,

        lockedBy:
          `ambiguous-worker-${runId}`,

        nextAttemptAt:
          null,

        providerOperationId:
          `provider-op-${runId}`,

        providerOperationState:
          "started",

        providerOperationUpdatedAt:
          staleAt,
      },
    });


    const ambiguousRecovery =
      await recoverStalePortalPublishJobs({
        now,

        lockTtlMs:
          60_000,

        environment:
          SELFTEST_ENVIRONMENT,
      });


    assertSelftest(
      ambiguousRecovery.ambiguous ===
        1,
      `Erwartet 1 ambiguous Recovery, erhalten ${ambiguousRecovery.ambiguous}.`
    );


    const ambiguousAfter =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            ambiguousJob.id,
        },

        select: {
          status:
            true,

          errorCode:
            true,

          nextAttemptAt:
            true,

          lockedAt:
            true,

          lockedBy:
            true,

          providerOperationState:
            true,
        },
      });


    assertSelftest(
      ambiguousAfter.status ===
        "failed",
      "Ambiguous Job ist nicht failed."
    );

    assertSelftest(
      ambiguousAfter.errorCode ===
        "PORTAL_OPERATION_AMBIGUOUS",
      "Ambiguous Job hat falschen ErrorCode."
    );

    assertSelftest(
      ambiguousAfter.nextAttemptAt ===
        null,
      "Ambiguous Job darf keinen Retry besitzen."
    );

    assertSelftest(
      ambiguousAfter.providerOperationState ===
        "reconciliation_required",
      "Ambiguous Job ging nicht in Reconciliation."
    );

    assertSelftest(
      ambiguousAfter.lockedAt ===
        null &&
      ambiguousAfter.lockedBy ===
        null,
      "Ambiguous Job Lock wurde nicht entfernt."
    );


    checks.push({
      name:
        "stale_after_operation_reconciliation",

      passed:
        true,
    });


    /*
     * TEST 5:
     * MaxAttempts erreicht => terminal.
     */
    const exhaustedJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          selftestConnection.id,

        externalObjectId:
          `exhausted-${runId}`,

        maxAttempts:
          1,

        payloadSnapshot: {
          selftest:
            true,

          case:
            "stale_exhausted",
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
          staleAt,

        lockedBy:
          `exhausted-worker-${runId}`,

        nextAttemptAt:
          null,

        providerOperationId:
          null,

        providerOperationState:
          null,
      },
    });


    const exhaustedRecovery =
      await recoverStalePortalPublishJobs({
        now,

        lockTtlMs:
          60_000,

        environment:
          SELFTEST_ENVIRONMENT,
      });


    assertSelftest(
      exhaustedRecovery.exhausted ===
        1,
      `Erwartet 1 exhausted Recovery, erhalten ${exhaustedRecovery.exhausted}.`
    );


    const exhaustedAfter =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            exhaustedJob.id,
        },

        select: {
          status:
            true,

          errorCode:
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
      exhaustedAfter.status ===
        "failed",
      "Exhausted Job ist nicht failed."
    );

    assertSelftest(
      exhaustedAfter.errorCode ===
        "WORKER_LOCK_STALE",
      "Exhausted Job hat falschen ErrorCode."
    );

    assertSelftest(
      exhaustedAfter.nextAttemptAt ===
        null,
      "Exhausted Job darf keinen Retry besitzen."
    );

    assertSelftest(
      exhaustedAfter.attemptCount >=
        exhaustedAfter.maxAttempts,
      "MaxAttempts nicht erreicht."
    );


    checks.push({
      name:
        "stale_max_attempts_terminal",

      passed:
        true,
    });


    /*
     * TEST 6:
     * Stale Control Job in anderem
     * Environment muss unangetastet bleiben.
     */
    const controlStaleJob =
      await createPortalPublishJob({
        userId:
          user.id,

        listingId:
          listing.id,

        connectionId:
          controlConnection.id,

        externalObjectId:
          `control-stale-${runId}`,

        payloadSnapshot: {
          selftest:
            true,

          case:
            "recovery_environment_isolation",
        },
      });


    const controlWorker =
      `control-worker-${runId}`;


    await prisma.portalPublishJob.update({
      where: {
        id:
          controlStaleJob.id,
      },

      data: {
        status:
          "processing",

        attemptCount:
          1,

        lockedAt:
          staleAt,

        lockedBy:
          controlWorker,

        nextAttemptAt:
          null,

        providerOperationId:
          `control-provider-op-${runId}`,

        providerOperationState:
          "started",

        providerOperationUpdatedAt:
          staleAt,
      },
    });


    const isolatedRecovery =
      await recoverStalePortalPublishJobs({
        now:
          new Date(
            now.getTime() +
            1_000
          ),

        lockTtlMs:
          60_000,

        environment:
          SELFTEST_ENVIRONMENT,
      });


    assertSelftest(
      isolatedRecovery.total ===
        0,
      `Selftest Recovery veränderte unerwartete Jobs: ${isolatedRecovery.total}`
    );


    const controlStaleAfter =
      await prisma.portalPublishJob.findUniqueOrThrow({
        where: {
          id:
            controlStaleJob.id,
        },

        select: {
          environment:
            true,

          status:
            true,

          attemptCount:
            true,

          lockedAt:
            true,

          lockedBy:
            true,

          providerOperationId:
            true,

          providerOperationState:
            true,
        },
      });


    assertSelftest(
      controlStaleAfter.environment ===
        CONTROL_ENVIRONMENT,
      "Control Environment wurde verändert."
    );

    assertSelftest(
      controlStaleAfter.status ===
        "processing",
      "Control Stale Job wurde verändert."
    );

    assertSelftest(
      controlStaleAfter.attemptCount ===
        1,
      "Control attemptCount wurde verändert."
    );

    assertSelftest(
      controlStaleAfter.lockedBy ===
        controlWorker,
      "Control Lock Owner wurde verändert."
    );

    assertSelftest(
      controlStaleAfter.lockedAt !==
        null,
      "Control Lock wurde entfernt."
    );

    assertSelftest(
      controlStaleAfter.providerOperationId ===
        `control-provider-op-${runId}`,
      "Control Provider Operation ID wurde verändert."
    );

    assertSelftest(
      controlStaleAfter.providerOperationState ===
        "started",
      "Control Provider State wurde verändert."
    );


    checks.push({
      name:
        "stale_recovery_environment_isolation",

      passed:
        true,
    });


    return {
      success:
        true,

      version:
        "portal-publish-worker-selftest-v2",

      environment:
        SELFTEST_ENVIRONMENT,

      controlEnvironment:
        CONTROL_ENVIRONMENT,

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

      actualPortalWorkerTransportExecuted:
        false,

      cleanupRequired:
        true,
    };
  }
  finally {

    if (listingId) {

      await prisma.portalPublishJob.deleteMany({
        where: {
          listingId,
        },
      });
    }


    for (
      const connectionId of
      connectionIds
    ) {

      await prisma.portalConnection.deleteMany({
        where: {
          id:
            connectionId,
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