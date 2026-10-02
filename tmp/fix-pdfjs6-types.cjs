const fs = require("fs");

const file =
  "lib/pdf-extract-images.server.ts";

let text =
  fs.readFileSync(file, "utf8");

const oldOption =
`    disableWorker: true,
    useSystemFonts: false,`;

const newOption =
`    useSystemFonts: false,`;

if (!text.includes(oldOption)) {
  throw new Error(
    "disableWorker-Stelle nicht gefunden."
  );
}

text = text.replace(
  oldOption,
  newOption
);

const oldDestroy =
`    await pdf.destroy();`;

const newDestroy =
`    await loadingTask.destroy();`;

if (!text.includes(oldDestroy)) {
  throw new Error(
    "pdf.destroy()-Stelle nicht gefunden."
  );
}

text = text.replace(
  oldDestroy,
  newDestroy
);

fs.writeFileSync(
  file,
  text,
  "utf8"
);

console.log(
  "PDF.js-6-Typen korrigiert."
);
