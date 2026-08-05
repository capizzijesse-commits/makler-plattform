export const HOME_STAGING_QUALITY_VERSION =
  "home-staging-quality-v1";

export const HOME_STAGING_ROOM_TYPES = [
  "livingRoom",
  "bedroom",
  "office",
  "diningRoom",
  "kidsRoom",
  "kitchen",
  "bathroom",
  "hallway",
  "balcony",
  "terrace",
  "garden",
  "exterior",
  "other",
  "unclear",
] as const;

export type HomeStagingRoomType =
  (typeof HOME_STAGING_ROOM_TYPES)[number];

export const HOME_STAGING_ROOM_CONDITIONS = [
  "empty",
  "sparselyFurnished",
  "furnished",
  "renovationNeeded",
  "unclear",
] as const;

export type HomeStagingRoomCondition =
  (typeof HOME_STAGING_ROOM_CONDITIONS)[number];

export const HOME_STAGING_TRANSFORMATIONS = [
  "furnishEmpty",
  "redesignFurnished",
  "renovateKitchen",
  "renovateBathroom",
  "designOutdoor",
  "notRecommended",
  "needsConfirmation",
] as const;

export type HomeStagingTransformation =
  (typeof HOME_STAGING_TRANSFORMATIONS)[number];

export const HOME_STAGING_STYLES = [
  "modern",
  "scandinavian",
  "luxurious",
  "minimalist",
] as const;

export type HomeStagingStyle =
  (typeof HOME_STAGING_STYLES)[number];

export type HomeStagingAnalysisInput = {
  roomType: HomeStagingRoomType;
  roomTypeLabel: string;
  roomCondition: HomeStagingRoomCondition;
  transformation: HomeStagingTransformation;
  style: HomeStagingStyle;
  confidence: number;

  visibleFacts: string[];
  lockedArchitecture: string[];
  warnings: string[];

  layoutGoal?: string;
  furnitureScale?: string;
  forbiddenElements?: string[];
  customInstructions?: string;
};

export type TransformationBrief = {
  version: typeof HOME_STAGING_QUALITY_VERSION;

  roomType: HomeStagingRoomType;
  roomTypeLabel: string;
  roomCondition: HomeStagingRoomCondition;
  transformation: HomeStagingTransformation;
  style: HomeStagingStyle;
  confidence: number;
  canGenerate: boolean;

  objective: string;
  visibleFacts: string[];
  protectedArchitecture: string[];
  layoutRules: string[];
  allowedChanges: string[];
  forbiddenChanges: string[];
  antiClicheRules: string[];
  styleRules: string[];
  warnings: string[];
  userInstructions: string;
};

type TransformationProfile = {
  objective: string;
  allowedChanges: string[];
  layoutRules: string[];
  forbiddenChanges: string[];
};

const GLOBAL_PROTECTION_RULES = [
  "Preserve the original camera position, crop and perspective.",
  "Preserve the visible room dimensions and ceiling height.",
  "Preserve all windows, doors, walls, floors and ceilings.",
  "Preserve radiators, stairs, columns and built-in installations.",
  "Preserve the direction of daylight and the exterior view.",
  "Do not invent openings, rooms or architectural elements.",
];

const GLOBAL_FORBIDDEN_CHANGES = [
  "Do not add a fireplace unless one is clearly visible.",
  "Do not add windows, doors, balconies or additional rooms.",
  "Do not hide radiators, doors or required walking routes.",
  "Do not change permanent surfaces without renovation approval.",
  "Do not use furniture that is too large for the visible room.",
  "Do not place furniture through walls, windows or fixed elements.",
  "Do not add people, pets, text, logos, borders or watermarks.",
];

const ANTI_CLICHE_RULES = [
  "Do not automatically use the standard beige AI sofa composition.",
  "Do not add decorative plants to every empty corner.",
  "Do not use marble, brass, velvet or bouclé merely to signal luxury.",
  "Do not fill every wall with generic artwork.",
  "Do not create an interchangeable social-media showroom.",
  "Do not overcrowd the room with cushions, rugs and decoration.",
  "Do not add furniture that is unrelated to the recognised room use.",
  "Every added object must have a plausible function and position.",
  "The result must remain a credible Swiss property photograph.",
];

const STYLE_RULES: Record<
  HomeStagingStyle,
  string[]
