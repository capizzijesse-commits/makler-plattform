import "server-only";


export type ComparisPublishTransport =
  | "api"
  | "sftp"
  | "idx";


export type ComparisPublishAccessState =
  | "access_required"
  | "access_confirmed"
  | "adapter_verified";


export type ComparisPublishAccessSnapshot = {
  state:
    ComparisPublishAccessState;

  transport:
    ComparisPublishTransport | null;

  accessConfirmed:
    boolean;

  adapterVerified:
    boolean;

  productionEnabled:
    boolean;

  reason:
    string;
};


function readBooleanEnv(
  name: string
): boolean {

  return (
    process.env[name]
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}


function getConfiguredTransport():
  ComparisPublishTransport | null {

  const value =
    process.env
      .INSERAT_AI_COMPARIS_PUBLISH_TRANSPORT
      ?.trim()
      .toLowerCase();


  if (
    value === "api" ||
    value === "sftp" ||
    value === "idx"
  ) {
    return value;
  }


  return null;
}


export function getComparisPublishAccessSnapshot():
  ComparisPublishAccessSnapshot {

  const transport =
    getConfiguredTransport();


  const accessConfirmed =
    readBooleanEnv(
      "INSERAT_AI_COMPARIS_PUBLISH_ACCESS_CONFIRMED"
    );


  const adapterVerified =
    readBooleanEnv(
      "INSERAT_AI_COMPARIS_PUBLISH_ADAPTER_VERIFIED"
    );


  const productionRequested =
    readBooleanEnv(
      "INSERAT_AI_COMPARIS_PUBLISH_PRODUCTION_ENABLED"
    );


  if (
    !transport ||
    !accessConfirmed
  ) {

    return {
      state:
        "access_required",

      transport,

      accessConfirmed:
        false,

      adapterVerified:
        false,

      productionEnabled:
        false,

      reason:
        "Aktueller Comparis-Partnerzugang und die freigegebene Transportart (API, SFTP oder IDX) müssen zuerst bestätigt werden.",
    };
  }


  if (!adapterVerified) {

    return {
      state:
        "access_confirmed",

      transport,

      accessConfirmed:
        true,

      adapterVerified:
        false,

      productionEnabled:
        false,

      reason:
        "Comparis-Zugang ist bestätigt, der konkrete Transport-Adapter wurde aber noch nicht gegen die aktuellen Partner-Vorgaben verifiziert.",
    };
  }


  return {
    state:
      "adapter_verified",

    transport,

    accessConfirmed:
      true,

    adapterVerified:
      true,

    productionEnabled:
      productionRequested,

    reason:
      productionRequested
        ? "Comparis-Adapter ist verifiziert und Produktion wurde explizit freigegeben."
        : "Comparis-Adapter ist verifiziert; Produktions-Publishing bleibt ausdrücklich deaktiviert.",
  };
}
