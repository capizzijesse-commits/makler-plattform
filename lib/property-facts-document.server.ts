import type { PropertyFact } from "./property-facts";

const MAX_TEXT_BYTES = 300000;
const MAX_FACTS = 60;

const HEATING_TYPES = new Map([
  ["wärmepumpe", "Wärmepumpe"],
  ["waermepumpe", "Wärmepumpe"],
  ["gasheizung", "Gasheizung"],
  ["ölheizung", "Ölheizung"],
  ["oelheizung", "Ölheizung"],
  ["fernwärme", "Fernwärme"],
  ["fernwaerme", "Fernwärme"],
  ["pelletheizung", "Pelletheizung"],
  ["elektroheizung", "Elektroheizung"],
]);

function addFact(
  facts: PropertyFact[],
  key: string,
  value: string | number,
  evidence: string,
  unit?: string
): void {
  if (facts.length >= MAX_FACTS) return;

  facts.push({
    key,
    value,
    ...(unit ? { unit } : {}),
    source: "document",
    sourceReference: "extracted_document_text",
    evidence: evidence.slice(0, 200),
    status: "reported",
  });
}

export function extractSupplementaryFactsFromDocumentText(
  text: string
): PropertyFact[] {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  const facts: PropertyFact[] = [];
  const lines = text.slice(0, MAX_TEXT_BYTES).split(/\r?\n/);

  for (const rawLine of lines) {
    if (rawLine.length > 250) continue;
    const line = rawLine.trim();
    if (!line) continue;

    const plot = line.match(
      /^(?:Grundstücksfläche|Grundstuecksflaeche|Parzellenfläche|Parzellenflaeche)\s*[:\-]\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*(m²|m2|qm)\s*$/i
    );

    if (plot) {
      const value = Number(plot[1].replace(",", "."));
      if (value > 0) {
        addFact(facts, "plotArea", value, line, "m2");
      }
      continue;
    }

    const year = line.match(
      /^(?:Baujahr|Erstellungsjahr)\s*[:\-]\s*((?:18|19|20)\d{2})\s*$/i
    );

    if (year) {
      addFact(facts, "constructionYear", Number(year[1]), line);
      continue;
    }

    const heating = line.match(
      /^(?:Heizung|Heizsystem|Heizungsart)\s*[:\-]\s*([^\n,;]{3,50})\s*$/i
    );

    if (heating) {
      const value = HEATING_TYPES.get(
        heating[1].trim().toLowerCase()
      );

      if (value) {
        addFact(facts, "heatingSystem", value, line);
      }
    }
  }

  // PDF_FLATTENED_FACTS_T139
  // PDF page extraction may flatten labelled fields into one line.
  // Only explicitly named source facts are accepted.
  const flatText = text.slice(0, MAX_TEXT_BYTES)
    .replace(/\s+/g, " ");

  const addDistinct = (
    key: string,
    value: string | number,
    evidence: string,
    unit?: string
  ): void => {
    if (facts.some((fact) =>
      fact.key === key &&
      String(fact.value) === String(value)
    )) {
      return;
    }

    addFact(facts, key, value, evidence.trim(), unit);
  };

  const flatPlots =
    /(?:^|[^\p{L}])(?:Grundstücksfläche|Grundstück|Grundstuecksflaeche|Parzellenfläche|Parzellenflaeche)\s*:?\s*(?:ca\.?\s*)?(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:m²|m2|qm)(?!\w)/giu;

  for (const match of flatText.matchAll(flatPlots)) {
    const value = Number(match[1].replace(",", "."));

    if (Number.isFinite(value) && value > 0) {
      addDistinct("plotArea", value, match[0], "m2");
    }
  }

  const flatYears =
    /(?:^|[^\p{L}])(?:Baujahr|Erstellungsjahr)\s*:?\s*((?:18|19|20)\d{2})(?!\d)/giu;

  for (const match of flatText.matchAll(flatYears)) {
    addDistinct(
      "constructionYear",
      Number(match[1]),
      match[0]
    );
  }

  const flatHeating =
    /(?:^|[^\p{L}])(?:Heizung|Heizsystem|Heizungsart)\s*:?\s*(Wärmepumpe|Waermepumpe|Gasheizung|Ölheizung|Oelheizung|Fernwärme|Fernwaerme|Pelletheizung|Elektroheizung)(?!\p{L})/giu;

  for (const match of flatText.matchAll(flatHeating)) {
    const value = HEATING_TYPES.get(
      match[1].toLowerCase()
    );

    if (value) {
      addDistinct("heatingSystem", value, match[0]);
    }
  }
  return facts;
}