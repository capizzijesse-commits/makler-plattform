const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");

require.extensions[".ts"] = function(mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  mod._compile(compiled, filename);
};

const { extractSupplementaryFactsFromDocumentText } =
  require(path.resolve("lib/property-facts-document.server.ts"));

const { buildSupplementaryPropertyFacts } =
  require(path.resolve("lib/property-facts-ingest.ts"));

function processDocument(text, market = "CH") {
  const extracted = extractSupplementaryFactsFromDocumentText(text);
  const generated = buildSupplementaryPropertyFacts(extracted, market);
  return { extracted, generated };
}

test("Document facts survive server validation", () => {
  const result = processDocument(
    "Grundstücksfläche: 540 m²\n" +
    "Baujahr: 2018\n" +
    "Heizung: Wärmepumpe"
  );

  assert.deepEqual(
    result.generated.map((fact) => [fact.key, fact.value]),
    [
      ["plotArea", 540],
      ["constructionYear", 2018],
      ["heatingSystem", "Wärmepumpe"],
    ]
  );
});

test("Document claims are downgraded to reported input", () => {
  const result = processDocument("Baujahr: 2018", "DE");

  assert.equal(result.extracted[0].source, "document");
  assert.equal(result.generated[0].source, "user_input");
  assert.equal(result.generated[0].provenance, "reported");
});

test("Conflicting construction years do not reach prompt", () => {
  const result = processDocument(
    "Baujahr: 2015\nBaujahr: 2018"
  );

  assert.equal(result.extracted.length, 2);
  assert.equal(result.generated.length, 0);
});

test("Unknown heating types remain absent", () => {
  const result = processDocument(
    "Heizung: besonders energiesparend"
  );

  assert.deepEqual(result.generated, []);
});

test("Unsupported area formats are not guessed", () => {
  const result = processDocument(
    "Grundstücksfläche: 1'250 m²"
  );

  assert.deepEqual(result.generated, []);
});

test("Client verification claims are not trusted", () => {
  const result = buildSupplementaryPropertyFacts([
    {
      key: "constructionYear",
      value: 2018,
      status: "verified",
      source: "external",
      evidence: "untrusted",
    },
  ], "CH");

  assert.equal(result[0].provenance, "reported");
  assert.equal(result[0].source, "user_input");
});

test("Private address fields are excluded at server boundary", () => {
  const result = buildSupplementaryPropertyFacts([
    { key: "street", value: "Musterstrasse 8" },
    { key: "postalCode", value: "8400" },
  ], "CH");

  assert.deepEqual(result, []);
});

test("Optional generator payload is wired in source", () => {
  const generator = fs.readFileSync(
    "app/api/generate/route.ts", "utf8"
  );
  const autopilot = fs.readFileSync(
    "app/automation/AutomationFlowV2.tsx", "utf8"
  );
  const extraction = fs.readFileSync(
    "app/api/automation/extract-expose/route.ts", "utf8"
  );

  assert.match(generator, /structuredSupplementaryFacts/);
  assert.match(generator, /buildSupplementaryPropertyFacts/);
  assert.match(autopilot, /propertyFacts:\s*supplementaryFacts/);
  assert.match(autopilot, /exposeResult\.supplementaryFacts/);
  assert.match(extraction, /extractSupplementaryFactsFromDocumentText/);
  assert.match(extraction, /supplementaryFacts,/);
});