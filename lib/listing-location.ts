import {
  resolveSwissAddress,
} from "@/lib/swiss-location";

export type ListingResolvedLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

type LegacyListingMarket =
  | "CH"
  | "DE";

type ResolveListingAddressInput = {
  countryCode?: string | null;
  market?: LegacyListingMarket | null;
  street: string;
  postalCode: string;
  city: string;
};

type MapTilerFeature = {
  place_name?: string;
  text?: string;
  center?: [number, number];
  geometry?: {
    coordinates?: number[];
  };
};

type MapTilerResponse = {
  features?: MapTilerFeature[];
};

function normalizeCountryCode(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim().toUpperCase();

  return /^[A-Z]{2}$/.test(normalized)
    ? normalized
    : null;
}

function languageForCountry(
  countryCode: string
) {
  if (
    countryCode === "CH" ||
    countryCode === "DE" ||
    countryCode === "AT"
  ) {
    return "de";
  }

  if (countryCode === "IT") {
    return "it";
  }

  if (countryCode === "FR") {
    return "fr";
  }

  if (
    countryCode === "ES"
  ) {
    return "es";
  }

  if (
    countryCode === "PT" ||
    countryCode === "BR"
  ) {
    return "pt";
  }

  return "en";
}

function appOriginForCountry(
  countryCode: string
) {
  if (countryCode === "DE") {
    return "https://inserat-ai.de";
  }

  if (countryCode === "AT") {
    return "https://inserat-ai.at";
  }

  return "https://inserat-ai.ch";
}

export async function resolveListingAddress(
  input: ResolveListingAddressInput
): Promise<ListingResolvedLocation | null> {
  const countryCode =
    normalizeCountryCode(
      input.countryCode
    ) ??
    normalizeCountryCode(
      input.market
    );

  const street =
    input.street.trim();

  const postalCode =
    input.postalCode.trim();

  const city =
    input.city.trim();

  if (
    !countryCode ||
    !street ||
    !postalCode ||
    !city
  ) {
    return null;
  }

  try {
    /*
     * Schweiz behält geo.admin.ch.
     */
    if (countryCode === "CH") {
      const swiss =
        await resolveSwissAddress({
          street,
          zip: postalCode,
          city,
        });

      if (!swiss) {
        return null;
      }

      return {
        label: swiss.label,
        latitude: swiss.latitude,
        longitude: swiss.longitude,
      };
    }

    /*
     * Alle übrigen ISO-2 Länder
     * nutzen den globalen Geocoder.
     */
    const key =
      process.env.MAPTILER_API_KEY
        ?.trim() ||
      process.env.NEXT_PUBLIC_MAPTILER_KEY
        ?.trim() ||
      "";

    if (!key) {
      console.warn(
        "[listing-location] MapTiler-Key fehlt."
      );
      return null;
    }

    const query =
      [
        street,
        postalCode,
        city,
      ].join(" ");

    const params =
      new URLSearchParams({
        key,
        country:
          countryCode.toLowerCase(),
        types: "address",
        language:
          languageForCountry(
            countryCode
          ),
        limit: "5",
      });

    const requestOrigin =
      process.env.NODE_ENV ===
      "development"
        ? "http://localhost:3000"
        : appOriginForCountry(
            countryCode
          );

    const url =
      "https://api.maptiler.com/geocoding/" +
      encodeURIComponent(query) +
      ".json?" +
      params.toString();

    const response =
      await fetch(
        url,
        {
          headers: {
            Accept:
              "application/json",
            Origin:
              requestOrigin,
            Referer:
              requestOrigin + "/",
          },
          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      console.warn(
        "[listing-location] MapTiler",
        countryCode,
        response.status
      );
      return null;
    }

    const data =
      (await response.json()) as
        MapTilerResponse;

    for (
      const feature of
        data.features ?? []
    ) {
      const coordinates =
        feature.center ??
        feature.geometry
          ?.coordinates;

      const longitude =
        coordinates?.[0];

      const latitude =
        coordinates?.[1];

      if (
        typeof longitude !== "number" ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180 ||
        typeof latitude !== "number" ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        continue;
      }

      return {
        label:
          feature.place_name ??
          feature.text ??
          query,
        longitude,
        latitude,
      };
    }

    return null;
  }
  catch (error) {
    console.error(
      "[listing-location]",
      error
    );

    return null;
  }
}
