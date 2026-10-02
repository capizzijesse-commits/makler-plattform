const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

if (s.includes("[AUTOPILOT_VISION_JSON_PARSE_FAILED]")) {
  throw new Error("Diagnostic ist bereits eingebaut.");
}

const marker =
  `"Das Vision-Ergebnis hatte kein gueltiges JSON-Format."`;

const markerPos = s.indexOf(marker);

if (markerPos === -1) {
  throw new Error("Vision-Fehlermeldung nicht gefunden.");
}

/*
 * Nur den catch direkt VOR dieser eindeutigen
 * Vision-Fehlermeldung ersetzen.
 */
const before = s.slice(0, markerPos);
const catchPos = before.lastIndexOf("} catch {");

if (catchPos === -1) {
  throw new Error("Vision catch nicht gefunden.");
}

const replacement =
`} catch (visionParseError) {
        console.error(
          "[AUTOPILOT_VISION_JSON_PARSE_FAILED] " +
            JSON.stringify({
              error:
                visionParseError instanceof Error
                  ? visionParseError.message
                  : String(visionParseError),
              outputLength: creativeOutputText.length,
              outputPreview: creativeOutputText.slice(0, 4000),
            })
        );`;

s =
  s.slice(0, catchPos) +
  replacement +
  s.slice(catchPos + "} catch {".length);

fs.writeFileSync(file, s, "utf8");

console.log("OK: Vision JSON Diagnostic eingebaut");
