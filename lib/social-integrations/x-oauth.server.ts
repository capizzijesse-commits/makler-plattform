import "server-only";

export const X_REQUIRED_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
] as const;

export type XSocialEnvironment =
  | "test"
  | "production";

export type XOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: XSocialEnvironment;
};

export type XOAuthToken = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn: number;
  scopes?: string[];
};

export type XUserInfo = {
  id: string;
  name: string;
  username: string;
};

function env(name: string): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}

export function isXOAuthConfigured(): boolean {
  return Boolean(
    process.env.X_CLIENT_ID?.trim() &&
    process.env.X_CLIENT_SECRET?.trim()
  );
}

export function getXOAuthConfig(
  input: {
    requestOrigin: string;
  }
): XOAuthConfig {

  const environment =
    process.env.X_SOCIAL_ENVIRONMENT ===
      "production"
      ? "production"
      : "test";

  return {
    clientId:
      env("X_CLIENT_ID"),

    clientSecret:
      env("X_CLIENT_SECRET"),

    redirectUri:
      process.env.X_OAUTH_REDIRECT_URI?.trim() ||
      `${input.requestOrigin}/api/social-connections/x/oauth/callback`,

    environment,
  };
}

export function buildXAuthorizeUrl(
  input: {
    config: XOAuthConfig;
    state: string;
    codeChallenge: string;
  }
): string {

  const url =
    new URL(
      "https://x.com/i/oauth2/authorize"
    );

  url.searchParams.set(
    "response_type",
    "code"
  );

  url.searchParams.set(
    "client_id",
    input.config.clientId
  );

  url.searchParams.set(
    "redirect_uri",
    input.config.redirectUri
  );

  url.searchParams.set(
    "scope",
    X_REQUIRED_SCOPES.join(" ")
  );

  url.searchParams.set(
    "state",
    input.state
  );

  url.searchParams.set(
    "code_challenge",
    input.codeChallenge
  );

  url.searchParams.set(
    "code_challenge_method",
    "S256"
  );

  return url.toString();
}

async function tokenRequest(
  config: XOAuthConfig,
  body: URLSearchParams
): Promise<XOAuthToken> {

  const basic =
    Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
      "utf8"
    ).toString("base64");

  const response =
    await fetch(
      "https://api.x.com/2/oauth2/token",
      {
        method: "POST",

        cache: "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Basic ${basic}`,

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          body.toString(),
      }
    );

  const payload =
    await response.json() as
      Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
        ? payload.error
        : "X OAuth token request failed."
    );
  }

  if (
    typeof payload.access_token !==
    "string"
  ) {
    throw new Error(
      "X access token is missing."
    );
  }

  const expiresIn =
    typeof payload.expires_in ===
      "number"
      ? payload.expires_in
      : 7200;

  return {
    accessToken:
      payload.access_token,

    expiresIn,

    ...(typeof payload.refresh_token ===
      "string"
      ? {
          refreshToken:
            payload.refresh_token,
        }
      : {}),

    ...(typeof payload.token_type ===
      "string"
      ? {
          tokenType:
            payload.token_type,
        }
      : {}),

    ...(typeof payload.scope ===
      "string"
      ? {
          scopes:
            payload.scope
              .split(/\s+/)
              .filter(Boolean),
        }
      : {}),
  };
}

export async function exchangeXAuthorizationCode(
  input: {
    config: XOAuthConfig;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }
): Promise<XOAuthToken> {

  const body =
    new URLSearchParams();

  body.set(
    "grant_type",
    "authorization_code"
  );

  body.set(
    "code",
    input.code
  );

  body.set(
    "redirect_uri",
    input.redirectUri
  );

  body.set(
    "code_verifier",
    input.codeVerifier
  );

  return tokenRequest(
    input.config,
    body
  );
}

export async function refreshXAccessToken(
  input: {
    config: XOAuthConfig;
    refreshToken: string;
  }
): Promise<XOAuthToken> {

  const body =
    new URLSearchParams();

  body.set(
    "grant_type",
    "refresh_token"
  );

  body.set(
    "refresh_token",
    input.refreshToken
  );

  return tokenRequest(
    input.config,
    body
  );
}

export async function getXUserInfo(
  input: {
    accessToken: string;
  }
): Promise<XUserInfo> {

  const response =
    await fetch(
      "https://api.x.com/2/users/me",
      {
        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,
        },
      }
    );

  const payload =
    await response.json() as {
      data?: {
        id?: string;
        name?: string;
        username?: string;
      };
    };

  if (
    !response.ok ||
    !payload.data?.id
  ) {
    throw new Error(
      "X user lookup failed."
    );
  }

  return {
    id:
      payload.data.id,

    name:
      payload.data.name ||
      payload.data.username ||
      "X",

    username:
      payload.data.username ||
      "",
  };
}

export async function createXPost(
  input: {
    accessToken: string;
    text: string;
  }
): Promise<{
  id: string;
  text: string;
}> {

  const text =
    input.text.trim();

  if (!text) {
    throw new Error(
      "X post text is empty."
    );
  }

  const response =
    await fetch(
      "https://api.x.com/2/tweets",
      {
        method:
          "POST",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            text,
          }),
      }
    );

  const payload =
    await response.json() as {
      data?: {
        id?: string;
        text?: string;
      };

      detail?: string;
      title?: string;
    };

  if (!response.ok) {
    throw Object.assign(
      new Error(
        payload.detail ||
        payload.title ||
        "X post publishing failed."
      ),
      {
        code:
          `X_HTTP_${response.status}`,
      }
    );
  }

  if (!payload.data?.id) {
    throw Object.assign(
      new Error(
        "X post id is missing."
      ),
      {
        code:
          "X_POST_ID_MISSING",
      }
    );
  }

  return {
    id:
      payload.data.id,

    text:
      payload.data.text ||
      text,
  };
}
