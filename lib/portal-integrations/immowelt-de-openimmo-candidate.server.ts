import "server-only";

import type {
  PortalNormalizedListing,
} from "./normalized-listing";


export const IMMOWELT_DE_OPENIMMO_STANDARD_RELEASE =
  "1.2.7d";

export const IMMOWELT_DE_OPENIMMO_XML_VERSION =
  "1.2.7";


export type ImmoweltDeOpenImmoCandidateError = {
  field:
    string;

  code:
    string;

  message:
    string;
};


export type ImmoweltDeOpenImmoCandidate = {
  ready:
    boolean;

  standard:
    "OpenImmo";

  standardRelease:
    "1.2.7d";

  xmlVersion:
    "1.2.7";

  /*
   * Wichtig:
   * Dieser Mapping-Kandidat ist noch KEIN
   * Nachweis dafür, dass immowelt exakt
   * dieses Profil akzeptiert.
   */
  immoweltProfileVerified:
    false;

  schemaValidated:
    false;

  transportConfigured:
    false;

  networkTested:
    false;

  productionEnabled:
    false;

  referenceId:
    string | null;

  marketingType:
    "KAUF" | "MIETE_PACHT" | null;

  objectType:
    "wohnung" | null;

  errors:
    ImmoweltDeOpenImmoCandidateError[];

  fields:
    {
      objektkategorie:
        {
          nutzungsart:
            {
              WOHNEN:
                true;

              GEWERBE:
                false;
            };

          vermarktungsart:
            {
              KAUF:
                boolean;

              MIETE_PACHT:
                boolean;
            };

          objektart:
            {
              wohnung:
                true;
            } | null;
        };

      geo:
        {
          plz:
            string | null;

          ort:
            string | null;

          strasse:
            string | null;

          hausnummer:
            string | null;

          land:
            "DEU";
        };

      preise:
        {
          waehrung:
            "EUR";

          kaufpreis:
            number | null;

          kaltmiete:
            number | null;

          warmmiete:
            number | null;

          nebenkosten:
            number | null;
        };

      flaechen:
        {
          wohnflaeche:
            number | null;

          anzahl_zimmer:
            number | null;
        };

      freitexte:
        {
          objekttitel:
            string | null;

          objektbeschreibung:
            string | null;

          lage:
            string | null;

          ausstatt_beschr:
            string | null;
        };

      verwaltung_techn:
        {
          objektnr_intern:
            string | null;
        };
    };
};


function clean(
  value:
    string | undefined
):
  string | null {

  const normalized =
    value?.trim();

  return normalized || null;
}


function finitePositive(
  value:
    number | undefined
):
  number | null {

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}


function addError(
  errors:
    ImmoweltDeOpenImmoCandidateError[],
  field:
    string,
  code:
    string,
  message:
    string
):
  void {

  errors.push({
    field,
    code,
    message,
  });
}


