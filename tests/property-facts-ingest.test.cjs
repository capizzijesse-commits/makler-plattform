const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");

require.extensions[".ts"] = function(mod, filename) {
  const code = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  mod._compile(output, filename);
};

const { buildSupplementaryPropertyFacts } = require(
  path.resolve("lib/property-facts-ingest.ts")
);

test("Valid supplementary facts are accepted", () => {
  const result = buildSupplementaryPropertyFacts([
    { key: "plotArea", value: "540", unit: "m2" },
    { key: "heatingSystem", value: "Wärmepumpe" },
  ], "CH");

  assert.equal(result.length, 2);
  assert.equal(result[0].value, 540);
  assert.equal(result[1].value, "Wärmepumpe");
});

test("Client cannot assert independent verification", () => {
  const result = buildSupplementaryPropertyFacts([
    {
      key: "photovoltaics",
      value: true,
      status: "verified",
      source: "external",
      evidence: "fake-proof",
    },
  ], "DE");

  assert.equal(result.length, 1);
  assert.equal(result[0].provenance, "reported");
  assert.equal(result[0].source, "user_input");
});

test("Restricted and unknown fields are excluded", () => {
  const result = buildSupplementaryPropertyFacts([
    { key: "street", value: "Geheime Strasse 7" },
    { key: "postalCode", value: "8400" },
    { key: "privateOwnerPhone", value: "123456" },
  ], "CH");

  assert.deepEqual(result, []);
});

test("Invalid numeric units and values are excluded", () => {
  const result = buildSupplementaryPropertyFacts([
    { key: "plotArea", value: 500, unit: "ft2" },
    { key: "constructionYear", value: "unbekannt" },
  ], "CH");

  assert.deepEqual(result, []);
});

test("Conflicting values cannot reach generator", () => {
  const result = buildSupplementaryPropertyFacts([
    { key: "plotArea", value: 500, unit: "m2" },
    { key: "plotArea", value: 600, unit: "m2" },
  ], "CH");

  assert.deepEqual(result, []);
});

test("Legacy requests without facts stay compatible", () => {
  assert.deepEqual(buildSupplementaryPropertyFacts(undefined, "CH"), []);
  assert.deepEqual(buildSupplementaryPropertyFacts({}, "DE"), []);
});