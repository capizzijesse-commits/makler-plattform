/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses CommonJS. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the real engine and guards; never load an API client or credentials.
function loadEngine() {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const requireLocal = (id) => {
      if (id === "node:crypto") return require("node:crypto");
      if (id === "openai") throw Error("REAL_OPENAI_IMPORT_FORBIDDEN");
      if (id.startsWith("@/")) return load(path.resolve(id.slice(2) + ".ts"));
      if (id.startsWith(".")) return load(path.resolve(path.dirname(file), id + ".ts"));
      throw Error("UNEXPECTED_IMPORT: " + id);
    };
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      module: loadedModule, exports: loadedModule.exports, require: requireLocal,
      console: { info() {}, warn() {}, error() {} }, process: { env: {} },
    }, { filename: file });
    return loadedModule.exports;
  }
  return { ...load("lib/listing-text-engine.server.ts"), ...load("lib/listing-text-quality.ts") };
}
const { generateListingTextVariants, evaluateListingQuality } = loadEngine();
const facts = {
  locale: "de", market: "CH", location: "Schaffhausen", propertyType: "Wohnung",
  rooms: "3", livingArea: "85 m²", price: "450000",
  verifiedFeatures: "Balkon, Parkettboden, separate Küche",
};
const good = [
  {
    title: "3-Zimmer-Wohnung mit Balkon in Schaffhausen",
    text: "Diese 3-Zimmer-Wohnung in Schaffhausen verfügt über eine Wohnfläche von 85 m². Zur Ausstattung gehören ein Balkon, Parkettboden und eine separate Küche. Der Kaufpreis beträgt 450000 CHF. Die Küche ist vom übrigen Wohnbereich getrennt.",
  },
  {
    title: "Schaffhausen: Wohnung mit separater Küche",
    text: "Die separate Küche zählt zu den Merkmalen dieser Wohnung. Ergänzt wird das Angebot durch einen Balkon und Parkettboden. Die Wohnung umfasst 3 Zimmer bei einer Wohnfläche von 85 m² und liegt in Schaffhausen.",
  },
  {
    title: "Balkon und Parkett prägen das Angebot",
    text: "Ein Balkon und Parkettboden gehören zur Ausstattung dieser Wohnung in Schaffhausen. Die Wohnfläche beträgt 85 m² bei insgesamt 3 Zimmern. Eine separate Küche ist ebenfalls vorhanden. Angeboten wird die Immobilie zum Kauf für 450000 CHF.",
  },
];
function mockClient(replies) {
  let calls = 0;
  return {
    get calls() { return calls; },
    chat: { completions: { async create(request) {
      if (request.messages?.[0]?.content.includes("HARD FACT auditor")) return { choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ completed: true, checkedVariants: [1,2,3], findings: [] }) } }] };
      if (calls >= replies.length) throw Error("UNEXPECTED_MODEL_CALL");
      return { choices: [{ message: { content: JSON.stringify({ variant: replies[calls++] }) } }] };
    } } },
  };
}
async function run(variants, input = facts, repairs = []) {
  const client = mockClient([...variants, ...repairs]);
  const result = await generateListingTextVariants(input, { openai: client });
  return { result, calls: client.calls };
}
for (const market of ["CH", "DE"]) {
  test(market + ": distinct valid variants pass, including warning-only results", async () => {
    const variants = good.map(v => ({ ...v, text: market === "DE" ? v.text.replaceAll("CHF", "EUR") : v.text }));
    const input = { ...facts, market };
    const quality = evaluateListingQuality(variants, "de", input);
    assert.equal(quality.passed, true, JSON.stringify(quality));
    assert(quality.issues.some(issue => issue.severity === "warning"));
    const { result, calls } = await run(variants, input);
    assert.equal(result.variants.length, 3);
    assert.equal(result.market, market);
    assert.equal(result.locale, "de");
    assert.equal(calls, 3);
    assert.equal(result.variants[0].text, variants[0].text);
  });
  test(market + ": identical otherwise valid variants are blocked", async () => {
    const variant = { ...good[0], text: good[0].text.replaceAll("CHF", market === "DE" ? "EUR" : "CHF") };
    assert.equal(evaluateListingQuality([variant], "de", { ...facts, market }).issues.some(i => i.variantIndex === 0 && i.severity === "error"), false);
    await assert.rejects(run([variant, variant, variant], { ...facts, market }), /INSERAT_AI_TEXT_ENGINE_QUALITY_GATE_FAILED/);
  });
}
test("near-identical texts rejected by the existing gate are blocked by the engine", async () => {
  const variants = good.map((v, i) => ({ title: v.title, text: good[0].text + " " + ["Ein Balkon ist vorhanden.", "Parkettboden ist vorhanden.", "Die Küche ist separat."][i] }));
  const quality = evaluateListingQuality(variants, "de", facts);
  assert.equal(quality.passed, false);
  assert(quality.issues.some(i => i.code === "VARIANTS_TOO_SIMILAR" && i.severity === "error"));
  await assert.rejects(run(variants), /INSERAT_AI_TEXT_ENGINE_QUALITY_GATE_FAILED/);
});
test("an additional supported blocking error prevents delivery", async () => {
  const variants = good.map(v => ({ ...v }));
  variants[0].text += " Die Wohnräume sind ein Wohnzimmer.";
  const input = { ...facts, market: "DE" };
  variants.forEach(v => { v.text = v.text.replaceAll("CHF", "EUR"); });
  const quality = evaluateListingQuality(variants, "de", input);
  assert.equal(quality.passed, false);
  assert(quality.issues.some(i => i.severity === "error"));
  await assert.rejects(run(variants, input), /INSERAT_AI_TEXT_ENGINE_QUALITY_GATE_FAILED/);
});
test("unsupported equipment remains blocked after the existing fact repair", async () => {
  const bad = { ...good[0], text: good[0].text + " Ein Pool gehört dazu." };
  await assert.rejects(run([bad, good[1], good[2]], facts, [bad]), /INSERAT_AI_UNSUPPORTED_PROPERTY_FEATURE_POOL/);
});
test("unprofessional wording remains blocked after both existing repair attempts", async () => {
  const bad = { ...good[0], text: good[0].text + " Weitere Informationen sind nicht angegeben." };
  await assert.rejects(run([bad, good[1], good[2]], facts, [bad, bad]), /INSERAT_AI_TEXT_ENGINE_QUALITY_GATE_FAILED/);
});
test("malformed title remains blocked after existing repairs", async () => {
  const bad = { ...good[0], title: "Kurz" };
  await assert.rejects(run([bad, good[1], good[2]], facts, [bad, bad]), /INSERAT_AI_TEXT_ENGINE_QUALITY_GATE_FAILED/);
});
test("the final gate checks repaired variants together", async () => {
  const initial = { ...good[1], text: good[1].text + " Weitere Informationen sind nicht angegeben." };
  await assert.rejects(run([good[0], initial, good[2]], facts, [good[0]]), /INSERAT_AI_TEXT_ENGINE_QUALITY_GATE_FAILED/);
});
