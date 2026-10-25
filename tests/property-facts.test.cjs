const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const filename = path.resolve("lib/property-facts.ts");
const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);

const {
  isUsablePropertyFact,
  getUsablePropertyFacts,
} = loaded.exports;

function fact(key, value, status = "verified") {
  return {
    key,
    value,
    status,
    source: "document",
  };
}

function facts(items) {
  return {
    version: "v1",
    market: "CH",
    facts: items,
  };
}

test("Verified document fact is usable", () => {
  assert.equal(
    isUsablePropertyFact(fact("rooms", 5)),
    true
  );
});

test("Uncertain facts are excluded", () => {
  assert.deepEqual(
    getUsablePropertyFacts(
      facts([fact("balcony", true, "uncertain")])
    ),
    []
  );
});

test("Image observations are not automatically verified", () => {
  assert.deepEqual(
    getUsablePropertyFacts(
      facts([
        {
          key: "floorMaterial",
          value: "Parkett",
          source: "image",
          status: "observed",
        },
      ])
    ),
    []
  );
});

test("Explicit conflict blocks a property key", () => {
  assert.deepEqual(
    getUsablePropertyFacts(
      facts([
        fact("rooms", 4, "conflicting"),
        fact("rooms", 5),
      ])
    ),
    []
  );
});

test("Empty and non-finite values are excluded", () => {
  assert.equal(
    isUsablePropertyFact(fact("rooms", NaN)),
    false
  );
  assert.equal(
    isUsablePropertyFact(fact("location", "  ")),
    false
  );
});

test("Different verified values must be flagged as a future safety requirement", () => {
  const result = getUsablePropertyFacts(
    facts([
      fact("rooms", 4),
      fact("rooms", 5),
    ])
  );

  // Current V1 behavior is recorded as a baseline.
  // T14 must replace this behavior with conflict detection.
  assert.equal(result.length, 0);
});
test("Identical verified facts from multiple sources are retained", () => {
  const result = getUsablePropertyFacts(
    facts([
      fact("rooms", 5),
      fact("rooms", 5),
    ])
  );

  assert.equal(result.length, 2);
});

test("Conflicting units are excluded until normalized", () => {
  const result = getUsablePropertyFacts(
    facts([
      { ...fact("livingArea", 120), unit: "m2" },
      { ...fact("livingArea", 120), unit: "ft2" },
    ])
  );

  assert.equal(result.length, 0);
});

test("Unrelated facts remain available when one key conflicts", () => {
  const result = getUsablePropertyFacts(
    facts([
      fact("rooms", 4),
      fact("rooms", 5),
      fact("location", "Winterthur"),
    ])
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].key, "location");
});
test("Equivalent area units are accepted", () => {
  const result = getUsablePropertyFacts(
    facts([
      { ...fact("livingArea", 120), unit: "m²" },
      { ...fact("livingArea", "120.0"), unit: "Quadratmeter" },
    ])
  );

  assert.equal(result.length, 2);
});

test("Different area values remain conflicting", () => {
  const result = getUsablePropertyFacts(
    facts([
      { ...fact("livingArea", 120), unit: "m²" },
      { ...fact("livingArea", 145), unit: "m2" },
    ])
  );

  assert.equal(result.length, 0);
});

test("Equivalent decimal formats are accepted", () => {
  const result = getUsablePropertyFacts(
    facts([
      fact("rooms", "5,5"),
      fact("rooms", 5.5),
    ])
  );

  assert.equal(result.length, 2);
});

test("Unsupported unit differences stay blocked", () => {
  const result = getUsablePropertyFacts(
    facts([
      { ...fact("livingArea", 120), unit: "m²" },
      { ...fact("livingArea", 120), unit: "ft²" },
    ])
  );

  assert.equal(result.length, 0);
});