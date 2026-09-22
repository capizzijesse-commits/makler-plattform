import "server-only";

import type {
  Prisma,
} from "@prisma/client";

import {
  BROKER_MARKETING_APPROVAL_REQUIRED,
  isBrokerMarketingApproved,
} from "@/lib/broker-workflow/marketing-approval-guard.server";

import {
  claimDuePortalPublishJobs,
  markPortalPublishJobFailed,
  markPortalPublishJobSucceeded,
} from "@/lib/portal-integrations/portal-publish-job-store.server";


export type PortalPublishWorkerJob = Awaited<
  ReturnType<
    typeof claimDuePortalPublishJobs
  >
>[number];


export type PortalPublishExecutionResult = {
  externalObjectId?:
    string |
    null;

  externalPublicationId?:
    string |
    null;

  externalPublicationUrl?:
    string |
    null;

  resultSnapshot?:
    Prisma.InputJsonValue |
    null;
};


export type PortalPublishExecutor = (
  job:
    PortalPublishWorkerJob
) =>
  Promise<
    PortalPublishExecutionResult
  >;


export type PortalPublishWorkerResult = {
  enabled:
    boolean;

  claimed:
    number;

  succeeded:
    number;

  failed:
    number;

  results:
    Array<{
      jobId:
        string;

      portal:
        string;

      status:
        | "succeeded"
        | "failed";

      errorCode?:
        string;
    }>;
};


export function isPortalPublishWorkerEnabled():
  boolean {

  return (
    process.env
      .PORTAL_PUBLISH_WORKER_ENABLED
      ?.trim() ===
    "1"
  );
}


function safeErrorCode(
  error:
    unknown
):
  string {

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (
      error as {
        code?: unknown;
      }
    ).code === "string"
  ) {

    const code =
      (
        error as {
          code:
            string;
        }
      ).code
        .trim()
        .slice(
          0,
          100
        );

    if (code) {
      return code;
    }
  }

  return "PORTAL_PUBLISH_FAILED";
}


function safeErrorMessage(
  error:
    unknown
):
  string {

  const value =
    error instanceof Error
      ? error.message
      : "Unknown portal publishing error.";

  return value
    .trim()
    .slice(
      0,
      2000
    ) ||
    "Unknown portal publishing error.";
}


const NON_RETRYABLE_PORTAL_ERROR_CODES =
  new Set([
    "PORTAL_TRANSPORT_NOT_ENABLED",
    "PORTAL_PROVIDER_UNSUPPORTED",
    "PORTAL_PRODUCTION_NOT_ENABLED",
    "PORTAL_CONNECTION_NOT_READY",

    "IMMOSCOUT24_DE_PROVIDER_APPROVAL_REQUIRED",
    "IMMOSCOUT24_DE_CONTROLLED_PUBLISH_DISABLED",
    "IMMOSCOUT24_DE_OBJECT_ID_REQUIRED",
    "IMMOSCOUT24_DE_CONTROLLED_OBJECT_MISMATCH",
    "IMMOSCOUT24_DE_OAUTH_ACCESS_REQUIRED",
    "IMMOSCOUT24_DE_OBJECT_READ_FAILED",
    "IMMOSCOUT24_DE_OBJECT_IDENTITY_MISMATCH",
    "IMMOSCOUT24_DE_CHANNEL_READ_FAILED",
    "IMMOSCOUT24_DE_CHANNEL_NOT_AVAILABLE",
    "IMMOSCOUT24_DE_PUBLISH_REJECTED",

    "PORTAL_RECONCILIATION_REQUIRED",
    BROKER_MARKETING_APPROVAL_REQUIRED,
  ]);


function isNonRetryablePortalError(
  errorCode:
    string
):
  boolean {

  return NON_RETRYABLE_PORTAL_ERROR_CODES
    .has(
      errorCode
    );
}


function requiresReconciliation(
  errorCode:
    string
):
  boolean {

  return (
    errorCode ===
      "PORTAL_RECONCILIATION_REQUIRED"
  );
}


export async function runPortalPublishWorker(
  input: {
    workerId:
      string;

    execute:
      PortalPublishExecutor;

    limit?:
      number;

    now?:
      Date;

    environment?:
      string;
  }
):
  Promise<
    PortalPublishWorkerResult
  > {

  if (
    !isPortalPublishWorkerEnabled()
  ) {
    return {
      enabled:
        false,

      claimed:
        0,

      succeeded:
        0,

      failed:
        0,

      results:
        [],
    };
  }


  const workerId =
    input.workerId.trim();

  if (!workerId) {
    throw new Error(
      "Worker ID must not be empty."
    );
  }


  const now =
    input.now ??
    new Date();


  const jobs =
    await claimDuePortalPublishJobs({
      workerId,

      limit:
        input.limit,

      now,

      environment:
        input.environment,
    });


  let succeeded =
    0;

  let failed =
    0;


  const results:
    PortalPublishWorkerResult["results"] =
      [];


  for (
    const job of
    jobs
  ) {

    try {

      /*
       * SECOND APPROVAL GATE:
       * Direkt vor dem externen Executor
       * nochmals den aktuellen Workflow
       * aus der DB pruefen.
       */
      const marketingApproved =
        job.listingId
          ? await isBrokerMarketingApproved({
              userId:
                job.userId,

              listingId:
                job.listingId,
            })
          : false;


      if (!marketingApproved) {

        throw Object.assign(
          new Error(
            "Broker marketing approval is required before portal publishing."
          ),
          {
            code:
              BROKER_MARKETING_APPROVAL_REQUIRED,
          }
        );
      }


      const execution =
        await input.execute(
          job
        );


      const result =
        await markPortalPublishJobSucceeded({
          jobId:
            job.id,

          workerId,

          externalObjectId:
            execution.externalObjectId,

          externalPublicationId:
            execution.externalPublicationId,

          externalPublicationUrl:
            execution.externalPublicationUrl,

          resultSnapshot:
            execution.resultSnapshot,
        });


      if (
        result.count !==
        1
      ) {
        throw Object.assign(
          new Error(
            "Worker lost ownership of portal publish job."
          ),
          {
            code:
              "WORKER_LOCK_LOST",
          }
        );
      }


      succeeded +=
        1;


      results.push({
        jobId:
          job.id,

        portal:
          job.portal,

        status:
          "succeeded",
      });
    }
    catch (
      error
    ) {

      const errorCode =
        safeErrorCode(
          error
        );

      const errorMessage =
        safeErrorMessage(
          error
        );

      const reconciliationRequired =
        requiresReconciliation(
          errorCode
        );


      const failure =
        await markPortalPublishJobFailed({
          jobId:
            job.id,

          workerId,

          errorCode,

          errorMessage,

          retryAt:
            isNonRetryablePortalError(
              errorCode
            )
              ? null
              : undefined,

          requiresReconciliation:
            reconciliationRequired,
        });


      if (
        failure.count !==
        1
      ) {

        failed +=
          1;

        results.push({
          jobId:
            job.id,

          portal:
            job.portal,

          status:
            "failed",

          errorCode:
            "WORKER_LOCK_LOST",
        });

        continue;
      }


      failed +=
        1;


      results.push({
        jobId:
          job.id,

        portal:
          job.portal,

        status:
          "failed",

        errorCode,
      });
    }
  }


  return {
    enabled:
      true,

    claimed:
      jobs.length,

    succeeded,

    failed,

    results,
  };
}