import type { PropertyFact, PropertyFactsV1 } from "./property-facts";
import { buildPropertyFactPrompt } from "./property-fact-prompt";

const SUPPLEMENTARY_KEYS = new Set([
  "marketingType",
  "bedrooms",
  "bathrooms",
  "plotArea",
  "usableArea",
  "constructionYear",
  "renovationYear",
  "condition",
  "floorLevel",
  "balcony",
  "terrace",
  "garden",
  "elevator",
  "parkingSpaces",
  "kitchen",
  "heatingSystem",
  "energySource",
  "energyCertificate",
  "photovoltaics",
  "netRent",
  "additionalCosts",
]);

export function buildSupplementaryPropertyFacts(
  raw: unknown,
  market: "CH" | "DE"
) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const facts: PropertyFact[] = [];

  for (const candidate of raw.slice(0, 80)) {
    if (
      candidate === null ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      continue;
    }

    const item = candidate as Record<string, unknown>;
    const key = item.key;

    if (
      typeof key !== "string" ||
      !SUPPLEMENTARY_KEYS.has(key)
    ) {
      continue;
    }

    const value = item.value;

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      continue;
    }

    if (
      typeof value === "string" &&
      (value.trim().length === 0 || value.length > 500)
    ) {
      continue;
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      continue;
    }

    const unit =
      typeof item.unit === "string" &&
      item.unit.length <= 30
        ? item.unit
        : undefined;

    // Never trust client-supplied provenance or verification.
    facts.push({
      key,
      value,
      ...(unit === undefined ? {} : { unit }),
      source: "user_input",
      status: "reported",
    });
  }

  const input: PropertyFactsV1 = {
    version: "v1",
    market,
    facts,
  };

  return buildPropertyFactPrompt(input).facts;
}