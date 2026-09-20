import "server-only";

import {
  getImmoScout24DeAccessSnapshot,
} from "./immoscout24-de-access.server";

import {
  getImmoweltDeAccessSnapshot,
} from "./immowelt-de-access.server";

import {
  getKleinanzeigenDeAccessSnapshot,
} from "./kleinanzeigen-de-access.server";

import {
  getKleinanzeigenDeFtpReadiness,
} from "./kleinanzeigen-de-ftp-config.server";

import {
  getImmobilienDeAccessSnapshot,
} from "./immobilien-de-access.server";

import {
  getImmobilienDeFtpReadiness,
} from "./immobilien-de-ftp-config.server";

import {
  getWgGesuchtDeAccessSnapshot,
} from "./wg-gesucht-de-access.server";


export type GermanExternalAccessPortal =
  | "immoscout24_de"
  | "immowelt_de"
  | "kleinanzeigen_de"
  | "wg_gesucht_de"
  | "immobilien_de";


export type GermanExternalAccessStatus =
  | "READY_FOR_CONTROLLED_TEST"
  | "WAITING_FOR_CREDENTIALS"
  | "WAITING_FOR_PROVIDER_APPROVAL"
  | "BLOCKED";


export type GermanExternalAccessReadiness = {
  portal:
    GermanExternalAccessPortal;

  status:
    GermanExternalAccessStatus;

  localFoundationReady:
    boolean;

  credentialGateReady:
    boolean;

  providerApprovalRequired:
    boolean;

  controlledNetworkTestAllowed:
    boolean;

  productionEnabled:
    false;

  networkAttempted:
    false;

  missingRequirements:
    string[];
};


function buildImmoScout24Readiness():
  GermanExternalAccessReadiness {

  const access =
    getImmoScout24DeAccessSnapshot();


  if (
    access.accessState ===
    "invalid_configuration"
  ) {

    return {
      portal:
        "immoscout24_de",

      status:
        "BLOCKED",

      localFoundationReady:
        true,

      credentialGateReady:
        false,

      providerApprovalRequired:
        true,

      controlledNetworkTestAllowed:
        false,

      productionEnabled:
        false,

      networkAttempted:
        false,

      missingRequirements: [
        "Gültige ImmoScout24-DE-Umgebung konfigurieren",
      ],
    };
  }


  if (!access.oauthConfigured) {

    const missingRequirements:
      string[] =
      [];


    if (
      !access.consumerKeyConfigured
    ) {
      missingRequirements.push(
        "IMMOSCOUT24_DE_CONSUMER_KEY"
      );
    }

    if (
      !access.consumerSecretConfigured
    ) {
      missingRequirements.push(
        "IMMOSCOUT24_DE_CONSUMER_SECRET"
      );
    }

    if (
      !access.callbackUrlConfigured
    ) {
      missingRequirements.push(
        "IMMOSCOUT24_DE_CALLBACK_URL"
      );
    }


    return {
      portal:
        "immoscout24_de",

      status:
        "WAITING_FOR_CREDENTIALS",

      localFoundationReady:
        true,

      credentialGateReady:
        false,

      providerApprovalRequired:
        true,

      controlledNetworkTestAllowed:
        false,

      productionEnabled:
        false,

      networkAttempted:
        false,

      missingRequirements,
    };
  }


  return {
    portal:
      "immoscout24_de",

    status:
      "WAITING_FOR_PROVIDER_APPROVAL",

    localFoundationReady:
      true,

    credentialGateReady:
      true,

    providerApprovalRequired:
      true,

    /*
     * OAuth/Sandbox-Konfiguration allein
     * bedeutet noch NICHT, dass ein neuer
     * Publish-Test erlaubt ist.
     *
     * Dafür warten wir weiterhin auf die
     * externe Import/Export/Publish-Freigabe.
     */
    controlledNetworkTestAllowed:
      false,

    productionEnabled:
      false,

    networkAttempted:
      false,

    missingRequirements: [
      "Import/Export/Publish-Freigabe durch ImmoScout24",
    ],
  };
}


