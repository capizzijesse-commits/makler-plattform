export type PropertyFactSource =
  | "user_input"
  | "document"
  | "image"
  | "external";

export type PropertyFactStatus =
  | "reported"
  | "observed"
  | "verified"
  | "uncertain"
  | "conflicting";

export type PropertyFactValue =
  | string
  | number
  | boolean;

export type PropertyFact = {
  key: string;
  value: PropertyFactValue;
  unit?: string;
  source: PropertyFactSource;
  sourceReference?: string;
  evidence?: string;
  status: PropertyFactStatus;
};

export type PropertyFactsV1 = {
  version: "v1";
  market: "CH" | "DE" | "AT";
  propertyType?: string;
  facts: PropertyFact[];
};

export function isUsablePropertyFact(
  fact: PropertyFact
): boolean {
  if (!fact.key.trim()) {
    return false;
  }

  if (
    typeof fact.value === "string" &&
    !fact.value.trim()
  ) {
    return false;
  }

  if (
    typeof fact.value === "number" &&
    !Number.isFinite(fact.value)
  ) {
    return false;
  }

  return (
    fact.status === "verified" ||
    fact.status === "reported"
  );
}

function normalizePropertyFactValue(
  fact: PropertyFact
): { unit: string; signature: string } {
  const rawUnit = (fact.unit ?? "").trim().toLowerCase();

  const areaUnits = new Set([
    "m²",
    "m2",
    "qm",
    "quadratmeter",
  ]);

  const unit = areaUnits.has(rawUnit) ? "m2" : rawUnit;

  if (typeof fact.value === "boolean") {
    return {
      unit,
      signature: `boolean:${fact.value}`,
    };
  }

  if (typeof fact.value === "number") {
    return {
      unit,
      signature: `number:${fact.value}`,
    };
  }

  const value = fact.value.trim();

  const numeric =
    /^\d+(?:[.,]\d+)?$/.test(value)
      ? Number(value.replace(",", "."))
      : null;

  if (numeric !== null && Number.isFinite(numeric)) {
    return {
      unit,
      signature: `number:${numeric}`,
    };
  }

  return {
    unit,
    signature: `string:${value.normalize("NFC")}`,
  };
}
export function getUsablePropertyFacts(
  input: PropertyFactsV1
): PropertyFact[] {
  const blockedKeys = new Set<string>();
  const valuesByKey = new Map<string, Set<string>>();
  const unitsByKey = new Map<string, Set<string>>();

  for (const fact of input.facts) {
    const key = fact.key.trim();

    if (!key) {
      continue;
    }

    if (fact.status === "conflicting") {
      blockedKeys.add(key);
      continue;
    }

    if (!isUsablePropertyFact(fact)) {
      continue;
    }

    const normalized = normalizePropertyFactValue(fact);
    const unit = normalized.unit;
    const valueSignature = normalized.signature;

    if (!valuesByKey.has(key)) {
      valuesByKey.set(key, new Set());
      unitsByKey.set(key, new Set());
    }

    valuesByKey.get(key)!.add(valueSignature);
    unitsByKey.get(key)!.add(unit);
  }

  for (const [key, values] of valuesByKey) {
    if (values.size > 1 || (unitsByKey.get(key)?.size ?? 0) > 1) {
      blockedKeys.add(key);
    }
  }

  return input.facts.filter(
    (fact) =>
      !blockedKeys.has(fact.key.trim()) &&
      isUsablePropertyFact(fact)
  );
}