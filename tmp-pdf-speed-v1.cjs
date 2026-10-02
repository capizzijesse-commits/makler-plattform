const fs = require("fs");

const file = "lib/pdf-extract-images.server.ts";
let s = fs.readFileSync(file, "utf8");

const original = s;

s = s.replace(
  'width: 1800,\n              height: 1800,',
  'width: 1280,\n              height: 1280,'
);

s = s.replace(
  '.jpeg({\n              quality: 84,\n              mozjpeg: true,\n            })',
  '.jpeg({\n              quality: 76,\n            })'
);

if (s === original) {
  throw new Error(
    "No changes made. Expected Sharp settings were not found."
  );
}

if (
  !s.includes("width: 1280") ||
  !s.includes("height: 1280") ||
  !s.includes("quality: 76") ||
  s.includes("mozjpeg: true")
) {
  throw new Error(
    "Safety check failed. File was not written."
  );
}

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: PDF image preprocessing optimized: 1280px / JPEG 76 / no mozjpeg."
);
