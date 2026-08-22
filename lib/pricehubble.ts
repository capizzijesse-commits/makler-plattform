type PriceHubbleTokenResponse = {
  access_token: string;
  expires_in: number;
};

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null =
  null;

export type InseratAIPropertyType =
  | "apartment"
  | "house"
  | "row-house"
  | "semi-detached";

export type PriceHubbleValuationInput = {
  latitude: number;
  longitude: number;

  propertyType:
    InseratAIPropertyType;

  livingArea: number;

  /**
   * Für CH bei Wohnung und Haus erforderlich.
   */
  buildingYear: number;

  /**
   * Für Häuser in CH erforderlich.
   */
  landArea?: number | null;

  renovationYear?: number | null;
  numberOfRooms?: number | null;

  floorNumber?: number | null;
  hasLift?: boolean | null;

  numberOfIndoorParkingSpaces?: number;
  numberOfOutdoorParkingSpaces?: number;
};

export type PriceHubbleValuationResult = {
  salePrice: number;

  salePriceRange: {
    lower: number;
    upper: number;
  };

  currency: string;

  confidence:
    | "poor"
    | "medium"
    | "good";

  locationScore?: number | null;

  latitude?: number | null;
  longitude?: number | null;
};

function credentials() {
  const username =
    process.env.PRICEHUBBLE_USERNAME?.trim();

  const password =
    process.env.PRICEHUBBLE_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error(
      "PRICEHUBBLE_NOT_CONFIGURED"
    );
  }

  return {
    username,
    password,
  };
}

async function getAccessToken() {
  const now =
    Date.now();

  if (
    tokenCache &&
    tokenCache.expiresAt >
      now + 60_000
  ) {
    return tokenCache.token;
  }

  const {
    username,
    password,
  } = credentials();

  const response =
    await fetch(
      "https://api.pricehubble.com/auth/login/credentials",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          username,
          password,
        }),

        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `PRICEHUBBLE_AUTH_FAILED:${response.status}`
    );
  }

  const data =
    (await response.json()) as
      PriceHubbleTokenResponse;

  if (
    !data.access_token ||
    !data.expires_in
  ) {
    throw new Error(
      "PRICEHUBBLE_INVALID_AUTH_RESPONSE"
    );
  }

  tokenCache = {
    token:
      data.access_token,

    expiresAt:
      now +
      data.expires_in * 1000,
  };

  return data.access_token;
}

function propertyTypeForProvider(
  propertyType:
    InseratAIPropertyType
) {
  switch (propertyType) {
    case "apartment":
      return {
        code: "apartment",
        subcode:
          "apartment_normal",
      };

    case "house":
      return {
        code: "house",
        subcode:
          "house_detached",
      };

    case "semi-detached":
      return {
        code: "house",
        subcode:
          "house_semi_detached",
      };

    case "row-house":
      /*
       * Inserat-AI unterscheidet aktuell
       * noch nicht zwischen Reihenmittel-
       * und Reiheneckhaus.
       *
       * Deshalb senden wir bewusst keinen
       * falschen Subtyp.
       */
      return {
        code: "house",
      };
  }
}

export async function
requestSwissPropertyValuation(
  input: PriceHubbleValuationInput
): Promise<PriceHubbleValuationResult> {
  const token =
    await getAccessToken();

  const property: Record<
    string,
    unknown
  > = {
    location: {
      coordinates: {
        latitude:
          input.latitude,

        longitude:
          input.longitude,
      },
    },

    propertyType:
      propertyTypeForProvider(
        input.propertyType
      ),

    buildingYear:
      input.buildingYear,

    livingArea:
      input.livingArea,
  };

  if (
    input.propertyType !==
      "apartment" &&
    input.landArea != null
  ) {
    property.landArea =
      input.landArea;
  }

  if (
    input.renovationYear != null
  ) {
    property.renovationYear =
      input.renovationYear;
  }

  if (
    input.numberOfRooms != null
  ) {
    property.numberOfRooms =
      input.numberOfRooms;
  }

  if (
    input.floorNumber != null &&
    input.propertyType ===
      "apartment"
  ) {
    property.floorNumber =
      input.floorNumber;
  }

  if (
    input.hasLift != null &&
    input.propertyType ===
      "apartment"
  ) {
    property.hasLift =
      input.hasLift;
  }

  if (
    input.numberOfIndoorParkingSpaces !=
    null
  ) {
    property.numberOfIndoorParkingSpaces =
      input.numberOfIndoorParkingSpaces;
  }

  if (
    input.numberOfOutdoorParkingSpaces !=
    null
  ) {
    property.numberOfOutdoorParkingSpaces =
      input.numberOfOutdoorParkingSpaces;
  }

  const response =
    await fetch(
      "https://api.pricehubble.com/api/v1/valuation/property_value",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          dealType: "sale",

          countryCode: "CH",

          returnScores: true,

          valuationInputs: [
            {
              property,
            },
          ],
        }),

        cache: "no-store",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.message ===
        "string"
        ? data.message
        : `PriceHubble valuation failed (${response.status}).`
    );
  }

  const valuation =
    data?.valuations?.[0]?.[0];

  if (
    !valuation ||
    typeof valuation.salePrice !==
      "number"
  ) {
    const message =
      valuation?.status?.message;

    throw new Error(
      typeof message === "string"
        ? message
        : "PriceHubble lieferte keine gültige Bewertung."
    );
  }

  return {
    salePrice:
      valuation.salePrice,

    salePriceRange: {
      lower:
        valuation.salePriceRange
          ?.lower ??
        valuation.salePrice,

      upper:
        valuation.salePriceRange
          ?.upper ??
        valuation.salePrice,
    },

    currency:
      valuation.currency ??
      "CHF",

    confidence:
      valuation.confidence ??
      "poor",

    locationScore:
      typeof valuation.scores
        ?.location === "number"
        ? valuation.scores.location
        : null,

    latitude:
      typeof valuation.coordinates
        ?.latitude === "number"
        ? valuation.coordinates.latitude
        : null,

    longitude:
      typeof valuation.coordinates
        ?.longitude === "number"
        ? valuation.coordinates.longitude
        : null,
  };
}
