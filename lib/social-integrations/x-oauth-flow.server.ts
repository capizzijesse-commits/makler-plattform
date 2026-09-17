import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const KEY_ENV_NAME =
  "SOCIAL_CREDENTIAL_ENCRYPTION_KEY";

const FLOW_TTL_SECONDS =
  10 * 60;

type FlowPayload = {
  v: 1;
  provider: "x";
  userId: string;
  state: string;
  redirectUri: string;
  codeVerifier: string;
  expiresAt: number;
};

function signingKey(): Buffer {
  const raw =
    process.env[
      KEY_ENV_NAME
    ]?.trim();

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

  if (key.length !== 32) {
    throw new Error(
      `${KEY_ENV_NAME} must decode to exactly 32 bytes.`
    );
  }

  return key;
}

function sign(
  body: string
): string {

  return createHmac(
    "sha256",
    signingKey()
  )
    .update(
      `x:${body}`,
      "utf8"
    )
    .digest(
      "base64url"
    );
}

export function createXOAuthFlow(
  input: {
    userId: string;
    redirectUri: string;
  }
) {

  const state =
    randomBytes(32)
      .toString("base64url");

  const codeVerifier =
    randomBytes(64)
      .toString("base64url");

  const codeChallenge =
    createHash("sha256")
      .update(
        codeVerifier,
        "utf8"
      )
      .digest(
        "base64url"
      );

  const payload: FlowPayload = {
    v: 1,

    provider:
      "x",

    userId:
      input.userId,

    state,

    redirectUri:
      input.redirectUri,

    codeVerifier,

    expiresAt:
      Date.now() +
      FLOW_TTL_SECONDS *
        1000,
  };

  const body =
    Buffer.from(
      JSON.stringify(payload),
      "utf8"
    ).toString(
      "base64url"
    );

  return {
    state,

    codeChallenge,

    cookieValue:
      `${body}.${sign(body)}`,

    maxAge:
      FLOW_TTL_SECONDS,
  };
}

export function consumeXOAuthFlow(
  input: {
    cookieValue: string;
    userId: string;
    state: string;
  }
): {
  redirectUri: string;
  codeVerifier: string;
} |
null {

  const [
    body,
    signature,
  ] =
    input.cookieValue
      .split(".");

  if (
    !body ||
    !signature
  ) {
    return null;
  }

  const expected =
    sign(body);

  const a =
    Buffer.from(signature);

  const b =
    Buffer.from(expected);

  if (
    a.length !== b.length ||
    !timingSafeEqual(a, b)
  ) {
    return null;
  }

  try {

    const payload =
      JSON.parse(
        Buffer.from(
          body,
          "base64url"
        ).toString("utf8")
      ) as FlowPayload;

    if (
      payload.v !== 1 ||
      payload.provider !== "x" ||
      payload.userId !==
        input.userId ||
      payload.state !==
        input.state ||
      payload.expiresAt <
        Date.now() ||
      !payload.redirectUri ||
      !payload.codeVerifier
    ) {
      return null;
    }

    return {
      redirectUri:
        payload.redirectUri,

      codeVerifier:
        payload.codeVerifier,
    };
  }
  catch {
    return null;
  }
}
