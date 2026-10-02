const fs = require("fs");

const file = "lib/pdf-extract-images.server.ts";
let s = fs.readFileSync(file, "utf8");

s = s.replace(
  'import { createRequire } from "node:module";\r\n',
  ''
);

s = s.replace(
  'import { createRequire } from "node:module";\n',
  ''
);

const oldBlock = `  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const require = createRequire(import.meta.url);

  pdfjs.GlobalWorkerOptions.workerSrc =
    require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );

  const loadingTask = pdfjs.getDocument({`;

const newBlock = `  await import(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );

  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const loadingTask = pdfjs.getDocument({`;

const normalized = s.replace(/\r\n/g, "\n");

if (!normalized.includes(oldBlock)) {
  throw new Error(
    "Alter PDF.js Worker-Block nicht gefunden"
  );
}

let next = normalized.replace(
  oldBlock,
  newBlock
);

if (
  next.includes("createRequire") ||
  next.includes("GlobalWorkerOptions.workerSrc") ||
  next.includes("require.resolve")
) {
  throw new Error(
    "Alter Worker-Pfad ist noch vorhanden"
  );
}

const useCRLF = s.includes("\r\n");

fs.writeFileSync(
  file,
  useCRLF
    ? next.replace(/\n/g, "\r\n")
    : next,
  "utf8"
);

console.log(
  "OK: PDF Worker wird vor pdf.mjs geladen"
);
