const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file =
  "lib/portal-integrations/immoscout24-de-image-sandbox-confirmation.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(file, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const context = {
  userId: "test-user",
  connectionId: "test-connection",
  objectLinkId: "test-link",
  imageId: "test-image",
};

const identity = {
  externalId: "test-external",
  checksum: "a".repeat(64),
  realEstateId: "325452819",
  attachmentId: "123456789",
};

let mode;
let writes;
let reads;

const prisma = {
  immoScout24DeObjectLink: {
    async findFirst({ where }) {
      reads++;
      assert.equal(where.userId, context.userId);
      assert.equal(where.connectionId, context.connectionId);

      return {
        id: context.objectLinkId,
        externalObjectId: identity.realEstateId,
      };
    },
  },

  immoScout24DeImageUpload: {
    async findFirst({ where }) {
      reads++;
      assert.equal(where.objectLinkId, context.objectLinkId);
      assert.equal(where.imageId, context.imageId);

      return {
        id: "upload-test",
        externalId: identity.externalId,
        checksum: identity.checksum,
      };
    },

    async updateMany({ where, data }) {
      writes++;

      assert.equal(where.id, "upload-test");
      assert.equal(where.imageId, context.imageId);
      assert.equal(where.externalId, identity.externalId);
      assert.equal(where.checksum, identity.checksum);
      assert.equal(where.externalAttachmentId, null);

      const link = where.objectLink?.is;
      assert.ok(link, "RELATIONAL_FILTER_MISSING");

      assert.equal(link.userId, context.userId);
      assert.equal(link.connectionId, context.connectionId);
      assert.equal(link.id, context.objectLinkId);
      assert.equal(link.status, "created");
      assert.equal(link.externalObjectId, identity.realEstateId);

      assert.equal(data.status, "verified");
      assert.equal(data.externalAttachmentId, identity.attachmentId);

      return { count: mode === "conflict" ? 0 : 1 };
    },
  },
};

const environment = { NODE_ENV: "test" };
const exportsObject = {};

vm.runInNewContext(
  compiled,
  {
    exports: exportsObject,
    process: { env: environment },
    Date,

    require(name) {
      if (name === "server-only") return {};

      if (name === "@/lib/prisma") return { prisma };

      if (name.endsWith("image-connection-guard.server")) {
        return {
          async checkImmoScout24DeImageConnectionV1() {
            return { allowed: true };
          },
        };
      }

      if (name.endsWith("image-lookup-workflow.server")) {
        return {
          async lookupImmoScout24DeImageProtectedV1() {
            return {
              status: "candidate",
              externalAttachmentId: identity.attachmentId,
              externalId:
                mode === "wrong-image"
                  ? "other-image"
                  : identity.externalId,
              checksum: identity.checksum,
              realEstateId: identity.realEstateId,
              authenticated: false,
              retryUploadAllowed: false,
            };
          },
        };
      }

      throw Error("UNEXPECTED_IMPORT: " + name);
    },
  },
  { filename: file, timeout: 3000 }
);

const confirm =
  exportsObject.confirmImmoScout24DeImageSandboxV1;

async function test(label, nextMode, expected, reason, writeCount) {
  mode = nextMode;
  writes = 0;
  reads = 0;

  environment.NODE_ENV =
    nextMode === "production" ? "production" : "test";

  const result = await confirm(context);

  assert.equal(result.status, expected);
  assert.equal(result.retryUploadAllowed, false);
  assert.equal(writes, writeCount);

  if (reason) {
    assert.equal(result.reason, reason);
  }

  if (nextMode === "production") {
    assert.equal(reads, 0);
  }

  console.log("PASS: " + label);
}

async function main() {
  await test(
    "Produktionssperre",
    "production",
    "blocked",
    "SANDBOX_CONFIRMATION_PRODUCTION_DISABLED",
    0
  );

  await test(
    "Fremde Bildidentitaet",
    "wrong-image",
    "blocked",
    "LOOKUP_IDENTITY_CHANGED",
    0
  );

  await test(
    "Relationaler CAS-Konflikt",
    "conflict",
    "blocked",
    "IMAGE_CONFIRMATION_CONFLICT",
    1
  );

  await test(
    "Erfolgreiche Sandbox-Bestaetigung",
    "success",
    "verified",
    null,
    1
  );

  console.log("\nALLE 4 DAUERHAFTEN TESTS BESTANDEN");
  console.log("Keine HTTP- oder PostgreSQL-Verbindung.");
}

main().catch(error => {
  console.error("STOP:", error.stack || error.message);
  process.exitCode = 1;
});
