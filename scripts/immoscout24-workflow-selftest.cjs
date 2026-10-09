const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");

const filename =
  "lib/portal-integrations/immoscout24-de-create-workflow.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const calls = [];
let scenario = "success";
let status = "none";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

const link = { id: "link-1" };

const dependencies = {
  "./immoscout24-de-create-realestate.server": {
    prepareImmoScout24DeCreateV1(input) {
      calls.push("prepare");
      assert.equal(input.environment, "sandbox");
      return {
        method: "POST",
        path: "/restapi/api/offer/v1.0/user/me/realestate/",
        environment: "sandbox",
        externalId: input.externalId,
        body: input.xml,
      };
    },
  },

  "./immoscout24-de-create-transport.server": {
    async executeImmoScout24DeCreateSandboxV1(input) {
      calls.push("post");
      assert.equal(input.allowSandboxWrite, true);

      if (scenario === "network-error") {
        fail("NETWORK_TIMEOUT");
      }

      return { externalObjectId: "123456" };
    },
  },

  "./immoscout24-de-object-link.server": {
    async reserveImmoScout24DeObjectV1() {
      calls.push("reserve");

      if (scenario === "duplicate") {
        fail("IMMOSCOUT24_DE_OBJECT_ALREADY_RESERVED");
      }

      status = "reserved";
      return link;
    },

    async beginImmoScout24DeCreateV1() {
      calls.push("begin");

      if (scenario === "blocked-start") {
        fail("IMMOSCOUT24_DE_CREATE_NOT_RESERVED");
      }

      assert.equal(status, "reserved");
      status = "creating";
    },

    async completeImmoScout24DeCreateV1(input) {
      calls.push("complete");

      if (scenario === "database-error") {
        fail("DATABASE_WRITE_FAILED");
      }

      assert.equal(status, "creating");
      assert.equal(input.externalObjectId, "123456");

      status = "created";

      return {
        status: "created",
        externalObjectId: input.externalObjectId,
      };
    },

    async markImmoScout24DeCreateUncertainV1() {
      calls.push("uncertain");
      assert.equal(status, "creating");
      status = "uncertain";
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

    throw new Error(`Unexpected import: ${name}`);
  },
  Error,
  Object,
}, { filename, timeout: 3000 });

const input = {
  userId: "user-1",
  listingId: "listing-1",
  connectionId: "connection-1",
  externalId: "TEST_001",
  xml: "<test/>",
  accessToken: "fake-test-token",
  accessTokenSecret: "fake-test-secret",
  allowSandboxWrite: true,
};

function reset(next) {
  scenario = next;
  status = "none";
  calls.length = 0;
}

async function expectError(code) {
  await assert.rejects(
    () => output.runImmoScout24DeCreateSandboxV1(input),
    error => error.code === code
  );
}

async function main() {
  reset("success");

  const result =
    await output.runImmoScout24DeCreateSandboxV1(input);

  assert.equal(result.externalObjectId, "123456");
  assert.equal(result.published, false);
  assert.equal(status, "created");
  assert.deepEqual(calls, [
    "prepare", "reserve", "begin", "post", "complete",
  ]);
  console.log("PASS: Erfolgreicher Create-Workflow");

  reset("duplicate");

  await expectError("IMMOSCOUT24_DE_OBJECT_ALREADY_RESERVED");

  assert.equal(calls.includes("post"), false);
  console.log("PASS: Doppelreservierung ohne POST");

  reset("blocked-start");

  await expectError("IMMOSCOUT24_DE_CREATE_NOT_RESERVED");

  assert.equal(calls.includes("post"), false);
  console.log("PASS: Blockierter Start ohne POST");

  reset("network-error");

  await expectError("NETWORK_TIMEOUT");

  assert.equal(status, "uncertain");
  assert.equal(calls.filter(x => x === "post").length, 1);
  console.log("PASS: Verbindungsabbruch führt zu uncertain");

  reset("database-error");

  await expectError("DATABASE_WRITE_FAILED");

  assert.equal(status, "uncertain");
  assert.equal(calls.filter(x => x === "post").length, 1);
  console.log("PASS: Speicherfehler führt zu uncertain");

  console.log("\nALLE 5 WORKFLOW-SELBSTTESTS ERFOLGREICH");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
