"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LngLatBounds,
  Marker,
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";

type TravelMode =
  | "auto"
  | "pedestrian"
  | "bicycle";

type RoutePoint = {
  lat: number;
  lon: number;
};

type RouteFeature = {
  type: "Feature";
  properties: Record<
    string,
    never
  >;
  geometry: {
    type: "LineString";
    coordinates:
      [number, number][];
  };
};

type RouteResponse = {
  success?: boolean;
  error?: string;
  route?: RouteFeature;
  distanceKm?: number;
  durationSeconds?: number;
  maneuvers?: string[];
};

type RoutePlannerProps = {
  map:
    MapLibreMap |
    null;
};

const SOURCE_ID =
  "inserat-ai-route";

const CASING_LAYER_ID =
  "inserat-ai-route-casing";

const LINE_LAYER_ID =
  "inserat-ai-route-line";

function createPointElement(
  label: string,
  variant:
    "start" |
    "end"
) {
  const element =
    document.createElement(
      "div"
    );

  element.textContent =
    label;

  element.style.width =
    "32px";

  element.style.height =
    "32px";

  element.style.display =
    "grid";

  element.style.placeItems =
    "center";

  element.style.borderRadius =
    "50%";

  element.style.border =
    "3px solid white";

  element.style.boxShadow =
    "0 5px 18px rgba(6,20,38,.30)";

  element.style.fontSize =
    "11px";

  element.style.fontWeight =
    "900";

  element.style.color =
    variant === "start"
      ? "#ffffff"
      : "#0b1f3a";

  element.style.background =
    variant === "start"
      ? "#0b1f3a"
      : "#f4b31b";

  return element;
}

