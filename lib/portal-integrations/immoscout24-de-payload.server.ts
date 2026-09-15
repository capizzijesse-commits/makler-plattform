import "server-only";

import type {
  PortalNormalizedListing,
} from "./normalized-listing";


export type ImmoScout24DePayloadError = {
  field:
    string;

  code:
    string;

  message:
    string;
};


export type ImmoScout24DeApartmentBuyDryRun = {
  ready:
    boolean;

  realEstateType:
    "apartmentBuy";

  errors:
    ImmoScout24DePayloadError[];

  summary: {
    referenceId:
      string;

    title:
      string;

    city:
      string;

    propertyCategory:
      string | null;

    offerType:
      string;

    currency:
      string;

    showAddress:
      false;
  };

  xml?:
    string;
};


function clean(
  value:
    string | undefined
):
  string {

  return value?.trim() ?? "";
}


function xml(
  value:
    string | number
):
  string {

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&apos;"
    );
}


function utf8Bytes(
  value:
    string
):
  number {

  return Buffer.byteLength(
    value,
    "utf8"
  );
}


function addError(
  errors:
    ImmoScout24DePayloadError[],
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


function optionalNote(
  input: {
    field:
      string;

    value:
      string | undefined;

    xmlName:
      string;

    errors:
      ImmoScout24DePayloadError[];
  }
):
  string {

  const value =
    clean(
      input.value
    );

  if (!value) {
    return "";
  }

  if (
    utf8Bytes(
      value
    ) >
    3999
  ) {

    addError(
      input.errors,
      input.field,
      "MAX_BYTES_EXCEEDED",
      `${input.field} überschreitet 3999 UTF-8 Bytes.`
    );

    return "";
  }

  return (
    `  <${input.xmlName}>` +
    `${xml(value)}` +
    `</${input.xmlName}>\n`
  );
}


function formatCourtageRate(
  rate:
    number
):
  string {

  const normalized =
    Number(
      rate.toFixed(
        2
      )
    );

  return (
    String(
      normalized
    ).replace(
      ".",
      ","
    ) +
    "%"
  );
}


export function buildImmoScout24DeApartmentBuyDryRun(
  input: {
    listing:
      PortalNormalizedListing;

    commissionRate:
      number | null | undefined;
  }
):
  ImmoScout24DeApartmentBuyDryRun {

  const {
    listing,
  } =
    input;

  const errors:
    ImmoScout24DePayloadError[] =
    [];


  const referenceId =
    clean(
      listing.referenceId
    );

  const title =
    clean(
      listing.localization.title
    );

  const street =
    clean(
      listing.address.street
    );

  const houseNumber =
    clean(
      listing.address.streetNumber
    );

  const postcode =
    clean(
      listing.address.postalCode
    );

  const city =
    clean(
      listing.address.locality
    );


  if (
    listing.address.countryCode
      .toUpperCase() !==
    "DE"
  ) {

    addError(
      errors,
      "address.countryCode",
      "COUNTRY_NOT_DE",
      "Nur deutsche Objekte sind für diesen Builder erlaubt."
    );
  }


  if (
    listing.category !==
    "apartment"
  ) {

    addError(
      errors,
      "category",
      "UNSUPPORTED_PROPERTY_TYPE",
      "V1 unterstützt ausschließlich eindeutig erkannte Wohnungen."
    );
  }


  if (
    listing.offer.type !==
    "buy"
  ) {

    addError(
      errors,
      "offer.type",
      "UNSUPPORTED_MARKETING_TYPE",
      "V1 unterstützt ausschließlich Wohnung + Kauf."
    );
  }


  if (
    listing.offer.currency !==
    "EUR"
  ) {

    addError(
      errors,
      "offer.currency",
      "INVALID_CURRENCY",
      "Deutsche Kaufobjekte müssen in EUR übertragen werden."
    );
  }


  if (!referenceId) {

    addError(
      errors,
      "referenceId",
      "REQUIRED",
      "referenceId fehlt."
    );
  }
  else if (
    referenceId.length >
    50
  ) {

    addError(
      errors,
      "referenceId",
      "MAX_LENGTH_EXCEEDED",
      "referenceId darf maximal 50 Zeichen enthalten."
    );
  }


  if (!title) {

    addError(
      errors,
      "localization.title",
      "REQUIRED",
      "Inserattitel fehlt."
    );
  }
  else if (
    title.length >
    100
  ) {

    addError(
      errors,
      "localization.title",
      "MAX_LENGTH_EXCEEDED",
      "Inserattitel darf maximal 100 Zeichen enthalten."
    );
  }


  if (!street) {

    addError(
      errors,
      "address.street",
      "REQUIRED",
      "Straße fehlt."
    );
  }
  else if (
    street.length >
    100
  ) {

    addError(
      errors,
      "address.street",
      "MAX_LENGTH_EXCEEDED",
      "Straße darf maximal 100 Zeichen enthalten."
    );
  }


  if (!houseNumber) {

    addError(
      errors,
      "address.streetNumber",
      "REQUIRED",
      "Hausnummer fehlt."
    );
  }
  else if (
    houseNumber.length >
    10
  ) {

    addError(
      errors,
      "address.streetNumber",
      "MAX_LENGTH_EXCEEDED",
      "Hausnummer darf maximal 10 Zeichen enthalten."
    );
  }


  if (
    !/^\d{5}$/.test(
      postcode
    )
  ) {

    addError(
      errors,
      "address.postalCode",
      "INVALID_POSTCODE",
      "Für ImmoScout24 DE wird eine fünfstellige PLZ benötigt."
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
  else if (
    city.length >
    50
  ) {

    addError(
      errors,
      "address.locality",
      "MAX_LENGTH_EXCEEDED",
      "Ort darf maximal 50 Zeichen enthalten."
    );
  }


  const price =
    listing.offer.type ===
      "buy"
      ? listing.offer.price
      : undefined;


  if (
    typeof price !==
      "number" ||
    !Number.isFinite(
      price
    ) ||
    price <=
      0
  ) {

    addError(
      errors,
      "offer.price",
      "INVALID_PRICE",
      "Für Wohnung Kauf wird ein Kaufpreis größer 0 benötigt."
    );
  }


  if (
    typeof listing.livingArea !==
      "number" ||
    !Number.isFinite(
      listing.livingArea
    ) ||
    listing.livingArea <=
      0
  ) {

    addError(
      errors,
      "livingArea",
      "INVALID_LIVING_AREA",
      "Wohnfläche muss größer 0 sein."
    );
  }


  if (
    typeof listing.rooms !==
      "number" ||
    !Number.isFinite(
      listing.rooms
    ) ||
    listing.rooms <
      1
  ) {

    addError(
      errors,
      "rooms",
      "INVALID_ROOMS",
      "Zimmerzahl muss mindestens 1 betragen."
    );
  }


  const commissionRate =
    input.commissionRate;


  if (
    commissionRate !== null &&
    commissionRate !== undefined &&
    (
      typeof commissionRate !==
        "number" ||
      !Number.isFinite(
        commissionRate
      ) ||
      commissionRate <
        0 ||
      commissionRate >
        100
    )
  ) {

    addError(
      errors,
      "finance.commissionRate",
      "INVALID_COMMISSION_RATE",
      "Falls ein Provisionssatz vorhanden ist, muss er zwischen 0 und 100 liegen."
    );
  }


  const descriptionXml =
    optionalNote({
      field:
        "localization.description",

      value:
        listing.localization
          .description,

      xmlName:
        "descriptionNote",

      errors,
    });


  const furnishingXml =
    optionalNote({
      field:
        "localization.equipment",

      value:
        listing.localization
          .equipment,

      xmlName:
        "furnishingNote",

      errors,
    });


  const locationXml =
    optionalNote({
      field:
        "localization.location",

      value:
        listing.localization
          .location,

      xmlName:
        "locationNote",

      errors,
    });


  const summary = {
    referenceId,
    title,
    city,

    propertyCategory:
      listing.category ??
      null,

    offerType:
      listing.offer.type,

    currency:
      listing.offer.currency,

    showAddress:
      false as const,
  };


  if (
    errors.length >
    0
  ) {

    return {
      ready:
        false,

      realEstateType:
        "apartmentBuy",

      errors,
      summary,
    };
  }


  const validCommissionRate =
    typeof commissionRate ===
      "number" &&
    Number.isFinite(
      commissionRate
    )
      ? commissionRate
      : null;


  const courtageXml =
    validCommissionRate ===
      null
      ? (
          "  <courtage>\n" +
          "    <hasCourtage>NOT_APPLICABLE</hasCourtage>\n" +
          "  </courtage>\n"
        )
      : validCommissionRate >
          0
        ? (
            "  <courtage>\n" +
            "    <hasCourtage>YES</hasCourtage>\n" +
            `    <courtage>${xml(
              formatCourtageRate(
                validCommissionRate
              )
            )}</courtage>\n` +
            "  </courtage>\n"
          )
        : (
            "  <courtage>\n" +
            "    <hasCourtage>NO</hasCourtage>\n" +
            "  </courtage>\n"
          );


  /*
   * Reihenfolge bewusst entsprechend
   * der ImmoScout24 RealEstate-Struktur.
   *
   * showAddress bleibt in V1 false.
   * Der Dry-Run veröffentlicht nichts.
   */
  const payload =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<realestates:apartmentBuy ' +
    'xmlns:realestates="http://rest.immobilienscout24.de/schema/offer/realestates/1.0" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink">\n' +

    `  <externalId>${xml(
      referenceId
    )}</externalId>\n` +

    `  <title>${xml(
      title
    )}</title>\n` +

    "  <address>\n" +
    `    <street>${xml(
      street
    )}</street>\n` +
    `    <houseNumber>${xml(
      houseNumber
    )}</houseNumber>\n` +
    `    <postcode>${xml(
      postcode
    )}</postcode>\n` +
    `    <city>${xml(
      city
    )}</city>\n` +
    "  </address>\n" +

    descriptionXml +
    furnishingXml +
    locationXml +

    "  <showAddress>false</showAddress>\n" +

    "  <price>\n" +
    `    <value>${xml(
      price!
    )}</value>\n` +
    "    <currency>EUR</currency>\n" +
    "  </price>\n" +

    `  <livingSpace>${xml(
      listing.livingArea!
    )}</livingSpace>\n` +

    `  <numberOfRooms>${xml(
      listing.rooms!
    )}</numberOfRooms>\n` +

    courtageXml +

    "</realestates:apartmentBuy>";


  return {
    ready:
      true,

    realEstateType:
      "apartmentBuy",

    errors:
      [],

    summary,

    xml:
      payload,
  };
}