const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const filename = path.resolve(
  "lib/property-facts-adapter.ts"
);

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(
  path.dirname(filename)
);
loaded._compile(compiled, filename);

const { buildPropertyFactsFromExpose } =
  loaded.exports;

test("Core expose values are transferred", () => {
  const result = buildPropertyFactsFromExpose({
    countryCode: "CH",
    location: "Winterthur",
    propertyType: "Einfamilienhaus",
    rooms: "5.5",
    livingArea: "185",
    price: "CHF 1200000",
  });

  assert.equal(result.market, "CH");
  assert.equal(result.propertyType, "Einfamilienhaus");
  assert.equal(result.facts.length, 5);

  assert.ok(
    result.facts.every(
      (fact) => fact.status === "reported"
    )
  );
});

test("Missing values are omitted", () => {
  const result = buildPropertyFactsFromExpose({
    location: "Zürich",
    rooms: "",
    livingArea: "120",
    missingFields: ["livingArea"],
  });

  assert.deepEqual(
    result.facts.map((fact) => fact.key),
    ["location"]
  );
});

test("Highlights are not automatically verified", () => {
  const result = buildPropertyFactsFromExpose({
    highlights: "Balkon, ruhige Lage",
  });

  assert.equal(result.facts.length, 1);
  assert.equal(result.facts[0].status, "uncertain");
});

test("Germany market is preserved", () => {
  const result = buildPropertyFactsFromExpose({
    countryCode: "DE",
    postalCode: "10115",
    location: "Berlin",
  });

  assert.equal(result.market, "DE");
  assert.equal(result.facts.length, 2);
});

test("Source summary is not treated as proof", () => {
  const result = buildPropertyFactsFromExpose({
    sourceSummary: "Modernes Haus mit Garten",
  });

  assert.equal(result.facts.length, 0);
});