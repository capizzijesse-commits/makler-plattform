const fs = require("fs");

const file = "next.config.ts";
let s = fs.readFileSync(file, "utf8");

const anchor =
`const nextConfig: NextConfig = {
  poweredByHeader: false,`;

const replacement =
`const nextConfig: NextConfig = {
  poweredByHeader: false,

  serverExternalPackages: [
    "pdfjs-dist",
  ],`;

const count = s.split(anchor).length - 1;

if (count !== 1) {
  throw new Error(
    "NEXT CONFIG ANKER: erwartet 1, gefunden " +
    count
  );
}

s = s.replace(anchor, replacement);

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: pdfjs-dist als Server External Package gesetzt"
);
