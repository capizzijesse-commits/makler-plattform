const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const sourceFile =
  "lib/portal-integrations/immoscout24-de-image-upload-workflow.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(sourceFile, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

let uploads = 0;
let reads = 0;
let lastTitleImage = null;
let lastOrder = null;
let mode = "accepted";

const testExports = {};

vm.runInNewContext(compiled, {
  exports: testExports,
  require(name) {
    if (name === "server-only") return {};

    if (name.endsWith("image-package.server")) {
      return {
        prepareImmoScout24DeImagePackageV1(images) {
          return [...images]
            .sort(
              (a, b) =>
                Number(b.isPrimary) - Number(a.isPrimary) ||
                a.position - b.position ||
                a.id.localeCompare(b.id)
            )
            .map((image, index) => ({
              ...image,
              order: index + 1,
              isTitleImage: index === 0,
            }));
        },
        async readImmoScout24DeImageV1(image) {
          reads++;
          lastTitleImage = image.isTitleImage;
          lastOrder = image.order;
          return image;
        },
      };
    }

    if (name.endsWith("image-multipart.server")) {
      return {
        buildImmoScout24DeImageMultipartV1() {
          return {
            externalId: "test_external_image",
            checksum: "a".repeat(64),
            formData: new FormData(),
          };
        },
      };
    }

    if (name.endsWith("image-upload-transport.server")) {
      return {
        async executeImmoScout24DeImageUploadV1() {
          uploads++;

          if (mode === "throw") {
            throw new Error("NETWORK_FAILURE");
          }

          if (mode === "rejected") {
            return {
              status: "rejected",
              httpStatus: 403,
            };
          }

          if (mode === "uncertain") {
            return {
              status: "uncertain",
              httpStatus: 503,
            };
          }

          return {
            status: "http_accepted",
            httpStatus: 201,
          };
        },
      };
    }

    throw new Error("Unexpected import: " + name);
  },
  Error,
  Object,
}, { filename: sourceFile, timeout: 3000 });

const run = testExports.runImmoScout24DeImageUploadWorkflowV1;

function makeDb(options = {}) {
  const records = new Map();
  let sequence = 0;

  const objectLink = {
    id: "object-1",
    userId: "user-1",
    connectionId: "connection-1",
    listingId: "listing-1",
    status: "created",
    externalObjectId: "123456",
  };

  const image = {
    id: "image-1",
    listingId: "listing-1",
    storageKey: "test/cover.jpg",
    position: 4,
    isPrimary:
      !options.nonPrimary && !options.primaryOther,
  };

  const prisma = {
    immoScout24DeObjectLink: {
      async findFirst({ where }) {
        if (options.noObject) return null;

        return (
          where.id === objectLink.id &&
          where.userId === objectLink.userId &&
          where.connectionId === objectLink.connectionId
        )
          ? objectLink
          : null;
      },
    },

    listingImage: {
      async findMany({ where }) {
        if (where.listingId !== image.listingId) {
          return [];
        }

        const gallery = [
          image,
          {
            ...image,
            id: "image-2",
            storageKey: "test/second.jpg",
            position: 1,
            isPrimary: !!options.primaryOther,
          },
          {
            ...image,
            id: "image-3",
            storageKey: "test/third.jpg",
            position: 2,
            isPrimary: false,
          },
        ];

        return options.noImage
          ? gallery.filter(item => item.id !== image.id)
          : gallery;
      },
    },

    immoScout24DeImageUpload: {
      async create({ data }) {
        const key = data.objectLinkId + ":" + data.imageId;

        if (records.has(key)) {
          throw Object.assign(
            new Error("DUPLICATE"),
            { code: "P2002" }
          );
        }

        const record = {
          ...data,
          id: "upload-" + (++sequence),
        };

        records.set(key, record);

        return { id: record.id };
      },

      async updateMany({ where, data }) {
        const record = [...records.values()].find(
          r => r.id === where.id
        );

        if (!record || record.status !== where.status) {
          return { count: 0 };
        }

        if (
          options.failFinalPersist &&
          where.status === "uploading"
        ) {
          return { count: 0 };
        }

        Object.assign(record, data);
        return { count: 1 };
      },
    },
  };

  return { prisma, records };
}

