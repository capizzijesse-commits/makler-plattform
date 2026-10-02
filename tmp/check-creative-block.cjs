const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
const data = fs.readFileSync(file);

let startToken = Buffer.from(
  "    /*\r\n     * SPEED BOOSTER V1 - CREATIVE SPLIT"
);

if (data.indexOf(startToken) === -1) {
  startToken = Buffer.from(
    "    /*\n     * SPEED BOOSTER V1 - CREATIVE SPLIT"
  );
}

const endToken = Buffer.from(
  "    const postprocessStartedAt"
);

const start = data.indexOf(startToken);
const end = data.indexOf(endToken, start);

console.log("start =", start);
console.log("end   =", end);

if (start < 0 || end < 0 || end <= start) {
  throw new Error(
    "Creative-Block nicht eindeutig gefunden. NICHTS wurde veraendert."
  );
}

const block = data.subarray(start, end);

const markers = [
  "const creativeStartedAt",
  "const creativeContent",
  "const creativeResponse",
  "inserat_ai_autopilot_creative",
  "parsed.imageAnalyses",
  "parsed.variants"
];

for (const marker of markers) {
  const found = block.includes(Buffer.from(marker));

  console.log(
    marker,
    "=>",
    found ? "OK" : "FEHLT"
  );

  if (!found) {
    throw new Error(
      "Marker fehlt: " +
      marker +
      ". NICHTS wurde veraendert."
    );
  }
}

console.log("");
console.log("BLOCK IST EINDEUTIG.");
console.log("Noch keine Datei veraendert.");
