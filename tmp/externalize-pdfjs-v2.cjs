const fs = require("fs");

const file = "next.config.ts";
let s = fs.readFileSync(file, "utf8");

if (s.includes("serverExternalPackages")) {
  throw new Error(
    "serverExternalPackages ist bereits vorhanden"
  );
}

const re =
  /(\s*poweredByHeader\s*:\s*false\s*,)/;

if (!re.test(s)) {
  throw new Error(
    "poweredByHeader: false nicht gefunden"
  );
}

s = s.replace(
  re,
  `$1

  serverExternalPackages: [
    "pdfjs-dist",
  ],`
);

fs.writeFileSync(file, s, "utf8");

console.log(
  "OK: pdfjs-dist serverseitig externalisiert"
);
