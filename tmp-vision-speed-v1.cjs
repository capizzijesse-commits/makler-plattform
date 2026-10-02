const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const before = s;

const tokenMatches =
  (s.match(/max_output_tokens:\s*4000/g) || []).length;

const factsMatches =
  (s.match(/maxItems:\s*5/g) || []).length;

const promptMatches =
  (
    s.match(
      /maximal fuenf sichtbare Merkmale zurueck/g
    ) || []
  ).length;

if (
  tokenMatches !== 1 ||
  factsMatches !== 1 ||
  promptMatches !== 1
) {
  throw new Error(
    `Safety check failed: tokens=${tokenMatches}, facts=${factsMatches}, prompt=${promptMatches}`
  );
}

s = s
  .replace(
    /max_output_tokens:\s*4000/,
    "max_output_tokens: 2200"
  )
  .replace(
    /maxItems:\s*5/,
    "maxItems: 2"
  )
  .replace(
    "maximal fuenf sichtbare Merkmale zurueck",
    "maximal zwei sehr kurze sichtbare Merkmale zurueck"
  );

if (
  s === before ||
  !s.includes("max_output_tokens: 2200") ||
  !s.includes("maxItems: 2") ||
  !s.includes(
    "maximal zwei sehr kurze sichtbare Merkmale zurueck"
  )
) {
  throw new Error(
    "Final safety check failed. File not written."
  );
}

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: Vision output compressed to 2200 tokens / max 2 facts."
);
