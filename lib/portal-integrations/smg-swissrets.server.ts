import "server-only";

import type {
  SmgAuthorizationResponse,
  SmgMetaResponse,
  SmgSwissRetsCredentials,
  SmgUserInfoResponse,
} from "./types";

function normalizeBaseUrl(
  value: string
): string {
  return value.replace(
    /\/+$/,
    ""
  );
}

async function readJson<T>(
  response: Response
): Promise<T> {
  const text =
    await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(
      text
    ) as T;
  } catch {
    throw new Error(
      `Ungültige Portal-Antwort (${response.status}).`
    );
  }
}

function createHttpError(
  action: string,
  response: Response
): Error {
  return new Error(
    `${action} fehlgeschlagen: HTTP ${response.status}.`
  );
}

export class SmgSwissRetsClient {
  private readonly baseUrl: string;

  constructor(
    private readonly credentials:
      SmgSwissRetsCredentials
  ) {
    this.baseUrl =
      normalizeBaseUrl(
        credentials.baseUrl
      );
  }

  async getMeta():
    Promise<SmgMetaResponse> {
    const response =
      await fetch(
        `${this.baseUrl}/api/meta`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    if (!response.ok) {
      throw createHttpError(
        "SMG Meta-Abfrage",
        response
      );
    }

    return readJson<SmgMetaResponse>(
      response
    );
  }

  async authorize():
    Promise<SmgAuthorizationResponse> {
    const response =
      await fetch(
        `${this.baseUrl}/api/users/authorize`,
        {
          method: "POST",

          cache: "no-store",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            clientId:
              this.credentials.clientId,

            clientSecret:
              this.credentials
                .clientSecret,

            userName:
              this.credentials.userName,

            password:
              this.credentials.password,
          }),
        }
      );

    if (!response.ok) {
      throw createHttpError(
        "SMG Anmeldung",
        response
      );
    }

    const data =
      await readJson<
        SmgAuthorizationResponse
      >(response);

    if (
      data.isError ||
      !data.accessToken
    ) {
      throw new Error(
        data.errorDescription ||
          "SMG hat kein Access-Token geliefert."
      );
    }

    return data;
  }

  async getUserInfo(
    accessToken: string
  ): Promise<SmgUserInfoResponse> {
    const response =
      await fetch(
        `${this.baseUrl}/api/userinfo`,
        {
          method: "GET",
          cache: "no-store",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

    if (!response.ok) {
      throw createHttpError(
        "SMG Benutzerprüfung",
        response
      );
    }

    return readJson<
      SmgUserInfoResponse
    >(response);
  }
}
