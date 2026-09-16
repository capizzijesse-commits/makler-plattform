import "server-only";


export const LINKEDIN_REQUIRED_SCOPES = [
  "openid",
  "profile",
  "w_member_social",
] as const;


export type LinkedInSocialEnvironment =
  | "test"
  | "production";


export type LinkedInOAuthConfig = {
  clientId:
    string;

  clientSecret:
    string;

  redirectUri:
    string;

  environment:
    LinkedInSocialEnvironment;
};


function requiredEnv(
  name:
    string
):
  string {

  const value =
    process.env[
      name
    ]
      ?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}


function cleanText(
  value:
    string,
  label:
    string
):
  string {

  const cleaned =
    value.trim();

  if (!cleaned) {
    throw new Error(
      `${label} must not be empty.`
    );
  }

  return cleaned;
}


function getEnvironment():
  LinkedInSocialEnvironment {

  const raw =
    process.env
      .LINKEDIN_SOCIAL_ENVIRONMENT
      ?.trim() ||
    "test";

  if (
    raw !== "test" &&
    raw !== "production"
  ) {
    throw new Error(
      "LINKEDIN_SOCIAL_ENVIRONMENT must be test or production."
    );
  }

  return raw;
}


function resolveRedirectUri(
  requestOrigin:
    string
):
  string {

  const configured =
    process.env
      .LINKEDIN_OAUTH_REDIRECT_URI
      ?.trim();

  const value =
    configured ||
    `${requestOrigin}/api/social-connections/linkedin/oauth/callback`;

  const url =
    new URL(
      value
    );

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    throw new Error(
      "LinkedIn OAuth redirect URI must use http or https."
    );
  }

  return url.toString();
}


export function getLinkedInOAuthConfig(
  input: {
    requestOrigin:
      string;
  }
):
  LinkedInOAuthConfig {

  return {
    clientId:
      requiredEnv(
        "LINKEDIN_CLIENT_ID"
      ),

    clientSecret:
      requiredEnv(
        "LINKEDIN_CLIENT_SECRET"
      ),

    redirectUri:
      resolveRedirectUri(
        input.requestOrigin
      ),

    environment:
      getEnvironment(),
  };
}


export function isLinkedInOAuthConfigured():
  boolean {

  try {

    requiredEnv(
      "LINKEDIN_CLIENT_ID"
    );

    requiredEnv(
      "LINKEDIN_CLIENT_SECRET"
    );

    getEnvironment();

    return true;
  }
  catch {

    return false;
  }
}


export function buildLinkedInAuthorizeUrl(
  input: {
    config:
      LinkedInOAuthConfig;

    state:
      string;
  }
):
  string {

  const state =
    cleanText(
      input.state,
      "OAuth state"
    );

  const url =
    new URL(
      "https://www.linkedin.com/oauth/v2/authorization"
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
    "state",
    state
  );

  url.searchParams.set(
    "scope",
    LINKEDIN_REQUIRED_SCOPES.join(
      " "
    )
  );

  return url.toString();
}

export type LinkedInOAuthToken = {
  accessToken:
    string;

  tokenType?:
    string;

  expiresIn:
    number;

  refreshToken?:
    string;

  refreshTokenExpiresIn?:
    number;

  scopes?:
    string[];
};


export type LinkedInUserInfo = {
  sub:
    string;

  name?:
    string;

  givenName?:
    string;

  familyName?:
    string;

  picture?:
    string;
};


function payloadText(
  value:
    unknown,
  label:
    string
):
  string {

  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `${label} must be a string.`
    );
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    throw new Error(
      `${label} must not be empty.`
    );
  }

  return cleaned;
}


function optionalPayloadText(
  value:
    unknown
):
  string |
  undefined {

  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    undefined;
}


function optionalPositiveNumber(
  value:
    unknown
):
  number |
  undefined {

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    ) ||
    value <=
      0
  ) {
    return undefined;
  }

  return value;
}


