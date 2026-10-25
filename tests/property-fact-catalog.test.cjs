const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const filename = path.resolve("lib/property-fact-catalog.ts");
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
  PROPERTY_FACT_CATALOG,
  getPropertyFactDefinition,
  isPublicPropertyFactKey,
  getPropertyFactDefinitionsByCategory,
} = loaded.exports;

test("Catalog keys are unique", () => {
  const keys = PROPERTY_FACT_CATALOG.map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("Existing core facts are represented", () => {
  for (const key of [
    "location", "postalCode", "street",
    "propertyType", "rooms", "livingArea", "price"
  ]) {
    assert.ok(getPropertyFactDefinition(key), key);
  }
});

test("Exact address information is restricted", () => {
  assert.equal(isPublicPropertyFactKey("street"), false);
  assert.equal(isPublicPropertyFactKey("postalCode"), false);
  assert.equal(isPublicPropertyFactKey("location"), true);
});

test("Unknown keys are restricted by default", () => {
  assert.equal(isPublicPropertyFactKey("unknownProperty"), false);
});

test("Area units are declared", () => {
  assert.equal(getPropertyFactDefinition("livingArea").unit, "m2");
  assert.equal(getPropertyFactDefinition("plotArea").unit, "m2");
});

test("Equipment and energy are separate categories", () => {
  assert.ok(
    getPropertyFactDefinitionsByCategory("equipment")
      .some((item) => item.key === "balcony")
  );
  assert.ok(
    getPropertyFactDefinitionsByCategory("energy")
      .some((item) => item.key === "heatingSystem")
  );
});

test("Publication policies are defined", () => {
  for (const item of PROPERTY_FACT_CATALOG) {
    assert.ok(["standard", "restricted"].includes(item.publication));
  }
});