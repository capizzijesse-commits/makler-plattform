import {
  HOME_STAGING_ROOM_CONDITIONS,
  HOME_STAGING_ROOM_TYPES,
  HOME_STAGING_STYLES,
  HOME_STAGING_TRANSFORMATIONS,
  type HomeStagingAnalysisInput,
  type HomeStagingRoomCondition,
  type HomeStagingRoomType,
  type HomeStagingStyle,
  type HomeStagingTransformation,
} from "@/lib/home-staging-quality";

export const LISTING_IMAGE_ANALYSIS_CACHE_VERSION =
  "listing-image-analysis-cache-v1";

export type CachedHomeStagingAnalysis =
  HomeStagingAnalysisInput & {
    summary: string;
  };

export type ListingImageAnalysisCache = {
  version:
    typeof LISTING_IMAGE_ANALYSIS_CACHE_VERSION;
  listingText: string;
  homeStaging:
    | CachedHomeStagingAnalysis
    | null;
};

const ROOM_TYPE_SET =
  new Set<string>(HOME_STAGING_ROOM_TYPES);

const ROOM_CONDITION_SET =
  new Set<string>(
    HOME_STAGING_ROOM_CONDITIONS
  );

const TRANSFORMATION_SET =
  new Set<string>(
    HOME_STAGING_TRANSFORMATIONS
  );

const STYLE_SET =
  new Set<string>(HOME_STAGING_STYLES);

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanStringArray(
  value: unknown,
  maximumItems: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        Boolean(item.trim())
    )
    .map((item) => item.trim().slice(0, 220))
    .slice(0, maximumItems);
}

function extractSection(
  text: string,
  heading: string,
  nextHeading?: string
): string {
  const lowerText = text.toLowerCase();
  const lowerHeading = heading.toLowerCase();

  const startIndex =
    lowerText.indexOf(lowerHeading);

  if (startIndex < 0) {
    return "";
  }

  const contentStart =
    startIndex + heading.length;

  if (!nextHeading) {
    return text.slice(contentStart).trim();
  }

  const endIndex =
    lowerText.indexOf(
      nextHeading.toLowerCase(),
      contentStart
    );

  return text
    .slice(
      contentStart,
      endIndex >= 0
        ? endIndex
        : undefined
    )
    .trim();
}

function splitStatements(
  value: string,
  maximumItems: number
): string[] {
  return value
    .split(/(?:\r?\n|(?<=[.!?])\s+)/)
    .map((item) =>
      item
        .replace(/^[-•]\s*/, "")
        .trim()
    )
    .filter(Boolean)
    .slice(0, maximumItems);
}

function includesAny(
  value: string,
  terms: string[]
): boolean {
  return terms.some((term) =>
    value.includes(term)
  );
}

function detectRoomType(
  roomSection: string
): HomeStagingRoomType {
  const value = roomSection.toLowerCase();

  const rules: Array<
    [HomeStagingRoomType, string[]]
  > = [
    [
      "bathroom",
      [
        "badezimmer",
        "bad ",
        "dusche",
        "badewanne",
        "lavabo",
        "waschbecken",
      ],
    ],
    [
      "kitchen",
      [
        "küche",
        "kitchen",
        "kochbereich",
      ],
    ],
    [
      "office",
      [
        "büro",
        "arbeitszimmer",
        "arbeitsplatz",
        "office",
      ],
    ],
    [
      "kidsRoom",
      [
        "kinderzimmer",
        "spielzimmer",
      ],
    ],
    [
      "bedroom",
      [
        "schlafzimmer",
        "schlafraum",
        "bett",
      ],
    ],
    [
      "diningRoom",
      [
        "esszimmer",
        "essbereich",
      ],
    ],
    [
      "livingRoom",
      [
        "wohnzimmer",
        "wohnbereich",
        "wohnraum",
      ],
    ],
    [
      "hallway",
      [
        "eingangsbereich",
        "korridor",
        "flur",
        "diele",
      ],
    ],
    [
      "balcony",
      ["balkon"],
    ],
    [
      "terrace",
      ["terrasse"],
    ],
    [
      "garden",
      ["garten"],
    ],
    [
      "exterior",
      [
        "aussenansicht",
        "fassade",
        "gebäudeansicht",
      ],
    ],
    [
      "storageRoom",
      [
        "abstellraum",
        "réduit",
        "reduit",
        "lagerraum",
        "utility room",
      ],
    ],
  ];

  for (const [roomType, terms] of rules) {
    if (includesAny(value, terms)) {
      return roomType;
    }
  }

  return "unclear";
}

