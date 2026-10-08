import type {
  SalesExposeDocument,
  SalesExposeVariant,
} from "@/lib/sales-expose/sales-expose-document";

export type UniversalPropertyModel = {
  version: "v1";

  generatedAt: string;

  address: {
    countryCode: string | null;
    street: string | null;
    houseNumber: string | null;
    postalCode: string | null;
    city: string | null;
  };

  property: {
    propertyType: string | null;
    marketingType: "sale" | "rent" | null;

    rooms: string | null;
    livingArea: string | null;
    plotArea: string | null;

    price: string | null;
    currency: string | null;
  };

  content: {
    title: string;
    description: string;
    highlights: string[];

    variants: Array<{
      index: number;
      title: string;
      text: string;
      highlights: string[];
    }>;
  };

  media: {
    imageCount: number;

    images: Array<{
      order: number;
      fileName: string;
      analysis: string;
      isTitleImage: boolean;
    }>;
  };
};

function clean(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function splitStreet(
  streetValue: string | null
) {
  if (!streetValue) {
    return {
      street: null,
      houseNumber: null,
    };
  }

  const match =
    streetValue.match(
      /^(.*?)[,\s]+(\d+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)$/
    );

  if (!match) {
    return {
      street:
        streetValue,
      houseNumber:
        null,
    };
  }

  return {
    street:
      clean(match[1]),
    houseNumber:
      clean(match[2]),
  };
}

export function buildUniversalPropertyModel(
  document:
    SalesExposeDocument,
  variants:
    SalesExposeVariant[]
): UniversalPropertyModel {
  const rawStreet =
    clean(
      document.facts.street
    );

  const {
    street,
    houseNumber,
  } =
    splitStreet(
      rawStreet
    );

  const countryCode =
    clean(
      document.facts.countryCode
    );

  const currency =
    countryCode === "CH"
      ? "CHF"
      : countryCode === "DE" ||
          countryCode === "AT"
        ? "EUR"
        : null;

  return {
    version: "v1",

    generatedAt:
      document.generatedAt,

    address: {
      countryCode,
      street,
      houseNumber,
      postalCode:
        clean(
          document.facts.postalCode
        ),
      city:
        clean(
          document.facts.location
        ),
    },

    property: {
      propertyType:
        clean(
          document.facts.propertyType
        ),

      /*
       * Aktueller Automation-Flow
       * ist auf Verkauf ausgelegt.
       * Später wird dieses Feld
       * aus dem Objektmodell gelesen.
       */
      marketingType:
        "sale",

      rooms:
        clean(
          document.facts.rooms
        ),

      livingArea:
        clean(
          document.facts.livingArea
        ),

      /*
       * Noch nicht Bestandteil von
       * SalesExposeFacts.
       * Wird in Phase 2 erweitert.
       */
      plotArea:
        null,

      price:
        clean(
          document.facts.price
        ),

      currency,
    },

    content: {
      title:
        document.title,

      description:
        document.description,

      highlights:
        [...document.highlights],

      variants:
        variants.map(
          (
            variant,
            index
          ) => ({
            index:
              index + 1,

            title:
              variant.title?.trim() ||
              "",

            text:
              variant.text?.trim() ||
              "",

            highlights:
              Array.isArray(
                variant.highlights
              )
                ? [
                    ...variant.highlights,
                  ]
                : [],
          })
        ),
    },

    media: {
      imageCount:
        document.images.length,

      images:
        document.images.map(
          (
            image,
            index
          ) => ({
            order:
              index + 1,

            fileName:
              image.fileName,

            analysis:
              image.analysis,

            isTitleImage:
              index === 0,
          })
        ),
    },
  };
}