> = {
  modern: [
    "Use clean contemporary furniture with realistic dimensions.",
    "Use restrained warm neutrals and natural wood only where suitable.",
    "Prefer functional placement over decorative spectacle.",
    "Avoid generic luxury styling and excessive black accents.",
  ],

  scandinavian: [
    "Use light natural materials and visually simple furniture.",
    "Keep the layout practical, calm and suitable for everyday use.",
    "Use decoration sparingly.",
    "Avoid turning the room into a generic catalogue scene.",
  ],

  luxurious: [
    "Create quality through proportions, materials and restraint.",
    "Use at most a few clearly premium movable elements.",
    "Avoid flashy gold, excessive marble and hotel-lobby staging.",
    "Luxury must remain plausible for the visible property.",
  ],

  minimalist: [
    "Use only the furniture required for the recognised room function.",
    "Preserve visible floor area and clear walking routes.",
    "Use very little decoration.",
    "Do not confuse minimalism with an unfinished or unusable room.",
  ],
};

const TRANSFORMATION_PROFILES: Record<
  HomeStagingTransformation,
  TransformationProfile
> = {
  furnishEmpty: {
    objective:
      "Furnish the empty or nearly empty room according to its recognised use.",

    allowedChanges: [
      "Add plausible movable furniture.",
      "Add restrained textiles, lighting and decoration.",
      "Create a clear functional zone.",
    ],

    layoutRules: [
      "Keep the principal walking route open.",
      "Use furniture proportions suited to the visible room.",
      "Leave sufficient visible floor area.",
      "Do not obstruct windows, doors or radiators.",
    ],

    forbiddenChanges: [
      "Do not change floors, walls, ceilings or fixed installations.",
      "Do not create an additional room function without evidence.",
    ],
  },

  redesignFurnished: {
    objective:
      "Replace or reorganise the existing movable furnishing without changing the room itself.",

    allowedChanges: [
      "Replace visible movable furniture with a coherent collection.",
      "Remove visual clutter and unnecessary movable objects.",
      "Adjust textiles, lamps and restrained decoration.",
    ],

    layoutRules: [
      "Preserve the recognised principal room function.",
      "Do not place a second furnishing concept over existing furniture.",
      "Maintain plausible circulation and furniture clearances.",
    ],

    forbiddenChanges: [
      "Do not remove fixed installations.",
      "Do not disguise structural problems through decoration.",
      "Do not convert the room into another use without confirmation.",
    ],
  },

  renovateKitchen: {
    objective:
      "Create a realistic kitchen renovation while preserving the visible kitchen position and room geometry.",

    allowedChanges: [
      "Update visible cabinet fronts and handles.",
      "Update worktops, splashbacks, taps and visible appliance finishes.",
      "Improve movable lighting and restrained decoration.",
    ],

    layoutRules: [
      "Respect the visible kitchen footprint.",
      "Keep realistic appliance and cabinet dimensions.",
      "Maintain usable working and walking zones.",
    ],

    forbiddenChanges: [
      "Do not invent a kitchen island without sufficient visible space.",
      "Do not relocate windows, doors or plumbing positions.",
      "Do not enlarge the kitchen beyond the visible room.",
    ],
  },

  renovateBathroom: {
    objective:
      "Create a realistic bathroom renovation while preserving the visible layout.",

    allowedChanges: [
      "Update visible tiles, fittings, furniture fronts and mirrors.",
      "Improve lighting and restrained bathroom accessories.",
    ],

    layoutRules: [
      "Keep sanitary elements in plausible visible positions.",
      "Maintain realistic access and movement space.",
    ],

    forbiddenChanges: [
      "Do not invent an additional bath, shower, toilet or window.",
      "Do not enlarge the bathroom.",
      "Do not relocate doors or structural walls.",
    ],
  },

  designOutdoor: {
    objective:
      "Stage the visible outdoor area with a plausible restrained outdoor concept.",

    allowedChanges: [
      "Add suitable outdoor furniture.",
      "Add restrained movable planters and lighting.",
      "Create a clear seating or dining function where space permits.",
    ],

    layoutRules: [
      "Respect the visible usable surface.",
      "Keep access doors and circulation clear.",
      "Use weather-appropriate furniture dimensions.",
    ],

    forbiddenChanges: [
      "Do not alter façades, railings or property boundaries.",
      "Do not change the visible view or surrounding buildings.",
      "Do not create a pool, pergola or permanent structure.",
      "Do not create an artificial resort scene.",
    ],
  },

  notRecommended: {
    objective:
      "Do not generate a transformation for an unsuitable photograph.",

    allowedChanges: [],
    layoutRules: [],

    forbiddenChanges: [
      "Generation must remain blocked until another photograph is selected.",
    ],
  },

  needsConfirmation: {
    objective:
      "Wait for confirmation of the room type or transformation before generation.",

    allowedChanges: [],
    layoutRules: [],

    forbiddenChanges: [
      "Do not generate while important room facts remain unconfirmed.",
    ],
  },
};

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanUniqueList(
  values: unknown,
  maximumItems: number
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<string>();

  for (const value of values) {
    const text = cleanText(value);

    if (!text) {
      continue;
    }

    unique.add(text.slice(0, 300));

    if (unique.size >= maximumItems) {
      break;
    }
  }

  return [...unique];
}

