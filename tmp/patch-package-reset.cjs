const fs = require("fs");

const file =
  "app/components/AutomationPublishOverlay.tsx";

let text =
  fs.readFileSync(file, "utf8");

const oldBlock =
`    const openOverlay = () => {
      setOpen(true);
      setError("");`;

const newBlock =
`    const openOverlay = () => {
      setPackageFiles([]);
      setListingId(null);
      setProgress(0);
      setOpen(true);
      setError("");`;

if (!text.includes(oldBlock)) {
  throw new Error(
    "openOverlay-Block nicht eindeutig gefunden."
  );
}

text = text.replace(
  oldBlock,
  newBlock
);

fs.writeFileSync(
  file,
  text,
  "utf8"
);

console.log(
  "Objektpaket-Reset eingebaut."
);
