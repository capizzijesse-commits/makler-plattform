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

const {
  validatePublicPropertyFacts,
} = require(path.resolve("lib/property-fact-validation.ts"));

function item(key, value, extra = {}) {
  return {
    key,
    value,
    source: "document",
    status: "reported",
    ...extra,
  };
}

function run(items) {
  return validatePublicPropertyFacts({
    version: "v1",
    market: "CH",
    facts: items,
  });
}

test("Valid rooms and areas are normalized", () => {
  const result = run([
    item("rooms", "5,5"),
    item("livingArea", "185", { unit: "m²" }),
  ]);

  assert.deepEqual(
    result.accepted.map((fact) => fact.value),
    [5.5, 185]
  );
  assert.equal(result.accepted[1].unit, "m2");
});

test("Exact address is excluded", () => {
  const result = run([
    item("street", "Musterstrasse 8"),
    item("location", "Winterthur"),
  ]);

  assert.deepEqual(
    result.accepted.map((fact) => fact.key),
    ["location"]
  );
  assert.equal(result.rejected[0].reason, "restricted");
});

test("Unsupported area unit is rejected", () => {
  const result = run([
    item("livingArea", 185, { unit: "ft²" }),
  ]);

  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].reason, "unsupported_unit");
});

test("Unknown year is not accepted", () => {
  const result = run([
    item("constructionYear", "unbekannt"),
  ]);

  assert.equal(result.accepted.length, 0);
});

test("Uncertain equipment is rejected", () => {
  const result = run([
    item("photovoltaics", true, { status: "uncertain" }),
  ]);

  assert.equal(result.accepted.length, 0);
});

test("Conflicting room counts are rejected", () => {
  const result = run([
    item("rooms", 4),
    item("rooms", 5),
  ]);

  assert.equal(result.accepted.length, 0);
});

test("Boolean must be an actual boolean", () => {
  const result = run([
    item("balcony", "ja"),
    item("garden", true),
  ]);

  assert.deepEqual(
    result.accepted.map((fact) => fact.key),
    ["garden"]
  );
});

test("Unknown keys are not public", () => {
  const result = run([
    item("privateOwnerPhone", "123456"),
  ]);

  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].reason, "unknown_property");
});

test("Negative area is rejected", () => {
  const result = run([
    item("livingArea", -20),
  ]);

  assert.equal(result.accepted.length, 0);
});