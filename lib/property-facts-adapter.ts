import type {
  PropertyFact,
  PropertyFactsV1,
} from "./property-facts";

export type ExtractedPropertyInput = {
  countryCode?: "CH" | "DE" | "AT";
  street?: string;
  postalCode?: string;
  location?: string;
  propertyType?: string;
  rooms?: string;
  livingArea?: string;
  price?: string;
  highlights?: string;
  sourceSummary?: string;
  missingFields?: string[];
};

const CORE_FIELDS = [
  "street",
  "postalCode",
  "location",
  "propertyType",
  "rooms",
  "livingArea",
  "price",
] as const;

export function buildPropertyFactsFromExpose(
  input: ExtractedPropertyInput
): PropertyFactsV1 {
  const facts: PropertyFact[] = [];

  const missing = new Set(
    (input.missingFields ?? []).map(
      (key) => key.trim()
    )
  );

  for (const key of CORE_FIELDS) {
    const value = input[key]?.trim();

    if (!value || missing.has(key)) {
      continue;
    }

    facts.push({
      key,
      value,
      source: "document",
      status: "reported",
    });
  }

  const highlights =
    input.highlights?.trim();

  if (highlights) {
    facts.push({
      key: "highlights",
      value: highlights,
      source: "document",
      status: "uncertain",
    });
  }

  return {
    version: "v1",
    market:
      input.countryCode === "DE" ||
      input.countryCode === "AT"
        ? input.countryCode
        : "CH",
    propertyType:
      input.propertyType?.trim() || undefined,
    facts,
  };
}