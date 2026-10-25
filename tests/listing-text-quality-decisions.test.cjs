const test = require("node:test");
const assert = require("node:assert/strict");

const { evaluateListingQuality } =
  require("../lib/listing-text-quality.ts");

const facts = {
  market: "CH",
  location: "Schaffhausen",
  propertyType: "Wohnung",
  rooms: "3.5",
  livingArea: "85 m²",
  verifiedFeatures: "Balkon, Parkettboden, separate Küche"
};

const good = [
  {
    title: "3.5-Zimmer-Wohnung mit Balkon in Schaffhausen",
    text: "Diese 3.5-Zimmer-Wohnung in Schaffhausen verfügt über eine Wohnfläche von 85 m². Zur dokumentierten Ausstattung gehören ein Balkon, Parkettboden und eine separate Küche. Die Angaben geben einen konkreten Überblick über Raumangebot und Ausstattung."
  },
  {
    title: "Schaffhausen: Wohnung mit separater Küche",
    text: "Die separate Küche zählt zu den ausgewiesenen Merkmalen dieser Wohnung. Ergänzt wird das Angebot durch einen Balkon und Parkettboden. Die Wohnung umfasst 3.5 Zimmer bei einer Wohnfläche von 85 m² und liegt in Schaffhausen."
  },
  {
    title: "Balkon und Parkett in einer 3.5-Zimmer-Wohnung",
    text: "Ein Balkon und Parkettboden gehören zur Ausstattung dieser Wohnung in Schaffhausen. Die Wohnfläche beträgt 85 m² und verteilt sich laut Objektdaten auf 3.5 Zimmer. Eine separate Küche ist ebenfalls ausgewiesen."
  }
];

test("Short factual Swiss variants are accepted", () => {
  const result = evaluateListingQuality(good, "de", facts);

  assert.equal(result.passed, true);
  assert.equal(
    result.issues.filter(issue => issue.severity === "error").length,
    0
  );
});

test("Duplicate Swiss variants are rejected", () => {
  const repeated = Array.from({ length: 3 }, () => ({
    title: "Wohnung in Schaffhausen mit Ausstattung",
    text: "In Schaffhausen steht eine Wohnung zum Verkauf. Die Wohnung befindet sich in Schaffhausen. Die vorhandenen Objektdaten vermitteln einen ersten Eindruck. Die Zimmerzahl bildet eine Grundlage. Die Wohnfläche gehört zu den Angaben. Das Angebot umfasst mehrere Merkmale."
  }));

  const result = evaluateListingQuality(repeated, "de", facts);

  assert.equal(result.passed, false);
  assert.ok(
    result.issues.some(
      issue => issue.code === "VARIANTS_TOO_SIMILAR"
    )
  );
});

test("Extremely short Swiss variants are rejected", () => {
  const variants = [
    { title: "Wohnung in Schaffhausen", text: "Eine Wohnung mit Balkon in Schaffhausen." },
    { title: "Separate Küche", text: "Eine separate Küche gehört zur Ausstattung." },
    { title: "Wohnfläche und Parkett", text: "Die Wohnung bietet Parkettboden und 85 m²." }
  ];

  const result = evaluateListingQuality(variants, "de", facts);

  assert.equal(result.passed, false);
  assert.ok(
    result.issues.some(
      issue =>
        issue.code === "WORD_COUNT_OUTSIDE_TARGET" &&
        issue.severity === "error"
    )
  );
});