function linkedinProviderError(
  payload:
    unknown
):
  string {

  if (
    payload &&
    typeof payload ===
      "object" &&
    !Array.isArray(
      payload
    )
  ) {

    const record =
      payload as
        Record<
          string,
          unknown
        >;

    const description =
      optionalPayloadText(
        record.error_description
      );

    if (description) {
      return description;
    }

    const message =
      optionalPayloadText(
        record.message
      );

    if (message) {
      return message;
    }

    const providerError =
      optionalPayloadText(
        record.error
      );

    if (providerError) {
      return providerError;
    }
  }

  return "LinkedIn API request failed.";
}


async function readLinkedInJson(
  response:
    Response
):
  Promise<unknown> {

  const raw =
    await response.text();

  if (!raw.trim()) {
    return null;
  }

  try {

    return JSON.parse(
      raw
    );
  }
  catch {

    return null;
  }
}


export async function exchangeLinkedInAuthorizationCode(
  input: {
    config:
      LinkedInOAuthConfig;

    code:
      string;

    redirectUri:
      string;
  }
):
  Promise<
    LinkedInOAuthToken
  > {

  const code =
    cleanText(
      input.code,
      "Authorization code"
    );

  const redirectUri =
    cleanText(
      input.redirectUri,
      "Redirect URI"
    );


  const form =
    new URLSearchParams();

  form.set(
    "grant_type",
    "authorization_code"
  );

  form.set(
    "code",
    code
  );

  form.set(
    "client_id",
    input.config.clientId
  );

  form.set(
    "client_secret",
    input.config.clientSecret
  );

  form.set(
    "redirect_uri",
    redirectUri
  );


  const response =
    await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method:
          "POST",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          form.toString(),
      }
    );


  const payload =
    await readLinkedInJson(
      response
    );


  if (!response.ok) {
    throw new Error(
      linkedinProviderError(
        payload
      )
    );
  }


  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    throw new Error(
      "LinkedIn returned an invalid token response."
    );
  }


  const record =
    payload as
      Record<
        string,
        unknown
      >;


  const accessToken =
    payloadText(
      record.access_token,
      "LinkedIn access token"
    );


  const expiresIn =
    optionalPositiveNumber(
      record.expires_in
    );


  if (!expiresIn) {
    throw new Error(
      "LinkedIn access token expiry is missing."
    );
  }


  const tokenType =
    optionalPayloadText(
      record.token_type
    );


  const refreshToken =
    optionalPayloadText(
      record.refresh_token
    );


  const refreshTokenExpiresIn =
    optionalPositiveNumber(
      record.refresh_token_expires_in
    );


  const scopeText =
    optionalPayloadText(
      record.scope
    );


  const scopes =
    scopeText
      ? scopeText
          .split(
            /[\s,]+/
          )
          .map(
            scope =>
              scope.trim()
          )
          .filter(
            Boolean
          )
      : undefined;


  return {
    accessToken,

    expiresIn,

    ...(tokenType
      ? {
          tokenType,
        }
      : {}),

    ...(refreshToken
      ? {
          refreshToken,
        }
      : {}),

    ...(refreshTokenExpiresIn
      ? {
          refreshTokenExpiresIn,
        }
      : {}),

    ...(scopes?.length
      ? {
          scopes,
        }
      : {}),
  };
}


export async function getLinkedInUserInfo(
  input: {
    accessToken:
      string;
  }
):
  Promise<
    LinkedInUserInfo
  > {

  const accessToken =
    cleanText(
      input.accessToken,
      "Access token"
    );


  const response =
    await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        method:
          "GET",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );


  const payload =
    await readLinkedInJson(
      response
    );


  if (!response.ok) {
    throw new Error(
      linkedinProviderError(
        payload
      )
    );
  }


  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    throw new Error(
      "LinkedIn returned invalid user info."
    );
  }


  const record =
    payload as
      Record<
        string,
        unknown
      >;


  return {
    sub:
      payloadText(
        record.sub,
        "LinkedIn subject"
      ),

    name:
      optionalPayloadText(
        record.name
      ),

    givenName:
      optionalPayloadText(
        record.given_name
      ),

    familyName:
      optionalPayloadText(
        record.family_name
      ),

    picture:
      optionalPayloadText(
        record.picture
      ),
  };
}