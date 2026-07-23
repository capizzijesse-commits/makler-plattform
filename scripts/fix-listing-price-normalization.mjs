import fs from "node:fs";

const filePath = "app/api/listings/route.ts";
const content = fs.readFileSync(filePath, "utf8");
const eol = content.includes("\r\n") ? "\r\n" : "\n";
const lines = content.split(/\r?\n/);

const matches = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) =>
    line.includes("? value.replace(")
  );

if (matches.length !== 1) {
  throw new Error(
    `Preis-Normalisierung nicht eindeutig gefunden: ${matches.length}`
  );
}

lines[matches[0].index] =
  "      ? value.replace(/['’\\s]/g, \"\").replace(\",\", \".\")";

fs.writeFileSync(
  filePath,
  lines.join(eol),
  "utf8"
);

console.log(
  "Preis-Normalisierung wurde bereinigt."
);