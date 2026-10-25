import {
  getUsablePropertyFacts,
  type PropertyFact,
  type PropertyFactsV1,
} from "./property-facts";

import {
  getPropertyFactDefinition,
} from "./property-fact-catalog";

export type PublicPropertyFact = PropertyFact & {
  value: string | number | boolean;
};

export type PropertyFactValidationResult = {
  accepted: PublicPropertyFact[];
  rejected: Array<{
    key: string;
    reason: string;
  }>;
};

function parseStrictNumber(
  value: string | number | boolean
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!/^-?\d+(?:[.,]\d+)?$/.test(text)) {
    return null;
  }

  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

const AREA_UNITS = new Set([
  "m2",
  "m²",
  "qm",
  "quadratmeter",
]);

export function validatePublicPropertyFacts(
  input: PropertyFactsV1
): PropertyFactValidationResult {
  const accepted: PublicPropertyFact[] = [];
  const rejected: PropertyFactValidationResult["rejected"] = [];

  const usable = new Set(getUsablePropertyFacts(input));

  for (const fact of input.facts) {
    const definition = getPropertyFactDefinition(fact.key);

    if (!definition) {
      rejected.push({
        key: fact.key,
        reason: "unknown_property",
      });
      continue;
    }

    if (definition.publication !== "standard") {
      rejected.push({
        key: fact.key,
        reason: "restricted",
      });
      continue;
    }

    if (!usable.has(fact)) {
      rejected.push({
        key: fact.key,
        reason: "uncertain_or_conflicting",
      });
      continue;
    }

    const unit = (fact.unit ?? "").trim().toLowerCase();

    if (definition.valueType === "number") {
      const parsed = parseStrictNumber(fact.value);

      if (parsed === null) {
        rejected.push({
          key: fact.key,
          reason: "invalid_number",
        });
        continue;
      }

      if (
        definition.unit === "m2" &&
        unit !== "" &&
        !AREA_UNITS.has(unit)
      ) {
        rejected.push({
          key: fact.key,
          reason: "unsupported_unit",
        });
        continue;
      }

      if (
        definition.unit !== "m2" &&
        unit !== ""
      ) {
        rejected.push({
          key: fact.key,
          reason: "unexpected_unit",
        });
        continue;
      }

      if (
        ["rooms", "bedrooms", "bathrooms", "parkingSpaces"].includes(fact.key) &&
        parsed < 0
      ) {
        rejected.push({
          key: fact.key,
          reason: "negative_count",
        });
        continue;
      }

      if (
        ["livingArea", "plotArea", "usableArea"].includes(fact.key) &&
        parsed <= 0
      ) {
        rejected.push({
          key: fact.key,
          reason: "invalid_area",
        });
        continue;
      }

      if (
        ["constructionYear", "renovationYear"].includes(fact.key) &&
        (!Number.isInteger(parsed) || parsed < 1000 || parsed > 2100)
      ) {
        rejected.push({
          key: fact.key,
          reason: "invalid_year",
        });
        continue;
      }

      accepted.push({
        ...fact,
        value: parsed,
        unit: definition.unit,
      });
      continue;
    }

    if (definition.valueType === "boolean") {
      if (typeof fact.value !== "boolean") {
        rejected.push({
          key: fact.key,
          reason: "invalid_boolean",
        });
        continue;
      }

      accepted.push(fact);
      continue;
    }

    if (
      typeof fact.value !== "string" ||
      !fact.value.trim()
    ) {
      rejected.push({
        key: fact.key,
        reason: "invalid_text",
      });
      continue;
    }

    accepted.push({
      ...fact,
      value: fact.value.trim(),
    });
  }

  return { accepted, rejected };
}