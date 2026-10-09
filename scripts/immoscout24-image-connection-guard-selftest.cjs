const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file =
  "lib/portal-integrations/immoscout24-de-image-connection-guard.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(file, "utf8"),
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
      throw new Error("Unexpected import: " + name);
    },
  },
  { filename: file, timeout: 3000 }
);

const check =
  exportsObject.checkImmoScout24DeImageConnectionV1;

function makeInput(connection, counters) {
  return {
    userId: "user-1",
    connectionId: "connection-1",
    prisma: {
      portalConnection: {
        async findFirst({ where, select }) {
          counters.reads++;

          assert.equal(select.id, true);

          return (
            connection &&
            Object.entries(where).every(
              ([key, value]) => connection[key] === value
            )
          )
            ? { id: connection.id }
            : null;
        },
      },
    },
  };
}

async function main() {
  const valid = {
    id: "connection-1",
    userId: "user-1",
    portal: "immoscout24_de",
    environment: "test",
    status: "verified",
  };

  const counters = { reads: 0 };

  const accepted = await check(makeInput(valid, counters));

  assert.equal(accepted.allowed, true);
  console.log("PASS 1: Verifizierte Sandbox-Verbindung");

  const cases = [
    ["Falscher Benutzer", { userId: "another-user" }],
    ["Falsches Portal", { portal: "homegate_ch" }],
    ["Produktionsumgebung", { environment: "production" }],
    ["Nur konfiguriert", { status: "configured" }],
    ["Fehlerstatus", { status: "error" }],
  ];

  let number = 2;

  for (const [label, changes] of cases) {
    const result = await check(
      makeInput({ ...valid, ...changes }, counters)
    );

    assert.equal(result.allowed, false);
    assert.equal(result.reason, "CONNECTION_NOT_VERIFIED");

    console.log(`PASS ${number++}: ${label} blockiert`);
  }

  const missing = await check(makeInput(null, counters));

  assert.equal(missing.allowed, false);
  console.log(`PASS ${number++}: Fehlende Verbindung blockiert`);

  const before = counters.reads;
  const invalid = await check({
    ...makeInput(valid, counters),
    userId: " ",
  });

  assert.equal(invalid.allowed, false);
  assert.equal(invalid.reason, "INVALID_CONNECTION_CONTEXT");
  assert.equal(counters.reads, before);

  console.log(`PASS ${number++}: Ungueltiger Kontext ohne DB-Zugriff`);

  console.log(
    "\nALLE 8 PORTALCONNECTION-SELBSTTESTS ERFOLGREICH"
  );
}

main().catch(error => {
  console.error(
    "STOP: PortalConnection-Test fehlgeschlagen:",
    error.message
  );
  process.exitCode = 1;
});