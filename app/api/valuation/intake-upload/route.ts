import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";

import {
  issueSignedToken,
} from "@vercel/blob";

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
  getAuthenticatedUser,
} from "@/lib/session";


export const runtime =
  "nodejs";


const MAX_PDF_SIZE =
  15 * 1024 * 1024;

const MAX_IMAGE_SIZE =
  8 * 1024 * 1024;


const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];


type ClientPayload = {
  listingId?: string;
  size?: number;
  contentType?: string;
};


export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        HandleUploadPresignedBody;

    const jsonResponse =
      await handleUploadPresigned({
        body,
        request,

        getSignedToken:
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
              ClientPayload = {};

            try {
              payload =
                clientPayload
                  ? JSON.parse(
                      clientPayload
                    )
                  : {};
            } catch {
              throw new Error(
                "UngÃ¼ltige Upload-Daten."
              );
            }

            const listingId =
              payload.listingId
                ?.trim() || "";

            const size =
              Number(
                payload.size
              );

            const expectedPathPrefix =
              "valuation-intake/" +
              (
                listingId ||
                "standalone"
              ) +
              "/";

            if (
              !pathname.startsWith(
                expectedPathPrefix
              )
            ) {
              throw new Error(
                "Ungültiger Upload-Pfad."
              );
            }
            const contentType =
              typeof payload.contentType ===
                "string"
                ? payload.contentType
                    .trim()
                    .toLowerCase()
                : "";

            const isPdf =
              contentType ===
                "application/pdf";

            const isImage =
              contentType ===
                "image/jpeg" ||
              contentType ===
                "image/png" ||
              contentType ===
                "image/webp";

            if (
              !isPdf &&
              !isImage
            ) {
              throw new Error(
                "Erlaubt sind PDF, JPG, PNG und WEBP."
              );
            }

            if (listingId) {
              const listing =
                await prisma.listing
                  .findFirst({
                    where: {
                      id:
                        listingId,

                      userId:
                        user.id,
                    },

                    select: {
                      id: true,
                    },
                  });

              if (!listing) {
                throw new Error(
                  "Das Objekt wurde nicht gefunden."
                );
              }
            }

            if (
              !Number.isFinite(
                size
              ) ||
              size <= 0
            ) {
              throw new Error(
                "UngÃ¼ltige DateigrÃ¶sse."
              );
            }

            const maximumSize =
              isPdf
                ? MAX_PDF_SIZE
                : MAX_IMAGE_SIZE;

            if (
              size >
              maximumSize
            ) {
              throw new Error(
                isPdf
                  ? "Eine PDF-Datei darf maximal 15 MB gross sein."
                  : "Ein Bild darf maximal 8 MB gross sein."
              );
            }

            const validUntil =
              Date.now() +
              15 * 60 * 1000;

            const signedToken =
              await issueSignedToken({
                pathname,

                operations:
                  ["put"],

                validUntil,

                allowedContentTypes:
                  [contentType],

                maximumSizeInBytes:
                  maximumSize,
              });

            return {
              token:
                signedToken,

              urlOptions: {
                allowedContentTypes:
                  [contentType],

                maximumSizeInBytes:
                  maximumSize,

                addRandomSuffix:
                  false,

                tokenPayload:
                  JSON.stringify({
                    userId:
                      user.id,

                    listingId:
                      listingId ||
                      null,

                    pathname,
                  }),
              },
            };
          },

        onUploadCompleted:
          async () => {
            /*
             * V1:
             * Die Analyse bekommt die
             * Blob-Referenz direkt vom
             * Browser zurÃ¼ck.
             *
             * Persistenz folgt erst,
             * wenn der Analyseflow
             * sauber funktioniert.
             */
          },
      });

    return NextResponse.json(
      jsonResponse
    );
  } catch (error) {
    console.error(
      "[valuation/intake-upload]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload konnte nicht vorbereitet werden.",
      },
      {
        status: 400,
      }
    );
  }
}
