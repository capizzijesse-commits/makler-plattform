const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename =
  "lib/portal-integrations/immoscout24-de-image-multipart.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const testExports = {};

vm.runInNewContext(compiled, {
  exports: testExports,
  require(name) {
    if (name === "server-only") return {};
    if (name === "node:crypto") return require("node:crypto");
    throw new Error("Unexpected import: " + name);
  },
  FormData,
  Blob,
  Uint8Array,
  Error,
}, { filename, timeout: 3000 });

const build = testExports.buildImmoScout24DeImageMultipartV1;

function makeImage(changes = {}) {
  const bytes = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4
  ]);

  return {
    id: "test-image-1",
    storageKey: "test/images/cover.jpg",
    fileName: "Wohnzimmer.jpg",
    mimeType: "image/jpeg",
    order: 1,
    isTitleImage: true,
    bytes,
    sizeBytes: bytes.byteLength,
    ...changes,
  };
}

function expectCode(action, code) {
  assert.throws(
    action,
    error => error.code === code
  );
}

async function main() {
  const image = makeImage();
  const result = build(image);

  assert.equal(result.formData.has("metadata"), true);
  assert.equal(result.formData.has("attachment"), true);

  console.log("PASS 1: Beide Multipart-Felder vorhanden");

  const metadata = result.formData.get("metadata");
  const xml = await metadata.text();

  assert.match(xml, /<externalId>iai-[a-f0-9]{24}<\/externalId>/);
  assert.match(xml, /<titlePicture>true<\/titlePicture>/);
  assert.match(xml, /<externalCheckSum>[a-f0-9]{64}<\/externalCheckSum>/);

  console.log("PASS 2: XML-Metadaten und Titelbild");

  const attachment = result.formData.get("attachment");
  const actual = new Uint8Array(await attachment.arrayBuffer());

  assert.equal(attachment.type, "image/jpeg");
  assert.equal(attachment.name, "Wohnzimmer.jpg");
  assert.deepEqual([...actual], [...image.bytes]);

  console.log("PASS 3: Bilddatei binaer unveraendert");

  const again = build(makeImage());

  assert.equal(again.externalId, result.externalId);
  assert.equal(again.checksum, result.checksum);

  console.log("PASS 4: Externe ID und Pruefsumme stabil");

  expectCode(
    () => build(makeImage({
      mimeType: "image/webp"
    })),
    "IMMOSCOUT24_DE_MULTIPART_FORMAT_UNSUPPORTED"
  );

  console.log("PASS 5: WebP vorerst gesperrt");

  expectCode(
    () => build(makeImage({
      sizeBytes: 1000
    })),
    "IMMOSCOUT24_DE_MULTIPART_INPUT_INVALID"
  );

  console.log("PASS 6: Ungueltige Byte-Laenge blockiert");

  console.log(
    "\nALLE 6 MULTIPART-SELBSTTESTS ERFOLGREICH"
  );
}

main().catch(() => {
  console.error("STOP: Multipart-Test fehlgeschlagen.");
  process.exitCode = 1;
});