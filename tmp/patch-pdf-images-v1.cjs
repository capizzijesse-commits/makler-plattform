const fs = require("fs");

const file =
  "app/api/autopilot/upload/route.ts";

let text =
  fs.readFileSync(file, "utf8");

const blobOld =
`import {
  head,
} from "@vercel/blob";`;

const blobNew =
`import {
  head,
  put,
} from "@vercel/blob";`;

if (!text.includes(blobOld)) {
  throw new Error(
    "@vercel/blob Import nicht eindeutig gefunden."
  );
}

text = text.replace(
  blobOld,
  blobNew
);

const prismaImport =
`import {
  prisma,
} from "@/lib/prisma";`;

if (!text.includes(prismaImport)) {
  throw new Error(
    "Prisma Import nicht gefunden."
  );
}

text = text.replace(
  prismaImport,
  prismaImport +
`

import {
  extractPdfImages,
} from "@/lib/pdf-extract-images.server";`
);

const oldPdfBlock =
`            if (
              metadata.contentType ===
              "application/pdf"
            ) {
              return;
            }`;

if (!text.includes(oldPdfBlock)) {
  throw new Error(
    "PDF return Block nicht gefunden."
  );
}

const newPdfBlock =
`            if (
              metadata.contentType ===
              "application/pdf"
            ) {
              try {
                const pdfResponse =
                  await fetch(
                    metadata.url
                  );

                if (!pdfResponse.ok) {
                  throw new Error(
                    "PDF konnte nicht geladen werden."
                  );
                }

                const pdfBuffer =
                  Buffer.from(
                    await pdfResponse.arrayBuffer()
                  );

                const currentImageCount =
                  await prisma.listingImage
                    .count({
                      where: {
                        listingId,
                      },
                    });

                const remainingSlots =
                  Math.max(
                    0,
                    MAX_IMAGE_COUNT -
                      currentImageCount
                  );

                if (remainingSlots > 0) {
                  const extracted =
                    await extractPdfImages(
                      pdfBuffer,
                      remainingSlots
                    );

                  for (
                    let index = 0;
                    index < extracted.length;
                    index += 1
                  ) {
                    const image =
                      extracted[index];

                    const position =
                      currentImageCount +
                      index;

                    const pathname =
                      "autopilot/" +
                      listingId +
                      "/pdf-images/" +
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
                          addRandomSuffix:
                            true,
                        }
                      );

                    await prisma.listingImage
                      .create({
                        data: {
                          listingId,

                          url:
                            stored.url,

                          storageKey:
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

                  console.info(
                    "[AUTOPILOT_PDF_IMAGES]",
                    {
                      listingId,
                      extracted:
                        extracted.length,
                    }
                  );
                }
              } catch (error) {
                console.warn(
                  "[AUTOPILOT_PDF_IMAGES_FAILED]",
                  {
                    listingId,
                    error:
                      error instanceof Error
                        ? error.message
                        : String(error),
                  }
                );
              }

              return;
            }`;

text = text.replace(
  oldPdfBlock,
  newPdfBlock
);

fs.writeFileSync(
  file,
  text,
  "utf8"
);

console.log(
  "PDF image extraction V1 eingebaut."
);
