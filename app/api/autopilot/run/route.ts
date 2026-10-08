import OpenAI from "openai";

import {
  createStorageReadUrl,
  deleteObjects,
  getObjectBytes,
  headObject,
  putObject,
} from "@/lib/storage/storage.server";

import {
  generateListingTextVariants,
} from "@/lib/listing-text-engine.server";

import {
  extractPdfImages,
} from "@/lib/pdf-extract-images.server";

import {
  extractPdfDocumentFacts,
} from "@/lib/pdf-document-facts.server";

import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
  after,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  buildLocationDescription,
  findLocation,
} from "@/app/api/location-assistant/route";

import {
  resolveListingAddress,
} from "@/lib/listing-location";

import {
  requestSwissMarketValuation,
  type InseratAIPropertyType,
} from "@/lib/valuation-market-provider";

import {
  prepareAutopilotPublicationForUser,
  type AutopilotPublicationPreparation,
} from "@/lib/portal-integrations/autopilot-publication.server";

import {
  createPreparedPublicationRun,
  type PreparedPublicationTarget,
} from "@/lib/publication-orchestrator/publication-run-preparation.server";
import {
  runPublicationAutopilotAfterApproval,
} from "@/lib/publication-orchestrator/publication-autopilot.server";
import {
  BROKER_MARKETING_APPROVAL_REQUIRED,
  isBrokerMarketingApproved,
} from "@/lib/broker-workflow/marketing-approval-guard.server";


export const runtime =
  "nodejs";


const AUTOPILOT_PROJECT_NAME =
  "Autopilot-Entwurf";

const MAX_IMAGE_COUNT =
  20;

const MAX_DOCUMENT_COUNT =
  10;

const MAX_UPLOAD_COUNT =
  MAX_IMAGE_COUNT +
  MAX_DOCUMENT_COUNT;

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  50 * 1024 * 1024;


type UploadedImageRef = {
  pathname?: unknown;
  fileName?: unknown;
};


type AutopilotRunBody = {
  listingId?: unknown;
  uploads?: unknown;
};


type ImageAnalysis = {
  imageIndex: number;
  room: string;
  condition: string;
  visibleFacts: string[];
  category: string;
  qualityScore: number;
  titleScore: number;
  suitable: boolean;
};


type GeneratedVariant = {
  title: string;
  text: string;
};


type AutopilotResult = {
  street: string;
  postalCode: string;
  location: string;
  propertyType: string;
  rooms: number | null;
  livingArea: number | null;
  price: number | null;
  landArea: number | null;
  yearBuilt: number | null;
  renovationYear: number | null;
  condition: string;
  standard: string;
  floor: number | null;
  lift: string;
  parking: string;
  outdoorArea: string;
  view: string;
  style: string;
  highlights: string[];
  summary: string;
  imageAnalyses: ImageAnalysis[];
  variants: GeneratedVariant[];
};


function safeString(
  value: unknown,
  maxLength = 500
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maxLength
    );
}


function safeStringArray(
  value: unknown,
  maximum: number
): string[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is string =>
        typeof item ===
          "string" &&
        item.trim().length > 0
    )
    .map(
      (item) =>
        item.trim()
    )
    .slice(
      0,
      maximum
    );
}


function extractOutputText(
  payload: unknown
): string {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return "";
  }

  const root =
    payload as {
      output?: unknown;
    };

  if (
    !Array.isArray(
      root.output
    )
  ) {
    return "";
  }

  for (
    const outputItem
    of root.output
  ) {
    if (
      typeof outputItem !==
        "object" ||
      outputItem === null
    ) {
      continue;
    }

    const content =
      (
        outputItem as {
          content?: unknown;
        }
      ).content;

    if (
      !Array.isArray(
        content
      )
    ) {
      continue;
    }

    for (
      const contentItem
      of content
    ) {
      if (
        typeof contentItem !==
          "object" ||
        contentItem === null
      ) {
        continue;
      }

      const candidate =
        contentItem as {
          type?: unknown;
          text?: unknown;
        };

      if (
        candidate.type ===
          "output_text" &&
        typeof candidate.text ===
          "string"
      ) {
        return candidate.text;
      }
    }
  }

  return "";
}


