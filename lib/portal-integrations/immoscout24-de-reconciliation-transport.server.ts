import "server-only";

import {
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "./immoscout24-de-oauth.server";

import {
  prepareImmoScout24DeLookupV1,
  parseImmoScout24DeLookupV1,
  type ImmoScout24DeLookupResult,
} from "./immoscout24-de-reconciliation.server";

function fail(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

/**
 * ImmoScout24 DE - Read-only reconciliation transport.
 *
 * Sandbox only.
 * Exactly one GET request.
 * Never creates or publishes a listing.
 *
 * A 404 is only an observation, NOT permission
 * to retry a previous Create POST.
 */
export async function lookupImmoScout24DeSandboxV1(input: {
  externalId: string;
  accessToken: string;
  accessTokenSecret: string;
}): Promise<ImmoScout24DeLookupResult> {
  const config = getImmoScout24DeOAuthConfig();

  if (config.environment !== "sandbox") {
    fail(
      "IMMOSCOUT24_DE_LOOKUP_SANDBOX_ONLY",
      "Bestandsabgleich ist nur in der Sandbox erlaubt."
    );
  }

  const request = prepareImmoScout24DeLookupV1(
    input.externalId
  );

  if (
    !input.accessToken.trim() ||
    !input.accessTokenSecret.trim()
  ) {
    fail(
      "IMMOSCOUT24_DE_LOOKUP_OAUTH_REQUIRED",
      "OAuth-Zugangsdaten fehlen."
    );
  }

  const client = createImmoScout24DeOAuthClient({
    accept: "application/xml",
  });

  const response = await new Promise<{
    statusCode: number;
    raw: string;
  }>((resolve, reject) => {
    client.get(
      `${config.baseUrl}${request.path}`,
      input.accessToken,
      input.accessTokenSecret,
      (error, data, httpResponse) => {
        const statusCode =
          httpResponse?.statusCode ??
          (error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : 0);

        if (error) {
          if (statusCode === 404) {
            resolve({
              statusCode: 404,
              raw: "",
            });
            return;
          }

          reject(
            Object.assign(
              new Error(
                "ImmoScout24-Bestandsabgleich fehlgeschlagen. Objektzuordnung bleibt gesperrt."
              ),
              {
                code:
                  "IMMOSCOUT24_DE_LOOKUP_TRANSPORT_UNCONFIRMED",
              }
            )
          );
          return;
        }

        resolve({
          statusCode,
          raw:
            typeof data === "string"
              ? data
              : "",
        });
      }
    );
  });

  return parseImmoScout24DeLookupV1({
    statusCode: response.statusCode,
    raw: response.raw,
    expectedExternalId: request.externalId,
  });
}
