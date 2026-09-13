"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Marker,
} from "maplibre-gl";

import type {
  Map as MapLibreMap,
} from "maplibre-gl";

type MarketPulseBand =
  | "hot"
  | "strong"
  | "watch"
  | "low";

type MarketPulseDataQuality =
  | "high"
  | "medium"
  | "low";

type MarketPulseRegion = {
  id: string;
  label: string;
  countryCode: string;

  center?: {
    latitude: number;
    longitude: number;
  };

  score: number;
  rawScore: number;
  confidence: number;
  signalCoverage: number;

  band: MarketPulseBand;
  dataQuality: MarketPulseDataQuality;

  drivers: Array<{
    key: string;
    label: string;
    value: number;
    weightedContribution: number;
  }>;

  recommendation: string;
};

type MarketPulseResponse = {
  success: boolean;
  version?: string;
  generatedAt?: string;
  country?: string | null;
  regionCount?: number;
  regions?: MarketPulseRegion[];
  error?: string;
};

type Props = {
  map: MapLibreMap | null;
  country: string;
};

function bandLabel(
  band: MarketPulseBand
) {
  switch (band) {
    case "hot":
      return "Hot";

    case "strong":
      return "Stark";

    case "watch":
      return "Beobachten";

    case "low":
      return "Niedrig";
  }
}

function qualityLabel(
  quality: MarketPulseDataQuality
) {
  switch (quality) {
    case "high":
      return "hoch";

    case "medium":
      return "mittel";

    case "low":
      return "niedrig";
  }
}

function getBandColor(
  band: MarketPulseBand
) {
  switch (band) {
    case "hot":
      return "#ffb000";

    case "strong":
      return "#f4b31b";

    case "watch":
      return "#38bdf8";

    case "low":
      return "#94a3b8";
  }
}