function buildKleinanzeigenReadiness():
  GermanExternalAccessReadiness {

  const access =
    getKleinanzeigenDeAccessSnapshot();

  const ftp =
    getKleinanzeigenDeFtpReadiness();


  if (!ftp.readyForNetworkTest) {

    return {
      portal:
        "kleinanzeigen_de",

      status:
        "WAITING_FOR_CREDENTIALS",

      localFoundationReady:
        true,

      credentialGateReady:
        false,

      providerApprovalRequired:
        access.accessState ===
        "partner_access_required",

      controlledNetworkTestAllowed:
        false,

      productionEnabled:
        false,

      networkAttempted:
        false,

      /*
       * Nur ENV-NAMEN.
       * Niemals Secret-Werte.
       */
      missingRequirements:
        [...ftp.missingKeys],
    };
  }


  return {
    portal:
      "kleinanzeigen_de",

    status:
      "WAITING_FOR_PROVIDER_APPROVAL",

    localFoundationReady:
      true,

    credentialGateReady:
      true,

    providerApprovalRequired:
      true,

    /*
     * Credential-Gate wäre technisch bereit.
     * Der zentrale Aggregator bleibt trotzdem
     * fail-closed, bis das konkrete externe
     * Transportprofil bestätigt wurde.
     */
    controlledNetworkTestAllowed:
      false,

    productionEnabled:
      false,

    networkAttempted:
      false,

    missingRequirements: [
      "Bestätigtes Kleinanzeigen-Transportprofil",
    ],
  };
}


function buildImmobilienDeReadiness():
  GermanExternalAccessReadiness {

  const access =
    getImmobilienDeAccessSnapshot();

  const ftp =
    getImmobilienDeFtpReadiness();


  if (!ftp.ftpCredentialsConfigured) {

    return {
      portal:
        "immobilien_de",

      status:
        "WAITING_FOR_CREDENTIALS",

      localFoundationReady:
        true,

      credentialGateReady:
        false,

      providerApprovalRequired:
        access.accessState ===
        "partner_access_required",

      controlledNetworkTestAllowed:
        false,

      productionEnabled:
        false,

      networkAttempted:
        false,

      missingRequirements:
        [...ftp.missingKeys],
    };
  }


  if (
    !ftp.providerIdProfileVerified
  ) {

    return {
      portal:
        "immobilien_de",

      status:
        "WAITING_FOR_PROVIDER_APPROVAL",

      localFoundationReady:
        true,

      credentialGateReady:
        true,

      providerApprovalRequired:
        true,

      controlledNetworkTestAllowed:
        false,

      productionEnabled:
        false,

      networkAttempted:
        false,

      missingRequirements: [
        "Bestätigtes Immobilien.de-Provider-ID-Profil",
      ],
    };
  }


  return {
    portal:
      "immobilien_de",

    status:
      "READY_FOR_CONTROLLED_TEST",

    localFoundationReady:
      true,

    credentialGateReady:
      true,

    providerApprovalRequired:
      false,

    controlledNetworkTestAllowed:
      ftp.readyForNetworkTest,

    productionEnabled:
      false,

    networkAttempted:
      false,

    missingRequirements:
      [],
  };
}


function buildImmoweltReadiness():
  GermanExternalAccessReadiness {

  const access =
    getImmoweltDeAccessSnapshot();


  return {
    portal:
      "immowelt_de",

    status:
      "WAITING_FOR_PROVIDER_APPROVAL",

    localFoundationReady:
      true,

    credentialGateReady:
      false,

    providerApprovalRequired:
      access.accessState ===
      "partner_access_required",

    controlledNetworkTestAllowed:
      false,

    productionEnabled:
      false,

    networkAttempted:
      false,

    missingRequirements: [
      "Immowelt-Partnerzugang",
      "Bestätigtes Transportverfahren",
      "Vom Portal bereitgestellte Transportparameter",
    ],
  };
}


function buildWgGesuchtReadiness():
  GermanExternalAccessReadiness {

  const access =
    getWgGesuchtDeAccessSnapshot();


  return {
    portal:
      "wg_gesucht_de",

    status:
      "WAITING_FOR_PROVIDER_APPROVAL",

    localFoundationReady:
      true,

    credentialGateReady:
      false,

    providerApprovalRequired:
      access.accessState ===
      "partner_access_required",

    controlledNetworkTestAllowed:
      false,

    productionEnabled:
      false,

    networkAttempted:
      false,

    missingRequirements: [
      "WG-Gesucht-Providerzugang",
      "Bestätigter API-/Transport-Endpunkt",
      "Bestätigtes Authentifizierungsverfahren",
    ],
  };
}


export function getGermanExternalAccessReadinessV1():
  GermanExternalAccessReadiness[] {

  /*
   * Reiner lokaler Aggregator.
   *
   * KEIN HTTP.
   * KEIN FTP.
   * KEIN OAuth-Start.
   * KEIN Provider-Aufruf.
   * KEIN Publishing.
   * KEINE Secret-Werte im Ergebnis.
   */
  return [
    buildImmoScout24Readiness(),
    buildImmoweltReadiness(),
    buildKleinanzeigenReadiness(),
    buildWgGesuchtReadiness(),
    buildImmobilienDeReadiness(),
  ];
}
