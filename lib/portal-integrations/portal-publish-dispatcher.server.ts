import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";

import {
  buildKleinanzeigenDeLocalTransferArtifactV1,
  type KleinanzeigenDeOpenImmoProvider,
} from "@/lib/portal-integrations/kleinanzeigen-de-transport-foundation.server";


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


export function isPortalPublishTransportImplemented(
  _portal:
    string
):
  boolean {

  /*
   * WICHTIG:
   *
   * Eine lokale Dry-Run-Foundation
   * ist noch KEIN implementierter
   * externer Portaltransport.
   *
   * Der Launch-Gate muss daher
   * weiterhin fail-closed bleiben.
   */
  return false;
}


export type PortalPublishDryRunOptions = {
  kleinanzeigenProvider:
    KleinanzeigenDeOpenImmoProvider;
};


export async function executePortalPublishJobDryRun(
  job:
    PortalPublishWorkerJob,

  input:
    PortalPublishDryRunOptions
):
  Promise<
    PortalPublishExecutionResult
  > {

  switch (
    job.portal
  ) {

    case "kleinanzeigen_de": {

      /*
       * Dry-Run ist ausschließlich
       * im Test-Environment erlaubt.
       *
       * Kein Production Dry-Run.
       * Kein FTP.
       * Kein Netzwerk.
       */
      if (
        job.environment !==
        "test"
      ) {

        throw dispatcherError(
          "PORTAL_PRODUCTION_NOT_ENABLED",
          "Kleinanzeigen DE Dry-Run ist ausschließlich im Testmodus erlaubt."
        );
      }


      const artifact =
        buildKleinanzeigenDeLocalTransferArtifactV1({
          job,

          provider:
            input.kleinanzeigenProvider,
        });


      /*
       * XML selbst wird NICHT als
       * Worker-Ergebnis gespeichert.
       *
       * Persistiert werden ausschließlich
       * kleine, nicht-sensitive Metadaten.
       */
      return {
        resultSnapshot: {
          dryRun:
            true,

          portal:
            artifact.portal,

          environment:
            artifact.environment,

          action:
            artifact.action,

          mode:
            artifact.mode,

          networkAttempted:
            artifact.networkAttempted,

          productionEnabled:
            artifact.productionEnabled,

          listingId:
            artifact.listingId,

          standard:
            artifact.standard,

          minimumOpenImmoVersion:
            artifact.minimumOpenImmoVersion,

          fileName:
            artifact.fileName,

          sha256:
            artifact.sha256,
        },
      };
    }


    case "immoscout24_de":
    case "immowelt_de":
    case "wg_gesucht_de":
    case "immobilien_de":
    case "immoscout24_ch":
    case "homegate_ch":
    case "comparis_ch":
    case "flatfox_ch":
    case "newhome_ch":

      throw dispatcherError(
        "PORTAL_TRANSPORT_NOT_ENABLED",
        `Dry-run transport is not enabled for ${job.portal}.`
      );


    default:

      throw dispatcherError(
        "PORTAL_PROVIDER_UNSUPPORTED",
        `Unsupported portal: ${job.portal}`
      );
  }
}


export async function executePortalPublishJob(
  job:
    PortalPublishWorkerJob
):
  Promise<
    PortalPublishExecutionResult
  > {

  /*
   * Echter Dispatcher bleibt
   * vollständig gesperrt.
   *
   * Der Dry-Run oben wird NICHT
   * automatisch von diesem
   * Production-Executor aufgerufen.
   */
  switch (
    job.portal
  ) {

    case "immoscout24_de":
    case "immowelt_de":
    case "kleinanzeigen_de":
    case "wg_gesucht_de":
    case "immobilien_de":
    case "immoscout24_ch":
    case "homegate_ch":
    case "comparis_ch":
    case "flatfox_ch":
    case "newhome_ch":

      throw dispatcherError(
        "PORTAL_TRANSPORT_NOT_ENABLED",
        `Portal transport is not enabled for ${job.portal}.`
      );


    default:

      throw dispatcherError(
        "PORTAL_PROVIDER_UNSUPPORTED",
        `Unsupported portal: ${job.portal}`
      );
  }
}
