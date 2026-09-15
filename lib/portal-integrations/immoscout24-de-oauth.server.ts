import "server-only";

import {
  OAuth,
} from "oauth";


export type ImmoScout24DeEnvironment =
  | "sandbox"
  | "production";


export type ImmoScout24DeOAuthConfig = {
  environment:
    ImmoScout24DeEnvironment;

  consumerKey:
    string;

  consumerSecret:
    string;

  callbackUrl:
    string;

  baseUrl:
    string;

  requestTokenUrl:
    string;

  authorizeUrl:
    string;

  accessTokenUrl:
    string;
};


const SANDBOX_BASE_URL =
  "https://rest.sandbox-immobilienscout24.de";

const PRODUCTION_BASE_URL =
  "https://rest.immobilienscout24.de";


function requireEnv(
  name: string
): string {

  const value =
    process.env[name]
      ?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}


function resolveEnvironment():
  ImmoScout24DeEnvironment {

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

  throw new Error(
    "IMMOSCOUT24_DE_ENVIRONMENT must be sandbox or production."
  );
}


export function getImmoScout24DeOAuthConfig():
  ImmoScout24DeOAuthConfig {

  const environment =
    resolveEnvironment();

  const baseUrl =
    environment === "production"
      ? PRODUCTION_BASE_URL
      : SANDBOX_BASE_URL;

  const callbackUrl =
    requireEnv(
      "IMMOSCOUT24_DE_CALLBACK_URL"
    );

  return {
    environment,

    consumerKey:
      requireEnv(
        "IMMOSCOUT24_DE_CONSUMER_KEY"
      ),

    consumerSecret:
      requireEnv(
        "IMMOSCOUT24_DE_CONSUMER_SECRET"
      ),

    callbackUrl,

    baseUrl,

    requestTokenUrl:
      `${baseUrl}/restapi/security/oauth/request_token`,

    authorizeUrl:
      `${baseUrl}/restapi/security/oauth/confirm_access`,

    accessTokenUrl:
      `${baseUrl}/restapi/security/oauth/access_token`,
  };
}


export function createImmoScout24DeOAuthClient(
  options?: {
    accept?:
      string;
  }
):
  OAuth {

  const config =
    getImmoScout24DeOAuthConfig();

  const client =
    new OAuth(
      config.requestTokenUrl,
      config.accessTokenUrl,
      config.consumerKey,
      config.consumerSecret,
      "1.0",
      config.callbackUrl,
      "HMAC-SHA1",
      undefined,
      options?.accept
        ? {
            Accept:
              options.accept,

            Connection:
              "close",

            "User-Agent":
              "Inserat-AI",
          }
        : undefined
    );

  /*
   * ImmoScout24 dokumentiert sowohl
   * Request-Token als auch Access-Token
   * als GET Requests.
   *
   * node-oauth verwendet standardmässig
   * POST und muss deshalb explizit
   * umgestellt werden.
   */
  client.setClientOptions({
    requestTokenHttpMethod:
      "GET",

    accessTokenHttpMethod:
      "GET",

    followRedirects:
      true,
  });

  return client;
}


export function buildImmoScout24DeAuthorizeUrl(
  requestToken: string
): string {

  const cleanToken =
    requestToken.trim();

  if (!cleanToken) {
    throw new Error(
      "ImmoScout24 request token is required."
    );
  }

  const config =
    getImmoScout24DeOAuthConfig();

  const url =
    new URL(
      config.authorizeUrl
    );

  url.searchParams.set(
    "oauth_token",
    cleanToken
  );

  return url.toString();
}