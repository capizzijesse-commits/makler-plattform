export type SalesExposeFacts = {
  countryCode?: string;
  street?: string;
  postalCode?: string;
  location?: string;
  propertyType?: string;
  rooms?: string;
  livingArea?: string;
  price?: string;
  highlights?: string;
  styleText?: string;
};

export type SalesExposeImage = {
  fileName: string;
  analysis: string;
};

export type SalesExposeVariant = {
  title?: string;
  text?: string;
  highlights?: string[];
};

export type SalesExposeInput = {
  facts: SalesExposeFacts;
  images: SalesExposeImage[];
  variants: SalesExposeVariant[];
};

export type SalesExposeKeyFact = {
  label: string;
  value: string;
};

export type SalesExposeDocument = {
  version: "v1";
  generatedAt: string;
  title: string;
  subtitle: string;
  description: string;
  keyFacts: SalesExposeKeyFact[];
  highlights: string[];
  images: SalesExposeImage[];
  facts: SalesExposeFacts;
  primaryVariant: SalesExposeVariant | null;
};

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function splitHighlights(value: string | undefined): string[] {
  return clean(value)
    .split(/\r?\n|[,;•]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function buildSalesExposeDocument(
  input: SalesExposeInput
): SalesExposeDocument {
  const primaryVariant =
    input.variants[0]
      ? { ...input.variants[0] }
      : null;

  const facts = {
    ...input.facts,
  };

  const locationLine = [
    clean(facts.postalCode),
    clean(facts.location),
  ]
    .filter(Boolean)
    .join(" ");

  const title =
    clean(primaryVariant?.title) ||
    clean(facts.propertyType) ||
    "Immobilienexposé";

  const subtitle =
    locationLine ||
    clean(facts.street) ||
    "Immobilie";

  const description =
    clean(primaryVariant?.text) ||
    clean(facts.styleText);

  const keyFacts: SalesExposeKeyFact[] = [
    {
      label: "Objektart",
      value: clean(facts.propertyType),
    },
    {
      label: "Zimmer",
      value: clean(facts.rooms),
    },
    {
      label: "Wohnfläche",
      value: clean(facts.livingArea),
    },
    {
      label: "Preis",
      value: clean(facts.price),
    },
  ].filter((item) => Boolean(item.value));

  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    title,
    subtitle,
    description,
    keyFacts,
    highlights: splitHighlights(facts.highlights),
    images: input.images.map((image) => ({
      ...image,
    })),
    facts,
    primaryVariant,
  };
}

