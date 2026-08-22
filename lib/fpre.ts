export type FprePropertyType =
  | "apartment"
  | "house"
  | "row-house"
  | "semi-detached";

export type FpreValuationInput = {
  latitude: number;
  longitude: number;

  propertyType:
    FprePropertyType;

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

export type FpreValuationResult = {
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

/**
 * FPRE Adapter
 *
 * WICHTIG:
 * Hier wird bewusst noch kein HTTP-
 * Request implementiert.
 *
 * Wir warten auf die offizielle
 * technische Dokumentation von FPRE:
 *
 * - API-Endpunkt
 * - Authentifizierung
 * - Request-Schema
 * - Response-Schema
 * - AVM-Felddefinitionen
 *
 * Dadurch erfindet Inserat-AI keine
 * provider-spezifischen Parameter.
 */
export async function
requestSwissPropertyValuationFromFpre(
  _input: FpreValuationInput
): Promise<FpreValuationResult> {
  throw new Error(
    "FPRE_INTEGRATION_PENDING_DOCUMENTATION"
  );
}
