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


export const runtime = "nodejs";


const MAX_FILES = 10;

const MAX_PDF_SIZE =
  15 * 1024 * 1024;

const MAX_IMAGE_SIZE =
  8 * 1024 * 1024;

const MAX_TOTAL_UPLOAD_SIZE =
  30 * 1024 * 1024;


const ALLOWED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


type IntakeField<T> = {
  value: T | null;
  confidence: number;
  source: string;
  evidence: string;
};


type ValuationIntakeResult = {
  propertyType:
    IntakeField<string>;

  street:
    IntakeField<string>;

  zip:
    IntakeField<string>;

  city:
    IntakeField<string>;

  livingArea:
    IntakeField<number>;

  landArea:
    IntakeField<number>;

  rooms:
    IntakeField<number>;

  yearBuilt:
    IntakeField<number>;

  renovationYear:
    IntakeField<number>;

  condition:
    IntakeField<string>;

  standard:
    IntakeField<string>;

  floor:
    IntakeField<number>;

  lift:
    IntakeField<string>;

  parking:
    IntakeField<string>;

  outdoorArea:
    IntakeField<string>;

  view:
    IntakeField<string>;

  sufficientForValuation:
    boolean;

  missingCriticalFields:
    string[];

  warnings:
    string[];
};


type ResponsePayload = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;

  error?: {
    message?: string;
  };
};


function requiredText(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}


function extractOutputText(
  response: ResponsePayload
) {
  for (
    const item
    of response.output || []
  ) {
    for (
      const content
      of item.content || []
    ) {
      if (
        content.type ===
          "output_text" &&
        typeof content.text ===
          "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return "";
}


function safeConfidence(
  value: unknown
) {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, number)
  );
}


function sanitizeResult(
  input: ValuationIntakeResult
): ValuationIntakeResult {
  const field = <T,>(
    candidate: IntakeField<T>
  ): IntakeField<T> => ({
    value:
      candidate?.value ?? null,

    confidence:
      safeConfidence(
        candidate?.confidence
      ),

    source:
      typeof candidate?.source ===
        "string"
        ? candidate.source.trim()
        : "",

    evidence:
      typeof candidate?.evidence ===
        "string"
        ? candidate.evidence.trim()
        : "",
  });

  return {
    propertyType:
      field(input.propertyType),

    street:
      field(input.street),

    zip:
      field(input.zip),

    city:
      field(input.city),

    livingArea:
      field(input.livingArea),

    landArea:
      field(input.landArea),

    rooms:
      field(input.rooms),

    yearBuilt:
      field(input.yearBuilt),

    renovationYear:
      field(input.renovationYear),

    condition:
      field(input.condition),

    standard:
      field(input.standard),

    floor:
      field(input.floor),

    lift:
      field(input.lift),

    parking:
      field(input.parking),

    outdoorArea:
      field(input.outdoorArea),

    view:
      field(input.view),

    sufficientForValuation:
      input.sufficientForValuation ===
        true,

    missingCriticalFields:
      Array.isArray(
        input.missingCriticalFields
      )
        ? input.missingCriticalFields
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                  "string" &&
                value.trim().length > 0
            )
            .map((value) =>
              value.trim()
            )
            .slice(0, 20)
        : [],

    warnings:
      Array.isArray(input.warnings)
        ? input.warnings
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                  "string" &&
                value.trim().length > 0
            )
            .map((value) =>
              value.trim()
            )
            .slice(0, 20)
        : [],
  };
}


const fieldSchema = (
  valueSchema: Record<
    string,
    unknown
  >
) => ({
  type: "object",

  additionalProperties: false,

  properties: {
    value: valueSchema,

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },

    source: {
      type: "string",
    },

    evidence: {
      type: "string",
    },
  },

  required: [
    "value",
    "confidence",
    "source",
    "evidence",
  ],
});


const stringOrNull = {
  type: [
    "string",
    "null",
  ],
};


const numberOrNull = {
  type: [
    "number",
    "null",
  ],
};


