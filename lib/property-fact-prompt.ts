import type { PropertyFactsV1 } from "./property-facts";
import { validatePublicPropertyFacts } from "./property-fact-validation";
import { getPropertyFactDefinition } from "./property-fact-catalog";

const MAX_FACTS = 40;
const MAX_TEXT_LENGTH = 500;
const MAX_PROMPT_LENGTH = 12000;

export type PropertyPromptFact = {
  key: string;
  category: string;
  value: string | number | boolean;
  unit?: string;
  provenance: "reported" | "verified";
  source: string;
};

export type PropertyPromptResult = {
  facts: PropertyPromptFact[];
  rejectedCount: number;
  omittedCount: number;
  payload: string;
};

export function buildPropertyFactPrompt(
  input: PropertyFactsV1
): PropertyPromptResult {
  const validation = validatePublicPropertyFacts(input);
  const selected: PropertyPromptFact[] = [];
  let omittedCount = 0;

  for (const fact of validation.accepted) {
    const definition = getPropertyFactDefinition(fact.key);

    if (!definition) {
      omittedCount++;
      continue;
    }

    if (
      typeof fact.value === "string" &&
      fact.value.length > MAX_TEXT_LENGTH
    ) {
      omittedCount++;
      continue;
    }

    if (selected.length >= MAX_FACTS) {
      omittedCount++;
      continue;
    }

    selected.push({
      key: fact.key,
      category: definition.category,
      value: fact.value,
      ...(fact.unit ? { unit: fact.unit } : {}),
      provenance:
        fact.status === "verified" ? "verified" : "reported",
      source: fact.source,
    });
  }

  const safeFacts: PropertyPromptFact[] = [];

  for (const fact of selected) {
    const candidate = [...safeFacts, fact];

    const candidatePayload = JSON.stringify({
      schema: "inserat-ai-property-prompt-v1",
      market: input.market,
      facts: candidate,
    });

    if (candidatePayload.length > MAX_PROMPT_LENGTH) {
      omittedCount++;
      continue;
    }

    safeFacts.push(fact);
  }

  const payload = JSON.stringify({
    schema: "inserat-ai-property-prompt-v1",
    market: input.market,
    facts: safeFacts,
  });

  return {
    facts: safeFacts,
    rejectedCount: validation.rejected.length,
    omittedCount,
    payload,
  };
}