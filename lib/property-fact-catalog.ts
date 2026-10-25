export type PropertyFactCategory =
  | "identity"
  | "location"
  | "space"
  | "building"
  | "equipment"
  | "energy"
  | "financial";

export type PropertyFactValueType =
  | "text"
  | "number"
  | "boolean";

export type PropertyFactDefinition = {
  key: string;
  category: PropertyFactCategory;
  valueType: PropertyFactValueType;
  unit?: string;
  publication: "standard" | "restricted";
};

export const PROPERTY_FACT_CATALOG: readonly PropertyFactDefinition[] = [
  { key: "propertyType", category: "identity", valueType: "text", publication: "standard" },
  { key: "marketingType", category: "identity", valueType: "text", publication: "standard" },

  { key: "location", category: "location", valueType: "text", publication: "standard" },
  { key: "postalCode", category: "location", valueType: "text", publication: "restricted" },
  { key: "street", category: "location", valueType: "text", publication: "restricted" },

  { key: "rooms", category: "space", valueType: "number", publication: "standard" },
  { key: "bedrooms", category: "space", valueType: "number", publication: "standard" },
  { key: "bathrooms", category: "space", valueType: "number", publication: "standard" },
  { key: "livingArea", category: "space", valueType: "number", unit: "m2", publication: "standard" },
  { key: "plotArea", category: "space", valueType: "number", unit: "m2", publication: "standard" },
  { key: "usableArea", category: "space", valueType: "number", unit: "m2", publication: "standard" },

  { key: "constructionYear", category: "building", valueType: "number", publication: "standard" },
  { key: "renovationYear", category: "building", valueType: "number", publication: "standard" },
  { key: "condition", category: "building", valueType: "text", publication: "standard" },
  { key: "floorLevel", category: "building", valueType: "text", publication: "standard" },

  { key: "balcony", category: "equipment", valueType: "boolean", publication: "standard" },
  { key: "terrace", category: "equipment", valueType: "boolean", publication: "standard" },
  { key: "garden", category: "equipment", valueType: "boolean", publication: "standard" },
  { key: "elevator", category: "equipment", valueType: "boolean", publication: "standard" },
  { key: "parkingSpaces", category: "equipment", valueType: "number", publication: "standard" },
  { key: "kitchen", category: "equipment", valueType: "text", publication: "standard" },

  { key: "heatingSystem", category: "energy", valueType: "text", publication: "standard" },
  { key: "energySource", category: "energy", valueType: "text", publication: "standard" },
  { key: "energyCertificate", category: "energy", valueType: "text", publication: "standard" },
  { key: "photovoltaics", category: "energy", valueType: "boolean", publication: "standard" },

  { key: "price", category: "financial", valueType: "text", publication: "standard" },
  { key: "netRent", category: "financial", valueType: "text", publication: "standard" },
  { key: "additionalCosts", category: "financial", valueType: "text", publication: "standard" },
];

const CATALOG_BY_KEY = new Map(
  PROPERTY_FACT_CATALOG.map(
    (definition) => [definition.key, definition]
  )
);

export function getPropertyFactDefinition(
  key: string
): PropertyFactDefinition | undefined {
  return CATALOG_BY_KEY.get(key);
}

export function isPublicPropertyFactKey(
  key: string
): boolean {
  return getPropertyFactDefinition(key)?.publication === "standard";
}

export function getPropertyFactDefinitionsByCategory(
  category: PropertyFactCategory
): PropertyFactDefinition[] {
  return PROPERTY_FACT_CATALOG.filter(
    (definition) => definition.category === category
  );
}