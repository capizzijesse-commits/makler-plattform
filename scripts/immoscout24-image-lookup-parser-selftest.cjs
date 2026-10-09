const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename =
  "lib/portal-integrations/immoscout24-de-image-lookup-parser.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(filename, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const exportsObject = {};

vm.runInNewContext(
  compiled,
  {
    exports: exportsObject,
    Buffer,
    Error,
    require(name) {
      if (name === "server-only") return {};
      if (name === "fast-xml-parser") {
        return require("fast-xml-parser");
      }
      throw new Error("UNEXPECTED_IMPORT: " + name);
    },
  },
  { filename, timeout: 3000 }
);

const parse =
  exportsObject.parseImmoScout24DeImageLookupV1;

assert.equal(typeof parse, "function");

const externalId = "iai-1234567890abcdef12345678";
const checksum = "a".repeat(64);

const fields =
  `<externalId>${externalId}</externalId>` +
  `<externalCheckSum>${checksum}</externalCheckSum>`;

function xml(body, attrs = 'id="123456"') {
  const required = [
    'xmlns:common="http://rest.immobilienscout24.de/schema/common/1.0"',
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    'xsi:type="common:Picture"',
    'xmlns:ns5="http://www.w3.org/1999/xlink"',
    'ns5:href="https://rest.sandbox-immobilienscout24.de/restapi/api/offer/v1.0/user/me/realestate/325452819/attachment/123456"',
  ].join(" ");

  return `<common:attachment ${attrs} ${required}>${body}</common:attachment>`;
}

const cases = [
  ["Gueltige Teststruktur", xml(fields), "candidate", 200],
  ["HTTP 404", xml(fields), "unconfirmed", 404],
  ["Falsche Bildkennung",
    xml(fields.replace(externalId, "iai-wrong")), "unconfirmed", 200],
  ["Falsche Pruefsumme",
    xml(fields.replace(checksum, "b".repeat(64))), "unconfirmed", 200],
  ["Doppelte externalId",
    xml(fields + `<externalId>${externalId}</externalId>`), "unconfirmed", 200],
  ["Doppelte Checksumme",
    xml(fields + `<externalCheckSum>${checksum}</externalCheckSum>`),
    "unconfirmed", 200],
  ["Fehlende Attachment-ID", xml(fields, ""), "unconfirmed", 200],
  ["DTD",
    '<!DOCTYPE foo [<!ENTITY x "test">]>' + xml(fields),
    "unconfirmed", 200],
  ["CDATA",
    xml(fields + "<title><![CDATA[test]]></title>"),
    "unconfirmed", 200],
  ["Falsche Wurzel",
    `<other:attachment id="123456">${fields}</other:attachment>`,
    "unconfirmed", 200],
  ["Doppelte Wurzel",
    xml(fields) + xml(fields), "unconfirmed", 200],
  ["Doppeltes ID-Attribut",
    xml(fields, 'id="123456" id="999999"'), "unconfirmed", 200],
  ["Unbekanntes Identitaetsfeld",
    xml(fields + "<unexpectedIdentity>other</unexpectedIdentity>"),
    "unconfirmed", 200],
  ["Uebergrosse Antwort",
    xml(fields + "x".repeat(70000)), "unconfirmed", 200],
  ["Unbekanntes Attribut",
    xml(fields, 'id="123456" otherId="999999"'),
    "unconfirmed", 200],
  ["Verschachtelte Identitaet",
    xml(`<wrapper>${fields}</wrapper>` + fields),
    "unconfirmed", 200],
  ["Zusaetzliches Wurzelattribut",
    xml(fields, 'id="123456" xmlns:other="urn:test"'),
    "unconfirmed", 200],
  ["Fehlende Pruefsumme",
    xml(`<externalId>${externalId}</externalId>`),
    "unconfirmed", 200],
  ["Fehlender Attachment-Link",
    xml(fields).replace(/\s+ns5:href="[^"]*"/, ""),
    "unconfirmed", 200],
  ["Fehlender Bildtyp",
    xml(fields).replace(/\s+xsi:type="[^"]*"/, ""),
    "unconfirmed", 200],
  ["Fehlender common-Namensraum",
    xml(fields).replace(/\s+xmlns:common="[^"]*"/, ""),
    "unconfirmed", 200],
  ["Nur Bildkennung und Pruefsumme",
    `<common:attachment id="123456">${fields}</common:attachment>`,
    "unconfirmed", 200],
  ["Bild-URLs erlaubt",
    xml(fields +
      '<urls><url scale="SCALE" href="https://example.invalid/a.jpg"/></urls>'),
    "candidate", 200],
  ["Offizielle Bildgroessen mit kleinem x",
    xml(fields +
      '<urls>' +
      '<url scale="SCALE_540x540" href="https://spicture.preview-is24.de/a.jpg"/>' +
      '<url scale="SCALE_AND_CROP" href="https://spicture.preview-is24.de/b.jpg"/>' +
      '<url scale="WHITE_FILLING" href="https://spicture.preview-is24.de/c.jpg"/>' +
      '</urls>'),
    "candidate", 200],
  ["Doppelter URL-Massstab",
    xml(fields +
      '<urls><url scale="SCALE" href="https://example.invalid/a.jpg"/>' +
      '<url scale="SCALE" href="https://example.invalid/b.jpg"/></urls>'),
    "unconfirmed", 200],
  ["Falsche Pruefsumme mit URLs",
    xml(fields.replace(checksum, "b".repeat(64)) +
      '<urls><url scale="SCALE" href="https://example.invalid/a.jpg"/></urls>'),
    "unconfirmed", 200],
];

async function main() {
  for (const [index, entry] of cases.entries()) {
    const [label, raw, expected, httpStatus] = entry;

    const result = parse({
      httpStatus,
      raw,
      expectedExternalId: externalId,
      expectedChecksum: checksum,
      expectedRealEstateId: "325452819",
    });

    assert.equal(
      result.status,
      expected,
      `${label}: ${JSON.stringify(result)}`
    );

    assert.equal(result.retryUploadAllowed, false);

    if (expected === "candidate") {
      assert.equal(result.authenticated, false);
      assert.equal(result.attachmentId, "123456");
      assert.equal(result.externalId, externalId);
      assert.equal(result.checksum, checksum);
    }

    console.log(`PASS ${index + 1}: ${label}`);
  }

  console.log("\nALLE " + cases.length + " XML-PARSER-TESTS ERFOLGREICH");
  console.log("Keine HTTP-Aufrufe oder Datenbankoperationen.");
}

main().catch(error => {
  console.error("STOP:", error.message);
  process.exitCode = 1;
});