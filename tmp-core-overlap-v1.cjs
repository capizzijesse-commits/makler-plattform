const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const nl = s.includes("\r\n") ? "\r\n" : "\n";

/*
 * Stable semantic anchors.
 */
const pdfMarker = "* PDF IMAGE PREP V2";
const coreStartMarker = "const aiStartedAt = Date.now();";
const durationMarker = "const aiDurationMs =";

const pdfMarkerIndex = s.indexOf(pdfMarker);
const coreStartIndex = s.indexOf(coreStartMarker);
const durationIndex = s.indexOf(durationMarker, coreStartIndex);

if (
  pdfMarkerIndex === -1 ||
  coreStartIndex === -1 ||
  durationIndex === -1
) {
  throw new Error(
    "Safety check failed: required anchors not found. No changes made."
  );
}

/*
 * Find beginning of the PDF comment.
 */
const pdfCommentStart = s.lastIndexOf("/*", pdfMarkerIndex);

if (pdfCommentStart === -1) {
  throw new Error(
    "Safety check failed: PDF comment start not found."
  );
}

/*
 * Extract the existing CORE start + fetch block.
 * We stop immediately before:
 *
 * const aiDurationMs =
 */
let coreBlock = s.slice(
  coreStartIndex,
  durationIndex
);

if (
  !coreBlock.includes("const aiResponse =") ||
  !coreBlock.includes("await fetch(") ||
  !coreBlock.includes("inserat_ai_autopilot_core") ||
  !coreBlock.includes("max_output_tokens:")
) {
  throw new Error(
    "Safety check failed: CORE block does not match expected structure."
  );
}

/*
 * Turn:
 *
 * const aiResponse = await fetch(...)
 *
 * into:
 *
 * const aiResponsePromise = fetch(...)
 *
 * CORE therefore starts immediately but is not awaited yet.
 */
coreBlock = coreBlock.replace(
  /const aiResponse\s*=\s*await fetch\(/,
  "const aiResponsePromise = fetch("
);

if (!coreBlock.includes("const aiResponsePromise = fetch(")) {
  throw new Error(
    "Safety check failed: CORE fetch transformation failed."
  );
}

/*
 * Insert CORE start before PDF processing.
 */
s =
  s.slice(0, pdfCommentStart) +
  coreBlock +
  nl +
  s.slice(pdfCommentStart);

/*
 * The old CORE block moved forward, so find its SECOND occurrence.
 */
const oldCoreStart =
  s.indexOf(
    coreStartMarker,
    pdfCommentStart + coreBlock.length
  );

const oldDuration =
  s.indexOf(
    durationMarker,
    oldCoreStart
  );

if (
  oldCoreStart === -1 ||
  oldDuration === -1
) {
  throw new Error(
    "Safety check failed while locating old CORE block."
  );
}

/*
 * At the old location we now only wait for the already-running CORE.
 *
 * Keep the existing duration calculation directly afterwards.
 */
const awaitReplacement =
  "const aiResponse =" +
  nl +
  "  await aiResponsePromise;" +
  nl +
  nl;

s =
  s.slice(0, oldCoreStart) +
  awaitReplacement +
  s.slice(oldDuration);

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: CORE now starts before PDF prep and overlaps PDF processing."
);