function roomTypeLabel(
  roomType: HomeStagingRoomType
): string {
  const labels: Record<
    HomeStagingRoomType,
    string
  > = {
    livingRoom: "Wohnzimmer",
    bedroom: "Schlafzimmer",
    office: "Büro",
    diningRoom: "Esszimmer",
    kidsRoom: "Kinderzimmer",
    storageRoom: "Abstellraum",
    kitchen: "Küche",
    bathroom: "Badezimmer",
    hallway: "Eingangsbereich",
    balcony: "Balkon",
    terrace: "Terrasse",
    garden: "Garten",
    exterior: "Aussenbereich",
    other: "Anderer Bereich",
    unclear: "Unklarer Raum",
  };

  return labels[roomType];
}

function detectCondition(
  text: string
): HomeStagingRoomCondition {
  const value = text.toLowerCase();

  if (
    includesAny(value, [
      "renovationsbedarf",
      "renovierungsbedarf",
      "sanierungsbedarf",
      "renovierungsbedürftig",
      "stark abgenutzt",
    ])
  ) {
    return "renovationNeeded";
  }

  if (
    includesAny(value, [
      "weitgehend leer",
      "fast leer",
      "nahezu leer",
      "spärlich möbliert",
      "wenig möbliert",
    ])
  ) {
    return "sparselyFurnished";
  }

  if (
    includesAny(value, [
      "leerer raum",
      "leeres zimmer",
      "unmöbliert",
      "ohne möbel",
    ])
  ) {
    return "empty";
  }

  if (
    includesAny(value, [
      "möbliert",
      "sofa",
      "sessel",
      "esstisch",
      "schreibtisch",
      "bett",
      "schrank",
    ])
  ) {
    return "furnished";
  }

  return "unclear";
}

function detectTransformation(
  roomType: HomeStagingRoomType,
  condition: HomeStagingRoomCondition
): HomeStagingTransformation {
  if (
    [
      "balcony",
      "terrace",
      "garden",
      "exterior",
    ].includes(roomType)
  ) {
    return "designOutdoor";
  }

  if (
    roomType === "kitchen" &&
    condition === "renovationNeeded"
  ) {
    return "renovateKitchen";
  }

  if (
    roomType === "bathroom" &&
    condition === "renovationNeeded"
  ) {
    return "renovateBathroom";
  }

  if (
    condition === "empty" ||
    condition === "sparselyFurnished"
  ) {
    return "furnishEmpty";
  }

  if (condition === "furnished") {
    return "redesignFurnished";
  }

  return "needsConfirmation";
}

function detectFurnitureScale(
  text: string
): string {
  const value = text.toLowerCase();

  if (
    includesAny(value, [
      "sehr klein",
      "kleines zimmer",
      "schmal",
      "kompakt",
    ])
  ) {
    return "small";
  }

  if (
    includesAny(value, [
      "grosszügig",
      "sehr gross",
      "grosser raum",
    ])
  ) {
    return "large";
  }

  return "medium";
}

function buildLockedArchitecture(
  text: string
): string[] {
  const value = text.toLowerCase();

  const rules: Array<
    [string[], string]
  > = [
    [
      ["fenster"],
      "Sichtbare Fensterpositionen erhalten",
    ],
    [
      ["tür", "türe"],
      "Sichtbare Türpositionen erhalten",
    ],
    [
      ["boden", "parkett", "platten"],
      "Sichtbaren Bodenbelag erhalten",
    ],
    [
      ["wand", "wände"],
      "Sichtbare Wände und Raumgeometrie erhalten",
    ],
    [
      ["decke"],
      "Sichtbare Deckenform erhalten",
    ],
    [
      ["heizkörper", "radiator"],
      "Sichtbare Heizkörper erhalten",
    ],
    [
      ["treppe"],
      "Sichtbare Treppe erhalten",
    ],
  ];

  return rules
    .filter(([terms]) =>
      includesAny(value, terms)
    )
    .map(([, statement]) => statement)
    .slice(0, 6);
}

