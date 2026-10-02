const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const oldText = `      } catch {
        throw new Error(
          "Das Vision-Ergebnis hatte kein gueltiges JSON-Format."
        );
      }`;

const newText = `      } catch (visionParseError) {
        console.error(
          "[AUTOPILOT_VISION_JSON_PARSE_FAILED] " +
            JSON.stringify({
              error:
                visionParseError instanceof Error
                  ? visionParseError.message
                  : String(visionParseError),
              outputLength:
                creativeOutputText.length,
              outputPreview:
                creativeOutputText.slice(0, 4000),
            })
        );

        throw new Error(
          "Das Vision-Ergebnis hatte kein gueltiges JSON-Format."
        );
      }`;

const count = s.split(oldText).length - 1;

if (count !== 1) {
  throw new Error(
    "Vision catch erwartet 1x, gefunden: " + count
  );
}

s = s.replace(oldText, newText);

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: Vision JSON Diagnostic eingebaut"
);
