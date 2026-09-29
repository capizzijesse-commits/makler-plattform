"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

import PublicationOrchestratorPanel from "./PublicationOrchestratorPanel";


type ListingSnapshot = {
  location?: string | null;
  propertyType?: string | null;
  livingArea?: number | null;
  rooms?: number | null;
  price?: number | null;
  highlights?: unknown;
  generatedVariants?: unknown;
  generatedText?: string | null;
  images?: unknown[];
};


type Readiness = {
  core: boolean;
  images: boolean;
  text: boolean;
};


function hasHighlights(
  value: unknown
) {
  if (Array.isArray(value)) {
    return value.some(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    );
  }

  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}


function hasGeneratedText(
  listing: ListingSnapshot
) {
  if (
    typeof listing.generatedText === "string" &&
    listing.generatedText.trim()
  ) {
    return true;
  }

  const variants =
    listing.generatedVariants;

  if (
    typeof variants === "string"
  ) {
    return variants.trim().length > 0;
  }

  if (Array.isArray(variants)) {
    return variants.some((variant) => {
      if (
        typeof variant === "string"
      ) {
        return variant.trim().length > 0;
      }

      if (
        variant &&
        typeof variant === "object" &&
        "text" in variant
      ) {
        const text =
          (variant as {
            text?: unknown;
          }).text;

        return (
          typeof text === "string" &&
          text.trim().length > 0
        );
      }

      return false;
    });
  }

  return false;
}


export default function DirectPublicationDock({
  listingId,
}: {
  listingId: string;
}) {
  const pathname =
    usePathname();

  const [
    market,
    setMarket,
  ] =
    useState<InseratAiMarket>(
      "CH"
    );

  const [
    listing,
    setListing,
  ] =
    useState<ListingSnapshot | null>(
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
    open,
    setOpen,
  ] =
    useState(false);

  const [
    cameFromDashboardSave,
    setCameFromDashboardSave,
  ] =
    useState(false);


  useLayoutEffect(() => {
    const saveStartedAt =
      window.sessionStorage.getItem(
        "inserat-ai:dashboard-save-start"
      );

    if (saveStartedAt) {
      setCameFromDashboardSave(
        true
      );
    }
  }, []);


  useEffect(() => {
    const hostnameMarket =
      getInseratAiMarketFromHostname(
        window.location.hostname
      );

    if (hostnameMarket) {
      setMarket(
        hostnameMarket
      );
      return;
    }

    const storedMarket =
      window.localStorage.getItem(
        "inseratAiMarket"
      );

    if (
      storedMarket === "CH" ||
      storedMarket === "DE"
    ) {
      setMarket(
        storedMarket
      );
    }
  }, []);


  useEffect(() => {
    const controller =
      new AbortController();

    async function loadListing() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/listings/${encodeURIComponent(
              listingId
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
          (await response
            .json()
            .catch(() => null)) as
            | {
                success?: boolean;
                listing?: ListingSnapshot;
                error?: string;
              }
            | null;

        if (
          !response.ok ||
          !data?.success ||
          !data.listing
        ) {
          throw new Error(
            data?.error ||
              "Objekt konnte nicht geprüft werden."
          );
        }

        if (!controller.signal.aborted) {
          setListing(
            data.listing
          );
        }
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Objekt konnte nicht geprüft werden."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      controller.abort();
    };
  }, [listingId]);


  const readiness =
    useMemo<Readiness>(() => {
      if (!listing) {
        return {
          core:
            false,
          images:
            false,
          text:
            false,
        };
      }

      const core =
        Boolean(
          listing.location?.trim()
        ) &&
        Boolean(
          listing.propertyType?.trim()
        ) &&
        typeof listing.livingArea ===
          "number" &&
        listing.livingArea >
          0 &&
        typeof listing.rooms ===
          "number" &&
        listing.rooms >
          0 &&
        typeof listing.price ===
          "number" &&
        listing.price >
          0 &&
        hasHighlights(
          listing.highlights
        );

      return {
        core,
        images:
          Array.isArray(
            listing.images
          ) &&
          listing.images.length >
            0,
        text:
          hasGeneratedText(
            listing
          ),
      };
    }, [listing]);


  const readyCount =
    Number(readiness.core) +
    Number(readiness.images) +
    Number(readiness.text);

  const directReady =
    readyCount === 3;


  useEffect(() => {
    if (
      cameFromDashboardSave &&
      directReady
    ) {
      setOpen(true);
    }
  }, [
    cameFromDashboardSave,
    directReady,
  ]);


  const expectedPath =
    `/cockpit/${listingId}`;

  if (
    pathname !== expectedPath
  ) {
    return null;
  }


  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className={
          "fixed bottom-5 right-5 z-[70] inline-flex min-h-12 items-center justify-center rounded-full border px-5 py-3 text-xs font-black shadow-2xl transition hover:brightness-105 " +
          (directReady
            ? "border-emerald-200/30 bg-emerald-300 text-emerald-950"
            : "border-amber-200/25 bg-amber-300 text-amber-950")
        }
      >
        {loading
          ? "Veröffentlichung prüfen …"
          : directReady
            ? "Direkt veröffentlichen →"
            : `Objekt vervollständigen ${readyCount}/3`}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-sm sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Direkte Veröffentlichung"
        >
          <div className="mx-auto w-full max-w-5xl rounded-[28px] border border-emerald-300/20 bg-[#071126] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Inserat-AI Automation
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Direkt zur Veröffentlichung
                </h2>

                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
                  Objektdaten, Bilder und Inserattext sind die entscheidenden Voraussetzungen.
                  Bewertung, Auftrag und CRM-Schritte sind für diesen Automationsweg keine Pflicht.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-lg font-black text-slate-300 transition hover:bg-white/[0.08]"
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] px-4 py-3 text-xs font-bold text-rose-100">
                {error}
              </div>
            ) : null}

            {!loading &&
            !directReady ? (
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 sm:p-5">
                <p className="text-sm font-black text-amber-100">
                  Für die direkte Veröffentlichung fehlt noch etwas.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      label:
                        "Objektdaten",
                      ready:
                        readiness.core,
                    },
                    {
                      label:
                        "Bilder",
                      ready:
                        readiness.images,
                    },
                    {
                      label:
                        "Inserattext",
                      ready:
                        readiness.text,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3 text-xs font-black"
                    >
                      <span className="text-slate-300">
                        {item.label}
                      </span>

                      <span
                        className={
                          item.ready
                            ? "text-emerald-300"
                            : "text-amber-200"
                        }
                      >
                        {item.ready
                          ? "OK"
                          : "Offen"}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/cockpit/${encodeURIComponent(
                    listingId
                  )}/edit`}
                  onClick={() =>
                    setOpen(false)
                  }
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-amber-950 no-underline transition hover:brightness-105"
                >
                  Objektpaket fertigstellen
                </Link>
              </div>
            ) : null}

            {directReady ? (
              <div className="mt-5">
                <PublicationOrchestratorPanel
                  listingId={listingId}
                  market={market}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
