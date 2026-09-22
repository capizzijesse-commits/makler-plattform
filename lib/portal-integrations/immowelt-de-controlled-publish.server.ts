import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";


function fail(
  code:
    string,
  message:
    string
):
  never {

  throw Object.assign(
    new Error(
      message
    ),
    {
      code,
    }
  );
}


/*
 * IMMOWELT_DE_CONTROLLED_PUBLISH_V1
 *
 * Worker -> Dispatcher -> Immowelt Gate.
 *
 * Aktueller Stand:
 *
 * - lokales OpenImmo 1.2.7d vorhanden
 * - persistierter Job-Snapshot vorhanden
 * - Partnerzugang fehlt
 * - Transportverfahren ist nicht bestätigt
 * - Transportparameter fehlen
 * - kein Netzwerk
 * - kein Production Publishing
 *
 * Es wird bewusst kein externes
 * Transportverfahren angenommen.
 */
export async function executeImmoweltDeControlledPublishV1(
  job:
    PortalPublishWorkerJob
):
  Promise<
    PortalPublishExecutionResult
  > {

  if (
    job.portal !==
    "immowelt_de"
  ) {

    fail(
      "IMMOWELT_PORTAL_MISMATCH",
      "Controlled Publish wurde für das falsche Portal aufgerufen."
    );
  }


  if (
    job.environment !==
    "test"
  ) {

    fail(
      "IMMOWELT_PRODUCTION_NOT_ENABLED",
      "Immowelt Controlled Publish ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "IMMOWELT_ACTION_NOT_SUPPORTED",
      "Immowelt Controlled Publish V1 unterstützt ausschließlich publish."
    );
  }


  /*
   * PROVIDER GATE
   *
   * Aktueller offizieller Zustand:
   * partner_access_required
   *
   * Ohne bestätigten Partnerzugang,
   * Transportverfahren und konkrete
   * Transportparameter endet der Worker
   * hier vollständig fail-closed.
   */
  fail(
    "IMMOWELT_PARTNER_ACCESS_REQUIRED",
    "Immowelt-Partnerzugang und bestätigtes Transportprofil fehlen."
  );
}