const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

function loadTS(file, dependencies = {}) {
  const compiled = ts.transpileModule(
    fs.readFileSync(file, "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      }
    }
  ).outputText;

  const exports = {};

  vm.runInNewContext(
    compiled,
    {
      exports,
      require(name) {
        if (!(name in dependencies)) {
          throw new Error("Unexpected import: " + name);
        }
        return dependencies[name];
      }
    },
    { timeout: 1000 }
  );

  return exports;
}

const lexicon = loadTS("lib/real-estate-language-de.ts");
const adapter = loadTS(
  "lib/real-estate-language-facts-de.ts",
  { "./real-estate-language-de": lexicon }
);

const select = adapter.selectLanguageForAcceptedFactsDE;

function fact(key, value, unit) {
  return {
    key,
    value,
    category: "equipment",
    provenance: "reported",
    source: "user_input",
    ...(unit ? { unit } : {})
  };
}

function ids(facts) {
  return Array.from(select(facts), x => x.id);
}

test("Dokumentierter Balkon aktiviert Fachsprache", () => {
  assert.deepEqual(
    ids([fact("balcony", true)]),
    ["de-balcony"]
  );
});

test("Negativer Balkon aktiviert nichts", () => {
  assert.deepEqual(
    ids([fact("balcony", false)]),
    []
  );
});

test("Widerspruechliche Balkonwerte sperren Fachsprache", () => {
  assert.deepEqual(
    ids([
      fact("balcony", true),
      fact("balcony", false)
    ]),
    []
  );
});

test("Dokumentierte Photovoltaikanlage ist zulässig", () => {
  assert.deepEqual(
    ids([fact("photovoltaics", true)]),
    ["de-photovoltaics"]
  );
});

test("Grundstuecksflaeche benoetigt positive m2-Angabe", () => {
  assert.deepEqual(
    ids([fact("plotArea", 640, "m2")]),
    ["de-plot-area"]
  );

  assert.deepEqual(
    ids([fact("plotArea", -20, "m2")]),
    []
  );

  assert.deepEqual(
    ids([fact("plotArea", 640, "km2")]),
    []
  );
});

test("Keine Fachbegriffe aus unklaren Statuswerten", () => {
  assert.deepEqual(
    ids([{
      ...fact("garden", true),
      provenance: "uncertain"
    }]),
    []
  );
});

test("Nur fachlich zugeordnete Eintraege", () => {
  assert.deepEqual(
    ids([fact("renovationYear", 2021)]),
    []
  );
});

test("Begrenzung und ungueltige Eingaben", () => {
  assert.equal(select([], 5).length, 0);
  assert.equal(select([fact("balcony", true)], 0).length, 0);
  assert.equal(select(null).length, 0);
});

test("Unterschiedliche Grundstuecksflaechen werden gesperrt", () => {
  assert.deepEqual(
    ids([
      fact("plotArea", 500, "m2"),
      fact("plotArea", 600, "m2")
    ]),
    []
  );
});