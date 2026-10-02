const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const CRLF = s.includes("\r\n");
let n = s.replace(/\r\n/g, "\n");

const oldText =
`      console.error(
        "[AUTOPILOT_RUN_PDF_IMAGES_FAILED]",
        {
          listingId:
            listing.id,
          error:
            pdfImageError instanceof Error
              ? pdfImageError.message
              : String(pdfImageError),
        }
      );`;

const newText =
`      const pdfImageErrorMessage =
        pdfImageError instanceof Error
          ? pdfImageError.message
          : String(pdfImageError);

      console.error(
        "[AUTOPILOT_RUN_PDF_IMAGES_FAILED] " +
          "listingId=" +
          listing.id +
          " error=" +
          pdfImageErrorMessage
      );`;

const count =
  n.split(oldText).length - 1;

if (count !== 1) {
  throw new Error(
    "PDF ERROR LOGGER: erwartet 1 Anker, gefunden " +
    count
  );
}

n = n.replace(oldText, newText);

fs.writeFileSync(
  file,
  CRLF
    ? n.replace(/\n/g, "\r\n")
    : n,
  "utf8"
);

console.log(
  "OK: PDF-Fehler wird jetzt als Text geloggt"
);
