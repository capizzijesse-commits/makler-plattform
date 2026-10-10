const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const path =
  "lib/portal-integrations/immoscout24-de-publish-readback-parser.server.ts";

const code = ts.transpileModule(
  fs.readFileSync(path, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const exportsObject = {};
vm.runInNewContext(
  code,
  {
    exports: exportsObject,
    Buffer,
    require(name) {
      if (name === "server-only") return {};
      if (name === "fast-xml-parser") return require(name);
      throw Error("UNEXPECTED_IMPORT: " + name);
    },
  },
  { filename: path, timeout: 3000 }
);

const parse = exportsObject.parseImmoScout24DePublishReadbackV1;
assert.equal(typeof parse, "function");

const begin =
  '<common:publishObjects xmlns:common=' +
  '"http://rest.immobilienscout24.de/schema/common/1.0">';
const end = '</common:publishObjects>';

const item =
  '<publishObject id="325452819_10000">' +
  '<realEstate id="325452819"/>' +
  '<publishChannel id="10000"/>' +
  '</publishObject>';

const good = begin + item + end;

const cases = [
  ["Valid mapping", good, "confirmed", 200],
  ["Real sandbox empty namespace collection",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<common:publishObjects ' +
    'xmlns:common="http://rest.immobilienscout24.de/schema/common/1.0" ' +
    'xmlns:gis="http://example.test/gis" ' +
    'xmlns:search="http://example.test/search" ' +
    'xmlns:ns5="http://example.test/ns5" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink"/>',
    "unconfirmed", 200],
  ["Namespace collection with valid mapping",
    good.replace(
      'xmlns:common=',
      'xmlns:gis="http://example.test/gis" ' +
      'xmlns:search="http://example.test/search" ' +
      'xmlns:ns5="http://example.test/ns5" xmlns:common='
    ),
    "confirmed", 200],
  ["Provider XML with titles and xlink",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<common:publishObjects xmlns:common="http://rest.immobilienscout24.de/schema/common/1.0" xmlns:xlink="http://www.w3.org/1999/xlink">' +
    '<publishObject id="325452819_10000">' +
    '<realEstate title="Testobjekt" id="325452819"/>' +
    '<publishChannel title="ImmobilienScout24" id="10000"/>' +
    '</publishObject></common:publishObjects>',
    "confirmed", 200],
  ["Wrong xlink namespace",
    good.replace(
      'xmlns:common=',
      'xmlns:xlink="https://invalid.example/xlink" xmlns:common='
    ),
    "unconfirmed", 200],
  ["Empty collection", begin + end, "unconfirmed", 200],
  ["Wrong object", good.replaceAll("325452819", "999999"), "unconfirmed", 200],
  ["Wrong channel", good.replaceAll("10000", "10001"), "unconfirmed", 200],
  ["Wrong publish ID", good.replace("325452819_10000", "999999_10000"), "unconfirmed", 200],
  ["Multiple mappings", begin + item + item + end, "unconfirmed", 200],
  ["Wrong namespace", good.replace("schema/common/1.0", "schema/wrong/1.0"), "unconfirmed", 200],
  ["Unknown attribute", good.replace("<publishObject ", '<publishObject extra="1" '), "unconfirmed", 200],
  ["Mismatched XML", good.replace("</publishObject>", "</other>"), "unconfirmed", 200],
  ["Wrong root", "<other>" + good + "</other>", "unconfirmed", 200],
  ["DTD", '<!DOCTYPE x [<!ENTITY a "b">]>' + good, "unconfirmed", 200],
  ["CDATA", good.replace("<realEstate", "<![CDATA[x]]><realEstate"), "unconfirmed", 200],
  ["Wrong nested ID", good.replace('<realEstate id="325452819"', '<realEstate id="123"'), "unconfirmed", 200],
  ["Multiple roots", good + good, "unconfirmed", 200],
  ["HTTP 404", good, "unconfirmed", 404],
  ["Duplicate XML attribute", good.replace('<publishObject id="325452819_10000"', '<publishObject id="325452819_10000" id="325452819_10000"'), "unconfirmed", 200],
  ["Unexpected root attribute", good.replace("<common:publishObjects ", '<common:publishObjects extra="1" '), "unconfirmed", 200],
  ["Unexpected child attribute", good.replace('<realEstate id="325452819"', '<realEstate id="325452819" extra="1"'), "unconfirmed", 200],
  ["Missing realEstate", good.replace('<realEstate id="325452819"/>', ""), "unconfirmed", 200],
  ["Missing channel", good.replace('<publishChannel id="10000"/>', ""), "unconfirmed", 200],
  ["Nested false identity", good.replace('<realEstate id="325452819"/>', '<realEstate><id>325452819</id></realEstate>'), "unconfirmed", 200],
  ["Oversized body", good + " ".repeat(70000), "unconfirmed", 200],
  ["Non-200 response", good, "unconfirmed", 503],
  ["Unexpected processing instruction", good.replace("<publishObject ", "<?custom x?><publishObject "), "unconfirmed", 200],
];

for (const [i, [label, raw, expected, httpStatus]] of cases.entries()) {
  const result = parse({
    httpStatus,
    raw,
    expectedObjectId: "325452819",
    expectedChannelId: "10000",
  });
  assert.equal(result.status, expected, label);
  if (expected === "confirmed") {
    assert.equal(result.publishId, "325452819_10000");
  }
  console.log("PASS " + (i + 1) + ": " + label);
}

console.log("ALLE " + cases.length + " READBACK-TESTS BESTANDEN");
