const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const oldStart =
  "const aiResponsePromise = fetch(";

const newStart =
  "let aiFinishedAt = 0;\n" +
  "const aiResponsePromise = fetch(";

if (!s.includes(oldStart)) {
  throw new Error("CORE promise marker not found.");
}

s = s.replace(oldStart, newStart);

const fetchEndMarker =
  "const aiResponse =\n" +
  "  await aiResponsePromise;";

if (!s.includes(fetchEndMarker)) {
  throw new Error("CORE await marker not found.");
}

/*
 * Record the real completion time of the CORE request,
 * independently of when we later await it.
 */
const promiseStart = s.indexOf(
  "const aiResponsePromise = fetch("
);

const pdfStart = s.indexOf(
  "* PDF IMAGE PREP V2",
  promiseStart
);

if (promiseStart === -1 || pdfStart === -1) {
  throw new Error("CORE/PDF boundary not found.");
}

const beforePdf = s.slice(0, pdfStart);
const lastFetchClose = beforePdf.lastIndexOf(");");

if (lastFetchClose === -1) {
  throw new Error("CORE fetch closing marker not found.");
}

s =
  s.slice(0, lastFetchClose) +
  ").then((response) => {\n" +
  "  aiFinishedAt = Date.now();\n" +
  "  return response;\n" +
  "});" +
  s.slice(lastFetchClose + 2);

const oldDuration =
  "const aiDurationMs =\n" +
  "  Date.now() - aiStartedAt;";

const newDuration =
  "const aiDurationMs =\n" +
  "  (aiFinishedAt || Date.now()) - aiStartedAt;";

if (!s.includes(oldDuration)) {
  throw new Error("AI duration block not found.");
}

s = s.replace(oldDuration, newDuration);

fs.writeFileSync(file, s, "utf8");

console.log("OK: CORE timing now measures actual request duration.");
