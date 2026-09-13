export const INSERAT_AI_COUNTRIES = [
  {
    code: "CH",
    label: "Schweiz",
    flag: "🇨🇭",
    currency: "CHF",
    locale: "de-CH",
    postalCodeLength: 4,
    streetLabel:
      "Strasse / Hausnummer",
    streetPlaceholder:
      "z. B. Bahnhofstrasse 20",
    postalCodePlaceholder:
      "8001",
    cityPlaceholder:
      "Winterthur",
  },
  {
    code: "DE",
    label: "Deutschland",
    flag: "🇩🇪",
    currency: "EUR",
    locale: "de-DE",
    postalCodeLength: 5,
    streetLabel:
      "Straße / Hausnummer",
    streetPlaceholder:
      "z. B. Friedrichstraße 100",
    postalCodePlaceholder:
      "10117",
    cityPlaceholder:
      "Berlin",
  },
  {
    code: "AT",
    label: "Österreich",
    flag: "🇦🇹",
    currency: "EUR",
    locale: "de-AT",
    postalCodeLength: 4,
    streetLabel:
      "Straße / Hausnummer",
    streetPlaceholder:
      "z. B. Kärntner Straße 1",
    postalCodePlaceholder:
      "1010",
    cityPlaceholder:
      "Wien",
  },
] as const;

export type InseratAiCountryCode =
  (typeof INSERAT_AI_COUNTRIES)[number]["code"];

export function isInseratAiCountryCode(
  value: unknown
): value is InseratAiCountryCode {
  return (
    value === "CH" ||
    value === "DE" ||
    value === "AT"
  );
}

export function getInseratAiCountryConfig(
  countryCode: InseratAiCountryCode
) {
  return (
    INSERAT_AI_COUNTRIES.find(
      (country) =>
        country.code ===
        countryCode
    ) ??
    INSERAT_AI_COUNTRIES[0]
  );
}
