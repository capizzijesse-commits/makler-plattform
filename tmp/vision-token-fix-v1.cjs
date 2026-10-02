const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const visionMarker =
  "VISION_OPENAI_DIAGNOSTIC";

const markerPos = s.indexOf(visionMarker);

if (markerPos === -1) {
  throw new Error("VISION-Bereich nicht gefunden.");
}

const beforeVisionDiagnostic =
  s.slice(0, markerPos);

const tokenPos =
  beforeVisionDiagnostic.lastIndexOf(
    "max_output_tokens: 900"
  );

if (tokenPos === -1) {
  throw new Error(
    "VISION max_output_tokens: 900 nicht gefunden."
  );
}

s =
  s.slice(0, tokenPos) +
  "max_output_tokens: 4000" +
  s.slice(
    tokenPos + "max_output_tokens: 900".length
  );

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: Vision max_output_tokens 900 -> 4000"
);
