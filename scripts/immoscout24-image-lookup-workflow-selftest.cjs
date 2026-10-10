const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename =
  "lib/portal-integrations/immoscout24-de-image-lookup-workflow.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(filename, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;


const readinessFile =
  "lib/portal-integrations/immoscout24-de-sandbox-image-readiness.server.ts";

const readinessCompiled = ts.transpileModule(
  fs.readFileSync(readinessFile, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const readinessExports = {};

vm.runInNewContext(
  readinessCompiled,
  {
    exports: readinessExports,
    require(name) {
      if (name === "server-only") return {};
      throw Error("UNEXPECTED_READINESS_IMPORT");
    },
  },
  { filename: readinessFile, timeout: 3000 }
);

assert.equal(
  typeof readinessExports.assessImmoScout24DeSandboxImageReadinessV1,
  "function"
);

const ctx = {
  userId: "user-1",
  connectionId: "connection-1",
  objectLinkId: "link-1",
  imageId: "image-1",
};

const checksum = "a".repeat(64);
const nativeFetch = async () => {
  throw Error("STOP: ECHTER HTTP-AUFRUF NICHT ERLAUBT");
};

let state;
let calls;

function reset(overrides = {}) {
  state = {
    connectionAllowed: true,
    linkExists: true,
    imageExists: true,
    uploadExists: true,
    accessExists: true,
    accessUserId: ctx.userId,
    tokenError: false,
    transportError: false,
    transportStatus: "candidate",
    ...overrides,
  };

  calls = {
    guard: 0,
    connection: 0,
    link: 0,
    image: 0,
    upload: 0,
    oauth: 0,
    transport: 0,
    writes: 0,
  };
}

const prisma = {
  portalConnection: {
    async findFirst({ where }) {
      calls.connection++;

      assert.equal(where.id, ctx.connectionId);
      assert.equal(where.userId, ctx.userId);
      assert.equal(where.portal, "immoscout24_de");
      assert.equal(where.environment, "test");
      assert.equal(
        JSON.stringify(where.status.in),
        JSON.stringify(["configured", "verified"])
      );

      return state.connectionAllowed
        ? { status: "verified", environment: "test" }
        : null;
    },
  },
  immoScout24DeObjectLink: {
    async findFirst({ where }) {
      calls.link++;

      assert.equal(where.id, ctx.objectLinkId);
      assert.equal(where.userId, ctx.userId);
      assert.equal(where.connectionId, ctx.connectionId);
      assert.equal(where.status, "created");

      return state.linkExists
        ? {
            id: ctx.objectLinkId,
            listingId: "listing-1",
            externalObjectId: "325452819",
          }
        : null;
    },
  },

  listingImage: {
    async findFirst({ where }) {
      calls.image++;

      assert.equal(where.id, ctx.imageId);
      assert.equal(where.listingId, "listing-1");

      return state.imageExists
        ? { id: ctx.imageId }
        : null;
    },
  },

  immoScout24DeImageUpload: {
    async findFirst({ where }) {
      calls.upload++;

      assert.equal(where.objectLinkId, ctx.objectLinkId);
      assert.equal(where.imageId, ctx.imageId);
      assert.equal(where.externalAttachmentId, null);

      return state.uploadExists
        ? { externalId: "iai-image-1", checksum }
        : null;
    },
  },
};

const exportsObject = {};

vm.runInNewContext(
  compiled,
  {
    exports: exportsObject,
    fetch: nativeFetch,

    require(name) {
      if (name === "server-only") return {};

      if (name === "@/lib/prisma") {
        return { prisma };
      }

      if (name.endsWith("immoscout24-de-sandbox-image-readiness.server")) {
        return {
          assessImmoScout24DeSandboxImageReadinessV1:
            readinessExports.assessImmoScout24DeSandboxImageReadinessV1,
        };
      }

      if (name.endsWith("image-connection-guard.server")) {
        return {
          async checkImmoScout24DeImageConnectionV1(input) {
            calls.guard++;
            assert.equal(input.prisma, prisma);
            assert.equal(input.userId, ctx.userId);
            assert.equal(input.connectionId, ctx.connectionId);

            return state.connectionAllowed
              ? { allowed: true }
              : {
                  allowed: false,
                  reason: "CONNECTION_NOT_VERIFIED",
                };
          },
        };
      }

      if (name.endsWith("immoscout24-de-oauth-flow.server")) {
        return {
          async getImmoScout24DeSandboxAccess(userId) {
            calls.oauth++;
            assert.equal(userId, ctx.userId);

            if (state.tokenError) {
              throw Error("SIMULATED_OAUTH_ERROR");
            }

            return state.accessExists
              ? {
                  userId: state.accessUserId,
                  accessToken: "fake-access-token",
                  accessTokenSecret: "fake-access-secret",
                }
              : null;
          },
        };
      }

      if (name.endsWith("image-lookup-transport.server")) {
        return {
          async executeImmoScout24DeImageLookupV1(input) {
            calls.transport++;

            assert.equal(input.realEstateId, "325452819");
            assert.equal(input.externalId, "iai-image-1");
            assert.equal(input.expectedChecksum, checksum);
            assert.equal(input.accessToken, "fake-access-token");
            assert.equal(input.accessTokenSecret, "fake-access-secret");
            assert.equal(input.httpClient, nativeFetch);

            if (state.transportError) {
              throw Error("SIMULATED_TRANSPORT_ERROR");
            }

            return state.transportStatus === "candidate"
              ? {
                  status: "candidate",
                  attachmentId: "665089044",
                  externalId: "iai-image-1",
                  checksum,
                  authenticated: false,
                  retryUploadAllowed: false,
                }
              : {
                  status: "unconfirmed",
                  reason: "LOOKUP_HTTP_UNCONFIRMED",
                  retryUploadAllowed: false,
                };
          },
        };
      }

      throw Error("UNEXPECTED_IMPORT: " + name);
    },
  },
  { filename, timeout: 3000 }
);

const lookup =
  exportsObject.lookupImmoScout24DeImageProtectedV1;

assert.equal(typeof lookup, "function");

async function check(
  number,
  label,
  changes,
  expectedStatus,
  expectedReason,
  expectedTransportCalls
) {
  reset(changes);

  const result = await lookup(ctx);

  assert.equal(result.status, expectedStatus, label);
  assert.equal(result.retryUploadAllowed, false, label);
  assert.equal(
    calls.transport,
    expectedTransportCalls,
    label
  );
  assert.equal(calls.writes, 0, label);

  if (expectedStatus === "blocked") {
    assert.equal(result.reason, expectedReason, label);
  } else {
    assert.equal(result.externalAttachmentId, "665089044");
    assert.equal(result.externalId, "iai-image-1");
    assert.equal(result.checksum, checksum);
    assert.equal(result.realEstateId, "325452819");
    assert.equal(result.authenticated, false);
  }

  console.log(`PASS ${number}: ${label}`);
}

async function main() {
  reset();

  const invalid = await lookup({
    ...ctx,
    imageId: "",
  });

  assert.equal(invalid.status, "blocked");
  assert.equal(invalid.reason, "INVALID_LOOKUP_CONTEXT");
  assert.equal(calls.guard, 0);
  console.log("PASS 1: Ungueltiger Kontext ohne DB-Zugriff");

  await check(
    2, "Verbindung nicht verifiziert",
    { connectionAllowed: false },
    "blocked", "CONNECTION_NOT_CONFIGURED", 0
  );

  await check(
    3, "Fremder oder fehlender Objektlink",
    { linkExists: false },
    "blocked", "OBJECT_LINK_NOT_READY", 0
  );

  await check(
    4, "Bild gehoert nicht zum Inserat",
    { imageExists: false },
    "blocked", "IMAGE_NOT_IN_LISTING", 0
  );

  await check(
    5, "Bild nicht fuer Abgleich berechtigt",
    { uploadExists: false },
    "blocked", "IMAGE_NOT_ELIGIBLE", 0
  );

  await check(
    6, "OAuth-Zugangsdaten fehlen",
    { accessExists: false },
    "blocked", "OAUTH_ACCESS_UNAVAILABLE", 0
  );

  await check(
    7, "OAuth-Zugangsdaten gehoeren anderem Benutzer",
    { accessUserId: "different-user" },
    "blocked", "OAUTH_ACCESS_UNAVAILABLE", 0
  );

  await check(
    8, "OAuth-Ladefehler",
    { tokenError: true },
    "blocked", "OAUTH_ACCESS_UNAVAILABLE", 0
  );

  await check(
    9, "Providerantwort unbestaetigt",
    { transportStatus: "unconfirmed" },
    "blocked", "LOOKUP_HTTP_UNCONFIRMED", 1
  );

  await check(
    10, "Transportfehler blockiert",
    { transportError: true },
    "blocked", "LOOKUP_EXECUTION_FAILED", 1
  );

  await check(
    11, "Geschuetzter Lookup liefert nur Kandidaten",
    {},
    "candidate", null, 1
  );

  console.log("\nALLE 11 LOOKUP-WORKFLOW-TESTS BESTANDEN");
  console.log("Keine HTTP-Aufrufe oder Datenbankoperationen.");
}

main().catch(error => {
  console.error("STOP:", error.stack || error.message);
  process.exitCode = 1;
});
