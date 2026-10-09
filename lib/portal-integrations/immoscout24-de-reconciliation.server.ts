import "server-only";

export type ImmoScout24DeLookupResult =
  | {
      status: "found";
      externalId: string;
      externalObjectId: string;
    }
  | {
      status: "not_found";
      externalId: string;
      retryCreateAllowed: false;
    };

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function prepareImmoScout24DeLookupV1(
  externalId: string
) {
  const id = externalId.trim();

  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    fail("IMMOSCOUT24_DE_LOOKUP_INVALID_EXTERNAL_ID");
  }

  return {
    method: "GET" as const,
    path:
      "/restapi/api/offer/v1.0/user/me/realestate/ext-" +
      encodeURIComponent(id),
    externalId: id,
    environment: "sandbox" as const,
  };
}

/**
 * Parses a narrowly scoped XML response.
 *
 * 404 does NOT authorize a new POST.
 * Any ambiguous response blocks reconciliation.
 */
export function parseImmoScout24DeLookupV1(input: {
  statusCode: number;
  raw: string;
  expectedExternalId: string;
}): ImmoScout24DeLookupResult {
  const expected = prepareImmoScout24DeLookupV1(
    input.expectedExternalId
  ).externalId;

  if (input.statusCode === 404) {
    return {
      status: "not_found",
      externalId: expected,
      retryCreateAllowed: false,
    };
  }

  if (input.statusCode !== 200) {
    fail("IMMOSCOUT24_DE_LOOKUP_HTTP_UNCONFIRMED");
  }

  const xml = input.raw.trim();

  // Accept a single known realestate root.
  const root = xml.match(
    /<(realestates:[A-Za-z][A-Za-z0-9]*)(\s[^<>]*?)?>([\s\S]*?)<\/\1>\s*$/
  );

  if (!root) {
    fail("IMMOSCOUT24_DE_LOOKUP_XML_UNCONFIRMED");
  }

  const prefix = xml.slice(0, xml.indexOf(root[0]));

  if (
    prefix.trim() &&
    !/^<\?xml\s[^<>]*\?>\s*$/.test(prefix.trim())
  ) {
    fail("IMMOSCOUT24_DE_LOOKUP_XML_UNCONFIRMED");
  }

  const attributes = root[2] ?? "";
  const body = root[3];

  const idMatches = Array.from(
    attributes.matchAll(/(?:^|\s)id="(\d+)"/g)
  );

  const externalMatches = Array.from(
    body.matchAll(/<externalId>([^<]*)<\/externalId>/g)
  );

  if (
    idMatches.length !== 1 ||
    externalMatches.length !== 1 ||
    externalMatches[0][1] !== expected
  ) {
    fail("IMMOSCOUT24_DE_LOOKUP_IDENTITY_MISMATCH");
  }

  return {
    status: "found",
    externalId: expected,
    externalObjectId: idMatches[0][1],
  };
}
