const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");

require.extensions[".ts"] = function(mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  mod._compile(output, filename);
};

const { extractSupplementaryFactsFromDocumentText } =
  require(path.resolve("lib/property-facts-document.server.ts"));

test("Three explicit document features are recognized", () => {
  const result = extractSupplementaryFactsFromDocumentText(
    "Grundstücksfläche: 540 m²\nBaujahr: 2018\nHeizung: Wärmepumpe"
  );

  assert.deepEqual(result.map((f) => f.key), [
    "plotArea", "constructionYear", "heatingSystem"
  ]);
  assert.deepEqual(result.map((f) => f.value), [
    540, 2018, "Wärmepumpe"
  ]);
});

test("Document results are never automatically verified", () => {
  const result = extractSupplementaryFactsFromDocumentText(
    "Baujahr: 2018"
  );

  assert.equal(result[0].status, "reported");
  assert.equal(result[0].source, "document");
  assert.ok(result[0].evidence.includes("Baujahr"));
});

test("Unsupported heating descriptions are not guessed", () => {
  const result = extractSupplementaryFactsFromDocumentText(
    "Heizung: modern und besonders sparsam"
  );

  assert.deepEqual(result, []);
});

test("Valuation data is not treated as plot area", () => {
  const result = extractSupplementaryFactsFromDocumentText(
    "Grundstückswert: 540 CHF\nWohnfläche: 120 m²"
  );

  assert.deepEqual(result, []);
});

test("Conflicting document values remain visible", () => {
  const result = extractSupplementaryFactsFromDocumentText(
    "Baujahr: 2015\nBaujahr: 2018"
  );

  assert.deepEqual(result.map((f) => f.value), [2015, 2018]);
});

test("Unsupported thousands notation is not guessed", () => {
  const result = extractSupplementaryFactsFromDocumentText(
    "Grundstücksfläche: 1'250 m²"
  );

  assert.deepEqual(result, []);
});

test("Empty inputs produce no facts", () => {
  assert.deepEqual(
    extractSupplementaryFactsFromDocumentText(""),
    []
  );
});