const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file =
  "lib/portal-integrations/immoscout24-de-image-publish-readiness.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(file, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const exported = {};

vm.runInNewContext(
  compiled,
  {
    exports: exported,
    Set,
    Map,
    require(name) {
      if (name === "server-only") return {};
      throw Error("UNEXPECTED_IMPORT: " + name);
    },
  },
  { filename: file, timeout: 3000 }
);

const assess =
  exported.assessImmoScout24DeImagePublishReadinessV1;

assert.equal(typeof assess, "function");

const checksum = "a".repeat(64);

function fixture(changes = {}) {
  const data = {
    connection: { id: "connection-1" },
    listing: { id: "listing-1" },
    link: { id: "link-1" },
    images: [{ id: "image-1" }, { id: "image-2" }],
    uploads: [
      {
        imageId: "image-1",
        status: "verified",
        externalId: "external-1",
        checksum,
        externalAttachmentId: "attachment-1",
      },
      {
        imageId: "image-2",
        status: "verified",
        externalId: "external-2",
        checksum,
        externalAttachmentId: "attachment-2",
      },
    ],
    ...changes,
  };

  let calls = 0;

  const prisma = {
    portalConnection: {
      async findFirst() {
        calls++;
        return data.connection;
      },
    },
    listing: {
      async findFirst() {
        calls++;
        return data.listing;
      },
    },
    immoScout24DeObjectLink: {
      async findFirst() {
        calls++;
        return data.link;
      },
    },
    listingImage: {
      async findMany() {
        calls++;
        return data.images;
      },
    },
    immoScout24DeImageUpload: {
      async findMany() {
        calls++;
        return data.uploads;
      },
    },
  };

  return {
    input: {
      prisma,
      userId: "user-1",
      listingId: "listing-1",
      connectionId: "connection-1",
      externalObjectId: "325452819",
    },
    getCalls: () => calls,
  };
}

async function expectBlocked(changes, reason) {
  const test = fixture(changes);
  const result = await assess(test.input);

  assert.equal(result.status, "blocked");
  assert.equal(result.reason, reason);
}

async function main() {
  const good = fixture();
  const ready = await assess(good.input);

  assert.equal(ready.status, "ready");
  assert.equal(ready.imageCount, 2);
  assert.equal(ready.attachmentIds.length, 2);
  console.log("PASS 1: Beide Bilder verifiziert");

  await expectBlocked(
    { connection: null },
    "PORTAL_CONNECTION_NOT_READY"
  );
  console.log("PASS 2: Verbindung nicht freigegeben");

  await expectBlocked(
    { listing: null },
    "LISTING_NOT_OWNED"
  );
  console.log("PASS 3: Fremdes Inserat blockiert");

  await expectBlocked(
    { link: null },
    "OBJECT_LINK_NOT_READY"
  );
  console.log("PASS 4: Fehlende Objektzuordnung");

  await expectBlocked(
    { images: [] },
    "LISTING_HAS_NO_IMAGES"
  );
  console.log("PASS 5: Keine Bilder");

  await expectBlocked(
    { uploads: [] },
    "IMAGE_UPLOAD_COUNT_MISMATCH"
  );
  console.log("PASS 6: Nicht alle Bilder hochgeladen");

  const pending = fixture();
  const pendingUploads = [...(await pending.input.prisma.immoScout24DeImageUpload.findMany())];
  pendingUploads[1] = {
    ...pendingUploads[1],
    status: "http_accepted",
  };

  await expectBlocked(
    { uploads: pendingUploads },
    "IMAGE_NOT_VERIFIED"
  );
  console.log("PASS 7: HTTP 201 reicht nicht zur Freigabe");

  const duplicate = fixture();
  const duplicateUploads =
    await duplicate.input.prisma.immoScout24DeImageUpload.findMany();

  await expectBlocked(
    {
      uploads: [
        duplicateUploads[0],
        {
          ...duplicateUploads[1],
          externalAttachmentId: "attachment-1",
        },
      ],
    },
    "DUPLICATE_ATTACHMENT_ID"
  );
  console.log("PASS 8: Doppelte Attachment-ID blockiert");

  const wrong = fixture();
  const wrongUploads =
    await wrong.input.prisma.immoScout24DeImageUpload.findMany();

  await expectBlocked(
    {
      uploads: [
        wrongUploads[0],
        { ...wrongUploads[1], imageId: "foreign-image" },
      ],
    },
    "IMAGE_UPLOAD_MEMBERSHIP_MISMATCH"
  );
  console.log("PASS 9: Fremdes Bild blockiert");

  const badChecksum = fixture();
  const checksumUploads =
    await badChecksum.input.prisma.immoScout24DeImageUpload.findMany();

  await expectBlocked(
    {
      uploads: [
        { ...checksumUploads[0], checksum: "invalid" },
        checksumUploads[1],
      ],
    },
    "INVALID_VERIFIED_IMAGE_IDENTITY"
  );
  console.log("PASS 10: Ungueltige Bildidentitaet blockiert");

  const invalidInput = fixture();
  const invalid = await assess({
    ...invalidInput.input,
    externalObjectId: "not-a-number",
  });

  assert.equal(invalid.status, "blocked");
  assert.equal(invalidInput.getCalls(), 0);
  console.log("PASS 11: Ungueltiger Kontext vor DB-Zugriff blockiert");

  const scoped = fixture();
  const captured = {};

  const checks = [
    ["portalConnection", "findFirst"],
    ["listing", "findFirst"],
    ["immoScout24DeObjectLink", "findFirst"],
    ["listingImage", "findMany"],
    ["immoScout24DeImageUpload", "findMany"],
  ];

  for (const [model, method] of checks) {
    const originalMethod = scoped.input.prisma[model][method];
    scoped.input.prisma[model][method] = async args => {
      captured[model] = args;
      return originalMethod(args);
    };
  }

  const scopedResult = await assess(scoped.input);
  assert.equal(scopedResult.status, "ready");

  assert.equal(scoped.getCalls(), 5);

  assert.deepEqual(
    JSON.parse(JSON.stringify(captured.portalConnection.where)),
    {
      id: "connection-1",
      userId: "user-1",
      portal: "immoscout24_de",
      environment: "test",
      status: "verified",
    }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(captured.listing.where)),
    { id: "listing-1", userId: "user-1" }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(captured.immoScout24DeObjectLink.where)),
    {
      userId: "user-1",
      listingId: "listing-1",
      connectionId: "connection-1",
      externalObjectId: "325452819",
      status: "created",
    }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(captured.listingImage.where)),
    { listingId: "listing-1" }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(captured.immoScout24DeImageUpload.where)),
    { objectLinkId: "link-1" }
  );

  console.log("PASS 12: Prisma-Abfragefilter korrekt");

  console.log("\nALLE 12 BILD-FREIGABETESTS BESTANDEN");
}

main().catch(error => {
  console.error("STOP:", error.message);
  process.exitCode = 1;
});