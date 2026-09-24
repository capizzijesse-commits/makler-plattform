import "server-only";

import type {
  KleinanzeigenDeFtpTestConfig,
} from "./kleinanzeigen-de-ftp-config.server";


export const
  KLEINANZEIGEN_DE_FTP_NETWORK_TEST_FLAG =
    "KLEINANZEIGEN_DE_FTP_NETWORK_TEST_ENABLED";


type EnvLike =
  Record<
    string,
    string | undefined
  >;


export type KleinanzeigenDeFtpNetworkGateSnapshot = {
  environment:
    "test";

  credentialConfigPresent:
    true;

  networkTestEnabled:
    true;

  protocolVerified:
    false;

  productionEnabled:
    false;
};


export class KleinanzeigenDeFtpNetworkGateError
  extends Error {

  readonly code:
    | "KLEINANZEIGEN_NETWORK_TEST_DISABLED"
    | "KLEINANZEIGEN_NETWORK_CONFIG_INVALID"
    | "KLEINANZEIGEN_PRODUCTION_NOT_ENABLED";


  constructor(
    code:
      | "KLEINANZEIGEN_NETWORK_TEST_DISABLED"
      | "KLEINANZEIGEN_NETWORK_CONFIG_INVALID"
      | "KLEINANZEIGEN_PRODUCTION_NOT_ENABLED",

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "KleinanzeigenDeFtpNetworkGateError";

    this.code =
      code;
  }
}


function required(
  value:
    string | null | undefined
):
  boolean {

  return Boolean(
    value?.trim()
  );
}


export function assertKleinanzeigenDeFtpNetworkTestAllowed(
  input: {
    environment:
      string;

    config:
      KleinanzeigenDeFtpTestConfig;

    env?:
      EnvLike;
  }
):
  KleinanzeigenDeFtpNetworkGateSnapshot {

  /*
   * Production bleibt unabhängig
   * von Credentials oder Flags blockiert.
   */
  if (
    input.environment !==
    "test"
  ) {

    throw new KleinanzeigenDeFtpNetworkGateError(
      "KLEINANZEIGEN_PRODUCTION_NOT_ENABLED",
      "Kleinanzeigen Netzwerktransport ist nicht für Production freigegeben."
    );
  }


  /*
   * Defensive Doppelprüfung.
   * Keine Credentials werden zurückgegeben
   * oder geloggt.
   */
  if (
    !required(
      input.config.host
    ) ||
    !required(
      input.config.username
    ) ||
    !required(
      input.config.password
    ) ||
    !required(
      input.config.openImmoAnid
    )
  ) {

    throw new KleinanzeigenDeFtpNetworkGateError(
      "KLEINANZEIGEN_NETWORK_CONFIG_INVALID",
      "Kleinanzeigen Netzwerk-Konfiguration ist unvollständig."
    );
  }


  const env =
    input.env ??
    process.env;


  const enabled =
    env[
      KLEINANZEIGEN_DE_FTP_NETWORK_TEST_FLAG
    ]?.trim() ===
    "1";


  /*
   * Selbst mit echten Credentials darf
   * ohne explizite zweite Freigabe
   * kein Netzwerkzugriff stattfinden.
   */
  if (!enabled) {

    throw new KleinanzeigenDeFtpNetworkGateError(
      "KLEINANZEIGEN_NETWORK_TEST_DISABLED",
      "Kleinanzeigen Netzwerk-Test ist nicht explizit aktiviert."
    );
  }


  return {
    environment:
      "test",

    credentialConfigPresent:
      true,

    networkTestEnabled:
      true,

    /*
     * Erst echte Portalparameter
     * bestimmen FTP/FTPS/etc.
     */
    protocolVerified:
      false,

    productionEnabled:
      false,
  };
}
