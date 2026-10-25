const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  "lib/listing-orthography-de.ts",
  "utf8"
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;

const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports
}, { timeout: 1000 });

const normalize = moduleExports.normalizeGermanOrthographyDE;

test("Schweizer Schreibweisen werden korrigiert", () => {
  const cases = [
    ["grosszügigen", "großzügigen"],
    ["Grosszügige", "Großzügige"],
    ["Aussenbereich", "Außenbereich"],
    ["Aussenparkplätze", "Außenparkplätze"],
    ["Aussenanlagen", "Außenanlagen"],
    ["Fussbodenheizung", "Fußbodenheizung"],
    ["Massnahmen", "Maßnahmen"],
    ["äusserst", "äußerst"],
    ["anschliessend", "anschließend"]
  ];

  for (const [before, after] of cases) {
    assert.equal(normalize(before), after, before);
  }
});

test("Korrekte deutsche Rechtschreibung bleibt erhalten", () => {
  const text = "Großzügige Außenanlagen mit Fußbodenheizung.";
  assert.equal(normalize(text), text);
});

test("Preise, Flächen und Zahlen bleiben unverändert", () => {
  const text =
    "189 m², 5½ Zimmer, CHF 1'190'000 und Aussenbereich.";
  assert.equal(
    normalize(text),
    "189 m², 5½ Zimmer, CHF 1'190'000 und Außenbereich."
  );
});

test("Unbeteiligte Eigennamen bleiben erhalten", () => {
  const text = "Grossbritannien und Aussenstadt.";
  assert.equal(normalize(text), text);
});

test("Wiederholte Anwendung bleibt stabil", () => {
  const text = "Grosszügige Aussenanlagen.";
  assert.equal(
    normalize(normalize(text)),
    normalize(text)
  );
});

test("Deutsche Korrektur liegt hinter dem Quality-Gate", () => {
  const route = fs.readFileSync(
    "app/api/generate/route.ts",
    "utf8"
  );

  const gate = route.lastIndexOf("AI_FINAL_QUALITY_CHECK_FAILED");
  const correction = route.indexOf("FINAL_ORTHOGRAPHY_DE_V1");

  assert.ok(gate !== -1);
  assert.ok(correction > gate);
  assert.match(route, /market === "DE"[\s\S]*?normalizeGermanOrthographyDE/);
});

test("Schweizer Auslieferung erhält ss, Zahlen und Varianten; nur DE normalisiert zu ß", () => {
  const route = fs.readFileSync(
    "app/api/generate/route.ts",
    "utf8"
  );

  // Execute the route's real delivery expression, rather than matching its formatting.
  const ast = ts.createSourceFile("route.ts", route, ts.ScriptTarget.Latest, true);
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "deliveredVariants") declarations.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(declarations.length, 1, "Exactly one final delivery expression must be exercised");
  const expression = declarations[0].initializer.getText(ast);
  const selectedVariants = [
    { title: "Grosszügige Aussenfläche", text: "Die Aussenanlage umfasst 189 m². Der Preis beträgt CHF 1'190'000." },
    { title: "Wohnung an der Strasse", text: "5½ Zimmer mit Fussbodenheizung und Aussenbereich." },
    { title: "Aussenparkplätze im Angebot", text: "Anschliessend folgt die Besichtigung der grossen Aussenfläche." },
  ];
  const original = structuredClone(selectedVariants);
  function deliver(market) {
    return vm.runInNewContext("(" + expression + ")", {
      market, selectedVariants, normalizeGermanOrthographyDE: normalize,
    });
  }
  const ch = deliver("CH");
  assert.equal(ch.length, 3);
  assert.deepEqual(ch, original);
  assert.match(ch[0].title, /Grosszügige Aussenfläche/);
  assert.match(ch[1].text, /Fussbodenheizung/);
  assert.doesNotMatch(JSON.stringify(ch), /ß/);
  assert.equal(ch[0].text, original[0].text, "Swiss prices, units and wording remain unchanged");
  const de = deliver("DE");
  assert.equal(de[0].title, "Großzügige Außenfläche");
  assert.equal(de[1].text, "5½ Zimmer mit Fußbodenheizung und Außenbereich.");
  assert.match(de[0].text, /189 m²/);
  assert.match(de[0].text, /CHF 1'190'000/);
  assert.deepEqual(selectedVariants, original, "Delivery must not mutate the selected source variants");
});
