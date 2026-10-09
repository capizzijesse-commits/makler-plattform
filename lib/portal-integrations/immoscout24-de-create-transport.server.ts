import "server-only";

import {
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "./immoscout24-de-oauth.server";

import {
  parseImmoScout24DeCreateResponseV1,
  type ImmoScout24DeCreateRequestV1,
  type ImmoScout24DeCreateResultV1,
} from "./immoscout24-de-create-realestate.server";

/**
 * ImmoScout24 DE - Create Transport V1
 *
 * Sandbox only.
 * Not connected to the publishing dispatcher.
 * No automatic retries.
 */

export async function executeImmoScout24DeCreateSandboxV1(input: {
  request: ImmoScout24DeCreateRequestV1;
  accessToken: string;
  accessTokenSecret: string;
  allowSandboxWrite: true;
}): Promise<ImmoScout24DeCreateResultV1> {
  const config = getImmoScout24DeOAuthConfig();

  if (
    config.environment !== "sandbox" ||
    input.request.environment !== "sandbox" ||
    input.allowSandboxWrite !== true
  ) {
    throw new Error(
      "IMMOSCOUT24_DE_CREATE_SANDBOX_ONLY"
    );
  }

  if (
    !input.accessToken.trim() ||
    !input.accessTokenSecret.trim()
  ) {
    throw new Error(
      "IMMOSCOUT24_DE_CREATE_OAUTH_REQUIRED"
    );
  }

  const client = createImmoScout24DeOAuthClient({
    accept: "application/xml",
  });

  const response = await new Promise<{
    statusCode: number;
    raw: string;
  }>((resolve, reject) => {
    client.post(
      `${config.baseUrl}${input.request.path}`,
      input.accessToken,
      input.accessTokenSecret,
      input.request.body,
      input.request.contentType,
      (error, data, httpResponse) => {
        if (error) {
          reject(
            Object.assign(
              new Error(
                "ImmoScout24 Create-Status unklar. Vor erneutem POST Objektbestand anhand der externalId prüfen."
              ),
              {
                code: "IMMOSCOUT24_DE_CREATE_RECONCILIATION_REQUIRED",
                statusCode:
                  typeof error.statusCode === "number"
                    ? error.statusCode
                    : null,
              }
            )
          );
          return;
        }

        resolve({
          statusCode: httpResponse?.statusCode ?? 0,
          raw: typeof data === "string" ? data : "",
        });
      }
    );
  });

  return parseImmoScout24DeCreateResponseV1(response);
}