export default function MarketPulseOverlay({
  map,
  country,
}: Props) {
  const [
    available,
    setAvailable,
  ] = useState(false);

  const [
    enabled,
    setEnabled,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    regions,
    setRegions,
  ] = useState<
    MarketPulseRegion[]
  >([]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadPulse() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/market-pulse?country=${encodeURIComponent(
              country
            )}`,
            {
              credentials:
                "include",

              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        const data =
          (await response.json()) as
            MarketPulseResponse;

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          setAvailable(false);
          setEnabled(false);
          setRegions([]);

          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Market Pulse konnte nicht geladen werden."
          );
        }

        setAvailable(true);

        setRegions(
          Array.isArray(
            data.regions
          )
            ? data.regions
            : []
        );
      }
      catch (loadError) {
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
            : "Market Pulse konnte nicht geladen werden."
        );
      }
      finally {
        setLoading(false);
      }
    }

    void loadPulse();

    return () =>
      controller.abort();
  }, [
    country,
  ]);

  const topRegions =
    useMemo(
      () =>
        regions.slice(
          0,
          5
        ),
      [
        regions,
      ]
    );

  useEffect(() => {
    if (
      !map ||
      !enabled
    ) {
      return;
    }

    const markers:
      Marker[] = [];

    for (
      const region of regions
    ) {
      const center =
        region.center;

      if (!center) {
        continue;
      }

      if (
        !Number.isFinite(
          center.latitude
        ) ||
        !Number.isFinite(
          center.longitude
        )
      ) {
        continue;
      }

      const color =
        getBandColor(
          region.band
        );

      const root =
        document.createElement(
          "button"
        );

      root.type =
        "button";

      root.title =
        `${region.label}: ${region.score}/100`;

      root.setAttribute(
        "aria-label",
        `Market Pulse ${region.label}: ${region.score} von 100`
      );

      Object.assign(
        root.style,
        {
          position:
            "relative",

          width:
            "82px",

          height:
            "82px",

          border:
            "0",

          padding:
            "0",

          margin:
            "0",

          background:
            "transparent",

          cursor:
            "pointer",

          display:
            "grid",

          placeItems:
            "center",
        }
      );

      const halo =
        document.createElement(
          "span"
        );

      Object.assign(
        halo.style,
        {
          position:
            "absolute",

          inset:
            "4px",

          borderRadius:
            "999px",

          background:
            `radial-gradient(circle, ${color}55 0%, ${color}22 44%, transparent 72%)`,

          border:
            `1px solid ${color}66`,

          boxShadow:
            `0 0 28px ${color}55`,

          pointerEvents:
            "none",
        }
      );

      halo.animate(
        [
          {
            transform:
              "scale(0.88)",
            opacity:
              0.72,
          },
          {
            transform:
              "scale(1.15)",
            opacity:
              0.18,
          },
          {
            transform:
              "scale(0.88)",
            opacity:
              0.72,
          },
        ],
        {
          duration:
            2400,

          iterations:
            Infinity,

          easing:
            "ease-in-out",
        }
      );

      const score =
        document.createElement(
          "span"
        );

      score.textContent =
        String(
          region.score
        );

      Object.assign(
        score.style,
        {
          position:
            "relative",

          zIndex:
            "2",

          width:
            "48px",

          height:
            "48px",

          display:
            "grid",

          placeItems:
            "center",

          borderRadius:
            "50%",

          background:
            "#071426",

          border:
            `3px solid ${color}`,

          color:
            "#ffffff",

          fontSize:
            "15px",

          fontWeight:
            "900",

          boxShadow:
            `0 8px 24px rgba(7,20,38,0.36), 0 0 16px ${color}66`,
        }
      );

      const label =
        document.createElement(
          "span"
        );

      label.textContent =
        region.label;

      Object.assign(
        label.style,
        {
          position:
            "absolute",

          top:
            "64px",

          left:
            "50%",

          transform:
            "translateX(-50%)",

          padding:
            "4px 8px",

          borderRadius:
            "999px",

          background:
            "rgba(7,20,38,0.94)",

          color:
            "#ffffff",

          fontSize:
            "10px",

          fontWeight:
            "800",

          whiteSpace:
            "nowrap",

          boxShadow:
            "0 5px 14px rgba(7,20,38,0.22)",
        }
      );

      root.append(
        halo,
        score,
        label
      );

      root.addEventListener(
        "click",
        (
          event
        ) => {
          event.stopPropagation();

          map.flyTo({
            center: [
              center.longitude,
              center.latitude,
            ],

            zoom:
              Math.max(
                map.getZoom(),
                10
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
            "center",
        })
          .setLngLat([
            center.longitude,
            center.latitude,
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
    enabled,
    map,
    regions,
  ]);

  function focusRegion(
    region: MarketPulseRegion
  ) {
    if (
      !map ||
      !region.center
    ) {
      return;
    }

    map.flyTo({
      center: [
        region.center.longitude,
        region.center.latitude,
      ],

      zoom:
        Math.max(
          map.getZoom(),
          10
        ),

      duration:
        900,

      essential:
        true,
    });
  }

  if (!available) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={
          enabled
            ? "iaPulseToggle isActive"
            : "iaPulseToggle"
        }
        onClick={() =>
          setEnabled(
            (current) =>
              !current
          )
        }
      >
        <span className="iaPulseToggleDot" />

        <span>
          Market Pulse
        </span>

        <strong>
          {regions.length}
        </strong>
      </button>

      {enabled && (
        <section className="iaPulsePanel">
          <div className="iaPulseHead">
            <div>
              <span>
                AI OPPORTUNITY
              </span>

              <strong>
                Market Pulse
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                setEnabled(
                  false
                )
              }
              aria-label="Market Pulse schließen"
            >
              ×
            </button>
          </div>

          <p className="iaPulseIntro">
            Interne Akquise-Chancen
            aus echten Inserat-AI-Signalen.
          </p>

          {loading && (
            <div className="iaPulseState">
              Signale werden
              berechnet …
            </div>
          )}

          {!loading &&
            error && (
              <div className="iaPulseState iaPulseError">
                {error}
              </div>
            )}

          {!loading &&
            !error &&
            topRegions.length ===
              0 && (
              <div className="iaPulseState">
                Noch keine
                ausreichenden Daten
                für dieses Land.
              </div>
            )}

          {!loading &&
            !error &&
            topRegions.map(
              (
                region,
                index
              ) => (
                <button
                  key={
                    region.id
                  }
                  type="button"
                  className="iaPulseRegion"
                  onClick={() =>
                    focusRegion(
                      region
                    )
                  }
                >
                  <div className="iaPulseRank">
                    {index + 1}
                  </div>

                  <div className="iaPulseRegionMain">
                    <div className="iaPulseRegionTop">
                      <strong>
                        {
                          region.label
                        }
                      </strong>

                      <span
                        style={{
                          borderColor:
                            getBandColor(
                              region.band
                            ),

                          color:
                            getBandColor(
                              region.band
                            ),
                        }}
                      >
                        {
                          region.score
                        }
                        /100
                      </span>
                    </div>

                    <div className="iaPulseRegionMeta">
                      {bandLabel(
                        region.band
                      )}
                      {" · "}
                      Datenqualität{" "}
                      {qualityLabel(
                        region.dataQuality
                      )}
                      {" · "}
                      {Math.round(
                        region.confidence *
                          100
                      )}
                      %
                    </div>

                    {region.drivers[0] && (
                      <div className="iaPulseDriver">
                        ↑{" "}
                        {
                          region
                            .drivers[0]
                            .label
                        }
                      </div>
                    )}

                    <div className="iaPulseRecommendation">
                      {
                        region.recommendation
                      }
                    </div>
                  </div>
                </button>
              )
            )}

          <div className="iaPulseFoot">
            Score 0–100 · Confidence
            schützt vor Scheingenauigkeit
          </div>
        </section>
      )}

      <style jsx>{`
        .iaPulseToggle {
          position: absolute;
          z-index: 35;
          top: 78px;
          right: 24px;

          height: 42px;

          display: flex;
          align-items: center;
          gap: 9px;

          padding:
            0 14px;

          border:
            1px solid
            rgba(
              244,
              179,
              27,
              0.34
            );

          border-radius:
            999px;

          background:
            rgba(
              7,
              20,
              38,
              0.92
            );

          color:
            #ffffff;

          font-size:
            12px;

          font-weight:
            800;

          cursor:
            pointer;

          box-shadow:
            0 12px 30px
            rgba(
              7,
              20,
              38,
              0.22
            );

          backdrop-filter:
            blur(16px);
        }

        .iaPulseToggle:hover,
        .iaPulseToggle.isActive {
          border-color:
            rgba(
              244,
              179,
              27,
              0.88
            );

          box-shadow:
            0 12px 30px
            rgba(
              7,
              20,
              38,
              0.26
            ),
            0 0 18px
            rgba(
              244,
              179,
              27,
              0.18
            );
        }

        .iaPulseToggleDot {
          width: 9px;
          height: 9px;

          border-radius:
            50%;

          background:
            #f4b31b;

          box-shadow:
            0 0 12px
            rgba(
              244,
              179,
              27,
              0.8
            );
        }

        .iaPulseToggle strong {
          min-width:
            24px;

          height:
            24px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            999px;

          background:
            rgba(
              244,
              179,
              27,
              0.16
            );

          color:
            #ffd36a;

          font-size:
            11px;
        }

        .iaPulsePanel {
          position:
            absolute;

          z-index: 34;

          top: 78px;
          right: 190px;

          width:
            340px;

          max-height:
            calc(
              100vh -
              280px
            );

          overflow-y:
            auto;

          padding:
            16px;

          border:
            1px solid
            rgba(
              244,
              179,
              27,
              0.24
            );

          border-radius:
            20px;

          background:
            rgba(
              7,
              20,
              38,
              0.94
            );

          color:
            #ffffff;

          box-shadow:
            0 22px 60px
            rgba(
              7,
              20,
              38,
              0.32
            );

          backdrop-filter:
            blur(20px);
        }

        .iaPulseHead {
          display:
            flex;

          justify-content:
            space-between;

          gap:
            16px;
        }

        .iaPulseHead div {
          display:
            flex;

          flex-direction:
            column;

          gap:
            4px;
        }

        .iaPulseHead span {
          color:
            #f4b31b;

          font-size:
            10px;

          font-weight:
            900;

          letter-spacing:
            0.16em;
        }

        .iaPulseHead strong {
          font-size:
            20px;
        }

        .iaPulseHead button {
          width:
            30px;

          height:
            30px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );

          border-radius:
            10px;

          background:
            rgba(
              255,
              255,
              255,
              0.06
            );

          color:
            #ffffff;

          cursor:
            pointer;
        }

        .iaPulseIntro {
          margin:
            10px 0 14px;

          color:
            #aebcd0;

          font-size:
            12px;

          line-height:
            1.45;
        }

        .iaPulseState {
          padding:
            16px;

          border-radius:
            14px;

          background:
            rgba(
              255,
              255,
              255,
              0.06
            );

          color:
            #cbd5e1;

          font-size:
            12px;
        }

        .iaPulseError {
          color:
            #fecaca;
        }

        .iaPulseRegion {
          width:
            100%;

          display:
            flex;

          gap:
            11px;

          margin-top:
            8px;

          padding:
            11px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius:
            15px;

          background:
            rgba(
              255,
              255,
              255,
              0.045
            );

          color:
            inherit;

          text-align:
            left;

          cursor:
            pointer;
        }

        .iaPulseRegion:hover {
          border-color:
            rgba(
              244,
              179,
              27,
              0.3
            );

          background:
            rgba(
              244,
              179,
              27,
              0.06
            );
        }

        .iaPulseRank {
          width:
            28px;

          height:
            28px;

          flex:
            0 0 auto;

          display:
            grid;

          place-items:
            center;

          border-radius:
            9px;

          background:
            #f4b31b;

          color:
            #071426;

          font-size:
            11px;

          font-weight:
            900;
        }

        .iaPulseRegionMain {
          min-width:
            0;

          flex:
            1;
        }

        .iaPulseRegionTop {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            10px;
        }

        .iaPulseRegionTop strong {
          overflow:
            hidden;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;

          font-size:
            13px;
        }

        .iaPulseRegionTop span {
          flex:
            0 0 auto;

          padding:
            3px 7px;

          border:
            1px solid;

          border-radius:
            999px;

          font-size:
            10px;

          font-weight:
            900;
        }

        .iaPulseRegionMeta,
        .iaPulseDriver,
        .iaPulseRecommendation {
          margin-top:
            5px;

          font-size:
            10px;

          line-height:
            1.35;
        }

        .iaPulseRegionMeta {
          color:
            #94a3b8;
        }

        .iaPulseDriver {
          color:
            #ffd36a;
        }

        .iaPulseRecommendation {
          color:
            #dbe7f5;
        }

        .iaPulseFoot {
          margin-top:
            12px;

          padding-top:
            10px;

          border-top:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          color:
            #718096;

          font-size:
            9px;
        }

        @media (
          max-width:
            760px
        ) {
          .iaPulseToggle {
            top:
              104px;

            right:
              12px;
          }

          .iaPulsePanel {
            top:
              156px;

            left:
              12px;

            right:
              12px;

            width:
              auto;

            max-height:
              52vh;
          }
        }
      `}</style>
    </>
  );
}
