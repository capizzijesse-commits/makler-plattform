import "server-only";


export type ImmobilienDeAccessState =
  "partner_access_required";


export type ImmobilienDeAccessSnapshot = {
  accessState:
    ImmobilienDeAccessState;

  /*
   * immobilien.de unterstuetzt fuer
   * gewerbliche Anbieter die automatische
   * Datenuebernahme aus Maklersoftware
   * ueber OpenImmo per FTP.
   *
   * Konkrete Zugangsdaten und Serverdaten
   * werden erst mit dem Anbieterzugang
   * konfiguriert.
   */
  importFormat:
    "openimmo";

  transportProtocol:
    "ftp";

  ftpCredentialsConfigured:
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


export function getImmobilienDeAccessSnapshot():
  ImmobilienDeAccessSnapshot {

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

    transportProtocol:
      "ftp",

    ftpCredentialsConfigured:
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