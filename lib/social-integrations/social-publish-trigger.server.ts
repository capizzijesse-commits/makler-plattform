import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  runSocialPublishWorker,
  type SocialPublishExecutor,
} from "@/lib/social-integrations/social-publish-worker.server";

import {
  inspectSocialPublishActivationGuard,
} from "@/lib/social-integrations/social-publish-activation-guard.server";


function enabled(
  name:
    string
):
  boolean {

  return (
    process.env[
      name
    ]?.trim() ===
    "1"
  );
}


export function getSocialPublishTriggerGates() {

  return {
    queueEnabled:
      enabled(
        "SOCIAL_PUBLISH_QUEUE_ENABLED"
      ),

    workerEnabled:
      enabled(
        "SOCIAL_PUBLISH_WORKER_ENABLED"
      ),

    metaPublishingEnabled:
      enabled(
        "META_PUBLISHING_ENABLED"
      ),
  };
}


export async function runSocialPublishTrigger(
  input: {
    execute:
      SocialPublishExecutor;

    workerId?:
      string;

    limit?:
      number;

    now?:
      Date;
  }
) {

  const gates =
    getSocialPublishTriggerGates();


  /*
   * Der Trigger darf die Queue nur dann
   * berühren, wenn ALLE drei Produktions-
   * Freigaben ausdrücklich aktiv sind.
   */
  if (
    !gates.queueEnabled ||
    !gates.workerEnabled ||
    !gates.metaPublishingEnabled
  ) {

    return {
      enabled:
        false,

      gates,

      workerId:
        null,

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


  const activationGuard =
    await inspectSocialPublishActivationGuard({
      now:
        input.now,
    });


  if (
    !activationGuard.ready
  ) {

    return {
      enabled:
        false,

      gates,

      activationGuard,

      workerId:
        null,

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


  const suppliedWorkerId =
    input.workerId
      ?.trim() ||
    "";


  const workerId =
    suppliedWorkerId ||
    `social-cron-${randomUUID()}`;


  const result =
    await runSocialPublishWorker({
      workerId,

      execute:
        input.execute,

      limit:
        input.limit,

      now:
        input.now,
    });


  return {
    ...result,

    gates,

    activationGuard,

    workerId,
  };
}