const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const oldText =
  '"[AUTOPILOT_RUN_PDF_IMAGES_FAILED]",';

const newText =
  '"[AUTOPILOT_RUN_PDF_IMAGES_FAILED] error=" + ' +
  '(pdfImageError instanceof Error ? pdfImageError.message : String(pdfImageError)),';

const count =
  s.split(oldText).length - 1;

if (count !== 1) {
  throw new Error(
    "LOGGER MARKER: erwartet 1, gefunden " +
    count
  );
}

s = s.replace(oldText, newText);

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log(
  "OK: PDF-Fehler steht jetzt direkt im Log-String"
);
