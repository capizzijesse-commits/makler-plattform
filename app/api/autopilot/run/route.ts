import { buildConfirmedAutopilotFacts } from '@/lib/autopilot-confirmed-facts';
import { savePremiumAssessment } from "@/lib/premium-quality-store.server";
import { describePremiumQualityReasons } from "@/lib/premium-quality-gate.server";
import { assertListingPremiumQualityReady, checkAndRecordPremiumQuality } from "@/lib/premium-quality.server";
import { premiumNumber, arePremiumCoreFactsDocumented, type PremiumFacts } from "@/lib/premium-quality-gate.server";
import { requestAutopilotImageAnalyses } from "@/lib/autopilot-image-analysis.server";
import { fingerprintImageContent, imageComparisonEvidence } from "@/lib/image-content-fingerprint.server";
import { selectAutopilotImages, describeAutopilotImageReview, type AutopilotImageAnalysis } from "@/lib/autopilot-image-quality";
import { collectExposeCoreSourceFacts, hasUnresolvedExposeConflicts } from "@/lib/expose-core-fact-conflicts";
import { getSafeImageRoomEvidence, buildSafeImageRoomPrompt } from "@/lib/image-expose-consistency";
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
  pdfDocumentReviewError,
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
  qualityFacts?: PremiumFacts;
  manualFactsConfirmed?: boolean;
  listingId?: unknown;
  uploads?: unknown;
};


