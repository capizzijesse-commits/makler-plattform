const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED,
    },
  },
});

const marker = randomUUID().replace(/-/g, "");
const parentId = "integration_" + marker;
const connectionId = "connection_" + marker;
const imageId = "image_" + marker;

let httpCalls = 0;
let mode = "accepted";
let lastImageOrder = null;
let lastTitleImage = null;

const source =
  "lib/portal-integrations/immoscout24-de-image-upload-workflow.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(source, "utf8"),
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
    require(name) {
      if (name === "server-only") return {};

      if (name.endsWith("image-package.server")) {
        return {
          prepareImmoScout24DeImagePackageV1(images) {
            return [...images]
              .sort((a, b) =>
                Number(b.isPrimary) -
                  Number(a.isPrimary) ||
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
            lastImageOrder = image.order;
            lastTitleImage = image.isTitleImage;
            return image;
          },
        };
      }

      if (name.endsWith("image-multipart.server")) {
        return {
          buildImmoScout24DeImageMultipartV1(image) {
            return {
              externalId: "external_" + image.id,
              checksum: "a".repeat(64),
              formData: new FormData(),
            };
          },
        };
      }

      if (name.endsWith("image-upload-transport.server")) {
        return {
          async executeImmoScout24DeImageUploadV1() {
            httpCalls++;

            if (mode === "network_error") {
              throw new Error("SIMULATED_NETWORK_FAILURE");
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
  },
  { filename: source, timeout: 3000 }
);

const run =
  exportsObject.runImmoScout24DeImageUploadWorkflowV1;

const gallery = [
  {
    id: imageId,
    listingId: "listing_" + marker,
    storageKey: "fake/third.jpg",
    fileName: "third.jpg",
    mimeType: "image/jpeg",
    position: 8,
    isPrimary: false,
  },
  {
    id: "first_" + marker,
    listingId: "listing_" + marker,
    storageKey: "fake/first.jpg",
    fileName: "first.jpg",
    mimeType: "image/jpeg",
    position: 2,
    isPrimary: true,
  },
  {
    id: "second_" + marker,
    listingId: "listing_" + marker,
    storageKey: "fake/second.jpg",
    fileName: "second.jpg",
    mimeType: "image/jpeg",
    position: 5,
    isPrimary: false,
  },
];

const database = {
  immoScout24DeObjectLink:
    prisma.immoScout24DeObjectLink,

  immoScout24DeImageUpload:
    prisma.immoScout24DeImageUpload,

  listingImage: {
    async findMany({ where }) {
      return gallery.filter(
        image => image.listingId === where.listingId
      );
    },
  },
};

function workflowInput(id) {
  return {
    prisma: database,
    userId: "user_" + marker,
    connectionId,
    objectLinkId: parentId,
    imageId: id,
    accessToken: "FAKE_TEST_TOKEN",
    accessTokenSecret: "FAKE_TEST_SECRET",
    allowSandboxWrite: true,
    httpClient: async () => {
      throw new Error("REAL_HTTP_MUST_NOT_RUN");
    },
  };
}

async function main() {
  let created = false;

  try {
    const tables = await prisma.$queryRaw`
      SELECT
        to_regclass(
          'public."ImmoScout24DeObjectLink"'
        ) IS NOT NULL AS parent_exists,
        to_regclass(
          'public."ImmoScout24DeImageUpload"'
        ) IS NOT NULL AS upload_exists
    `;

    assert.equal(tables[0].parent_exists, true);
    assert.equal(tables[0].upload_exists, true);

    console.log("PASS 1: PostgreSQL-Tabellen vorhanden");

    await prisma.immoScout24DeObjectLink.create({
      data: {
        id: parentId,
        userId: "user_" + marker,
        listingId: "listing_" + marker,
        connectionId,
        externalId: "object_" + marker,
        externalObjectId: "123456",
        status: "created",
      },
    });

    created = true;

    const simultaneous = await Promise.all([
      run(workflowInput(imageId)),
      run(workflowInput(imageId)),
    ]);

    assert.equal(
      simultaneous.filter(
        x => x.status === "http_accepted"
      ).length,
      1
    );

    assert.equal(
      simultaneous.filter(
        x => x.status === "blocked"
      ).length,
      1
    );

    assert.equal(httpCalls, 1);

    console.log("PASS 2: Parallele Uploads blockiert");

    const stored =
      await prisma.immoScout24DeImageUpload.findFirst({
        where: {
          objectLinkId: parentId,
          imageId,
        },
      });

    assert.equal(stored.status, "http_accepted");
    assert.equal(lastImageOrder, 3);
    assert.equal(lastTitleImage, false);

    console.log("PASS 3: Status und Galerieposition korrekt");

    const repeated = await run(workflowInput(imageId));

    assert.equal(repeated.status, "blocked");
    assert.equal(httpCalls, 1);

    console.log("PASS 4: Dauerhafte Upload-Sperre");

    mode = "network_error";

    const failed = await run(
      workflowInput(gallery[2].id)
    );

    assert.equal(failed.status, "uncertain");

    const uncertain =
      await prisma.immoScout24DeImageUpload.findFirst({
        where: {
          objectLinkId: parentId,
          imageId: gallery[2].id,
        },
      });

    assert.equal(uncertain.status, "uncertain");

    console.log("PASS 5: Netzwerkfehler gespeichert");

    const beforeRetry = httpCalls;
    const retry = await run(
      workflowInput(gallery[2].id)
    );

    assert.equal(retry.status, "blocked");
    assert.equal(httpCalls, beforeRetry);

    console.log("PASS 6: Kein erneuter HTTP-Versuch");

    console.log(
      "\nALLE 6 POSTGRESQL-WORKFLOW-TESTS ERFOLGREICH"
    );
  } finally {
    try {
      if (created) {
        await prisma.immoScout24DeImageUpload.deleteMany({
          where: { objectLinkId: parentId },
        });

        await prisma.immoScout24DeObjectLink.deleteMany({
          where: { id: parentId, connectionId },
        });

        const remaining =
          await prisma.immoScout24DeObjectLink.count({
            where: { id: parentId },
          });

        assert.equal(remaining, 0);
        console.log("Testdaten vollstaendig entfernt");
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch(error => {
  console.error(
    "STOP: PostgreSQL-Workflow-Test fehlgeschlagen:",
    error.message
  );
  process.exitCode = 1;
});