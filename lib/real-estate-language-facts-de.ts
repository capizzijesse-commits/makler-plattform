import {
  REAL_ESTATE_LANGUAGE_DE,
  type RealEstateLanguageEntryDE,
} from "./real-estate-language-de";

import type {
  PropertyPromptFact,
} from "./property-fact-prompt";

/**
 * Nur mit bereits serverseitig durch
 * buildPropertyFactPrompt gefilterten Fakten aufrufen.
 *
 * Diese Funktion validiert keine untrusted Requests.
 * "reported" bleibt eine dokumentierte Angabe und
 * wird NICHT zu "verified" hochgestuft.
 *
 * Das Lexikon liefert Formulierungshinweise,
 * keine zusaetzlichen Immobilienfakten.
 */
export function selectLanguageForAcceptedFactsDE(
  acceptedFacts: readonly PropertyPromptFact[],
  maxEntries = 5
): RealEstateLanguageEntryDE[] {
  if (
    !Array.isArray(acceptedFacts) ||
    !Number.isSafeInteger(maxEntries) ||
    maxEntries <= 0
  ) {
    return [];
  }

  const positiveBooleanKeys = new Map([
    ["balcony", "de-balcony"],
    ["terrace", "de-terrace"],
    ["garden", "de-garden"],
    ["photovoltaics", "de-photovoltaics"],
  ]);

  const approved = new Set<string>();
  const blocked = new Set<string>();
  const valuesByKey = new Map<string, Set<string>>();

  for (const fact of acceptedFacts) {
    if (
      !fact ||
      (fact.provenance !== "reported" &&
        fact.provenance !== "verified")
    ) {
      continue;
    }

    if (positiveBooleanKeys.has(fact.key)) {
      if (typeof fact.value !== "boolean") {
        continue;
      }

      const signatures =
        valuesByKey.get(fact.key) ?? new Set<string>();

      signatures.add(String(fact.value));
      valuesByKey.set(fact.key, signatures);

      const id = positiveBooleanKeys.get(fact.key)!;

      if (fact.value === true) {
        approved.add(id);
      } else {
        blocked.add(id);
      }

      continue;
    }

    if (fact.key === "plotArea") {
      if (
        typeof fact.value !== "number" ||
        !Number.isFinite(fact.value) ||
        fact.value <= 0 ||
        fact.unit !== "m2"
      ) {
        continue;
      }

      const signatures =
        valuesByKey.get("plotArea") ?? new Set<string>();

      signatures.add(String(fact.value));
      valuesByKey.set("plotArea", signatures);

      approved.add("de-plot-area");
    }
  }

  for (const [key, signatures] of valuesByKey) {
    if (signatures.size <= 1) {
      continue;
    }

    const id =
      key === "plotArea"
        ? "de-plot-area"
        : positiveBooleanKeys.get(key);

    if (id) {
      blocked.add(id);
    }
  }

  return REAL_ESTATE_LANGUAGE_DE.filter(
    (entry) =>
      approved.has(entry.id) &&
      !blocked.has(entry.id)
  ).slice(0, Math.min(maxEntries, 5));
}