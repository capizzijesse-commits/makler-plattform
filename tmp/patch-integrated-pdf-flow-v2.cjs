const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let b = fs.readFileSync(file);

function replaceOnce(oldText, newText, label) {
  const oldBuf = Buffer.from(oldText, "utf8");
  const newBuf = Buffer.from(newText, "utf8");

  const first = b.indexOf(oldBuf);

  if (first < 0) {
    throw new Error("ANKER NICHT GEFUNDEN: " + label);
  }

  if (b.indexOf(oldBuf, first + oldBuf.length) >= 0) {
    throw new Error("ANKER NICHT EINDEUTIG: " + label);
  }

  b = Buffer.concat([
    b.subarray(0, first),
    newBuf,
    b.subarray(first + oldBuf.length),
  ]);

  console.log("OK:", label);
}

replaceOnce(
`import {
  head,
} from "@vercel/blob";`,
`import {
  head,
  put,
} from "@vercel/blob";

import {
  extractPdfImages,
} from "@/lib/pdf-extract-images.server";`,
"imports"
);

replaceOnce(
`      if (isPdf) {
        registeredDocuments.push({`,
`      if (isPdf) {
        registeredDocuments.push({`,
"pdf block anchor check"
);

replaceOnce(
`   const prepDurationMs =
     Date.now() - autopilotTotalStartedAt;`,
`   /*
    * PDF IMAGE PREP V2
    *
    * Do not depend on the asynchronous upload callback for PDF photos.
    * /run itself guarantees that embedded PDF images are available before
    * the final image set for Vision is created.
    */
   const existingPdfImageCount =
     registeredImages.length;

   const remainingPdfImageSlots =
     Math.max(
       0,
       20 - existingPdfImageCount
     );

   if (
     registeredDocuments.length > 0 &&
     remainingPdfImageSlots > 0
   ) {
     try {
       const pdfImageBatches =
         await Promise.all(
           registeredDocuments.map(
             async (document) => {
               const response =
                 await fetch(document.url);

               if (!response.ok) {
                 throw new Error(
                   "PDF download failed: " +
                   response.status
                 );
               }

               const pdfBuffer =
                 Buffer.from(
                   await response.arrayBuffer()
                 );

               return extractPdfImages(
                 pdfBuffer,
                 remainingPdfImageSlots
               );
             }
           )
         );

       const extractedPdfImages =
         pdfImageBatches
           .flat()
           .slice(
             0,
             remainingPdfImageSlots
           );

       for (
         let index = 0;
         index < extractedPdfImages.length;
         index++
       ) {
         const image =
           extractedPdfImages[index];

         const position =
           registeredImages.length;

         const pathname =
           "autopilot/" +
           listing.id +
           "/run-pdf-images/" +
           Date.now() +
           "-" +
           index +
           ".jpg";

         const stored =
           await put(
             pathname,
             image.buffer,
             {
               access: "public",
               contentType:
                 "image/jpeg",
               addRandomSuffix: true,
             }
           );

         const existing =
           await prisma.listingImage.findFirst({
             where: {
               listingId: listing.id,
               blobPathname:
                 stored.pathname,
             },
             select: {
               id: true,
             },
           });

         if (!existing) {
           await prisma.listingImage.create({
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
         }

         registeredImages.push({
           url:
             stored.url,
           pathname:
             stored.pathname,
           fileName:
             "pdf-image-" +
             (position + 1) +
             ".jpg",
         });
       }

       console.info(
         "[AUTOPILOT_RUN_PDF_IMAGES]",
         {
           listingId:
             listing.id,
           extracted:
             extractedPdfImages.length,
           totalImages:
             registeredImages.length,
         }
       );
     } catch (pdfImageError) {
       console.error(
         "[AUTOPILOT_RUN_PDF_IMAGES_FAILED]",
         {
           listingId:
             listing.id,
           error:
             pdfImageError instanceof Error
               ? pdfImageError.message
               : String(pdfImageError),
         }
       );
     }
   }

   const prepDurationMs =
     Date.now() - autopilotTotalStartedAt;`,
"integrated PDF image preparation"
);

fs.writeFileSync(file, b);

console.log("");
console.log("INTEGRATED PDF FLOW V2 EINGEBAUT");
