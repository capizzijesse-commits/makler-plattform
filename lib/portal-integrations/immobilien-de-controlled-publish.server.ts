import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";

import {
  loadImmobilienDeFtpCredentialConfig,
} from "@/lib/portal-integrations/immobilien-de-ftp-config.server";


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
 * IMMOBILIEN_DE_CONTROLLED_PUBLISH_V1
 *
 * Worker -> Dispatcher -> Immobilien.de Gate.
 *
 * Sicherheitszustand:
 *
 * - nur immobilien_de
 * - nur Test
 * - nur publish
 * - FTP-Credentials erforderlich
 * - Provider-ID/openimmo_anid-Profil
 *   muss noch extern bestätigt werden
 * - kein Netzwerk
 * - kein Upload
 * - Production blockiert
 */
export async function executeImmobilienDeControlledPublishV1(
  job:
    PortalPublishWorkerJob
):
  Promise<
    PortalPublishExecutionResult
  > {

  if (
    job.portal !==
    "immobilien_de"
  ) {

    fail(
      "IMMOBILIEN_DE_PORTAL_MISMATCH",
      "Controlled Publish wurde für das falsche Portal aufgerufen."
    );
  }


  if (
    job.environment !==
    "test"
  ) {

    fail(
      "IMMOBILIEN_DE_PRODUCTION_NOT_ENABLED",
      "Immobilien.de Controlled Publish ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "IMMOBILIEN_DE_ACTION_NOT_SUPPORTED",
      "Immobilien.de Controlled Publish V1 unterstützt ausschließlich publish."
    );
  }


  /*
   * GATE 1:
   *
   * Host
   * Username
   * Passwort
   *
   * müssen vollständig vorhanden sein.
   *
   * Keine Secret-Werte werden geloggt.
   */
  loadImmobilienDeFtpCredentialConfig({
    environment:
      job.environment,
  });


  /*
   * GATE 2:
   *
   * Das konkrete Immobilien.de
   * Provider-ID/openimmo_anid-Profil
   * ist aktuell noch nicht bestätigt.
   *
   * Deshalb endet V1 hier vor
   * jedem Netzwerkzugriff.
   */
  fail(
    "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_UNVERIFIED",
    "Das konkrete Immobilien.de Provider-ID/openimmo_anid-Profil ist noch nicht bestätigt."
  );
}