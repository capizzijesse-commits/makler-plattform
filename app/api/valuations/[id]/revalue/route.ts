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

import {
  requestSwissMarketValuation,
  type InseratAIPropertyType,
} from "@/lib/valuation-market-provider";

export const runtime =
  "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const supportedPropertyTypes =
  new Set<InseratAIPropertyType>([
    "apartment",
    "house",
    "row-house",
    "semi-detached",
  ]);

export async function POST(
  request: NextRequest,
  context: RouteContext
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

    const {
      id,
    } =
      await context.params;

    const valuationId =
      id.trim();

    if (!valuationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Bewertung.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Nur der Eigentümer des
     * Bewertungsfalls darf ihn
     * erneut bewerten.
     */
    const valuation =
      await prisma.valuation.findFirst({
        where: {
          id:
            valuationId,

          userId:
            user.id,
        },
      });

    if (!valuation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bewertung nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }

    const propertyType =
      valuation.propertyType as
        InseratAIPropertyType;

    if (
      !supportedPropertyTypes.has(
        propertyType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Dieser Immobilientyp wird momentan nicht unterstützt.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Parkierung wird nur dann
     * numerisch übertragen, wenn
     * die gespeicherte Information
     * eindeutig ist.
     */
    let indoorParking:
      number | undefined;

    let outdoorParking:
      number | undefined;

    if (
      valuation.parking ===
      "none"
    ) {
      indoorParking = 0;
      outdoorParking = 0;
    }

    if (
      valuation.parking ===
        "garage" ||
      valuation.parking ===
        "underground"
    ) {
      indoorParking = 1;
    }

    if (
      valuation.parking ===
      "outdoor"
    ) {
      outdoorParking = 1;
    }

    /*
     * "multiple" wird bewusst
     * nicht in eine erfundene
     * Anzahl übersetzt.
     */

    const result =
      await requestSwissMarketValuation(
        {
          latitude:
            valuation.latitude,

          longitude:
            valuation.longitude,

          propertyType,

          livingArea:
            valuation.livingArea,

          buildingYear:
            valuation.buildingYear,

          landArea:
            valuation.landArea,

          renovationYear:
            valuation.renovationYear,

          numberOfRooms:
            valuation.rooms,

          floorNumber:
            valuation.floorNumber,

          hasLift:
            valuation.hasLift,

          numberOfIndoorParkingSpaces:
            indoorParking,

          numberOfOutdoorParkingSpaces:
            outdoorParking,
        }
      );

    /*
     * Marktwerte werden ausschließlich
     * aus dem echten Provider-Ergebnis
     * in Neon geschrieben.
     */
    const updated =
      await prisma.valuation.update({
        where: {
          id:
            valuation.id,
        },

        data: {
          status:
            "completed",

          provider:
            result.provider,

          currency:
            result.currency ||
            "CHF",

          salePrice:
            Math.round(
              result.salePrice
            ),

          salePriceLower:
            Math.round(
              result
                .salePriceRange
                .lower
            ),

          salePriceUpper:
            Math.round(
              result
                .salePriceRange
                .upper
            ),

          pricePerSqm:
            result.salePrice /
            valuation.livingArea,

          confidence:
            result.confidence,

          locationScore:
            typeof result
              .locationScore ===
              "number"
              ? result
                  .locationScore
              : null,

          valuedAt:
            new Date(),
        },
      });

    const {
      userId:
        _userId,
      ...safeValuation
    } =
      updated;

    return NextResponse.json({
      success: true,
      valuation:
        safeValuation,
    });
  } catch (error) {
    console.error(
      "[valuation/revalue]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "VALUATION_PROVIDER_NOT_CONFIGURED"
    ) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error:
            "Der Schweizer Marktwert-Provider ist noch nicht konfiguriert.",
        },
        {
          status: 503,
        }
      );
    }

    if (
      message ===
      "VALUATION_PROVIDER_UNSUPPORTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der konfigurierte Marktwert-Provider wird nicht unterstützt.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Die erneute Marktwertermittlung konnte momentan nicht durchgeführt werden.",
      },
      {
        status: 502,
      }
    );
  }
}
