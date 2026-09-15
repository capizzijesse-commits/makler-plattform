import "server-only";


export type ImmoweltDeAccessState =
  "partner_access_required";


export type ImmoweltDeAccessSnapshot = {
  accessState:
    ImmoweltDeAccessState;

  softwareTransferSupported:
    true;

  transportConfigured:
    false;

  networkTested:
    false;

  adapterVerified:
    false;

  productionEnabled:
    false;
};


export function getImmoweltDeAccessSnapshot():
  ImmoweltDeAccessSnapshot {

  /*
   * Readiness V1 ist absichtlich
   * rein lokal und fail-closed.
   *
   * Der konkrete Partnerzugang,
   * das bestaetigte Austauschformat
   * und der externe Transport sind
   * noch nicht konfiguriert.
   */
  return {
    accessState:
      "partner_access_required",

    softwareTransferSupported:
      true,

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