export default function RoutePlanner({
  map,
}: RoutePlannerProps) {
  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    mode,
    setMode,
  ] =
    useState<TravelMode>(
      "auto"
    );

  const [
    start,
    setStart,
  ] =
    useState<RoutePoint | null>(
      null
    );

  const [
    end,
    setEnd,
  ] =
    useState<RoutePoint | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    distanceKm,
    setDistanceKm,
  ] =
    useState<number | null>(
      null
    );

  const [
    durationSeconds,
    setDurationSeconds,
  ] =
    useState<number | null>(
      null
    );

  const routeRef =
    useRef<RouteFeature | null>(
      null
    );

  const routeModeRef =
    useRef<TravelMode>(
      "auto"
    );

  const startMarkerRef =
    useRef<Marker | null>(
      null
    );

  const endMarkerRef =
    useRef<Marker | null>(
      null
    );

  const drawRoute =
    useCallback(
      (
        route:
          RouteFeature,
        travelMode:
          TravelMode =
            routeModeRef.current
      ) => {
        if (!map) {
          return;
        }

        routeRef.current =
          route;

        routeModeRef.current =
          travelMode;

        if (
          !map.isStyleLoaded()
        ) {
          map.once(
            "style.load",
            () => {
              drawRoute(
                route
              );
            }
          );

          return;
        }

        const existingSource =
          map.getSource(
            SOURCE_ID
          ) as
            | GeoJSONSource
            | undefined;

        if (
          existingSource
        ) {
          existingSource.setData(
            route
          );
        }
        else {
          map.addSource(
            SOURCE_ID,
            {
              type:
                "geojson",
              data:
                route,
            }
          );
        }

        if (
          !map.getLayer(
            CASING_LAYER_ID
          )
        ) {
          map.addLayer({
            id:
              CASING_LAYER_ID,

            type:
              "line",

            source:
              SOURCE_ID,

            layout: {
              "line-cap":
                "round",
              "line-join":
                "round",
            },

            paint: {
              "line-color":
                "#0b1f3a",

              "line-width":
                travelMode ===
                "pedestrian"
                  ? [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      8,
                      4,
                      16,
                      8,
                    ]
                  : [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      8,
                      5,
                      16,
                      11,
                    ],

              "line-opacity":
                0.92,

              ...(
                travelMode ===
                "pedestrian"
                  ? {
                      "line-dasharray":
                        [
                          1.25,
                          1.4,
                        ],
                    }
                  : {}
              ),
            },
          });
        }

        if (
          !map.getLayer(
            LINE_LAYER_ID
          )
        ) {
          map.addLayer({
            id:
              LINE_LAYER_ID,

            type:
              "line",

            source:
              SOURCE_ID,

            layout: {
              "line-cap":
                "round",
              "line-join":
                "round",
            },

            paint: {
              "line-color":
                "#f4b31b",

              "line-width":
                travelMode ===
                "pedestrian"
                  ? [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      8,
                      2,
                      16,
                      4.5,
                    ]
                  : [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      8,
                      2.5,
                      16,
                      6,
                    ],

              "line-opacity":
                1,

              ...(
                travelMode ===
                "pedestrian"
                  ? {
                      "line-dasharray":
                        [
                          1.25,
                          1.4,
                        ],
                    }
                  : {}
              ),
            },
          });
        }

        // APPLY_ROUTE_MODE_STYLE
        if (
          map.getLayer(
            CASING_LAYER_ID
          )
        ) {
          map.setPaintProperty(
            CASING_LAYER_ID,
            "line-width",
            travelMode ===
            "pedestrian"
              ? [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  4,
                  16,
                  8,
                ]
              : [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  5,
                  16,
                  11,
                ]
          );

          map.setPaintProperty(
            CASING_LAYER_ID,
            "line-dasharray",
            travelMode ===
            "pedestrian"
              ? [
                  1.2,
                  1.5,
                ]
              : undefined
          );
        }

        if (
          map.getLayer(
            LINE_LAYER_ID
          )
        ) {
          map.setPaintProperty(
            LINE_LAYER_ID,
            "line-width",
            travelMode ===
            "pedestrian"
              ? [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  2,
                  16,
                  4.5,
                ]
              : [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  2.5,
                  16,
                  6,
                ]
          );

          map.setPaintProperty(
            LINE_LAYER_ID,
            "line-dasharray",
            travelMode ===
            "pedestrian"
              ? [
                  1.2,
                  1.5,
                ]
              : undefined
          );
        }

        if (
          map.getLayer(
            CASING_LAYER_ID
          )
        ) {
          map.moveLayer(
            CASING_LAYER_ID
          );
        }

        if (
          map.getLayer(
            LINE_LAYER_ID
          )
        ) {
          map.moveLayer(
            LINE_LAYER_ID
          );
        }
        const reinforceRoute =
          () => {
            const currentSource =
              map.getSource(
                SOURCE_ID
              ) as
                | GeoJSONSource
                | undefined;

            currentSource?.setData(
              route
            );

            if (
              map.getLayer(
                CASING_LAYER_ID
              )
            ) {
              map.setLayoutProperty(
                CASING_LAYER_ID,
                "visibility",
                "visible"
              );

              map.moveLayer(
                CASING_LAYER_ID
              );
            }

            if (
              map.getLayer(
                LINE_LAYER_ID
              )
            ) {
              map.setLayoutProperty(
                LINE_LAYER_ID,
                "visibility",
                "visible"
              );

              map.moveLayer(
                LINE_LAYER_ID
              );
            }

            map.triggerRepaint();
          };

        const handleRouteSourceData =
          () => {
            if (
              !map.getSource(
                SOURCE_ID
              ) ||
              !map.isSourceLoaded(
                SOURCE_ID
              )
            ) {
              return;
            }

            map.off(
              "sourcedata",
              handleRouteSourceData
            );

            reinforceRoute();
          };

        if (
          map.isSourceLoaded(
            SOURCE_ID
          )
        ) {
          reinforceRoute();
        }
        else {
          map.on(
            "sourcedata",
            handleRouteSourceData
          );
        }

        window.setTimeout(
          () => {
            if (
              map.getSource(
                SOURCE_ID
              ) &&
              map.getLayer(
                LINE_LAYER_ID
              )
            ) {
              reinforceRoute();
            }
          },
          300
        );

        map.triggerRepaint();

        const bounds =
          new LngLatBounds();

        for (
          const coordinate of
          route.geometry
            .coordinates
        ) {
          bounds.extend(
            coordinate
          );
        }

        if (
          !bounds.isEmpty()
        ) {
          map.fitBounds(
            bounds,
            {
              padding:
                map.getCanvas()
                  .clientWidth <
                900
                  ? {
                      top: 100,
                      right: 24,
                      bottom: 90,
                      left: 24,
                    }
                  : {
                      top: 120,
                      right: 340,
                      bottom: 90,
                      left: 430,
                    },

              maxZoom:
                16,

              duration:
                900,
            }
          );
        }
      },
      [
        map,
      ]
    );

  const clearRoute =
    useCallback(
      () => {
        if (map) {
          if (
            map.getLayer(
              LINE_LAYER_ID
            )
          ) {
            map.removeLayer(
              LINE_LAYER_ID
            );
          }

          if (
            map.getLayer(
              CASING_LAYER_ID
            )
          ) {
            map.removeLayer(
              CASING_LAYER_ID
            );
          }

          if (
            map.getSource(
              SOURCE_ID
            )
          ) {
            map.removeSource(
              SOURCE_ID
            );
          }
        }

        routeRef.current =
          null;

        startMarkerRef.current
          ?.remove();

        endMarkerRef.current
          ?.remove();

        startMarkerRef.current =
          null;

        endMarkerRef.current =
          null;

        setStart(null);
        setEnd(null);
        setError("");
        setDistanceKm(null);
        setDurationSeconds(
          null
        );
      },
      [
        map,
      ]
    );

  const requestRoute =
    useCallback(
      async (
        from:
          RoutePoint,
        to:
          RoutePoint,
        travelMode:
          TravelMode
      ) => {
        setLoading(true);
        setError("");

        if (map) {
          if (
            map.getLayer(
              LINE_LAYER_ID
            )
          ) {
            map.removeLayer(
              LINE_LAYER_ID
            );
          }

          if (
            map.getLayer(
              CASING_LAYER_ID
            )
          ) {
            map.removeLayer(
              CASING_LAYER_ID
            );
          }

          if (
            map.getSource(
              SOURCE_ID
            )
          ) {
            map.removeSource(
              SOURCE_ID
            );
          }
        }

        routeRef.current =
          null;

        setDistanceKm(null);
        setDurationSeconds(
          null
        );

        try {
          const response =
            await fetch(
              "/api/map/route",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    start:
                      from,
                    end:
                      to,
                    mode:
                      travelMode,
                  }),
              }
            );

          const data =
            (await response
              .json()
              .catch(
                () => null
              )) as
              | RouteResponse
              | null;

          if (
            !response.ok ||
            !data?.success ||
            !data.route
          ) {
            throw new Error(
              data?.error ||
                "Route konnte nicht berechnet werden."
            );
          }

          drawRoute(
            data.route,
            travelMode
          );

          setDistanceKm(
            typeof data.distanceKm ===
              "number"
              ? data.distanceKm
              : null
          );

          setDurationSeconds(
            typeof data.durationSeconds ===
              "number"
              ? data.durationSeconds
              : null
          );
        }
        catch (
          routeError
        ) {
          setError(
            routeError instanceof
              Error
              ? routeError.message
              : "Route konnte nicht berechnet werden."
          );
        }
        finally {
          setLoading(false);
        }
      },
      [
        drawRoute,
        map,
      ]
    );

  useEffect(() => {
    if (
      !map ||
      !open
    ) {
      return;
    }

    const canvas =
      map.getCanvas();

    canvas.style.cursor =
      "crosshair";

    const handleClick =
      (
        event: {
          lngLat: {
            lat: number;
            lng: number;
          };
        }
      ) => {
        const point = {
          lat:
            event.lngLat.lat,
          lon:
            event.lngLat.lng,
        };

        if (
          !start ||
          (
            start &&
            end
          )
        ) {
          clearRoute();

          setStart(
            point
          );

          startMarkerRef.current =
            new Marker({
              element:
                createPointElement(
                  "A",
                  "start"
                ),
              anchor:
                "center",
            })
              .setLngLat([
                point.lon,
                point.lat,
              ])
              .addTo(
                map
              );

          return;
        }

        setEnd(
          point
        );

        endMarkerRef.current
          ?.remove();

        endMarkerRef.current =
          new Marker({
            element:
              createPointElement(
                "B",
                "end"
              ),
            anchor:
              "center",
          })
            .setLngLat([
              point.lon,
              point.lat,
            ])
            .addTo(
              map
            );

        void requestRoute(
          start,
          point,
          mode
        );
      };

    map.on(
      "click",
      handleClick
    );

    return () => {
      map.off(
        "click",
        handleClick
      );

      canvas.style.cursor =
        "";
    };
  }, [
    map,
    open,
    start,
    end,
    mode,
    clearRoute,
    requestRoute,
  ]);

  useEffect(() => {
    if (
      start &&
      end
    ) {
      void requestRoute(
        start,
        end,
        mode
      );
    }
  }, [
    mode,
  ]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const handleStyleLoad =
      () => {
        const route =
          routeRef.current;

        if (!route) {
          return;
        }

        window.setTimeout(
          () => {
            drawRoute(
              route,
              routeModeRef.current
            );
          },
          50
        );
      };

    map.on(
      "style.load",
      handleStyleLoad
    );

    return () => {
      map.off(
        "style.load",
        handleStyleLoad
      );
    };
  }, [
    map,
    drawRoute,
  ]);

  const minutes =
    durationSeconds ===
      null
      ? null
      : Math.max(
          1,
          Math.round(
            durationSeconds /
              60
          )
        );

  return (
    <div className="iaRouteShell">
      <button
        type="button"
        className={
          open
            ? "iaRouteToggle isOpen"
            : "iaRouteToggle"
        }
        onClick={() => {
          setOpen(
            (current) =>
              !current
          );
        }}
      >
        <span>
          ↗
        </span>
        Route planen
      </button>

      {open ? (
        <section className="iaRoutePanel">
          <div className="iaRouteHead">
            <div>
              <span>
                INSERAT AI ROUTING
              </span>

              <strong>
                Route planen
              </strong>
            </div>

            <button
              type="button"
              aria-label="Route schließen"
              onClick={() =>
                setOpen(false)
              }
            >
              ×
            </button>
          </div>

          <div className="iaRouteModes">
            <button
              type="button"
              className={
                mode === "auto"
                  ? "isActive"
                  : ""
              }
              onClick={() =>
                setMode(
                  "auto"
                )
              }
            >
              Auto
            </button>

            <button
              type="button"
              className={
                mode ===
                "pedestrian"
                  ? "isActive"
                  : ""
              }
              onClick={() =>
                setMode(
                  "pedestrian"
                )
              }
            >
              Zu Fuß
            </button>

            <button
              type="button"
              className={
                mode ===
                "bicycle"
                  ? "isActive"
                  : ""
              }
              onClick={() =>
                setMode(
                  "bicycle"
                )
              }
            >
              Fahrrad
            </button>
          </div>

          <div className="iaRoutePoints">
            <div>
              <b>
                A
              </b>
              <span>
                {start
                  ? `${start.lat.toFixed(
                      5
                    )}, ${start.lon.toFixed(
                      5
                    )}`
                  : "Start auf der Karte anklicken"}
              </span>
            </div>

            <div>
              <b>
                B
              </b>
              <span>
                {end
                  ? `${end.lat.toFixed(
                      5
                    )}, ${end.lon.toFixed(
                      5
                    )}`
                  : "Danach Ziel anklicken"}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="iaRouteStatus">
              Route wird berechnet …
            </div>
          ) : null}

          {error ? (
            <div className="iaRouteError">
              {error}
            </div>
          ) : null}

          {distanceKm !==
            null &&
          minutes !==
            null ? (
            <div className="iaRouteSummary">
              <div>
                <strong>
                  {distanceKm.toFixed(
                    1
                  )}{" "}
                  km
                </strong>
                <span>
                  Strecke
                </span>
              </div>

              <div>
                <strong>
                  {minutes} min
                </strong>
                <span>
                  Fahrzeit
                </span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="iaRouteReset"
            onClick={
              clearRoute
            }
          >
            Neue Route
          </button>
        </section>
      ) : null}

      <style jsx>{`
        .iaRouteShell {
          position: absolute;
          z-index: 32;
          top: 132px;
          right: 24px;
          width: 300px;
          pointer-events: none;
        }

        .iaRouteToggle,
        .iaRoutePanel {
          pointer-events: auto;
        }

        .iaRouteToggle {
          margin-left: auto;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 15px;
          border: 0;
          border-radius: 13px;
          background: #0b1f3a;
          color: white;
          box-shadow:
            0 12px 30px
            rgba(6,20,38,.24);
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .iaRouteToggle span {
          color: #f4b31b;
          font-size: 18px;
        }

        .iaRouteToggle.isOpen {
          background: #f4b31b;
          color: #0b1f3a;
        }

        .iaRouteToggle.isOpen span {
          color: #0b1f3a;
        }

        .iaRoutePanel {
          margin-top: 8px;
          padding: 16px;
          border:
            1px solid
            rgba(11,31,58,.12);
          border-radius: 18px;
          background:
            rgba(255,255,255,.97);
          box-shadow:
            0 18px 50px
            rgba(6,20,38,.20);
          backdrop-filter:
            blur(18px);
        }

        .iaRouteHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .iaRouteHead span {
          display: block;
          color: #b47c00;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .iaRouteHead strong {
          display: block;
          margin-top: 3px;
          color: #0b1f3a;
          font-size: 18px;
        }

        .iaRouteHead > button {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 9px;
          background: #f2f4f7;
          color: #536176;
          font-size: 18px;
          cursor: pointer;
        }

        .iaRouteModes {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 5px;
          margin-top: 14px;
          padding: 4px;
          border-radius: 12px;
          background: #f2f4f7;
        }

        .iaRouteModes button {
          min-height: 34px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #59677a;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .iaRouteModes button.isActive {
          background: #0b1f3a;
          color: white;
        }

        .iaRoutePoints {
          display: grid;
          gap: 8px;
          margin-top: 13px;
        }

        .iaRoutePoints div {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 42px;
          padding: 8px 10px;
          border:
            1px solid #e0e5ea;
          border-radius: 11px;
          background: white;
        }

        .iaRoutePoints b {
          width: 24px;
          height: 24px;
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 50%;
          background: #0b1f3a;
          color: white;
          font-size: 9px;
        }

        .iaRoutePoints div:last-child b {
          background: #f4b31b;
          color: #0b1f3a;
        }

        .iaRoutePoints span {
          overflow: hidden;
          color: #657286;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .iaRouteStatus,
        .iaRouteError {
          margin-top: 10px;
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 10px;
        }

        .iaRouteStatus {
          background: #f5f7f9;
          color: #637085;
        }

        .iaRouteError {
          background: #fff1f1;
          color: #a33b3b;
        }

        .iaRouteSummary {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 7px;
          margin-top: 10px;
        }

        .iaRouteSummary div {
          padding: 10px;
          border-radius: 11px;
          background: #fff5d8;
        }

        .iaRouteSummary strong,
        .iaRouteSummary span {
          display: block;
        }

        .iaRouteSummary strong {
          color: #0b1f3a;
          font-size: 14px;
        }

        .iaRouteSummary span {
          margin-top: 2px;
          color: #7e8795;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .iaRouteReset {
          width: 100%;
          min-height: 38px;
          margin-top: 10px;
          border:
            1px solid #dce2e8;
          border-radius: 10px;
          background: white;
          color: #0b1f3a;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
        }

        @media (
          max-width: 760px
        ) {
          .iaRouteShell {
            top: 60px;
            right: 10px;
            width:
              min(
                300px,
                calc(
                  100vw -
                  20px
                )
              );
          }
        }
      `}</style>
    </div>
  );
}
