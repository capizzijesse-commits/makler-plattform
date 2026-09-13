"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(
  "/maplibre/maplibre-gl-worker.mjs"
);

import RoutePlanner from "./RoutePlanner";
import MarketPulseOverlay from "./MarketPulseOverlay";

import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

type MapListing = {
  id: string;
  projectName?: string | null;
  street?: string | null;
  location: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  market?: string | null;
  countryCode?: string | null;
  propertyType: string;
  rooms?: number | null;
  livingArea?: number | null;
  price?: number | null;
  hasCoreAccess?: boolean;
};

type ListingsResponse = {
  success: boolean;
  listings?: MapListing[];
  error?: string;
};


/*
 * INSERAT_AI_GLOBAL_MAP_RUNTIME_V2
 *
 * Land und Verkaufsmarkt sind getrennt.
 */
type MapHomeCountry =
  | InseratAiMarket
  | "AT";

const INSERAT_AI_EURO_COUNTRIES =
  new Set([
    "AT",
    "BE",
    "HR",
    "CY",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PT",
    "SK",
    "SI",
    "ES",
  ]);

function formatGlobalListingPrice(
  listing: MapListing
) {
  if (
    typeof listing.price !==
    "number"
  ) {
    return "Preis offen";
  }

  const countryCode =
    (
      listing.countryCode ??
      listing.market ??
      ""
    )
      .trim()
      .toUpperCase();

  let currency =
    "";

  let locale =
    "en-US";

  if (countryCode === "CH") {
    currency = "CHF";
    locale = "de-CH";
  }
  else if (
    INSERAT_AI_EURO_COUNTRIES.has(
      countryCode
    )
  ) {
    currency = "EUR";

    locale =
      countryCode === "AT"
        ? "de-AT"
        : countryCode === "DE"
          ? "de-DE"
          : countryCode === "IT"
            ? "it-IT"
            : countryCode === "FR"
              ? "fr-FR"
              : countryCode === "ES"
                ? "es-ES"
                : countryCode === "PT"
                  ? "pt-PT"
                  : "en-IE";
  }
  else if (countryCode === "US") {
    currency = "USD";
    locale = "en-US";
  }
  else if (countryCode === "GB") {
    currency = "GBP";
    locale = "en-GB";
  }
  else if (countryCode === "BR") {
    currency = "BRL";
    locale = "pt-BR";
  }
  else if (countryCode === "CA") {
    currency = "CAD";
    locale = "en-CA";
  }
  else if (countryCode === "AU") {
    currency = "AUD";
    locale = "en-AU";
  }
  else if (countryCode === "JP") {
    currency = "JPY";
    locale = "ja-JP";
  }

  if (!currency) {
    return new Intl.NumberFormat(
      locale,
      {
        maximumFractionDigits:
          0,
      }
    ).format(
      listing.price
    );
  }

  return new Intl.NumberFormat(
    locale,
    {
      style:
        "currency",
      currency,
      maximumFractionDigits:
        0,
    }
  ).format(
    listing.price
  );
}

type MapViewMode =
  | "map"
  | "satellite"
  | "hybrid";

const COUNTRY_VIEW = {
  DE: {
    center: [10.4515, 51.1657] as [
      number,
      number
    ],
    zoom: 5.3,
    label: "Deutschland",
  },

  AT: {
    center: [14.5501, 47.5162] as [
      number,
      number
    ],
    zoom: 6.6,
    label: "Österreich",
  },

  CH: {
    center: [8.2275, 46.8182] as [
      number,
      number
    ],
    zoom: 7.1,
    label: "Schweiz",
  },
} as const;

function applyInseratAiMapTheme(
  map: MapLibreMap
) {
  const layers =
    map.getStyle().layers ??
    [];

  for (const layer of layers) {
    const id =
      layer.id.toLowerCase();

    const sourceLayer =
      "source-layer" in layer &&
      typeof layer["source-layer"] === "string"
        ? layer["source-layer"].toLowerCase()
        : "";

    try {
      if (
        layer.type ===
        "background"
      ) {
        map.setPaintProperty(
          layer.id,
          "background-color",
          "#f4f1e9"
        );

        continue;
      }

      if (
        layer.type === "fill" &&
        sourceLayer === "water"
      ) {
        map.setPaintProperty(
          layer.id,
          "fill-color",
          "#c7e0e9"
        );

        continue;
      }

      if (
        layer.type === "fill" &&
        (
          sourceLayer === "forest" ||
          sourceLayer === "wood" ||
          sourceLayer === "grass" ||
          sourceLayer === "vegetation"
        )
      ) {
        map.setPaintProperty(
          layer.id,
          "fill-color",
          "#dce8d6"
        );

        continue;
      }

      if (
        layer.type === "fill" &&
        sourceLayer === "building"
      ) {
        map.setPaintProperty(
          layer.id,
          "fill-color",
          "#ddd6ca"
        );

        continue;
      }

      if (
        layer.type === "line" &&
        sourceLayer === "road"
      ) {
        if (
          /motorway|trunk/.test(
            id
          )
        ) {
          map.setPaintProperty(
            layer.id,
            "line-color",
            "#e3aa16"
          );
        }
        else if (
          /casing|outline/.test(
            id
          )
        ) {
          map.setPaintProperty(
            layer.id,
            "line-color",
            "#cbd0d6"
          );
        }
        else {
          map.setPaintProperty(
            layer.id,
            "line-color",
            "#ffffff"
          );
        }

        continue;
      }

      if (
        layer.type === "symbol"
      ) {
        map.setPaintProperty(
          layer.id,
          "text-color",
          "#17263c"
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-color",
          "#ffffff"
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-width",
          1.5
        );
      }
    }
    catch {
      /*
       * Einzelne Spezial-Layer können
       * andere Paint-Eigenschaften haben.
       * Diese bleiben unverändert.
       */
    }
  }
}

function createInseratAiStreetStyle(
  key: string
) {
  const safeKey =
    encodeURIComponent(
      key
    );

  return {
    version: 8 as const,

    name:
      "Inserat AI Maps Street V1",

    sources: {
      "inserat-ai-street-raster": {
        type:
          "raster" as const,

        tiles: [
          `https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}@2x.png?key=${safeKey}`,
        ],

        tileSize:
          256,

        minzoom:
          0,

        maxzoom:
          22,

        attribution:
          "© MapTiler © OpenStreetMap contributors",
      },
    },

    layers: [
      {
        id:
          "inserat-ai-street-background",

        type:
          "background" as const,

        paint: {
          "background-color":
            "#f4f1e9",
        },
      },

      {
        id:
          "inserat-ai-street-raster",

        type:
          "raster" as const,

        source:
          "inserat-ai-street-raster",

        minzoom:
          0,

        maxzoom:
          22,

        paint: {
          "raster-opacity":
            1,

          "raster-saturation":
            -0.08,

          "raster-contrast":
            0.04,
        },
      },
    ],
  };
}


/*
 * INSERAT_AI_GOLD_AMBER_STYLE_HELPERS_V2
 *
 * Inserat-AI Branding für Vektor-Overlays.
 */
const INSERAT_AI_MAP_AMBER =
  "#F4B73F";

const INSERAT_AI_MAP_AMBER_TEXT =
  "#FFD36A";

