import "server-only";
import { XMLParser, XMLValidator } from "fast-xml-parser";

export type PublishReadbackResult =
  | { status: "confirmed"; publishId: string }
  | { status: "unconfirmed"; reason: string };

const NS = "http://rest.immobilienscout24.de/schema/common/1.0";
const XLINK_NS = "http://www.w3.org/1999/xlink";

function unconfirmed(reason: string): PublishReadbackResult {
  return { status: "unconfirmed", reason };
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: string[]
): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  trimValues: true,
  isArray: name => name === "publishObject",
});

export function parseImmoScout24DePublishReadbackV1(input: {
  httpStatus: number;
  raw: string;
  expectedObjectId: string;
  expectedChannelId: string;
}): PublishReadbackResult {
  if (
    !/^[0-9]{1,20}$/.test(input.expectedObjectId) ||
    !/^[0-9]{1,20}$/.test(input.expectedChannelId)
  ) return unconfirmed("INVALID_EXPECTED_IDENTITY");

  if (input.httpStatus !== 200)
    return unconfirmed("READBACK_HTTP_UNCONFIRMED");

  if (
    typeof input.raw !== "string" ||
    !input.raw.trim() ||
    Buffer.byteLength(input.raw, "utf8") > 65536
  ) return unconfirmed("READBACK_BODY_INVALID");

  const xml = input.raw.trim();

  // Refuse all entities, DTDs, CDATA and processing instructions
  // other than a single leading XML declaration.
  if (
    /<!|&|<\?(?!xml(?:\s|\?>))/i.test(xml) ||
    (xml.match(/<\?xml\b/gi) ?? []).length > 1 ||
    (xml.includes("<?xml") && !xml.startsWith("<?xml"))
  ) return unconfirmed("READBACK_XML_UNSAFE");

  if (XMLValidator.validate(xml) !== true)
    return unconfirmed("READBACK_XML_INVALID");

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    return unconfirmed("READBACK_XML_INVALID");
  }

  const document = record(parsed);
  if (
    !document ||
    !exactKeys(document, ["?xml", "common:publishObjects"])
  ) return unconfirmed("READBACK_ROOT_INVALID");

  const root = record(document["common:publishObjects"]);

  if (
    !root ||
    root["@_xmlns:common"] !== NS ||
    (
      root["@_xmlns:xlink"] !== undefined &&
      root["@_xmlns:xlink"] !== XLINK_NS
    ) ||
    !exactKeys(root, [
      "@_xmlns:common",
      "@_xmlns:xlink",
      "publishObject",
    ])
  ) return unconfirmed("READBACK_ROOT_INVALID");

  const entries = root["publishObject"];
  if (!Array.isArray(entries) || entries.length !== 1)
    return unconfirmed("READBACK_MAPPING_COUNT_INVALID");

  const entry = record(entries[0]);
  if (
    !entry ||
    !exactKeys(entry, ["@_id", "realEstate", "publishChannel"])
  ) return unconfirmed("READBACK_MAPPING_INVALID");

  const realEstate = record(entry["realEstate"]);
  const channel = record(entry["publishChannel"]);

  if (
    !realEstate ||
    !channel ||
    !exactKeys(realEstate, ["@_id", "@_title"]) ||
    !exactKeys(channel, ["@_id", "@_title"]) ||
    (
      realEstate["@_title"] !== undefined &&
      typeof realEstate["@_title"] !== "string"
    ) ||
    (
      channel["@_title"] !== undefined &&
      typeof channel["@_title"] !== "string"
    )
  ) return unconfirmed("READBACK_MAPPING_INVALID");

  const publishId =
    input.expectedObjectId + "_" + input.expectedChannelId;

  if (
    entry["@_id"] !== publishId ||
    realEstate["@_id"] !== input.expectedObjectId ||
    channel["@_id"] !== input.expectedChannelId
  ) return unconfirmed("READBACK_IDENTITY_MISMATCH");

  return { status: "confirmed", publishId };
}
