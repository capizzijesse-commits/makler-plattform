const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");

const filename =
  "lib/portal-integrations/immoscout24-de-recovery.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

let scenario = "found";
let currentStatus = "uncertain";
let savedId = null;
let lookupCount = 0;
let updateCount = 0;

const prisma = {
  portalConnection: {
    async findFirst({ where }) {
      if (
        scenario === "invalid-connection" ||
        where.userId !== "user-1" ||
        where.environment !== "test" ||
        where.portal !== "immoscout24_de"
      ) {
        return null;
      }

      return { id: where.id };
    },
  },

  immoScout24DeObjectLink: {
    async findFirst({ where }) {
      if (
        where.userId !== "user-1" ||
        where.connectionId !== "connection-1" ||
        currentStatus !== "uncertain"
      ) {
        return null;
      }

      return {
        id: "link-1",
        externalId: "TEST_001",
      };
    },

    async updateMany({ where, data }) {
      updateCount++;

      if (
        scenario === "conflict" ||
        where.status !== currentStatus ||
        where.externalId !== "TEST_001"
      ) {
        return { count: 0 };
      }

      currentStatus = data.status;
      savedId = data.externalObjectId;

      return { count: 1 };
    },
  },
};

const dependencies = {
  "@/lib/prisma": { prisma },

  "./immoscout24-de-reconciliation-transport.server": {
    async lookupImmoScout24DeSandboxV1(input) {
      lookupCount++;

      assert.equal(input.externalId, "TEST_001");

      if (scenario === "not-found") {
        return {
          status: "not_found",
          externalId: "TEST_001",
          retryCreateAllowed: false,
        };
      }

      return {
        status: "found",
        externalId: "TEST_001",
        externalObjectId: "123456",
      };
    },
  },
};

const output = {};

vm.runInNewContext(compiled, {
  exports: output,

  require(name) {
    if (name === "server-only") return {};

    if (Object.hasOwn(dependencies, name)) {
      return dependencies[name];
    }

    throw new Error("Unexpected import: " + name);
  },

  Error,
  Object,
  Date,
}, {
  filename,
  timeout: 3000,
});

const input = {
  linkId: "link-1",
  userId: "user-1",
  connectionId: "connection-1",
  accessToken: "fake-token",
  accessTokenSecret: "fake-secret",
};

function reset(next) {
  scenario = next;
  currentStatus = "uncertain";
  savedId = null;
  lookupCount = 0;
  updateCount = 0;
}

async function main() {
  reset("found");

  const found =
    await output.reconcileImmoScout24DeObjectV1(input);

  assert.equal(found.status, "created");
  assert.equal(found.externalObjectId, "123456");
  assert.equal(currentStatus, "created");
  assert.equal(savedId, "123456");
  assert.equal(lookupCount, 1);

  console.log("PASS: Objekt-ID wiederhergestellt");

  reset("not-found");

  const absent =
    await output.reconcileImmoScout24DeObjectV1(input);

  assert.equal(absent.status, "uncertain");
  assert.equal(absent.retryCreateAllowed, false);
  assert.equal(currentStatus, "uncertain");
  assert.equal(updateCount, 0);

  console.log("PASS: 404 bleibt gesperrt");

  reset("invalid-connection");

  await assert.rejects(
    () => output.reconcileImmoScout24DeObjectV1(input),
    error =>
      error.code ===
      "IMMOSCOUT24_DE_RECOVERY_CONNECTION_INVALID"
  );

  assert.equal(lookupCount, 0);

  console.log("PASS: Ungültige Verbindung blockiert");

  reset("conflict");

  await assert.rejects(
    () => output.reconcileImmoScout24DeObjectV1(input),
    error =>
      error.code ===
      "IMMOSCOUT24_DE_RECOVERY_CONFLICT"
  );

  assert.equal(currentStatus, "uncertain");
  assert.equal(savedId, null);

  console.log("PASS: Parallele Änderung blockiert");

  console.log(
    "\nALLE 4 RECOVERY-SELBSTTESTS ERFOLGREICH"
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
