const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const filename =
  "lib/portal-integrations/immoscout24-de-image-upload-request.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

let environment = "sandbox";
let invalidSignature = false;
let signingCalls = 0;

const baseUrl =
  "https://rest.sandbox-immobilienscout24.de";

const oauthMock = {
  getImmoScout24DeOAuthConfig() {
    return {
      environment,
      baseUrl:
        environment === "sandbox"
          ? baseUrl
          : "https://rest.immobilienscout24.de",
    };
  },

  createImmoScout24DeOAuthClient() {
    return {
      authHeader(url, token, secret, method) {
        signingCalls++;

        assert.equal(method, "POST");
        assert.equal(token, "TEST_TOKEN");
        assert.equal(secret, "TEST_SECRET");
        assert.ok(url.startsWith(baseUrl + "/"));

        return invalidSignature
          ? "INVALID_SIGNATURE"
          : 'OAuth oauth_token="TEST_TOKEN",oauth_signature="MOCK"';
      },
    };
  },
};

const testExports = {};

vm.runInNewContext(compiled, {
  exports: testExports,

  require(name) {
    if (name === "server-only") return {};
    if (name === "./immoscout24-de-oauth.server") {
      return oauthMock;
    }
    throw new Error("Unexpected import: " + name);
  },

  Error,
  Object,
  String,
}, { filename, timeout: 3000 });

const prepare =
  testExports.prepareImmoScout24DeImageUploadRequestV1;

function validInput(changes = {}) {
  return {
    realEstateId: "123456",
    accessToken: "TEST_TOKEN",
    accessTokenSecret: "TEST_SECRET",
    ...changes,
  };
}

function expectCode(action, code) {
  assert.throws(
    action,
    error => error.code === code
  );
}

function main() {
  const request = prepare(validInput());

  assert.equal(request.method, "POST");
  assert.equal(
    request.url,
    baseUrl +
      "/restapi/api/offer/v1.0/user/me/realestate/" +
      "123456/attachment/"
  );
  assert.equal(request.accept, "application/xml");

  console.log("PASS 1: Sandbox-URL und Upload-Pfad");

  assert.ok(request.authorization.startsWith("OAuth "));
  assert.equal(signingCalls, 1);

  console.log("PASS 2: OAuth-Header vorbereitet");

  expectCode(
    () => prepare(validInput({
      realEstateId: "../123456"
    })),
    "IMMOSCOUT24_DE_IMAGE_OBJECT_ID_INVALID"
  );

  console.log("PASS 3: Ungueltige Objekt-ID blockiert");

  expectCode(
    () => prepare(validInput({
      accessTokenSecret: ""
    })),
    "IMMOSCOUT24_DE_IMAGE_OAUTH_REQUIRED"
  );

  console.log("PASS 4: Fehlende OAuth-Daten blockiert");

  environment = "production";

  expectCode(
    () => prepare(validInput()),
    "IMMOSCOUT24_DE_IMAGE_SANDBOX_ONLY"
  );

  environment = "sandbox";
  invalidSignature = true;

  expectCode(
    () => prepare(validInput()),
    "IMMOSCOUT24_DE_IMAGE_SIGNATURE_INVALID"
  );

  console.log(
    "PASS 5: Produktion und ungueltige Signatur blockiert"
  );

  console.log(
    "\nALLE 5 OAUTH-UPLOAD-SELBSTTESTS ERFOLGREICH"
  );
}

try {
  main();
} catch (error) {
  console.error(
    "STOP: OAuth-Upload-Selbsttest fehlgeschlagen:",
    error.message
  );
  process.exitCode = 1;
}