const intakeSchema = {
  type: "object",

  additionalProperties: false,

  properties: {
    propertyType:
      fieldSchema({
        type: [
          "string",
          "null",
        ],

        enum: [
          "apartment",
          "house",
          "row-house",
          "semi-detached",
          null,
        ],
      }),

    street:
      fieldSchema(
        stringOrNull
      ),

    zip:
      fieldSchema(
        stringOrNull
      ),

    city:
      fieldSchema(
        stringOrNull
      ),

    livingArea:
      fieldSchema(
        numberOrNull
      ),

    landArea:
      fieldSchema(
        numberOrNull
      ),

    rooms:
      fieldSchema(
        numberOrNull
      ),

    yearBuilt:
      fieldSchema(
        numberOrNull
      ),

    renovationYear:
      fieldSchema(
        numberOrNull
      ),

    condition:
      fieldSchema({
        type: [
          "string",
          "null",
        ],

        enum: [
          "new",
          "very-good",
          "good",
          "average",
          "renovation",
          null,
        ],
      }),

    standard:
      fieldSchema({
        type: [
          "string",
          "null",
        ],

        enum: [
          "simple",
          "standard",
          "good",
          "luxury",
          null,
        ],
      }),

    floor:
      fieldSchema(
        numberOrNull
      ),

    lift:
      fieldSchema({
        type: [
          "string",
          "null",
        ],

        enum: [
          "yes",
          "no",
          null,
        ],
      }),

    parking:
      fieldSchema({
        type: [
          "string",
          "null",
        ],

        enum: [
          "none",
          "outdoor",
          "garage",
          "underground",
          "multiple",
          null,
        ],
      }),

    outdoorArea:
      fieldSchema({
        type: [
          "string",
          "null",
        ],

        enum: [
          "none",
          "balcony",
          "terrace",
          "garden",
          "multiple",
          null,
        ],
      }),

    view:
      fieldSchema({
        type: [
          "string",
          "null",
        ],

        enum: [
          "normal",
          "quiet",
          "open",
          "mountain",
          "lake",
          "premium",
          null,
        ],
      }),

    sufficientForValuation: {
      type: "boolean",
    },

    missingCriticalFields: {
      type: "array",
      items: {
        type: "string",
      },
    },

    warnings: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "propertyType",
    "street",
    "zip",
    "city",
    "livingArea",
    "landArea",
    "rooms",
    "yearBuilt",
    "renovationYear",
    "condition",
    "standard",
    "floor",
    "lift",
    "parking",
    "outdoorArea",
    "view",
    "sufficientForValuation",
    "missingCriticalFields",
    "warnings",
  ],
};


