import "server-only";


export type KleinanzeigenDeAccessState =
  "partner_access_required";


export type KleinanzeigenDeAccessSnapshot = {
  accessState:
    KleinanzeigenDeAccessState;

  /*
   * Kleinanzeigen Immobilien unterstuetzt
   * fuer Partnerschaftskunden den Import
   * ueber OpenImmo.
   *
   * Die konkreten FTP-Zugangsdaten werden
   * vom Portal bereitgestellt und gehoeren
   * nicht in die Datenbank.
   */
  importFormat:
    "openimmo";

  minimumOpenImmoVersion:
    "1.2.5";

  ftpCredentialsConfigured:
    false;

  providerIdConfigured:
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


export function getKleinanzeigenDeAccessSnapshot():
  KleinanzeigenDeAccessSnapshot {

  /*
   * Foundation V1 bleibt fail-closed.
   *
   * Kein Netzwerkzugriff.
   * Keine FTP-Verbindung.
   * Keine Zugangsdaten.
   * Kein Publishing.
   */
  return {
    accessState:
      "partner_access_required",

    importFormat:
      "openimmo",

    minimumOpenImmoVersion:
      "1.2.5",

    ftpCredentialsConfigured:
      false,

    providerIdConfigured:
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