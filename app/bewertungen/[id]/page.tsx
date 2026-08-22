"use client";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

import {
  useLocale,
  useTranslations,
} from "next-intl";

type Valuation = {
  id: string;
  status: string;
  addressLabel: string;
  propertyType: string;
  livingArea: number;
  landArea: number | null;
  rooms: number | null;
  buildingYear: number;
  renovationYear: number | null;
  condition: string | null;
  standard: string | null;
  floorNumber: number | null;
  hasLift: boolean | null;
  parking: string | null;
  outdoorArea: string | null;
  view: string | null;
  provider: string | null;
  currency: string;
  salePrice: number | null;
  salePriceLower: number | null;
  salePriceUpper: number | null;
  pricePerSqm: number | null;
  confidence: string | null;
  locationScore: number | null;
  valuedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  configured?: boolean;
  valuation?: Valuation;
};

function localeCode(
  locale: string
) {
  if (locale === "fr") {
    return "fr-CH";
  }

  if (locale === "it") {
    return "it-CH";
  }

  if (locale === "en") {
    return "en-CH";
  }

  return "de-CH";
}

function formatCHF(
  value: number | null,
  locale: string
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "–";
  }

  return new Intl.NumberFormat(
    localeCode(locale),
    {
      maximumFractionDigits: 0,
    }
  ).format(value);
}



function ValuationFeatureIcon({
  index,
}: {
  index: number;
}) {
  const props = {
    className:
      "h-[21px] w-[21px]",
    viewBox:
      "0 0 24 24",
    fill:
      "none",
    stroke:
      "currentColor",
    strokeWidth:
      1.65,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
  };

  switch (index) {
    case 0:
      return (
        <svg {...props}>
          <path d="M4 21V5l8-3 8 3v16" />
          <path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2" />
          <path d="M10 21v-3h4v3" />
        </svg>
      );

    case 1:
      return (
        <svg {...props}>
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M3 16v5h5" />
          <path d="M21 16v5h-5" />
          <path d="M9 9h6v6H9z" />
        </svg>
      );

    case 2:
      return (
        <svg {...props}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle
            cx="12"
            cy="10"
            r="2.5"
          />
        </svg>
      );

    case 3:
      return (
        <svg {...props}>
          <path d="M3 12h18v6H3z" />
          <path d="M5 12V9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3" />
          <path d="M12 12V9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3" />
          <path d="M5 18v2M19 18v2" />
        </svg>
      );

    case 4:
      return (
        <svg {...props}>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M7 3v4M17 3v4M3 9h18" />
          <path d="M8 13h2M14 13h2M8 17h2M14 17h2" />
        </svg>
      );

    case 5:
      return (
        <svg {...props}>
          <path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-3 3-3-3 3-3Z" />
        </svg>
      );

    case 6:
      return (
        <svg {...props}>
          <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );

    case 7:
      return (
        <svg {...props}>
          <path d="M5 20V10" />
          <path d="M10 20V6" />
          <path d="M15 20V13" />
          <path d="M20 20V3" />
          <path d="M3 20h19" />
        </svg>
      );

    case 8:
      return (
        <svg {...props}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 16 9 5 9-5" />
        </svg>
      );

    case 9:
      return (
        <svg {...props}>
          <rect
            x="4"
            y="4"
            width="16"
            height="17"
            rx="2"
          />
          <path d="M12 4v17" />
          <path d="m8 9 2-2 2 2" />
          <path d="m16 16-2 2-2-2" />
        </svg>
      );

    case 10:
      return (
        <svg {...props}>
          <path d="M5 16h14l-1.5-6h-11L5 16Z" />
          <path d="m7 10 2-4h6l2 4" />
          <circle
            cx="8"
            cy="17"
            r="2"
          />
          <circle
            cx="16"
            cy="17"
            r="2"
          />
        </svg>
      );

    case 11:
      return (
        <svg {...props}>
          <path d="M12 3c-3 2-5 5-5 8a5 5 0 0 0 10 0c0-3-2-6-5-8Z" />
          <path d="M12 11v10M8 21h8" />
        </svg>
      );

    default:
      return (
        <svg {...props}>
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" />
          <circle
            cx="12"
            cy="12"
            r="2.5"
          />
        </svg>
      );
  }
}