export async function POST(
  request: NextRequest
) {
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


    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die AI-Verbindung ist nicht konfiguriert.",
        },
        {
          status: 500,
        }
      );
    }


    const formData =
      await request.formData();

    const listingId =
      requiredText(
        formData.get(
          "listingId"
        )
      );


    const files =
      formData
        .getAll("files")
        .filter(
          (
            value
          ): value is File =>
            value instanceof File
        );


    if (
      files.length >
      MAX_FILES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maximal 10 Dokumente oder Scans pro Analyse.",
        },
        {
          status: 400,
        }
      );
    }


    let totalUploadSize = 0;

    for (const file of files) {
      totalUploadSize += file.size;

      const isPdf =
        file.type ===
          "application/pdf" ||
        file.name
          .toLowerCase()
          .endsWith(".pdf");

      const isImage =
        ALLOWED_IMAGE_TYPES.has(
          file.type
        );

      if (
        !isPdf &&
        !isImage
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Erlaubt sind PDF, JPG, PNG und WEBP.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        isPdf &&
        (
          file.size <= 0 ||
          file.size >
            MAX_PDF_SIZE
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Eine PDF-Datei darf maximal 15 MB gross sein.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        isImage &&
        (
          file.size <= 0 ||
          file.size >
            MAX_IMAGE_SIZE
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ein Scan oder Foto darf maximal 8 MB gross sein.",
          },
          {
            status: 400,
          }
        );
      }
    }


    if (
      totalUploadSize >
      MAX_TOTAL_UPLOAD_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die hochgeladenen Dateien sind zusammen zu gross.",
        },
        {
          status: 400,
        }
      );
    }


    const listing =
      listingId
        ? await prisma.listing
            .findFirst({
              where: {
                id: listingId,
                userId: user.id,
              },

              select: {
                id: true,
                projectName: true,
                street: true,
                location: true,
                postalCode: true,
                latitude: true,
                longitude: true,
                market: true,
                countryCode: true,
                propertyType: true,
                rooms: true,
                livingArea: true,
                highlights: true,
                imageAnalysis: true,

                images: {
                  orderBy: [
                    {
                      isPrimary:
                        "desc",
                    },
                    {
                      position:
                        "asc",
                    },
                  ],

                  take: 8,

                  select: {
                    id: true,
                    url: true,
                    fileName: true,
                    mimeType: true,
                    analysis: true,
                  },
                },

                floorPlans: {
                  orderBy: {
                    sortOrder:
                      "asc",
                  },

                  take: 6,

                  select: {
                    id: true,
                    floorLevel: true,
                    fileName: true,
                    mimeType: true,
                    url: true,
                    analysis: true,
                    geometry: true,
                  },
                },
              },
            })
        : null;


    if (
      listingId &&
      !listing
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Objekt wurde nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }


    if (listing) {
      const market =
        listing.market
          ?.trim()
          .toUpperCase() ||
        "";

      const countryCode =
        listing.countryCode
          ?.trim()
          .toUpperCase() ||
        "";

      if (
        (
          market &&
          market !== "CH"
        ) ||
        (
          countryCode &&
          countryCode !== "CH"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Die automatische Bewertung ist aktuell nur fuer Schweizer Objekte aktiviert.",
          },
          {
            status: 400,
          }
        );
      }
    }


    if (
      !listing &&
      files.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte ein Objekt oder mindestens ein Dokument angeben.",
        },
        {
          status: 400,
        }
      );
    }


    const content:
      Array<Record<
        string,
        unknown
      >> = [];


    const knownListingData =
      listing
        ? {
            projectName:
              listing.projectName,

            street:
              listing.street,

            postalCode:
              listing.postalCode,

            city:
              listing.location,

            latitude:
              listing.latitude,

            longitude:
              listing.longitude,

            propertyType:
              listing.propertyType,

            rooms:
              listing.rooms,

            livingArea:
              listing.livingArea,

            highlights:
              listing.highlights,

            imageAnalysis:
              listing.imageAnalysis,
          }
        : null;


    content.push({
      type: "input_text",

      text: [
        "Du bist der Fakten-Extraktor fuer die automatisierte Schweizer Immobilienbewertung von Inserat-AI.",
        "",
        "ZIEL:",
        "Der Makler soll keine Objektdaten manuell eintippen muessen.",
        "Extrahiere deshalb alle belastbar belegbaren Bewertungsdaten aus Cockpit-Daten, Dokumenten, Grundrissen und Fotos.",
        "",
        "WAHRHEITSREGELN:",
        "- Erfinde niemals fehlende Werte.",
        "- Ein Baujahr darf nicht aus dem visuellen Alter eines Gebaeudes geschaetzt werden.",
        "- Eine Grundstuecksflaeche darf nicht aus einem Foto geschaetzt werden.",
        "- Eine Wohnflaeche darf nur aus Dokumenten, Grundrissen mit eindeutiger Angabe oder vorhandenen Cockpit-Daten stammen.",
        "- Fotos duerfen Zustand, Ausbaustandard, Aussenbereich und sichtbare Aussicht unterstuetzen.",
        "- Wenn Quellen widersprechen, nenne die Unsicherheit unter warnings.",
        "- Dokumentierte Werte haben Vorrang vor visuellen Schaetzungen.",
        "- Gib fuer jedes Feld Quelle, kurze Evidenz und Sicherheit zwischen 0 und 1 an.",
        "- confidence 1 bedeutet direkt und eindeutig dokumentiert.",
        "- confidence unter 0.7 bedeutet unsicher.",
        "",
        "ERLAUBTE ENUM-WERTE:",
        "propertyType: apartment | house | row-house | semi-detached",
        "condition: new | very-good | good | average | renovation",
        "standard: simple | standard | good | luxury",
        "lift: yes | no",
        "parking: none | outdoor | garage | underground | multiple",
        "outdoorArea: none | balcony | terrace | garden | multiple",
        "view: normal | quiet | open | mountain | lake | premium",
        "",
        "KRITISCHE FELDER:",
        "propertyType, street, zip, city, livingArea, yearBuilt, condition, standard.",
        "Bei house, row-house und semi-detached ist landArea ebenfalls kritisch.",
        "",
        "sufficientForValuation darf nur true sein, wenn alle fuer den erkannten Immobilientyp kritischen Felder belastbar vorhanden sind.",
        "",
        "BEREITS VORHANDENE COCKPIT-DATEN:",
        JSON.stringify(
          knownListingData,
          null,
          2
        ),
      ].join("\n"),
    });


    for (
      let index = 0;
      index < files.length;
      index += 1
    ) {
      const file =
        files[index];

      const bytes =
        Buffer.from(
          await file.arrayBuffer()
        );

      const base64 =
        bytes.toString(
          "base64"
        );

      const isPdf =
        file.type ===
          "application/pdf" ||
        file.name
          .toLowerCase()
          .endsWith(".pdf");

      if (isPdf) {
        content.push({
          type: "input_file",

          filename:
            file.name ||
            ("dokument-" +
              String(
                index + 1
              ) +
              ".pdf"),

          file_data:
            "data:application/pdf;base64," +
            base64,
        });

        continue;
      }

      content.push({
        type: "input_image",

        image_url:
          "data:" +
          file.type +
          ";base64," +
          base64,

        detail: "high",
      });
    }


    if (listing) {
      for (
        const floorPlan
        of listing.floorPlans
      ) {
        if (!floorPlan.url) {
          continue;
        }

        const isPdf =
          floorPlan.mimeType ===
            "application/pdf" ||
          floorPlan.fileName
            ?.toLowerCase()
            .endsWith(".pdf");

        if (isPdf) {
          content.push({
            type: "input_file",
            file_url:
              floorPlan.url,
          });
        } else if (
          floorPlan.mimeType &&
          ALLOWED_IMAGE_TYPES.has(
            floorPlan.mimeType
          )
        ) {
          content.push({
            type: "input_image",
            image_url:
              floorPlan.url,
            detail: "high",
          });
        }
      }


      for (
        const image
        of listing.images
      ) {
        if (!image.url) {
          continue;
        }

        content.push({
          type: "input_image",
          image_url:
            image.url,
          detail: "low",
        });
      }


      const analysisSummary = {
        listingImageAnalyses:
          listing.images
            .filter(
              (image) =>
                typeof image.analysis ===
                  "string" &&
                image.analysis.trim()
            )
            .map((image) => ({
              fileName:
                image.fileName,

              analysis:
                image.analysis,
            })),

        floorPlanAnalyses:
          listing.floorPlans
            .filter(
              (plan) =>
                plan.analysis != null ||
                plan.geometry != null
            )
            .map((plan) => ({
              fileName:
                plan.fileName,

              floorLevel:
                plan.floorLevel,

              analysis:
                plan.analysis,

              geometry:
                plan.geometry,
            })),
      };


      content.push({
        type: "input_text",

        text:
          "BEREITS VORHANDENE ANALYSEN:\n" +
          JSON.stringify(
            analysisSummary,
            null,
            2
          ),
      });
    }


    const model =
      process.env
        .OPENAI_VALUATION_INTAKE_MODEL ||
      process.env
        .OPENAI_PDF_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-5-mini";


    const openAIResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            Authorization:
              "Bearer " +
              apiKey,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            model,

            store: false,

            max_output_tokens:
              3000,

            input: [
              {
                role: "user",
                content,
              },
            ],

            text: {
              format: {
                type:
                  "json_schema",

                name:
                  "valuation_intake",

                strict:
                  true,

                schema:
                  intakeSchema,
              },
            },
          }),
        }
      );


    const responsePayload =
      (
        await openAIResponse
          .json()
      ) as ResponsePayload;


    if (!openAIResponse.ok) {
      throw new Error(
        responsePayload.error
          ?.message ||
        "VALUATION_INTAKE_AI_FAILED"
      );
    }


    const outputText =
      extractOutputText(
        responsePayload
      );


    if (!outputText) {
      throw new Error(
        "VALUATION_INTAKE_EMPTY"
      );
    }


    let parsed:
      ValuationIntakeResult;

    try {
      parsed =
        JSON.parse(
          outputText
        ) as
          ValuationIntakeResult;
    } catch {
      throw new Error(
        "VALUATION_INTAKE_INVALID_JSON"
      );
    }


    const extraction =
      sanitizeResult(
        parsed
      );


    return NextResponse.json({
      success: true,

      extraction,

      sources: {
        cockpit:
          Boolean(listing),

        uploadedFiles:
          files.length,

        listingImages:
          listing?.images
            .length || 0,

        floorPlans:
          listing?.floorPlans
            .length || 0,
      },

      provider:
        "openai",

      priceHubbleCalled:
        false,
    });
  } catch (error) {
    console.error(
      "[valuation/intake]",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error &&
          error.message &&
          !error.message.startsWith(
            "VALUATION_INTAKE_"
          )
            ? error.message
            : "Die automatische Dokumentenanalyse konnte momentan nicht abgeschlossen werden.",
      },
      {
        status: 500,
      }
    );
  }
}
