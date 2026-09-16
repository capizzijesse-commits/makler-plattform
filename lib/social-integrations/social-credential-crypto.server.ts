import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";


const ALGORITHM =
  "aes-256-gcm";

const KEY_ENV_NAME =
  "SOCIAL_CREDENTIAL_ENCRYPTION_KEY";

const FORMAT_VERSION =
  "v1";

const IV_BYTES =
  12;

const AUTH_TAG_BYTES =
  16;


export type SocialCredentialSecret = {
  /**
   * Immer erforderlich.
   */
  accessToken:
    string;

  /**
   * Nicht jeder Provider liefert
   * einen Refresh Token.
   */
  refreshToken?:
    string;

  /**
   * Normalerweise "Bearer".
   */
  tokenType?:
    string;

  /**
   * Absoluter ISO-8601-Zeitpunkt.
   */
  expiresAt?:
    string;

  /**
   * Bewilligte OAuth Scopes.
   */
  scopes?:
    string[];
};


function cleanRequiredText(
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


function cleanOptionalText(
  value:
    unknown,
  label:
    string
):
  string |
  undefined {

  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

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

  return cleaned ||
    undefined;
}


function cleanExpiresAt(
  value:
    unknown
):
  string |
  undefined {

  const cleaned =
    cleanOptionalText(
      value,
      "Expires at"
    );

  if (!cleaned) {
    return undefined;
  }

  const timestamp =
    Date.parse(
      cleaned
    );

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    throw new Error(
      "Expires at must be a valid date."
    );
  }

  return new Date(
    timestamp
  ).toISOString();
}


function cleanScopes(
  value:
    unknown
):
  string[] |
  undefined {

  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    throw new Error(
      "Scopes must be an array."
    );
  }

  const scopes =
    value.map(
      (
        scope,
        index
      ) =>
        cleanRequiredText(
          scope,
          `Scope ${index + 1}`
        )
    );

  const uniqueScopes =
    Array.from(
      new Set(
        scopes
      )
    );

  return uniqueScopes.length
    ? uniqueScopes
    : undefined;
}


function normalizeSecret(
  input:
    Record<
      string,
      unknown
    >
):
  SocialCredentialSecret {

  const accessToken =
    cleanRequiredText(
      input.accessToken,
      "Access token"
    );

  const refreshToken =
    cleanOptionalText(
      input.refreshToken,
      "Refresh token"
    );

  const tokenType =
    cleanOptionalText(
      input.tokenType,
      "Token type"
    );

  const expiresAt =
    cleanExpiresAt(
      input.expiresAt
    );

  const scopes =
    cleanScopes(
      input.scopes
    );


  return {
    accessToken,

    ...(refreshToken
      ? {
          refreshToken,
        }
      : {}),

    ...(tokenType
      ? {
          tokenType,
        }
      : {}),

    ...(expiresAt
      ? {
          expiresAt,
        }
      : {}),

    ...(scopes
      ? {
          scopes,
        }
      : {}),
  };
}


function getEncryptionKey():
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


  let key:
    Buffer;

  try {
    key =
      Buffer.from(
        raw,
        "base64url"
      );
  }
  catch {
    throw new Error(
      `${KEY_ENV_NAME} is not valid base64url.`
    );
  }


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


export function isSocialCredentialEncryptionConfigured():
  boolean {

  try {
    getEncryptionKey();

    return true;
  }
  catch {
    return false;
  }
}


export function sealSocialCredential(
  input:
    SocialCredentialSecret
):
  string {

  const secret =
    normalizeSecret(
      input as unknown as
        Record<
          string,
          unknown
        >
    );


  const plaintext =
    Buffer.from(
      JSON.stringify(
        secret
      ),
      "utf8"
    );


  const key =
    getEncryptionKey();

  const iv =
    randomBytes(
      IV_BYTES
    );


  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv
    );


  const ciphertext =
    Buffer.concat([
      cipher.update(
        plaintext
      ),

      cipher.final(),
    ]);


  const authTag =
    cipher.getAuthTag();


  if (
    authTag.length !==
    AUTH_TAG_BYTES
  ) {
    throw new Error(
      "Unexpected AES-GCM authentication tag length."
    );
  }


  return [
    FORMAT_VERSION,

    iv.toString(
      "base64url"
    ),

    authTag.toString(
      "base64url"
    ),

    ciphertext.toString(
      "base64url"
    ),
  ].join(
    "."
  );
}


export function openSocialCredential(
  sealed:
    string
):
  SocialCredentialSecret {

  const parts =
    sealed
      .trim()
      .split(
        "."
      );


  if (
    parts.length !==
      4 ||
    parts[0] !==
      FORMAT_VERSION
  ) {
    throw new Error(
      "Unsupported encrypted social credential format."
    );
  }


  const iv =
    Buffer.from(
      parts[1],
      "base64url"
    );

  const authTag =
    Buffer.from(
      parts[2],
      "base64url"
    );

  const ciphertext =
    Buffer.from(
      parts[3],
      "base64url"
    );


  if (
    iv.length !==
    IV_BYTES
  ) {
    throw new Error(
      "Invalid encrypted social credential IV."
    );
  }


  if (
    authTag.length !==
    AUTH_TAG_BYTES
  ) {
    throw new Error(
      "Invalid encrypted social credential authentication tag."
    );
  }


  if (
    ciphertext.length ===
    0
  ) {
    throw new Error(
      "Encrypted social credential payload is empty."
    );
  }


  const decipher =
    createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      iv
    );

  decipher.setAuthTag(
    authTag
  );


  const plaintext =
    Buffer.concat([
      decipher.update(
        ciphertext
      ),

      decipher.final(),
    ]).toString(
      "utf8"
    );


  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        plaintext
      );
  }
  catch {
    throw new Error(
      "Encrypted social credential payload is invalid."
    );
  }


  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    Array.isArray(
      parsed
    )
  ) {
    throw new Error(
      "Encrypted social credential payload has an invalid structure."
    );
  }


  return normalizeSecret(
    parsed as
      Record<
        string,
        unknown
      >
  );
}