const INSERAT_AI_MAP_TEXT_HALO =
  "rgba(5, 12, 28, 0.94)";


/*
 * INSERAT_AI_AMBER_PLACE_NAMES_V1
 *
 * Städte, Gemeinden, Dörfer und Ortsteile
 * erhalten die Inserat-AI Amber-Farbe.
 */
function applyInseratAiAmberPlaceNames(
  map: MapLibreMap
) {
  const layers =
    map.getStyle().layers ??
    [];

  for (
    const layer of layers
  ) {
    if (
      layer.type !== "symbol"
    ) {
      continue;
    }

    const id =
      layer.id.toLowerCase();

    const sourceLayer =
      "source-layer" in layer &&
      typeof layer["source-layer"] === "string"
        ? layer["source-layer"].toLowerCase()
        : "";

    const signature =
      `${id} ${sourceLayer}`;

    const isMajorPlace =
      /city|town|municipality/.test(
        signature
      );

    const isMinorPlace =
      /village|place|locality|suburb|neighbour|settlement/.test(
        signature
      );

    if (
      !isMajorPlace &&
      !isMinorPlace
    ) {
      continue;
    }

    try {
      /*
       * Städte / grössere Orte:
       * deutliches Inserat-AI Gold.
       */
      if (
        isMajorPlace
      ) {
        map.setPaintProperty(
          layer.id,
          "text-color",
          "#FFE08A"
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-color",
          "rgba(5, 12, 28, 0.97)"
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-width",
          1.9
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-blur",
          0.15
        );

        continue;
      }

      /*
       * Kleine Orte / Ortsteile:
       * bewusst etwas ruhiger.
       */
      map.setPaintProperty(
        layer.id,
        "text-color",
        "#E9B94B"
      );

      map.setPaintProperty(
        layer.id,
        "text-halo-color",
        "rgba(5, 12, 28, 0.94)"
      );

      map.setPaintProperty(
        layer.id,
        "text-halo-width",
        1.4
      );

      map.setPaintProperty(
        layer.id,
        "text-halo-blur",
        0.2
      );
    }
    catch {
      /*
       * Spezial-Layer ohne passende
       * Text-Paint-Eigenschaften ignorieren.
       */
    }
  }
}

function applyInseratAiAmberBranding(
  map: MapLibreMap
) {
  const layers =
    map.getStyle().layers ??
    [];

  for (
    const layer of layers
  ) {
    const id =
      layer.id.toLowerCase();

    const sourceLayer =
      "source-layer" in layer &&
      typeof layer["source-layer"] === "string"
        ? layer["source-layer"].toLowerCase()
        : "";

    const signature =
      `${id} ${sourceLayer}`;

    const isTransport =
      /road|street|highway|transport|motorway|trunk|primary|secondary|tertiary|path|bridge|tunnel/.test(
        signature
      );

    if (!isTransport) {
      continue;
    }

    try {
      /*
       * Straßen, Straßenränder, Brücken,
       * Tunnel und Nebenstraßen.
       */
      if (
        layer.type === "line"
      ) {
        map.setPaintProperty(
          layer.id,
          "line-color",
          "#F4B73F"
        );

        map.setPaintProperty(
          layer.id,
          "line-opacity",
          0.94
        );

        continue;
      }

      /*
       * Manche MapTiler-Straßen werden
       * als Flächen statt als Linien gerendert.
       */
      if (
        layer.type === "fill"
      ) {
        map.setPaintProperty(
          layer.id,
          "fill-color",
          "#F4B73F"
        );

        map.setPaintProperty(
          layer.id,
          "fill-opacity",
          0.82
        );

        continue;
      }

      /*
       * Straßen- und Verkehrsbezeichnungen.
       */
      if (
        layer.type === "symbol" &&
        layer.layout?.["text-field"]
      ) {
        map.setPaintProperty(
          layer.id,
          "text-color",
          "#FFD36A"
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-color",
          "rgba(5, 12, 28, 0.96)"
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-width",
          1.5
        );

        map.setPaintProperty(
          layer.id,
          "text-halo-blur",
          0.15
        );
      }
    }
    catch {
      /*
       * Speziallayer ohne entsprechende
       * Paint-Eigenschaft ignorieren.
       */
    }
  }
}

