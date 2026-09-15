import "server-only";


export type WgGesuchtDeAccessState =
  "partner_access_required";


export type WgGesuchtDeAccessSnapshot = {
  accessState:
    WgGesuchtDeAccessState;

  /*
   * WG-Gesucht bewirbt fuer professionelle
   * Anbieter eine OpenImmo-API-Anbindung.
   *
   * Ein aktueller oeffentlicher Endpoint
   * oder Authentifizierungsmechanismus wird
   * hier bewusst nicht angenommen.
   */
  importFormat:
    "openimmo";

  interfaceType:
    "openimmo_api";

  endpointConfigured:
    false;

  authenticationConfigured:
    false;

  transportConfigured:
    false;

  networkTested:
    false;

  adapterVerified:
    false;

  productionEnabled:
    false;
};


export function getWgGesuchtDeAccessSnapshot():
  WgGesuchtDeAccessSnapshot {

  /*
   * Foundation V1 bleibt fail-closed.
   *
   * Kein Netzwerkzugriff.
   * Kein erfundener API-Endpunkt.
   * Keine Zugangsdaten.
   * Kein Publishing.
   */
  return {
    accessState:
      "partner_access_required",

    importFormat:
      "openimmo",

    interfaceType:
      "openimmo_api",

    endpointConfigured:
      false,

    authenticationConfigured:
      false,

    transportConfigured:
      false,

    networkTested:
      false,

    adapterVerified:
      false,

    productionEnabled:
      false,
  };
}