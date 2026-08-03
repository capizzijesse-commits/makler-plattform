"use client";

import Link from "next/link";
import {useParams, useRouter} from "next/navigation";
import {type FormEvent, useEffect, useMemo, useState} from "react";
import {useLocale} from "next-intl";

type LocaleKey = "de" | "it" | "fr" | "en";
type MarketingType = "sale" | "rent";

type ListingSummary = {
  id: string;
  location: string;
  propertyType: string;
  price: number | null;
};

type FinanceRecord = {
  marketingType: MarketingType;
  askingPrice: number | null;
  minimumPrice: number | null;
  commissionRate: number | null;
  netRentMonthly: number | null;
  additionalCostsMonthly: number | null;
  heatingCostsMonthly: number | null;
  depositMonths: number | null;
  notes: string | null;
};

type ApiResponse = {
  success: boolean;
  listing?: ListingSummary;
  finance?: FinanceRecord | null;
  message?: string;
  error?: string;
};

type FinanceForm = {
  marketingType: MarketingType;
  askingPrice: string;
  minimumPrice: string;
  commissionRate: string;
  netRentMonthly: string;
  additionalCostsMonthly: string;
  heatingCostsMonthly: string;
  depositMonths: string;
  notes: string;
};

const EMPTY_FORM: FinanceForm = {
  marketingType: "sale",
  askingPrice: "",
  minimumPrice: "",
  commissionRate: "",
  netRentMonthly: "",
  additionalCostsMonthly: "",
  heatingCostsMonthly: "",
  depositMonths: "",
  notes: "",
};