type ImageAnalysis = AutopilotImageAnalysis;


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
  currency: "EUR" | "CHF" | "";
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
  const analyzingImageIds: string[] = [];
  let imageAnalysesPersisted = false;

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
            locationDescription:true, locationData:true, socialVariants:true, latitude:true, longitude:true,
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
              "- currency nur als EUR oder CHF aus einer ausdrücklich genannten Kaufpreiswährung übernehmen; ohne eindeutigen Beleg leer lassen. Niemals aus Markt oder Lage ableiten.",
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
   // Fact extraction is mandatory and independent of optional PDF photos.
   // Read every page of every document; never suppress a failed fact check.
   const documentInputs = await Promise.all(
     registeredDocuments.map(async (document) => {
       const pdfBuffer = Buffer.from(await getObjectBytes(document.pathname));
       const facts = await extractPdfDocumentFacts(pdfBuffer);
       if (facts.documentAnalysis?.requiresReview) throw pdfDocumentReviewError(facts.documentAnalysis);
       return { pdfBuffer, facts };
     })
   );
   const documentTexts = documentInputs.map(document => document.facts.documentText);
   const offerPriceKind = body?.qualityFacts?.marketingType === "rent" ? "rent" : "sale";
   const documentEvidence = collectExposeCoreSourceFacts(documentTexts, [listing], offerPriceKind);
   const sourceDocumentEvidence = collectExposeCoreSourceFacts(documentTexts, [], offerPriceKind);
   if (hasUnresolvedExposeConflicts({ factConflicts: documentEvidence.conflicts })) {
     throw new Error("EXPOSE_FACT_CONFLICT_REVIEW_REQUIRED");
   }


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
                      "currency",
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
                      currency: {
                        type: "string",
                        enum: ["", "EUR", "CHF"],
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


   if (registeredDocuments.length > 0) {
     try {
       const pdfImageBatches = await Promise.all(
         documentInputs.map(document => remainingPdfImageSlots > 0
           ? extractPdfImages(document.pdfBuffer, remainingPdfImageSlots)
           : Promise.resolve([]))
       );
       const extractedPdfImages = pdfImageBatches.flat().slice(0, remainingPdfImageSlots);

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

   // Include stored originals from earlier attempts: publication consumers read
   // the entire listing gallery, so no attached image may escape this check.
   const storedImages = await prisma.listingImage.findMany({
     where: { listingId: listing.id },
     orderBy: { position: "asc" },
     select: { id: true, url: true, storageKey: true, fileName: true, position: true },
   });
   const registeredIds = new Set(registeredImages.map(image => image.id));
   for (const image of storedImages) {
     if (!registeredIds.has(image.id)) {
       registeredImages.push(image);
       registeredIds.add(image.id);
     }
   }
   const contentFingerprints = new Map<string, string>();
   const comparisons = new Map<string, Awaited<ReturnType<typeof imageComparisonEvidence>>>();
   if (registeredImages.length > 0) {
     analyzingImageIds.push(...registeredImages.map(image => image.id));
     await prisma.listingImage.updateMany({
       where: { listingId: listing.id, id: { in: analyzingImageIds } },
       data: { analysisStatus: "analyzing", analysis: null, analyzedAt: null, isPrimary: false },
     });
   if (registeredImages.length > MAX_IMAGE_COUNT || registeredIds.size !== registeredImages.length ||
     new Set(registeredImages.map(image => image.storageKey)).size !== registeredImages.length) {
     throw new Error("AUTOPILOT_IMAGE_IDENTITY_INVALID");
   }
     // Decode sequentially to bound peak memory for large original photos.
     for (const image of registeredImages) {
       const bytes = Buffer.from(await getObjectBytes(image.storageKey));
       contentFingerprints.set(image.id, await fingerprintImageContent(bytes));
       comparisons.set(image.id, await imageComparisonEvidence(bytes));
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

    // Compare positive AI values as well: a PDF disagreement must not be
    // hidden by the old missing-rooms-only fallback.
    const coreEvidence = collectExposeCoreSourceFacts(documentTexts, [listing, parsed, { price: body?.manualFactsConfirmed && offerPriceKind === "rent" ? premiumNumber(body.qualityFacts?.price) : parsed.price, currency: body?.qualityFacts?.currency }], offerPriceKind);
    if (hasUnresolvedExposeConflicts({ factConflicts: coreEvidence.conflicts })) {
      throw new Error("EXPOSE_FACT_CONFLICT_REVIEW_REQUIRED");
    }
    for (const field of ["rooms", "livingArea", "price"] as const) {
      if (coreEvidence.seen.includes(field)) {
        parsed[field] = coreEvidence.values[field] ? Number(coreEvidence.values[field]) : null;
      }
    }

   const creativeStartedAt = Date.now();

   const imageUrls = await Promise.all(registeredImages.map(image =>
     image.url || createStorageReadUrl(image.storageKey, 300)));
   const visionImageAnalyses = await requestAutopilotImageAnalyses(imageUrls, registeredImages.map(image => image.id));


    const imageSelection = selectAutopilotImages(registeredImages.map((image, index) => ({
      imageId: image.id,
      fileName: image.fileName,
      contentFingerprint: contentFingerprints.get(image.id)!,
      comparison: comparisons.get(image.id),
      analysis: visionImageAnalyses[index],
    })));
    const orderedImageIds = [
      ...imageSelection.selectedImageIds,
      ...imageSelection.entries.filter(entry => !entry.selected).map(entry => entry.imageId),
    ];
    if (registeredImages.length > 0) {
      await prisma.$transaction(async tx => {
        for (const entry of imageSelection.entries) {
          await tx.listingImage.update({
            where: { id: entry.imageId },
            data: {
              position: orderedImageIds.indexOf(entry.imageId),
              isPrimary: entry.imageId === imageSelection.primaryImageId,
              analysisStatus: "analyzed",
              analyzedAt: new Date(),
              analysis: JSON.stringify({
                ...entry.analysis,
                // Free-form model descriptions never become verified visible facts.
                condition: "",
                visibleFacts: entry.analysis.roomIndependentFacts.map(item => item.fact),
                imageId: entry.imageId,
                contentFingerprint: entry.contentFingerprint,
                selectionVersion: "autopilot-image-quality-v1",
                selected: entry.selected,
                selectionReasons: entry.reasons,
                duplicateOf: entry.duplicateOf,
              }),
            },
          });
        }
      });
      imageAnalysesPersisted = true;
    }
    await savePremiumAssessment(user.id, "broker_vision", {images: await prisma.listingImage.findMany({where:{listingId:listing.id},select:{id:true,analysis:true,analyzedAt:true}})}, listing.id);
    const imageSelectionResult = {
      selectedImageIds: imageSelection.selectedImageIds,
      primaryImageId: imageSelection.primaryImageId,
      requiresReview: imageSelection.requiresReview,
      reasons: imageSelection.reasons,
      images: imageSelection.entries.map(entry => ({
        imageId: entry.imageId, fileName: entry.fileName, selected: entry.selected,
        reasons: entry.reasons, duplicateOf: entry.duplicateOf,
      })),
    };
    parsed.imageAnalyses = visionImageAnalyses.map(analysis => ({
      ...analysis,
      ...getSafeImageRoomEvidence(analysis),
    }));

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
      coreRooms;



    const livingArea =
      typeof parsed.livingArea ===
        "number" &&
      Number.isFinite(
        parsed.livingArea
      ) &&
      parsed.livingArea > 0
        ? parsed.livingArea
        : null;

    const price = body?.manualFactsConfirmed === true && body.qualityFacts?.marketingType === "rent"
      ? premiumNumber(body.qualityFacts.price)
      : typeof parsed.price ===
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

    const confirmedFacts = buildConfirmedAutopilotFacts({
      locale:"de",market:listing.market,location:finalLocation,propertyType:finalPropertyType,street,postalCode:finalPostalCode,
      rooms,livingArea,price,currency:sourceDocumentEvidence.currency??"",marketingType:sourceDocumentEvidence.values.price?offerPriceKind:"",
      countryCode:listing.countryCode,style:style||null,locationDescription:locationDescription||listing.locationDescription,
      locationData:listing.locationData,socialVariants:listing.socialVariants,latitude:resolvedAddress?.latitude??listing.latitude,longitude:resolvedAddress?.longitude??listing.longitude,
    },documentInputs.map(document=>document.facts),body?.manualFactsConfirmed===true?body.qualityFacts:undefined);
    const strictVerifiedFeatures = String(confirmedFacts.verifiedFeatures??"");
    const verifiedFactContext = "";
    if (imageSelection.requiresReview) {
      // Retain the documentary source and editable draft before returning to the broker.
      const exposeReceipt = await savePremiumAssessment(user.id, "expose", {sourceText:documentTexts.join("\n"),extracted:parsed,evidence:sourceDocumentEvidence,sourceChecked:documentTexts.length>0,documents:documentInputs.map((document,index)=>({reference:registeredDocuments[index].pathname,analysis:document.facts.documentAnalysis}))}, listing.id);
      await prisma.listing.update({where:{id:listing.id},data:{
        location:String(confirmedFacts.location??""),propertyType:String(confirmedFacts.propertyType??""),postalCode:String(confirmedFacts.postalCode??""),
        rooms:premiumNumber(confirmedFacts.rooms),livingArea:premiumNumber(confirmedFacts.livingArea),price:premiumNumber(confirmedFacts.price),plotArea:premiumNumber(confirmedFacts.plotArea),highlights:strictVerifiedFeatures,
      }});

      await savePremiumAssessment(user.id,"autopilot_draft",{facts:confirmedFacts,sourceAssessmentId:exposeReceipt.id},listing.id);
      return NextResponse.json({
        success: false,
        listingId: listing.id,
        code: "AUTOPILOT_IMAGE_REVIEW_REQUIRED",
        reviewUrl: `/cockpit/${listing.id}/edit?review=images`,
        error: describeAutopilotImageReview(imageSelection),
        imageSelection: imageSelectionResult,
      }, { status: 422 });
    }

    const listingTextOpenAI =
      new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY,
      });

    const generatedText =
      await generateListingTextVariants(
        confirmedFacts,
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
     * Das Objekt wird jetzt automatisch
     * vom leeren Draft zum Inserat.
     */
    const premiumFacts: PremiumFacts = confirmedFacts;
    // Only the generated presentation title is added; property/source facts stay identical.
    premiumFacts.projectName = variants[0].title.slice(0,120);
    const premiumQuality = await checkAndRecordPremiumQuality({
      userId: user.id, listingId: listing.id, facts: premiumFacts, variants,
      sourceAudit: {
        status: !coreEvidence.ambiguousPriceUnits && (body?.manualFactsConfirmed === true || (documentTexts.length > 0 && !body?.qualityFacts && arePremiumCoreFactsDocumented(premiumFacts, sourceDocumentEvidence))) ? "passed" : "missing",
        conflicts: coreEvidence.conflicts,
        documents: documentInputs.map((document,index) => ({reference:registeredDocuments[index].pathname,analysis:document.facts.documentAnalysis})),
        sources: [
          ...documentTexts.map((_, index) => ({ kind: "expose", reference: registeredDocuments[index].pathname })),
          ...(body?.manualFactsConfirmed === true ? [{ kind: "manual_confirmation", reference: listing.id }] : []),
        ],
      },
      sourceContext: documentTexts.join("\n"),
      images: imageSelection.entries, openai: listingTextOpenAI,
    });
    if (!premiumQuality.ready) return NextResponse.json({ success: false, code: "PREMIUM_QUALITY_NOT_READY",
      premiumQuality, error: describePremiumQualityReasons(premiumQuality.reasons) }, { status: 422 });

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
            plotArea: premiumNumber(premiumFacts.plotArea) ?? undefined,

            street:
              street ||
              undefined,

            postalCode:
              finalPostalCode ||
              undefined,

            location: String(confirmedFacts.location??finalLocation),

            locationDescription:
              locationDescription ||
              undefined,

            latitude:
              resolvedAddress?.latitude ??
              undefined,

            longitude:
              resolvedAddress?.longitude ??
              undefined,

            propertyType: String(confirmedFacts.propertyType??finalPropertyType),

            rooms: premiumNumber(confirmedFacts.rooms),

            livingArea: premiumNumber(confirmedFacts.livingArea),

            price: premiumNumber(confirmedFacts.price),

            style:
              style ||
              null,

            highlights: strictVerifiedFeatures || null,

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


    await assertListingPremiumQualityReady(user.id, listing.id);

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
        premiumQuality,
        imageSelection: imageSelectionResult,
        stage:
          "needs_confirmation",

        analyzedImages:
          registeredImages.length,

        missingFields: premiumQuality.ready ? [] : missingFields,

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
    if (analyzingImageIds.length > 0 && !imageAnalysesPersisted) {
      try {
        await prisma.listingImage.updateMany({
          where: { id: { in: analyzingImageIds } },
          data: { analysisStatus: "not_analyzed", analyzedAt: null, analysis: null, isPrimary: false },
        });
      } catch (statusError) {
        console.error("[AUTOPILOT_IMAGE_STATUS_RESET_FAILED]", statusError);
      }
    }
    console.error(
      "[autopilot/run]",
      (error as { code?:string })?.code === "PDF_DOCUMENT_REVIEW_REQUIRED" ? { code:"PDF_DOCUMENT_REVIEW_REQUIRED" } : error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Der Autopilot konnte nicht abgeschlossen werden.";

    const pdfReview = error as { code?:string; documentAnalysis?:unknown; sourceEvidence?:unknown; structuredFacts?:unknown };
    return NextResponse.json(
      {
        success: false,
        ...(pdfReview.code === "PDF_DOCUMENT_REVIEW_REQUIRED" ? { code:pdfReview.code, documentAnalysis:pdfReview.documentAnalysis, sourceEvidence:pdfReview.sourceEvidence, structuredFacts:pdfReview.structuredFacts } : {}),
        error:
          message,
      },
      {
        status: pdfReview.code === "PDF_DOCUMENT_REVIEW_REQUIRED" ? 422 : 500,
      }
    );
  }
}
