"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

// Statische Fail-Closed-Regression: ersetzt keinen Sandbox-Lauf oder Typecheck.
const route = readFileSync(
  join(__dirname, "../app/api/portal-connections/de/immoscout24/sandbox/linked-create/route.ts"),
  "utf8"
);

test("Sandbox-Route ist nur auf Preview mit explizitem Feature-Gate aktiv", () => {
  assert.match(route, /process\.env\.VERCEL_ENV === "preview"/);
  assert.match(route, /IMMOSCOUT24_DE_LINKED_CREATE_ENABLED/);
  assert.match(route, /config\.environment !== "sandbox"/);
  assert.match(route, /config\.baseUrl !== SANDBOX_BASE_URL/);
});

test("Anforderung ist authentifiziert, Same-Origin und ausdruecklich bestaetigt", () => {
  assert.match(route, /sameOrigin\(request\)/);
  assert.match(route, /getAuthenticatedUser\(request\)/);
  assert.match(route, /EXPLICIT_SANDBOX_CONFIRMATION_REQUIRED/);
  assert.match(route, /useSandboxTestAddress !== true/);
  assert.match(route, /IMMOSCOUT24_DE_SANDBOX_TEST_LISTING_ID/);
  assert.match(route, /SANDBOX_TEST_LISTING_NOT_APPROVED/);
});

test("Objekte sind dem richtigen Nutzer und Testkonto zugeordnet", () => {
  assert.match(route, /userId: user\.id/);
  assert.match(route, /portal: "immoscout24_de"/);
  assert.match(route, /environment: "test"/);
  assert.match(route, /status: "verified"/);
  assert.match(route, /countryCode: "DE"/);
  assert.match(route, /isBrokerMarketingApproved/);
});

test("Create verwendet die reservierende Workflow-Implementierung statt Direkt-POST", () => {
  assert.match(route, /runImmoScout24DeCreateSandboxV1/);
  assert.match(route, /OBJECT_LINK_ALREADY_EXISTS/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.doesNotMatch(route, /createImmoScout24DeOAuthClient/);
  assert.doesNotMatch(route, /executePortalPublishJob/);
});

test("Route bestaetigt keinen Publish und sperrt blindes Retry", () => {
  assert.match(route, /published: false/);
  assert.match(route, /retrySafe: false/);
  assert.match(route, /CHECK_OBJECT_LINK_BEFORE_RETRY/);
  assert.match(route, /IMAGE_UPLOAD_AND_READBACK_REQUIRED/);
  assert.doesNotMatch(route, /productionEnabled: true/);
});
