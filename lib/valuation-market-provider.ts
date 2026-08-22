import {
  requestSwissPropertyValuation,
} from "@/lib/pricehubble";

import {
  requestSwissPropertyValuationFromFpre,
} from "@/lib/fpre";

export type InseratAIPropertyType =
  | "apartment"
  | "house"
  | "row-house"
  | "semi-detached";

export type MarketValuationProvider =
  | "pricehubble"
  | "wuest"
  | "fpre";

export type MarketValuationInput = {
  latitude: number;
  longitude: number;

  propertyType:
    InseratAIPropertyType;

  livingArea: number;
  buildingYear: number;

  landArea?: number | null;
  renovationYear?: number | null;
  numberOfRooms?: number | null;

  floorNumber?: number | null;
  hasLift?: boolean | null;

  numberOfIndoorParkingSpaces?: number;
  numberOfOutdoorParkingSpaces?: number;
};

export type MarketValuationResult = {
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

  provider:
    MarketValuationProvider;
};

function selectedProvider():
  MarketValuationProvider {
  const configured =
    process.env
      .VALUATION_PROVIDER
      ?.trim()
      .toLowerCase();

  if (!configured) {
    return "pricehubble";
  }

  if (
    configured === "pricehubble" ||
    configured === "wuest" ||
    configured === "fpre"
  ) {
    return configured;
  }

  throw new Error(
    "VALUATION_PROVIDER_UNSUPPORTED"
  );
}

async function requestFromPriceHubble(
  input: MarketValuationInput
): Promise<MarketValuationResult> {
  try {
    const result =
      await requestSwissPropertyValuation({
        latitude:
          input.latitude,

        longitude:
          input.longitude,

        propertyType:
          input.propertyType,

        livingArea:
          input.livingArea,

        buildingYear:
          input.buildingYear,

        landArea:
          input.landArea,

        renovationYear:
          input.renovationYear,

        numberOfRooms:
          input.numberOfRooms,

        floorNumber:
          input.floorNumber,

        hasLift:
          input.hasLift,

        numberOfIndoorParkingSpaces:
          input.numberOfIndoorParkingSpaces,

        numberOfOutdoorParkingSpaces:
          input.numberOfOutdoorParkingSpaces,
      });

    return {
      salePrice:
        result.salePrice,

      salePriceRange:
        result.salePriceRange,

      currency:
        result.currency,

      confidence:
        result.confidence,

      locationScore:
        result.locationScore,

      latitude:
        result.latitude,

      longitude:
        result.longitude,

      provider:
        "pricehubble",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "PRICEHUBBLE_NOT_CONFIGURED"
    ) {
      throw new Error(
        "VALUATION_PROVIDER_NOT_CONFIGURED"
      );
    }

    throw error;
  }
}

async function requestFromFpre(
  input: MarketValuationInput
): Promise<MarketValuationResult> {
  try {
    const result =
      await requestSwissPropertyValuationFromFpre({
        latitude:
          input.latitude,

        longitude:
          input.longitude,

        propertyType:
          input.propertyType,

        livingArea:
          input.livingArea,

        buildingYear:
          input.buildingYear,

        landArea:
          input.landArea,

        renovationYear:
          input.renovationYear,

        numberOfRooms:
          input.numberOfRooms,

        floorNumber:
          input.floorNumber,

        hasLift:
          input.hasLift,

        numberOfIndoorParkingSpaces:
          input.numberOfIndoorParkingSpaces,

        numberOfOutdoorParkingSpaces:
          input.numberOfOutdoorParkingSpaces,
      });

    return {
      salePrice:
        result.salePrice,

      salePriceRange:
        result.salePriceRange,

      currency:
        result.currency,

      confidence:
        result.confidence,

      locationScore:
        result.locationScore,

      latitude:
        result.latitude,

      longitude:
        result.longitude,

      provider:
        "fpre",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
        "FPRE_NOT_CONFIGURED" ||
      message ===
        "FPRE_INTEGRATION_PENDING_DOCUMENTATION"
    ) {
      throw new Error(
        "VALUATION_PROVIDER_NOT_CONFIGURED"
      );
    }

    throw error;
  }
}

export async function
requestSwissMarketValuation(
  input: MarketValuationInput
): Promise<MarketValuationResult> {
  const provider =
    selectedProvider();

  switch (provider) {
    case "pricehubble":
      return requestFromPriceHubble(
        input
      );

    case "fpre":
      return requestFromFpre(
        input
      );

    case "wuest":
      throw new Error(
        "VALUATION_PROVIDER_NOT_CONFIGURED"
      );
  }
}
