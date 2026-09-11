import {
  NextResponse,
} from "next/server";

type TravelMode =
  | "auto"
  | "pedestrian"
  | "bicycle";

type Point = {
  lat: number;
  lon: number;
};

type RouteBody = {
  start?: Point;
  end?: Point;
  mode?: TravelMode;
};

function validPoint(
  value: Point | undefined
): value is Point {
  return Boolean(
    value &&
    Number.isFinite(
      value.lat
    ) &&
    Number.isFinite(
      value.lon
    ) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    value.lon >= -180 &&
    value.lon <= 180
  );
}

function decodePolyline6(
  encoded: string
): [number, number][] {
  const coordinates:
    [number, number][] = [];

  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (
    index < encoded.length
  ) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte =
        encoded.charCodeAt(
          index++
        ) - 63;

      result |=
        (byte & 0x1f) <<
        shift;

      shift += 5;
    }
    while (
      byte >= 0x20
    );

    latitude +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte =
        encoded.charCodeAt(
          index++
        ) - 63;

      result |=
        (byte & 0x1f) <<
        shift;

      shift += 5;
    }
    while (
      byte >= 0x20
    );

    longitude +=
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    coordinates.push([
      longitude / 1e6,
      latitude / 1e6,
    ]);
  }

  return coordinates;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as
        RouteBody;

    if (
      !validPoint(
        body.start
      ) ||
      !validPoint(
        body.end
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Start oder Ziel ist ungültig.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedModes:
      TravelMode[] = [
        "auto",
        "pedestrian",
        "bicycle",
      ];

    const mode =
      allowedModes.includes(
        body.mode ??
          "auto"
      )
        ? body.mode ??
          "auto"
        : "auto";

    const configuredBase =
      process.env
        .VALHALLA_BASE_URL
        ?.trim()
        .replace(
          /\/+$/,
          ""
        );

    /*
     * Nur für lokale Entwicklung:
     * öffentlicher FOSSGIS
     * Valhalla Demo-Server.
     *
     * Produktion benötigt
     * VALHALLA_BASE_URL mit
     * eigener/vertraglicher
     * Routing-Instanz.
     */
    const devBase =
      [
        "https:",
        "",
        "valhalla1.openstreetmap.de",
      ].join("/");

    const baseUrl =
      configuredBase ||
      (
        process.env.NODE_ENV ===
          "development"
          ? devBase
          : ""
      );

    if (!baseUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Routing ist in dieser Umgebung noch nicht konfiguriert.",
        },
        {
          status: 503,
        }
      );
    }

    const response =
      await fetch(
        `${baseUrl}/route`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Client-Id":
              "inserat-ai-maps",
          },

          cache:
            "no-store",

          body:
            JSON.stringify({
              locations: [
                {
                  lat:
                    body.start.lat,
                  lon:
                    body.start.lon,
                },
                {
                  lat:
                    body.end.lat,
                  lon:
                    body.end.lon,
                },
              ],

              costing:
                mode,

              units:
                "kilometers",

              directions_options: {
                language:
                  "de-DE",
              },
            }),
        }
      );

    const data =
      (await response
        .json()
        .catch(
          () => null
        )) as
        | {
            error?: string;
            error_code?: number;
            trip?: {
              summary?: {
                length?: number;
                time?: number;
              };
              legs?: Array<{
                shape?: string;
                maneuvers?: Array<{
                  instruction?: string;
                  length?: number;
                  time?: number;
                }>;
              }>;
            };
          }
        | null;

    if (
      !response.ok ||
      !data?.trip
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            typeof data?.error === "string" &&
            /max distance|distance exceeds/i.test(
              data.error
            )
              ? "Start und Ziel sind für den Entwicklungs-Router zu weit voneinander entfernt. Bitte eine Strecke unter ungefähr 1.500 km wählen."
              : data?.error ||
                "Route konnte nicht berechnet werden.",
        },
        {
          status:
            response.ok
              ? 502
              : response.status,
        }
      );
    }

    const legs =
      Array.isArray(
        data.trip.legs
      )
        ? data.trip.legs
        : [];

    const coordinates:
      [number, number][] = [];

    for (
      const [
        legIndex,
        leg,
      ] of legs.entries()
    ) {
      if (
        typeof leg.shape !==
        "string"
      ) {
        continue;
      }

      const legCoordinates =
        decodePolyline6(
          leg.shape
        );

      coordinates.push(
        ...(
          legIndex === 0
            ? legCoordinates
            : legCoordinates.slice(
                1
              )
        )
      );
    }

    if (
      coordinates.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Routing lieferte keine gültige Streckengeometrie.",
        },
        {
          status: 502,
        }
      );
    }

    const maneuvers =
      legs.flatMap(
        (leg) =>
          Array.isArray(
            leg.maneuvers
          )
            ? leg.maneuvers
                .map(
                  (
                    maneuver
                  ) =>
                    maneuver
                      .instruction
                )
                .filter(
                  (
                    instruction
                  ): instruction is string =>
                    typeof instruction ===
                      "string" &&
                    instruction.length >
                      0
                )
            : []
      );

    return NextResponse.json({
      success: true,

      route: {
        type:
          "Feature",

        properties: {},

        geometry: {
          type:
            "LineString",

          coordinates,
        },
      },

      distanceKm:
        Number(
          data.trip.summary
            ?.length ??
            0
        ),

      durationSeconds:
        Number(
          data.trip.summary
            ?.time ??
            0
        ),

      maneuvers,
    });
  }
  catch (error) {
    console.error(
      "INSERAT_AI_ROUTING_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Routing konnte nicht berechnet werden.",
      },
      {
        status: 500,
      }
    );
  }
}
