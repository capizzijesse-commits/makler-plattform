import "server-only";

import { XMLParser, XMLValidator } from "fast-xml-parser";

export type ImmoScout24DeImageLookupParseResultV1 =
  | {
      status: "candidate";
      externalId: string;
      checksum: string;
      attachmentId: string;
      authenticated: false;
      retryUploadAllowed: false;
    }
  | {
      status: "unconfirmed";
      reason: string;
      retryUploadAllowed: false;
    };

function unconfirmed(
  reason: string
): ImmoScout24DeImageLookupParseResultV1 {
  return {
    status: "unconfirmed",
    reason,
    retryUploadAllowed: false,
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  trimValues: true,
  isArray: (
    name: string
  ) => [
    "externalId",
    "externalCheckSum",
    "title",
    "floorplan",
    "titlePicture",
    "urls",
    "url",
  ].includes(name),
});

function record(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

/**
 * Offline, fail-closed parser for a provisional
 * single-attachment XML response shape.
 *
 * Does NOT authenticate HTTP responses.
 * Does NOT confirm images in PostgreSQL.
 * Does NOT authorize another upload.
 *
 * Actual provider response structure must
 * be independently verified before integration.
 */
export function parseImmoScout24DeImageLookupV1(
  input: {
    httpStatus: number;
    raw: string;
    expectedExternalId: string;
    expectedChecksum: string;
    expectedRealEstateId?: string;
  }
): ImmoScout24DeImageLookupParseResultV1 {
  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(
      input.expectedExternalId
    ) ||
    !/^[a-f0-9]{64}$/.test(
      input.expectedChecksum
    )
  ) {
    return unconfirmed("INVALID_EXPECTED_IDENTITY");
  }

  if (input.httpStatus !== 200) {
    return unconfirmed("LOOKUP_HTTP_UNCONFIRMED");
  }

  if (
    typeof input.raw !== "string" ||
    Buffer.byteLength(input.raw, "utf8") > 65536 ||
    !input.raw.trim()
  ) {
    return unconfirmed("LOOKUP_BODY_INVALID");
  }

  const xml = input.raw.trim();

  // No DTD, entities, CDATA or document-level
  // instructions except the XML declaration.
  if (
    /<!|&(?!(?:amp|lt|gt|quot|apos);)|<\?(?!xml(?:\s|\?>))/i.test(xml)
  ) {
    return unconfirmed("LOOKUP_XML_UNSAFE");
  }

  const declarations =
    xml.match(/<\?xml\b[\s\S]*?\?>/gi) ?? [];

  if (
    declarations.length > 1 ||
    (declarations.length === 1 &&
      !xml.startsWith(declarations[0]))
  ) {
    return unconfirmed("LOOKUP_XML_UNSAFE");
  }

  if (XMLValidator.validate(xml) !== true) {
    return unconfirmed("LOOKUP_XML_INVALID");
  }

  let parsed: unknown;

  try {
    parsed = parser.parse(xml);
  } catch {
    return unconfirmed("LOOKUP_XML_INVALID");
  }

  const document = record(parsed);

  if (!document) {
    return unconfirmed("LOOKUP_STRUCTURE_UNKNOWN");
  }

  // Provider supports a single attachment and collection
  // responses. Normalize only a strictly validated shape.
  const collection = record(document["common:attachments"]);
  let root = record(document["common:attachment"]);

  if (collection) {
    const allowedCollectionKeys = new Set([
      "@_xmlns:common",
      "@_xmlns:xlink",
      "@_xmlns:offerlistelement",
      "@_xmlns:ns5",
      "@_xmlns:ns6",
      "@_xmlns:realestates",
      "@_xmlns:ns8",
      "@_xmlns:gis",
      "@_xmlns:search",
      "@_xmlns:videoupload",
      "@_xmlns:ns12",
      "attachment",
      "common:attachment",
    ]);

    if (
      Object.keys(collection).some(
        (key) => !allowedCollectionKeys.has(key)
      ) ||
      collection["@_xmlns:common"] !==
        "http://rest.immobilienscout24.de/schema/common/1.0"
    ) {
      return unconfirmed("LOOKUP_STRUCTURE_UNKNOWN");
    }

    for (const [key, value] of Object.entries(collection)) {
      if (!key.startsWith("@_xmlns:")) continue;

      if (
        typeof value !== "string" ||
        value.length > 256 ||
        !/^https?:\/\/[^\s<>"']+$/.test(value)
      ) {
        return unconfirmed("LOOKUP_NAMESPACE_INVALID");
      }
    }

    const bare = collection["attachment"];
    const prefixed = collection["common:attachment"];

    if (bare !== undefined && prefixed !== undefined) {
      return unconfirmed("LOOKUP_ATTACHMENT_COUNT_INVALID");
    }

    const entries = bare !== undefined ? bare : prefixed;

    if (Array.isArray(entries)) {
      if (entries.length !== 1) {
        return unconfirmed("LOOKUP_ATTACHMENT_COUNT_INVALID");
      }
      root = record(entries[0]);
    } else {
      root = record(entries);
    }

    if (bare !== undefined && root) {
      if (
        collection["@_xmlns:xlink"] !==
          "http://www.w3.org/1999/xlink" ||
        typeof root["@_xlink:href"] !== "string" ||
        root["@_ns5:href"] !== undefined ||
        root["@_xmlns:ns5"] !== undefined ||
        (
          root["@_xmlns:common"] !== undefined &&
          root["@_xmlns:common"] !==
            collection["@_xmlns:common"]
        )
      ) {
        return unconfirmed("LOOKUP_HREF_INVALID");
      }

      const modification = root["@_modification"];

      if (
        modification !== undefined &&
        (
          typeof modification !== "string" ||
          modification.length < 1 ||
          modification.length > 128 ||
          !/^[\x20-\x7e]+$/.test(modification)
        )
      ) {
        return unconfirmed("LOOKUP_METADATA_INVALID");
      }

      root = {
        ...root,
        "@_xmlns:common": collection["@_xmlns:common"],
        "@_xmlns:ns5": collection["@_xmlns:xlink"],
        "@_ns5:href": root["@_xlink:href"],
      };

      delete root["@_xlink:href"];
      delete root["@_modification"];
    }
  }

  if (!root) {
    return unconfirmed("LOOKUP_STRUCTURE_UNKNOWN");
  }

  // Strict allowlist for provisional single-picture XML.
  const allowedRootKeys = new Set([
    "@_id",
    "@_xmlns:common",
    "@_xmlns:xsi",
    "@_xmlns:gis",
    "@_xmlns:search",
    "@_xmlns:ns5",
    "@_ns5:href",
    "@_xsi:type",
    "externalId",
    "externalCheckSum",
    "title",
    "floorplan",
    "titlePicture",
    "urls",
  ]);

  const allowedDocumentKeys = new Set([
    "?xml",
    collection ? "common:attachments" : "common:attachment",
  ]);

  if (
    Object.keys(document).some(
      (key) => !allowedDocumentKeys.has(key)
    ) ||
    Object.keys(root).some(
      (key) => !allowedRootKeys.has(key)
    )
  ) {
    return unconfirmed("LOOKUP_STRUCTURE_UNKNOWN");
  }

  if (
    (
      root["@_xmlns:common"] !== undefined &&
      root["@_xmlns:common"] !==
        "http://rest.immobilienscout24.de/schema/common/1.0"
    ) ||
    (
      root["@_xmlns:xsi"] !== undefined &&
      root["@_xmlns:xsi"] !==
        "http://www.w3.org/2001/XMLSchema-instance"
    ) ||
    (
      root["@_xsi:type"] !== undefined &&
      root["@_xsi:type"] !== "common:Picture"
    )
  ) {
    return unconfirmed("LOOKUP_PICTURE_TYPE_INVALID");
  }


  const knownNamespaces: Record<string, string> = {
    "@_xmlns:gis":
      "http://rest.immobilienscout24.de/schema/platform/gis/1.0",
    "@_xmlns:search":
      "http://rest.immobilienscout24.de/schema/search/common/1.0",
    "@_xmlns:ns5":
      "http://www.w3.org/1999/xlink",
  };

  for (const [key, expected] of Object.entries(knownNamespaces)) {
    const observed = root[key];

    if (
      observed !== undefined &&
      observed !== expected
    ) {
      return unconfirmed("LOOKUP_NAMESPACE_INVALID");
    }
  }

  const href = root["@_ns5:href"];

  // A candidate must have the complete picture identity.
  // A missing href or missing type can never be confirmed.
  if (
    root["@_xmlns:common"] !==
      "http://rest.immobilienscout24.de/schema/common/1.0" ||
    root["@_xmlns:xsi"] !==
      "http://www.w3.org/2001/XMLSchema-instance" ||
    root["@_xsi:type"] !== "common:Picture" ||
    root["@_xmlns:ns5"] !==
      "http://www.w3.org/1999/xlink" ||
    typeof href !== "string" ||
    typeof input.expectedRealEstateId !== "string" ||
    !/^[0-9]{1,20}$/.test(input.expectedRealEstateId)
  ) {
    return unconfirmed("LOOKUP_REQUIRED_IDENTITY_MISSING");
  }

  if (href !== undefined) {
    const realEstateId = input.expectedRealEstateId;

    if (
      typeof href !== "string" ||
      typeof realEstateId !== "string" ||
      !/^[0-9]{1,20}$/.test(realEstateId) ||
      root["@_xmlns:ns5"] !== knownNamespaces["@_xmlns:ns5"] ||
      root["@_xsi:type"] !== "common:Picture" ||
      root["@_xmlns:common"] !==
        "http://rest.immobilienscout24.de/schema/common/1.0" ||
      root["@_xmlns:xsi"] !==
        "http://www.w3.org/2001/XMLSchema-instance"
    ) {
      return unconfirmed("LOOKUP_HREF_INVALID");
    }

    const attachmentId = root["@_id"];

    if (
      typeof attachmentId !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(attachmentId)
    ) {
      return unconfirmed("LOOKUP_HREF_INVALID");
    }

    const expectedHref =
      "https://rest.sandbox-immobilienscout24.de" +
      "/restapi/api/offer/v1.0/user/me/realestate/" +
      realEstateId +
      "/attachment/" +
      attachmentId;

    if (href !== expectedHref) {
      return unconfirmed("LOOKUP_HREF_MISMATCH");
    }
  }

  for (const key of ["title", "floorplan", "titlePicture"]) {
    const values = root[key];

    if (values === undefined) continue;

    if (
      !Array.isArray(values) ||
      values.length !== 1 ||
      typeof values[0] !== "string"
    ) {
      return unconfirmed("LOOKUP_METADATA_INVALID");
    }

    if (
      (key === "floorplan" || key === "titlePicture") &&
      values[0] !== "true" &&
      values[0] !== "false"
    ) {
      return unconfirmed("LOOKUP_METADATA_INVALID");
    }
  }
  // Optional image URLs are metadata, never identity evidence.
  const urls = root["urls"];

  if (urls !== undefined) {
    if (!Array.isArray(urls) || urls.length !== 1) {
      return unconfirmed("LOOKUP_URLS_INVALID");
    }

    const container = record(urls[0]);
    if (!container || Object.keys(container).length !== 1) {
      return unconfirmed("LOOKUP_URLS_INVALID");
    }

    const entries = container["url"];

    if (
      !Array.isArray(entries) ||
      entries.length < 1 ||
      entries.length > 20
    ) {
      return unconfirmed("LOOKUP_URLS_INVALID");
    }

    const scales = new Set<string>();

    for (const entry of entries) {
      const item = record(entry);

      if (
        !item ||
        Object.keys(item).length !== 2 ||
        typeof item["@_scale"] !== "string" ||
        typeof item["@_href"] !== "string" ||
        !/^(?:SCALE|SCALE_AND_CROP|WHITE_FILLING|SCALE_[0-9]{1,4}x[0-9]{1,4})$/.test(item["@_scale"]) ||
        !item["@_href"].startsWith("https://") ||
        item["@_href"].length > 2048 ||
        scales.has(item["@_scale"])
      ) {
        return unconfirmed("LOOKUP_URLS_INVALID");
      }

      scales.add(item["@_scale"]);
    }
  }

  const attachmentId = root["@_id"];
  const externalId = root["externalId"];
  const checksum = root["externalCheckSum"];

  if (
    typeof attachmentId !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(attachmentId) ||
    !Array.isArray(externalId) ||
    externalId.length !== 1 ||
    typeof externalId[0] !== "string" ||
    !Array.isArray(checksum) ||
    checksum.length !== 1 ||
    typeof checksum[0] !== "string"
  ) {
    return unconfirmed("LOOKUP_IDENTITY_INCOMPLETE");
  }

  if (
    externalId[0] !== input.expectedExternalId ||
    checksum[0] !== input.expectedChecksum
  ) {
    return unconfirmed("LOOKUP_IDENTITY_MISMATCH");
  }

  return {
    status: "candidate",
    externalId: externalId[0],
    checksum: checksum[0],
    attachmentId,
    authenticated: false,
    retryUploadAllowed: false,
  };
}