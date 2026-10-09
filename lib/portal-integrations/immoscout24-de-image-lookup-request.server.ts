import "server-only";

import {
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "./immoscout24-de-oauth.server";

export type ImmoScout24DeImageLookupRequestV1 = {
  method: "GET";
  url: string;
  authorization: string;
  accept: "application/xml";
};

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

/**
 * TEST / SANDBOX ONLY.
 *
 * Prepares an authenticated attachment lookup.
 * Does not execute HTTP requests.
 * Does not verify image identity.
 * Does not modify PostgreSQL.
 * Does not authorize another upload.
 */
export function prepareImmoScout24DeImageLookupRequestV1(
  input: {
    realEstateId: string;
    externalId: string;
    accessToken: string;
    accessTokenSecret: string;
  }
): ImmoScout24DeImageLookupRequestV1 {
  const config = getImmoScout24DeOAuthConfig();

  if (
    config.environment !== "sandbox" ||
    config.baseUrl !==
      "https://rest.sandbox-immobilienscout24.de"
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_LOOKUP_SANDBOX_ONLY");
  }

  const realEstateId = input.realEstateId?.trim();

  if (
    !realEstateId ||
    !/^[0-9]{1,20}$/.test(realEstateId)
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_LOOKUP_OBJECT_INVALID");
  }

  const externalId = input.externalId?.trim();

  if (
    !externalId ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(externalId)
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_LOOKUP_EXTERNAL_ID_INVALID");
  }

  if (
    !input.accessToken?.trim() ||
    !input.accessTokenSecret?.trim()
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_LOOKUP_OAUTH_REQUIRED");
  }

  const path =
    "/restapi/api/offer/v1.0/user/me/realestate/" +
    encodeURIComponent(realEstateId) +
    "/attachment/";

  const url = new URL(config.baseUrl + path);

  url.searchParams.set("externalId", externalId);

  const requestUrl = url.toString();

  const client = createImmoScout24DeOAuthClient({
    accept: "application/xml",
  });

  const authorization = client.authHeader(
    requestUrl,
    input.accessToken,
    input.accessTokenSecret,
    "GET"
  );

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("OAuth ")
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_LOOKUP_SIGNATURE_INVALID");
  }

  return {
    method: "GET",
    url: requestUrl,
    authorization,
    accept: "application/xml",
  };
}