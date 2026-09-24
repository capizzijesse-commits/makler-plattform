import "server-only";

import {
  validateSwissRets,
  type SwissRetsInventory,
} from "@qualipool/swissrets-json";

import type {
  PortalNormalizedListing,
} from "./normalized-listing";

const GENERATOR_NAME =
  "Inserat-AI";

const GENERATOR_VERSION =
  "1.0.0";

function cleanString(
  value: string | undefined
): string | undefined {
  const clean =
    value?.trim();

  return clean || undefined;
}

function ensureRequired(
  value: string,
  field: string
): string {
  const clean =
    value.trim();

  if (!clean) {
    throw new Error(
      `SwissRETS Pflichtfeld fehlt: ${field}.`
    );
  }

  return clean;
}

function buildAddress(
  listing:
    PortalNormalizedListing
) {
  const {
    address,
  } = listing;

  const countryCode =
    ensureRequired(
      address.countryCode,
      "address.countryCode"
    ).toUpperCase();

  if (
    !/^[A-Z]{2}$/.test(
      countryCode
    )
  ) {
    throw new Error(
      `Ungültiger SwissRETS countryCode: ${countryCode}.`
    );
  }

  const result: Record<
    string,
    unknown
  > = {
    countryCode,
    locality:
      ensureRequired(
        address.locality,
        "address.locality"
      ),
  };

  const postalCode =
    cleanString(
      address.postalCode
    );

  const street =
    cleanString(
      address.street
    );

  const streetNumber =
    cleanString(
      address.streetNumber
    );

  if (postalCode) {
    result.postalCode =
      postalCode;
  }

  if (street) {
    result.street =
      street;
  }

  if (streetNumber) {
    result.streetNumber =
      streetNumber;
  }

  if (
    typeof address.latitude ===
      "number" &&
    typeof address.longitude ===
      "number"
  ) {
    result.geo = {
      latitude:
        address.latitude,
      longitude:
        address.longitude,
    };
  }

  return result;
}

function buildPrices(
  listing:
    PortalNormalizedListing
) {
  const offer =
    listing.offer;

  const currency =
    ensureRequired(
      offer.currency,
      "offer.currency"
    ).toUpperCase();

  if (
    !/^[A-Z]{3}$/.test(
      currency
    )
  ) {
    throw new Error(
      `Ungültige SwissRETS Währung: ${currency}.`
    );
  }

  if (
    offer.type === "buy"
  ) {
    if (
      typeof offer.price !==
        "number" ||
      offer.price < 0
    ) {
      return undefined;
    }

    return {
      currency,

      buy: {
        price:
          Math.round(
            offer.price
          ),

        referring:
          "all" as const,
      },
    };
  }

  const rent: Record<
    string,
    unknown
  > = {};

  if (
    typeof offer.net ===
      "number" &&
    offer.net >= 0
  ) {
    rent.net =
      Math.round(
        offer.net
      );
  }

  if (
    typeof offer.gross ===
      "number" &&
    offer.gross >= 0
  ) {
    rent.gross =
      Math.round(
        offer.gross
      );
  }

  if (
    typeof offer.extra ===
      "number" &&
    offer.extra >= 0
  ) {
    rent.extra =
      Math.round(
        offer.extra
      );
  }

  if (
    Object.keys(rent)
      .length === 0
  ) {
    return undefined;
  }

  rent.interval =
    offer.interval ??
    "month";

  rent.referring =
    "all";

  return {
    currency,
    rent,
  };
}

function buildLocalization(
  listing:
    PortalNormalizedListing
) {
  const localization =
    listing.localization;

  const result: Record<
    string,
    unknown
  > = {
    languageCode:
      ensureRequired(
        localization
          .languageCode,
        "localization.languageCode"
      ).toLowerCase(),

    title:
      ensureRequired(
        localization.title,
        "localization.title"
      ),
  };

  const optionalText = {
    excerpt:
      cleanString(
        localization.excerpt
      ),

    description:
      cleanString(
        localization.description
      ),

    location:
      cleanString(
        localization.location
      ),

    equipment:
      cleanString(
        localization.equipment
      ),
  };

  for (
    const [
      key,
      value,
    ] of Object.entries(
      optionalText
    )
  ) {
    if (value) {
      result[key] =
        value;
    }
  }

  const images =
    (
      localization.images ??
      []
    )
      .filter(
        (image) =>
          Boolean(
            image.url.trim()
          )
      )
      .map(
        (image) => ({
          url:
            image.url.trim(),

          ...(cleanString(
            image.title
          )
            ? {
                title:
                  image.title!
                    .trim(),
              }
            : {}),

          ...(cleanString(
            image.description
          )
            ? {
                description:
                  image.description!
                    .trim(),
              }
            : {}),

          ...(cleanString(
            image.mimeType
          )
            ? {
                mimeType:
                  image.mimeType!
                    .trim(),
              }
            : {}),
        })
      );

  if (
    images.length > 0
  ) {
    result.attachments = {
      images,
    };
  }

  return result;
}

function buildProperty(
  listing:
    PortalNormalizedListing
) {
  const property:
    Record<string, unknown> =
    {
      id:
        ensureRequired(
          listing.id,
          "id"
        ),

      referenceId:
        ensureRequired(
          listing.referenceId,
          "referenceId"
        ),

      type:
        listing.offer.type,

      availability: {
        state:
          listing.availability,
      },

      address:
        buildAddress(
          listing
        ),

      localizations: [
        buildLocalization(
          listing
        ),
      ],
    };

  if (
    listing.category
  ) {
    property.categories = [
      listing.category,
    ];
  }

  const characteristics:
    Record<string, number> =
    {};

  if (
    typeof listing
      .livingArea ===
      "number" &&
    listing.livingArea >= 0
  ) {
    characteristics.areaBwf =
      listing.livingArea;
  }

  if (
    typeof listing.rooms ===
      "number" &&
    listing.rooms >= 0
  ) {
    characteristics.numberOfRooms =
      listing.rooms;
  }

  if (
    Object.keys(
      characteristics
    ).length > 0
  ) {
    property.characteristics =
      characteristics;
  }

  const prices =
    buildPrices(
      listing
    );

  if (prices) {
    property.prices =
      prices;
  }

  if (
    listing.createdAt
  ) {
    property.created =
      listing.createdAt
        .toISOString();
  }

  if (
    listing.updatedAt
  ) {
    property.modified =
      listing.updatedAt
        .toISOString();
  }

  return property;
}

export function buildSwissRetsInventory(
  listings:
    PortalNormalizedListing[],
  now: Date = new Date()
): SwissRetsInventory {
  const inventory = {
    created:
      now.toISOString(),

    generator: {
      name:
        GENERATOR_NAME,

      version:
        GENERATOR_VERSION,
    },

    properties:
      listings.map(
        buildProperty
      ),
  };

  /*
   * Ab hier endet unsere interne,
   * dynamisch aufgebaute Portal-
   * Repräsentation.
   *
   * Vor einer echten Übertragung
   * wird das Ergebnis immer noch
   * durch validateSwissRets(...)
   * geprüft.
   */
  return inventory as unknown as
    SwissRetsInventory;
}

export function buildSwissRetsJson(
  listings:
    PortalNormalizedListing[]
): string {
  return JSON.stringify(
    buildSwissRetsInventory(
      listings
    ),
    null,
    2
  );
}

export function validateSwissRetsListings(
  listings:
    PortalNormalizedListing[]
) {
  const inventory =
    buildSwissRetsInventory(
      listings
    );

  return validateSwissRets(
    inventory
  );
}
