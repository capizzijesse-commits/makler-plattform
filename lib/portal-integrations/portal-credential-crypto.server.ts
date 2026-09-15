import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";


const ALGORITHM =
  "aes-256-gcm";

const KEY_ENV_NAME =
  "PORTAL_CREDENTIAL_ENCRYPTION_KEY";

const FORMAT_VERSION =
  "v1";

const IV_BYTES =
  12;

const AUTH_TAG_BYTES =
  16;


export type PortalCredentialSecret = {
  accessToken:
    string;

  accessTokenSecret:
    string;
};


function cleanSecret(
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


export function isPortalCredentialEncryptionConfigured():
  boolean {

  try {

    getEncryptionKey();

    return true;
  }
  catch {

    return false;
  }
}


export function sealPortalCredential(
  input:
    PortalCredentialSecret
):
  string {

  const accessToken =
    cleanSecret(
      input.accessToken,
      "Access token"
    );

  const accessTokenSecret =
    cleanSecret(
      input.accessTokenSecret,
      "Access token secret"
    );


  const plaintext =
    Buffer.from(
      JSON.stringify({
        accessToken,
        accessTokenSecret,
      }),
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


export function openPortalCredential(
  sealed:
    string
):
  PortalCredentialSecret {

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
      "Unsupported encrypted portal credential format."
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
      "Invalid encrypted portal credential IV."
    );
  }


  if (
    authTag.length !==
    AUTH_TAG_BYTES
  ) {

    throw new Error(
      "Invalid encrypted portal credential authentication tag."
    );
  }


  if (
    ciphertext.length ===
    0
  ) {

    throw new Error(
      "Encrypted portal credential payload is empty."
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
      "Encrypted portal credential payload is invalid."
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
      "Encrypted portal credential payload has an invalid structure."
    );
  }


  const candidate =
    parsed as
      Record<
        string,
        unknown
      >;


  if (
    typeof candidate.accessToken !==
      "string" ||
    typeof candidate.accessTokenSecret !==
      "string"
  ) {

    throw new Error(
      "Encrypted portal credential payload is incomplete."
    );
  }


  return {
    accessToken:
      cleanSecret(
        candidate.accessToken,
        "Access token"
      ),

    accessTokenSecret:
      cleanSecret(
        candidate.accessTokenSecret,
        "Access token secret"
      ),
  };
}