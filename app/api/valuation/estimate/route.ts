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

const supportedPropertyTypes =
  new Set<InseratAIPropertyType>([
    "apartment",
    "house",
    "row-house",
    "semi-detached",
  ]);

function finiteNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/* VALUATION LISTING SERVER GUARD V1 */
function normalizeLocationText(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLocaleLowerCase(
          "de-CH"
        )
        .replace(
          /\s+/g,
          " "
        )
    : "";
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const requestedListingId =
      typeof body
        ?.listingId ===
        "string"
        ? body.listingId.trim()
        : "";

    if (
      typeof body?.latitude !==
        "number" ||
      typeof body?.longitude !==
        "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Für die Bewertung wird eine bestätigte Schweizer Adresse benötigt.",
        },
        {
          status: 400,
        }
      );
    }

    const propertyType =
      body?.propertyType as
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
            "Dieser Immobilientyp wird in der aktuellen Bewertungsversion noch nicht unterstützt.",
        },
        {
          status: 400,
        }
      );
    }

    const livingArea =
      finiteNumber(
        body?.livingArea
      );

    if (
      livingArea == null ||
      livingArea < 20 ||
      livingArea > 800
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte eine gültige Wohnfläche zwischen 20 und 800 m² eingeben.",
        },
        {
          status: 400,
        }
      );
    }

    const currentYear =
      new Date().getFullYear();

    const buildingYear =
      finiteNumber(
        body?.buildingYear
      );

    if (
      buildingYear == null ||
      !Number.isInteger(
        buildingYear
      ) ||
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

    let landArea:
      number | null =
      null;

    if (
      propertyType !==
        "apartment"
    ) {
      landArea =
        finiteNumber(
          body?.landArea
        );

      if (
        landArea == null ||
        landArea < 50 ||
        landArea > 5000
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Für Häuser wird eine Grundstücksfläche zwischen 50 und 5'000 m² benötigt.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const numberOfRooms =
      finiteNumber(
        body?.numberOfRooms
      );

    if (
      numberOfRooms != null &&
      (
        numberOfRooms < 1 ||
        numberOfRooms > 100
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte eine gültige Zimmerzahl eingeben.",
        },
        {
          status: 400,
        }
      );
    }

    const renovationYear =
      body?.renovationYear
        ? finiteNumber(
            body.renovationYear
          )
        : null;

    if (
      renovationYear != null &&
      (
        !Number.isInteger(
          renovationYear
        ) ||
        renovationYear < 1950 ||
        renovationYear >
          currentYear + 3 ||
        renovationYear <
          buildingYear
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte ein gültiges Renovationsjahr angeben.",
        },
        {
          status: 400,
        }
      );
    }

    const floorNumber =
      propertyType ===
        "apartment" &&
      body?.floorNumber !== "" &&
      body?.floorNumber != null
        ? finiteNumber(
            body.floorNumber
          )
        : null;

    if (
      propertyType ===
        "apartment" &&
      floorNumber != null &&
      (
        !Number.isInteger(
          floorNumber
        ) ||
        floorNumber < 0 ||
        floorNumber > 20
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte eine gültige Etage eingeben.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * VALUATION LISTING SERVER GUARD V1
     *
     * Sobald eine Bewertung aus einem
     * Cockpit-Listing gestartet wird,
     * muss der Server VOR jedem externen
     * Marktwert-Aufruf sicherstellen:
     *
     * - Benutzer ist authentifiziert
     * - Listing gehoert diesem Benutzer
     * - Listing ist ein CH-Objekt
     * - PLZ und Ort stimmen mit der
     *   bestaetigten Bewertungsadresse
     *   ueberein
     *
     * Bei Konflikt: kein Provider-Aufruf.
     */
    if (requestedListingId) {
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

      const ownedListing =
        await prisma
          .listing
          .findFirst({
            where: {
              id:
                requestedListingId,

              userId:
                user.id,
            },

            select: {
              id: true,

              countryCode:
                true,

              postalCode:
                true,

              location:
                true,
            },
          });

      if (!ownedListing) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Das verknuepfte Objekt wurde nicht gefunden.",
          },
          {
            status: 404,
          }
        );
      }

      const countryCode =
        ownedListing
          .countryCode
          ?.trim()
          .toUpperCase() ||
        "";

      if (
        countryCode &&
        countryCode !== "CH"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Die automatische Marktwertbewertung ist aktuell nur fuer Schweizer Objekte aktiviert.",
          },
          {
            status: 409,
          }
        );
      }

      const requestedPostalCode =
        typeof body
          ?.postalCode ===
          "string"
          ? body.postalCode.trim()
          : "";

      const requestedCity =
        typeof body
          ?.city ===
          "string"
          ? body.city.trim()
          : "";

      if (
        !requestedPostalCode ||
        !requestedCity
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PLZ und Ort der bestaetigten Bewertungsadresse fehlen.",
          },
          {
            status: 400,
          }
        );
      }

      const listingPostalCode =
        ownedListing
          .postalCode
          ?.trim() ||
        "";

      const listingCity =
        ownedListing
          .location
          ?.trim() ||
        "";

      if (
        !listingPostalCode ||
        !listingCity
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Das verknuepfte Listing enthaelt noch keine vollstaendige PLZ-/Ortsangabe.",
          },
          {
            status: 409,
          }
        );
      }

      const postalCodeMismatch =
        listingPostalCode !==
        requestedPostalCode;

      const cityMismatch =
        normalizeLocationText(
          listingCity
        ) !==
        normalizeLocationText(
          requestedCity
        );

      if (
        postalCodeMismatch ||
        cityMismatch
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Die Bewertungsadresse stimmt nicht mit dem verknuepften Listing ueberein. Die Marktwertabfrage wurde aus Sicherheitsgruenden nicht gestartet.",

            code:
              "VALUATION_LISTING_ADDRESS_MISMATCH",
          },
          {
            status: 409,
          }
        );
      }
    }

    const result =
      await requestSwissMarketValuation(
        {
          latitude:
            body.latitude,

          longitude:
            body.longitude,

          propertyType,

          livingArea,

          buildingYear,

          landArea,

          renovationYear,

          numberOfRooms,

          floorNumber,

          hasLift:
            propertyType ===
              "apartment" &&
            typeof body.hasLift ===
              "boolean"
              ? body.hasLift
              : null,

          numberOfIndoorParkingSpaces:
            typeof body.numberOfIndoorParkingSpaces ===
              "number"
              ? body.numberOfIndoorParkingSpaces
              : undefined,

          numberOfOutdoorParkingSpaces:
            typeof body.numberOfOutdoorParkingSpaces ===
              "number"
              ? body.numberOfOutdoorParkingSpaces
              : undefined,
        }
      );

    /*
     * Ein Marktwert darf ausschließlich
     * aus dem vertrauenswürdigen
     * Provider-Ergebnis gespeichert werden.
     *
     * Client-Werte für salePrice,
     * confidence usw. werden niemals
     * übernommen.
     */
    let persistedValuationId:
      string | null =
      null;

    const requestedValuationId =
      typeof body
        ?.valuationId ===
        "string"
        ? body.valuationId.trim()
        : "";

    /* VALUATION LISTING PERSISTENCE V1 */
    if (requestedValuationId) {
      try {
        const user =
          await getAuthenticatedUser(
            request
          );

        if (user) {
          let listingAllowed =
            true;

          if (
            requestedListingId
          ) {
            const ownedListing =
              await prisma
                .listing
                .findFirst({
                  where: {
                    id:
                      requestedListingId,

                    userId:
                      user.id,
                  },

                  select: {
                    id:
                      true,

                    countryCode:
                      true,
                  },
                });

            listingAllowed =
              Boolean(
                ownedListing &&
                (
                  !ownedListing
                    .countryCode ||
                  ownedListing
                    .countryCode ===
                    "CH"
                )
              );
          }

          const updated =
            listingAllowed
              ?
            await prisma
              .valuation
              .updateMany({
                where: {
                  id:
                    requestedValuationId,

                  userId:
                    user.id,

                  ...(requestedListingId
                    ? {
                        listingId:
                          requestedListingId,
                      }
                    : {}),
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
                    livingArea,

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
              })
              : {
                  count:
                    0,
                };

          if (
            updated.count ===
            1
          ) {
            persistedValuationId =
              requestedValuationId;
          }
        }
      } catch (
        persistenceError
      ) {
        /*
         * Ein erfolgreiches AVM-Ergebnis
         * wird nicht verworfen, nur weil
         * das optionale Speichern gerade
         * fehlschlägt.
         */
        console.error(
          "[valuation/persistence]",
          persistenceError
        );
      }
    }

    return NextResponse.json({
      success: true,

      valuation:
        result,

      persistence: {
        saved:
          persistedValuationId !==
          null,

        valuationId:
          persistedValuationId,
      },
    });
  } catch (error) {
    console.error(
      "[valuation/estimate]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

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

    return NextResponse.json(
      {
        success: false,
        error:
          message ||
          "Die Marktwertermittlung konnte momentan nicht durchgeführt werden.",
      },
      {
        status: 502,
      }
    );
  }
}
