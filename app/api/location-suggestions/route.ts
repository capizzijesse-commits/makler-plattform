import {
  type NextRequest,
  NextResponse,
} from "next/server";

import germanyLocationIndex from "@/data/germany-location-search-index.json";

export const runtime =
  "nodejs";

type GermanyLocationType =
  | "federalState"
  | "governmentRegion"
  | "district"
  | "municipalAssociation"
  | "municipality"
  | "locality";

type GermanyLocationEntry = {
  type: GermanyLocationType;
  name: string;
  postalCode?: string;
  label?: string;
  subtype?: string;
  federalState?: string;
  governmentRegion?: string;
  district?: string;
  municipality?: string;
};

type LocationSuggestion = {
  type: GermanyLocationType;
  name: string;
  zip: string;
  label: string;
  region: string;
};

const entries =
  germanyLocationIndex.entries as
    GermanyLocationEntry[];

const TYPE_PRIORITY:
  Record<
    GermanyLocationType,
    number
  > = {
    locality: 0,
    municipality: 1,
    municipalAssociation: 2,
    district: 3,
    governmentRegion: 4,
    federalState: 5,
  };

function normalize(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /ß/g,
      "ss"
    )
    .toLocaleLowerCase(
      "de-DE"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

function getRegion(
  item: GermanyLocationEntry
): string {
  if (
    item.type ===
    "federalState"
  ) {
    return "Deutschland";
  }

  return (
    item.federalState ||
    item.governmentRegion ||
    item.district ||
    ""
  ).trim();
}

function buildHaystack(
  item: GermanyLocationEntry
): string {
  return normalize(
    [
      item.postalCode,
      item.name,
      item.label,
      item.subtype,
      item.municipality,
      item.district,
      item.governmentRegion,
      item.federalState,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function scoreEntry(
  item: GermanyLocationEntry,
  rawQuery: string,
  normalizedQuery: string
): number {
  const normalizedName =
    normalize(
      item.name
    );

  const zip =
    (
      item.postalCode ||
      ""
    ).trim();

  const typePriority =
    TYPE_PRIORITY[
      item.type
    ] ?? 9;

  if (
    zip &&
    zip === rawQuery
  ) {
    return typePriority;
  }

  if (
    normalizedName ===
    normalizedQuery
  ) {
    return (
      2 +
      typePriority
    );
  }

  if (
    zip &&
    zip.startsWith(
      rawQuery
    )
  ) {
    return (
      10 +
      typePriority
    );
  }

  if (
    normalizedName.startsWith(
      normalizedQuery
    )
  ) {
    return (
      20 +
      typePriority
    );
  }

  if (
    buildHaystack(
      item
    ).includes(
      normalizedQuery
    )
  ) {
    return (
      40 +
      typePriority
    );
  }

  return 9999;
}

export async function GET(
  request: NextRequest
) {
  const market =
    request.nextUrl.searchParams
      .get("market")
      ?.trim()
      .toUpperCase();

  const rawQuery =
    request.nextUrl.searchParams
      .get("q")
      ?.trim() ?? "";

  if (market !== "DE") {
    return NextResponse.json(
      {
        success: true,
        suggestions: [],
      }
    );
  }

  if (
    rawQuery.length < 2
  ) {
    return NextResponse.json({
      success: true,
      suggestions: [],
    });
  }

  const normalizedQuery =
    normalize(
      rawQuery
    );

  if (!normalizedQuery) {
    return NextResponse.json({
      success: true,
      suggestions: [],
    });
  }

  const matches =
    entries
      .map(
        (item) => ({
          item,
          score:
            scoreEntry(
              item,
              rawQuery,
              normalizedQuery
            ),
        })
      )
      .filter(
        (candidate) =>
          candidate.score <
          9999
      )
      .sort(
        (a, b) =>
          a.score -
            b.score ||
          a.item.name.localeCompare(
            b.item.name,
            "de-DE"
          )
      )
      .slice(
        0,
        250
      );

  /*
   * Gleiche Ortsnamen mit vielen PLZ
   * werden bei Namenssuche zusammengeführt.
   *
   * Beispiel:
   * "Berlin" -> ein Ort Berlin.
   *
   * Bei PLZ-Suche:
   * "10115" -> 10115 Berlin.
   *
   * Dadurch erfinden wir niemals
   * eine PLZ für einen mehrdeutigen Ort.
   */
  const grouped =
    new Map<
      string,
      {
        item:
          GermanyLocationEntry;
        score:
          number;
        postalCodes:
          Set<string>;
      }
    >();

  for (
    const candidate of
      matches
  ) {
    const region =
      getRegion(
        candidate.item
      );

    const key =
      [
        candidate.item.type,
        candidate.item.name,
        region,
      ].join("|");

    const existing =
      grouped.get(key);

    if (!existing) {
      grouped.set(
        key,
        {
          item:
            candidate.item,
          score:
            candidate.score,
          postalCodes:
            new Set(
              candidate.item
                .postalCode
                ? [
                    candidate.item
                      .postalCode,
                  ]
                : []
            ),
        }
      );

      continue;
    }

    if (
      candidate.item
        .postalCode
    ) {
      existing.postalCodes.add(
        candidate.item
          .postalCode
      );
    }

    existing.score =
      Math.min(
        existing.score,
        candidate.score
      );
  }

  const suggestions:
    LocationSuggestion[] =
      Array.from(
        grouped.values()
      )
        .sort(
          (a, b) =>
            a.score -
              b.score ||
            (
              TYPE_PRIORITY[
                a.item.type
              ] ?? 9
            ) -
              (
                TYPE_PRIORITY[
                  b.item.type
                ] ?? 9
              )
        )
        .slice(
          0,
          8
        )
        .map(
          ({
            item,
            postalCodes,
          }) => ({
            type:
              item.type,

            name:
              item.name,

            zip:
              postalCodes.size ===
              1
                ? Array.from(
                    postalCodes
                  )[0]
                : "",

            label:
              item.label ||
              item.subtype ||
              "Ort",

            region:
              getRegion(
                item
              ),
          })
        );

  return NextResponse.json(
    {
      success: true,
      suggestions,
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