export default function InseratAiMapPage() {
  const mapContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<MapLibreMap | null>(
      null
    );

  const [
    mapInstance,
    setMapInstance,
  ] =
    useState<MapLibreMap | null>(
      null
    );

  const [
    market,
    setMarket,
  ] =
    useState<MapHomeCountry>(
      "CH"
    );

  const [
    listings,
    setListings,
  ] =
    useState<MapListing[]>([]);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    addressSearchLoading,
    setAddressSearchLoading,
  ] =
    useState(false);

  const [
    addressSearchError,
    setAddressSearchError,
  ] =
    useState("");

  const addressSearchMarkerRef =
    useRef<Marker | null>(
      null
    );

  /*
   * INSERAT_AI_ADDRESS_TARGET_V1
   * Beim Leeren der Suche verschwindet
   * der externe Zielmarker wieder.
   */
  useEffect(() => {
    if (search.trim()) {
      return;
    }

    addressSearchMarkerRef
      .current
      ?.remove();

    addressSearchMarkerRef.current =
      null;
  }, [
    search,
  ]);

  useEffect(() => {
    return () => {
      addressSearchMarkerRef
        .current
        ?.remove();

      addressSearchMarkerRef.current =
        null;
    };
  }, []);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    mapDebug,
    setMapDebug,
  ] =
    useState(
      "Kartenquelle wird geprüft …"
    );

  const [
    mapView,
    setMapView,
  ] =
    useState<MapViewMode>(
      "map"
    );

  const [
    is3D,
    setIs3D,
  ] =
    useState(false);


  /*
   * INSERAT_AI_GOLD_AMBER_STYLE_EFFECT_V2
   *
   * Hybrid bekommt Inserat-AI Gold/Amber.
   * Satellit bleibt bewusst reine Bildansicht.
   */
  useEffect(() => {
    const map =
      mapInstance;

    if (!map) {
      return;
    }

    const applyBranding =
      () => {
        if (
          mapView !== "hybrid"
        ) {
          return;
        }

        applyInseratAiAmberBranding(
          map
        );

        applyInseratAiAmberPlaceNames(
          map
        );

        map.once(
          "idle",
          () => {
            applyInseratAiAmberPlaceNames(
              map
            );
          }
        );
      };

    if (
      map.isStyleLoaded()
    ) {
      applyBranding();
    }

    map.on(
      "style.load",
      applyBranding
    );

    return () => {
      map.off(
        "style.load",
        applyBranding
      );
    };
  }, [
    mapInstance,
    mapView,
  ]);

  const mapTilerKey =
    process.env
      .NEXT_PUBLIC_MAPTILER_KEY
      ?.trim() || "";

  useEffect(() => {
    /*
     * INSERAT_AI_AT_HOME_COUNTRY_V2
     */
    const hostname =
      window.location.hostname
        .toLowerCase();

    if (
      hostname === "inserat-ai.at" ||
      hostname === "www.inserat-ai.at" ||
      hostname.endsWith(
        ".inserat-ai.at"
      )
    ) {
      setMarket("AT");
      return;
    }

    const domainMarket =
      getInseratAiMarketFromHostname(
        window.location.hostname
      );

    if (domainMarket) {
      setMarket(domainMarket);
      return;
    }

    const storedMarket =
      window.localStorage.getItem(
        "inseratAiMarket"
      );

    if (
      storedMarket === "DE" ||
      storedMarket === "CH" ||
      storedMarket === "AT"
    ) {
      setMarket(storedMarket);
    }
  }, []);

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const initial =
      COUNTRY_VIEW.CH;

    const map =
      new MapLibreMap({
        container:
          mapContainerRef.current,

        style:
          mapTilerKey
            ? createInseratAiStreetStyle(
                mapTilerKey
              )
            : "https://tiles.openfreemap.org/styles/liberty",

        center:
          initial.center,

        zoom:
          initial.zoom,

        pitch:
          0,

        bearing:
          0,

        attributionControl:
          {},
      });

    map.addControl(
      new NavigationControl({
        visualizePitch: true,
      }),
      "bottom-right"
    );

    map.addControl(
      new ScaleControl({
        maxWidth: 120,
        unit: "metric",
      }),
      "bottom-left"
    );

    const updateDebug =
      () => {
        const vectorReady =
          Boolean(
            map.getSource(
              "inserat-ai-planet-v4"
            )
          );

        const buildingReady =
          Boolean(
            map.getLayer(
              "inserat-ai-3d-buildings"
            )
          );

        const roadsReady =
          Boolean(
            map.getLayer(
              "inserat-ai-roads"
            )
          );

        setMapDebug(
          [
            `Vector: ${
              vectorReady
                ? "JA"
                : "NEIN"
            }`,
            `3D Gebäude: ${
              buildingReady
                ? "JA"
                : "NEIN"
            }`,
            `Straßen: ${
              roadsReady
                ? "JA"
                : "NEIN"
            }`,
          ].join(" · ")
        );
      };

    map.on(
      "style.load",
      () => {
        window.setTimeout(
          updateDebug,
          500
        );
      }
    );

    map.on(
      "error",
      (event) => {
        const message =
          event.error instanceof Error
            ? event.error.message
            : String(
                event.error ||
                "Unbekannter Kartenfehler"
              );

        console.error(
          "INSERAT_AI_MAP_ERROR",
          message
        );

        setMapDebug(
          `MAP ERROR: ${message}`
        );
      }
    );

    mapRef.current =
      map;

    setMapInstance(
      map
    );

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    const nextView =
      COUNTRY_VIEW[market];

    map.easeTo({
      center:
        nextView.center,
      zoom:
        nextView.zoom,
      duration:
        900,
    });
  }, [market]);

  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    /*
     * INSERAT_AI_PRESERVE_CAMERA_ON_STYLE_SWITCH_V1
     *
     * Karte / Satellit / Hybrid behalten
     * Position, Zoom und Blickwinkel bei.
     */
    const restoreCamera =
      () => {
        map.resize();
      };

    if (
      mapView === "map"
    ) {
      map.once(
        "style.load",
        () => {
          applyInseratAiMapTheme(
            map
          );

          restoreCamera();
        }
      );

      const mapStyle =
        mapTilerKey
          ? createInseratAiStreetStyle(
              mapTilerKey
            )
          : "https://tiles.openfreemap.org/styles/liberty";

      map.setStyle(
        mapStyle,
        {
          diff: false,
        }
      );

      return;
    }

    if (!mapTilerKey) {
      return;
    }

    const styleId =
      mapView === "satellite"
        ? "satellite"
        : "hybrid";

    map.once(
      "style.load",
      restoreCamera
    );

    map.setStyle(
      `https://api.maptiler.com/maps/${styleId}/style.json?key=${encodeURIComponent(
        mapTilerKey
      )}`,
      {
        diff: false,
      }
    );
  }, [
    mapView,
    mapTilerKey,
  ]);

  useEffect(() => {
    const map =
      mapRef.current;

    if (
      !map ||
      !mapTilerKey
    ) {
      return;
    }

    const terrainSourceId =
      "inserat-ai-terrain";

    const vectorSourceId =
      "inserat-ai-planet-v4";

    const buildingLayerId =
      "inserat-ai-3d-buildings";

    const roadCasingLayerId =
      "inserat-ai-road-casing";

    const roadLayerId =
      "inserat-ai-roads";

    const roadLabelLayerId =
      "inserat-ai-road-labels";

    const cityLabelLayerId =
      "inserat-ai-city-labels";

    const townLabelLayerId =
      "inserat-ai-town-labels";

    const placeLabelLayerId =
      "inserat-ai-place-labels";

    const ensureVectorSource =
      () => {
        if (
          map.getSource(
            vectorSourceId
          )
        ) {
          return;
        }

        map.addSource(
          vectorSourceId,
          {
            type: "vector",

            url:
              `https://api.maptiler.com/tiles/v4/tiles.json?key=${encodeURIComponent(
                mapTilerKey
              )}`,
          }
        );
      };

    const ensureRoadsAndLabels =
      () => {
        ensureVectorSource();

        if (
          !map.getLayer(
            buildingLayerId
          )
        ) {
          map.addLayer({
            id:
              buildingLayerId,

            type:
              "fill-extrusion",

            source:
              vectorSourceId,

            "source-layer":
              "building",

            minzoom:
              12,

            layout: {
              visibility:
                is3D
                  ? "visible"
                  : "none",
            },

            paint: {
              "fill-extrusion-color":
                "#ddd5c7",

              "fill-extrusion-height":
                [
                  "coalesce",
                  [
                    "get",
                    "height",
                  ],
                  8,
                ],

              "fill-extrusion-base":
                [
                  "coalesce",
                  [
                    "get",
                    "height_min",
                  ],
                  0,
                ],

              "fill-extrusion-opacity":
                0.96,

              "fill-extrusion-vertical-gradient":
                true,
            },
          });

          console.log(
            "INSERAT_AI_3D_BUILDING_LAYER_ADDED"
          );
        }
        else {
          map.setLayoutProperty(
            buildingLayerId,
            "visibility",
            is3D
              ? "visible"
              : "none"
          );
        }

        if (
          !map.getLayer(
            roadCasingLayerId
          )
        ) {
          map.addLayer({
            id:
              roadCasingLayerId,

            type:
              "line",

            source:
              vectorSourceId,

            "source-layer":
              "road",

            minzoom: 6,

            paint: {
              "line-color":
                "#17263c",

              "line-opacity":
                0.42,

              "line-width":
                [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  0.8,
                  12,
                  2.4,
                  17,
                  8,
                ],
            },
          });
        }

        if (
          !map.getLayer(
            roadLayerId
          )
        ) {
          map.addLayer({
            id:
              roadLayerId,

            type:
              "line",

            source:
              vectorSourceId,

            "source-layer":
              "road",

            minzoom: 6,

            paint: {
              "line-color":
                [
                  "match",
                  [
                    "get",
                    "class",
                  ],
                  "motorway",
                  "#f4b31b",
                  "trunk",
                  "#e9bd50",
                  "primary",
                  "#fff2c7",
                  "#ffffff",
                ],

              "line-opacity":
                0.95,

              "line-width":
                [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  0.4,
                  12,
                  1.6,
                  17,
                  5.8,
                ],
            },
          });
        }

        if (
          !map.getLayer(
            roadLabelLayerId
          )
        ) {
          map.addLayer({
            id:
              roadLabelLayerId,

            type:
              "symbol",

            source:
              vectorSourceId,

            "source-layer":
              "road_label",

            minzoom: 10,

            layout: {
              "symbol-placement":
                "line",

              "text-field":
                [
                  "coalesce",
                  [
                    "get",
                    "name:de",
                  ],
                  [
                    "get",
                    "name",
                  ],
                  [
                    "get",
                    "ref",
                  ],
                ],

              "text-size":
                [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  10,
                  16,
                  13,
                ],

              "text-letter-spacing":
                0.02,

              "text-max-angle":
                35,

              "symbol-spacing":
                300,
            },

            paint: {
              "text-color":
                "#17263c",

              "text-halo-color":
                "rgba(255,255,255,0.96)",

              "text-halo-width":
                2,
            },
          });
        }

        if (
          !map.getLayer(
            cityLabelLayerId
          )
        ) {
          map.addLayer({
            id:
              cityLabelLayerId,

            type:
              "symbol",

            source:
              vectorSourceId,

            "source-layer":
              "city_label",

            minzoom: 3,

            layout: {
              "text-field":
                [
                  "coalesce",
                  [
                    "get",
                    "name:de",
                  ],
                  [
                    "get",
                    "name",
                  ],
                ],

              "text-size":
                [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  4,
                  13,
                  12,
                  18,
                ],

              "text-letter-spacing":
                0.01,
            },

            paint: {
              "text-color":
                "#0b1f3a",

              "text-halo-color":
                "rgba(255,255,255,0.96)",

              "text-halo-width":
                2.2,
            },
          });
        }

        if (
          !map.getLayer(
            townLabelLayerId
          )
        ) {
          map.addLayer({
            id:
              townLabelLayerId,

            type:
              "symbol",

            source:
              vectorSourceId,

            "source-layer":
              "town_label",

            minzoom: 6,

            layout: {
              "text-field":
                [
                  "coalesce",
                  [
                    "get",
                    "name:de",
                  ],
                  [
                    "get",
                    "name",
                  ],
                ],

              "text-size":
                [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  11,
                  14,
                  15,
                ],
            },

            paint: {
              "text-color":
                "#17263c",

              "text-halo-color":
                "rgba(255,255,255,0.96)",

              "text-halo-width":
                2,
            },
          });
        }

        if (
          !map.getLayer(
            placeLabelLayerId
          )
        ) {
          map.addLayer({
            id:
              placeLabelLayerId,

            type:
              "symbol",

            source:
              vectorSourceId,

            "source-layer":
              "place_label",

            minzoom: 9,

            layout: {
              "text-field":
                [
                  "coalesce",
                  [
                    "get",
                    "name:de",
                  ],
                  [
                    "get",
                    "name",
                  ],
                ],

              "text-size":
                [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  9,
                  10,
                  16,
                  13,
                ],
            },

            paint: {
              "text-color":
                "#27384e",

              "text-halo-color":
                "rgba(255,255,255,0.94)",

              "text-halo-width":
                1.8,
            },
          });
        }
      };

    const apply3D =
      () => {
        if (
          mapView === "hybrid" ||
          is3D
        ) {
          ensureRoadsAndLabels();
        }
        if (!is3D) {
          if (
            map.getLayer(
              buildingLayerId
            )
          ) {
            map.setLayoutProperty(
              buildingLayerId,
              "visibility",
              "none"
            );
          }

          map.setTerrain(
            null
          );

          map.easeTo({
            pitch: 0,
            bearing: 0,
            duration: 700,
          });

          return;
        }

        if (
          !map.getSource(
            terrainSourceId
          )
        ) {
          map.addSource(
            terrainSourceId,
            {
              type:
                "raster-dem",

              url:
                `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${encodeURIComponent(
                  mapTilerKey
                )}`,

              tileSize:
                512,

              maxzoom:
                14,
            }
          );
        }

        map.setTerrain({
          source:
            terrainSourceId,

          exaggeration:
            1.15,
        });

        ensureRoadsAndLabels();

        if (
          map.getLayer(
            buildingLayerId
          )
        ) {
          map.setLayoutProperty(
            buildingLayerId,
            "visibility",
            "visible"
          );
        }

        map.easeTo({
          pitch: 55,
          bearing: -12,
          duration: 900,
        });
      };

    map.on(
      "style.load",
      apply3D
    );

    if (
      map.isStyleLoaded()
    ) {
      apply3D();
    }

    return () => {
      map.off(
        "style.load",
        apply3D
      );
    };
  }, [
    is3D,
    mapTilerKey,
    mapView,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadListings() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/listings",
            {
              credentials:
                "include",
              cache:
                "no-store",
              signal:
                controller.signal,
            }
          );

        if (
          response.status === 401
        ) {
          window.location.href =
            "/login";
          return;
        }

        const data =
          (await response.json()) as
            ListingsResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Objekte konnten nicht geladen werden."
          );
        }

        setListings(
          Array.isArray(
            data.listings
          )
            ? data.listings
            : []
        );
      } catch (
        loadError
      ) {
        if (
          loadError instanceof
            DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Objekte konnten nicht geladen werden."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadListings();

    return () =>
      controller.abort();
  }, []);

  const marketListings =
    useMemo(
      () =>
        listings.filter(
          (listing) =>
            listing.market ===
            market
        ),
      [
        listings,
        market,
      ]
    );

  const countryCount =
    useMemo(() => {
      const countries =
        new Set(
          listings
            .map(
              (listing) =>
                (
                  listing.countryCode ??
                  listing.market ??
                  ""
                )
                  .trim()
                  .toUpperCase()
            )
            .filter(Boolean)
        );

      return countries.size;
    }, [
      listings,
    ]);

  const visibleListings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase();

      if (!query) {
        return listings;
      }

      return listings.filter(
        (listing) =>
          [
            listing.projectName,
            listing.street,
            listing.location,
            listing.postalCode,
            listing.countryCode,
            listing.market,
            listing.propertyType,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase()
            .includes(query)
      );
    }, [
      listings,
      search,
    ]);

  const currency =
    market === "DE"
      ? "EUR"
      : "CHF";

  const locale =
    market === "DE"
      ? "de-DE"
      : "de-CH";

  function formatPrice(
    price?: number | null
  ) {
    if (
      typeof price !==
      "number"
    ) {
      return "Preis offen";
    }

    return new Intl.NumberFormat(
      locale,
      {
        style:
          "currency",
        currency,
        maximumFractionDigits:
          0,
      }
    ).format(price);
  }

  /*
   * INSERAT_AI_REAL_PRICE_PINS_V1
   */
  useEffect(() => {
    const map =
      mapInstance;

    if (!map) {
      return;
    }

    const markers:
      Marker[] = [];

    for (
      const listing of
        visibleListings
    ) {
      const latitude =
        listing.latitude;

      const longitude =
        listing.longitude;

      if (
        typeof latitude !==
          "number" ||
        typeof longitude !==
          "number" ||
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        continue;
      }

      const root =
        document.createElement(
          "button"
        );

      root.type =
        "button";

      root.title =
        listing.projectName ||
        listing.location;

      root.setAttribute(
        "aria-label",
        listing.projectName ||
          listing.location
      );

      Object.assign(
        root.style,
        {
          appearance:
            "none",
          border:
            "0",
          background:
            "transparent",
          padding:
            "0",
          margin:
            "0",
          cursor:
            "pointer",
          display:
            "flex",
          flexDirection:
            "column",
          alignItems:
            "center",
        }
      );

      const bubble =
        document.createElement(
          "span"
        );

      bubble.textContent =
        formatGlobalListingPrice(
          listing
        );

      Object.assign(
        bubble.style,
        {
          display:
            "block",
          padding:
            "8px 11px",
          border:
            "2px solid #0b1f3a",
          borderRadius:
            "999px",
          background:
            "#f4b31b",
          color:
            "#071426",
          fontSize:
            "12px",
          fontWeight:
            "900",
          lineHeight:
            "1",
          whiteSpace:
            "nowrap",
          boxShadow:
            "0 8px 22px rgba(7,20,38,0.30)",
        }
      );

      const pointer =
        document.createElement(
          "span"
        );

      Object.assign(
        pointer.style,
        {
          display:
            "block",
          width:
            "0",
          height:
            "0",
          marginTop:
            "-1px",
          borderLeft:
            "7px solid transparent",
          borderRight:
            "7px solid transparent",
          borderTop:
            "10px solid #0b1f3a",
        }
      );

      root.append(
        bubble,
        pointer
      );

      root.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          map.flyTo({
            center: [
              longitude,
              latitude,
            ],
            zoom:
              Math.max(
                map.getZoom(),
                16
              ),
            duration:
              900,
            essential:
              true,
          });
        }
      );

      const marker =
        new Marker({
          element:
            root,
          anchor:
            "bottom",
        })
          .setLngLat([
            longitude,
            latitude,
          ])
          .addTo(
            map
          );

      markers.push(
        marker
      );
    }

    return () => {
      for (
        const marker of
          markers
      ) {
        marker.remove();
      }
    };
  }, [
    mapInstance,
    visibleListings,
    locale,
    currency,
  ]);

  /*
   * INSERAT_AI_ADDRESS_SEARCH_V1
   */
  async function searchAddressOnMap() {
    const query =
      search.trim();

    const map =
      mapInstance;

    if (
      !query ||
      !map ||
      addressSearchLoading
    ) {
      return;
    }

    /*
     * Wenn der Filter genau ein
     * positioniertes eigenes Objekt
     * ergibt, fokussieren wir dieses
     * statt extern zu geocodieren.
     */
    const positionedListings =
      visibleListings.filter(
        (listing) =>
          typeof listing.latitude ===
            "number" &&
          typeof listing.longitude ===
            "number" &&
          Number.isFinite(
            listing.latitude
          ) &&
          Number.isFinite(
            listing.longitude
          )
      );

    if (
      positionedListings.length === 1
    ) {
      setAddressSearchError("");

      addressSearchMarkerRef
        .current
        ?.remove();

      addressSearchMarkerRef.current =
        null;

      focusListingOnMap(
        positionedListings[0]
      );

      return;
    }

    if (!mapTilerKey) {
      setAddressSearchError(
        "Die Adresssuche ist momentan nicht verfügbar."
      );

      return;
    }

    setAddressSearchLoading(true);
    setAddressSearchError("");

    try {
      const params =
        new URLSearchParams({
          key:
            mapTilerKey,

          language:
            "de",

          limit:
            "5",
        });

      const response =
        await fetch(
          `https://api.maptiler.com/geocoding/${encodeURIComponent(
            query
          )}.json?${params.toString()}`,
          {
            headers: {
              Accept:
                "application/json",
            },

            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          `MapTiler ${response.status}`
        );
      }

      const data =
        (await response.json()) as {
          features?: Array<{
            place_name?: string;
            text?: string;

            center?: [
              number,
              number
            ];

            geometry?: {
              coordinates?: [
                number,
                number
              ];
            };
          }>;
        };

      const feature =
        data.features?.find(
          (item) => {
            const coordinates =
              item.center ??
              item.geometry
                ?.coordinates;

            return (
              Array.isArray(
                coordinates
              ) &&
              typeof coordinates[0] ===
                "number" &&
              typeof coordinates[1] ===
                "number"
            );
          }
        );

      const coordinates =
        feature?.center ??
        feature?.geometry
          ?.coordinates;

      const longitude =
        coordinates?.[0];

      const latitude =
        coordinates?.[1];

      if (
        typeof longitude !==
          "number" ||
        typeof latitude !==
          "number" ||
        !Number.isFinite(
          longitude
        ) ||
        !Number.isFinite(
          latitude
        )
      ) {
        setAddressSearchError(
          "Adresse weltweit nicht gefunden."
        );

        return;
      }

      addressSearchMarkerRef
        .current
        ?.remove();

      const targetRoot =
        document.createElement(
          "div"
        );

      targetRoot.setAttribute(
        "aria-label",
        "Inserat AI Suchziel"
      );

      Object.assign(
        targetRoot.style,
        {
          display:
            "flex",

          flexDirection:
            "column",

          alignItems:
            "center",

          pointerEvents:
            "none",

          filter:
            "drop-shadow(0 8px 15px rgba(7,20,38,0.28))",
        }
      );

      /*
       * INSERAT_AI_AI_BEACON_V1
       * Premium-Tech Polish
       */
      targetRoot.style.filter =
        "drop-shadow(0 5px 9px rgba(7,20,38,0.16))";

      const beacon =
        document.createElement(
          "div"
        );

      Object.assign(
        beacon.style,
        {
          position:
            "relative",

          width:
            "52px",

          height:
            "62px",

          display:
            "flex",

          justifyContent:
            "center",

          alignItems:
            "flex-start",
        }
      );


      /*
       * Feiner holografischer Außenring
       */
      const pulseRing =
        document.createElement(
          "div"
        );

      Object.assign(
        pulseRing.style,
        {
          position:
            "absolute",

          top:
            "4px",

          left:
            "7px",

          width:
            "38px",

          height:
            "38px",

          borderRadius:
            "50%",

          border:
            "1.5px solid rgba(56,189,248,0.48)",

          boxShadow:
            "0 0 9px rgba(56,189,248,0.30)",

          boxSizing:
            "border-box",
        }
      );

      pulseRing.animate(
        [
          {
            transform:
              "scale(0.90)",

            opacity:
              0.62,
          },

          {
            transform:
              "scale(1.18)",

            opacity:
              0,
          },
        ],
        {
          duration:
            2100,

          iterations:
            Infinity,

          easing:
            "ease-out",
        }
      );


      /*
       * Dunkler Tech-Ring
       */
      const techRing =
        document.createElement(
          "div"
        );

      Object.assign(
        techRing.style,
        {
          position:
            "absolute",

          top:
            "8px",

          left:
            "11px",

          width:
            "30px",

          height:
            "30px",

          borderRadius:
            "50%",

          border:
            "2px solid #071426",

          background:
            "radial-gradient(circle at 50% 48%, rgba(244,179,27,0.18) 0%, rgba(7,20,38,0.97) 66%)",

          boxShadow:
            "0 0 0 1px rgba(56,189,248,0.20), 0 5px 12px rgba(7,20,38,0.20)",

          boxSizing:
            "border-box",
        }
      );


      /*
       * Präziser Goldkern
       */
      const core =
        document.createElement(
          "div"
        );

      Object.assign(
        core.style,
        {
          position:
            "absolute",

          top:
            "17px",

          left:
            "20px",

          width:
            "12px",

          height:
            "12px",

          borderRadius:
            "50%",

          background:
            "#f4b31b",

          border:
            "2px solid #071426",

          boxShadow:
            "0 0 6px rgba(244,179,27,0.90), 0 0 12px rgba(244,179,27,0.42)",

          boxSizing:
            "border-box",
        }
      );

      core.animate(
        [
          {
            transform:
              "scale(0.96)",
          },

          {
            transform:
              "scale(1.06)",
          },

          {
            transform:
              "scale(0.96)",
          },
        ],
        {
          duration:
            1750,

          iterations:
            Infinity,

          easing:
            "ease-in-out",
        }
      );


      /*
       * Dünne Lichtverbindung
       */
      const stem =
        document.createElement(
          "div"
        );

      Object.assign(
        stem.style,
        {
          position:
            "absolute",

          top:
            "36px",

          left:
            "24.5px",

          width:
            "3px",

          height:
            "11px",

          borderRadius:
            "999px",

          background:
            "linear-gradient(180deg, rgba(56,189,248,0.90) 0%, #f4b31b 100%)",

          boxShadow:
            "0 0 5px rgba(56,189,248,0.35)",
        }
      );


      /*
       * Schmale Zielspitze
       */
      const tip =
        document.createElement(
          "div"
        );

      Object.assign(
        tip.style,
        {
          position:
            "absolute",

          bottom:
            "4px",

          left:
            "19px",

          width:
            "14px",

          height:
            "14px",

          background:
            "#f4b31b",

          borderRight:
            "2px solid #071426",

          borderBottom:
            "2px solid #071426",

          transform:
            "rotate(45deg)",

          borderRadius:
            "1px",

          boxSizing:
            "border-box",
        }
      );


      /*
       * Exakter Kartenpunkt
       */
      const targetPoint =
        document.createElement(
          "div"
        );

      Object.assign(
        targetPoint.style,
        {
          position:
            "absolute",

          bottom:
            "-1px",

          left:
            "23px",

          width:
            "6px",

          height:
            "6px",

          borderRadius:
            "50%",

          background:
            "#38bdf8",

          border:
            "1.5px solid #071426",

          boxSizing:
            "border-box",

          boxShadow:
            "0 0 6px rgba(56,189,248,0.70)",
        }
      );

      beacon.append(
        pulseRing,
        techRing,
        core,
        stem,
        tip,
        targetPoint
      );

      targetRoot.append(
        beacon
      );

      beacon.animate(
        [
          {
            transform:
              "translateY(-7px) scale(0.82)",

            opacity:
              0,
          },

          {
            transform:
              "translateY(1px) scale(1.03)",

            opacity:
              1,
          },

          {
            transform:
              "translateY(0) scale(1)",

            opacity:
              1,
          },
        ],
        {
          duration:
            430,

          easing:
            "cubic-bezier(.2,.8,.2,1)",

          fill:
            "both",
        }
      );

      addressSearchMarkerRef.current =
        new Marker({
          element:
            targetRoot,

          anchor:
            "bottom",
        })
          .setLngLat([
            longitude,
            latitude,
          ])
          .addTo(
            map
          );

      map.flyTo({
        center: [
          longitude,
          latitude,
        ],

        zoom:
          16,

        duration:
          1000,

        essential:
          true,
      });
    }
    catch (error) {
      console.error(
        "[map/address-search]",
        error
      );

      setAddressSearchError(
        "Die Adresse konnte gerade nicht gesucht werden."
      );
    }
    finally {
      setAddressSearchLoading(false);
    }
  }


  /*
   * INSERAT_AI_LISTING_FOCUS_V1
   */
  function focusListingOnMap(
    listing: MapListing
  ) {
    const map =
      mapInstance;

    if (!map) {
      return;
    }

    const latitude =
      listing.latitude;

    const longitude =
      listing.longitude;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    map.flyTo({
      center: [
        longitude,
        latitude,
      ],

      zoom:
        Math.max(
          map.getZoom(),
          16
        ),

      duration:
        900,

      essential:
        true,
    });
  }

  return (
    <main className="iaMapPage">
      <div
        ref={
          mapContainerRef
        }
        className="iaMapCanvas"
      />

      <header className="iaMapTopbar">
        <div className="iaMapBrand">
          <div className="iaMapBrandMark">
            <svg
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <path d="M4 15.5 16 4l12 11.5" />
              <path d="M8 14v13" />
              <path d="M24 14v13" />
              <path d="M11 27h10" />
              <path d="M10 19h12" />
            </svg>
          </div>

          <div>
            <strong>
              Inserat AI Maps
            </strong>

            <span>
              Immobilien intelligent
              auf der Karte
            </span>
          </div>
        </div>

        <div className="iaMapTopActions">
          <span className="iaMapMarketBadge">
            🌍 Global Maps
          </span>

          <Link
            href="/cockpit"
            className="iaMapDashboardButton"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="iaMapViewSwitcher">
        <button
          type="button"
          className={
            mapView === "map"
              ? "isActive"
              : ""
          }
          onClick={() =>
            setMapView("map")
          }
        >
          Karte
        </button>

        <button
          type="button"
          className={
            mapView === "satellite"
              ? "isActive"
              : ""
          }
          disabled={
            !mapTilerKey
          }
          onClick={() =>
            setMapView(
              "satellite"
            )
          }
        >
          Satellit
        </button>

        <button
          type="button"
          className={
            mapView === "hybrid"
              ? "isActive"
              : ""
          }
          disabled={
            !mapTilerKey
          }
          onClick={() =>
            setMapView(
              "hybrid"
            )
          }
        >
          Hybrid
        </button>

        <button
          type="button"
          className={
            is3D
              ? "isActive"
              : ""
          }
          disabled={
            !mapTilerKey
          }
          onClick={() =>
            setIs3D(
              (current) =>
                !current
            )
          }
        >
          3D
        </button>
      </div>

      <RoutePlanner
        map={mapInstance}
      />

      <MarketPulseOverlay
        map={mapInstance}
        country={market}
      />

      <div className="iaMapDebug">
        {mapDebug}
      </div>

      <aside className="iaMapPanel">
        <div className="iaMapPanelHead">
          <span className="iaMapEyebrow">
            PORTFOLIO MAP
          </span>

          <h1>
            Meine Immobilien
          </h1>

          <p>
            Alle Objekte zentral
            auf einer Karte.
          </p>
        </div>

        <div className="iaMapStats">
          <div>
            <strong>
              {
                listings.length
              }
            </strong>
            <span>
              Objekte
            </span>
          </div>

          <div>
            <strong>
              {countryCount}
            </strong>
            <span>
              Länder
            </span>
          </div>
        </div>

        <form
          className="iaMapSearch"
          onSubmit={(
            event
          ) => {
            event.preventDefault();

            void searchAddressOnMap();
          }}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />
            <path d="m20 20-3.7-3.7" />
          </svg>

          <input
            value={search}
            onChange={(
              event
            ) => {
              setSearch(
                event.target
                  .value
              );

              if (
                addressSearchError
              ) {
                setAddressSearchError(
                  ""
                );
              }
            }}
            placeholder="Objekt oder Adresse suchen"
            aria-label="Objekt oder Adresse suchen"
          />

          <button
            type="submit"
            disabled={
              addressSearchLoading ||
              !search.trim()
            }
            title="Auf Karte suchen"
            aria-label="Auf Karte suchen"
          >
            {addressSearchLoading
              ? "…"
              : "→"}
          </button>
        </form>

        {addressSearchError && (
          <div
            className="iaMapSearchError"
            role="status"
          >
            {addressSearchError}
          </div>
        )}

        <div className="iaMapList">
          {loading && (
            <div className="iaMapState">
              Objekte werden
              geladen …
            </div>
          )}

          {!loading &&
            error && (
              <div className="iaMapState iaMapStateError">
                {error}
              </div>
            )}

          {!loading &&
            !error &&
            visibleListings.length ===
              0 && (
              <div className="iaMapEmpty">
                <div className="iaMapEmptyIcon">
                  ◎
                </div>

                <strong>
                  Noch keine
                  Immobilien hier
                </strong>

                <span>
                  Neue Objekte
                  erscheinen
                  automatisch in
                  Inserat AI Maps.
                </span>

                <Link
                  href="/dashboard#new-listing"
                >
                  Neues Inserat
                </Link>
              </div>
            )}

          {!loading &&
            !error &&
            visibleListings.map(
              (listing) => (
                <article
                  key={
                    listing.id
                  }
                  className="iaMapListingCard"
                  onClick={() =>
                    focusListingOnMap(
                      listing
                    )
                  }
                  style={{
                    cursor:
                      typeof listing.latitude === "number" &&
                      typeof listing.longitude === "number"
                        ? "pointer"
                        : "default",
                  }}
                >
                  <div className="iaMapListingTop">
                    <div>
                      <span>
                        {
                          listing.propertyType
                        }
                      </span>

                      <strong>
                        {listing.projectName ||
                          listing.location}
                      </strong>
                    </div>

                    <div className="iaMapPinPending">
                      {typeof listing.latitude === "number" &&
                      typeof listing.longitude === "number"
                        ? "MAP"
                        : "PIN"}
                    </div>
                  </div>

                  <div className="iaMapListingLocation">
                    {[
                      listing.postalCode,
                      listing.location,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(" ")}
                  </div>

                  <div className="iaMapListingFacts">
                    <span>
                      {formatGlobalListingPrice(
                        listing
                      )}
                    </span>

                    {typeof listing.rooms ===
                      "number" && (
                      <span>
                        {
                          listing.rooms
                        }{" "}
                        Zi.
                      </span>
                    )}

                    {typeof listing.livingArea ===
                      "number" && (
                      <span>
                        {
                          listing.livingArea
                        }{" "}
                        m²
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/cockpit/${encodeURIComponent(
                      listing.id
                    )}`}
                    className="iaMapOpenListing"
                  >
                    Objekt öffnen
                    <span>
                      →
                    </span>
                  </Link>
                </article>
              )
            )}
        </div>

        <div className="iaMapPhase">
          <span className="iaMapPhaseDot" />

          <div>
            <strong>
              Global Maps
            </strong>

            <p>
              Echte
              Objektpositionen,
              weltweite Suche
              und Routing direkt
              auf der Karte.
            </p>
          </div>
        </div>
      </aside>

      <div className="iaMapFloatingBadge">
        <span />
        INSERAT AI MAPS
      </div>

      <style jsx global>{`
        .iaMapPage {
          position: fixed;
          top: 78px;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          background: #07111f;
          color: #10203a;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .iaMapCanvas {
          position: absolute;
          inset: 0;
        }

        .iaMapTopbar {
          position: absolute;
          z-index: 20;
          top: 18px;
          left: 24px;
          right: 24px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          border: 1px solid
            rgba(
              15,
              31,
              55,
              0.12
            );
          border-radius: 18px;
          background:
            rgba(
              255,
              255,
              255,
              0.94
            );
          box-shadow:
            0 18px 45px
            rgba(
              10,
              31,
              56,
              0.16
            );
          backdrop-filter:
            blur(18px);
        }

        .iaMapBrand,
        .iaMapTopActions {
          display: flex;
          align-items: center;
        }

        .iaMapBrand {
          gap: 12px;
        }

        .iaMapBrandMark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            #0b1f3a;
          color: #f4b31b;
        }

        .iaMapBrandMark svg {
          width: 24px;
          height: 24px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap:
            round;
          stroke-linejoin:
            round;
        }

        .iaMapBrand strong {
          display: block;
          font-size: 16px;
          color: #10203a;
        }

        .iaMapBrand span {
          display: block;
          margin-top: 2px;
          color: #718096;
          font-size: 11px;
        }

        .iaMapTopActions {
          gap: 10px;
        }

        .iaMapMarketBadge,
        .iaMapDashboardButton {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 700;
        }

        .iaMapMarketBadge {
          gap: 7px;
          padding: 0 13px;
          background:
            #f4f6f8;
          color: #29384e;
        }

        .iaMapDashboardButton {
          padding: 0 16px;
          background:
            #0b1f3a;
          color: white;
          text-decoration: none;
        }

        .iaMapViewSwitcher {
          position: absolute;
          z-index: 18;
          top: 24px;
          right: 24px;
          display: flex;
          padding: 4px;
          gap: 2px;
          border: 1px solid
            rgba(
              15,
              31,
              55,
              0.12
            );
          border-radius: 14px;
          background:
            rgba(
              255,
              255,
              255,
              0.96
            );
          box-shadow:
            0 12px 35px
            rgba(
              10,
              31,
              56,
              0.16
            );
          backdrop-filter:
            blur(16px);
        }

        .iaMapViewSwitcher button {
          min-height: 38px;
          padding: 0 14px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #536176;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 160ms ease,
            color 160ms ease,
            box-shadow 160ms ease;
        }

        .iaMapViewSwitcher button:hover {
          background:
            #f4f6f8;
          color:
            #10203a;
        }

        .iaMapViewSwitcher button.isActive {
          background:
            #0b1f3a;
          color:
            #ffffff;
          box-shadow:
            0 5px 14px
            rgba(
              11,
              31,
              58,
              0.18
            );
        }

        .iaMapViewSwitcher button.isActive::after {
          content: "";
          display: block;
          width: 18px;
          height: 2px;
          margin:
            2px auto 0;
          border-radius:
            999px;
          background:
            #f4b31b;
        }

        .iaMapViewSwitcher button:disabled {
          opacity: 0.4;
          cursor:
            not-allowed;
        }

        .iaMapDebug {
          display: none;
          position: absolute;
          z-index: 30;
          right: 24px;
          top: 82px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(6, 20, 38, 0.92);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          box-shadow:
            0 8px 24px
            rgba(0, 0, 0, 0.18);
        }

                .iaMapPanel {
          position: absolute;
          z-index: 15;
          top: 24px;
          left: 24px;
          bottom: 24px;
          width: 360px;
          display: flex;
          flex-direction: column;
          padding: 22px;
          border: 1px solid
            rgba(
              15,
              31,
              55,
              0.1
            );
          border-radius: 22px;
          background:
            rgba(
              255,
              255,
              255,
              0.96
            );
          box-shadow:
            0 22px 60px
            rgba(
              10,
              31,
              56,
              0.18
            );
          backdrop-filter:
            blur(20px);
        }

        .iaMapEyebrow {
          color: #c58a05;
          font-size: 10px;
          font-weight: 900;
          letter-spacing:
            0.14em;
        }

        .iaMapPanelHead h1 {
          margin:
            7px 0 4px;
          font-size: 26px;
          letter-spacing:
            -0.03em;
        }

        .iaMapPanelHead p {
          margin: 0;
          color: #758297;
          font-size: 13px;
        }

        .iaMapStats {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 9px;
          margin-top: 18px;
        }

        .iaMapStats div {
          padding: 12px 13px;
          border-radius: 13px;
          background:
            #f5f7f9;
        }

        .iaMapStats strong,
        .iaMapStats span {
          display: block;
        }

        .iaMapStats strong {
          color: #10203a;
          font-size: 15px;
        }

        .iaMapStats span {
          margin-top: 2px;
          color: #8490a0;
          font-size: 10px;
          text-transform:
            uppercase;
          letter-spacing:
            0.08em;
        }

        .iaMapSearch {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 14px;
          padding: 0 12px;
          border:
            1px solid #dce2e8;
          border-radius: 12px;
          background: white;
        }

        .iaMapSearch svg {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: #758297;
          stroke-width: 1.8;
        }

        .iaMapSearch input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          background:
            transparent;
          color: #10203a;
          font: inherit;
          font-size: 13px;
        }

        .iaMapSearch button {
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 9px;
          background: #0b1f3a;
          color: #f4b31b;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 160ms ease,
            opacity 160ms ease;
        }

        .iaMapSearch button:hover:not(:disabled) {
          transform:
            translateX(2px);
        }

        .iaMapSearch button:disabled {
          opacity: 0.42;
          cursor: default;
        }

        .iaMapSearchError {
          margin:
            7px 4px 0;
          color: #b42318;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.35;
        }

        .iaMapList {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          margin-top: 14px;
          padding-right: 3px;
        }

        .iaMapState,
        .iaMapEmpty {
          border-radius: 14px;
          background:
            #f6f8fa;
          color: #778398;
        }

        .iaMapState {
          padding: 18px;
          font-size: 13px;
        }

        .iaMapStateError {
          color: #a43b3b;
        }

        .iaMapEmpty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 18px;
          text-align: center;
        }

        .iaMapEmptyIcon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
          border-radius: 50%;
          background:
            #fff4d6;
          color: #c58a05;
          font-size: 24px;
        }

        .iaMapEmpty strong {
          color: #27364c;
          font-size: 14px;
        }

        .iaMapEmpty span {
          max-width: 230px;
          margin-top: 5px;
          font-size: 12px;
          line-height: 1.5;
        }

        .iaMapEmpty a {
          margin-top: 14px;
          color: #b57b00;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .iaMapListingCard {
          margin-bottom: 9px;
          padding: 14px;
          border:
            1px solid #e1e6eb;
          border-radius: 15px;
          background: white;
        }

        .iaMapListingTop {
          display: flex;
          align-items:
            flex-start;
          justify-content:
            space-between;
          gap: 10px;
        }

        .iaMapListingTop span {
          display: block;
          color: #b27a00;
          font-size: 10px;
          font-weight: 900;
          text-transform:
            uppercase;
          letter-spacing:
            0.08em;
        }

        .iaMapListingTop strong {
          display: block;
          margin-top: 3px;
          color: #17263c;
          font-size: 14px;
        }

        .iaMapPinPending {
          padding: 5px 7px;
          border-radius: 8px;
          background:
            #fff4d7;
          color: #b37b00;
          font-size: 9px;
          font-weight: 900;
        }

        .iaMapListingLocation {
          margin-top: 7px;
          color: #6f7c8f;
          font-size: 11px;
        }

        .iaMapListingFacts {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 9px;
        }

        .iaMapListingFacts span {
          padding: 5px 7px;
          border-radius: 8px;
          background:
            #f4f6f8;
          color: #46546a;
          font-size: 10px;
          font-weight: 700;
        }

        .iaMapOpenListing {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          margin-top: 11px;
          color: #17263c;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .iaMapPhase {
          display: flex;
          gap: 9px;
          margin-top: 12px;
          padding: 12px;
          border-radius: 13px;
          background:
            #0b1f3a;
          color: white;
        }

        .iaMapPhaseDot {
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          margin-top: 4px;
          border-radius: 50%;
          background:
            #f4b31b;
          box-shadow:
            0 0 0 4px
            rgba(
              244,
              179,
              27,
              0.14
            );
        }

        .iaMapPhase strong {
          font-size: 11px;
        }

        .iaMapPhase p {
          margin: 2px 0 0;
          color: #aebdd0;
          font-size: 10px;
          line-height: 1.45;
        }

        .iaMapFloatingBadge {
          position: absolute;
          z-index: 10;
          right: 24px;
          bottom: 24px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 999px;
          background:
            rgba(
              11,
              31,
              58,
              0.9
            );
          color: white;
          font-size: 9px;
          font-weight: 900;
          letter-spacing:
            0.12em;
          backdrop-filter:
            blur(12px);
        }

        .iaMapFloatingBadge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background:
            #f4b31b;
        }

        .maplibregl-ctrl-group {
          overflow: hidden;
          border-radius:
            12px !important;
          box-shadow:
            0 8px 30px
            rgba(
              16,
              32,
              58,
              0.16
            ) !important;
        }

        .iaMapTopbar {
          display: none !important;
        }

        .iaMapFloatingBadge {
          display: none !important;
        }

        @media (
          max-width: 760px
        ) {
          .iaMapPage {
            top: 68px;
          }

          .iaMapViewSwitcher {
            top: 10px;
            right: 10px;
          }

          .iaMapViewSwitcher button {
            min-height: 34px;
            padding: 0 10px;
            font-size: 10px;
          }
          .iaMapTopbar {
            top: 10px;
            left: 10px;
            right: 10px;
            height: 62px;
            padding:
              0 12px;
            border-radius:
              15px;
          }

          .iaMapBrand span,
          .iaMapMarketBadge {
            display: none;
          }

          .iaMapBrandMark {
            width: 36px;
            height: 36px;
          }

          .iaMapDashboardButton {
            min-height: 36px;
            padding:
              0 12px;
          }

          .iaMapPanel {
            top: auto;
            left: 10px;
            right: 10px;
            bottom: 10px;
            width: auto;
            max-height: 46vh;
            padding: 16px;
            border-radius:
              18px;
          }

          .iaMapPanelHead h1 {
            font-size: 20px;
          }

          .iaMapStats,
          .iaMapPhase {
            display: none;
          }

          .iaMapSearch {
            margin-top: 10px;
          }

          .iaMapFloatingBadge {
            display: none;
          }

          .maplibregl-ctrl-bottom-right {
            bottom: 48vh;
          }
        }
      `}</style>
    </main>
  );
}
