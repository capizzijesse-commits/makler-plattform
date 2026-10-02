const fs = require("fs");

const file = "lib/pdf-extract-images.server.ts";
let s = fs.readFileSync(file, "utf8");

const importAnchor =
  'import sharp from "sharp";';

if (!s.includes(importAnchor)) {
  throw new Error("Sharp-Import nicht gefunden");
}

s = s.replace(
  importAnchor,
  importAnchor +
    '\nimport { createRequire } from "node:module";'
);

const oldBlock =
`  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const loadingTask = pdfjs.getDocument({`;

const newBlock =
`  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const require = createRequire(import.meta.url);

  pdfjs.GlobalWorkerOptions.workerSrc =
    require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );

  const loadingTask = pdfjs.getDocument({`;

const count = s.split(oldBlock).length - 1;

if (count !== 1) {
  throw new Error(
    "PDFJS-Anker: erwartet 1, gefunden " +
      count
  );
}

s = s.replace(oldBlock, newBlock);

fs.writeFileSync(file, s, "utf8");

console.log("OK: PDF.js Worker-Pfad gesetzt");
