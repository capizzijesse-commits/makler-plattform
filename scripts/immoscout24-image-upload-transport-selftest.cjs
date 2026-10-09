const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename =
  "lib/portal-integrations/immoscout24-de-image-upload-transport.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(filename, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

let preparationCalls = 0;

const testExports = {};

vm.runInNewContext(compiled, {
  exports: testExports,
  require(name) {
    if (name === "server-only") return {};

    if (
      name === "./immoscout24-de-image-upload-request.server"
    ) {
      return {
        prepareImmoScout24DeImageUploadRequestV1(input) {
          preparationCalls++;

          assert.equal(input.realEstateId, "123456");
          assert.equal(input.accessToken, "TEST_TOKEN");
          assert.equal(input.accessTokenSecret, "TEST_SECRET");

          return {
            method: "POST",
            url:
              "https://rest.sandbox-immobilienscout24.de" +
              "/restapi/api/offer/v1.0/user/me/" +
              "realestate/123456/attachment/",
            authorization: 'OAuth oauth_signature="MOCK"',
            accept: "application/xml",
          };
        },
      };
    }

    throw new Error("Unexpected import: " + name);
  },
  FormData,
  Error,
  Number,
}, { filename, timeout: 3000 });

const execute =
  testExports.executeImmoScout24DeImageUploadV1;

function makeForm() {
  const form = new FormData();

  form.append(
    "attachment",
    new Blob(
      [Uint8Array.from([255, 216, 255, 224])],
      { type: "image/jpeg" }
    ),
    "test.jpg"
  );

  form.append(
    "metadata",
    new Blob(
      ["<attachment>TEST</attachment>"],
      { type: "application/xml" }
    ),
    "body.xml"
  );

  return form;
}

function makeInput(httpClient, changes = {}) {
  return {
    realEstateId: "123456",
    accessToken: "TEST_TOKEN",
    accessTokenSecret: "TEST_SECRET",
    formData: makeForm(),
    allowSandboxWrite: true,
    httpClient,
    ...changes,
  };
}

async function main() {
  let callCount = 0;

  const accepted = await execute(
    makeInput(async (url, init) => {
      callCount++;

      assert.ok(
        url.startsWith(
          "https://rest.sandbox-immobilienscout24.de/"
        )
      );

      assert.equal(init.method, "POST");
      assert.equal(init.redirect, "manual");
      assert.equal(init.cache, "no-store");

      assert.equal(
        init.headers.Authorization,
        'OAuth oauth_signature="MOCK"'
      );

      assert.equal(
        init.headers.Accept,
        "application/xml"
      );

      assert.equal(
        init.body.getAll("attachment").length,
        1
      );

      assert.equal(
        init.body.getAll("metadata").length,
        1
      );

      assert.equal(
        init.headers["Content-Type"],
        undefined
      );

      return { status: 201 };
    })
  );

  assert.equal(accepted.status, "http_accepted");
  assert.equal(accepted.requiresVerification, true);
  assert.equal(callCount, 1);

  console.log("PASS 1: HTTP-Anfrage, OAuth und Multipart");

  const rejected = await execute(
    makeInput(async () => ({ status: 403 }))
  );

  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.httpStatus, 403);
  assert.equal(rejected.requiresVerification, false);

  console.log("PASS 2: Eindeutige Ablehnung erkannt");

  const serverError = await execute(
    makeInput(async () => ({ status: 503 }))
  );

  assert.equal(serverError.status, "uncertain");
  assert.equal(serverError.requiresVerification, true);

  console.log("PASS 3: Serverfehler bleibt ungeklaert");

  let networkCalls = 0;

  const networkError = await execute(
    makeInput(async () => {
      networkCalls++;
      throw new Error("SIMULATED_NETWORK_FAILURE");
    })
  );

  assert.equal(networkError.status, "uncertain");
  assert.equal(networkError.httpStatus, null);
  assert.equal(networkCalls, 1);

  console.log("PASS 4: Netzwerkfehler ohne Retry");

  const redirected = await execute(
    makeInput(async () => ({ status: 302 }))
  );

  assert.equal(redirected.status, "uncertain");

  console.log("PASS 5: Redirect nicht als Erfolg behandelt");

  const invalidResponse = await execute(
    makeInput(async () => ({ status: 999 }))
  );

  assert.equal(invalidResponse.status, "uncertain");

  console.log("PASS 6: Ungueltige HTTP-Antwort abgefangen");

  let blockedCalls = 0;
  const blockedClient = async () => {
    blockedCalls++;
    return { status: 201 };
  };

  await assert.rejects(
    () => execute(
      makeInput(blockedClient, {
        allowSandboxWrite: false,
      })
    ),
    error =>
      error.code ===
      "IMMOSCOUT24_DE_IMAGE_WRITE_NOT_ALLOWED"
  );

  assert.equal(blockedCalls, 0);

  console.log("PASS 7: Schreibsperre vor HTTP-Aufruf");

  const invalidForm = new FormData();
  invalidForm.append("attachment", "ONLY_IMAGE");

  await assert.rejects(
    () => execute(
      makeInput(blockedClient, {
        formData: invalidForm,
      })
    ),
    error =>
      error.code ===
      "IMMOSCOUT24_DE_IMAGE_MULTIPART_INVALID"
  );

  assert.equal(blockedCalls, 0);
  assert.equal(preparationCalls, 6);

  console.log("PASS 8: Ungueltiges Multipart blockiert");

  console.log(
    "\nALLE 8 HTTP-TRANSPORT-SELBSTTESTS ERFOLGREICH"
  );
}

main().catch(error => {
  console.error(
    "STOP: HTTP-Transport-Test fehlgeschlagen:",
    error.message
  );
  process.exitCode = 1;
});