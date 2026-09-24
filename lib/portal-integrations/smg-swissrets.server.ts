import "server-only";

import type {
  SmgAuthorizationResponse,
  SmgMetaResponse,
  SmgSwissRetsCredentials,
  SmgUserInfoResponse,
} from "./types";


const LEGACY_SMG_CLIENT_DISABLED =
  "LEGACY_SMG_CLIENT_DISABLED";


function createDisabledError():
  Error {

  return new Error(
    `${LEGACY_SMG_CLIENT_DISABLED}: Der historische SMG SwissRETS Client ist deaktiviert. Verwende den verifizierten SMG Publish Access / Publish Plan Pfad.`
  );
}


/**
 * HISTORISCHER CLIENT – ABSICHTLICH DEAKTIVIERT.
 *
 * Dieser Client basiert auf einer älteren,
 * nicht mehr verifizierten SMG-Transportannahme.
 *
 * Er darf weder Test- noch Produktionsverkehr
 * ausführen.
 *
 * Aktueller Inserat-AI Pfad:
 *
 * SwissRETS Feed
 * -> SMG Publish Access Gate
 * -> Publish Safety
 * -> SMG Publish Plan
 * -> verifizierter Transport
 */
export class SmgSwissRetsClient {

  constructor(
    _credentials:
      SmgSwissRetsCredentials
  ) {
    /*
     * Konstruktion bleibt absichtlich erlaubt,
     * damit alte Imports nicht unerwartet
     * Compile-Fehler erzeugen.
     *
     * Jeder Netzwerkaufruf schlägt jedoch
     * fail-closed fehl.
     */
  }


  async getMeta():
    Promise<SmgMetaResponse> {

    throw createDisabledError();
  }


  async authorize():
    Promise<SmgAuthorizationResponse> {

    throw createDisabledError();
  }


  async getUserInfo(
    _accessToken: string
  ): Promise<SmgUserInfoResponse> {

    throw createDisabledError();
  }
}