const COPY = {
  de: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Finanzen & Preisstrategie",
    description:
      "Verwalten Sie Verkaufspreise, Mietkosten und Provisionsangaben zentral für dieses Objekt.",
    back: "Zurück zum Marketing Hub",
    loading: "Finanzdaten werden geladen …",
    object: "Objekt",
    sale: "Verkauf",
    rent: "Vermietung",
    askingPrice: "Angebotspreis in CHF",
    minimumPrice: "Interne Preisuntergrenze in CHF",
    commissionRate: "Provision in Prozent",
    netRent: "Nettomiete pro Monat in CHF",
    additionalCosts: "Nebenkosten pro Monat in CHF",
    heatingCosts: "Heizkosten pro Monat in CHF",
    depositMonths: "Kaution in Monatsmieten",
    notes: "Interne Notizen",
    notesPlaceholder:
      "Zum Beispiel Verhandlungsspielraum, Eigentümervorgaben oder besondere Konditionen.",
    internal:
      "Diese Angaben sind intern und werden nicht automatisch im Inserat veröffentlicht.",
    overview: "Finanzübersicht",
    asking: "Angebotspreis",
    minimum: "Preisuntergrenze",
    commission: "Geschätzte Provision",
    monthly: "Monatliche Gesamtkosten",
    deposit: "Geschätzte Kaution",
    unset: "Noch nicht festgelegt",
    save: "Finanzdaten speichern",
    saving: "Wird gespeichert …",
    saved: "Finanzdaten wurden gespeichert.",
    loadError: "Die Finanzdaten konnten nicht geladen werden.",
    saveError: "Die Finanzdaten konnten nicht gespeichert werden.",
    priceError:
      "Die Preisuntergrenze darf nicht höher als der Angebotspreis sein.",
  },
  it: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Finanze e strategia di prezzo",
    description:
      "Gestisci centralmente prezzi di vendita, costi di locazione e provvigioni per questo immobile.",
    back: "Torna al Marketing Hub",
    loading: "Caricamento dei dati finanziari …",
    object: "Immobile",
    sale: "Vendita",
    rent: "Locazione",
    askingPrice: "Prezzo richiesto in CHF",
    minimumPrice: "Prezzo minimo interno in CHF",
    commissionRate: "Provvigione in percentuale",
    netRent: "Affitto netto mensile in CHF",
    additionalCosts: "Spese accessorie mensili in CHF",
    heatingCosts: "Spese di riscaldamento mensili in CHF",
    depositMonths: "Deposito in mensilità",
    notes: "Note interne",
    notesPlaceholder:
      "Per esempio margine di trattativa, richieste del proprietario o condizioni particolari.",
    internal:
      "Questi dati sono interni e non vengono pubblicati automaticamente nell’annuncio.",
    overview: "Riepilogo finanziario",
    asking: "Prezzo richiesto",
    minimum: "Prezzo minimo",
    commission: "Provvigione stimata",
    monthly: "Costi mensili complessivi",
    deposit: "Deposito stimato",
    unset: "Non ancora definito",
    save: "Salva dati finanziari",
    saving: "Salvataggio …",
    saved: "I dati finanziari sono stati salvati.",
    loadError: "Impossibile caricare i dati finanziari.",
    saveError: "Impossibile salvare i dati finanziari.",
    priceError:
      "Il prezzo minimo non può superare il prezzo richiesto.",
  },
  fr: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Finances et stratégie de prix",
    description:
      "Gérez les prix de vente, les coûts de location et les commissions de ce bien au même endroit.",
    back: "Retour au Marketing Hub",
    loading: "Chargement des données financières …",
    object: "Bien",
    sale: "Vente",
    rent: "Location",
    askingPrice: "Prix demandé en CHF",
    minimumPrice: "Seuil interne en CHF",
    commissionRate: "Commission en pourcentage",
    netRent: "Loyer net mensuel en CHF",
    additionalCosts: "Charges mensuelles en CHF",
    heatingCosts: "Frais de chauffage mensuels en CHF",
    depositMonths: "Garantie en mois de loyer",
    notes: "Notes internes",
    notesPlaceholder:
      "Par exemple marge de négociation, exigences du propriétaire ou conditions particulières.",
    internal:
      "Ces données sont internes et ne sont pas publiées automatiquement dans l’annonce.",
    overview: "Aperçu financier",
    asking: "Prix demandé",
    minimum: "Seuil interne",
    commission: "Commission estimée",
    monthly: "Coûts mensuels totaux",
    deposit: "Garantie estimée",
    unset: "Pas encore défini",
    save: "Enregistrer les données",
    saving: "Enregistrement …",
    saved: "Les données financières ont été enregistrées.",
    loadError: "Impossible de charger les données financières.",
    saveError: "Impossible d’enregistrer les données financières.",
    priceError:
      "Le seuil interne ne peut pas être supérieur au prix demandé.",
  },
  en: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Finance & pricing strategy",
    description:
      "Manage sale prices, rental costs and commissions for this property in one place.",
    back: "Back to Marketing Hub",
    loading: "Loading financial data …",
    object: "Property",
    sale: "Sale",
    rent: "Rental",
    askingPrice: "Asking price in CHF",
    minimumPrice: "Internal minimum price in CHF",
    commissionRate: "Commission percentage",
    netRent: "Monthly net rent in CHF",
    additionalCosts: "Monthly additional costs in CHF",
    heatingCosts: "Monthly heating costs in CHF",
    depositMonths: "Deposit in monthly rents",
    notes: "Internal notes",
    notesPlaceholder:
      "For example negotiation range, owner requirements or special conditions.",
    internal:
      "These details are internal and are not published automatically in the listing.",
    overview: "Financial overview",
    asking: "Asking price",
    minimum: "Minimum price",
    commission: "Estimated commission",
    monthly: "Total monthly costs",
    deposit: "Estimated deposit",
    unset: "Not set yet",
    save: "Save financial data",
    saving: "Saving …",
    saved: "Financial data was saved.",
    loadError: "The financial data could not be loaded.",
    saveError: "The financial data could not be saved.",
    priceError:
      "The minimum price cannot be higher than the asking price.",
  },
} as const;

