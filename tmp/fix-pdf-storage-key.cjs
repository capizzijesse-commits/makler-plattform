const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const oldText =
`               url:
                 stored.url,
               fileName:`;

const newText =
`               url:
                 stored.url,
               storageKey:
                 stored.pathname,
               fileName:`;

const normalized =
  s.replace(/\r\n/g, "\n");

if (!normalized.includes(oldText)) {
  throw new Error(
    "STORAGEKEY-ANKER NICHT GEFUNDEN"
  );
}

const patched =
  normalized.replace(
    oldText,
    newText
  );

fs.writeFileSync(
  file,
  s.includes("\r\n")
    ? patched.replace(/\n/g, "\r\n")
    : patched,
  "utf8"
);

console.log(
  "OK: storageKey fuer PDF-Bilder gesetzt"
);
