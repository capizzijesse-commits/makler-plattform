const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const workflowPath =
  "lib/portal-integrations/immoscout24-de-image-lookup-workflow.server.ts";

const readinessPath =
  "lib/portal-integrations/immoscout24-de-sandbox-image-readiness.server.ts";

function load(source, mocks) {
  const js = ts.transpileModule(
    fs.readFileSync(source, "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }
  ).outputText;

  const output = {};

  vm.runInNewContext(js, {
    exports: output,
    fetch: async () => {
      throw Error("STOP: REAL_HTTP_NOT_ALLOWED");
    },
    require(name) {
      if (name === "server-only") return {};
      if (Object.prototype.hasOwnProperty.call(mocks, name)) {
        return mocks[name];
      }
      throw Error("STOP: UNEXPECTED_IMPORT: " + name);
    }
  }, { filename: source });

  return output;
}

const readiness = load(readinessPath, {});

const checksum = "a".repeat(64);

const validCandidate = {
  status: "candidate",
  attachmentId: "attachment_1",
  externalId: "image_001",
  checksum,
  authenticated: false,
  retryUploadAllowed: false
};

const input = {
  userId: "user-1",
  connectionId: "connection-1",
  objectLinkId: "object-link-1",
  imageId: "image-1"
};

async function scenario(label, patch, expectedStatus, expectedReason) {
  const state = {
    connection: true,
    connectionStatus: "configured",
    objectLink: true,
    listingImage: true,
    upload: true,
    oauth: true,
    outcome: validCandidate,
    ...patch
  };

  const calls = {
    connection: 0,
    objectLink: 0,
    image: 0,
    upload: 0,
    oauth: 0,
    transport: 0,
    writes: 0
  };

  function assertOwner(where) {
    assert.equal(where.userId, input.userId);
  }

  const prisma = {
    portalConnection: {
      async findFirst({ where, select }) {
        calls.connection++;
        assertOwner(where);
        assert.equal(where.id, input.connectionId);
        assert.equal(where.portal, "immoscout24_de");
        assert.equal(where.environment, "test");
        assert.deepEqual(
          [...where.status.in].sort(),
          ["configured", "verified"]
        );
        assert.equal(select.environment, true);
        assert.equal(select.status, true);

        return state.connection
          ? { environment: "test", status: state.connectionStatus }
          : null;
      }
    },

    immoScout24DeObjectLink: {
      async findFirst({ where }) {
        calls.objectLink++;
        assertOwner(where);
        assert.equal(where.id, input.objectLinkId);
        assert.equal(where.connectionId, input.connectionId);
        assert.equal(where.status, "created");

        return state.objectLink
          ? {
              id: input.objectLinkId,
              listingId: "listing-1",
              externalObjectId: "325452819"
            }
          : null;
      }
    },

    listingImage: {
      async findFirst({ where }) {
        calls.image++;
        assert.equal(where.id, input.imageId);
        assert.equal(where.listingId, "listing-1");

        return state.listingImage ? { id: input.imageId } : null;
      }
    },

    immoScout24DeImageUpload: {
      async findFirst({ where }) {
        calls.upload++;
        assert.equal(where.objectLinkId, input.objectLinkId);
        assert.equal(where.imageId, input.imageId);
        assert.equal(where.externalAttachmentId, null);
        assert.deepEqual(
          [...where.status.in].sort(),
          ["http_accepted", "uncertain"]
        );

        return state.upload
          ? { externalId: "image_001", checksum }
          : null;
      }
    }
  };

  const workflow = load(workflowPath, {
    "@/lib/prisma": { prisma },

    "./immoscout24-de-sandbox-image-readiness.server": readiness,

    "./immoscout24-de-oauth-flow.server": {
      async getImmoScout24DeSandboxAccess(userId) {
        calls.oauth++;
        assert.equal(userId, input.userId);

        return state.oauth
          ? {
              userId,
              accessToken: "mock-token",
              accessTokenSecret: "mock-secret"
            }
          : null;
      }
    },

    "./immoscout24-de-image-lookup-transport.server": {
      async executeImmoScout24DeImageLookupV1(request) {
        calls.transport++;
        assert.equal(request.realEstateId, "325452819");
        assert.equal(request.externalId, "image_001");
        assert.equal(request.expectedChecksum, checksum);
        assert.equal(typeof request.httpClient, "function");

        return state.outcome;
      }
    }
  });

  const result =
    await workflow.lookupImmoScout24DeImageProtectedV1(input);

  assert.equal(result.status, expectedStatus, label);
  assert.equal(result.retryUploadAllowed, false);

  if (expectedStatus === "blocked") {
    assert.equal(result.reason, expectedReason, label);
  } else {
    assert.equal(result.authenticated, false);
    assert.equal(result.externalAttachmentId, "attachment_1");
    assert.equal(result.realEstateId, "325452819");
  }

  if (!state.connection) {
    assert.equal(calls.objectLink, 0);
    assert.equal(calls.transport, 0);
  }

  if (!state.objectLink || !state.listingImage || !state.upload || !state.oauth) {
    assert.equal(calls.transport, 0);
  }

  console.log("PASS:", label);
}

(async () => {
  await scenario("Konfigurierte Testverbindung", {}, "candidate");

  await scenario(
    "Bereits verifizierte Testverbindung",
    { connectionStatus: "verified" },
    "candidate"
  );

  await scenario(
    "Fremde oder fehlende Verbindung",
    { connection: false },
    "blocked",
    "CONNECTION_NOT_CONFIGURED"
  );

  await scenario(
    "Objektzuordnung fehlt",
    { objectLink: false },
    "blocked",
    "OBJECT_LINK_NOT_READY"
  );

  await scenario(
    "Bild gehoert nicht zum Objekt",
    { listingImage: false },
    "blocked",
    "IMAGE_NOT_IN_LISTING"
  );

  await scenario(
    "Upload nicht eligible",
    { upload: false },
    "blocked",
    "IMAGE_NOT_ELIGIBLE"
  );

  await scenario(
    "OAuth fehlt",
    { oauth: false },
    "blocked",
    "OAUTH_ACCESS_UNAVAILABLE"
  );

  await scenario(
    "HTTP/XML nicht bestaetigt",
    {
      outcome: {
        status: "unconfirmed",
        reason: "LOOKUP_HTTP_UNCONFIRMED",
        retryUploadAllowed: false
      }
    },
    "blocked",
    "LOOKUP_HTTP_UNCONFIRMED"
  );

  await scenario(
    "Falsche Bildkennung in Antwort",
    { outcome: { ...validCandidate, externalId: "other" } },
    "blocked",
    "EXTERNAL_ID_MISMATCH"
  );

  await scenario(
    "Falsche Pruefsumme in Antwort",
    { outcome: { ...validCandidate, checksum: "b".repeat(64) } },
    "blocked",
    "CHECKSUM_MISMATCH"
  );

  console.log("ALLE 10 WORKFLOW-INTEGRATIONSTESTS BESTANDEN");
  console.log("Keine realen HTTP-Anfragen oder Datenbankschreibvorgaenge.");
})().catch(error => {
  console.error("FAIL:", error.message);
  process.exitCode = 1;
});