function validateHomeStaging(
  value: unknown
): CachedHomeStagingAnalysis | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  const roomType =
    cleanText(record.roomType);

  const roomCondition =
    cleanText(record.roomCondition);

  const transformation =
    cleanText(record.transformation);

  const style =
    cleanText(record.style);

  const summary =
    cleanText(record.summary);

  const roomTypeLabelValue =
    cleanText(record.roomTypeLabel);

  if (
    !ROOM_TYPE_SET.has(roomType) ||
    !ROOM_CONDITION_SET.has(
      roomCondition
    ) ||
    !TRANSFORMATION_SET.has(
      transformation
    ) ||
    !STYLE_SET.has(style) ||
    !summary ||
    !roomTypeLabelValue
  ) {
    return null;
  }

  const confidence =
    typeof record.confidence === "number" &&
    Number.isFinite(record.confidence)
      ? Math.max(
          0,
          Math.min(1, record.confidence)
        )
      : 0.75;

  return {
    roomType:
      roomType as HomeStagingRoomType,
    roomTypeLabel:
      roomTypeLabelValue,
    roomCondition:
      roomCondition as HomeStagingRoomCondition,
    transformation:
      transformation as HomeStagingTransformation,
    style:
      style as HomeStagingStyle,
    confidence,
    summary,
    visibleFacts:
      cleanStringArray(
        record.visibleFacts,
        6
      ),
    lockedArchitecture:
      cleanStringArray(
        record.lockedArchitecture,
        6
      ),
    warnings:
      cleanStringArray(
        record.warnings,
        3
      ),
    layoutGoal:
      cleanText(record.layoutGoal),
    furnitureScale:
      cleanText(record.furnitureScale) ||
      "medium",
    forbiddenElements:
      cleanStringArray(
        record.forbiddenElements,
        6
      ),
  };
}

export function parseListingImageAnalysisCache(
  rawValue: string | null | undefined
): ListingImageAnalysisCache | null {
  const raw = cleanText(rawValue);

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw) as Record<
        string,
        unknown
      >;

    if (
      parsed &&
      parsed.version ===
        LISTING_IMAGE_ANALYSIS_CACHE_VERSION
    ) {
      return {
        version:
          LISTING_IMAGE_ANALYSIS_CACHE_VERSION,
        listingText:
          cleanText(parsed.listingText),
        homeStaging:
          validateHomeStaging(
            parsed.homeStaging
          ),
      };
    }
  } catch {
    // Alte reine Textanalyse wird unten übernommen.
  }

  return {
    version:
      LISTING_IMAGE_ANALYSIS_CACHE_VERSION,
    listingText: raw,
    homeStaging: null,
  };
}

export function serializeListingImageAnalysisCache(
  input: {
    listingText?: string;
    homeStaging?:
      | CachedHomeStagingAnalysis
      | null;
  }
): string {
  return JSON.stringify({
    version:
      LISTING_IMAGE_ANALYSIS_CACHE_VERSION,
    listingText:
      cleanText(input.listingText),
    homeStaging:
      input.homeStaging ?? null,
  });
}

export function buildHomeStagingAnalysisFromListingText(
  listingText: string
): CachedHomeStagingAnalysis | null {
  const text = cleanText(listingText);

  if (!text) {
    return null;
  }

  const roomSection =
    extractSection(
      text,
      "Raum oder Bereich:",
      "Sichtbare Elemente:"
    ) || text.slice(0, 300);

  const roomType =
    detectRoomType(roomSection);

  if (
    roomType === "unclear" ||
    includesAny(
      roomSection.toLowerCase(),
      [
        "nicht eindeutig",
        "nicht sicher",
        "nicht bestimmbar",
      ]
    )
  ) {
    return null;
  }

  const visibleSection =
    extractSection(
      text,
      "Sichtbare Elemente:",
      "Zustand und Eindruck:"
    );

  const warningSection =
    extractSection(
      text,
      "Hinweise und Einschränkungen:"
    );

  const condition =
    detectCondition(text);

  const transformation =
    detectTransformation(
      roomType,
      condition
    );

  const summary =
    splitStatements(
      roomSection,
      1
    )[0] ||
    roomTypeLabel(roomType);

  const visibleFacts =
    splitStatements(
      visibleSection,
      6
    );

  const warnings =
    splitStatements(
      warningSection,
      3
    );

  return {
    roomType,
    roomTypeLabel:
      roomTypeLabel(roomType),
    roomCondition:
      condition,
    transformation,
    style: "modern",
    confidence:
      visibleFacts.length > 0
        ? 0.86
        : 0.74,
    summary:
      summary.slice(0, 240),
    visibleFacts,
    lockedArchitecture:
      buildLockedArchitecture(text),
    warnings,
    layoutGoal:
      "Eine funktionale, realistische Möblierung mit freien Laufwegen.",
    furnitureScale:
      detectFurnitureScale(text),
    forbiddenElements: [],
  };
}
