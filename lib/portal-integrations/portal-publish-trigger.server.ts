import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  runPortalPublishWorker,
  type PortalPublishExecutor,
} from "@/lib/portal-integrations/portal-publish-worker.server";


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


export function getPortalPublishTriggerGates() {

  return {
    queueEnabled:
      enabled(
        "PORTAL_PUBLISH_QUEUE_ENABLED"
      ),

    workerEnabled:
      enabled(
        "PORTAL_PUBLISH_WORKER_ENABLED"
      ),

    externalTransportEnabled:
      enabled(
        "PORTAL_EXTERNAL_TRANSPORT_ENABLED"
      ),
  };
}


export async function runPortalPublishTrigger(
  input: {
    execute:
      PortalPublishExecutor;

    workerId?:
      string;

    limit?:
      number;

    now?:
      Date;
  }
) {

  const gates =
    getPortalPublishTriggerGates();


  /*
   * HARD FAIL-CLOSED:
   *
   * Die Queue wird NICHT geclaimt,
   * solange nicht alle drei Ebenen
   * ausdrücklich freigegeben sind.
   */
  if (
    !gates.queueEnabled ||
    !gates.workerEnabled ||
    !gates.externalTransportEnabled
  ) {

    return {
      enabled:
        false,

      gates,

      workerId:
        null,

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


  const suppliedWorkerId =
    input.workerId
      ?.trim() ||
    "";


  const workerId =
    suppliedWorkerId ||
    `portal-cron-${randomUUID()}`;


  const result =
    await runPortalPublishWorker({
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

    workerId,
  };
}