export async function POST(
  request: NextRequest
) {
  const autopilotTotalStartedAt = Date.now();

  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !process.env
        .OPENAI_API_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OPENAI_API_KEY fehlt.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (
        await request
          .json()
          .catch(
            () => null
          )
      ) as
        | AutopilotRunBody
        | null;

    const listingId =
      typeof body?.listingId ===
        "string"
        ? body.listingId.trim()
        : "";

    if (
      !listingId ||
      listingId.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültiger Autopilot-Entwurf.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        body?.uploads
      ) ||
      body.uploads.length ===
        0 ||
      body.uploads.length >
        MAX_UPLOAD_COUNT
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Autopilot benötigt 1 bis 10 Bilder und optional ein Exposé-PDF.",
        },
        {
          status: 400,
        }
      );
    }

    const uploads =
      body.uploads as
        UploadedImageRef[];

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
            market:
              true,
            countryCode:
              true,
            location:
              true,
            postalCode:
              true,
            propertyType:
              true,
            rooms:
              true,
            livingArea:
              true,
            price:
              true,
          },
        });

    if (
      !listing ||
      listing.projectName !==
        AUTOPILOT_PROJECT_NAME
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Autopilot-Entwurf wurde nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }


    /*
     * Uploads serverseitig bestätigen
     * und sicher mit dem Draft verbinden.
     */
    const registeredImages:
      Array<{
        id: string;
        url: string;
        storageKey: string;
        fileName: string | null;
        position: number;
      }> = [];

    const registeredDocuments:
      Array<{
        url: string;
        pathname: string;
        fileName: string | null;
      }> = [];

    let registeredImageCount =
      0;

    let registeredDocumentCount =
      0;

    for (
      let index = 0;
      index < uploads.length;
      index++
    ) {
      const upload =
        uploads[index];

      const pathname =
        typeof upload.pathname ===
          "string"
          ? upload.pathname.trim()
          : "";

      const fileName =
        safeString(
          upload.fileName,
          255
        ) || null;

      const expectedPrefix =
        `autopilot/${listing.id}/`;

      if (
        !pathname ||
        !pathname.startsWith(
          expectedPrefix
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ein Upload gehört nicht zu diesem Autopilot-Objekt.",
          },
          {
            status: 400,
          }
        );
      }

      const metadata =
        await headObject(
          pathname
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

      if (isPdf) {
        registeredDocumentCount++;

        if (
          registeredDocumentCount >
          MAX_DOCUMENT_COUNT
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Bitte maximal 10 PDF-Dokumente hochladen.",
            },
            {
              status: 400,
            }
          );
        }
      }

      if (isImage) {
        registeredImageCount++;

        if (
          registeredImageCount >
          MAX_IMAGE_COUNT
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Bitte maximal 20 Bilder hochladen.",
            },
            {
              status: 400,
            }
          );
        }
      }

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
        return NextResponse.json(
          {
            success: false,
            error:
              "Eine hochgeladene Datei ist ungültig.",
          },
          {
            status: 400,
          }
        );
      }

      if (isPdf) {
        registeredDocuments.push({
          url:
            metadata.url,

          pathname:
            metadata.pathname,

          fileName,
        });

        continue;
      }

      const existing =
        await prisma
          .listingImage
          .findUnique({
            where: {
              storageKey:
                metadata.pathname,
            },
          });

      if (
        existing &&
        existing.listingId !==
          listing.id
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ein Bild ist bereits einem anderen Objekt zugeordnet.",
          },
          {
            status: 409,
          }
        );
      }

      const image =
        existing
          ? await prisma
              .listingImage
              .update({
                where: {
                  id:
                    existing.id,
                },

                data: {
                  url:
                    metadata.url,

                  fileName,

                  mimeType:
                    metadata.contentType,

                  sizeBytes:
                    metadata.size,

                  analysisStatus:
                    "analyzing",
                },

                select: {
                  id: true,
                  url: true,
                  storageKey: true,
                  fileName:
                    true,
                  position:
                    true,
                },
              })
          : await prisma
              .listingImage
              .create({
                data: {
                  listingId:
                    listing.id,

                  url:
                    metadata.url,

                  storageKey:
                    metadata.pathname,

                  fileName,

                  mimeType:
                    metadata.contentType,

                  sizeBytes:
                    metadata.size,

                  position:
                    index,

                  isPrimary:
                    index === 0,

                  analysisStatus:
                    "analyzing",
                },

                select: {
                  id: true,
                  url: true,
                  storageKey: true,
                  fileName:
                    true,
                  position:
                    true,
                },
              });

      registeredImages.push(
        image
      );
    }

    /*
     * EIN gemeinsamer AI-Aufruf.
     * Alle Bilder werden zusammen betrachtet,
     * damit aus einzelnen Räumen ein Objekt
     * entsteht.
     */
    const content:
      Array<
        Record<
          string,
          unknown
        >
      > = [
        {
          type:
            "input_text",

          text:
            [
              "Du bist der Autopilot von Inserat-AI.",
              "",
              "Erstelle aus Exposé/Dokumenten und Immobilienbildern automatisch ein vollständiges, seriöses Immobilieninserat.",
              "",
              "QUELLENHIERARCHIE:",
              "1. Explizite Angaben aus Exposé oder Dokumenten haben Vorrang.",
              "2. Bereits vorhandene Objektdaten dürfen verwendet werden.",
              "3. Bilder dienen für sichtbare Merkmale, Raumtyp, Zustand, Ausstattung und Stil.",
              "",
              "WAHRHEITSREGELN:",
              "- Erfinde niemals Fakten.",
              "- street, postalCode und location nur übernehmen, wenn sie ausdrücklich aus Dokumenten oder vorhandenen Objektdaten hervorgehen.",
              "- rooms, livingArea und price nur übernehmen, wenn sie ausdrücklich aus Dokumenten oder vorhandenen Objektdaten hervorgehen.",
              "- Adresse, Zimmerzahl, Wohnfläche und Preis niemals aus Bildern ableiten oder schätzen.",
              "- Dokumentierte Werte niemals durch eine Bildschätzung ersetzen.",
              "- Wenn ein Wert nicht zuverlässig vorhanden ist, gib für Textfelder eine leere Zeichenfolge und für numerische Felder null zurück.",
              "- propertyType darf aus Dokumenten übernommen werden. Nur wenn kein Dokumentwert vorhanden ist, darf eine eindeutig erkennbare Objektart aus den Bildern verwendet werden.",
              "- Bilder dürfen für sichtbare Räume, Zustand, Ausstattung, Materialien, Aussicht und Stil ausgewertet werden.",
              "- Unsichere sichtbare Merkmale nicht als Tatsache formulieren.",
              "- Beschreibe den Zustand neutral.",
              "- Keine übertriebenen Werbeversprechen.",
              "- Die Reihenfolge der imageAnalyses muss über imageIndex eindeutig den Bildern entsprechen.",
              "- Extrahiere ausschliesslich die belegten Objektdaten fuer das strukturierte CORE-Schema.",
              "- highlights: maximal 5 kurze, belegte Merkmale.",
              "- summary: maximal 2 kurze Saetze mit den wichtigsten belegten Eigenschaften.",
              "- Keine Inseratvarianten oder langen Verkaufstexte erzeugen.",
              " - Fehlende oder unsichere Fakten niemals erfinden.",
              "- PREISREGEL: Wenn im Expose ein eindeutiger Kaufpreis, Verkaufspreis oder Angebotspreis fuer das angebotene Objekt genannt wird, MUSS price diesen Betrag als reine Zahl enthalten.",
              "- Schweizer Preisformate wie CHF 1'290'000, CHF 1?290?000, CHF 1 290 000 oder Fr. 1'290'000.- sind numerisch zu normalisieren, zum Beispiel auf 1290000.",
              "- Nebenkosten, Mietpreise, Quadratmeterpreise, Hypotheken, Steuerwerte oder Schaetzwerte niemals als Verkaufspreis uebernehmen.",
              "- price darf nur null sein, wenn in den bereitgestellten Objektdokumenten kein eindeutiger Objektpreis belegt ist.",
              "- ZIMMERREGEL: Wenn eine eindeutige Zimmerzahl genannt wird, MUSS rooms diese Zahl enthalten. Schreibweisen wie 5? Zimmer, 5.5 Zimmer oder 5,5 Zimmer sind als 5.5 zu normalisieren.",
              "- rooms darf nur null sein, wenn in den bereitgestellten Objektdokumenten keine eindeutige Zimmerzahl belegt ist.",
              "- Keine Preise oder Zimmerzahlen erfinden oder aus anderen Angaben schaetzen.",
              "- ADRESSREGEL: street, postalCode und location muessen ausschliesslich die Adresse des angebotenen Verkaufs-/Mietobjekts beschreiben.",
              "- Kontakt-, Makler-, Anbieter-, Firmen-, Verwaltungs-, Rechnungs- oder Buero-Adressen niemals als Objektadresse uebernehmen.",
              "- Wenn das Expose mehrere Adressen oder Ortsnamen enthaelt, bestimme anhand des Dokumentkontexts, welche Adresse eindeutig zum angebotenen Objekt gehoert.",
              "- Ein Ort, der nur bei Makler-, Anbieter- oder Kontaktdaten erscheint, ist keine Objektlage.",
              "- Wenn die Objektadresse nicht eindeutig belegt ist, gib fuer die unsicheren Adressfelder null zurueck statt eine andere Adresse zu raten.",
              "",
              `Markt: ${listing.market || listing.countryCode || "CH"}`,
              "",
              "Exposé/Dokumente und Bilder folgen jetzt.",
            ].join(
              "\n"
            ),
        },
      ];


    await Promise.all(
      registeredDocuments.map(
        async (
          document,
          index
        ) => {
          const documentReadUrl =
            await createStorageReadUrl(
              document.pathname,
              300
            );
          content.push({
            type:
              "input_text",

            text:
              `EXPOSÉ ${index + 1}` +
              (
                document.fileName
                  ? ` - ${document.fileName}`
                  : ""
              ),
          });

          content.push({
            type:
              "input_file",

            file_url:
              documentReadUrl,
          });
        }
      )
    );

    // FAST READY V1: CORE processes documents/data only.
    // Image analysis stays in the dedicated Creative/Vision stage.
   const aiStartedAt = Date.now();

const aiResponsePromise = fetch(
        "https://api.openai.com/v1/responses",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.OPENAI_API_KEY}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              model:
                process.env
                  .OPENAI_AUTOPILOT_MODEL ||
                "gpt-4.1-mini",

              store:
                false,

              max_output_tokens:
                900,

              input: [
                {
                  role:
                    "user",

                  content,
                },
              ],

              text: {
                format: {
                  type:
                    "json_schema",

                  name:
                    "inserat_ai_autopilot_core",

                  strict:
                    true,

                  schema: {
                    type:
                      "object",

                    additionalProperties:
                      false,

                    required: [
                      "street",
                      "postalCode",
                      "location",
                      "propertyType",
                      "rooms",
                      "livingArea",
                      "price",
                      "landArea",
                      "yearBuilt",
                      "renovationYear",
                      "condition",
                      "standard",
                      "floor",
                      "lift",
                      "parking",
                      "outdoorArea",
                      "view",
                      "style",
                      "highlights",
                      "summary",
                    ],

                    properties: {
                      street: {
                        type:
                          "string",
                      },

                      postalCode: {
                        type:
                          "string",
                      },

                      location: {
                        type:
                          "string",
                      },

                      propertyType: {
                        type:
                          "string",
                      },

                      rooms: {
                        type: [
                          "number",
                          "null",
                        ],
                      },

                      livingArea: {
                        type: [
                          "number",
                          "null",
                        ],
                      },

                      price: {
                        type: [
                          "number",
                          "null",
                        ],
                      },
                      landArea: {
                        type: [
                          "number",
                          "null",
                        ],
                      },

                      yearBuilt: {
                        type: [
                          "integer",
                          "null",
                        ],
                      },

                      renovationYear: {
                        type: [
                          "integer",
                          "null",
                        ],
                      },

                      condition: {
                        type: "string",
                        enum: [
                          "",
                          "new",
                          "very-good",
                          "good",
                          "average",
                          "renovation",
                        ],
                      },

                      standard: {
                        type: "string",
                        enum: [
                          "",
                          "simple",
                          "standard",
                          "good",
                          "luxury",
                        ],
                      },

                      floor: {
                        type: [
                          "number",
                          "null",
                        ],
                      },

                      lift: {
                        type: "string",
                        enum: [
                          "",
                          "yes",
                          "no",
                        ],
                      },

                      parking: {
                        type: "string",
                        enum: [
                          "",
                          "none",
                          "outdoor",
                          "garage",
                          "underground",
                          "multiple",
                        ],
                      },

                      outdoorArea: {
                        type: "string",
                        enum: [
                          "",
                          "none",
                          "balcony",
                          "terrace",
                          "garden",
                          "multiple",
                        ],
                      },

                      view: {
                        type: "string",
                        enum: [
                          "",
                          "normal",
                          "quiet",
                          "open",
                          "mountain",
                          "lake",
                          "premium",
                        ],
                      },

                      style: {
                        type:
                          "string",
                      },

                      highlights: {
                        type:
                          "array",

                        maxItems:
                          6,

                        items: {
                          type:
                            "string",
                        },
                      },

                      summary: {
                        type:
                          "string",
                      },

                    },
                  },
                },
              },
            }),
        }
      );


