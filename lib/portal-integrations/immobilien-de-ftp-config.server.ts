import "server-only";


export const IMMOBILIEN_DE_FTP_ENV = {
  host:
    "IMMOBILIEN_DE_FTP_HOST",

  username:
    "IMMOBILIEN_DE_FTP_USERNAME",

  password:
    "IMMOBILIEN_DE_FTP_PASSWORD",
} as const;


type EnvLike =
  Record<
    string,
    string | undefined
  >;


export type ImmobilienDeFtpReadiness = {
  credentialSource:
    "env";

  ftpCredentialsConfigured:
    boolean;

  /*
   * Das konkrete Immobilien.de-Profil
   * für openimmo_anid ist weiterhin
   * NICHT bestätigt.
   */
  providerIdProfileVerified:
    false;

  /*
   * FTP-Zugangsdaten allein reichen
   * deshalb bewusst noch nicht für
   * einen Netzwerktest.
   */
  readyForNetworkTest:
    false;

  networkTested:
    false;

  transportConfigured:
    false;

  productionEnabled:
    false;

  missingKeys:
    string[];
};


export type ImmobilienDeFtpCredentialConfig = {
  host:
    string;

  username:
    string;

  password:
    string;
};


export class ImmobilienDeFtpConfigError
  extends Error {

  readonly code:
    | "IMMOBILIEN_DE_FTP_CONFIG_INCOMPLETE"
    | "IMMOBILIEN_DE_PRODUCTION_NOT_ENABLED";


  constructor(
    code:
      | "IMMOBILIEN_DE_FTP_CONFIG_INCOMPLETE"
      | "IMMOBILIEN_DE_PRODUCTION_NOT_ENABLED",

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "ImmobilienDeFtpConfigError";

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


export function getImmobilienDeFtpReadiness(
  env:
    EnvLike =
      process.env
):
  ImmobilienDeFtpReadiness {

  const host =
    clean(
      env[
        IMMOBILIEN_DE_FTP_ENV.host
      ]
    );

  const username =
    clean(
      env[
        IMMOBILIEN_DE_FTP_ENV.username
      ]
    );

  const password =
    clean(
      env[
        IMMOBILIEN_DE_FTP_ENV.password
      ]
    );


  const missingKeys:
    string[] =
    [];


  if (!host) {
    missingKeys.push(
      IMMOBILIEN_DE_FTP_ENV.host
    );
  }

  if (!username) {
    missingKeys.push(
      IMMOBILIEN_DE_FTP_ENV.username
    );
  }

  if (!password) {
    missingKeys.push(
      IMMOBILIEN_DE_FTP_ENV.password
    );
  }


  const ftpCredentialsConfigured =
    Boolean(
      host &&
      username &&
      password
    );


  return {
    credentialSource:
      "env",

    ftpCredentialsConfigured,

    /*
     * Bis Immobilien.de das konkrete
     * Anbieter-ID-Profil bestätigt,
     * bleiben diese Gates fail-closed.
     */
    providerIdProfileVerified:
      false,

    readyForNetworkTest:
      false,

    networkTested:
      false,

    transportConfigured:
      false,

    productionEnabled:
      false,

    missingKeys,
  };
}


export function loadImmobilienDeFtpCredentialConfig(
  input?: {
    env?:
      EnvLike;

    environment?:
      string;
  }
):
  ImmobilienDeFtpCredentialConfig {

  const environment =
    input?.environment ??
    "test";


  if (
    environment !==
    "test"
  ) {

    throw new ImmobilienDeFtpConfigError(
      "IMMOBILIEN_DE_PRODUCTION_NOT_ENABLED",
      "Immobilien.de FTP-Konfiguration ist ausschließlich für kontrollierte Tests freigegeben."
    );
  }


  const env =
    input?.env ??
    process.env;


  const readiness =
    getImmobilienDeFtpReadiness(
      env
    );


  if (
    !readiness
      .ftpCredentialsConfigured
  ) {

    throw new ImmobilienDeFtpConfigError(
      "IMMOBILIEN_DE_FTP_CONFIG_INCOMPLETE",
      (
        "Immobilien.de FTP-Konfiguration ist unvollständig. Fehlend: " +
        readiness.missingKeys.join(
          ", "
        )
      )
    );
  }


  /*
   * Achtung:
   *
   * Dies bestätigt NUR die drei
   * FTP Credential-Werte.
   *
   * Kein Provider-Profil.
   * Kein openimmo_anid.
   * Kein Netzwerktest.
   * Kein Upload.
   */
  return {
    host:
      clean(
        env[
          IMMOBILIEN_DE_FTP_ENV.host
        ]
      )!,

    username:
      clean(
        env[
          IMMOBILIEN_DE_FTP_ENV.username
        ]
      )!,

    password:
      clean(
        env[
          IMMOBILIEN_DE_FTP_ENV.password
        ]
      )!,
  };
}
