import "server-only";

import {
  claimDueSocialPublishJobs,
  markSocialPublishJobFailed,
  markSocialPublishJobPublished,
} from "@/lib/social-integrations/social-publish-job-store.server";


export type SocialPublishWorkerJob = Awaited<
  ReturnType<
    typeof claimDueSocialPublishJobs
  >
>[number];


export type SocialPublishExecutionResult = {
  externalPostId?:
    string |
    null;

  externalPostUrl?:
    string |
    null;
};


export type SocialPublishExecutor = (
  job:
    SocialPublishWorkerJob
) =>
  Promise<
    SocialPublishExecutionResult
  >;


export type SocialPublishWorkerResult = {
  enabled:
    boolean;

  claimed:
    number;

  published:
    number;

  failed:
    number;

  results:
    Array<{
      jobId:
        string;

      status:
        "published" |
        "failed";

      errorCode?:
        string;
    }>;
};


export function isSocialPublishWorkerEnabled():
  boolean {

  return (
    process.env
      .SOCIAL_PUBLISH_WORKER_ENABLED
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
    typeof error ===
      "object" &&
    "code" in error &&
    typeof (
      error as {
        code?: unknown;
      }
    ).code ===
      "string"
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


  return "SOCIAL_PUBLISH_FAILED";
}


function safeErrorMessage(
  error:
    unknown
):
  string {

  const value =
    error instanceof Error
      ? error.message
      : "Unknown social publishing error.";


  return value
    .trim()
    .slice(
      0,
      2000
    ) ||
    "Unknown social publishing error.";
}


function retryDelayMilliseconds(
  attemptCount:
    number
):
  number {

  /*
   * Retry:
   * Versuch 1 -> +1 Minute
   * Versuch 2 -> +5 Minuten
   * weitere  -> +15 Minuten
   */
  if (
    attemptCount <=
    1
  ) {
    return 60_000;
  }


  if (
    attemptCount ===
    2
  ) {
    return 5 * 60_000;
  }


  return 15 * 60_000;
}


function retryAtForJob(
  job:
    SocialPublishWorkerJob,
  now:
    Date
):
  Date |
  null {

  if (
    job.attemptCount >=
    job.maxAttempts
  ) {
    return null;
  }


  return new Date(
    now.getTime() +
    retryDelayMilliseconds(
      job.attemptCount
    )
  );
}


const NON_RETRYABLE_SOCIAL_PUBLISH_ERROR_CODES =
  new Set([
    "META_IG_RECONCILIATION_REQUIRED",
    "META_IG_PUBLISH_RESULT_AMBIGUOUS",
    "META_IG_OPERATION_STATE_INCOMPLETE",
    "META_IG_OPERATION_TYPE_MISMATCH",
    "META_IG_OPERATION_STATE_UNKNOWN",
    "META_IG_MEDIA_ID_MISSING_AFTER_PUBLISH",
    "LINKEDIN_PUBLISH_NOT_IMPLEMENTED",
    "TIKTOK_PUBLISH_NOT_IMPLEMENTED",
    "SOCIAL_PROVIDER_UNSUPPORTED",
  ]);


function isNonRetryableSocialPublishErrorCode(
  errorCode:
    string
):
  boolean {

  return NON_RETRYABLE_SOCIAL_PUBLISH_ERROR_CODES
    .has(
      errorCode
    );
}


export async function runSocialPublishWorker(
  input: {
    workerId:
      string;

    execute:
      SocialPublishExecutor;

    limit?:
      number;

    now?:
      Date;
  }
):
  Promise<
    SocialPublishWorkerResult
  > {

  /*
   * Ohne explizites ENV-Flag darf
   * dieser Worker keine Queue anfassen.
   */
  if (
    !isSocialPublishWorkerEnabled()
  ) {

    return {
      enabled:
        false,

      claimed:
        0,

      published:
        0,

      failed:
        0,

      results:
        [],
    };
  }


  const workerId =
    input.workerId
      .trim();


  if (!workerId) {

    throw new Error(
      "Worker ID must not be empty."
    );
  }


  const now =
    input.now ??
    new Date();


  const jobs =
    await claimDueSocialPublishJobs({
      workerId,

      limit:
        input.limit,

      now,
    });


  let published =
    0;

  let failed =
    0;


  const results:
    SocialPublishWorkerResult[
      "results"
    ] =
      [];


  for (
    const job of
    jobs
  ) {

    try {

      /*
       * Der echte Provider-Aufruf wird
       * bewusst von außen injiziert.
       *
       * Der Worker selbst kennt weder
       * Meta noch LinkedIn noch TikTok.
       */
      const execution =
        await input.execute(
          job
        );


      const result =
        await markSocialPublishJobPublished({
          jobId:
            job.id,

          workerId,

          externalPostId:
            execution
              .externalPostId,

          externalPostUrl:
            execution
              .externalPostUrl,
        });


      if (
        result.count !==
        1
      ) {

        throw Object.assign(
          new Error(
            "Worker lost ownership of publish job."
          ),
          {
            code:
              "WORKER_LOCK_LOST",
          }
        );
      }


      published +=
        1;


      results.push({
        jobId:
          job.id,

        status:
          "published",
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


      /*
       * Retry immer ab dem tatsächlichen
       * Fehlerzeitpunkt berechnen, nicht
       * ab Worker-Start.
       */
      const retryAt =
        isNonRetryableSocialPublishErrorCode(
          errorCode
        )
          ? null
          : retryAtForJob(
              job,
              new Date()
            );


      const failureResult =
        await markSocialPublishJobFailed({
          jobId:
            job.id,

          workerId,

          errorCode,

          errorMessage,

          retryAt,
        });


      if (
        failureResult.count !==
        1
      ) {

        failed +=
          1;

        results.push({
          jobId:
            job.id,

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

    published,

    failed,

    results,
  };
}