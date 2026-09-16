import "server-only";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";


const KEY_ENV_NAME =
  "SOCIAL_CREDENTIAL_ENCRYPTION_KEY";

const FLOW_VERSION =
  1;

const FLOW_TTL_SECONDS =
  10 * 60;


type LinkedInOAuthFlowPayload = {
  v:
    number;

  provider:
    "linkedin";

  userId:
    string;

  state:
    string;

  redirectUri:
    string;

  expiresAt:
    number;
};


function getSigningKey():
  Buffer {

  const raw =
    process.env[
      KEY_ENV_NAME
    ]
      ?.trim();

  if (!raw) {
    throw new Error(
      `${KEY_ENV_NAME} is not configured.`
    );
  }

  const key =
    Buffer.from(
      raw,
      "base64url"
    );

  if (
    key.length !==
    32
  ) {
    throw new Error(
      `${KEY_ENV_NAME} must decode to exactly 32 bytes.`
    );
  }

  return key;
}


function sign(
  body:
    string
):
  string {

  return createHmac(
    "sha256",
    getSigningKey()
  )
    .update(
      `linkedin:${body}`,
      "utf8"
    )
    .digest(
      "base64url"
    );
}


function secureEquals(
  left:
    string,
  right:
    string
):
  boolean {

  const leftBuffer =
    Buffer.from(
      left,
      "utf8"
    );

  const rightBuffer =
    Buffer.from(
      right,
      "utf8"
    );

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}


export function createLinkedInOAuthFlow(
  input: {
    userId:
      string;

    redirectUri:
      string;
  }
): {
  state:
    string;

  cookieValue:
    string;

  maxAge:
    number;
} {

  const userId =
    input.userId.trim();

  const redirectUri =
    input.redirectUri.trim();

  if (
    !userId ||
    !redirectUri
  ) {
    throw new Error(
      "LinkedIn OAuth flow input is incomplete."
    );
  }

  const state =
    randomBytes(
      32
    ).toString(
      "base64url"
    );

  const payload:
    LinkedInOAuthFlowPayload = {
      v:
        FLOW_VERSION,

      provider:
        "linkedin",

      userId,

      state,

      redirectUri,

      expiresAt:
        Date.now() +
        FLOW_TTL_SECONDS *
          1000,
    };

  const body =
    Buffer.from(
      JSON.stringify(
        payload
      ),
      "utf8"
    ).toString(
      "base64url"
    );

  const signature =
    sign(
      body
    );

  return {
    state,

    cookieValue:
      `${body}.${signature}`,

    maxAge:
      FLOW_TTL_SECONDS,
  };
}


export function consumeLinkedInOAuthFlow(
  input: {
    cookieValue:
      string;

    userId:
      string;

    state:
      string;
  }
): {
  redirectUri:
    string;
} |
null {

  const parts =
    input.cookieValue
      .trim()
      .split(
        "."
      );

  if (
    parts.length !==
    2
  ) {
    return null;
  }

  const [
    body,
    signature,
  ] =
    parts;

  const expected =
    sign(
      body
    );

  if (
    !secureEquals(
      signature,
      expected
    )
  ) {
    return null;
  }

  let parsed:
    unknown;

  try {

    parsed =
      JSON.parse(
        Buffer.from(
          body,
          "base64url"
        ).toString(
          "utf8"
        )
      );
  }
  catch {

    return null;
  }

  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    Array.isArray(
      parsed
    )
  ) {
    return null;
  }

  const payload =
    parsed as
      Partial<
        LinkedInOAuthFlowPayload
      >;

  if (
    payload.v !==
      FLOW_VERSION ||
    payload.provider !==
      "linkedin" ||
    typeof payload.userId !==
      "string" ||
    typeof payload.state !==
      "string" ||
    typeof payload.redirectUri !==
      "string" ||
    typeof payload.expiresAt !==
      "number"
  ) {
    return null;
  }

  if (
    payload.expiresAt <
    Date.now()
  ) {
    return null;
  }

  if (
    payload.userId !==
      input.userId ||
    payload.state !==
      input.state
  ) {
    return null;
  }

  return {
    redirectUri:
      payload.redirectUri,
  };
}