export default function BewertungDetailPage() {
  const t =
    useTranslations(
      "Valuations"
    );

  const locale =
    useLocale();

  const params =
    useParams<{
      id: string;
    }>();

  const id =
    typeof params.id ===
      "string"
      ? params.id
      : "";

  const [
    valuation,
    setValuation,
  ] =
    useState<Valuation | null>(
      null
    );

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
    needsLogin,
    setNeedsLogin,
  ] =
    useState(false);

  const [
    revaluating,
    setRevaluating,
  ] =
    useState(false);

  const [
    revalueMessage,
    setRevalueMessage,
  ] =
    useState("");

  const [
    revalueMessageType,
    setRevalueMessageType,
  ] =
    useState<
      "success" |
      "error" |
      null
    >(null);

  const propertyTypeLabel = (
    value: string
  ) => {
    switch (value) {
      case "apartment":
        return t(
          "propertyTypes.apartment"
        );

      case "house":
        return t(
          "propertyTypes.house"
        );

      case "row-house":
        return t(
          "propertyTypes.rowHouse"
        );

      case "semi-detached":
        return t(
          "propertyTypes.semiDetached"
        );

      default:
        return value;
    }
  };

  const conditionLabel = (
    value: string | null
  ) => {
    switch (value) {
      case "new":
        return t(
          "conditions.new"
        );

      case "very-good":
        return t(
          "conditions.veryGood"
        );

      case "good":
        return t(
          "conditions.good"
        );

      case "average":
        return t(
          "conditions.average"
        );

      case "renovation":
        return t(
          "conditions.renovation"
        );

      default:
        return t(
          "values.notSpecified"
        );
    }
  };

  const standardLabel = (
    value: string | null
  ) => {
    switch (value) {
      case "simple":
        return t(
          "standards.simple"
        );

      case "standard":
        return t(
          "standards.standard"
        );

      case "high":
        return t(
          "standards.high"
        );

      case "luxury":
        return t(
          "standards.luxury"
        );

      default:
        return t(
          "values.notSpecified"
        );
    }
  };

  const parkingLabel = (
    value: string | null
  ) => {
    switch (value) {
      case "none":
        return t(
          "parking.none"
        );

      case "outdoor":
        return t(
          "parking.outdoor"
        );

      case "garage":
        return t(
          "parking.garage"
        );

      case "underground":
        return t(
          "parking.underground"
        );

      case "multiple":
        return t(
          "parking.multiple"
        );

      default:
        return t(
          "values.notSpecified"
        );
    }
  };

  const outdoorLabel = (
    value: string | null
  ) => {
    switch (value) {
      case "none":
        return t(
          "outdoor.none"
        );

      case "balcony":
        return t(
          "outdoor.balcony"
        );

      case "terrace":
        return t(
          "outdoor.terrace"
        );

      case "garden":
        return t(
          "outdoor.garden"
        );

      case "multiple":
        return t(
          "outdoor.multiple"
        );

      default:
        return t(
          "values.notSpecified"
        );
    }
  };

  const viewLabel = (
    value: string | null
  ) => {
    switch (value) {
      case "normal":
        return t(
          "view.normal"
        );

      case "quiet":
        return t(
          "view.quiet"
        );

      case "open":
        return t(
          "view.open"
        );

      case "mountain":
        return t(
          "view.mountain"
        );

      case "lake":
        return t(
          "view.lake"
        );

      case "premium":
        return t(
          "view.premium"
        );

      default:
        return t(
          "values.notSpecified"
        );
    }
  };

  const confidenceLabel = (
    value: string | null
  ) => {
    if (value === "good") {
      return t(
        "confidence.good"
      );
    }

    if (value === "medium") {
      return t(
        "confidence.medium"
      );
    }

    if (value === "poor") {
      return t(
        "confidence.poor"
      );
    }

    return t(
      "confidence.unknown"
    );
  };

  useEffect(() => {
    if (!id) {
      setError(
        t(
          "detail.unavailableText"
        )
      );

      setLoading(false);
      return;
    }

    const controller =
      new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError("");
        setNeedsLogin(false);

        const response =
          await fetch(
            `/api/valuations/${encodeURIComponent(
              id
            )}`,
            {
              cache: "no-store",
              credentials: "include",
              signal:
                controller.signal,
            }
          );

        const data =
          (await response
            .json()
            .catch(() => null)) as
            | ApiResponse
            | null;

        if (
          response.status ===
          401
        ) {
          setNeedsLogin(true);
          return;
        }

        if (
          !response.ok ||
          !data?.success ||
          !data.valuation
        ) {
          throw new Error(
            data?.error ||
              t(
                "detail.unavailableText"
              )
          );
        }

        setValuation(
          data.valuation
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
          loadError instanceof
            Error
            ? loadError.message
            : t(
                "detail.unavailableText"
              )
        );
      } finally {
        if (
          !controller
            .signal
            .aborted
        ) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [id, t]);

  async function handleRevalue() {
    if (
      !id ||
      revaluating
    ) {
      return;
    }

    try {
      setRevaluating(true);
      setRevalueMessage("");
      setRevalueMessageType(
        null
      );

      const response =
        await fetch(
          `/api/valuations/${encodeURIComponent(
            id
          )}/revalue`,
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",
          }
        );

      const data =
        (await response
          .json()
          .catch(() => null)) as
          | ApiResponse
          | null;

      if (
        response.status ===
        401
      ) {
        setNeedsLogin(true);
        return;
      }

      if (
        response.status ===
          503 &&
        data?.configured ===
          false
      ) {
        setRevalueMessage(
          t(
            "revalue.providerNotConfigured"
          )
        );

        setRevalueMessageType(
          "error"
        );

        return;
      }

      if (
        !response.ok ||
        !data?.success ||
        !data.valuation
      ) {
        throw new Error(
          data?.error ||
            t(
              "revalue.error"
            )
        );
      }

      setValuation(
        data.valuation
      );

      setRevalueMessage(
        t(
          "revalue.success"
        )
      );

      setRevalueMessageType(
        "success"
      );
    } catch (
      revalueError
    ) {
      console.error(
        "[valuation/revalue]",
        revalueError
      );

      setRevalueMessage(
        t(
          "revalue.error"
        )
      );

      setRevalueMessageType(
        "error"
      );
    } finally {
      setRevaluating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </main>
    );
  }

  if (needsLogin) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">
            {t(
              "auth.eyebrow"
            )}
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            {t(
              "auth.title"
            )}
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            {t(
              "auth.detailText"
            )}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-lg bg-[#071126] px-5 py-3 text-sm font-semibold text-white"
          >
            {t(
              "actions.login"
            )}
          </Link>
        </div>
      </main>
    );
  }

  if (
    error ||
    !valuation
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-7">
          <h1 className="font-bold text-red-800">
            {t(
              "detail.unavailableTitle"
            )}
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error ||
              t(
                "detail.unavailableText"
              )}
          </p>

          <Link
            href="/bewertungen"
            className="mt-6 inline-flex text-sm font-semibold text-red-800 underline"
          >
            ←{" "}
            {t(
              "actions.back"
            )}
          </Link>
        </div>
      </main>
    );
  }

  const completed =
    valuation.status ===
      "completed" &&
    valuation.salePrice !==
      null;

  const details = [
    [
      t(
        "fields.propertyType"
      ),
      propertyTypeLabel(
        valuation.propertyType
      ),
    ],

    [
      t(
        "fields.livingArea"
      ),
      `${valuation.livingArea} m²`,
    ],

    [
      t(
        "fields.landArea"
      ),
      valuation.landArea !==
        null
        ? `${valuation.landArea} m²`
        : t(
            "values.notRelevant"
          ),
    ],

    [
      t(
        "fields.rooms"
      ),
      valuation.rooms ??
        t(
          "values.notSpecified"
        ),
    ],

    [
      t(
        "fields.buildingYear"
      ),
      valuation.buildingYear,
    ],

    [
      t(
        "fields.renovationYear"
      ),
      valuation.renovationYear ??
        t(
          "values.notSpecified"
        ),
    ],

    [
      t(
        "fields.condition"
      ),
      conditionLabel(
        valuation.condition
      ),
    ],

    [
      t(
        "fields.standard"
      ),
      standardLabel(
        valuation.standard
      ),
    ],

    [
      t(
        "fields.floor"
      ),
      valuation.floorNumber ??
        t(
          "values.notRelevant"
        ),
    ],

    [
      t(
        "fields.lift"
      ),
      valuation.hasLift ===
        true
        ? t(
            "values.yes"
          )
        : valuation.hasLift ===
            false
          ? t(
              "values.no"
            )
          : t(
              "values.notSpecified"
            ),
    ],

    [
      t(
        "fields.parking"
      ),
      parkingLabel(
        valuation.parking
      ),
    ],

    [
      t(
        "fields.outdoorArea"
      ),
      outdoorLabel(
        valuation.outdoorArea
      ),
    ],

    [
      t(
        "fields.view"
      ),
      viewLabel(
        valuation.view
      ),
    ],
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020816] text-white">
      {/* =====================================================
          INSERAT-AI VALUATION ENVIRONMENT
          ===================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_30%,rgba(20,71,143,0.24),transparent_34%),radial-gradient(circle_at_76%_18%,rgba(255,174,0,0.10),transparent_26%),radial-gradient(circle_at_10%_60%,rgba(11,62,132,0.16),transparent_31%),linear-gradient(135deg,#020816_0%,#061326_48%,#03101f_100%)]" />

        <div className="absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(111,167,230,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(111,167,230,0.035)_1px,transparent_1px)] [background-size:52px_52px]" />

        <div className="absolute left-1/2 top-[125px] h-px w-[82%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ffbd24]/35 to-transparent" />

        <div className="absolute left-[7%] top-[240px] h-[420px] w-[420px] rounded-full bg-blue-500/[0.04] blur-3xl" />

        <div className="absolute right-[4%] top-[210px] h-[380px] w-[380px] rounded-full bg-amber-400/[0.035] blur-3xl" />
      </div>


      <section className="relative z-10 mx-auto max-w-[1500px] px-5 pb-24 pt-24 sm:px-8">
        {/* ===================================================
            TOP NAVIGATION
            =================================================== */}
        <div className="relative mb-8 flex flex-wrap items-center justify-between gap-4">
          {/* Goldene Verbindungslinie */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[56px] right-[210px] top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-[#ffc247]/55 via-[#ffc247]/20 to-transparent shadow-[0_0_12px_rgba(255,194,71,0.14)] sm:block"
          />

          <Link
            href="/bewertungen"
            className="group relative z-10 inline-flex items-center gap-3 text-sm font-extrabold text-[#ffd978] transition duration-300 hover:text-[#fff0bb]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ffc247]/45 bg-[#ffc247]/[0.075] text-[#ffc247] shadow-[0_0_22px_rgba(255,194,71,0.13),inset_0_0_14px_rgba(255,194,71,0.025)] transition duration-300 group-hover:border-[#ffc247]/80 group-hover:bg-[#ffc247]/[0.12] group-hover:shadow-[0_0_30px_rgba(255,194,71,0.25)]">
              <span
                aria-hidden="true"
                className="text-base font-black"
              >
                ←
              </span>
            </span>

            <span className="drop-shadow-[0_0_8px_rgba(255,194,71,0.18)]">
              {t(
                "actions.back"
              )}
            </span>
          </Link>

          <Link
            href="/bewertung"
            className="group relative z-10 inline-flex items-center gap-3 rounded-full border border-[#ffc247]/45 bg-[#ffc247]/[0.075] px-5 py-2.5 text-sm font-extrabold text-[#ffd978] shadow-[0_0_22px_rgba(255,194,71,0.08)] transition duration-300 hover:border-[#ffc247]/75 hover:bg-[#ffc247]/[0.12] hover:text-[#fff0bb] hover:shadow-[0_0_28px_rgba(255,194,71,0.18)]"
          >
            <span className="flex h-5 w-5 items-center justify-center text-lg leading-none text-[#ffc247]">
              +
            </span>

            {t(
              "actions.new"
            )}
          </Link>
        </div>


        {/* ===================================================
            VALUATION LENS
            =================================================== */}
        <div className="relative overflow-hidden rounded-[34px] border border-blue-100/[0.08] bg-[#061326]/88 shadow-[0_38px_110px_rgba(0,0,0,0.42),0_0_45px_rgba(21,78,148,0.07)] backdrop-blur-2xl">
          <div
            aria-hidden="true"
            className="absolute inset-x-[60px] top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffc247] to-transparent shadow-[0_0_20px_rgba(255,194,71,0.65)]"
          />

          <div className="grid min-h-[680px] xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* ===============================================
                MAIN SCANNER
                =============================================== */}
            <section className="relative overflow-hidden p-7 sm:p-10 xl:p-12">
              {/* ---------------------------------------------
                  ADDRESS / IDENTITY
                  --------------------------------------------- */}
              <div className="relative z-20 max-w-[780px]">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={
                      completed
                        ? "inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300"
                        : "inline-flex items-center gap-2 rounded-full border border-[#ffc247]/25 bg-[#ffc247]/[0.055] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#ffd978]"
                    }
                  >
                    <span
                      className={
                        completed
                          ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
                          : "h-1.5 w-1.5 rounded-full bg-[#ffc247] shadow-[0_0_9px_rgba(255,194,71,0.85)]"
                      }
                    />

                    {completed
                      ? t(
                          "status.completed"
                        )
                      : t(
                          "status.draft"
                        )}
                  </span>

                  <span className="text-[8px] font-black uppercase tracking-[0.26em] text-blue-200/35">
                    INSERAT-AI · VALUATION INTELLIGENCE
                  </span>
                </div>

                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.30em] text-[#ffc247]">
                  {t(
                    "detail.eyebrow"
                  )}
                </p>

                <h1 className="mt-3 max-w-[790px] text-[38px] font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-[48px] xl:text-[54px]">
                  {
                    valuation.addressLabel
                  }
                </h1>
              </div>


              {/* =============================================
                  CENTRAL PROPERTY LENS
                  ============================================= */}
              <div className="relative mx-auto mt-3 h-[430px] max-w-[850px]">
                {/* Blue energy field */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-[370px] w-[520px] max-w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-blue-400/[0.045] blur-[45px]"
                />

                {/* Scanner rings */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="absolute inset-0 animate-[spin_38s_linear_infinite] rounded-full border border-dashed border-[#ffc247]/20" />

                  <div className="absolute inset-[24px] rounded-full border border-blue-300/[0.10]" />

                  <div className="absolute inset-[53px] animate-[spin_25s_linear_infinite_reverse] rounded-full border border-dashed border-[#ffc247]/32" />

                  <div className="absolute inset-[86px] rounded-full border border-[#ffc247]/15" />

                  <div className="absolute left-1/2 top-[4px] h-[372px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#ffc247]/11 to-transparent" />

                  <div className="absolute left-[4px] top-1/2 h-px w-[372px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#ffc247]/11 to-transparent" />

                  <span className="absolute left-[38px] top-[78px] h-2 w-2 rounded-full bg-[#ffc247] shadow-[0_0_14px_rgba(255,194,71,0.95)]" />

                  <span className="absolute bottom-[63px] right-[27px] h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.85)]" />
                </div>


                {/* -------------------------------------------
                    PROPERTY DIGITAL TWIN
                    ------------------------------------------- */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 270"
                  className="absolute left-1/2 top-1/2 h-[335px] w-[370px] -translate-x-1/2 -translate-y-1/2 text-[#ffd15a] drop-shadow-[0_0_18px_rgba(255,184,0,0.50)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M64 114 150 70l86 44-86 45-86-45Z" />

                  <path d="M64 114v79l86 44v-78" />

                  <path d="M236 114v79l-86 44" />

                  <path
                    d="M64 131 150 175l86-44"
                    opacity="0.72"
                  />

                  <path
                    d="M64 149 150 193l86-44"
                    opacity="0.56"
                  />

                  <path
                    d="M64 167 150 211l86-44"
                    opacity="0.42"
                  />

                  <path
                    d="M80 122v79M97 131v79M114 140v79M132 149v79"
                    opacity="0.42"
                  />

                  <path
                    d="M168 149v79M186 140v79M203 131v79M220 122v79"
                    opacity="0.42"
                  />

                  <path d="M111 90 150 70l39 20-39 20-39-20Z" />

                  <path d="M111 90v38l39 20v-38" />

                  <path d="M189 90v38l-39 20" />

                  <path d="M132 59 150 50l18 9-18 10-18-10Z" />

                  <path d="M132 59v25l18 10V69" />

                  <path d="M168 59v25l-18 10" />

                  <ellipse
                    cx="150"
                    cy="243"
                    rx="102"
                    ry="20"
                    opacity="0.20"
                  />

                  <ellipse
                    cx="150"
                    cy="243"
                    rx="71"
                    ry="11"
                    opacity="0.48"
                  />
                </svg>


                {/* -------------------------------------------
                    SCAN PLANE
                    ------------------------------------------- */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-[57%] h-[2px] w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ffc247]/75 to-transparent shadow-[0_0_20px_rgba(255,194,71,0.50)]"
                />

                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-[58%] h-[95px] w-[72%] -translate-x-1/2 rounded-[50%] border border-[#ffc247]/10"
                />


                {/* -------------------------------------------
                    FLOATING DATA POINTS
                    ------------------------------------------- */}
                <div className="absolute left-[4%] top-[92px] hidden min-w-[118px] rounded-xl border border-blue-100/[0.09] bg-[#08192f]/78 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl md:block">
                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-blue-200/35">
                    {t(
                      "fields.livingArea"
                    )}
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {
                      valuation.livingArea
                    }
                    <span className="ml-1 text-[10px] text-slate-400">
                      m²
                    </span>
                  </p>
                </div>

                <div className="absolute right-[4%] top-[106px] hidden min-w-[105px] rounded-xl border border-blue-100/[0.09] bg-[#08192f]/78 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl md:block">
                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-blue-200/35">
                    {t(
                      "fields.rooms"
                    )}
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {valuation.rooms ??
                      "–"}
                  </p>
                </div>

                <div className="absolute bottom-[53px] left-[7%] hidden min-w-[150px] rounded-xl border border-blue-100/[0.09] bg-[#08192f]/78 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl md:block">
                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-blue-200/35">
                    {t(
                      "fields.condition"
                    )}
                  </p>

                  <p className="mt-1 text-xs font-black text-white">
                    {conditionLabel(
                      valuation.condition
                    )}
                  </p>
                </div>

                <div className="absolute bottom-[53px] right-[7%] hidden min-w-[140px] rounded-xl border border-blue-100/[0.09] bg-[#08192f]/78 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl md:block">
                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-blue-200/35">
                    {t(
                      "fields.standard"
                    )}
                  </p>

                  <p className="mt-1 text-xs font-black text-white">
                    {standardLabel(
                      valuation.standard
                    )}
                  </p>
                </div>
              </div>


              {/* =============================================
                  PROPERTY IDENTITY STRIP
                  ============================================= */}
              <div className="relative z-20 flex flex-wrap items-center gap-2 border-t border-blue-100/[0.07] pt-5">
                <span className="rounded-full border border-[#ffc247]/35 bg-[#ffc247]/[0.065] px-4 py-2 text-[11px] font-extrabold text-[#ffd978]">
                  {propertyTypeLabel(
                    valuation.propertyType
                  )}
                </span>

                <span className="rounded-full border border-blue-100/[0.07] bg-blue-200/[0.025] px-4 py-2 text-[11px] font-bold text-slate-300">
                  {
                    valuation.livingArea
                  } m²
                </span>

                {valuation.rooms !==
                  null && (
                  <span className="rounded-full border border-blue-100/[0.07] bg-blue-200/[0.025] px-4 py-2 text-[11px] font-bold text-slate-300">
                    {
                      valuation.rooms
                    }{" "}
                    {t(
                      "fields.rooms"
                    )}
                  </span>
                )}

                <span className="rounded-full border border-blue-100/[0.07] bg-blue-200/[0.025] px-4 py-2 text-[11px] font-bold text-slate-300">
                  {t(
                    "fields.buildingYear"
                  )}{" "}
                  {
                    valuation.buildingYear
                  }
                </span>
              </div>
            </section>


            {/* ===============================================
                MARKET INTELLIGENCE STATION
                =============================================== */}
            <aside className="relative overflow-hidden border-t border-[#ffc247]/20 bg-[#030b18]/88 p-7 backdrop-blur-2xl xl:border-l xl:border-t-0 xl:p-8">
              <div
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc247]/75 to-transparent"
              />

              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#ffc247]/[0.045] blur-3xl"
              />

              <p
                className={
                  completed
                    ? "relative z-10 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-emerald-300"
                    : "relative z-10 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-[#ffc247]"
                }
              >
                <span
                  className={
                    completed
                      ? "h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]"
                      : "h-2 w-2 rounded-full bg-[#ffc247] shadow-[0_0_12px_rgba(255,194,71,0.90)]"
                  }
                />

                {completed
                  ? t(
                      "market.eyebrow"
                    )
                  : t(
                      "pending.eyebrow"
                    )}
              </p>


              {completed ? (
                <>
                  <p className="relative z-10 mt-5 text-[36px] font-black tracking-[-0.04em] text-white">
                    CHF{" "}
                    {formatCHF(
                      valuation.salePrice,
                      locale
                    )}
                  </p>

                  {valuation.salePriceLower !==
                    null &&
                    valuation.salePriceUpper !==
                      null && (
                      <div className="relative z-10 mt-5 border-l border-[#ffc247]/35 pl-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.17em] text-slate-500">
                          {t(
                            "market.range"
                          )}
                        </p>

                        <p className="mt-2 text-sm font-extrabold text-slate-200">
                          CHF{" "}
                          {formatCHF(
                            valuation.salePriceLower,
                            locale
                          )}{" "}
                          – CHF{" "}
                          {formatCHF(
                            valuation.salePriceUpper,
                            locale
                          )}
                        </p>
                      </div>
                    )}
                </>
              ) : (
                <>
                  <h2 className="relative z-10 mt-5 text-[29px] font-black leading-tight tracking-[-0.03em] text-white">
                    {t(
                      "pending.title"
                    )}
                  </h2>

                  <p className="relative z-10 mt-4 text-sm leading-6 text-slate-400">
                    {t(
                      "pending.detailText"
                    )}
                  </p>
                </>
              )}


              {/* =============================================
                  INSERT-AI CORE
                  ============================================= */}
              <div
                aria-hidden="true"
                className="relative mx-auto my-8 h-[220px] w-[220px]"
              >
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,194,71,0.07),transparent_64%)]" />

                <div className="absolute inset-[3px] animate-[spin_33s_linear_infinite] rounded-full border border-dashed border-[#ffc247]/20" />

                <div className="absolute inset-[26px] rounded-full border border-blue-300/10" />

                <div className="absolute inset-[50px] animate-[spin_21s_linear_infinite_reverse] rounded-full border border-dashed border-[#ffc247]/30" />

                <div className="absolute inset-[74px] flex items-center justify-center rounded-full border border-[#ffc247]/26 bg-[#08172a] shadow-[0_0_32px_rgba(255,194,71,0.08)]">
                  <div className="text-center">
                    <span className="block text-[8px] font-black tracking-[0.24em] text-blue-200/30">
                      INSERAT
                    </span>

                    <span className="mt-1 block text-[14px] font-black tracking-[0.18em] text-[#ffc247]">
                      AI
                    </span>
                  </div>
                </div>

                <div className="absolute left-1/2 top-[10px] h-[200px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#ffc247]/10 to-transparent" />

                <div className="absolute left-[10px] top-1/2 h-px w-[200px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#ffc247]/10 to-transparent" />

                <span className="absolute right-[23px] top-[53px] h-2 w-2 rounded-full bg-[#ffc247] shadow-[0_0_12px_rgba(255,194,71,0.9)]" />
              </div>


              {!completed && (
                <div className="relative z-10 border-l-2 border-[#ffc247]/30 bg-[#ffc247]/[0.035] px-4 py-3">
                  <p className="text-[10px] font-semibold leading-5 text-amber-100/80">
                    {t(
                      "pending.notice"
                    )}
                  </p>
                </div>
              )}


              {completed && (
                <div className="relative z-10 grid grid-cols-2 gap-3">
                  <div className="border-t border-blue-100/[0.07] pt-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {t(
                        "market.pricePerSqm"
                      )}
                    </p>

                    <p className="mt-2 text-sm font-black text-white">
                      {valuation.pricePerSqm !==
                      null
                        ? "CHF " +
                          formatCHF(
                            valuation.pricePerSqm,
                            locale
                          )
                        : "–"}
                    </p>
                  </div>

                  <div className="border-t border-blue-100/[0.07] pt-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {t(
                        "market.confidence"
                      )}
                    </p>

                    <p className="mt-2 text-sm font-black text-white">
                      {confidenceLabel(
                        valuation.confidence
                      )}
                    </p>
                  </div>
                </div>
              )}


              <div className="relative z-10 mt-7 border-t border-blue-100/[0.07] pt-6">
                <button
                  type="button"
                  onClick={
                    handleRevalue
                  }
                  disabled={
                    revaluating
                  }
                  className="relative inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ffae00] via-[#ffd866] to-[#ffae00] px-5 py-4 text-sm font-black text-[#06101f] shadow-[0_14px_35px_rgba(255,174,0,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(255,174,0,0.28)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {revaluating
                    ? t(
                        "actions.revaluing"
                      )
                    : t(
                        "actions.revalue"
                      )}

                  {!revaluating && (
                    <span className="absolute right-5">
                      →
                    </span>
                  )}
                </button>

                {revalueMessage && (
                  <div
                    className={
                      revalueMessageType ===
                      "success"
                        ? "mt-4 border-l-2 border-emerald-400 bg-emerald-400/[0.06] p-4 text-xs font-semibold leading-5 text-emerald-100"
                        : "mt-4 border-l-2 border-[#ffc247] bg-[#ffc247]/[0.06] p-4 text-xs font-semibold leading-5 text-amber-100"
                    }
                  >
                    {
                      revalueMessage
                    }
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>


        {/* ===================================================
            PROPERTY FINGERPRINT
            =================================================== */}
        <section className="mt-6 overflow-hidden rounded-[28px] border border-blue-100/[0.075] bg-[#061326]/82 shadow-[0_25px_75px_rgba(0,0,0,0.26)] backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-blue-100/[0.06] px-7 py-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#ffc247]">
                PROPERTY FINGERPRINT
              </p>

              <h2 className="mt-2 text-xl font-black tracking-[-0.02em] text-white">
                {t(
                  "detail.featuresTitle"
                )}
              </h2>
            </div>

            <div
              aria-hidden="true"
              className="hidden items-center gap-2 sm:flex"
            >
              <span className="h-1 w-11 rounded-full bg-[#ffc247]/70" />
              <span className="h-1 w-6 rounded-full bg-[#ffc247]/25" />
              <span className="h-1 w-3 rounded-full bg-blue-400/30" />
            </div>
          </div>


          <div className="grid sm:grid-cols-2 xl:grid-cols-3">
            {details.map(
              (
                [label, value],
                index
              ) => (
                <div
                  key={
                    String(label)
                  }
                  className="group relative flex min-h-[92px] items-center border-b border-blue-100/[0.055] px-6 py-4 transition hover:bg-blue-200/[0.025] sm:odd:border-r xl:border-r xl:[&:nth-child(3n)]:border-r-0"
                >
                  <div
                    aria-hidden="true"
                    className="absolute bottom-4 left-0 top-4 w-px bg-gradient-to-b from-transparent via-[#ffc247]/0 to-transparent transition group-hover:via-[#ffc247]/55"
                  />

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100/[0.08] bg-blue-200/[0.025] text-slate-300 transition group-hover:border-[#ffc247]/28 group-hover:bg-[#ffc247]/[0.035] group-hover:text-[#ffd978]">
                    <ValuationFeatureIcon
                      index={
                        index
                      }
                    />
                  </div>

                  <div className="ml-4 min-w-0 flex-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.17em] text-blue-200/30">
                      {String(
                        label
                      )}
                    </p>

                    <p className="mt-1.5 text-sm font-extrabold leading-5 text-slate-100">
                      {String(
                        value
                      )}
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="ml-4 text-[8px] font-black tracking-[0.16em] text-blue-200/15 transition group-hover:text-[#ffc247]/40"
                  >
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </span>
                </div>
              )
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
