import {
  resolveSwissAddress,
} from "@/lib/swiss-location";

export type ListingResolvedLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

type ListingMarket =
  | "CH"
  | "DE";

type MapTilerFeature = {
  place_name?: string;
  text?: string;

  center?: [
    number,
    number
  ];

  geometry?: {
    coordinates?: number[];
  };
};

type MapTilerResponse = {
  features?: MapTilerFeature[];
};

function validCoordinates(
  longitude: unknown,
  latitude: unknown
) {
  return (
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}

export async function resolveListingAddress(
  input: {
    market: ListingMarket;
    street: string;
    postalCode: string;
    city: string;
  }
): Promise<ListingResolvedLocation | null> {
  const street =
    input.street.trim();

  const postalCode =
    input.postalCode.trim();

  const city =
    input.city.trim();

  if (
    !street ||
    !postalCode ||
    !city
  ) {
    return null;
  }

  try {
    if (
      input.market === "CH"
    ) {
      const swiss =
        await resolveSwissAddress({
          street,
          zip:
            postalCode,
          city,
        });

      if (!swiss) {
        return null;
      }

      return {
        label:
          swiss.label,

        latitude:
          swiss.latitude,

        longitude:
          swiss.longitude,
      };
    }

    const key =
      process.env
        .MAPTILER_API_KEY
        ?.trim() ||
      process.env
        .NEXT_PUBLIC_MAPTILER_KEY
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
        "Deutschland",
      ].join(" ");

    const params =
      new URLSearchParams({
        key,
        country:
          "de",
        types:
          "address",
        language:
          "de",
        limit:
          "5",
      });

    const requestOrigin =
      process.env.NODE_ENV ===
      "development"
        ? "http://localhost:3000"
        : input.market === "DE"
          ? "https://inserat-ai.de"
          : "https://inserat-ai.ch";

    const response =
      await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(
          query
        )}.json?${params.toString()}`,
        {
          headers: {
            Accept:
              "application/json",

            Origin:
              requestOrigin,

            Referer:
              `${requestOrigin}/`,
          },

          cache:
            "no-store",
        }
      );

    if (!response.ok) {
      console.warn(
        "[listing-location] MapTiler",
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
        !Number.isFinite(
          longitude
        ) ||
        longitude < -180 ||
        longitude > 180 ||
        typeof latitude !== "number" ||
        !Number.isFinite(
          latitude
        ) ||
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
