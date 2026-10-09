const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");

const filename =
  "lib/portal-integrations/immoscout24-de-create-realestate.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const exportsObject = {};
const context = {
  exports: exportsObject,
  require(name) {
    if (name === "server-only") return {};
    throw new Error("Unexpected import: " + name);
  },
  Error,
  Object,
  Array,
  RegExp,
  String,
};

vm.runInNewContext(compiled, context, {
  filename,
  timeout: 3000,
});

const {
  prepareImmoScout24DeCreateV1: prepare,
  parseImmoScout24DeCreateResponseV1: parse,
} = exportsObject;

function expectCode(fn, code) {
  assert.throws(fn, (error) => error.code === code);
}

const xml =
  '<realestates:apartmentBuy>' +
  '<externalId>TEST_001</externalId>' +
  '</realestates:apartmentBuy>';

const request = prepare({
  environment: "sandbox",
  xml,
  externalId: "TEST_001",
});

assert.equal(request.method, "POST");
assert.equal(request.environment, "sandbox");

console.log("PASS: Sandbox-Request vorbereitet");

expectCode(
  () => prepare({
    environment: "production",
    xml,
    externalId: "TEST_001",
  }),
  "IMMOSCOUT24_DE_CREATE_PRODUCTION_LOCKED"
);

console.log("PASS: Produktion gesperrt");

const response =
  '<common:messages>' +
  '<message>' +
  '<messageCode>MESSAGE_RESOURCE_CREATED</messageCode>' +
  '<message>Resource [REALESTATE] created</message>' +
  '<id>123456</id>' +
  '</message>' +
  '</common:messages>';

const result = parse({
  statusCode: 201,
  raw: response,
});

assert.equal(result.externalObjectId, "123456");
assert.equal(result.published, false);

console.log("PASS: Objekt-ID eindeutig erkannt");

expectCode(
  () => parse({ statusCode: 403, raw: response }),
  "IMMOSCOUT24_DE_CREATE_HTTP_FAILED"
);

console.log("PASS: HTTP-Ablehnung erkannt");

expectCode(
  () => parse({ statusCode: 200, raw: "<invalid/>" }),
  "IMMOSCOUT24_DE_CREATE_UNCONFIRMED"
);

console.log("PASS: Unklare Antwort blockiert");

console.log("\nALLE 5 SELBSTTESTS ERFOLGREICH");
