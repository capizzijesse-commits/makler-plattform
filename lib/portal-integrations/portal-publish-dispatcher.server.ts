import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";

import {
  buildKleinanzeigenDeLocalTransferArtifactV1,
  type KleinanzeigenDeOpenImmoProvider,
} from "@/lib/portal-integrations/kleinanzeigen-de-transport-foundation.server";

import {
  buildImmoweltDeLocalTransferArtifactV1,
  type ImmoweltDeOpenImmoProvider,
} from "@/lib/portal-integrations/immowelt-de-transport-foundation.server";

import {
  buildImmobilienDeTransportPreflightV1,
  type ImmobilienDeOpenImmoProvider,
} from "@/lib/portal-integrations/immobilien-de-transport-foundation.server";
import {
  buildWgGesuchtDeTransportPreflightV1,
  type WgGesuchtDeOpenImmoProvider,
} from "@/lib/portal-integrations/wg-gesucht-de-transport-foundation.server";

import {
  buildImmoScout24DeTransportPreflightV1,
} from "@/lib/portal-integrations/immoscout24-de-transport-foundation.server";

import {
  executeImmoScout24DeControlledPublishV1,
} from "@/lib/portal-integrations/immoscout24-de-controlled-publish.server";

import {
  executeKleinanzeigenDeControlledPublishV1,
} from "@/lib/portal-integrations/kleinanzeigen-de-controlled-publish.server";

import {
  executeImmoweltDeControlledPublishV1,
} from "@/lib/portal-integrations/immowelt-de-controlled-publish.server";

import {
  executeImmobilienDeControlledPublishV1,
} from "@/lib/portal-integrations/immobilien-de-controlled-publish.server";