export function buildImmoweltDeOpenImmoCandidate(
  listing:
    PortalNormalizedListing
):
  ImmoweltDeOpenImmoCandidate {

  const errors:
    ImmoweltDeOpenImmoCandidateError[] =
    [];


  const referenceId =
    clean(
      listing.referenceId
    );

  const title =
    clean(
      listing.localization.title
    );

  const description =
    clean(
      listing.localization.description
    );

  const locationDescription =
    clean(
      listing.localization.location
    );

  const equipment =
    clean(
      listing.localization.equipment
    );

  const postalCode =
    clean(
      listing.address.postalCode
    );

  const city =
    clean(
      listing.address.locality
    );

  const street =
    clean(
      listing.address.street
    );

  const streetNumber =
    clean(
      listing.address.streetNumber
    );


  if (
    listing.address.countryCode
      .trim()
      .toUpperCase() !==
    "DE"
  ) {

    addError(
      errors,
      "address.countryCode",
      "COUNTRY_NOT_DE",
      "Der immowelt-DE Kandidat erlaubt nur deutsche Objekte."
    );
  }


  if (
    listing.availability !==
    "active"
  ) {

    addError(
      errors,
      "availability",
      "LISTING_NOT_ACTIVE",
      "Nur aktive Objekte dürfen als Übertragungskandidat vorbereitet werden."
    );
  }


  if (!referenceId) {

    addError(
      errors,
      "referenceId",
      "REQUIRED",
      "Interne Objektnummer fehlt."
    );
  }


  if (!title) {

    addError(
      errors,
      "localization.title",
      "REQUIRED",
      "Objekttitel fehlt."
    );
  }


  if (!city) {

    addError(
      errors,
      "address.locality",
      "REQUIRED",
      "Ort fehlt."
    );
  }


  if (!postalCode) {

    addError(
      errors,
      "address.postalCode",
      "REQUIRED",
      "Postleitzahl fehlt."
    );
  }
  else if (
    !/^\d{5}$/.test(
      postalCode
    )
  ) {

    addError(
      errors,
      "address.postalCode",
      "INVALID_GERMAN_POSTAL_CODE",
      "Deutsche Postleitzahl muss fünfstellig sein."
    );
  }


  if (
    listing.offer.currency
      .trim()
      .toUpperCase() !==
    "EUR"
  ) {

    addError(
      errors,
      "offer.currency",
      "INVALID_CURRENCY",
      "Deutsche OpenImmo-Kandidaten müssen EUR verwenden."
    );
  }


  /*
   * V1 bewusst eng:
   * Nur eindeutig erkannte Wohnungen.
   * Weitere Objektarten erst nach
   * bestätigtem Partnerprofil.
   */
  const objectType =
    listing.category ===
      "apartment"
      ? "wohnung" as const
      : null;


  if (!objectType) {

    addError(
      errors,
      "category",
      "UNSUPPORTED_PROPERTY_TYPE",
      "V1 unterstützt ausschließlich eindeutig erkannte Wohnungen."
    );
  }


  const marketingType =
    listing.offer.type ===
      "buy"
      ? "KAUF" as const
      : listing.offer.type ===
          "rent"
        ? "MIETE_PACHT" as const
        : null;


  const purchasePrice =
    listing.offer.type ===
      "buy"
      ? finitePositive(
          listing.offer.price
        )
      : null;


  const netRent =
    listing.offer.type ===
      "rent"
      ? finitePositive(
          listing.offer.net
        )
      : null;


  const grossRent =
    listing.offer.type ===
      "rent"
      ? finitePositive(
          listing.offer.gross
        )
      : null;


  const additionalCosts =
    listing.offer.type ===
      "rent"
      ? finitePositive(
          listing.offer.extra
        )
      : null;


  if (
    listing.offer.type ===
      "buy" &&
    purchasePrice ===
      null
  ) {

    addError(
      errors,
      "offer.price",
      "INVALID_PURCHASE_PRICE",
      "Bei Kaufobjekten muss ein positiver Kaufpreis vorhanden sein."
    );
  }


  if (
    listing.offer.type ===
      "rent" &&
    netRent === null &&
    grossRent === null
  ) {

    addError(
      errors,
      "offer",
      "INVALID_RENT",
      "Bei Mietobjekten muss mindestens Netto- oder Bruttomiete vorhanden sein."
    );
  }


  const livingArea =
    finitePositive(
      listing.livingArea
    );


  if (livingArea === null) {

    addError(
      errors,
      "livingArea",
      "INVALID_LIVING_AREA",
      "Wohnfläche muss größer als 0 sein."
    );
  }


  const rooms =
    finitePositive(
      listing.rooms
    );


  if (rooms === null) {

    addError(
      errors,
      "rooms",
      "INVALID_ROOM_COUNT",
      "Zimmeranzahl muss größer als 0 sein."
    );
  }


  return {
    ready:
      errors.length ===
      0,

    standard:
      "OpenImmo",

    standardRelease:
      IMMOWELT_DE_OPENIMMO_STANDARD_RELEASE,

    xmlVersion:
      IMMOWELT_DE_OPENIMMO_XML_VERSION,

    immoweltProfileVerified:
      false,

    schemaValidated:
      false,

    transportConfigured:
      false,

    networkTested:
      false,

    productionEnabled:
      false,

    referenceId,

    marketingType,

    objectType,

    errors,

    fields: {
      objektkategorie: {
        nutzungsart: {
          WOHNEN:
            true,

          GEWERBE:
            false,
        },

        vermarktungsart: {
          KAUF:
            marketingType ===
            "KAUF",

          MIETE_PACHT:
            marketingType ===
            "MIETE_PACHT",
        },

        objektart:
          objectType
            ? {
                wohnung:
                  true,
              }
            : null,
      },

      geo: {
        plz:
          postalCode,

        ort:
          city,

        strasse:
          street,

        hausnummer:
          streetNumber,

        land:
          "DEU",
      },

      preise: {
        waehrung:
          "EUR",

        kaufpreis:
          purchasePrice,

        kaltmiete:
          netRent,

        warmmiete:
          grossRent,

        nebenkosten:
          additionalCosts,
      },

      flaechen: {
        wohnflaeche:
          livingArea,

        anzahl_zimmer:
          rooms,
      },

      freitexte: {
        objekttitel:
          title,

        objektbeschreibung:
          description,

        lage:
          locationDescription,

        ausstatt_beschr:
          equipment,
      },

      verwaltung_techn: {
        objektnr_intern:
          referenceId,
      },
    },
  };
}