function input(db, changes = {}) {
  return {
    prisma: db.prisma,
    userId: "user-1",
    connectionId: "connection-1",
    objectLinkId: "object-1",
    imageId: "image-1",
    accessToken: "FAKE",
    accessTokenSecret: "FAKE",
    allowSandboxWrite: true,
    httpClient: async () => ({ status: 201 }),
    ...changes,
  };
}

async function main() {
  uploads = 0;
  reads = 0;
  mode = "accepted";

  const db1 = makeDb();

  const success = await run(input(db1));
  assert.equal(success.status, "http_accepted");
  assert.equal(success.requiresVerification, true);
  assert.equal(uploads, 1);

  console.log("PASS 1: Erfolgreicher Uploadstatus gespeichert");

  const repeated = await run(input(db1));
  assert.equal(repeated.status, "blocked");
  assert.equal(repeated.reason, "IMAGE_ALREADY_RESERVED");
  assert.equal(uploads, 1);

  console.log("PASS 2: Wiederholter Upload blockiert");

  const nonPrimaryDb = makeDb({ nonPrimary: true });
  mode = "accepted";

  const nonPrimaryResult = await run(input(nonPrimaryDb));

  assert.equal(nonPrimaryResult.status, "http_accepted");
  assert.equal(lastTitleImage, false);

  console.log("PASS EXTRA: Normales Galeriebild bleibt ohne Titelbild-Markierung");

  assert.equal(lastOrder, 3);
  console.log("PASS EXTRA: Galeriebild hat korrekte Position 3");

  const dbOrder = makeDb({ primaryOther: true });
  const orderedResult = await run(input(dbOrder));

  assert.equal(orderedResult.status, "http_accepted");
  assert.equal(lastOrder, 3);
  assert.equal(lastTitleImage, false);

  console.log("PASS EXTRA: Fremdes Titelbild aendert Bildreihenfolge korrekt");

  const db2 = makeDb();
  const before = uploads;

  const concurrent = await Promise.all([
    run(input(db2)),
    run(input(db2)),
  ]);

  assert.equal(
    concurrent.filter(x => x.status === "http_accepted").length,
    1
  );
  assert.equal(
    concurrent.filter(x => x.status === "blocked").length,
    1
  );
  assert.equal(uploads - before, 1);

  console.log("PASS 3: Zwei Prozesse, nur ein HTTP-Upload");

  const db3 = makeDb();
  const beforeObject = uploads;

  const noObject = await run(input(db3, {
    objectLinkId: "wrong-object",
  }));

  assert.equal(noObject.status, "blocked");
  assert.equal(noObject.reason, "OBJECT_LINK_NOT_READY");
  assert.equal(uploads, beforeObject);

  console.log("PASS 4: Falsche Objektzuordnung blockiert");

  const db4 = makeDb({ noImage: true });

  const noImage = await run(input(db4));
  assert.equal(noImage.status, "blocked");
  assert.equal(noImage.reason, "IMAGE_NOT_IN_LISTING");

  console.log("PASS 5: Fremdes Bild blockiert");

  mode = "throw";

  const db5 = makeDb();
  const network = await run(input(db5));

  assert.equal(network.status, "uncertain");
  assert.equal([...db5.records.values()][0].status, "uncertain");

  const callsAfterFailure = uploads;
  const again = await run(input(db5));

  assert.equal(again.status, "blocked");
  assert.equal(uploads, callsAfterFailure);

  console.log("PASS 6: Netzwerkfehler ohne erneuten POST");

  mode = "rejected";

  const db6 = makeDb();
  const rejected = await run(input(db6));

  assert.equal(rejected.status, "uncertain");
  assert.equal(
    [...db6.records.values()][0].lastErrorCode,
    "HTTP_REJECTED_403"
  );

  console.log("PASS 7: Ablehnung dauerhaft gesperrt");

  mode = "accepted";

  const db7 = makeDb({ failFinalPersist: true });

  await assert.rejects(
    () => run(input(db7)),
    e => e.code === "IMMOSCOUT24_DE_IMAGE_STATUS_PERSIST_FAILED"
  );

  assert.equal(
    [...db7.records.values()][0].status,
    "uploading"
  );

  console.log("PASS 8: Persistenzfehler erkannt, kein Freigabestatus");

  console.log(
    "\nALLE 8 WORKFLOW-SELBSTTESTS ERFOLGREICH"
  );
}

main().catch(error => {
  console.error(
    "STOP: Workflow-Test fehlgeschlagen:",
    error.message
  );
  process.exitCode = 1;
});