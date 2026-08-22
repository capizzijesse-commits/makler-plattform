import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const supportedPropertyTypes = new Set([
  "apartment",
  "house",
  "row-house",
  "semi-detached",
]);

function optionalText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text.length > 0
    ? text
    : null;
}

function requiredText(
  value: unknown
): string {
  return optionalText(value) ?? "";
}

function optionalNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value
          .replace(
            /['’\s]/g,
            ""
          )
          .replace(
            ",",
            "."
          )
      : value;

  const number =
    Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
}

function optionalInteger(
  value: unknown
): number | null {
  const number =
    optionalNumber(value);

  if (
    number === null ||
    !Number.isInteger(number)
  ) {
    return null;
  }

  return number;
}

function optionalBoolean(
  value: unknown
): boolean | null {
  if (
    value === true ||
    value === false
  ) {
    return value;
  }

  return null;
}

function publicValuation<
  T extends {
    userId: string;
  }
>(
  valuation: T
) {
  const {
    userId: _userId,
    ...safeValuation
  } = valuation;

  return safeValuation;
}


/* =========================================================
   GET – EIGENE BEWERTUNGEN LADEN
   ========================================================= */

export async function GET(
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

    const valuations =
      await prisma.valuation.findMany({
        where: {
          userId: user.id,
        },

        orderBy: {
          updatedAt: "desc",
        },

        take: 100,
      });

    return NextResponse.json({
      success: true,

      valuations:
        valuations.map(
          publicValuation
        ),
    });
  } catch (error) {
    console.error(
      "Fehler beim Laden der Bewertungen:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Bewertungen konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}


/* =========================================================
   POST – BEWERTUNGSENTWURF SPEICHERN

   WICHTIG:
   AVM-Ergebnisse werden hier absichtlich
   NICHT vom Browser übernommen.
   ========================================================= */

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

    const body =
      await request.json();

    const addressLabel =
      requiredText(
        body.addressLabel
      );

    const propertyType =
      requiredText(
        body.propertyType
      );

    const latitude =
      optionalNumber(
        body.latitude
      );

    const longitude =
      optionalNumber(
        body.longitude
      );

    const livingArea =
      optionalNumber(
        body.livingArea
      );

    const landArea =
      optionalNumber(
        body.landArea
      );

    const rooms =
      optionalNumber(
        body.rooms
      );

    const buildingYear =
      optionalInteger(
        body.buildingYear
      );

    const renovationYear =
      optionalInteger(
        body.renovationYear
      );

    const floorNumber =
      optionalInteger(
        body.floorNumber
      );

    const hasLift =
      optionalBoolean(
        body.hasLift
      );


    /* =====================================================
       VALIDIERUNG
       ===================================================== */

    if (!addressLabel) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die bestätigte Adresse fehlt.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !supportedPropertyTypes.has(
        propertyType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dieser Immobilientyp wird nicht unterstützt.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      latitude === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude === null ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die bestätigten Standortkoordinaten fehlen.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      livingArea === null ||
      livingArea < 20 ||
      livingArea > 800
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte eine gültige Wohnfläche angeben.",
        },
        {
          status: 400,
        }
      );
    }

    const currentYear =
      new Date().getFullYear();

    if (
      buildingYear === null ||
      buildingYear < 1850 ||
      buildingYear >
        currentYear + 3
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte ein gültiges Baujahr angeben.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      propertyType !==
        "apartment" &&
      (
        landArea === null ||
        landArea < 50 ||
        landArea > 5000
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Für Häuser wird eine gültige Grundstücksfläche benötigt.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      renovationYear !== null &&
      (
        renovationYear <
          buildingYear ||
        renovationYear >
          currentYear + 3
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Renovationsjahr ist ungültig.",
        },
        {
          status: 400,
        }
      );
    }

    const postalCode =
      optionalText(
        body.postalCode
      );

    if (
      postalCode &&
      !/^\d{4}$/.test(
        postalCode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Schweizer PLZ muss vierstellig sein.",
        },
        {
          status: 400,
        }
      );
    }


    /* =====================================================
       DRAFT SPEICHERN
       ===================================================== */

    const valuation =
      await prisma.valuation.create({
        data: {
          userId:
            user.id,

          status:
            "draft",

          addressLabel,

          street:
            optionalText(
              body.street
            ),

          postalCode,

          city:
            optionalText(
              body.city
            ),

          latitude,
          longitude,

          propertyType,

          livingArea,

          landArea:
            propertyType ===
            "apartment"
              ? null
              : landArea,

          rooms,

          buildingYear,

          renovationYear,

          condition:
            optionalText(
              body.condition
            ),

          standard:
            optionalText(
              body.standard
            ),

          floorNumber:
            propertyType ===
            "apartment"
              ? floorNumber
              : null,

          hasLift:
            propertyType ===
            "apartment"
              ? hasLift
              : null,

          parking:
            optionalText(
              body.parking
            ),

          outdoorArea:
            optionalText(
              body.outdoorArea
            ),

          view:
            optionalText(
              body.view
            ),

          /*
           * Bewusst keine AVM-Werte aus
           * dem Browser übernehmen.
           */
          provider:
            null,

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
      });

    return NextResponse.json(
      {
        success: true,

        message:
          "Bewertungsentwurf wurde gespeichert.",

        valuation:
          publicValuation(
            valuation
          ),
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Fehler beim Speichern der Bewertung:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Bewertung konnte nicht gespeichert werden.",
      },
      {
        status: 500,
      }
    );
  }
}
