import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";

import {
  getWgGesuchtDeAccessSnapshot,
} from "@/lib/portal-integrations/wg-gesucht-de-access.server";


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
 * WG_GESUCHT_DE_CONTROLLED_PUBLISH_V1
 *
 * Worker -> Dispatcher -> WG-Gesucht Gate.
 *
 * Aktueller Sicherheitszustand:
 *
 * - nur wg_gesucht_de
 * - nur Test
 * - nur publish
 * - Partnerzugang erforderlich
 * - API-Profil noch unbestätigt
 * - Endpoint nicht konfiguriert
 * - Authentication nicht konfiguriert
 * - kein Netzwerk
 * - kein Publishing
 * - Production blockiert
 */
export async function executeWgGesuchtDeControlledPublishV1(
  job:
    PortalPublishWorkerJob
):
  Promise<
    PortalPublishExecutionResult
  > {

  if (
    job.portal !==
    "wg_gesucht_de"
  ) {

    fail(
      "WG_GESUCHT_DE_PORTAL_MISMATCH",
      "Controlled Publish wurde für das falsche Portal aufgerufen."
    );
  }


  if (
    job.environment !==
    "test"
  ) {

    fail(
      "WG_GESUCHT_DE_PRODUCTION_NOT_ENABLED",
      "WG-Gesucht Controlled Publish ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "WG_GESUCHT_DE_ACTION_NOT_SUPPORTED",
      "WG-Gesucht Controlled Publish V1 unterstützt ausschließlich publish."
    );
  }


  const access =
    getWgGesuchtDeAccessSnapshot();


  /*
   * Das Access-Sicherheitsgate muss
   * exakt dem aktuell bestätigten
   * fail-closed Zustand entsprechen.
   */
  if (
    access.accessState !==
      "partner_access_required" ||
    access.importFormat !==
      "openimmo" ||
    access.interfaceType !==
      "openimmo_api" ||
    access.endpointConfigured !==
      false ||
    access.authenticationConfigured !==
      false ||
    access.transportConfigured !==
      false ||
    access.networkTested !==
      false ||
    access.adapterVerified !==
      false ||
    access.productionEnabled !==
      false
  ) {

    fail(
      "WG_GESUCHT_DE_ACCESS_GATE_BROKEN",
      "WG-Gesucht Access-Gate befindet sich in einem unerwarteten Zustand."
    );
  }


  /*
   * EXTERNAL GATE
   *
   * Partnerzugang, konkretes API-Profil,
   * Endpoint und Authentifizierung sind
   * derzeit noch nicht bestätigt.
   *
   * Deshalb endet der echte Worker hier
   * garantiert vor jedem Netzwerkzugriff.
   */
  fail(
    "WG_GESUCHT_DE_API_PROFILE_UNCONFIRMED",
    "WG-Gesucht Partnerzugang und konkretes API-/Authentifizierungsprofil fehlen."
  );
}