import {
  executeWgGesuchtDeControlledPublishV1,
} from "@/lib/portal-integrations/wg-gesucht-de-controlled-publish.server";


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

  immoweltProvider?:
    ImmoweltDeOpenImmoProvider;

  immobilienDeProvider?:
    ImmobilienDeOpenImmoProvider;

  wgGesuchtDeProvider?:
    WgGesuchtDeOpenImmoProvider;
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
       * Dry-Run ist ausschlieÃŸlich
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
          "Kleinanzeigen DE Dry-Run ist ausschlieÃŸlich im Testmodus erlaubt."
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
       * Persistiert werden ausschlieÃŸlich
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


    case "immowelt_de": {

      /*
       * Immowelt Dry-Run bleibt strikt
       * im Test-Environment.
       *
       * Kein FTP.
       * Kein Netzwerk.
       * Kein Production Publishing.
       */
      if (
        job.environment !==
        "test"
      ) {

        throw dispatcherError(
          "PORTAL_PRODUCTION_NOT_ENABLED",
          "Immowelt DE Dry-Run ist ausschlieÃŸlich im Testmodus erlaubt."
        );
      }


      const provider =
        input.immoweltProvider;


      if (!provider) {

        throw dispatcherError(
          "PORTAL_DRY_RUN_PROVIDER_MISSING",
          "Immowelt OpenImmo Provider-Konfiguration fehlt fÃ¼r den Dry-Run."
        );
      }


      const artifact =
        buildImmoweltDeLocalTransferArtifactV1({
          job,

          provider,
        });


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

          standardRelease:
            artifact.standardRelease,

          xmlVersion:
            artifact.xmlVersion,

          fileName:
            artifact.fileName,

          sha256:
            artifact.sha256,
        },
      };
    }


    case "immobilien_de": {

      /*
       * Immobilien.de bleibt aktuell
       * reiner lokaler Preflight.
       *
       * Kein FTP.
       * Kein Netzwerk.
       * Kein Upload.
       * Kein Production Publishing.
       */
      if (
        job.environment !==
        "test"
      ) {

        throw dispatcherError(
          "PORTAL_PRODUCTION_NOT_ENABLED",
          "Immobilien.de Preflight ist ausschlieÃŸlich im Testmodus erlaubt."
        );
      }


      const provider =
        input.immobilienDeProvider;


      if (!provider) {

        throw dispatcherError(
          "PORTAL_DRY_RUN_PROVIDER_MISSING",
          "Immobilien.de OpenImmo Provider-Konfiguration fehlt fÃ¼r den Preflight."
        );
      }


      const preflight =
        buildImmobilienDeTransportPreflightV1({
          job,

          provider,
        });


      return {
        resultSnapshot: {
          dryRun:
            true,

          ...preflight,
        },
      };
    }


    case "wg_gesucht_de": {

      /*
       * WG-Gesucht bleibt aktuell
       * reiner lokaler Preflight.
       *
       * Kein API-Aufruf.
       * Kein Netzwerk.
       * Kein Upload.
       * Kein Production Publishing.
       */
      if (
        job.environment !==
        "test"
      ) {

        throw dispatcherError(
          "PORTAL_PRODUCTION_NOT_ENABLED",
          "WG-Gesucht Preflight ist ausschlieÃŸlich im Testmodus erlaubt."
        );
      }


      const provider =
        input.wgGesuchtDeProvider;


      if (!provider) {

        throw dispatcherError(
          "PORTAL_DRY_RUN_PROVIDER_MISSING",
          "WG-Gesucht OpenImmo Provider-Konfiguration fehlt fÃ¼r den Preflight."
        );
      }


      const preflight =
        buildWgGesuchtDeTransportPreflightV1({
          job,

          provider,
        });


      return {
        resultSnapshot: {
          dryRun:
            true,

          ...preflight,
        },
      };
    }

    case "immoscout24_de": {

      /*
       * Zentraler lokaler Payload-Preflight.
       *
       * Kein OAuth.
       * Kein HTTP.
       * Kein Sandbox-Publish.
       * Kein Production Publishing.
       */
      if (
        job.environment !==
        "test"
      ) {

        throw dispatcherError(
          "PORTAL_PRODUCTION_NOT_ENABLED",
          "ImmoScout24 DE Preflight ist nur im Testmodus erlaubt."
        );
      }


      const preflight =
        buildImmoScout24DeTransportPreflightV1({
          job,
        });


      return {
        resultSnapshot: {
          dryRun:
            true,

          ...preflight,
        },
      };
    }

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
   * vollstÃ¤ndig gesperrt.
   *
   * Der Dry-Run oben wird NICHT
   * automatisch von diesem
   * Production-Executor aufgerufen.
   */
  switch (
    job.portal
  ) {

    case "immoscout24_de":

      /*
       * Controlled Sandbox Executor.
       *
       * Ohne externe Provider-Freigabe
       * und explizite Armierung endet
       * dieser Pfad vor OAuth/Netzwerk.
       */
      return executeImmoScout24DeControlledPublishV1(
        job
      );


    case "kleinanzeigen_de":

      /*
       * Controlled Kleinanzeigen Executor.
       *
       * Aktuell endet dieser garantiert
       * vor echtem FTP/FTPS.
       */
      return executeKleinanzeigenDeControlledPublishV1(
        job
      );


    case "immowelt_de":

      /*
       * Controlled Immowelt Executor.
       *
       * Aktuell endet dieser vor jedem
       * externen Transport am Partner-Gate.
       */
      return executeImmoweltDeControlledPublishV1(
        job
      );


    case "immobilien_de":

      /*
       * Controlled Immobilien.de Executor.
       *
       * Endet aktuell garantiert vor
       * echtem FTP am Provider-ID-Gate.
       */
      return executeImmobilienDeControlledPublishV1(
        job
      );


    case "wg_gesucht_de":

      /*
       * Controlled WG-Gesucht Executor.
       *
       * Endet aktuell garantiert
       * vor externem Netzwerkzugriff.
       */
      return executeWgGesuchtDeControlledPublishV1(
        job
      );


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
