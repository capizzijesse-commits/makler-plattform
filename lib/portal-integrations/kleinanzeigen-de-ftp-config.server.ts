import "server-only";


export const KLEINANZEIGEN_DE_FTP_ENV = {
  host:
    "KLEINANZEIGEN_DE_FTP_HOST",

  username:
    "KLEINANZEIGEN_DE_FTP_USERNAME",

  password:
    "KLEINANZEIGEN_DE_FTP_PASSWORD",

  openImmoAnid:
    "KLEINANZEIGEN_DE_OPENIMMO_ANID",
} as const;


type EnvLike =
  Record<
    string,
    string | undefined
  >;


export type KleinanzeigenDeFtpReadiness = {
  credentialSource:
    "env";

  ftpCredentialsConfigured:
    boolean;

  providerIdConfigured:
    boolean;

  readyForNetworkTest:
    boolean;

  networkTested:
    false;

  transportConfigured:
    false;

  productionEnabled:
    false;

  missingKeys:
    string[];
};


export type KleinanzeigenDeFtpTestConfig = {
  host:
    string;

  username:
    string;

  password:
    string;

  openImmoAnid:
    string;
};


export class KleinanzeigenDeFtpConfigError
  extends Error {

  readonly code:
    | "KLEINANZEIGEN_FTP_CONFIG_INCOMPLETE"
    | "KLEINANZEIGEN_PRODUCTION_NOT_ENABLED";


  constructor(
    code:
      | "KLEINANZEIGEN_FTP_CONFIG_INCOMPLETE"
      | "KLEINANZEIGEN_PRODUCTION_NOT_ENABLED",

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "KleinanzeigenDeFtpConfigError";

    this.code =
      code;
  }
}


function clean(
  value:
    string | undefined
):
  string | null {

  const normalized =
    value?.trim();

  return normalized ||
    null;
}


export function getKleinanzeigenDeFtpReadiness(
  env:
    EnvLike =
      process.env
):
  KleinanzeigenDeFtpReadiness {

  const host =
    clean(
      env[
        KLEINANZEIGEN_DE_FTP_ENV.host
      ]
    );

  const username =
    clean(
      env[
        KLEINANZEIGEN_DE_FTP_ENV.username
      ]
    );

  const password =
    clean(
      env[
        KLEINANZEIGEN_DE_FTP_ENV.password
      ]
    );

  const openImmoAnid =
    clean(
      env[
        KLEINANZEIGEN_DE_FTP_ENV.openImmoAnid
      ]
    );


  const missingKeys:
    string[] =
    [];


  if (!host) {
    missingKeys.push(
      KLEINANZEIGEN_DE_FTP_ENV.host
    );
  }

  if (!username) {
    missingKeys.push(
      KLEINANZEIGEN_DE_FTP_ENV.username
    );
  }

  if (!password) {
    missingKeys.push(
      KLEINANZEIGEN_DE_FTP_ENV.password
    );
  }

  if (!openImmoAnid) {
    missingKeys.push(
      KLEINANZEIGEN_DE_FTP_ENV.openImmoAnid
    );
  }


  const ftpCredentialsConfigured =
    Boolean(
      host &&
      username &&
      password
    );

  const providerIdConfigured =
    Boolean(
      openImmoAnid
    );


  return {
    credentialSource:
      "env",

    ftpCredentialsConfigured,

    providerIdConfigured,

    readyForNetworkTest:
      ftpCredentialsConfigured &&
      providerIdConfigured,

    /*
     * Diese Werte werden durch
     * Konfiguration allein NIE true.
     */
    networkTested:
      false,

    transportConfigured:
      false,

    productionEnabled:
      false,

    missingKeys,
  };
}


export function loadKleinanzeigenDeFtpTestConfig(
  input?: {
    env?:
      EnvLike;

    environment?:
      string;
  }
):
  KleinanzeigenDeFtpTestConfig {

  const environment =
    input?.environment ??
    "test";


  if (
    environment !==
    "test"
  ) {
    throw new KleinanzeigenDeFtpConfigError(
      "KLEINANZEIGEN_PRODUCTION_NOT_ENABLED",
      "Kleinanzeigen FTP-Konfiguration ist ausschließlich für kontrollierte Tests freigegeben."
    );
  }


  const env =
    input?.env ??
    process.env;


  const readiness =
    getKleinanzeigenDeFtpReadiness(
      env
    );


  if (
    !readiness.readyForNetworkTest
  ) {
    throw new KleinanzeigenDeFtpConfigError(
      "KLEINANZEIGEN_FTP_CONFIG_INCOMPLETE",
      (
        "Kleinanzeigen FTP-Konfiguration ist unvollständig. Fehlend: " +
        readiness.missingKeys.join(
          ", "
        )
      )
    );
  }


  /*
   * Nur nach vollständigem Gate.
   *
   * Diese Werte niemals loggen.
   */
  return {
    host:
      clean(
        env[
          KLEINANZEIGEN_DE_FTP_ENV.host
        ]
      )!,

    username:
      clean(
        env[
          KLEINANZEIGEN_DE_FTP_ENV.username
        ]
      )!,

    password:
      clean(
        env[
          KLEINANZEIGEN_DE_FTP_ENV.password
        ]
      )!,

    openImmoAnid:
      clean(
        env[
          KLEINANZEIGEN_DE_FTP_ENV.openImmoAnid
        ]
      )!,
  };
}