function normalizeConfidence(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, value)
  );
}

export function buildTransformationBrief(
  input: HomeStagingAnalysisInput
): TransformationBrief {
  const profile =
    TRANSFORMATION_PROFILES[
      input.transformation
    ];

  const confidence =
    normalizeConfidence(input.confidence);

  const visibleFacts =
    cleanUniqueList(
      input.visibleFacts,
      20
    );

  const protectedArchitecture =
    cleanUniqueList(
      [
        ...GLOBAL_PROTECTION_RULES,
        ...input.lockedArchitecture,
      ],
      30
    );

  const forbiddenChanges =
    cleanUniqueList(
      [
        ...GLOBAL_FORBIDDEN_CHANGES,
        ...profile.forbiddenChanges,
        ...(input.forbiddenElements || []),
      ],
      35
    );

  const layoutRules =
    cleanUniqueList(
      [
        ...profile.layoutRules,
        cleanText(input.layoutGoal),
        input.furnitureScale
          ? `Use a ${cleanText(
              input.furnitureScale
            )} furniture scale.`
          : "",
      ],
      20
    );

  const canGenerate =
    input.roomType !== "unclear" &&
    input.roomCondition !== "unclear" &&
    input.transformation !==
      "notRecommended" &&
    input.transformation !==
      "needsConfirmation" &&
    confidence >= 0.55 &&
    visibleFacts.length > 0;

  return {
    version:
      HOME_STAGING_QUALITY_VERSION,

    roomType: input.roomType,
    roomTypeLabel:
      cleanText(input.roomTypeLabel) ||
      input.roomType,

    roomCondition:
      input.roomCondition,

    transformation:
      input.transformation,

    style: input.style,
    confidence,
    canGenerate,

    objective:
      profile.objective,

    visibleFacts,

    protectedArchitecture,

    layoutRules,

    allowedChanges:
      cleanUniqueList(
        profile.allowedChanges,
        20
      ),

    forbiddenChanges,

    antiClicheRules:
      [...ANTI_CLICHE_RULES],

    styleRules:
      [...STYLE_RULES[input.style]],

    warnings:
      cleanUniqueList(
        input.warnings,
        15
      ),

    userInstructions:
      cleanText(
        input.customInstructions
      ).slice(0, 500),
  };
}

function bulletList(
  values: string[]
): string {
  if (values.length === 0) {
    return "- None confirmed.";
  }

  return values
    .map((value) => `- ${value}`)
    .join("\n");
}

export function buildFactBasedStagingPrompt(
  brief: TransformationBrief,
  variationInstruction = ""
): string {
  if (!brief.canGenerate) {
    throw new Error(
      "Home-Staging-Analyse ist noch nicht ausreichend bestätigt."
    );
  }

  const userInstructions =
    brief.userInstructions
      ? brief.userInstructions
      : "No additional user furnishing wishes were provided.";

  return [
    "Create a photorealistic virtual home-staging edit of the supplied real-estate photograph.",
    "",
    "This is not a generic interior-design request.",
    "Base every visible change on the confirmed facts and transformation brief below.",
    "",
    "CONFIRMED ROOM:",
    `Room type: ${brief.roomTypeLabel}`,
    `Room condition: ${brief.roomCondition}`,
    `Transformation: ${brief.transformation}`,
    `Selected style: ${brief.style}`,
    "",
    "CONFIRMED VISIBLE FACTS:",
    bulletList(brief.visibleFacts),
    "",
    "TRANSFORMATION OBJECTIVE:",
    brief.objective,
    "",
    "ALLOWED CHANGES:",
    bulletList(brief.allowedChanges),
    "",
    "LAYOUT RULES:",
    bulletList(brief.layoutRules),
    "",
    "PROTECTED ARCHITECTURE:",
    bulletList(
      brief.protectedArchitecture
    ),
    "",
    "FORBIDDEN CHANGES:",
    bulletList(
      brief.forbiddenChanges
    ),
    "",
    "ANTI-CLICHÉ RULES:",
    bulletList(
      brief.antiClicheRules
    ),
    "",
    "STYLE-SPECIFIC RULES:",
    bulletList(brief.styleRules),
    "",
    "USER INSTRUCTIONS:",
    userInstructions,
    "",
    variationInstruction
      ? "VARIATION REQUIREMENT:"
      : "",
    variationInstruction,
    "",
    "FINAL QUALITY STANDARD:",
    "- The result must remain recognisably the same photographed property.",
    "- Furniture dimensions and placement must be physically plausible.",
    "- The image must look like a professional Swiss property photograph.",
    "- Do not produce an illustration, catalogue render or generic AI showroom.",
  ]
    .filter(Boolean)
    .join("\n");
}