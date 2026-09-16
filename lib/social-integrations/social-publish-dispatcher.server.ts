import "server-only";

import {
  executeMetaPublishJob,
} from "@/lib/social-integrations/meta-publish-executor.server";

import type {
  SocialPublishExecutionResult,
  SocialPublishWorkerJob,
} from "@/lib/social-integrations/social-publish-worker.server";


function dispatcherError(
  code:
    string,
  message:
    string
):
  Error {

  return Object.assign(
    new Error(
      message
    ),
    {
      code,
    }
  );
}


export function isSocialPublishProviderImplemented(
  provider:
    string
):
  boolean {

  return provider ===
    "meta";
}


export async function executeSocialPublishJob(
  job:
    SocialPublishWorkerJob
):
  Promise<
    SocialPublishExecutionResult
  > {

  switch (
    job.provider
  ) {

    case "meta":

      return executeMetaPublishJob(
        job
      );


    case "linkedin":

      throw dispatcherError(
        "LINKEDIN_PUBLISH_NOT_IMPLEMENTED",
        "LinkedIn publishing is not implemented yet."
      );


    case "tiktok":

      throw dispatcherError(
        "TIKTOK_PUBLISH_NOT_IMPLEMENTED",
        "TikTok publishing is not implemented yet."
      );


    default:

      throw dispatcherError(
        "SOCIAL_PROVIDER_UNSUPPORTED",
        `Unsupported social provider: ${job.provider}`
      );
  }
}