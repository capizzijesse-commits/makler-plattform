const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const re =
/        for\s*\(\s*let index = 0;\s*index < extractedPdfImages\.length;[\s\S]*?\n        }\s*(?=\n\s*console\.info\(\s*"\[AUTOPILOT_RUN_PDF_IMAGES\]")/;

const match = s.match(re);

if (!match) {
  throw new Error(
    "PDF store loop still not found. No file changes were made."
  );
}

const nl = s.includes("\r\n") ? "\r\n" : "\n";

const replacement = [
'        const firstPdfImagePosition = registeredImages.length;',
'',
'        const createdPdfImages = await Promise.all(',
'          extractedPdfImages.map(async (image, index) => {',
'            const position = firstPdfImagePosition + index;',
'',
'            const pathname =',
'              "autopilot/" +',
'              listing.id +',
'              "/run-pdf-images/" +',
'              Date.now() +',
'              "-" +',
'              index +',
'              ".jpg";',
'',
'            const stored = await put(pathname, image.buffer, {',
'              access: "public",',
'              contentType: "image/jpeg",',
'              addRandomSuffix: true,',
'            });',
'',
'            return prisma.listingImage.create({',
'              data: {',
'                listingId: listing.id,',
'                url: stored.url,',
'                storageKey: stored.pathname,',
'                fileName: "pdf-image-" + (position + 1) + ".jpg",',
'                mimeType: "image/jpeg",',
'                sizeBytes: image.buffer.length,',
'                position,',
'                isPrimary: position === 0,',
'                analysisStatus: "not_analyzed",',
'              },',
'              select: {',
'                id: true,',
'                url: true,',
'                fileName: true,',
'                position: true,',
'              },',
'            });',
'          })',
'        );',
'',
'        registeredImages.push(...createdPdfImages);'
].join(nl);

s = s.replace(re, replacement);

fs.writeFileSync(file, s, "utf8");

console.log("OK: PDF images now store in parallel.");
