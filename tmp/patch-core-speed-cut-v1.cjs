const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const CRLF = s.includes("\r\n");
let n = s.replace(/\r\n/g, "\n");

/*
 * CORE SPEED CUT V1
 *
 * Entfernt die alte Aufforderung, drei lange Varianten
 * im CORE zu schreiben. Die drei Varianten werden bereits
 * lokal erzeugt.
 */
const startMarker =
  `              "- Erstelle genau 3 hochwertige Inseratvarianten.",`;

const endMarker =
  `"- Keine erfundenen Distanzen, Infrastrukturangaben, Ausstattungen, ZustÃ¤nde oder Lagevorteile.",`;

const start = n.indexOf(startMarker);
const end = n.indexOf(endMarker);

if (start < 0) {
  throw new Error(
    "CORE VARIANT START NICHT GEFUNDEN"
  );
}

if (end < 0 || end < start) {
  throw new Error(
    "CORE VARIANT ENDE NICHT GEFUNDEN"
  );
}

const endOfLine =
  n.indexOf("\n", end);

if (endOfLine < 0) {
  throw new Error(
    "CORE VARIANT ZEILENENDE NICHT GEFUNDEN"
  );
}

const replacement =
`              "- Extrahiere ausschliesslich die belegten Objektdaten fuer das strukturierte CORE-Schema.",
              "- highlights: maximal 5 kurze, belegte Merkmale.",
              "- summary: maximal 2 kurze Saetze mit den wichtigsten belegten Eigenschaften.",
              "- Keine Inseratvarianten oder langen Verkaufstexte erzeugen.",
              "- Fehlende oder unsichere Fakten niemals erfinden.",`;

n =
  n.slice(0, start) +
  replacement +
  n.slice(endOfLine);

/*
 * Nur CORE von 1800 auf 900 reduzieren.
 * Vision hat ebenfalls 900 und bleibt unveraendert.
 */
const coreTokens =
`              max_output_tokens:
                1800,`;

const coreTokensNew =
`              max_output_tokens:
                900,`;

const tokenCount =
  n.split(coreTokens).length - 1;

if (tokenCount !== 1) {
  throw new Error(
    "CORE TOKEN ANKER: erwartet 1, gefunden " +
    tokenCount
  );
}

n =
  n.replace(
    coreTokens,
    coreTokensNew
  );

fs.writeFileSync(
  file,
  CRLF
    ? n.replace(/\n/g, "\r\n")
    : n,
  "utf8"
);

console.log("");
console.log("CORE SPEED CUT V1 EINGEBAUT");
console.log("- alte 3 Varianten entfernt");
console.log("- 180-280 Woerter entfernt");
console.log("- CORE max_output_tokens: 900");
