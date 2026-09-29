import {
  head,
  put,
} from "@vercel/blob";

import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";

import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  extractPdfImages,
} from "@/lib/pdf-extract-images.server";

import {
  getAuthenticatedUser,
} from "@/lib/session";


export const runtime =
  "nodejs";


const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  50 * 1024 * 1024;

const MAX_IMAGE_COUNT =
  20;

const AUTOPILOT_PROJECT_NAME =
  "Autopilot-Entwurf";


type AutopilotUploadPayload = {
  listingId?: unknown;
  fileName?: unknown;
};


function safeFileName(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const text =
    value.trim();

  if (!text) {
    return null;
  }

  return text.slice(
    0,
    255
  );
}


export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (
        await request.json()
      ) as HandleUploadBody;

    const response =
      await handleUpload({
        body,

        request,

        onBeforeGenerateToken:
          async (
            pathname,
            clientPayload
          ) => {
            const user =
              await getAuthenticatedUser(
                request
              );

            if (!user) {
              throw new Error(
                "Bitte zuerst einloggen."
              );
            }

            let payload:
              AutopilotUploadPayload;

            try {
              payload =
                JSON.parse(
                  clientPayload ||
                    "{}"
                ) as AutopilotUploadPayload;
            } catch {
              throw new Error(
                "UngÃ¼ltige Upload-Daten."
              );
            }

            const listingId =
              typeof payload.listingId ===
                "string"
                ? payload.listingId.trim()
                : "";

            const fileName =
              safeFileName(
                payload.fileName
              );

            if (
              !listingId ||
              listingId.length > 128
            ) {
              throw new Error(
                "UngÃ¼ltiger Autopilot-Entwurf."
              );
            }

            const listing =
              await prisma.listing
                .findFirst({
                  where: {
                    id:
                      listingId,

                    userId:
                      user.id,

                    archivedAt:
                      null,
                  },

                  select: {
                    id: true,
                    projectName:
                      true,
                  },
                });

            if (
              !listing ||
              listing.projectName !==
                AUTOPILOT_PROJECT_NAME
            ) {
              throw new Error(
                "Autopilot-Entwurf wurde nicht gefunden."
              );
            }

            const storedImageCount =
              await prisma.listingImage
                .count({
                  where: {
                    listingId:
                      listing.id,
                  },
                });

            if (
              storedImageCount >=
              MAX_IMAGE_COUNT
            ) {
              throw new Error(
                "Maximal 20 Bilder pro Autopilot-Durchlauf."
              );
            }

            const expectedPrefix =
              `autopilot/${listing.id}/`;

            if (
              !pathname.startsWith(
                expectedPrefix
              )
            ) {
              throw new Error(
                "UngÃ¼ltiger Autopilot-Speicherpfad."
              );
            }

            return {
              allowedContentTypes: [
                "application/pdf",
                "image/jpeg",
                "image/png",
                "image/webp",
              ],

              maximumSizeInBytes:
                MAX_DOCUMENT_SIZE,

              addRandomSuffix:
                true,

              tokenPayload:
                JSON.stringify({
                  listingId:
                    listing.id,

                  userId:
                    user.id,

                  fileName,
                }),
            };
          },


        onUploadCompleted:
          async ({
            blob,
            tokenPayload,
          }) => {
            let payload: {
              listingId?: unknown;
              userId?: unknown;
              fileName?: unknown;
            };

            try {
              payload =
                JSON.parse(
                  tokenPayload ||
                    "{}"
                ) as {
                  listingId?: unknown;
                  userId?: unknown;
                  fileName?: unknown;
                };
            } catch {
              throw new Error(
                "UngÃ¼ltiger Autopilot-Upload-Kontext."
              );
            }

            const listingId =
              typeof payload.listingId ===
                "string"
                ? payload.listingId.trim()
                : "";

            const userId =
              typeof payload.userId ===
                "string"
                ? payload.userId.trim()
                : "";

            if (
              !listingId ||
              !userId
            ) {
              throw new Error(
                "Autopilot-Upload-Kontext fehlt."
              );
            }

            const listing =
              await prisma.listing
                .findFirst({
                  where: {
                    id:
                      listingId,

                    userId,

                    archivedAt:
                      null,
                  },

                  select: {
                    id: true,
                    projectName:
                      true,
                  },
                });

            if (
              !listing ||
              listing.projectName !==
                AUTOPILOT_PROJECT_NAME
            ) {
              throw new Error(
                "Autopilot-Entwurf existiert nicht mehr."
              );
            }

            const metadata =
              await head(
                blob.pathname
              );

            const isPdf =
              metadata.contentType ===
              "application/pdf";

            const isImage =
              [
                "image/jpeg",
                "image/png",
                "image/webp",
              ].includes(
                metadata.contentType
              );

            const maximumSize =
              isPdf
                ? MAX_DOCUMENT_SIZE
                : MAX_IMAGE_SIZE;

            if (
              metadata.size <= 0 ||
              metadata.size >
                maximumSize ||
              (
                !isPdf &&
                !isImage
              )
            ) {
              throw new Error(
                "Ungültige Autopilot-Datei."
              );
            }

            /*
             * Dokumente bleiben als Blob gespeichert.
             * Sie werden NICHT als ListingImage registriert.
             * /api/autopilot/run verarbeitet sie später
             * als Exposé-/Dokumentquelle.
             */
            if (
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
            }

            const existing =
              await prisma.listingImage
                .findUnique({
                  where: {
                    storageKey:
                      blob.pathname,
                  },
                });

            if (existing) {
              return;
            }

            const imageCount =
              await prisma.listingImage
                .count({
                  where: {
                    listingId,
                  },
                });

            if (
              imageCount >=
              MAX_IMAGE_COUNT
            ) {
              return;
            }

            await prisma.listingImage
              .create({
                data: {
                  listingId,

                  url:
                    metadata.url,

                  storageKey:
                    metadata.pathname,

                  fileName:
                    safeFileName(
                      payload.fileName
                    ),

                  mimeType:
                    metadata.contentType,

                  sizeBytes:
                    metadata.size,

                  position:
                    imageCount,

                  isPrimary:
                    imageCount === 0,

                  analysisStatus:
                    "not_analyzed",
                },
              });
          },
      });

    return NextResponse.json(
      response
    );
  } catch (error) {
    console.error(
      "[autopilot/upload]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Autopilot-Upload fehlgeschlagen.";

    return NextResponse.json(
      {
        success: false,
        error:
          message,
      },
      {
        status:
          message ===
          "Bitte zuerst einloggen."
            ? 401
            : 400,
      }
    );
  }
}
