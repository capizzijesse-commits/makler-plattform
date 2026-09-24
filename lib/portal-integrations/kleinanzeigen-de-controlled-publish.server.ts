import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";

import {
  loadKleinanzeigenDeFtpTestConfig,
} from "@/lib/portal-integrations/kleinanzeigen-de-ftp-config.server";

import {
  assertKleinanzeigenDeFtpNetworkTestAllowed,
} from "@/lib/portal-integrations/kleinanzeigen-de-ftp-network-gate.server";


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
 * KLEINANZEIGEN_DE_CONTROLLED_PUBLISH_V1
 *
 * Worker -> Dispatcher -> Kleinanzeigen Gate.
 *
 * V1 bleibt vollständig fail-closed:
 *
 * - nur kleinanzeigen_de
 * - nur Test
 * - nur publish
 * - vollständige FTP-Konfiguration erforderlich
 * - explizites Network-Test-Flag erforderlich
 * - Transportprofil ist noch NICHT verifiziert
 * - echter FTP/FTPS-Client wird NICHT aufgerufen
 * - Production bleibt blockiert
 */
export async function executeKleinanzeigenDeControlledPublishV1(
  job:
    PortalPublishWorkerJob
):
  Promise<
    PortalPublishExecutionResult
  > {

  if (
    job.portal !==
    "kleinanzeigen_de"
  ) {

    fail(
      "KLEINANZEIGEN_PORTAL_MISMATCH",
      "Controlled Publish wurde für das falsche Portal aufgerufen."
    );
  }


  if (
    job.environment !==
    "test"
  ) {

    fail(
      "KLEINANZEIGEN_PRODUCTION_NOT_ENABLED",
      "Kleinanzeigen Controlled Publish ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "KLEINANZEIGEN_ACTION_NOT_SUPPORTED",
      "Kleinanzeigen Controlled Publish V1 unterstützt ausschließlich publish."
    );
  }


  /*
   * GATE 1:
   *
   * Host
   * Username
   * Passwort
   * OpenImmo-ANID
   *
   * müssen vollständig vorhanden sein.
   *
   * Keine Secret-Werte werden geloggt.
   */
  const config =
    loadKleinanzeigenDeFtpTestConfig({
      environment:
        job.environment,
    });


  /*
   * GATE 2:
   *
   * Selbst bei vorhandenen Credentials
   * muss das separate Test-Netzwerk-Flag
   * explizit aktiviert sein.
   *
   * Diese Funktion selbst führt
   * KEIN Netzwerk aus.
   */
  assertKleinanzeigenDeFtpNetworkTestAllowed({
    environment:
      job.environment,

    config,
  });


  /*
   * GATE 3:
   *
   * Der bestehende Network-Gate-Snapshot
   * definiert protocolVerified derzeit
   * bewusst als Literal FALSE.
   *
   * Deshalb stoppen wir hier explizit.
   *
   * Kein FTP.
   * Kein FTPS.
   * Kein SFTP.
   * Kein Upload.
   */
  fail(
    "KLEINANZEIGEN_TRANSPORT_PROFILE_UNVERIFIED",
    "Das konkrete Kleinanzeigen-Transportprofil ist noch nicht verifiziert."
  );
}