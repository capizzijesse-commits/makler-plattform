const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file =
  "lib/portal-integrations/immoscout24-de-stale-create.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(file, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

let allowed = true;
let status = "creating";
let updatedAt = new Date(Date.now() - 40 * 60 * 1000);
let writes = 0;

const prisma = {
  portalConnection: {
    async findFirst() {
      return allowed ? { id: "connection-1" } : null;
    },
  },
  immoScout24DeObjectLink: {
    async updateMany({ where, data }) {
      if (
        where.id !== "link-1" ||
        where.userId !== "user-1" ||
        where.connectionId !== "connection-1" ||
        status !== where.status ||
        updatedAt > where.updatedAt.lte
      ) {
        return { count: 0 };
      }

      status = data.status;
      writes++;
      return { count: 1 };
    },
  },
};

const output = {};

vm.runInNewContext(compiled, {
  exports: output,
  require(name) {
    if (name === "server-only") return {};
    if (name === "@/lib/prisma") return { prisma };
    throw new Error("Unexpected import: " + name);
  },
  Error,
  Date,
  Object,
}, { filename: file, timeout: 3000 });

const input = {
  linkId: "link-1",
  userId: "user-1",
  connectionId: "connection-1",
};

async function main() {
  const first =
    await output.quarantineStaleImmoScout24DeCreateV1(input);

  assert.equal(first.quarantined, true);
  assert.equal(first.retryCreateAllowed, false);
  assert.equal(status, "uncertain");
  console.log("PASS: Alter Vorgang wird quarantiniert");

  const second =
    await output.quarantineStaleImmoScout24DeCreateV1(input);

  assert.equal(second.quarantined, false);
  assert.equal(writes, 1);
  console.log("PASS: Wiederholter Aufruf ändert nichts");

  status = "creating";
  updatedAt = new Date();

  const fresh =
    await output.quarantineStaleImmoScout24DeCreateV1(input);

  assert.equal(fresh.quarantined, false);
  assert.equal(status, "creating");
  console.log("PASS: Neuer Vorgang bleibt unberührt");

  allowed = false;
  updatedAt = new Date(Date.now() - 40 * 60 * 1000);

  await assert.rejects(
    () => output.quarantineStaleImmoScout24DeCreateV1(input),
    /IMMOSCOUT24_DE_STALE_CONNECTION_INVALID/
  );

  assert.equal(status, "creating");
  console.log("PASS: Ungültige Verbindung blockiert");

  console.log("\nALLE 4 STALE-CREATE-TESTS ERFOLGREICH");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
