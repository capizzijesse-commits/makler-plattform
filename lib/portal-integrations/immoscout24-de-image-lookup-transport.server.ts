import "server-only";

import {
  prepareImmoScout24DeImageLookupRequestV1,
} from "./immoscout24-de-image-lookup-request.server";

import {
  parseImmoScout24DeImageLookupV1,
} from "./immoscout24-de-image-lookup-parser.server";

import type {
  ImmoScout24DeImageLookupParseResultV1,
} from "./immoscout24-de-image-lookup-parser.server";

const MAX_XML_BYTES = 65536;

type LookupHttpClient = (
  url: string,
  init: RequestInit
) => Promise<Response>;

function unconfirmed(
  reason: string
): ImmoScout24DeImageLookupParseResultV1 {
  return {
    status: "unconfirmed",
    reason,
    retryUploadAllowed: false,
  };
}

/**
 * Sandbox-only attachment lookup transport.
 *
 * The caller must explicitly supply the HTTP client.
 *
 * No automatic retries.
 * No redirects.
 * No database writes.
 * No automatic upload authorization.
 *
 * A parsed candidate is NOT an authenticated or
 * database-verified image confirmation.
 */
export async function executeImmoScout24DeImageLookupV1(
  input: {
    realEstateId: string;
    externalId: string;
    expectedChecksum: string;
    accessToken: string;
    accessTokenSecret: string;
    httpClient: LookupHttpClient;
  }
): Promise<ImmoScout24DeImageLookupParseResultV1> {
  if (typeof input.httpClient !== "function") {
    return unconfirmed("LOOKUP_HTTP_CLIENT_REQUIRED");
  }

  if (
    typeof input.expectedChecksum !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.expectedChecksum)
  ) {
    return unconfirmed("LOOKUP_CHECKSUM_INVALID");
  }

  // Request preparation enforces the sandbox boundary.
  const request = prepareImmoScout24DeImageLookupRequestV1({
    realEstateId: input.realEstateId,
    externalId: input.externalId,
    accessToken: input.accessToken,
    accessTokenSecret: input.accessTokenSecret,
  });

  let response: Response;

  try {
    response = await input.httpClient(request.url, {
      method: "GET",
      headers: {
        Authorization: request.authorization,
        Accept: request.accept,
      },
      redirect: "manual",
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return unconfirmed("LOOKUP_NETWORK_UNCONFIRMED");
  }

  if (
    !response ||
    !Number.isInteger(response.status) ||
    response.status !== 200
  ) {
    return unconfirmed("LOOKUP_HTTP_UNCONFIRMED");
  }

  const contentType = response.headers?.get("content-type");

  if (
    typeof contentType !== "string" ||
    !/^(application\/xml|text\/xml)(?:\s*;|$)/i.test(
      contentType.trim()
    )
  ) {
    return unconfirmed("LOOKUP_CONTENT_TYPE_INVALID");
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength !== null) {
    const length = Number(contentLength);

    if (
      !/^[0-9]+$/.test(contentLength) ||
      !Number.isSafeInteger(length) ||
      length > MAX_XML_BYTES
    ) {
      return unconfirmed("LOOKUP_BODY_TOO_LARGE");
    }
  }

  if (!response.body) {
    return unconfirmed("LOOKUP_BODY_MISSING");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const part = await reader.read();

      if (part.done) break;

      if (!(part.value instanceof Uint8Array)) {
        return unconfirmed("LOOKUP_BODY_INVALID");
      }

      total += part.value.byteLength;

      if (total > MAX_XML_BYTES) {
        void reader.cancel().catch(() => undefined);
        return unconfirmed("LOOKUP_BODY_TOO_LARGE");
      }

      chunks.push(part.value);
    }
  } catch {
    return unconfirmed("LOOKUP_BODY_READ_FAILED");
  } finally {
    reader.releaseLock();
  }

  if (total === 0) {
    return unconfirmed("LOOKUP_BODY_MISSING");
  }

  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let raw: string;

  try {
    raw = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes);
  } catch {
    return unconfirmed("LOOKUP_BODY_ENCODING_INVALID");
  }

  return parseImmoScout24DeImageLookupV1({
    httpStatus: response.status,
    raw,
    expectedExternalId: input.externalId,
    expectedChecksum: input.expectedChecksum,
    expectedRealEstateId: input.realEstateId,
  });
}