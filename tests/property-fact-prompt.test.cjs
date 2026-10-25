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

const { buildPropertyFactPrompt } =
  require(path.resolve("lib/property-fact-prompt.ts"));

function fact(key, value, extra = {}) {
  return {
    key,
    value,
    source: "document",
    status: "reported",
    ...extra,
  };
}

function run(items) {
  return buildPropertyFactPrompt({
    version: "v1",
    market: "CH",
    facts: items,
  });
}

test("Structured facts are preserved", () => {
  const result = run([
    fact("rooms", "5,5"),
    fact("livingArea", 185, { unit: "m2" }),
  ]);

  assert.equal(result.facts.length, 2);
  assert.equal(result.facts[0].value, 5.5);
  assert.equal(result.facts[1].unit, "m2");
});

test("Restricted addresses do not reach prompt", () => {
  const result = run([
    fact("street", "Musterstrasse 8"),
    fact("location", "Winterthur"),
  ]);

  assert.equal(result.facts.length, 1);
  assert.equal(result.facts[0].key, "location");
  assert.ok(!result.payload.includes("Musterstrasse"));
});

test("Uncertain facts do not reach prompt", () => {
  const result = run([
    fact("photovoltaics", true, { status: "uncertain" }),
  ]);

  assert.equal(result.facts.length, 0);
});

test("Conflicting values are not passed through", () => {
  const result = run([
    fact("rooms", 4),
    fact("rooms", 5),
  ]);

  assert.equal(result.facts.length, 0);
});

test("Reported facts remain reported", () => {
  const result = run([
    fact("heatingSystem", "Wärmepumpe"),
  ]);

  assert.equal(result.facts[0].provenance, "reported");
  assert.equal(result.facts[0].source, "document");
});

test("Excessively long text is excluded", () => {
  const result = run([
    fact("condition", "x".repeat(1000)),
  ]);

  assert.equal(result.facts.length, 0);
  assert.equal(result.omittedCount, 1);
});

test("Fact count is limited", () => {
  const items = Array.from(
    { length: 50 },
    (_, index) => fact("location", "Ort")
  );

  const result = run(items);

  assert.ok(result.facts.length <= 40);
  assert.ok(result.omittedCount >= 10);
});

test("The prompt is valid structured JSON", () => {
  const result = run([
    fact("propertyType", "Einfamilienhaus"),
    fact("rooms", "5.5"),
  ]);

  const parsed = JSON.parse(result.payload);

  assert.equal(
    parsed.schema,
    "inserat-ai-property-prompt-v1"
  );
  assert.equal(parsed.facts.length, 2);
});

test("Unknown keys do not reach the prompt", () => {
  const result = run([
    fact("privateOwnerPhone", "123456"),
  ]);

  assert.equal(result.facts.length, 0);
  assert.ok(!result.payload.includes("123456"));
});