const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename =
  "lib/portal-integrations/immoscout24-de-image-package.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const jpeg = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4
]);

const png = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 1
]);

const contents = new Map([
  ["images/living.jpg", jpeg],
  ["images/cover.png", png],
]);

let reads = 0;
let oversized = false;

const storage = {
  async headObject(key) {
    const bytes = contents.get(key);

    if (!bytes) {
      throw new Error("TEST_IMAGE_NOT_FOUND");
    }

    return {
      size: oversized ? 16 * 1024 * 1024 : bytes.length,
      contentType: "application/octet-stream",
    };
  },

  async getObjectBytes(key) {
    reads++;
    return contents.get(key);
  },
};

const testExports = {};

vm.runInNewContext(compiled, {
  exports: testExports,

  require(name) {
    if (name === "server-only") return {};
    if (name === "@/lib/storage/storage.server") {
      return storage;
    }
    throw new Error("Unexpected import: " + name);
  },

  Error,
  Object,
  Array,
  Set,
  String,
  Number,
  Uint8Array,
}, { filename, timeout: 3000 });

function makeImage(input) {
  return {
    id: input.id,
    storageKey: input.storageKey,
    fileName: input.fileName ?? null,
    mimeType: input.mimeType ?? null,
    position: input.position ?? 0,
    isPrimary: input.isPrimary ?? false,
  };
}

function rejectCode(action, code) {
  assert.throws(action, error => error.code === code);
}

async function main() {
  const images = [
    makeImage({
      id: "living",
      storageKey: "images/living.jpg",
      fileName: "living.jpg",
      mimeType: "image/jpeg",
      position: 1,
    }),
    makeImage({
      id: "cover",
      storageKey: "images/cover.png",
      fileName: "cover.png",
      mimeType: "image/png",
      position: 8,
      isPrimary: true,
    }),
  ];

  const items = testExports.prepareImmoScout24DeImagePackageV1(
    images
  );

  assert.equal(items.length, 2);
  assert.equal(items[0].id, "cover");
  assert.equal(items[0].isTitleImage, true);
  assert.equal(items[0].order, 1);
  assert.equal(items[1].id, "living");
  assert.equal(items[1].order, 2);

  console.log("PASS: Titelbild und Reihenfolge");

  const loaded = await testExports.readImmoScout24DeImageV1(
    items[0]
  );

  assert.equal(loaded.mimeType, "image/png");
  assert.equal(loaded.sizeBytes, png.length);

  console.log("PASS: Echte Bildbytes erkannt");

  rejectCode(
    () => testExports.prepareImmoScout24DeImagePackageV1([
      images[0],
      images[0],
    ]),
    "IMMOSCOUT24_DE_IMAGE_INPUT_INVALID"
  );

  console.log("PASS: Doppelte Bilder blockiert");

  rejectCode(
    () => testExports.prepareImmoScout24DeImagePackageV1([
      { ...images[0], isPrimary: true },
      images[1],
    ]),
    "IMMOSCOUT24_DE_MULTIPLE_TITLE_IMAGES"
  );

  console.log("PASS: Mehrere Titelbilder blockiert");

  oversized = true;
  reads = 0;

  await assert.rejects(
    () => testExports.readImmoScout24DeImageV1(items[0]),
    error => error.code === "IMMOSCOUT24_DE_IMAGE_SIZE_INVALID"
  );

  assert.equal(reads, 0);
  oversized = false;

  console.log("PASS: Zu grosse Dateien vor Download blockiert");

  await assert.rejects(
    () => testExports.readImmoScout24DeImageV1({
      ...items[0],
      mimeType: "image/jpeg",
    }),
    error => error.code === "IMMOSCOUT24_DE_IMAGE_MIME_MISMATCH"
  );

  console.log("PASS: Falscher Dateityp blockiert");

  console.log(
    "\nALLE 6 BILDPAKET-SELBSTTESTS ERFOLGREICH"
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});