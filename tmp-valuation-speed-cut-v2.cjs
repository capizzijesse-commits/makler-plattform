const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const before = s;

const requestMatches =
  (s.match(/await\s+requestSwissMarketValuation\s*\(/g) || []).length;

const alreadyPatched =
  s.includes("const runSynchronousValuation = false;");

if (alreadyPatched) {
  throw new Error("Patch already present.");
}

if (requestMatches !== 1) {
  throw new Error(
    "Safety check failed: requestSwissMarketValuation awaits=" +
      requestMatches
  );
}

/*
 * Find the IF immediately before the unique synchronous
 * requestSwissMarketValuation call.
 */
const requestIndex =
  s.search(/await\s+requestSwissMarketValuation\s*\(/);

const beforeRequest =
  s.slice(0, requestIndex);

const ifIndex =
  beforeRequest.lastIndexOf("    if (");

if (ifIndex < 0) {
  throw new Error(
    "Could not find valuation IF before provider call."
  );
}

const ifHeaderEnd =
  s.indexOf("    ) {", ifIndex);

if (
  ifHeaderEnd < 0 ||
  ifHeaderEnd > requestIndex
) {
  throw new Error(
    "Could not safely identify valuation IF header."
  );
}

const originalHeader =
  s.slice(
    ifIndex,
    ifHeaderEnd + "    ) {".length
  );

if (
  !originalHeader.includes("valuationReady") ||
  !originalHeader.includes("valuationPropertyType") ||
  !originalHeader.includes("yearBuilt")
) {
  throw new Error(
    "Safety check failed: wrong IF block selected."
  );
}

const patchedHeader =
  originalHeader.replace(
    "    if (",
    `    /*
     * FAST READY V4
     * External market valuation is outside
     * the synchronous READY critical path.
     */
    const runSynchronousValuation = false;

    if (
      runSynchronousValuation &&`
  );

s =
  s.slice(0, ifIndex) +
  patchedHeader +
  s.slice(ifHeaderEnd + "    ) {".length);

if (
  s === before ||
  !s.includes(
    "const runSynchronousValuation = false;"
  ) ||
  !s.includes("runSynchronousValuation &&") ||
  (s.match(
    /await\s+requestSwissMarketValuation\s*\(/g
  ) || []).length !== 1
) {
  throw new Error(
    "Final safety check failed. File not written."
  );
}

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: valuation provider removed from synchronous READY path."
);
