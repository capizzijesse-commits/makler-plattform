const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
const original = fs.readFileSync(file, "utf8");

const CRLF = original.includes("\r\n");
let s = original.replace(/\r\n/g, "\n");

const marker =
  '"[AUTOPILOT_RUN_PDF_IMAGES_FAILED]"';

const markerPos = s.indexOf(marker);

if (markerPos < 0) {
  throw new Error(
    "PDF-FAIL-MARKER NICHT GEFUNDEN"
  );
}

const catchStart =
  s.lastIndexOf(
    "} catch (pdfImageError) {",
    markerPos
  );

if (catchStart < 0) {
  throw new Error(
    "PDF-CATCH-START NICHT GEFUNDEN"
  );
}

const nextBlock =
  s.indexOf(
    "\n    }\n  }\n",
    markerPos
  );

if (nextBlock < 0) {
  throw new Error(
    "PDF-CATCH-ENDE NICHT GEFUNDEN"
  );
}

const catchEnd =
  nextBlock + "\n    }".length;

const replacement =
`    } catch (pdfImageError) {
      const pdfImageErrorMessage =
        pdfImageError instanceof Error
          ? pdfImageError.message
          : String(pdfImageError);

      const pdfImageErrorStack =
        pdfImageError instanceof Error
          ? pdfImageError.stack || ""
          : "";

      console.error(
        "[AUTOPILOT_RUN_PDF_IMAGES_FAILED] " +
          "listingId=" +
          listing.id +
          " error=" +
          pdfImageErrorMessage +
          " stack=" +
          pdfImageErrorStack
      );
    }`;

s =
  s.slice(0, catchStart) +
  replacement +
  s.slice(catchEnd);

fs.writeFileSync(
  file,
  CRLF
    ? s.replace(/\n/g, "\r\n")
    : s,
  "utf8"
);

console.log(
  "OK: PDF-Fehlerlogger repariert"
);
