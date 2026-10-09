const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file =
  "lib/portal-integrations/immoscout24-de-image-confirmation.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(file, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const moduleExports = {};

vm.runInNewContext(
  compiled,
  {
    exports: moduleExports,
    process: { env: { NODE_ENV: "test" } },
    Date,
    require(name) {
      if (name === "server-only") return {};

      if (name.endsWith("image-connection-guard.server")) {
        return {
          async checkImmoScout24DeImageConnectionV1(input) {
            return input.connectionId === "connection-1"
              ? { allowed: true }
              : {
                  allowed: false,
                  reason: "CONNECTION_NOT_VERIFIED",
                };
          },
        };
      }

      if (name.endsWith("image-reconciliation.server")) {
        return {
          reconcileImmoScout24DeImageV1(input) {
            const matches = input.observations.filter(
              x =>
                x.externalId === input.expectedExternalId &&
                x.checksum === input.expectedChecksum
            );

            return matches.length === 1
              ? {
                  status: "verified",
                  externalAttachmentId: matches[0].attachmentId,
                  retryUploadAllowed: false,
                }
              : {
                  status: "unconfirmed",
                  reason: "IMAGE_NOT_CONFIRMED",
                  retryUploadAllowed: false,
                };
          },
        };
      }

      throw new Error("Unexpected import: " + name);
    },
  },
  { filename: file, timeout: 3000 }
);

const confirm =
  moduleExports.confirmImmoScout24DeImageTestV1;

const checksum = "a".repeat(64);

function makeDb(options = {}) {
  const state = {
    status: "http_accepted",
    attachmentId: null,
    writes: 0,
    reads: 0,
  };

  const prisma = {
    immoScout24DeObjectLink: {
      async findFirst() {
        state.reads++;
        return options.invalidLink ? null : { id: "link-1" };
      },
    },
    immoScout24DeImageUpload: {
      async findFirst() {
        state.reads++;
        if (
          state.status !== "http_accepted" &&
          state.status !== "uncertain"
        ) return null;

        return {
          id: "upload-1",
          externalId: "iai-image-1",
          checksum,
        };
      },

      async updateMany({ where, data }) {
        if (
          options.conflict ||
          state.status === "verified" ||
          !where.status.in.includes(state.status)
        ) return { count: 0 };

        state.status = data.status;
        state.attachmentId = data.externalAttachmentId;
        state.writes++;
        return { count: 1 };
      },
    },
  };

  return { prisma, state };
}

function input(db, changes = {}) {
  return {
    prisma: db.prisma,
    userId: "user-1",
    connectionId: "connection-1",
    objectLinkId: "link-1",
    imageId: "image-1",
    observations: [{
      externalId: "iai-image-1",
      checksum,
      attachmentId: "123456",
    }],
    allowNormalizedTestObservation: true,
    ...changes,
  };
}

async function main() {
  const db = makeDb();

  const result = await confirm(input(db));
  assert.equal(result.status, "verified");
  assert.equal(result.externalAttachmentId, "123456");
  assert.equal(db.state.writes, 1);
  console.log("PASS 1: Bildbestaetigung gespeichert");

  const repeat = await confirm(input(db));
  assert.equal(repeat.status, "blocked");
  assert.equal(db.state.writes, 1);
  console.log("PASS 2: Wiederholte Bestaetigung blockiert");

  const invalid = makeDb();
  const rejected = await confirm(input(invalid, {
    observations: [],
  }));
  assert.equal(rejected.status, "blocked");
  assert.equal(invalid.state.writes, 0);
  console.log("PASS 3: Ohne Bildnachweis kein Schreibzugriff");

  const wrongConnection = makeDb();
  const denied = await confirm(input(wrongConnection, {
    connectionId: "other-connection",
  }));
  assert.equal(denied.status, "blocked");
  assert.equal(wrongConnection.state.reads, 0);
  console.log("PASS 4: Falsche Verbindung blockiert");

  const conflictDb = makeDb({ conflict: true });
  const conflict = await confirm(input(conflictDb));
  assert.equal(conflict.status, "blocked");
  assert.equal(
    conflict.reason,
    "IMAGE_CONFIRMATION_CONFLICT"
  );
  console.log("PASS 5: Compare-and-swap Konflikt erkannt");

  const invalidLink = makeDb({ invalidLink: true });
  const linkResult = await confirm(input(invalidLink));
  assert.equal(linkResult.status, "blocked");
  assert.equal(linkResult.reason, "OBJECT_LINK_NOT_READY");
  console.log("PASS 6: Falsche Objektzuordnung blockiert");

  const forbidden = makeDb();
  const noConsent = await confirm(input(forbidden, {
    allowNormalizedTestObservation: false,
  }));
  assert.equal(noConsent.status, "blocked");
  assert.equal(forbidden.state.writes, 0);
  console.log("PASS 7: Testfreigabe erforderlich");

  console.log(
    "\nALLE 7 BILD-BESTAETIGUNGSTESTS ERFOLGREICH"
  );
}

main().catch(error => {
  console.error("STOP: Test fehlgeschlagen:", error.message);
  process.exitCode = 1;
});