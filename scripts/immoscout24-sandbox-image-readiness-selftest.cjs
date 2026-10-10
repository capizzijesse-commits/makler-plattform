const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  "lib/portal-integrations/immoscout24-de-sandbox-image-readiness.server.ts",
  "utf8"
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;

const exportsObject = {};

vm.runInNewContext(compiled, {
  exports: exportsObject,
  require(name) {
    if (name === "server-only") return {};
    throw Error("UNEXPECTED_IMPORT");
  }
});

const assess =
  exportsObject.assessImmoScout24DeSandboxImageReadinessV1;

assert.equal(typeof assess, "function");

const checksum = "a".repeat(64);

const valid = {
  environment: "sandbox",
  connectionEnvironment: "test",
  connectionStatus: "configured",
  lookupStatus: "candidate",
  expectedExternalId: "image_001",
  candidateExternalId: "image_001",
  expectedChecksum: checksum,
  candidateChecksum: checksum
};

let passed = 0;

function check(label, evidence, allowed) {
  const result = assess(evidence);
  assert.equal(result.allowed, allowed, label);
  if (allowed) {
    assert.equal(
      result.scope,
      "sandbox_image_lookup_candidate",
      label
    );
  }
  passed++;
  console.log("PASS " + passed + ": " + label);
}

check("Gueltiger Sandbox-Kandidat", valid, true);

for (const [label, patch] of [
  ["Produktionsumgebung", { environment: "production" }],
  ["Produktive Portalverbindung", { connectionEnvironment: "production" }],
  ["Verbindung nicht eingerichtet", { connectionStatus: "error" }],
  ["Lookup fehlgeschlagen", { lookupStatus: "unconfirmed" }],
  ["HTTP-Fehler ohne Kandidat", { lookupStatus: "blocked" }],
  ["Falsche Bildkennung", { candidateExternalId: "other" }],
  ["Fehlende Bildkennung", { candidateExternalId: null }],
  ["Ungueltige Bildkennung", { expectedExternalId: "bad id" }],
  ["Falsche Pruefsumme", { candidateChecksum: "b".repeat(64) }],
  ["Fehlende Pruefsumme", { candidateChecksum: null }],
  ["Ungueltige Pruefsumme", { expectedChecksum: "invalid" }]
]) {
  check(label, { ...valid, ...patch }, false);
}

check(
  "Bestehende verifizierte Testverbindung",
  { ...valid, connectionStatus: "verified" },
  true
);

console.log("ALLE " + passed + " OFFLINE-PRUEFUNGEN BESTANDEN");
console.log("Keine HTTP-Anfrage, kein Publishing, keine DB-Aenderung.");