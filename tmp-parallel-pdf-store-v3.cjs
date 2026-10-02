const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const nl = s.includes("\r\n") ? "\r\n" : "\n";
const lines = s.split(/\r?\n/);

/*
 * Aktueller bestätigter Block:
 * Zeile 835 bis einschliesslich 901
 */
const startLine = 835;
const endLine = 901;

if (
  !lines[startLine - 1].includes("for (") ||
  !lines[836].includes("extractedPdfImages.length") ||
  !lines[855].includes("await put(") ||
  !lines[867].includes("await prisma.listingImage.create")
) {
  throw new Error(
    "Safety check failed. File differs from confirmed lines. No changes made."
  );
}

const replacement = [
'      const firstPdfImagePosition =',
'        registeredImages.length;',
'',
'      const createdPdfImages =',
'        await Promise.all(',
'          extractedPdfImages.map(',
'            async (image, index) => {',
'              const position =',
'                firstPdfImagePosition + index;',
'',
'              const pathname =',
'                "autopilot/" +',
'                listing.id +',
'                "/run-pdf-images/" +',
'                Date.now() +',
'                "-" +',
'                index +',
'                ".jpg";',
'',
'              const stored =',
'                await put(',
'                  pathname,',
'                  image.buffer,',
'                  {',
'                    access: "public",',
'                    contentType: "image/jpeg",',
'                    addRandomSuffix: true,',
'                  }',
'                );',
'',
'              return prisma.listingImage.create({',
'                data: {',
'                  listingId: listing.id,',
'                  url: stored.url,',
'                  storageKey: stored.pathname,',
'                  fileName:',
'                    "pdf-image-" +',
'                    (position + 1) +',
'                    ".jpg",',
'                  mimeType: "image/jpeg",',
'                  sizeBytes: image.buffer.length,',
'                  position,',
'                  isPrimary: position === 0,',
'                  analysisStatus: "not_analyzed",',
'                },',
'                select: {',
'                  id: true,',
'                  url: true,',
'                  fileName: true,',
'                  position: true,',
'                },',
'              });',
'            }',
'          )',
'        );',
'',
'      registeredImages.push(',
'        ...createdPdfImages',
'      );'
];

lines.splice(
  startLine - 1,
  endLine - startLine + 1,
  ...replacement
);

fs.writeFileSync(
  file,
  lines.join(nl),
  "utf8"
);

console.log(
  "OK: serial PDF store loop replaced with Promise.all."
);
