export type SwissLocation = {
  label: string;
  detail: string;

  latitude: number;
  longitude: number;

  featureId: string | null;

  buildingAddressUrl: string | null;
  buildingRegisterUrl: string | null;
};

type GeoAdminLink = {
  rel?: string;
  title?: string;
  href?: string;
};

type GeoAdminResult = {
  attrs?: {
    detail?: string;
    featureId?: string;
    label?: string;

    lat?: number;
    lon?: number;

    origin?: string;
  };

  links?: GeoAdminLink[];
};

type GeoAdminResponse = {
  results?: GeoAdminResult[];
};

function stripHtml(
  value: string
) {
  return value.replace(
    /<[^>]*>/g,
    ""
  );
}

function absoluteGeoAdminUrl(
  href?: string
) {
  if (!href) {
    return null;
  }

  if (
    href.startsWith("http://") ||
    href.startsWith("https://")
  ) {
    return href;
  }

  return `https://api3.geo.admin.ch${href}`;
}

export async function resolveSwissAddress(
  input: {
    street: string;
    zip: string;
    city: string;
  }
): Promise<SwissLocation | null> {
  const street =
    input.street.trim();

  const zip =
    input.zip.trim();

  const city =
    input.city.trim();

  if (!street || !zip || !city) {
    return null;
  }

  const searchText = [
    street,
    zip,
    city,
  ].join(" ");

  const params =
    new URLSearchParams({
      searchText,
      type: "locations",
      origins: "address",
      limit: "5",
      lang: "de",
    });

  const response =
    await fetch(
      `https://api3.geo.admin.ch/rest/services/ech/SearchServer?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `GeoAdmin-Anfrage fehlgeschlagen (${response.status}).`
    );
  }

  const data =
    (await response.json()) as GeoAdminResponse;

  const candidate =
    data.results?.find(
      (result) =>
        result.attrs?.origin ===
          "address" &&
        typeof result.attrs?.lat ===
          "number" &&
        typeof result.attrs?.lon ===
          "number"
    );

  if (
    !candidate?.attrs ||
    typeof candidate.attrs.lat !==
      "number" ||
    typeof candidate.attrs.lon !==
      "number"
  ) {
    return null;
  }

  const addressLink =
    candidate.links?.find(
      (link) =>
        link.title ===
        "ch.swisstopo.amtliches-gebaeudeadressverzeichnis"
    );

  const buildingRegisterLink =
    candidate.links?.find(
      (link) =>
        link.title ===
        "ch.bfs.gebaeude_wohnungs_register"
    );

  return {
    label: stripHtml(
      candidate.attrs.label ??
        searchText
    ),

    detail:
      candidate.attrs.detail ??
      searchText,

    latitude:
      candidate.attrs.lat,

    longitude:
      candidate.attrs.lon,

    featureId:
      candidate.attrs.featureId ??
      null,

    buildingAddressUrl:
      absoluteGeoAdminUrl(
        addressLink?.href
      ),

    buildingRegisterUrl:
      absoluteGeoAdminUrl(
        buildingRegisterLink?.href
      ),
  };
}
