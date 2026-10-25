const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const analyzer = fs.readFileSync(
  "lib/image-batch-analyzer.server.ts",
  "utf8"
);

const autopilot = fs.readFileSync(
  "app/automation/AutomationFlowV2.tsx",
  "utf8"
);

test("Bildanalyse fordert Raumkonfidenz an", () => {
  assert.match(
    analyzer,
    /roomConfidence/,
    "Der Bildanalysator muss roomConfidence erfassen."
  );
});

test("Autopilot besitzt strukturierte Raumkonfidenz", () => {
  assert.match(
    autopilot,
    /roomConfidence/,
    "Der Autopilot muss die Raumkonfidenz uebernehmen."
  );
});

test("Dachkonfidenz bleibt erhalten", () => {
  assert.match(analyzer, /roofConfidence/);
  assert.match(autopilot, /roofConfidence/);
});