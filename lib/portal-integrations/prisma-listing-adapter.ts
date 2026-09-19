import type {
  PortalNormalizedListing,
} from "./normalized-listing";

type ListingImageInput = {
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type ListingFinanceInput = {
  marketingType?: string | null;

  askingPrice?: number | null;
  commissionRate?: number | null;

  netRentMonthly?: number | null;
  additionalCostsMonthly?: number | null;
  heatingCostsMonthly?: number | null;
};

export type PrismaPortalListingInput = {
  id: string;

  projectName?: string | null;

  street?: string | null;

  location: string;

  postalCode?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  market?: string | null;
  countryCode?: string | null;

  propertyType: string;

  rooms?: number | null;
  livingArea?: number | null;
  price?: number | null;

  highlights?: string | null;

  generatedVariants?: string | null;

  locationDescription?:
    | string
    | null;

  archivedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;

  images?: ListingImageInput[];

  finance?: ListingFinanceInput | null;
};

type GeneratedVariant = {
  title?: unknown;
  text?: unknown;
};

function cleanText(
  value: unknown
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const clean =
    value.trim();

  return clean || undefined;
}

function finiteNumber(
  value: unknown
): number | undefined {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : undefined;
}

function parseGeneratedVariants(
  raw: string | null | undefined
): GeneratedVariant[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (
          item
        ): item is GeneratedVariant =>
          Boolean(
            item &&
            typeof item === "object"
          )
      );
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(
        parsed.variants
      )
    ) {
      return parsed.variants.filter(
        (
          item: unknown
        ): item is GeneratedVariant =>
          Boolean(
            item &&
            typeof item === "object"
          )
      );
    }
  } catch {
    return [];
  }

  return [];
}

function splitStreet(
  raw: string | null | undefined
): {
  street?: string;
  streetNumber?: string;
} {
  const value =
    cleanText(raw);

  if (!value) {
    return {};
  }

  const match =
    value.match(
      /^(.*?)[,\s]+(\d+[A-Za-z]?(?:[-/]\d+[A-Za-z]?)?)$/
    );

  if (!match) {
    return {
      street: value,
    };
  }

  return {
    street:
      match[1].trim(),

    streetNumber:
      match[2].trim(),
  };
}

