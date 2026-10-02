import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import type {
  StorageObject,
  StorageProvider,
  StoragePutInput,
} from "./storage.types";

type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
};

const MAX_ATTEMPTS = 3;

let cachedClient:
  | S3Client
  | null = null;

function requireEnv(
  name: string
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing storage environment variable: ${name}`
    );
  }

  return value;
}

function getConfig(): R2Config {
  return {
    endpoint:
      requireEnv("R2_ENDPOINT"),

    bucket:
      requireEnv("R2_BUCKET"),

    accessKeyId:
      requireEnv("R2_ACCESS_KEY_ID"),

    secretAccessKey:
      requireEnv("R2_SECRET_ACCESS_KEY"),

    publicBaseUrl:
      process.env.R2_PUBLIC_BASE_URL
        ?.trim()
        .replace(/\/+$/, "") ||
      null,
  };
}

function getClient(
  config: R2Config
): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient =
    new S3Client({
      region: "auto",
      endpoint:
        config.endpoint,
      credentials: {
        accessKeyId:
          config.accessKeyId,
        secretAccessKey:
          config.secretAccessKey,
      },
    });

  return cachedClient;
}

function normalizePathname(
  pathname: string
): string {
  const normalized =
    pathname
      .trim()
      .replace(/^\/+/, "");

  if (
    !normalized ||
    normalized.includes("..")
  ) {
    throw new Error(
      "Invalid storage pathname."
    );
  }

  return normalized;
}

function objectUrl(
  config: R2Config,
  pathname: string
): string {
  const encodedPath =
    pathname
      .split("/")
      .map(encodeURIComponent)
      .join("/");

  if (!config.publicBaseUrl) {
    return "";
  }

  return (
    config.publicBaseUrl +
    "/" +
    encodedPath
  );
}

function statusCode(
  error: unknown
): number | null {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const metadata =
    "$metadata" in error
      ? (
          error as {
            $metadata?: {
              httpStatusCode?: number;
            };
          }
        ).$metadata
      : undefined;

  return (
    metadata?.httpStatusCode ??
    null
  );
}

function isRetryable(
  error: unknown
): boolean {
  const status =
    statusCode(error);

  if (
    status === 408 ||
    status === 429 ||
    (
      status !== null &&
      status >= 500
    )
  ) {
    return true;
  }

  if (
    error instanceof Error
  ) {
    return [
      "ECONNRESET",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "UND_ERR_CONNECT_TIMEOUT",
    ].some((code) =>
      error.message.includes(code)
    );
  }

  return false;
}

async function withRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        attempt === MAX_ATTEMPTS ||
        !isRetryable(error)
      ) {
        throw error;
      }

      await new Promise<void>(
        (resolve) => {
          setTimeout(
            resolve,
            150 *
              2 ** (attempt - 1)
          );
        }
      );
    }
  }

  throw lastError;
}

export type PresignedUpload = {
  pathname: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export async function createR2PresignedUpload(
  input: {
    pathname: string;
    contentType: string;
    expiresInSeconds?: number;
  }
): Promise<PresignedUpload> {
  const config =
    getConfig();

  const client =
    getClient(config);

  const pathname =
    normalizePathname(
      input.pathname
    );

  const expiresInSeconds =
    Math.min(
      Math.max(
        input.expiresInSeconds ??
          300,
        60
      ),
      900
    );

  const uploadUrl =
    await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket:
          config.bucket,
        Key:
          pathname,
        ContentType:
          input.contentType,
      }),
      {
        expiresIn:
          expiresInSeconds,
      }
    );

  return {
    pathname,
    uploadUrl,
    expiresInSeconds,
  };
}

export async function createR2PresignedReadUrl(
  input: {
    pathname: string;
    expiresInSeconds?: number;
  }
): Promise<string> {
  const config =
    getConfig();

  const client =
    getClient(config);

  const pathname =
    normalizePathname(
      input.pathname
    );

  const expiresInSeconds =
    Math.min(
      Math.max(
        input.expiresInSeconds ??
          300,
        60
      ),
      900
    );

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket:
        config.bucket,
      Key:
        pathname,
    }),
    {
      expiresIn:
        expiresInSeconds,
    }
  );
}

export const r2Storage:
  StorageProvider = {
    async put(
      input: StoragePutInput
    ): Promise<StorageObject> {
      const config =
        getConfig();

      const client =
        getClient(config);

      const pathname =
        normalizePathname(
          input.pathname
        );

      await withRetry(() =>
        client.send(
          new PutObjectCommand({
            Bucket:
              config.bucket,
            Key:
              pathname,
            Body:
              input.body,
            ContentType:
              input.contentType,
          })
        )
      );

      return {
        pathname,
        url:
          objectUrl(
            config,
            pathname
          ),
        contentType:
          input.contentType,
        size:
          input.body.byteLength,
      };
    },

    async head(
      inputPathname: string
    ): Promise<StorageObject> {
      const config =
        getConfig();

      const client =
        getClient(config);

      const pathname =
        normalizePathname(
          inputPathname
        );

      const result =
        await withRetry(() =>
          client.send(
            new HeadObjectCommand({
              Bucket:
                config.bucket,
              Key:
                pathname,
            })
          )
        );

      return {
        pathname,
        url:
          objectUrl(
            config,
            pathname
          ),
        contentType:
          result.ContentType ??
          "application/octet-stream",
        size:
          result.ContentLength ??
          0,
      };
    },

    async getBytes(
    pathname: string
  ): Promise<Uint8Array> {
    const config = getConfig();
    const client = getClient(config);
    const normalizedPathname =
      normalizePathname(pathname);

    return withRetry(
      async () => {
        const result =
          await client.send(
            new GetObjectCommand({
              Bucket:
                config.bucket,
              Key:
                normalizedPathname,
            })
          );

        if (!result.Body) {
          throw new Error(
            "R2 object has no body: " +
              normalizedPathname
          );
        }

        return result.Body
          .transformToByteArray();
      }
    );
  },

  async delete(
      input:
        | string
        | string[]
    ): Promise<void> {
      const config =
        getConfig();

      const client =
        getClient(config);

      const pathnames =
        (
          Array.isArray(input)
            ? input
            : [input]
        )
          .map(
            normalizePathname
          );

      if (
        pathnames.length === 0
      ) {
        return;
      }

      await withRetry(() =>
        client.send(
          new DeleteObjectsCommand({
            Bucket:
              config.bucket,
            Delete: {
              Objects:
                pathnames.map(
                  (pathname) => ({
                    Key:
                      pathname,
                  })
                ),
              Quiet:
                true,
            },
          })
        )
      );
    },
  };

