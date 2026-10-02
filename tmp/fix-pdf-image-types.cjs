const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const oldCreate =
`         await prisma.listingImage.create({
           data: {
             listingId:
               listing.id,
             url:
               stored.url,
             blobPathname:
               stored.pathname,
             fileName:
               "pdf-image-" +
               (position + 1) +
               ".jpg",
             mimeType:
               "image/jpeg",
             sizeBytes:
               image.buffer.length,
             position,
             isPrimary:
               position === 0,
             analysisStatus:
               "not_analyzed",
           },
         });

         registeredImages.push({
           url:
             stored.url,
           pathname:
             stored.pathname,
           fileName:
             "pdf-image-" +
             (position + 1) +
             ".jpg",
         });`;

const newCreate =
`         const createdPdfImage =
           await prisma.listingImage.create({
             data: {
               listingId:
                 listing.id,
               url:
                 stored.url,
               fileName:
                 "pdf-image-" +
                 (position + 1) +
                 ".jpg",
               mimeType:
                 "image/jpeg",
               sizeBytes:
                 image.buffer.length,
               position,
               isPrimary:
                 position === 0,
               analysisStatus:
                 "not_analyzed",
             },
             select: {
               id: true,
               url: true,
               fileName: true,
               position: true,
             },
           });

         registeredImages.push(
           createdPdfImage
         );`;

function normalize(value) {
  return value.replace(/\r\n/g, "\n");
}

const normalized = normalize(s);

if (!normalized.includes(oldCreate)) {
  throw new Error(
    "PDF IMAGE CREATE BLOCK NICHT GEFUNDEN"
  );
}

const patched =
  normalized.replace(
    oldCreate,
    newCreate
  );

const useCRLF = s.includes("\r\n");

fs.writeFileSync(
  file,
  useCRLF
    ? patched.replace(/\n/g, "\r\n")
    : patched,
  "utf8"
);

console.log(
  "OK: ListingImage-Typen korrigiert"
);
