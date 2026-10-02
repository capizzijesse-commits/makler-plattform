const fs = require("fs");

const file = "lib/pdf-extract-images.server.ts";
let s = fs.readFileSync(file, "utf8");

const before = s;

const widthMatches = (s.match(/width:\s*1800/g) || []).length;
const heightMatches = (s.match(/height:\s*1800/g) || []).length;
const qualityMatches = (s.match(/quality:\s*84/g) || []).length;
const mozjpegMatches = (s.match(/mozjpeg:\s*true,?/g) || []).length;

if (
  widthMatches !== 1 ||
  heightMatches !== 1 ||
  qualityMatches !== 1 ||
  mozjpegMatches !== 1
) {
  throw new Error(
    `Safety check failed: width=${widthMatches}, height=${heightMatches}, quality=${qualityMatches}, mozjpeg=${mozjpegMatches}`
  );
}

s = s
  .replace(/width:\s*1800/, "width: 1280")
  .replace(/height:\s*1800/, "height: 1280")
  .replace(/quality:\s*84/, "quality: 76")
  .replace(/\s*mozjpeg:\s*true,?/, "");

if (
  s === before ||
  !s.includes("width: 1280") ||
  !s.includes("height: 1280") ||
  !s.includes("quality: 76") ||
  /mozjpeg:\s*true/.test(s)
) {
  throw new Error("Final safety check failed. File not written.");
}

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: PDF preprocessing = 1280px / JPEG 76 / mozjpeg removed."
);
