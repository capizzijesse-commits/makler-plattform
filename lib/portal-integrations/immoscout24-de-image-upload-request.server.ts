import "server-only";

import {
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "./immoscout24-de-oauth.server";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export type ImmoScout24DeImageUploadRequestV1 = {
  method: "POST";
  url: string;
  authorization: string;
  accept: "application/xml";
};

/**
 * Bereitet die OAuth-signierte Upload-Anfrage vor.
 *
 * WICHTIG:
 * - Sandbox only
 * - Kein Netzwerkzugriff
 * - Keine automatische Wiederholung
 * - FormData wird separat uebertragen
 */
export function prepareImmoScout24DeImageUploadRequestV1(
  input: {
    realEstateId: string;
    accessToken: string;
    accessTokenSecret: string;
  }
): ImmoScout24DeImageUploadRequestV1 {
  const config = getImmoScout24DeOAuthConfig();

  if (
    config.environment !== "sandbox" ||
    config.baseUrl !==
      "https://rest.sandbox-immobilienscout24.de"
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_SANDBOX_ONLY");
  }

  const realEstateId = input.realEstateId.trim();

  if (!/^[0-9]{1,20}$/.test(realEstateId)) {
    fail("IMMOSCOUT24_DE_IMAGE_OBJECT_ID_INVALID");
  }

  if (
    !input.accessToken?.trim() ||
    !input.accessTokenSecret?.trim()
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_OAUTH_REQUIRED");
  }

  const path =
    "/restapi/api/offer/v1.0/user/me/realestate/" +
    encodeURIComponent(realEstateId) +
    "/attachment/";

  const url = config.baseUrl + path;

  const client = createImmoScout24DeOAuthClient({
    accept: "application/xml",
  });

  const authorization = client.authHeader(
    url,
    input.accessToken,
    input.accessTokenSecret,
    "POST"
  );

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("OAuth ")
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_SIGNATURE_INVALID");
  }

  return {
    method: "POST",
    url,
    authorization,
    accept: "application/xml",
  };
}