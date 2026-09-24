import "server-only";


export type ImmoScout24DeAccessEnvironment =
  | "sandbox"
  | "production"
  | "invalid";


export type ImmoScout24DeAccessState =
  | "credentials_required"
  | "sandbox_configured"
  | "production_configured"
  | "invalid_configuration";


export type ImmoScout24DeAccessSnapshot = {
  environment:
    ImmoScout24DeAccessEnvironment;

  accessState:
    ImmoScout24DeAccessState;

  oauthConfigured:
    boolean;

  consumerKeyConfigured:
    boolean;

  consumerSecretConfigured:
    boolean;

  callbackUrlConfigured:
    boolean;

  canStartSandboxOAuth:
    boolean;

  networkTested:
    false;

  adapterVerified:
    false;

  productionEnabled:
    false;
};


function hasEnvironmentValue(
  name: string
): boolean {

  return Boolean(
    process.env[name]
      ?.trim()
  );
}


function resolveAccessEnvironment():
  ImmoScout24DeAccessEnvironment {

  const raw =
    process.env
      .IMMOSCOUT24_DE_ENVIRONMENT
      ?.trim()
      .toLowerCase();

  if (
    !raw ||
    raw === "sandbox" ||
    raw === "test"
  ) {
    return "sandbox";
  }

  if (
    raw === "production" ||
    raw === "live"
  ) {
    return "production";
  }

  return "invalid";
}


export function getImmoScout24DeAccessSnapshot():
  ImmoScout24DeAccessSnapshot {

  const environment =
    resolveAccessEnvironment();

  const consumerKeyConfigured =
    hasEnvironmentValue(
      "IMMOSCOUT24_DE_CONSUMER_KEY"
    );

  const consumerSecretConfigured =
    hasEnvironmentValue(
      "IMMOSCOUT24_DE_CONSUMER_SECRET"
    );

  const callbackUrlConfigured =
    hasEnvironmentValue(
      "IMMOSCOUT24_DE_CALLBACK_URL"
    );

  const oauthConfigured =
    environment !== "invalid" &&
    consumerKeyConfigured &&
    consumerSecretConfigured &&
    callbackUrlConfigured;


  let accessState:
    ImmoScout24DeAccessState =
      "credentials_required";


  if (
    environment === "invalid"
  ) {

    accessState =
      "invalid_configuration";
  }
  else if (oauthConfigured) {

    accessState =
      environment === "production"
        ? "production_configured"
        : "sandbox_configured";
  }


  return {
    environment,

    accessState,

    oauthConfigured,

    consumerKeyConfigured,

    consumerSecretConfigured,

    callbackUrlConfigured,

    canStartSandboxOAuth:
      oauthConfigured &&
      environment === "sandbox",

    /*
     * Diese Werte werden erst durch
     * separate, explizite Tests geändert.
     *
     * Der Readiness Snapshot selbst führt
     * keinerlei Netzwerkzugriff aus.
     */
    networkTested:
      false,

    adapterVerified:
      false,

    productionEnabled:
      false,
  };
}