const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file =
  "lib/portal-integrations/immoscout24-de-image-lookup-transport.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(file, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const externalId = "iai-test-image";
const checksum = "a".repeat(64);
const realEstateId = "325452819";
const url =
  "https://rest.sandbox-immobilienscout24.de/" +
  "restapi/api/offer/v1.0/user/me/realestate/" +
  realEstateId + "/attachment/?externalId=" + externalId;

let parserCalls = 0;
let requestCalls = 0;

const output = {};

vm.runInNewContext(
  compiled,
  {
    exports: output,
    AbortSignal,
    TextDecoder,
    Uint8Array,

    require(name) {
      if (name === "server-only") return {};

      if (name.endsWith("image-lookup-request.server")) {
        return {
          prepareImmoScout24DeImageLookupRequestV1(input) {
            requestCalls++;
            assert.equal(input.realEstateId, realEstateId);
            assert.equal(input.externalId, externalId);
            assert.equal(input.accessToken, "test-token");
            assert.equal(input.accessTokenSecret, "test-secret");

            return {
              url,
              authorization: "OAuth test-signature",
              accept: "application/xml",
            };
          },
        };
      }

      if (name.endsWith("image-lookup-parser.server")) {
        return {
          parseImmoScout24DeImageLookupV1(input) {
            parserCalls++;
            assert.equal(input.httpStatus, 200);
            assert.equal(input.expectedExternalId, externalId);
            assert.equal(input.expectedChecksum, checksum);
            assert.equal(input.expectedRealEstateId, realEstateId);

            if (input.raw === "<invalid/>") {
              return {
                status: "unconfirmed",
                reason: "XML_INVALID",
                retryUploadAllowed: false,
              };
            }

            assert.equal(input.raw, "<attachment/>");

            return {
              status: "candidate",
              attachmentId: "665089044",
              externalId,
              checksum,
              authenticated: false,
              retryUploadAllowed: false,
            };
          },
        };
      }

      throw new Error("UNEXPECTED_IMPORT: " + name);
    },
  },
  { filename: file, timeout: 3000 }
);

const execute =
  output.executeImmoScout24DeImageLookupV1;

assert.equal(typeof execute, "function");

async function check(
  number,
  label,
  options,
  expectedStatus,
  expectedReason,
  expectedHttpCalls,
  expectedParserCalls
) {
  let httpCalls = 0;
  parserCalls = 0;
  requestCalls = 0;

  const httpClient = async (requestUrl, init) => {
    httpCalls++;

    assert.equal(requestUrl, url);
    assert.equal(init.method, "GET");
    assert.equal(init.headers.Authorization, "OAuth test-signature");
    assert.equal(init.headers.Accept, "application/xml");
    assert.equal(init.redirect, "manual");
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "omit");

    if (options.networkFailure) {
      throw new Error("SIMULATED_NETWORK_ERROR");
    }

    return new Response(
      options.body === undefined
        ? "<attachment/>"
        : options.body,
      {
        status: options.status ?? 200,
        headers: {
          "content-type":
            options.contentType ?? "application/xml",
          ...(options.contentLength
            ? { "content-length": options.contentLength }
            : {}),
        },
      }
    );
  };

  const result = await execute({
    realEstateId,
    externalId,
    expectedChecksum:
      options.invalidChecksum ? "invalid" : checksum,
    accessToken: "test-token",
    accessTokenSecret: "test-secret",
    httpClient,
  });

  assert.equal(result.status, expectedStatus, label);
  assert.equal(result.retryUploadAllowed, false, label);
  assert.equal(httpCalls, expectedHttpCalls, label);
  assert.equal(parserCalls, expectedParserCalls, label);

  if (expectedReason) {
    assert.equal(result.reason, expectedReason, label);
  }

  if (expectedStatus === "candidate") {
    assert.equal(result.authenticated, false);
    assert.equal(result.attachmentId, "665089044");
  }

  console.log("PASS " + number + ": " + label);
}

async function main() {
  await check(
    1, "OAuth-GET erfolgreich",
    {}, "candidate", null, 1, 1
  );

  await check(
    2, "HTTP 404 ohne Wiederholung",
    { status: 404 },
    "unconfirmed", "LOOKUP_HTTP_UNCONFIRMED", 1, 0
  );

  await check(
    3, "HTTP-Redirect blockiert",
    { status: 302 },
    "unconfirmed", "LOOKUP_HTTP_UNCONFIRMED", 1, 0
  );

  await check(
    4, "HTML-Antwort blockiert",
    { contentType: "text/html" },
    "unconfirmed", "LOOKUP_CONTENT_TYPE_INVALID", 1, 0
  );

  await check(
    5, "Uebergrosse Antwort blockiert",
    { contentLength: "70000" },
    "unconfirmed", "LOOKUP_BODY_TOO_LARGE", 1, 0
  );

  await check(
    6, "Leere Antwort blockiert",
    { body: "" },
    "unconfirmed", "LOOKUP_BODY_MISSING", 1, 0
  );

  await check(
    7, "Netzwerkfehler ohne Retry",
    { networkFailure: true },
    "unconfirmed", "LOOKUP_NETWORK_UNCONFIRMED", 1, 0
  );

  await check(
    8, "Parser-Ablehnung respektiert",
    { body: "<invalid/>" },
    "unconfirmed", "XML_INVALID", 1, 1
  );

  await check(
    9, "Ungueltige Pruefsumme blockiert",
    { invalidChecksum: true },
    "unconfirmed", "LOOKUP_CHECKSUM_INVALID", 0, 0
  );

  console.log("\nALLE 9 GET-TRANSPORT-TESTS BESTANDEN");
  console.log("Keine echten HTTP- oder Datenbankzugriffe.");
}

main().catch(error => {
  console.error("STOP:", error.stack || error.message);
  process.exitCode = 1;
});
