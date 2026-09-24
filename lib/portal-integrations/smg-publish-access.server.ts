import "server-only";


export type SmgPublishTransport =
  | "swissrets_rest"
  | "idx_ftp";


export type SmgPublishAccessState =
  | "access_required"
  | "access_confirmed"
  | "adapter_verified";


export type SmgPublishAccessSnapshot = {
  state: SmgPublishAccessState;

  transport:
    | SmgPublishTransport
    | null;

  accessConfirmed: boolean;

  adapterVerified: boolean;

  productionEnabled: boolean;

  reason: string;
};


/*
 * IMPORTANT
 *
 * This module deliberately does not contain
 * any SMG endpoint, credential, token,
 * username or password.
 *
 * Current publishing access must first be
 * confirmed with SMG.
 */
export function getSmgPublishAccessSnapshot():
  SmgPublishAccessSnapshot {

  const transportRaw =
    process.env
      .INSERAT_AI_SMG_PUBLISH_TRANSPORT
      ?.trim()
      .toLowerCase() ??
    "";

  const accessConfirmed =
    process.env
      .INSERAT_AI_SMG_PUBLISH_ACCESS_CONFIRMED ===
    "true";

  const adapterVerified =
    process.env
      .INSERAT_AI_SMG_PUBLISH_ADAPTER_VERIFIED ===
    "true";

  const productionEnabled =
    process.env
      .INSERAT_AI_SMG_PUBLISH_PRODUCTION_ENABLED ===
    "true";


  const transport:
    | SmgPublishTransport
    | null =
    transportRaw ===
      "swissrets_rest" ||
    transportRaw ===
      "idx_ftp"
      ? transportRaw
      : null;


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
        "Aktueller SMG-Publishing-Zugang muss zuerst bestätigt werden.",
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
        "SMG-Zugang bestätigt; Adapter-Test steht noch aus.",
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

    productionEnabled,

    reason:
      productionEnabled
        ? "SMG-Adapter verifiziert und Produktion ausdrücklich freigegeben."
        : "SMG-Adapter verifiziert; Produktionsfreigabe bleibt ausgeschaltet.",
  };
}