const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file =
  "lib/portal-integrations/immoscout24-de-image-reconciliation.server.ts";

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

const reconcile =
  exportsObject.reconcileImmoScout24DeImageV1;

const checksum = "a".repeat(64);

const expected = {
  expectedExternalId: "iai-image-1",
  expectedChecksum: checksum,
};

const image = {
  externalId: "iai-image-1",
  checksum,
  attachmentId: "123456",
};

function checkBlocked(label, observations, reason) {
  const result = reconcile({
    ...expected,
    observations,
  });

  assert.equal(result.status, "unconfirmed");
  assert.equal(result.reason, reason);
  assert.equal(result.retryUploadAllowed, false);

  console.log("PASS: " + label);
}

const valid = reconcile({
  ...expected,
  observations: [image],
});

assert.equal(valid.status, "verified");
assert.equal(valid.externalAttachmentId, "123456");
assert.equal(valid.retryUploadAllowed, false);
console.log("PASS 1: Eindeutig bestaetigtes Bild");

checkBlocked(
  "2: Bild fehlt",
  [],
  "IMAGE_NOT_OBSERVED"
);

checkBlocked(
  "3: Falsche Pruefsumme",
  [{ ...image, checksum: "b".repeat(64) }],
  "IMAGE_CHECKSUM_MISMATCH"
);

checkBlocked(
  "4: Doppelte externe Bildkennung",
  [image, { ...image, attachmentId: "999999" }],
  "DUPLICATE_EXTERNAL_IMAGE_ID"
);

checkBlocked(
  "5: Attachment-ID mehrfach vergeben",
  [
    image,
    { ...image, externalId: "iai-image-2" },
  ],
  "ATTACHMENT_ID_NOT_UNIQUE"
);

checkBlocked(
  "6: Ungueltige Attachment-ID",
  [{ ...image, attachmentId: "../invalid" }],
  "INVALID_PROVIDER_OBSERVATIONS"
);

checkBlocked(
  "7: Unvollstaendige Bilddaten",
  [{ externalId: image.externalId }],
  "INVALID_PROVIDER_OBSERVATIONS"
);

const invalidExpected = reconcile({
  ...expected,
  expectedChecksum: "wrong",
  observations: [image],
});

assert.equal(invalidExpected.status, "unconfirmed");
assert.equal(
  invalidExpected.reason,
  "INVALID_EXPECTED_IDENTITY"
);
console.log("PASS 8: Ungueltige erwartete Identitaet");

checkBlocked(
  "9: Unbekannte Providerdaten",
  null,
  "INVALID_PROVIDER_OBSERVATIONS"
);

console.log(
  "\nALLE 9 BILD-RECONCILIATION-TESTS ERFOLGREICH"
);