function parseNumber(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/['’\s]/g, "")
    .replace(",", ".");

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(
  value: number | null,
  locale: LocaleKey,
  fallback: string
) {
  if (value === null || !Number.isFinite(value)) {
    return fallback;
  }

  const localeMap: Record<LocaleKey, string> = {
    de: "de-CH",
    it: "it-CH",
    fr: "fr-CH",
    en: "en-CH",
  };

  return new Intl.NumberFormat(localeMap[locale], {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FinancePage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const rawId = params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;
  const localeKey = locale.toLowerCase().slice(0, 2) as LocaleKey;
  const text = COPY[localeKey] ?? COPY.de;

  const [listing, setListing] =
    useState<ListingSummary | null>(null);
  const [form, setForm] = useState<FinanceForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!listingId) {
      setError(text.loadError);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadFinance() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/listings/${encodeURIComponent(listingId!)}/finance`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.success || !data.listing) {
          throw new Error(data.error || text.loadError);
        }

        const finance = data.finance;

        setListing(data.listing);
        setForm({
          marketingType:
            finance?.marketingType === "rent" ? "rent" : "sale",
          askingPrice:
            finance?.askingPrice != null
              ? String(finance.askingPrice)
              : data.listing.price != null
                ? String(data.listing.price)
                : "",
          minimumPrice:
            finance?.minimumPrice != null
              ? String(finance.minimumPrice)
              : "",
          commissionRate:
            finance?.commissionRate != null
              ? String(finance.commissionRate)
              : "",
          netRentMonthly:
            finance?.netRentMonthly != null
              ? String(finance.netRentMonthly)
              : "",
          additionalCostsMonthly:
            finance?.additionalCostsMonthly != null
              ? String(finance.additionalCostsMonthly)
              : "",
          heatingCostsMonthly:
            finance?.heatingCostsMonthly != null
              ? String(finance.heatingCostsMonthly)
              : "",
          depositMonths:
            finance?.depositMonths != null
              ? String(finance.depositMonths)
              : "",
          notes: finance?.notes || "",
        });
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : text.loadError
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadFinance();
    return () => controller.abort();
  }, [listingId, router, text.loadError]);

  const askingPrice = parseNumber(form.askingPrice);
  const minimumPrice = parseNumber(form.minimumPrice);
  const commissionRate = parseNumber(form.commissionRate);
  const netRent = parseNumber(form.netRentMonthly);
  const additionalCosts = parseNumber(form.additionalCostsMonthly);
  const heatingCosts = parseNumber(form.heatingCostsMonthly);
  const depositMonths = parseNumber(form.depositMonths);

  const estimatedCommission = useMemo(() => {
    if (askingPrice === null || commissionRate === null) return null;
    return askingPrice * (commissionRate / 100);
  }, [askingPrice, commissionRate]);

  const totalMonthly = useMemo(() => {
    if (
      netRent === null &&
      additionalCosts === null &&
      heatingCosts === null
    ) {
      return null;
    }

    return (
      (netRent ?? 0) +
      (additionalCosts ?? 0) +
      (heatingCosts ?? 0)
    );
  }, [netRent, additionalCosts, heatingCosts]);

  const estimatedDeposit = useMemo(() => {
    if (netRent === null || depositMonths === null) return null;
    return netRent * depositMonths;
  }, [netRent, depositMonths]);

  function updateField(
    field: keyof FinanceForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!listingId || saving) return;

    if (
      form.marketingType === "sale" &&
      askingPrice !== null &&
      minimumPrice !== null &&
      minimumPrice > askingPrice
    ) {
      setError(text.priceError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/listings/${encodeURIComponent(listingId)}/finance`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || text.saveError);
      }

      setMessage(data.message || text.saved);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : text.saveError
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050a1d] px-4 text-white">
        <div className="rounded-3xl border border-amber-300/20 bg-white/[0.05] px-8 py-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-300/20 border-t-amber-300" />
          <p className="mt-5 font-black">{text.loading}</p>
        </div>
      </main>
    );
  }

  const inputClass =
    "min-h-13 rounded-xl border border-white/10 bg-slate-950/55 px-4 text-white outline-none focus:border-amber-300";

  return (
    <main className="min-h-screen bg-[#050a1d] px-4 pb-24 pt-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/marketing-hub"
          className="inline-flex items-center gap-2 font-black text-amber-300"
        >
          <span aria-hidden="true">←</span>
          {text.back}
        </Link>

        <section className="mt-7 rounded-[32px] border border-amber-300/25 bg-gradient-to-br from-slate-950 via-[#08142d] to-[#09224a] p-7 shadow-2xl shadow-black/30 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            {text.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
            {text.title}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-300">
            {text.description}
          </p>

          {listing ? (
            <div className="mt-7 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {text.object}
              </span>
              <strong>
                {listing.propertyType} – {listing.location}
              </strong>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/35 bg-red-950/35 p-5 font-bold text-red-100">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.08] p-5 font-bold text-emerald-100">
            {message}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 sm:p-8">
            <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/50 p-1.5">
              {(["sale", "rent"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      marketingType: type,
                    }))
                  }
                  className={`min-h-12 rounded-xl px-4 font-black transition ${
                    form.marketingType === type
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  {type === "sale" ? text.sale : text.rent}
                </button>
              ))}
            </div>

            {form.marketingType === "sale" ? (
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Field
                  label={text.askingPrice}
                  value={form.askingPrice}
                  onChange={(value) =>
                    updateField("askingPrice", value)
                  }
                  placeholder="1450000"
                  className={inputClass}
                />
                <Field
                  label={text.minimumPrice}
                  value={form.minimumPrice}
                  onChange={(value) =>
                    updateField("minimumPrice", value)
                  }
                  placeholder="1375000"
                  className={inputClass}
                />
                <Field
                  label={text.commissionRate}
                  value={form.commissionRate}
                  onChange={(value) =>
                    updateField("commissionRate", value)
                  }
                  placeholder="2.5"
                  className={inputClass}
                />
              </div>
            ) : (
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Field
                  label={text.netRent}
                  value={form.netRentMonthly}
                  onChange={(value) =>
                    updateField("netRentMonthly", value)
                  }
                  placeholder="2450"
                  className={inputClass}
                />
                <Field
                  label={text.additionalCosts}
                  value={form.additionalCostsMonthly}
                  onChange={(value) =>
                    updateField("additionalCostsMonthly", value)
                  }
                  placeholder="280"
                  className={inputClass}
                />
                <Field
                  label={text.heatingCosts}
                  value={form.heatingCostsMonthly}
                  onChange={(value) =>
                    updateField("heatingCostsMonthly", value)
                  }
                  placeholder="120"
                  className={inputClass}
                />
                <Field
                  label={text.depositMonths}
                  value={form.depositMonths}
                  onChange={(value) =>
                    updateField("depositMonths", value)
                  }
                  placeholder="3"
                  className={inputClass}
                />
              </div>
            )}

            <label className="mt-7 grid gap-2">
              <span className="text-sm font-black text-slate-200">
                {text.notes}
              </span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                rows={6}
                placeholder={text.notesPlaceholder}
                className="rounded-xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-amber-300"
              />
            </label>

            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
              {text.internal}
            </p>
          </section>

          <aside className="rounded-[28px] border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.09] to-blue-500/[0.08] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              {text.overview}
            </p>

            <div className="mt-6 grid gap-4">
              {form.marketingType === "sale" ? (
                <>
                  <Summary
                    label={text.asking}
                    value={formatMoney(
                      askingPrice,
                      localeKey,
                      text.unset
                    )}
                  />
                  <Summary
                    label={text.minimum}
                    value={formatMoney(
                      minimumPrice,
                      localeKey,
                      text.unset
                    )}
                  />
                  <Summary
                    label={text.commission}
                    value={formatMoney(
                      estimatedCommission,
                      localeKey,
                      text.unset
                    )}
                  />
                </>
              ) : (
                <>
                  <Summary
                    label={text.monthly}
                    value={formatMoney(
                      totalMonthly,
                      localeKey,
                      text.unset
                    )}
                  />
                  <Summary
                    label={text.deposit}
                    value={formatMoney(
                      estimatedDeposit,
                      localeKey,
                      text.unset
                    )}
                  />
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 font-black text-slate-950 disabled:opacity-60"
            >
              {saving ? text.saving : text.save}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-200">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        className={className}
      />
    </label>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <strong className="mt-2 block text-xl text-white">
        {value}
      </strong>
    </div>
  );
}
