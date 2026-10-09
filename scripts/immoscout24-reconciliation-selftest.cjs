const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");

const filename =
  "lib/portal-integrations/immoscout24-de-reconciliation.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const output = {};

vm.runInNewContext(compiled, {
  exports: output,
  require(name) {
    if (name === "server-only") return {};
    throw new Error("Unexpected import: " + name);
  },
  Error,
  Object,
  Array,
  encodeURIComponent,
}, { filename, timeout: 3000 });

function rejectCode(fn, code) {
  assert.throws(fn, e => e.code === code);
}

const request =
  output.prepareImmoScout24DeLookupV1("TEST_001");

assert.equal(
  request.path,
  "/restapi/api/offer/v1.0/user/me/realestate/ext-TEST_001"
);
console.log("PASS: Dokumentierter GET-Pfad");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<realestates:apartmentBuy
 xmlns:realestates="http://rest.immobilienscout24.de/schema/offer/realestates/1.0"
 id="123456">
 <externalId>TEST_001</externalId>
 <title>Test</title>
</realestates:apartmentBuy>`;

const found = output.parseImmoScout24DeLookupV1({
  statusCode: 200,
  raw: xml,
  expectedExternalId: "TEST_001",
});

assert.equal(found.status, "found");
assert.equal(found.externalObjectId, "123456");
console.log("PASS: Objekt eindeutig gefunden");

const absent = output.parseImmoScout24DeLookupV1({
  statusCode: 404,
  raw: "",
  expectedExternalId: "TEST_001",
});

assert.equal(absent.status, "not_found");
assert.equal(absent.retryCreateAllowed, false);
console.log("PASS: 404 erlaubt keinen neuen POST");

rejectCode(
  () => output.parseImmoScout24DeLookupV1({
    statusCode: 200,
    raw: xml.replace(
      "<externalId>TEST_001</externalId>",
      "<externalId>OTHER</externalId>"
    ),
    expectedExternalId: "TEST_001",
  }),
  "IMMOSCOUT24_DE_LOOKUP_IDENTITY_MISMATCH"
);
console.log("PASS: Falsche Referenz blockiert");

rejectCode(
  () => output.parseImmoScout24DeLookupV1({
    statusCode: 503,
    raw: "",
    expectedExternalId: "TEST_001",
  }),
  "IMMOSCOUT24_DE_LOOKUP_HTTP_UNCONFIRMED"
);
console.log("PASS: API-Fehler blockiert");

rejectCode(
  () => output.parseImmoScout24DeLookupV1({
    statusCode: 200,
    raw: "<invalid/>",
    expectedExternalId: "TEST_001",
  }),
  "IMMOSCOUT24_DE_LOOKUP_XML_UNCONFIRMED"
);
console.log("PASS: Ungültiges XML blockiert");

console.log("\nALLE 6 BESTANDSABGLEICH-TESTS ERFOLGREICH");
