const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const before = s;

const marker =
`    if (
      valuationReady &&
      valuationPropertyType &&
      valuationLatitude !== null &&
      valuationLongitude !== null &&
      livingArea !== null &&
      yearBuilt !== null
    ) {`;

const matches = s.split(marker).length - 1;

if (matches !== 1) {
  throw new Error(
    "Safety check failed: valuation block marker matches=" + matches
  );
}

const replacement =
`    /*
     * FAST READY V4
     *
     * External market valuation must not block
     * Expose -> images -> listing -> publication preparation.
     * Valuation remains available outside this critical path.
     */
    const runSynchronousValuation = false;

    if (
      runSynchronousValuation &&
      valuationReady &&
      valuationPropertyType &&
      valuationLatitude !== null &&
      valuationLongitude !== null &&
      livingArea !== null &&
      yearBuilt !== null
    ) {`;

s = s.replace(marker, replacement);

if (
  s === before ||
  !s.includes("const runSynchronousValuation = false;") ||
  !s.includes("runSynchronousValuation &&")
) {
  throw new Error(
    "Final safety check failed. File not written."
  );
}

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: synchronous external valuation removed from READY critical path."
);
