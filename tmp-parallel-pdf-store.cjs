const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const startMarker = "        for (\r\n          let index = 0;\r\n          index < extractedPdfImages.length;";
const endMarker = "\r\n\r\n        console.info(\r\n          \"[AUTOPILOT_RUN_PDF_IMAGES]\"";

const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  throw new Error(
    "PDF store block not found. No file changes were made."
  );
}

const replacement = [
'        const firstPdfImagePosition = registeredImages.length;',
'',
'        const createdPdfImages =',
'          await Promise.all(',
'            extractedPdfImages.map(',
'              async (image, index) => {',
'                const position =',
'                  firstPdfImagePosition + index;',
'',
'                const pathname =',
'                  "autopilot/" +',
'                  listing.id +',
'                  "/run-pdf-images/" +',
'                  Date.now() +',
'                  "-" +',
'                  index +',
'                  ".jpg";',
'',
'                const stored =',
'                  await put(',
'                    pathname,',
'                    image.buffer,',
'                    {',
'                      access: "public",',
'                      contentType: "image/jpeg",',
'                      addRandomSuffix: true,',
'                    }',
'                  );',
'',
'                return prisma.listingImage.create({',
'                  data: {',
'                    listingId: listing.id,',
'                    url: stored.url,',
'                    storageKey: stored.pathname,',
'                    fileName:',
'                      "pdf-image-" +',
'                      (position + 1) +',
'                      ".jpg",',
'                    mimeType: "image/jpeg",',
'                    sizeBytes: image.buffer.length,',
'                    position,',
'                    isPrimary: position === 0,',
'                    analysisStatus: "not_analyzed",',
'                  },',
'                  select: {',
'                    id: true,',
'                    url: true,',
'                    fileName: true,',
'                    position: true,',
'                  },',
'                });',
'              }',
'            )',
'          );',
'',
'        registeredImages.push(...createdPdfImages);'
].join("\r\n");

s = s.slice(0, start) + replacement + s.slice(end);

fs.writeFileSync(file, s, "utf8");

console.log("OK: PDF images now store in parallel.");