/*
    * PDF IMAGE PREP V2
    * /run guarantees PDF images before Vision starts.
    */
   /*
    * SPEED PATH:
    * Reuse PDF images already extracted by /upload.
    * Keep the existing /run extraction as fallback.
    */
   if (registeredDocuments.length > 0) {
     const uploadedPdfImages =
       await prisma.listingImage.findMany({
         where: {
           listingId: listing.id,

           storageKey: {
             startsWith:
               "autopilot/" +
               listing.id +
               "/pdf-images/",
           },
         },

         orderBy: {
           position: "asc",
         },

         take: Math.max(
           0,
           20 - registeredImages.length
         ),

         select: {
           id: true,
           url: true,
                  storageKey: true,
           fileName: true,
           position: true,
         },
       });

     const alreadyRegisteredIds =
       new Set(
         registeredImages.map(
           image => image.id
         )
       );

     const reusablePdfImages =
       uploadedPdfImages.filter(
         image =>
           !alreadyRegisteredIds.has(
             image.id
           )
       );

     registeredImages.push(
       ...reusablePdfImages
     );

     console.info(
       "[AUTOPILOT_REUSE_UPLOADED_PDF_IMAGES]",
       {
         listingId: listing.id,
         reused: reusablePdfImages.length,
         registeredImages:
           registeredImages.length,
       }
     );
   }
   const remainingPdfImageSlots =
     Math.max(
       0,
       20 - registeredImages.length
     );

   let documentRoomsFallback:
     number | null = null;

   if (
     registeredDocuments.length > 0
   ) {
     try {
       const pdfImageBatches =
         await Promise.all(
           registeredDocuments.map(
             async (document) => {
               const pdfBytes =
                 await getObjectBytes(
                   document.pathname
                 );

               const pdfBuffer =
                 Buffer.from(
                   pdfBytes
                 );

               const [
                 images,
                 facts,
               ] =
                 await Promise.all([
                   remainingPdfImageSlots > 0
                     ? extractPdfImages(
                         pdfBuffer,
                         remainingPdfImageSlots
                       )
                     : Promise.resolve([]),
                   extractPdfDocumentFacts(
                     pdfBuffer
                   ),
                 ]);

              console.info(
  "[AUTOPILOT_PDF_FACT]",
  {
    listingId: listing.id,
    fileName:
      document.fileName,
    bytes:
      pdfBuffer.byteLength,
    rooms:
      facts.rooms,
    evidence:
      facts.evidence,
  }
);

               return {
                 images,
                 facts,
               };
             }
           )
         );

       const extractedPdfImages =
         pdfImageBatches
           .flatMap(
             (batch) => batch.images
           )
           .slice(
             0,
             remainingPdfImageSlots
           );

       const documentRoomCandidates =
         pdfImageBatches
           .map(
             (batch) => batch.facts.rooms
           )
           .filter(
             (rooms): rooms is number =>
               typeof rooms === "number" &&
               Number.isFinite(rooms) &&
               rooms > 0
           );

       const uniqueDocumentRooms =
         Array.from(
           new Set(
             documentRoomCandidates
           )
         );

       if (
         uniqueDocumentRooms.length === 1
       ) {
         documentRoomsFallback =
           uniqueDocumentRooms[0];

         console.info(
           "[AUTOPILOT_DOCUMENT_ROOMS]",
           {
             listingId: listing.id,
             rooms:
               documentRoomsFallback,
             source:
               "pdf-text",
           }
         );
       } else if (
         uniqueDocumentRooms.length > 1
       ) {
         console.warn(
           "[AUTOPILOT_DOCUMENT_ROOMS_CONFLICT]",
           {
             listingId: listing.id,
             candidates:
               uniqueDocumentRooms,
           }
         );
       }

      const firstPdfImagePosition =
        registeredImages.length;

      const createdPdfImages =
        await Promise.all(
          extractedPdfImages.map(
            async (image, index) => {
              const position =
                firstPdfImagePosition + index;

              const pathname =
                "autopilot/" +
                listing.id +
                "/run-pdf-images/" +
                Date.now() +
                "-" +
                index +
                ".jpg";

              const stored =
                await putObject({
                  pathname,
                  body: image.buffer,
                  contentType: "image/jpeg",
                });

              return prisma.listingImage.create({
                data: {
                  listingId: listing.id,
                  url: stored.url,
                  storageKey: stored.pathname,
                  fileName:
                    "pdf-image-" +
                    (position + 1) +
                    ".jpg",
                  mimeType: "image/jpeg",
                  sizeBytes: image.buffer.length,
                  position,
                  isPrimary: position === 0,
                  analysisStatus: "not_analyzed",
                },
                select: {
                  id: true,
                  url: true,
                  storageKey: true,
                  fileName: true,
                  position: true,
                },
              });
            }
          )
        );

      registeredImages.push(
        ...createdPdfImages
      );

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
         "[AUTOPILOT_RUN_PDF_IMAGES_FAILED] error=" + (pdfImageError instanceof Error ? pdfImageError.message : String(pdfImageError)),
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
     Date.now() - autopilotTotalStartedAt;

   console.info("[AUTOPILOT_PREP_TIMING]", {
     durationMs: prepDurationMs,
     durationSeconds: Number(
       (prepDurationMs / 1000).toFixed(2)
     ),
   });

   /*
    * FAST READY V3 - CORE + VISION PARALLEL
    */
   const creativeStartedAt = Date.now();

   const creativeContent: Array<Record<string, unknown>> = [
     {
       type: "input_text",
       text:
         "Analysiere ausschliesslich die bereitgestellten Immobilienbilder. " +
         "Erfinde keine nicht sichtbaren Fakten. " +
         "Gib fuer jedes Bild imageIndex, Raumtyp, sichtbaren Zustand und maximal zwei sehr kurze sichtbare Merkmale zurueck. " +
         "Bewerte ausserdem category, qualityScore von 0 bis 100, titleScore von 0 bis 100 und suitable. " +
         "titleScore bewertet ausschliesslich die Eignung als verkaufsstarkes Titelbild. " +
         "Bevorzuge helle, klare, attraktive Wohnraeume oder eine starke Aussenansicht. " +
         "Grundrisse, Logos, Dokumentseiten, unscharfe, dunkle oder offensichtlich ungeeignete Bilder erhalten einen niedrigen titleScore. " +
         "imageIndex beginnt bei 1 und entspricht exakt der Reihenfolge der Bilder.",
     },
   ];

   const visionImageInputs =
     await Promise.all(
       registeredImages.map(
         async (image, index) => {
           const imageReadUrl =
             image.url ||
             await createStorageReadUrl(
               image.storageKey,
               300
             );

           return {
             index,
             imageReadUrl,
           };
         }
       )
     );

   visionImageInputs.forEach(
     ({ index, imageReadUrl }) => {
       creativeContent.push({
         type: "input_text",
         text: `Bild ${index + 1}`,
       });

       creativeContent.push({
         type: "input_image",
         image_url: imageReadUrl,
         detail: "low",
       });
     }
   );

   const visionResponsePromise =
     registeredImages.length > 0
       ? fetch(
           "https://api.openai.com/v1/responses",
           {
             method: "POST",
             headers: {
               Authorization:
                 `Bearer ${process.env.OPENAI_API_KEY}`,
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               model:
                 process.env.OPENAI_AUTOPILOT_MODEL ||
                 "gpt-4.1-mini",
               store: false,
               max_output_tokens: 2200,
               input: [
                 {
                   role: "user",
                   content: creativeContent,
                 },
               ],
               text: {
                 format: {
                   type: "json_schema",
                   name: "inserat_ai_autopilot_vision",
                   strict: true,
                   schema: {
                     type: "object",
                     additionalProperties: false,
                     properties: {
                       imageAnalyses: {
                         type: "array",
                         items: {
                           type: "object",
                           additionalProperties: false,
                           properties: {
                             imageIndex: { type: "integer" },
                             room: { type: "string" },
                             condition: { type: "string" },
                             visibleFacts: {
                               type: "array",
                               items: { type: "string" },
                               maxItems: 2,
                             },
                             category: {
                               type: "string",
                             },
                             qualityScore: {
                               type: "integer",
                               minimum: 0,
                               maximum: 100,
                             },
                             titleScore: {
                               type: "integer",
                               minimum: 0,
                               maximum: 100,
                             },
                             suitable: {
                               type: "boolean",
                             },
                           },
                           required: [
                             "imageIndex",
                             "room",
                             "condition",
                             "visibleFacts",
                             "category",
                             "qualityScore",
                             "titleScore",
                             "suitable",
                           ],
                         },
                       },
                     },
                     required: ["imageAnalyses"],
                   },
                 },
               },
             }),
           }
         )
       : Promise.resolve(null);

   const aiResponse =
  await aiResponsePromise;

const aiDurationMs =
  Date.now() - aiStartedAt;

console.info(
  "[AUTOPILOT_AI_TIMING]",
  {
    listingId: listing.id,
    durationMs: aiDurationMs,
    durationSeconds: Number(
      (aiDurationMs / 1000).toFixed(2)
    ),
  }
);
    const aiRawText =
      await aiResponse.text();

    let aiPayload: unknown =
      null;

    try {
      aiPayload =
        aiRawText
          ? JSON.parse(aiRawText)
          : null;
    } catch {
      aiPayload =
        aiRawText;
    }

    if (!aiResponse.ok) {
      console.error(
        "[autopilot/run] OpenAI_DIAGNOSTIC " +
          JSON.stringify({
            status:
              aiResponse.status,
            requestId:
              aiResponse.headers.get("x-request-id"),
            retryAfter:
              aiResponse.headers.get("retry-after"),
            remainingRequests:
              aiResponse.headers.get(
                "x-ratelimit-remaining-requests"
              ),
            remainingTokens:
              aiResponse.headers.get(
                "x-ratelimit-remaining-tokens"
              ),
            payload:
              aiPayload,
            raw:
              aiRawText,
          })
      );

      throw new Error(
        "Die automatische Bildanalyse konnte nicht abgeschlossen werden."
      );
    }


    const rawText =
      extractOutputText(
        aiPayload
      );

    if (!rawText) {
      throw new Error(
        "Inserat-AI hat kein Analyseergebnis zurückgegeben."
      );
    }


    let parsed:
      Partial<
        AutopilotResult
      >;

    try {
      parsed =
        JSON.parse(
          rawText
        ) as Partial<
          AutopilotResult
        >;
    } catch {
      throw new Error(
        "Das Autopilot-Ergebnis hatte kein gültiges JSON-Format."
      );
    }


    /*
     * FAST READY V3 - collect parallel VISION
     */
    console.info("[AUTOPILOT_CORE_FIELDS]", {
      listingId: listing.id,
      postalCode: parsed.postalCode ?? null,
      location: parsed.location ?? null,
      propertyType: parsed.propertyType ?? null,
      rooms: parsed.rooms ?? null,
      livingArea: parsed.livingArea ?? null,
      price: parsed.price ?? null,
    });

    const hasValidCoreRooms =
      typeof parsed.rooms === "number" &&
      Number.isFinite(parsed.rooms) &&
      parsed.rooms > 0;

    if (
      !hasValidCoreRooms &&
      documentRoomsFallback != null
    ) {
      parsed.rooms =
        documentRoomsFallback;

      console.info(
        "[AUTOPILOT_ROOMS_FALLBACK_APPLIED]",
        {
          listingId: listing.id,
          rooms:
            documentRoomsFallback,
          source: "pdf-text",
        }
      );
    }

    let visionImageAnalyses: ImageAnalysis[] = [];

    const creativeResponse =
      await visionResponsePromise;

    if (creativeResponse) {
      const creativeRawText =
        await creativeResponse.text();

      let creativePayload: unknown = null;

      try {
        creativePayload =
          creativeRawText
            ? JSON.parse(creativeRawText)
            : null;
      } catch {
        creativePayload = creativeRawText;
      }

      if (!creativeResponse.ok) {
        console.error(
          "[autopilot/run] VISION_OPENAI_DIAGNOSTIC " +
            JSON.stringify({
              status: creativeResponse.status,
              requestId:
                creativeResponse.headers.get(
                  "x-request-id"
                ),
              payload: creativePayload,
            })
        );

        throw new Error(
          "Inserat-AI konnte die Bilder nicht analysieren."
        );
      }

      const creativeOutputText =
        extractOutputText(creativePayload);

      if (!creativeOutputText) {
        throw new Error(
          "Inserat-AI hat kein Vision-Ergebnis zurueckgegeben."
        );
      }

      let creativeParsed: {
        imageAnalyses: ImageAnalysis[];
      };

      try {
        creativeParsed = JSON.parse(
          creativeOutputText
        ) as {
          imageAnalyses: ImageAnalysis[];
        };
      } catch (visionParseError) {
        console.error(
          "[AUTOPILOT_VISION_JSON_PARSE_FAILED] " +
            JSON.stringify({
              error:
                visionParseError instanceof Error
                  ? visionParseError.message
                  : String(visionParseError),
              outputLength: creativeOutputText.length,
              outputPreview: creativeOutputText.slice(0, 4000),
            })
        );
        throw new Error(
          "Das Vision-Ergebnis hatte kein gueltiges JSON-Format."
        );
      }

      visionImageAnalyses =
        Array.isArray(creativeParsed.imageAnalyses)
          ? creativeParsed.imageAnalyses
          : [];
    }

    parsed.imageAnalyses = visionImageAnalyses;

    const sanitizeAutopilotListingText = (
      value: string
    ): string => {
      let cleaned = value;

      if (parsed.rooms == null) {
        cleaned = cleaned
          .replace(
            /(?:mit\s+)?\d+(?:[.,]\d+)?\s*(?:Zimmern?|Zi\.?)(?:\s+und\s+)?/gi,
            ""
          )
          .replace(
            /\b\d+(?:[.,]\d+)?[-\s]?Zimmer[-\s]?(?:Wohnung|Haus|Objekt|Immobilie)\b/gi,
            ""
          );
      }

      return cleaned
        .replace(/\s+([,.;:])/g, "$1")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/^\s*[,;:\-]+\s*/g, "")
        .trim();
    };

    const fastTitleParts = [
      safeString(parsed.propertyType, 80),
      safeString(parsed.location, 80),
    ].filter(Boolean);

    const fastTitle =
      fastTitleParts.join(" in ") ||
      "Immobilienangebot";

    const fastTextParts = [
      safeString(parsed.summary, 4000),
      Array.isArray(parsed.highlights)
        ? parsed.highlights
            .map((item) => safeString(item, 300))
            .filter(Boolean)
            .join(" ")
        : "",
    ].filter(Boolean);

    const fastText =
      fastTextParts.join("\n\n") || fastTitle;

    const variantHighlights =
      Array.isArray(parsed.highlights)
        ? parsed.highlights
            .map((item) =>
              sanitizeAutopilotListingText(
                safeString(item, 300)
              )
            )
            .filter(Boolean)
        : [];

    const locationLabel =
      safeString(parsed.location, 80);

    const rawPropertyLabel =
      safeString(parsed.propertyType, 80);

    const propertyLabel =
      (() => {
        const normalized =
          rawPropertyLabel
            .trim()
            .toLowerCase();

        if (
          normalized === "house" ||
          normalized === "einfamilienhaus"
        ) {
          return "Einfamilienhaus";
        }

        if (
          normalized === "apartment" ||
          normalized === "wohnung"
        ) {
          return "Wohnung";
        }

        return rawPropertyLabel || "Immobilie";
      })();

    const listingTitle =
      locationLabel
        ? propertyLabel +
          " in " +
          locationLabel
        : propertyLabel;

    const summaryText =
      sanitizeAutopilotListingText(
        safeString(parsed.summary, 4000)
      ) ||
      listingTitle;

    const highlightsSentence =
      variantHighlights.length > 0
        ? variantHighlights.join(" · ")
        : "";

    const factualText =
      [
        summaryText,
        highlightsSentence,
      ]
        .filter(Boolean)
        .join("\n\n");

    const benefitText =
      [
        summaryText,
        highlightsSentence
          ? "Besonders hervorzuheben: " +
            highlightsSentence
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

    const compactText =
      [
        summaryText,
        highlightsSentence,
      ]
        .filter(Boolean)
        .join("\n\n");

    parsed.variants = [
      {
        title: listingTitle,
        text: factualText || listingTitle,
      },
      {
        title:
          locationLabel
            ? propertyLabel +
              " mit Charakter in " +
              locationLabel
            : propertyLabel +
              " mit Charakter",
        text: benefitText || summaryText,
      },
      {
        title:
          locationLabel
            ? propertyLabel +
              " in " +
              locationLabel +
              " entdecken"
            : propertyLabel +
              " entdecken",
        text: compactText || summaryText,
      },
    ];

    const creativeDurationMs =
      Date.now() - creativeStartedAt;

    console.info(
      "[AUTOPILOT_VISION_TIMING]",
      {
        listingId: listing.id,
        imageCount: registeredImages.length,
        durationMs: creativeDurationMs,
        durationSeconds:
          Number(
            (creativeDurationMs / 1000).toFixed(2)
          ),
      }
    );

    const postprocessStartedAt =
      Date.now();

    const street =
      safeString(
        parsed.street,
        200
      );

    const postalCode =
      safeString(
        parsed.postalCode,
        20
      );

    const location =
      safeString(
        parsed.location,
        200
      );

    const rawPropertyType =
      safeString(
        parsed.propertyType,
        120
      );

    const normalizedPropertyType =
      rawPropertyType
        .trim()
        .toLowerCase();

    const propertyTypeMap:
      Record<string, string> = {
        "house": "Einfamilienhaus",
        "single-family house": "Einfamilienhaus",
        "single-family-house": "Einfamilienhaus",
        "singlefamilyhouse": "Einfamilienhaus",
        "single family house": "Einfamilienhaus",
        "detached house": "Einfamilienhaus",
        "einfamilienhaus": "Einfamilienhaus",

        "apartment": "Wohnung",
        "flat": "Wohnung",
        "wohnung": "Wohnung",

        "condominium": "Eigentumswohnung",
        "condo": "Eigentumswohnung",
        "eigentumswohnung": "Eigentumswohnung",

        "multi-family house": "Mehrfamilienhaus",
        "multi family house": "Mehrfamilienhaus",
        "multifamily house": "Mehrfamilienhaus",
        "mehrfamilienhaus": "Mehrfamilienhaus",

        "terraced house": "Reihenhaus",
        "row house": "Reihenhaus",
        "reihenhaus": "Reihenhaus",

        "semi-detached house": "Doppelhaush?lfte",
        "semi detached house": "Doppelhaush?lfte",
        "doppelhaush?lfte": "Doppelhaush?lfte",

        "commercial property": "Gewerbeimmobilie",
        "gewerbeimmobilie": "Gewerbeimmobilie",

        "land": "Grundst?ck",
        "plot": "Grundst?ck",
        "grundst?ck": "Grundst?ck",
      };

    const propertyType =
      propertyTypeMap[
        normalizedPropertyType
      ] ||
      rawPropertyType ||
      "Immobilie";

    const coreRooms =
      typeof parsed.rooms ===
        "number" &&
      Number.isFinite(
        parsed.rooms
      ) &&
      parsed.rooms > 0
        ? parsed.rooms
        : null;

    const rooms =
      coreRooms ??
      documentRoomsFallback;



    const livingArea =
      typeof parsed.livingArea ===
        "number" &&
      Number.isFinite(
        parsed.livingArea
      ) &&
      parsed.livingArea > 0
        ? parsed.livingArea
        : null;

    const price =
      typeof parsed.price ===
        "number" &&
      Number.isFinite(
        parsed.price
      ) &&
      parsed.price >= 0
        ? parsed.price
        : null;

    const landArea =
      typeof parsed.landArea ===
        "number" &&
      Number.isFinite(
        parsed.landArea
      ) &&
      parsed.landArea > 0
        ? parsed.landArea
        : null;

    const yearBuilt =
      typeof parsed.yearBuilt ===
        "number" &&
      Number.isInteger(
        parsed.yearBuilt
      ) &&
      parsed.yearBuilt >= 1000 &&
      parsed.yearBuilt <=
        new Date().getFullYear() + 1
        ? parsed.yearBuilt
        : null;

    const renovationYear =
      typeof parsed.renovationYear ===
        "number" &&
      Number.isInteger(
        parsed.renovationYear
      ) &&
      parsed.renovationYear >= 1000 &&
      parsed.renovationYear <=
        new Date().getFullYear() + 1
        ? parsed.renovationYear
        : null;

    const condition =
      safeString(
        parsed.condition,
        40
      );

    const standard =
      safeString(
        parsed.standard,
        40
      );

    const floor =
      typeof parsed.floor ===
        "number" &&
      Number.isFinite(
        parsed.floor
      )
        ? parsed.floor
        : null;

    const lift =
      safeString(
        parsed.lift,
        20
      );

    const parking =
      safeString(
        parsed.parking,
        40
      );

    const outdoorArea =
      safeString(
        parsed.outdoorArea,
        40
      );

    const view =
      safeString(
        parsed.view,
        40
      );

    const style =
      safeString(
        parsed.style,
        120
      );

    const highlights =
      safeStringArray(
        parsed.highlights,
        6
      );

    const summary =
      safeString(
        parsed.summary,
        10000
      );


    const imageAnalyses =
      Array.isArray(
        parsed.imageAnalyses
      )
        ? parsed.imageAnalyses
            .filter(
              (
                item
              ): item is ImageAnalysis =>
                typeof item ===
                  "object" &&
                item !== null &&
                Number.isInteger(
                  (
                    item as ImageAnalysis
                  ).imageIndex
                )
            )
        : [];

    /*
     * STRICT VERIFIED FEATURES V2
     *
     * Fail-closed hotfix:
     * No vision-derived or AI-derived feature may
     * authorize a safety-critical property claim.
     *
     * Document provenance will be added separately.
     */
    const strictVerifiedFeatures = "";

    const verifiedFactContext = [
      landArea != null
        ? `Grundstuecksflaeche: ${landArea} m2`
        : "",
      yearBuilt != null
        ? `Baujahr: ${yearBuilt}`
        : "",
      renovationYear != null
        ? `Renovationsjahr: ${renovationYear}`
        : "",
      condition
        ? `Zustand: ${condition}`
        : "",
      standard
        ? `Standard: ${standard}`
        : "",
      floor != null
        ? `Etage/Geschoss: ${floor}`
        : "",
      lift
        ? `Lift: ${lift}`
        : "",
      parking
        ? `Parkierung: ${parking}`
        : "",
      outdoorArea
        ? `Aussenbereich: ${outdoorArea}`
        : "",
      view
        ? `Aussicht: ${view}`
        : "",
      summary
        ? `Dokumentierte Zusammenfassung: ${summary}`
        : "",
      ...imageAnalyses.flatMap(
        (analysis) =>
          safeStringArray(
            analysis.visibleFacts,
            2
          ).map(
            (fact) =>
              `Bild ${analysis.imageIndex}, sichtbar: ${fact}`
          )
      ),
    ]
      .filter(Boolean)
      .join("\n");

    const listingTextOpenAI =
      new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY,
      });

    const generatedText =
      await generateListingTextVariants(
        {
          locale: "de",
          market:
            listing.market === "DE"
              ? "DE"
              : "CH",
          location:
            location || undefined,
          propertyType:
            propertyType || undefined,
          rooms:
            rooms != null
              ? String(rooms)
              : undefined,
          livingArea:
            livingArea != null
              ? String(livingArea)
              : undefined,
          price:
            price != null
              ? String(price)
              : undefined,
          highlights:
            highlights.length
              ? highlights.join(", ")
              : undefined,
          styleText:
            style || undefined,
          imageAnalysis:
            verifiedFactContext ||
            undefined,
          verifiedFeatures:
            strictVerifiedFeatures ||
            undefined,
        },
        {
          openai:
            listingTextOpenAI,
        }
      );

    const variants =
      generatedText.variants
        .map((variant) => ({
          title:
            safeString(
              variant.title,
              200
            ),
          text:
            safeString(
              variant.text,
              12000
            ),
        }))
        .filter(
          (variant) =>
            variant.title &&
            variant.text
        )
        .slice(0, 3);

    if (
      variants.length !== 3
    ) {
      throw new Error(
        "Inserat-AI konnte nicht alle drei Inseratvarianten erzeugen."
      );
    }

    /*
     * Einzelanalysen speichern und Bilder automatisch
     * in eine verkaufsorientierte Reihenfolge bringen.
     */
    const categoryPriority = (
      category: string
    ) => {
      const value =
        category.toLowerCase();

      if (
        value.includes("living") ||
        value.includes("wohn")
      ) return 100;

      if (
        value.includes("exterior") ||
        value.includes("aussen") ||
        value.includes("fassade")
      ) return 95;

      if (
        value.includes("kitchen") ||
        value.includes("kueche") ||
        value.includes("k?che")
      ) return 90;

      if (
        value.includes("terrace") ||
        value.includes("balcony") ||
        value.includes("garten") ||
        value.includes("balkon") ||
        value.includes("terrasse")
      ) return 85;

      if (
        value.includes("bed") ||
        value.includes("schlaf")
      ) return 75;

      if (
        value.includes("bath") ||
        value.includes("bad")
      ) return 65;

      if (
        value.includes("floorplan") ||
        value.includes("grundriss") ||
        value.includes("document") ||
        value.includes("logo")
      ) return 10;

      return 50;
    };

    const rankedImages =
      registeredImages
        .map((image, index) => {
          const analysis =
            imageAnalyses.find(
              (item) =>
                item.imageIndex ===
                  index + 1
            );

          const qualityScore =
            typeof analysis?.qualityScore === "number"
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    analysis.qualityScore
                  )
                )
              : 50;

          const titleScore =
            typeof analysis?.titleScore === "number"
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    analysis.titleScore
                  )
                )
              : qualityScore;

          const suitable =
            typeof analysis?.suitable === "boolean"
              ? analysis.suitable
              : true;

          const category =
            safeString(
              analysis?.category,
              80
            );

          const rankingScore =
            (suitable ? 1000 : 0) +
            titleScore * 10 +
            qualityScore +
            categoryPriority(category);

          return {
            image,
            originalIndex: index,
            analysis,
            rankingScore,
          };
        })
        .sort(
          (a, b) =>
            b.rankingScore -
              a.rankingScore ||
            a.originalIndex -
              b.originalIndex
        );

    await Promise.all(
      rankedImages.map(
        async (
          ranked,
          position
        ) => {
          const analysis =
            ranked.analysis;

          const analysisText =
            analysis
              ? JSON.stringify({
                  room:
                    safeString(
                      analysis.room,
                      120
                    ),
                  condition:
                    safeString(
                      analysis.condition,
                      300
                    ),
                  visibleFacts:
                    safeStringArray(
                      analysis.visibleFacts,
                      5
                    ),
                  category:
                    safeString(
                      analysis.category,
                      80
                    ),
                  qualityScore:
                    typeof analysis.qualityScore ===
                    "number"
                      ? analysis.qualityScore
                      : 0,
                  titleScore:
                    typeof analysis.titleScore ===
                    "number"
                      ? analysis.titleScore
                      : 0,
                  suitable:
                    typeof analysis.suitable ===
                    "boolean"
                      ? analysis.suitable
                      : true,
                })
              : summary;

          await prisma
            .listingImage
            .update({
              where: {
                id:
                  ranked.image.id,
              },

              data: {
                position,
                isPrimary:
                  position === 0,

                analysis:
                  analysisText,

                analysisStatus:
                  "analyzed",

                analyzedAt:
                  new Date(),
              },
            });
        }
      )
    );

    console.info(
      "[AUTOPILOT_IMAGE_RANKING]",
      {
        listingId: listing.id,
        imageCount:
          rankedImages.length,
        primaryImageId:
          rankedImages[0]?.image.id ??
          null,
      }
    );


    /*
     * Das Objekt wird jetzt automatisch
     * vom leeren Draft zum Inserat.
     */
    const finalPropertyType =
      propertyType ||
      listing.propertyType ||
      "";

    /*
     * Schweizer Standort automatisch normalisieren.
     *
     * Dokument-/Listing-Daten bleiben die Quelle.
     * Die Location Engine validiert und normalisiert
     * lediglich PLZ und Ort.
     *
     * Deutschland wird bewusst übersprungen.
     */
    const effectivePostalCode =
      postalCode ||
      listing.postalCode ||
      "";

    const effectiveLocation =
      location ||
      listing.location ||
      "";

    const market =
      String(
        listing.market ||
        listing.countryCode ||
        ""
      )
        .trim()
        .toUpperCase();

    const isSwissMarket =
      market === "CH" ||
      market === "CHE" ||
      market === "SWITZERLAND" ||
      market === "SCHWEIZ";

    const swissLocationMatch =
      isSwissMarket &&
      (
        effectivePostalCode ||
        effectiveLocation
      )
        ? findLocation(
            effectivePostalCode,
            effectiveLocation
          )
        : null;

    const finalPostalCode =
      swissLocationMatch?.zip ||
      effectivePostalCode;

    const finalLocation =
      swissLocationMatch?.name ||
      effectiveLocation;

    const locationDescription =
      swissLocationMatch
        ? buildLocationDescription(
            swissLocationMatch
          )
        : "";

    const resolvedAddress =
      street &&
      finalPostalCode &&
      finalLocation
        ? await resolveListingAddress({
            countryCode:
              listing.countryCode ||
              undefined,
            market:
              listing.market === "CH" ||
              listing.market === "DE"
                ? listing.market
                : undefined,
            street,
            postalCode:
              finalPostalCode,
            city:
              finalLocation,
          })
        : null;

    const valuationPropertyType:
      InseratAIPropertyType | null =
      (() => {
        const value =
          propertyType
            .trim()
            .toLowerCase();

        if (
          [
            "apartment",
            "wohnung",
            "flat",
            "condominium",
            "eigentumswohnung",
          ].includes(value)
        ) {
          return "apartment";
        }

        if (
          [
            "house",
            "haus",
            "einfamilienhaus",
            "single-family-house",
            "single-family",
          ].includes(value)
        ) {
          return "house";
        }

        if (
          [
            "row-house",
            "row house",
            "reihenhaus",
            "terraced-house",
          ].includes(value)
        ) {
          return "row-house";
        }

        if (
          [
            "semi-detached",
            "semi detached",
            "doppelhaushälfte",
            "doppelhaushaelfte",
            "doppelhaus",
          ].includes(value)
        ) {
          return "semi-detached";
        }

        return null;
      })();

    const valuationLatitude =
      resolvedAddress?.latitude ??
      null;

    const valuationLongitude =
      resolvedAddress?.longitude ??
      null;

    const valuationReady =
      isSwissMarket &&
      valuationPropertyType !== null &&
      valuationLatitude !== null &&
      valuationLongitude !== null &&
      livingArea !== null &&
      livingArea >= 20 &&
      livingArea <= 800 &&
      yearBuilt !== null &&
      yearBuilt >= 1850 &&
      yearBuilt <=
        new Date().getFullYear() + 3 &&
      (
        valuationPropertyType ===
          "apartment" ||
        (
          landArea !== null &&
          landArea >= 50 &&
          landArea <= 5000
        )
      );

    console.info(
      "[AUTOPILOT_VALUATION_INPUTS]",
      {
        listingId: listing.id,
        isSwissMarket,
        valuationPropertyType,
        valuationLatitude,
        valuationLongitude,
        livingArea,
        landArea,
        yearBuilt,
        renovationYear,
        rooms,
        price,
        valuationReady,
      }
    );
    let marketValuation:
      Awaited<
        ReturnType<
          typeof requestSwissMarketValuation
        >
      > | null =
      null;

    let valuationStatus:
      | "not_applicable"
      | "needs_data"
      | "completed"
      | "provider_unavailable" =
      isSwissMarket
        ? "needs_data"
        : "not_applicable";

    /*
     * FAST READY V4
     * External market valuation is outside
     * the synchronous READY critical path.
     */
    const runSynchronousValuation = false;

    if (
      runSynchronousValuation &&
      valuationReady &&
      valuationPropertyType &&
      valuationLatitude !== null &&
      valuationLongitude !== null &&
      livingArea !== null &&
      yearBuilt !== null
    ) {
      try {
        marketValuation =
          await requestSwissMarketValuation({
            latitude:
              valuationLatitude,

            longitude:
              valuationLongitude,

            propertyType:
              valuationPropertyType,

            livingArea,

            buildingYear:
              yearBuilt,

            landArea,

            renovationYear,

            numberOfRooms:
              rooms,

            floorNumber:
              floor,

            hasLift:
              valuationPropertyType ===
                "apartment"
                ? lift === "yes"
                  ? true
                  : lift === "no"
                    ? false
                    : null
                : null,
          });

        valuationStatus =
          "completed";
      } catch (error) {
        console.error(
          "[AUTOPILOT_VALUATION_FAIL_OPEN]",
          error
        );

        valuationStatus =
          "provider_unavailable";
      }
    }

    /*
     * AUTOPILOT VALUATION PROVIDER FALLBACK V1
     *
     * A provider outage/quota limit must not erase the fact that
     * Inserat-AI successfully extracted a valuation-ready property.
     * No synthetic market price is created here.
     */
    if (
      valuationStatus === "provider_unavailable" &&
      valuationReady &&
      valuationPropertyType &&
      valuationLatitude !== null &&
      valuationLongitude !== null &&
      livingArea !== null &&
      yearBuilt !== null
    ) {
      const fallbackNow =
        new Date();

      const fallbackAddressLabel =
        [
          street,
          postalCode,
          location,
        ]
          .filter(
            (
              value
            ): value is string =>
              typeof value === "string" &&
              value.trim().length > 0
          )
          .join(", ");

      const fallbackValuation =
        await prisma.$transaction(
          async (tx) => {
            const valuation =
              await tx.valuation.create({
                data: {
                  userId:
                    user.id,

                  listingId:
                    listing.id,

                  status:
                    "provider_unavailable",

                  addressLabel:
                    fallbackAddressLabel ||
                    location ||
                    postalCode ||
                    "Schweiz",

                  street:
                    street || null,

                  postalCode:
                    postalCode || null,

                  city:
                    location || null,

                  latitude:
                    valuationLatitude,

                  longitude:
                    valuationLongitude,

                  propertyType:
                    valuationPropertyType,

                  livingArea,

                  landArea:
                    landArea ?? null,

                  rooms:
                    rooms ?? null,

                  buildingYear:
                    yearBuilt,

                  renovationYear:
                    renovationYear ?? null,

                  condition:
                    condition || null,

                  standard:
                    standard || null,

                  floorNumber:
                    floor ?? null,

                  hasLift:
                    valuationPropertyType ===
                    "apartment"
                      ? lift === "yes"
                        ? true
                        : lift === "no"
                          ? false
                          : null
                      : null,

                  parking:
                    parking || null,

                  outdoorArea:
                    outdoorArea || null,

                  view:
                    view || null,

                  provider:
                    "pricehubble",

                  currency:
                    "CHF",

                  salePrice:
                    null,

                  salePriceLower:
                    null,

                  salePriceUpper:
                    null,

                  pricePerSqm:
                    null,

                  confidence:
                    null,

                  locationScore:
                    null,

                  valuedAt:
                    null,
                },

                select: {
                  id: true,
                },
              });

            await tx.brokerWorkflow.upsert({
              where: {
                listingId:
                  listing.id,
              },

              create: {
                listingId:
                  listing.id,

                currentStage:
                  "valuation",

                valuationId:
                  valuation.id,
              },

              update: {
                currentStage:
                  "valuation",

                valuationId:
                  valuation.id,
              },
            });

            return valuation;
          }
        );

      console.warn(
        "[AUTOPILOT_VALUATION_PROVIDER_FALLBACK_PERSISTED]",
        {
          listingId:
            listing.id,

          valuationId:
            fallbackValuation.id,

          status:
            "provider_unavailable",
        }
      );
    }
    /*
     * AUTOPILOT VALUATION -> BROKER WORKFLOW V1
     */
    if (
      valuationStatus === "completed" &&
      marketValuation &&
      valuationPropertyType &&
      valuationLatitude !== null &&
      valuationLongitude !== null &&
      livingArea !== null &&
      yearBuilt !== null
    ) {
      const valuationNow =
        new Date();

      const addressLabel =
        [
          street,
          postalCode,
          location,
        ]
          .filter(
            (
              value
            ): value is string =>
              typeof value === "string" &&
              value.trim().length > 0
          )
          .join(", ");

      const persistedValuation =
        await prisma.$transaction(
          async (tx) => {
            const valuation =
              await tx.valuation.create({
                data: {
                  userId:
                    user.id,

                  listingId:
                    listing.id,

                  status:
                    "completed",

                  addressLabel:
                    addressLabel ||
                    location ||
                    postalCode ||
                    "Schweiz",

                  street:
                    street || null,

                  postalCode:
                    postalCode || null,

                  city:
                    location || null,

                  latitude:
                    valuationLatitude,

                  longitude:
                    valuationLongitude,

                  propertyType:
                    valuationPropertyType,

                  livingArea,

                  landArea:
                    landArea ?? null,

                  rooms:
                    rooms ?? null,

                  buildingYear:
                    yearBuilt,

                  renovationYear:
                    renovationYear ?? null,

                  condition:
                    condition || null,

                  standard:
                    standard || null,

                  floorNumber:
                    floor ?? null,

                  hasLift:
                    lift === "yes"
                      ? true
                      : lift === "no"
                        ? false
                        : null,

                  parking:
                    parking || null,

                  outdoorArea:
                    outdoorArea || null,

                  view:
                    view || null,

                  provider:
                    marketValuation.provider,

                  currency:
                    marketValuation.currency ||
                    "CHF",

                  salePrice:
                    Math.round(
                      marketValuation.salePrice
                    ),

                  salePriceLower:
                    Math.round(
                      marketValuation
                        .salePriceRange
                        .lower
                    ),

                  salePriceUpper:
                    Math.round(
                      marketValuation
                        .salePriceRange
                        .upper
                    ),

                  pricePerSqm:
                    marketValuation.salePrice /
                    livingArea,

                  confidence:
                    marketValuation.confidence,

                  locationScore:
                    typeof marketValuation
                      .locationScore === "number"
                      ? marketValuation.locationScore
                      : null,

                  valuedAt:
                    valuationNow,
                },

                select: {
                  id: true,
                },
              });

            await tx.brokerWorkflow.upsert({
              where: {
                listingId:
                  listing.id,
              },

              create: {
                listingId:
                  listing.id,

                currentStage:
                  "mandate",

                valuationId:
                  valuation.id,

                valuationCompletedAt:
                  valuationNow,
              },

              update: {
                currentStage:
                  "mandate",

                valuationId:
                  valuation.id,

                valuationCompletedAt:
                  valuationNow,
              },
            });

            return valuation;
          }
        );

      console.info(
        "[AUTOPILOT_VALUATION_WORKFLOW_PERSISTED]",
        {
          listingId:
            listing.id,

          valuationId:
            persistedValuation.id,
        }
      );
    }

    const projectName =
      variants[0]
        .title
        .slice(
          0,
          120
        );


    const updatedListing =
      await prisma.listing
        .update({
          where: {
            id:
              listing.id,
          },

          data: {
            projectName,

            street:
              street ||
              undefined,

            postalCode:
              finalPostalCode ||
              undefined,

            location:
              finalLocation ||
              undefined,

            locationDescription:
              locationDescription ||
              undefined,

            latitude:
              resolvedAddress?.latitude ??
              undefined,

            longitude:
              resolvedAddress?.longitude ??
              undefined,

            propertyType:
              finalPropertyType,

            rooms:
              rooms ?? null,

            livingArea:
              livingArea ??
              undefined,

            price:
              price ??
              undefined,

            style:
              style ||
              null,

            highlights:
              highlights.length > 0
                ? highlights.join(
                    ", "
                  )
                : null,

            imageAnalysis:
              summary ||
              null,

            generatedVariants:
              JSON.stringify(
                variants
              ),
          },

          select: {
            id: true,
            projectName:
              true,
            street:
              true,
            location:
              true,
            postalCode:
              true,
            propertyType:
              true,
            rooms:
              true,
            livingArea:
              true,
            price:
              true,
            highlights:
              true,
            style:
              true,
            generatedVariants:
              true,
          },
        });


    const missingFields:
      string[] = [];

    if (
      !updatedListing.location
        .trim()
    ) {
      missingFields.push(
        "location"
      );
    }

    if (
      !updatedListing
        .propertyType
        .trim()
    ) {
      missingFields.push(
        "propertyType"
      );
    }

    if (
      updatedListing.rooms ===
      null
    ) {
      missingFields.push(
        "rooms"
      );
    }

    if (
      updatedListing
        .livingArea ===
      null
    ) {
      missingFields.push(
        "livingArea"
      );
    }

    if (
      updatedListing.price ===
      null
    ) {
      missingFields.push(
        "price"
      );
    }


    /*
     * AUTOPILOT -> PUBLICATION PREPARATION V1
     *
     * Erkennt automatisch die vorhandenen
     * Kunden-Portalverbindungen.
     *
     * Kein Approval-Gate wird umgangen.
     * Kein externer Transport wird erzwungen.
     * CH bleibt fail-closed.
     */
    let publication:
      AutopilotPublicationPreparation | null =
        null;

    let publicationPreparationError:
      string | null =
        null;

    try {
      publication =
        await prepareAutopilotPublicationForUser({
          userId:
            user.id,

          market:
            listing.market,

          countryCode:
            listing.countryCode,
        });
    }
    catch (publicationError) {
      console.error(
        "[AUTOPILOT_PUBLICATION_PREPARATION_FAIL_OPEN]",
        publicationError
      );

      publicationPreparationError =
        publicationError instanceof Error
          ? publicationError.message
          : "Portalvorbereitung konnte nicht abgeschlossen werden.";
    }


    /*
     * AUTOPILOT -> PUBLICATION RUN V1
     *
     * Nur wirklich READY Targets mit echter
     * PortalConnection-ID gelangen in den Run.
     *
     * Noch kein externer Dispatch.
     */
    let publicationRunId:
      string | null =
        null;

    let publicationRunStatus:
      string | null =
        null;

    let publicationRunError:
      string | null =
        null;

    let publicationApprovalRequired =
      false;

    let publicationDispatched =
      false;

    let publicationDispatchError:
      string | null =
        null;

    if (
      publication &&
      publication.readyTargetCount > 0
    ) {
      try {
        const marketingApproved =
          await isBrokerMarketingApproved({
            userId:
              user.id,

            listingId:
              updatedListing.id,
          });

        if (!marketingApproved) {
          publicationApprovalRequired =
            true;
        }
        else {
        const readyTargets:
          PreparedPublicationTarget[] =
            publication.targets
              .filter(
                (target) =>
                  target.state === "ready" &&
                  target.connectionId !== null
              )
              .map(
                (target): PreparedPublicationTarget => ({
                  targetKey:
                    `portal:${target.portal}`,

                  kind:
                    "portal",

                  provider:
                    target.provider,

                  destination:
                    target.portal,

                  connectionId:
                    target.connectionId,

                  externalAccountId:
                    null,

                  environment:
                    target.environment,

                  status:
                    "pending",
                })
              );

        if (readyTargets.length > 0) {
          const publicationRun =
            await createPreparedPublicationRun({
              userId:
                user.id,

              listingId:
                updatedListing.id,

              targets:
                readyTargets,
            });

          publicationRunId =
            publicationRun.id;

          publicationRunStatus =
            publicationRun.status;

          /*
           * POST-RESPONSE PUBLICATION:
           * Der PublicationRun ist bereits persistent.
           * Dispatch -> Worker -> Reconcile laufen ausserhalb
           * des kundenkritischen READY-Requests.
           */
          const backgroundUserId =
            user.id;

          const backgroundListingId =
            updatedListing.id;

          const backgroundPlan =
            user.plan;

          const backgroundPublicationRunId =
            publicationRun.id;

          after(async () => {
            try {
              await runPublicationAutopilotAfterApproval({
                userId:
                  backgroundUserId,

                listingId:
                  backgroundListingId,

                plan:
                  backgroundPlan,
              });
            }
            catch (backgroundPublicationError) {
              console.error(
                "[AUTOPILOT_PUBLICATION_BACKGROUND_ERROR]",
                {
                  listingId:
                    backgroundListingId,

                  publicationRunId:
                    backgroundPublicationRunId,

                  error:
                    backgroundPublicationError instanceof Error
                      ? backgroundPublicationError.message
                      : String(backgroundPublicationError),
                }
              );
            }
          });


          /*
           * SPEED PATH:
           * PublicationRun ist persistent READY.
           * Dispatch / Worker / Reconcile laufen ausserhalb
           * dieses kundenkritischen Requests.
           */
        }
        }
      }
      catch (publicationRunFailure) {
        console.error(
          "[AUTOPILOT_PUBLICATION_RUN_FAIL_OPEN]",
          publicationRunFailure
        );

        publicationRunError =
          publicationRunFailure instanceof Error
            ? publicationRunFailure.message
            : "PublicationRun konnte nicht vorbereitet werden.";
      }
    }


    const autopilotTotalDurationMs =
      Date.now() - autopilotTotalStartedAt;

    const postprocessDurationMs =
      Date.now() - postprocessStartedAt;

    console.info("[AUTOPILOT_SPEED_PROFILE]", {
      listingId: updatedListing.id,
      prepMs: prepDurationMs,
      coreMs: aiDurationMs,
      creativeMs: creativeDurationMs,
      postprocessMs: postprocessDurationMs,
      totalMs: autopilotTotalDurationMs,
      prepSeconds: Number((prepDurationMs / 1000).toFixed(2)),
      coreSeconds: Number((aiDurationMs / 1000).toFixed(2)),
      creativeSeconds: Number((creativeDurationMs / 1000).toFixed(2)),
      postprocessSeconds: Number((postprocessDurationMs / 1000).toFixed(2)),
      totalSeconds: Number((autopilotTotalDurationMs / 1000).toFixed(2)),
    });

    /*
     * AUTOPILOT TEMP DOCUMENT CLEANUP:
     * Only processed source documents are removed.
     * Persistent ListingImage blobs remain untouched.
     */
    const processedDocumentPathnames =
      registeredDocuments
        .map((document) => document.pathname)
        .filter(
          (pathname): pathname is string =>
            Boolean(pathname) &&
            pathname.startsWith(
              `autopilot/${listing.id}/`
            )
        );

    if (processedDocumentPathnames.length > 0) {
      after(async () => {
        try {
          await deleteObjects(processedDocumentPathnames);

          console.info(
            "[AUTOPILOT_TEMP_DOCUMENT_CLEANUP]",
            {
              listingId: listing.id,
              deletedCount:
                processedDocumentPathnames.length,
            }
          );
        } catch (cleanupError) {
          console.error(
            "[AUTOPILOT_TEMP_DOCUMENT_CLEANUP_ERROR]",
            {
              listingId: listing.id,
              error:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            }
          );
        }
      });
    }

    return NextResponse.json({
      success:
        true,

      listingId:
        updatedListing.id,

      autopilot: {
        stage:
          missingFields.length >
          0
            ? "needs_confirmation"
            : "ready",

        analyzedImages:
          registeredImages.length,

        missingFields,

        valuation: {
          status:
            valuationStatus,

          ready:
            valuationReady,

          salePrice:
            marketValuation?.salePrice ??
            null,

          salePriceLower:
            marketValuation
              ?.salePriceRange
              .lower ??
            null,

          salePriceUpper:
            marketValuation
              ?.salePriceRange
              .upper ??
            null,

          currency:
            marketValuation?.currency ??
            null,

          confidence:
            marketValuation?.confidence ??
            null,

          locationScore:
            marketValuation
              ?.locationScore ??
            null,

          provider:
            marketValuation?.provider ??
            null,
        },

        publication: {
          status:
            publicationPreparationError
              ? "preparation_failed"
              : publicationApprovalRequired
                ? "approval_required"
              : publication &&
                  (
                    publication.readyTargetCount > 0 ||
                    publication.preparedTargetCount > 0
                  )
                ? "prepared"
                : publication &&
                    publication.blockedTargetCount > 0
                  ? "blocked"
                  : "no_targets",

          market:
            publication?.market ??
            null,
          runId:
            publicationRunId,

          runStatus:
            publicationRunStatus,

          runError:
            publicationRunError,

          approvalRequired:
            publicationApprovalRequired,

          approvalError:
            publicationApprovalRequired
              ? BROKER_MARKETING_APPROVAL_REQUIRED
              : null,

          dispatched:
            publicationDispatched,

          dispatchError:
            publicationDispatchError,

          dispatch:
            null,

          readyTargetCount:
            publication?.readyTargetCount ??
            0,

          preparedTargetCount:
            publication?.preparedTargetCount ??
            0,

          blockedTargetCount:
            publication?.blockedTargetCount ??
            0,

          targets:
            publication?.targets ??
            [],

          error:
            publicationPreparationError,
        },
      },

      result: {
        projectName:
          updatedListing
            .projectName,

        propertyType:
          updatedListing
            .propertyType,

        highlights,

        style:
          updatedListing
            .style,

        summary,

        variants,
      },
    });
  } catch (error) {
    console.error(
      "[autopilot/run]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Der Autopilot konnte nicht abgeschlossen werden.";

    return NextResponse.json(
      {
        success: false,
        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}
