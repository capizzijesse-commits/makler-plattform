export type StrictListingTextInput = {
  location?: unknown;
  propertyType?: unknown;
  rooms?: unknown;
  livingArea?: unknown;
  price?: unknown;
  verifiedFeatures?: unknown;
};

export type StrictListingTextVariant = {
  title?: unknown;
  text?: unknown;
};

export const STRICT_PROPERTY_FEATURES = [
  {
    label: "Balkon",
    pattern: /\b(?:balkon|balkone|balkons)\b/i,
  },
  {
    label: "Terrasse",
    pattern: /\b(?:terrasse|terrassen)\b/i,
  },
  {
    label: "Garten",
    pattern: /\b(?:garten|g\u00e4rten|gartenanlage|gartensitzplatz)\b/i,
  },
  {
    label: "Garage",
    pattern: /\b(?:garage|garagen|garagenplatz|einstellhallenplatz)\b/i,
  },
  {
    label: "Kamin",
    pattern: /\b(?:kamin|kaminofen|chemin\u00e9e|cheminee)\b/i,
  },
  {
    label: "Pool",
    pattern: /\b(?:pool|swimmingpool|schwimmbecken)\b/i,
  },
  {
    label: "Lift",
    pattern: /\b(?:lift|aufzug|personenaufzug)\b/i,
  },
  {
    label: "Stellplatz",
    pattern: /\b(?:stellplatz|stellpl\u00e4tze|parkplatz|parkpl\u00e4tze)\b/i,
  },
] as const;

export function toStrictFactText(
  value: unknown
): string {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map(toStrictFactText)
      .filter(Boolean)
      .join("\n");
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

export function findUnsupportedPropertyFeatures(
  input: StrictListingTextInput,
  variants: StrictListingTextVariant[]
): string[] {
  const verifiedFactCorpus = [
    toStrictFactText(input.location),
    toStrictFactText(input.propertyType),
    toStrictFactText(input.rooms),
    toStrictFactText(input.livingArea),
    toStrictFactText(input.price),
    toStrictFactText(input.verifiedFeatures),
  ]
    .filter(Boolean)
    .join("\n");

  const unsupported =
    new Set<string>();

  for (
    const feature
    of STRICT_PROPERTY_FEATURES
  ) {
    const supported =
      feature.pattern.test(
        verifiedFactCorpus
      );

    if (supported) {
      continue;
    }

    for (
      const variant
      of variants
    ) {
      const generatedCorpus = [
        toStrictFactText(
          variant.title
        ),
        toStrictFactText(
          variant.text
        ),
      ]
        .filter(Boolean)
        .join("\n");

      if (
        feature.pattern.test(
          generatedCorpus
        )
      ) {
        unsupported.add(
          feature.label
        );
      }
    }
  }

  return [
    ...unsupported,
  ];
}

export function removeUnsupportedImageClaims(
  value: unknown,
  unsupportedLabels: string[]
): string {
  const raw =
    toStrictFactText(
      value
    );

  if (!raw) {
    return "";
  }

  const blockedFeatures =
    STRICT_PROPERTY_FEATURES.filter(
      (feature) =>
        unsupportedLabels.includes(
          feature.label
        )
    );

  return raw
    .split(/\r?\n/)
    .filter(
      (line) =>
        !blockedFeatures.some(
          (feature) =>
            feature.pattern.test(
              line
            )
        )
    )
    .join("\n");
}
