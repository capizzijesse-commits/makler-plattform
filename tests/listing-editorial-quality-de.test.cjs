const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(
  "lib/listing-editorial-quality-de.ts",
  "utf8"
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;

const moduleExports = {};

vm.runInNewContext(
  compiled,
  { exports: moduleExports },
  { timeout: 1000 }
);

const inspect = moduleExports.inspectEditorialQualityDE;

function codes(text) {
  return Array.from(inspect(text), x => x.code);
}

test("Technische Zeichnungen im Verkaufstext erkennen", () => {
  assert.ok(
    codes("Die technischen Zeichnungen zeigen die Raumaufteilung.")
      .includes("SOURCE_REFERENCE")
  );
});

test("Quellenangabe mit Grundriss erkennen", () => {
  assert.ok(
    codes("Die Grundrisspläne dokumentieren die Räume.")
      .includes("SOURCE_REFERENCE")
  );
});

test("Mechanischen Schlusssatz erkennen", () => {
  assert.ok(
    codes("Die Kombination aus Ausstattung und Lage unterstreicht den Charakter des Hauses.")
      .includes("GENERIC_CONCLUSION")
  );
});

test("Unbelegte umfassende Sanierung zur Pruefung markieren", () => {
  assert.ok(
    codes("Das Gebäude wurde umfassend saniert.")
      .includes("CONDITION_CLAIM")
  );
});

test("Zustandsbewertung zur Pruefung markieren", () => {
  assert.ok(
    codes("Die Immobilie befindet sich in einem guten Zustand.")
      .includes("CONDITION_CLAIM")
  );
});

test("Privatsphaere-Versprechen erkennen", () => {
  assert.ok(
    codes("Die Hecke schafft Privatsphäre.")
      .includes("UNSUPPORTED_BENEFIT")
  );
});

test("Neutralen Fachtext nicht beanstanden", () => {
  assert.deepEqual(
    codes("Das Einfamilienhaus verfügt über 160 m² Wohnfläche. Eine Photovoltaikanlage ist vorhanden."),
    []
  );
});

test("Praezise Dachsanierung nicht pauschal beanstanden", () => {
  assert.deepEqual(
    codes("Das Flachdach wurde 2011 saniert."),
    []
  );
});

test("Leere Eingaben bleiben unauffaellig", () => {
  assert.deepEqual(codes(""), []);
});

test("Pruefung veraendert den Originaltext nicht", () => {
  const text = "Das Haus wurde umfassend saniert.";
  inspect(text);
  assert.equal(text, "Das Haus wurde umfassend saniert.");
});
test("Schweizer Schreibweisen fuer DE erkennen", () => {
  for (const word of [
    "grosszügig",
    "Aussenbereich",
    "Aussenstellplätze",
    "Massnahmen",
    "Fussbodenheizung"
  ]) {
    assert.ok(
      codes(`Das Objekt bietet ${word}.`).includes("DE_ORTHOGRAPHY"),
      `Nicht erkannt: ${word}`
    );
  }
});

test("Korrekte deutsche Schreibweisen akzeptieren", () => {
  assert.deepEqual(
    codes("Großzügige Außenbereiche und Maßnahmen. Eine Fußbodenheizung ist vorhanden."),
    []
  );
});

test("Deutsche Diagnose bleibt marktabhaengig", () => {
  const generator = fs.readFileSync("app/api/generate/route.ts", "utf8");

  assert.match(
    generator,
    /EDITORIAL_DIAGNOSTICS_DE_V1[\s\S]*?if\s*\(market\s*===\s*"DE"\)/
  );

  assert.match(generator, /DE_ORTHOGRAPHY:\s*0/);
});