function normalizePropertyType(
  raw: string
): string {
  return raw
    .trim()
    .toLocaleLowerCase("de-CH")
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function resolveCategory(
  propertyType: string
): string | undefined {
  const value =
    normalizePropertyType(
      propertyType
    );

  if (
    value.includes(
      "maisonette"
    )
  ) {
    return "maisonette";
  }

  if (
    value.includes(
      "penthouse"
    )
  ) {
    return "roof-flat";
  }

  if (
    value.includes("villa")
  ) {
    return "villa";
  }

  if (
    value.includes(
      "mehrfamilien"
    ) ||
    value.includes(
      "multi-family"
    ) ||
    value.includes(
      "multifamily"
    )
  ) {
    return "multiplex-house";
  }

  if (
    value.includes(
      "reihenhaus"
    ) ||
    value.includes(
      "terraced"
    )
  ) {
    return "row-house";
  }

  if (
    value.includes(
      "doppelhaus"
    ) ||
    value.includes(
      "semi-detached"
    )
  ) {
    return "duplex-house";
  }

  if (
    value.includes(
      "einfamilien"
    ) ||
    value.includes(
      "detached"
    )
  ) {
    return "detached-house";
  }

  if (
    value.includes(
      "bauland"
    ) ||
    value.includes(
      "building land"
    ) ||
    value.includes(
      "building lot"
    )
  ) {
    return "building-lot";
  }

  if (
    value.includes(
      "gewerbe"
    ) ||
    value.includes(
      "commercial"
    )
  ) {
    return "commercial-space";
  }

  if (
    value.includes(
      "wohnung"
    ) ||
    value.includes(
      "apartment"
    ) ||
    value.includes(
      "flat"
    )
  ) {
    return "apartment";
  }

  /*
   * Ein generisches "Haus" beweist
   * nicht, dass es freistehend ist.
   * Ohne genauere Objektart lassen
   * wir die SwissRETS-Kategorie offen.
   */
  return undefined;
}

function resolveCountryCode(
  listing:
    PrismaPortalListingInput
): string {
  const explicit =
    cleanText(
      listing.countryCode
    )?.toUpperCase();

  if (
    explicit &&
    /^[A-Z]{2}$/.test(
      explicit
    )
  ) {
    return explicit;
  }

  const market =
    cleanText(
      listing.market
    )?.toUpperCase();

  if (
    market === "DE"
  ) {
    return "DE";
  }

  return "CH";
}

function resolveCurrency(
  countryCode: string
): string {
  return countryCode === "CH"
    ? "CHF"
    : "EUR";
}

function resolveOffer(
  listing:
    PrismaPortalListingInput,
  currency: string
): PortalNormalizedListing["offer"] {
  const finance =
    listing.finance;

  const marketingType =
    cleanText(
      finance?.marketingType
    )?.toLowerCase();

  if (
    marketingType === "rent" ||
    marketingType === "rental"
  ) {
    const net =
      finiteNumber(
        finance
          ?.netRentMonthly
      ) ??
      finiteNumber(
        listing.price
      );

    const additional =
      finiteNumber(
        finance
          ?.additionalCostsMonthly
      ) ?? 0;

    const heating =
      finiteNumber(
        finance
          ?.heatingCostsMonthly
      ) ?? 0;

    const extra =
      additional +
      heating;

    return {
      type: "rent",
      currency,

      ...(net !== undefined
        ? {
            net,
            gross:
              net + extra,
          }
        : {}),

      ...(extra > 0
        ? {
            extra,
          }
        : {}),

      interval: "month",
    };
  }

  const salePrice =
    finiteNumber(
      finance?.askingPrice
    ) ??
    finiteNumber(
      listing.price
    );

  return {
    type: "buy",
    currency,

    ...(salePrice !== undefined
      ? {
          price:
            salePrice,
        }
      : {}),
  };
}

function resolveMainVariant(
  listing:
    PrismaPortalListingInput
): {
  title: string;
  description?: string;
} {
  const variants =
    parseGeneratedVariants(
      listing.generatedVariants
    );

  const firstUsable =
    variants.find(
      (variant) =>
        cleanText(
          variant.title
        ) ||
        cleanText(
          variant.text
        )
    );

  const title =
    cleanText(
      firstUsable?.title
    ) ??
    cleanText(
      listing.projectName
    ) ??
    cleanText(
      listing.propertyType
    ) ??
    "Immobilie";

  const description =
    cleanText(
      firstUsable?.text
    );

  return {
    title,
    ...(description
      ? {
          description,
        }
      : {}),
  };
}

function resolveImages(
  listing:
    PrismaPortalListingInput
) {
  return (
    listing.images ?? []
  )
    .map(
      (
        image,
        index
      ) => {
        const url =
          cleanText(
            image.url
          );

        if (!url) {
          return null;
        }

        return {
          url,

          title:
            cleanText(
              image.fileName
            ) ??
            `Objektbild ${index + 1}`,

          ...(cleanText(
            image.mimeType
          )
            ? {
                mimeType:
                  cleanText(
                    image.mimeType
                  ),
              }
            : {}),
        };
      }
    )
    .filter(
      (
        image
      ): image is NonNullable<
        typeof image
      > =>
        image !== null
    );
}

export function mapPrismaListingToPortal(
  listing:
    PrismaPortalListingInput,
  languageCode = "de"
): PortalNormalizedListing {
  const countryCode =
    resolveCountryCode(
      listing
    );

  const currency =
    resolveCurrency(
      countryCode
    );

  const street =
    splitStreet(
      listing.street
    );

  const variant =
    resolveMainVariant(
      listing
    );

  const category =
    resolveCategory(
      listing.propertyType
    );

  const images =
    resolveImages(
      listing
    );

  return {
    id: listing.id,

    referenceId:
      listing.id,

    /*
     * Interne Archivierung ist kein
     * Beweis für verkauft/vermietet.
     * Archivierte Objekte werden später
     * bereits auf Feed-Ebene ausgeschlossen.
     */
    availability: "active",

    address: {
      countryCode,

      locality:
        listing.location.trim(),

      ...(cleanText(
        listing.postalCode
      )
        ? {
            postalCode:
              listing.postalCode!
                .trim(),
          }
        : {}),

      ...street,

      ...(typeof listing.latitude ===
          "number" &&
        typeof listing.longitude ===
          "number"
        ? {
            latitude:
              listing.latitude,

            longitude:
              listing.longitude,
          }
        : {}),
    },

    offer:
      resolveOffer(
        listing,
        currency
      ),

    ...(category
      ? {
          category,
        }
      : {}),

    ...(typeof listing
      .livingArea === "number"
      ? {
          livingArea:
            listing.livingArea,
        }
      : {}),

    ...(typeof listing.rooms ===
      "number"
      ? {
          rooms:
            listing.rooms,
        }
      : {}),

    createdAt:
      listing.createdAt,

    updatedAt:
      listing.updatedAt,

    localization: {
      languageCode,

      title:
        variant.title,

      ...(variant.description
        ? {
            description:
              variant.description,
          }
        : {}),

      ...(cleanText(
        listing
          .locationDescription
      )
        ? {
            location:
              listing
                .locationDescription!
                .trim(),
          }
        : {}),

      ...(cleanText(
        listing.highlights
      )
        ? {
            equipment:
              listing.highlights!
                .trim(),
          }
        : {}),

      ...(images.length > 0
        ? {
            images,
          }
        : {}),
    },
  };
}
