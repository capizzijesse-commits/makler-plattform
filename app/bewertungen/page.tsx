"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
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
  rooms: number | null;
  buildingYear: number;
  renovationYear: number | null;
  salePrice: number | null;
  salePriceLower: number | null;
  salePriceUpper: number | null;
  pricePerSqm: number | null;
  confidence: string | null;
  updatedAt: string;
};

type ValuationsResponse = {
  success?: boolean;
  error?: string;
  valuations?: Valuation[];
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

function formatDate(
  value: string,
  locale: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "–";
  }

  return new Intl.DateTimeFormat(
    localeCode(locale),
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

export default function BewertungenPage() {
  const t =
    useTranslations(
      "Valuations"
    );

  const locale =
    useLocale();

  const [
    valuations,
    setValuations,
  ] =
    useState<Valuation[]>([]);

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
    const controller =
      new AbortController();

    async function loadValuations() {
      try {
        setLoading(true);
        setError("");
        setNeedsLogin(false);

        const response =
          await fetch(
            "/api/valuations",
            {
              method: "GET",
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
            | ValuationsResponse
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
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              t(
                "overview.loadErrorTitle"
              )
          );
        }

        setValuations(
          Array.isArray(
            data.valuations
          )
            ? data.valuations
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

        console.error(
          "[bewertungen]",
          loadError
        );

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : t(
                "overview.loadErrorTitle"
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

    void loadValuations();

    return () => {
      controller.abort();
    };
  }, [t]);

  const completedCount =
    useMemo(
      () =>
        valuations.filter(
          (valuation) =>
            valuation.status ===
              "completed" &&
            valuation.salePrice !==
              null
        ).length,
      [valuations]
    );

  const draftCount =
    valuations.length -
    completedCount;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030916] text-white">
      {/* =====================================================
          INSERAT-AI PORTFOLIO ENVIRONMENT
          ===================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(28,86,171,0.18),transparent_30%),radial-gradient(circle_at_87%_18%,rgba(255,184,0,0.09),transparent_27%),linear-gradient(135deg,#020815_0%,#061427_54%,#030a17_100%)]" />

        <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(110,164,225,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(110,164,225,0.03)_1px,transparent_1px)] [background-size:56px_56px]" />

        <div className="absolute left-1/2 top-[132px] h-px w-[82%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ffc247]/35 to-transparent" />

        <div className="absolute left-[3%] top-[260px] h-[500px] w-px bg-gradient-to-b from-transparent via-[#ffc247]/12 to-transparent" />

        <div className="absolute right-[4%] top-[310px] h-[360px] w-[360px] rounded-full bg-[#ffc247]/[0.025] blur-[80px]" />
      </div>


      <section className="relative z-10 mx-auto max-w-[1420px] px-5 pb-24 pt-24 sm:px-8">
        {/* ===================================================
            PORTFOLIO HERO
            =================================================== */}
        <header className="relative pb-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_500px] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[#ffc247] shadow-[0_0_13px_rgba(255,194,71,0.90)]" />

                <p className="text-[10px] font-black uppercase tracking-[0.30em] text-[#ffc247]">
                  {t(
                    "overview.eyebrow"
                  )}
                </p>
              </div>

              <h1 className="mt-4 text-[42px] font-black leading-[0.96] tracking-[-0.045em] text-white sm:text-[54px]">
                {t(
                  "overview.title"
                )}
              </h1>

              <p className="mt-5 max-w-[680px] text-sm leading-6 text-slate-400 sm:text-[15px]">
                {t(
                  "overview.description"
                )}
              </p>
            </div>


            {/* ===============================================
                PORTFOLIO STATUS RAIL
                Kein Karten-Dashboard
                =============================================== */}
            {!loading &&
              !needsLogin &&
              !error && (
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute left-0 right-0 top-[36px] h-px bg-gradient-to-r from-[#ffc247]/65 via-[#ffc247]/22 to-blue-400/15"
                />

                <div className="relative grid grid-cols-3">
                  {[
                    [
                      t(
                        "overview.total"
                      ),
                      valuations.length,
                    ],

                    [
                      t(
                        "overview.completed"
                      ),
                      valuations.filter(
                        (
                          item
                        ) =>
                          item.status ===
                            "completed" &&
                          item.salePrice !==
                            null
                      ).length,
                    ],

                    [
                      t(
                        "overview.open"
                      ),
                      valuations.filter(
                        (
                          item
                        ) =>
                          !(
                            item.status ===
                              "completed" &&
                            item.salePrice !==
                              null
                          )
                      ).length,
                    ],
                  ].map(
                    (
                      [
                        label,
                        value,
                      ],
                      index
                    ) => (
                      <div
                        key={
                          String(
                            label
                          )
                        }
                        className="relative px-4 text-center"
                      >
                        <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#ffc247]/22 bg-[#071529] shadow-[0_0_24px_rgba(255,194,71,0.05)]">
                          <span className="text-[26px] font-black tracking-[-0.04em] text-white">
                            {String(
                              value
                            )}
                          </span>
                        </div>

                        <p className="mt-3 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                          {String(
                            label
                          )}
                        </p>

                        <span
                          aria-hidden="true"
                          className={
                            index === 0
                              ? "absolute left-1/2 top-[34px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#ffc247] shadow-[0_0_10px_rgba(255,194,71,0.9)]"
                              : "absolute left-1/2 top-[34px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#0a1930] ring-1 ring-[#ffc247]/35"
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>


          <div className="mt-9 flex items-center justify-between gap-5">
            <div className="h-px flex-1 bg-gradient-to-r from-[#ffc247]/45 via-blue-300/[0.07] to-transparent" />

            <Link
              href="/bewertung"
              className="group inline-flex shrink-0 items-center gap-3 rounded-full border border-[#ffc247]/40 bg-[#ffc247]/[0.07] px-5 py-3 text-sm font-extrabold text-[#ffd978] transition duration-300 hover:border-[#ffc247]/75 hover:bg-[#ffc247]/[0.12] hover:shadow-[0_0_28px_rgba(255,194,71,0.13)]"
            >
              <span className="text-lg leading-none">
                +
              </span>

              {t(
                "actions.new"
              )}

              <span className="transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </header>


        {/* ===================================================
            LOADING
            =================================================== */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(
              (
                item
              ) => (
                <div
                  key={
                    item
                  }
                  className="h-[150px] animate-pulse border-y border-blue-100/[0.06] bg-blue-200/[0.025]"
                />
              )
            )}
          </div>
        )}


        {/* ===================================================
            LOGIN
            =================================================== */}
        {!loading &&
          needsLogin && (
          <div className="relative mt-3 overflow-hidden border-y border-[#ffc247]/18 bg-[#061326]/75 px-7 py-10">
            <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-gradient-to-b from-[#ffc247] via-[#ffc247]/40 to-transparent" />

            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffc247]">
              {t(
                "auth.eyebrow"
              )}
            </p>

            <h2 className="mt-3 text-2xl font-black">
              {t(
                "auth.title"
              )}
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              {t(
                "auth.overviewText"
              )}
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex bg-gradient-to-r from-[#ffae00] via-[#ffd766] to-[#ffae00] px-6 py-3 text-sm font-black text-[#06101f]"
            >
              {t(
                "actions.login"
              )}
            </Link>
          </div>
        )}


        {/* ===================================================
            ERROR
            =================================================== */}
        {!loading &&
          error && (
          <div className="mt-4 border-l-2 border-red-400 bg-red-400/[0.06] p-6">
            <p className="font-black text-red-100">
              {t(
                "overview.loadErrorTitle"
              )}
            </p>

            <p className="mt-2 text-sm text-red-200/75">
              {error}
            </p>
          </div>
        )}


        {/* ===================================================
            EMPTY
            =================================================== */}
        {!loading &&
          !needsLogin &&
          !error &&
          valuations.length ===
            0 && (
          <div className="relative mt-4 overflow-hidden border-y border-blue-100/[0.07] bg-[#061326]/65 px-8 py-16 text-center">
            <div
              aria-hidden="true"
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#ffc247]/25 text-[#ffc247]"
            >
              <span className="text-3xl">
                +
              </span>
            </div>

            <h2 className="mt-6 text-2xl font-black">
              {t(
                "overview.emptyTitle"
              )}
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
              {t(
                "overview.emptyText"
              )}
            </p>

            <Link
              href="/bewertung"
              className="mt-7 inline-flex bg-gradient-to-r from-[#ffae00] via-[#ffd766] to-[#ffae00] px-6 py-3 text-sm font-black text-[#06101f]"
            >
              {t(
                "overview.firstValuation"
              )}
            </Link>
          </div>
        )}


        {/* ===================================================
            VALUATION PORTFOLIO LEDGER

            Ganz bewusst KEINE Scanner-Karten.
            Jede Immobilie ist eine horizontale Registerzeile.
            =================================================== */}
        {!loading &&
          !needsLogin &&
          !error &&
          valuations.length >
            0 && (
          <div className="relative mt-4">
            {/* vertikale Portfolio-Linie */}
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-[34px] top-0 hidden w-px bg-gradient-to-b from-[#ffc247]/60 via-[#ffc247]/18 to-transparent sm:block"
            />


            <div className="space-y-[2px]">
              {valuations.map(
                (
                  valuation,
                  index
                ) => {
                  const completed =
                    valuation.status ===
                      "completed" &&
                    valuation.salePrice !==
                      null;

                  return (
                    <article
                      key={
                        valuation.id
                      }
                      className="group relative overflow-hidden bg-[#061326]/78 transition duration-300 hover:bg-[#08192f]/92"
                      style={{
                        clipPath:
                          "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))",
                      }}
                    >
                      {/* hover rail */}
                      <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[#ffc247]/0 transition duration-300 group-hover:bg-[#ffc247]/75 group-hover:shadow-[0_0_12px_rgba(255,194,71,0.45)]" />

                      <div className="grid min-h-[154px] items-stretch sm:grid-cols-[70px_minmax(0,1fr)] xl:grid-cols-[70px_190px_minmax(0,1fr)_310px_90px]">
                        {/* ===================================
                            INDEX
                            =================================== */}
                        <div className="relative hidden items-center justify-center sm:flex">
                          <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#ffc247]/30 bg-[#061326] text-[9px] font-black tracking-[0.15em] text-[#ffd978]">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </div>
                        </div>


                        {/* ===================================
                            DATE / STATUS
                            =================================== */}
                        <div className="hidden border-l border-blue-100/[0.055] px-5 py-6 xl:block">
                          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-blue-200/25">
                            {formatDate(
                              valuation.updatedAt,
                              locale
                            )}
                          </p>

                          <div className="mt-5 flex items-center gap-2">
                            <span
                              className={
                                completed
                                  ? "h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.8)]"
                                  : "h-2 w-2 rounded-full bg-[#ffc247] shadow-[0_0_9px_rgba(255,194,71,0.85)]"
                              }
                            />

                            <span
                              className={
                                completed
                                  ? "text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300"
                                  : "text-[9px] font-black uppercase tracking-[0.14em] text-[#ffd978]"
                              }
                            >
                              {completed
                                ? t(
                                    "status.completed"
                                  )
                                : t(
                                    "status.draft"
                                  )}
                            </span>
                          </div>
                        </div>


                        {/* ===================================
                            PROPERTY
                            =================================== */}
                        <div className="relative border-l border-blue-100/[0.055] px-6 py-6 sm:px-7">
                          <div className="flex flex-wrap items-center gap-2 xl:hidden">
                            <span
                              className={
                                completed
                                  ? "inline-flex rounded-full border border-emerald-400/18 bg-emerald-400/[0.055] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-emerald-300"
                                  : "inline-flex rounded-full border border-[#ffc247]/22 bg-[#ffc247]/[0.055] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#ffd978]"
                              }
                            >
                              {completed
                                ? t(
                                    "status.completed"
                                  )
                                : t(
                                    "status.draft"
                                  )}
                            </span>

                            <span className="text-[9px] text-slate-500">
                              {formatDate(
                                valuation.updatedAt,
                                locale
                              )}
                            </span>
                          </div>

                          <h2 className="mt-2 text-[22px] font-black leading-tight tracking-[-0.025em] text-white xl:mt-0">
                            {
                              valuation.addressLabel
                            }
                          </h2>

                          <p className="mt-1.5 text-xs font-bold text-slate-400">
                            {propertyTypeLabel(
                              valuation.propertyType
                            )}
                          </p>

                          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-200/25">
                                {t(
                                  "fields.livingArea"
                                )}
                              </span>

                              <span className="ml-2 text-xs font-black text-slate-200">
                                {
                                  valuation.livingArea
                                } m²
                              </span>
                            </div>

                            <span className="h-3 w-px bg-blue-100/[0.08]" />

                            <div>
                              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-200/25">
                                {t(
                                  "fields.rooms"
                                )}
                              </span>

                              <span className="ml-2 text-xs font-black text-slate-200">
                                {valuation.rooms ??
                                  "–"}
                              </span>
                            </div>

                            <span className="h-3 w-px bg-blue-100/[0.08]" />

                            <div>
                              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-200/25">
                                {t(
                                  "fields.buildingYear"
                                )}
                              </span>

                              <span className="ml-2 text-xs font-black text-slate-200">
                                {
                                  valuation.buildingYear
                                }
                              </span>
                            </div>
                          </div>
                        </div>


                        {/* ===================================
                            MARKET RESULT
                            =================================== */}
                        <div className="border-t border-blue-100/[0.055] px-6 py-5 sm:col-start-2 xl:col-start-auto xl:border-l xl:border-t-0">
                          {completed ? (
                            <>
                              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300/65">
                                {t(
                                  "market.eyebrow"
                                )}
                              </p>

                              <p className="mt-2 text-[22px] font-black tracking-[-0.035em] text-white">
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
                                <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">
                                  CHF{" "}
                                  {formatCHF(
                                    valuation.salePriceLower,
                                    locale
                                  )}{" "}
                                  –{" "}
                                  {formatCHF(
                                    valuation.salePriceUpper,
                                    locale
                                  )}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#ffc247]/65">
                                {t(
                                  "pending.eyebrow"
                                )}
                              </p>

                              <p className="mt-2 text-sm font-black text-white">
                                {t(
                                  "pending.title"
                                )}
                              </p>

                              <div className="mt-4 flex items-center gap-2">
                                <span className="h-px w-12 bg-gradient-to-r from-[#ffc247]/55 to-transparent" />

                                <span className="h-1.5 w-1.5 rounded-full bg-[#ffc247]/60" />
                              </div>
                            </>
                          )}
                        </div>


                        {/* ===================================
                            OPEN
                            =================================== */}
                        <div className="flex items-center justify-end border-t border-blue-100/[0.055] px-6 py-5 sm:col-start-2 xl:col-start-auto xl:justify-center xl:border-l xl:border-t-0 xl:px-4">
                          <Link
                            href={
                              "/bewertungen/" +
                              valuation.id
                            }
                            aria-label={
                              t(
                                "actions.open"
                              )
                            }
                            className="group/open flex h-12 w-12 items-center justify-center rounded-full border border-[#ffc247]/28 bg-[#ffc247]/[0.055] text-[#ffd978] transition duration-300 hover:border-[#ffc247]/70 hover:bg-[#ffc247]/[0.12] hover:shadow-[0_0_24px_rgba(255,194,71,0.16)]"
                          >
                            <span className="text-lg transition duration-300 group-hover/open:translate-x-1">
                              →
                            </span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
