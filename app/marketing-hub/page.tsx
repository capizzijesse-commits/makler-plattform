"use client";

import Link from "next/link";
import WorkspaceFrame from "../components/WorkspaceFrame";

import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";
import {useEffect, useMemo, useState} from "react";
import {useLocale} from "next-intl";

type LocaleKey = "de" | "it" | "fr" | "en";

type ListingImage = {
  id: string;
  url: string;
};

type MarketingListing = {
  id: string;
  location: string;
  propertyType: string;
  generatedVariants?: unknown;
  socialVariants?: unknown;
  images?: ListingImage[];
  hasCoreAccess?: boolean;
};

type ListingsResponse = {
  success: boolean;
  listings?: MarketingListing[];
  error?: string;
};

const COPY = {
  de: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Deine Vermarktung. Zentral gesteuert.",
    description:
      "Wähle ein Objekt, überprüfe den Marketingstatus und öffne direkt den nächsten sinnvollen Arbeitsschritt.",
    select: "Objekt auswählen",
    loading: "Objekte werden geladen …",
    loadError: "Die Objekte konnten nicht geladen werden.",
    emptyTitle: "Noch kein Objekt vorhanden",
    emptyText:
      "Erstelle zuerst ein Inserat. Danach erscheint es automatisch im Marketing Hub.",
    create: "Inserat erstellen",
    progress: "Marketingfortschritt",
    completed: "abgeschlossen",
    next: "Empfohlener nächster Schritt",
    lockedTitle: "Dieses Objekt ist noch nicht freigeschaltet.",
    lockedText: "Öffne das Objekt im Cockpit, um den Zugang zu aktivieren.",
    openCockpit: "Objekt im Cockpit öffnen",
    available: "Verfügbar",
    ready: "Bereit",
    pro: "Pro",
    development: "In Entwicklung",
    open: "Modul öffnen",
    steps: {
      object: "Objektdaten",
      listing: "Inserat-Texte",
      images: "Objektbilder",
      social: "Social-Media-Texte",
    },
    recommendations: {
      listing: "Vervollständige zuerst die Inserat-Texte für dieses Objekt.",
      images: "Füge jetzt hochwertige Objektbilder hinzu.",
      social: "Erstelle als Nächstes die Social-Media-Beiträge.",
      expose: "Die wichtigsten Inhalte sind bereit. Öffne jetzt das Exposé.",
    },
    actions: {
      listing: "Zum Inserat-Generator",
      images: "Bilder ergänzen",
      social: "Social Media erstellen",
      expose: "Exposé öffnen",
    },
    cards: {
      social: ["Social Media", "Beiträge für Instagram, Facebook, LinkedIn und X erstellen."],
      expose: ["Exposé", "Das professionelle Immobilien-Exposé öffnen und prüfen."],
      tour: ["3D-Video-Tour", "Eine geführte Video-Präsentation für das Objekt erstellen."],
      finance: ["Finanzierung", "Preisstrategie, Käufer-Finanzierung und Finanzierungsrahmen für dieses Objekt prüfen."],
      campaigns: ["Kampagnen", "Eine vollständige Vermarktungsabfolge für das Objekt planen."],
      publishing: ["Publishing Center", "Inhalte vorbereiten, terminieren und später veröffentlichen."],
      reviews: ["Bewertungen", "Kundenfeedback anfragen und positive Bewertungen nutzen."],
    },
  },
  it: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Il tuo marketing. Gestito centralmente.",
    description:
      "Seleziona un immobile, controlla lo stato del marketing e apri direttamente il prossimo passo consigliato.",
    select: "Seleziona immobile",
    loading: "Caricamento degli immobili …",
    loadError: "Impossibile caricare gli immobili.",
    emptyTitle: "Nessun immobile disponibile",
    emptyText:
      "Crea prima un annuncio. L’immobile apparirà automaticamente nel Marketing Hub.",
    create: "Crea annuncio",
    progress: "Avanzamento marketing",
    completed: "completato",
    next: "Prossimo passo consigliato",
    lockedTitle: "Questo immobile non è ancora stato sbloccato.",
    lockedText: "Apri l’immobile nel cockpit per attivare l’accesso.",
    openCockpit: "Apri nel cockpit",
    available: "Disponibile",
    ready: "Pronto",
    pro: "Pro",
    development: "In sviluppo",
    open: "Apri modulo",
    steps: {
      object: "Dati immobile",
      listing: "Testi annuncio",
      images: "Immagini immobile",
      social: "Testi social media",
    },
    recommendations: {
      listing: "Completa prima i testi dell’annuncio per questo immobile.",
      images: "Aggiungi ora immagini professionali dell’immobile.",
      social: "Crea ora i contenuti per i social media.",
      expose: "I contenuti principali sono pronti. Apri ora l’exposé.",
    },
    actions: {
      listing: "Vai al generatore",
      images: "Aggiungi immagini",
      social: "Crea social media",
      expose: "Apri exposé",
    },
    cards: {
      social: ["Social Media", "Crea contenuti per Instagram, Facebook, LinkedIn e X."],
      expose: ["Exposé", "Apri e controlla l’exposé professionale dell’immobile."],
      tour: ["Tour video 3D", "Crea una presentazione video guidata dell’immobile."],
      finance: ["Finanziamento", "Verifica strategia di prezzo, finanziamento dell’acquirente e sostenibilità."],
      campaigns: ["Campagne", "Pianifica una sequenza completa di marketing immobiliare."],
      publishing: ["Publishing Center", "Prepara, pianifica e successivamente pubblica i contenuti."],
      reviews: ["Recensioni", "Richiedi feedback ai clienti e utilizza le recensioni positive."],
    },
  },
  fr: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Votre marketing. Piloté depuis un seul endroit.",
    description:
      "Sélectionnez un bien, contrôlez son avancement marketing et ouvrez directement la prochaine étape recommandée.",
    select: "Sélectionner un bien",
    loading: "Chargement des biens …",
    loadError: "Impossible de charger les biens.",
    emptyTitle: "Aucun bien disponible",
    emptyText:
      "Créez d’abord une annonce. Le bien apparaîtra ensuite automatiquement dans le Marketing Hub.",
    create: "Créer une annonce",
    progress: "Avancement marketing",
    completed: "terminé",
    next: "Prochaine étape recommandée",
    lockedTitle: "Ce bien n’est pas encore débloqué.",
    lockedText: "Ouvrez le bien dans le cockpit afin d’activer son accès.",
    openCockpit: "Ouvrir dans le cockpit",
    available: "Disponible",
    ready: "Prêt",
    pro: "Pro",
    development: "En développement",
    open: "Ouvrir le module",
    steps: {
      object: "Données du bien",
      listing: "Textes de l’annonce",
      images: "Photos du bien",
      social: "Textes réseaux sociaux",
    },
    recommendations: {
      listing: "Complétez d’abord les textes de l’annonce pour ce bien.",
      images: "Ajoutez maintenant des photos professionnelles du bien.",
      social: "Créez ensuite les publications pour les réseaux sociaux.",
      expose: "Les principaux contenus sont prêts. Ouvrez maintenant le dossier de vente.",
    },
    actions: {
      listing: "Ouvrir le générateur",
      images: "Ajouter des photos",
      social: "Créer les publications",
      expose: "Ouvrir le dossier",
    },
    cards: {
      social: ["Réseaux sociaux", "Créer des publications pour Instagram, Facebook, LinkedIn et X."],
      expose: ["Dossier de vente", "Ouvrir et contrôler le dossier professionnel du bien."],
      tour: ["Visite vidéo 3D", "Créer une présentation vidéo guidée du bien."],
      finance: ["Financement", "Vérifier la stratégie de prix, le financement de l’acheteur et la capacité financière."],
      campaigns: ["Campagnes", "Planifier une campagne marketing complète pour le bien."],
      publishing: ["Publishing Center", "Préparer, planifier et publier ultérieurement les contenus."],
      reviews: ["Avis clients", "Demander des retours et valoriser les avis positifs."],
    },
  },
  en: {
    eyebrow: "INSERAT-AI MARKETING HUB",
    title: "Your marketing. Managed in one place.",
    description:
      "Select a property, review its marketing status and open the next recommended step.",
    select: "Select property",
    loading: "Loading properties …",
    loadError: "The properties could not be loaded.",
    emptyTitle: "No property available",
    emptyText:
      "Create a listing first. The property will then appear automatically in the Marketing Hub.",
    create: "Create listing",
    progress: "Marketing progress",
    completed: "completed",
    next: "Recommended next step",
    lockedTitle: "This property has not been unlocked yet.",
    lockedText: "Open the property in the cockpit to activate access.",
    openCockpit: "Open in cockpit",
    available: "Available",
    ready: "Ready",
    pro: "Pro",
    development: "In development",
    open: "Open module",
    steps: {
      object: "Property data",
      listing: "Listing copy",
      images: "Property images",
      social: "Social media copy",
    },
    recommendations: {
      listing: "Complete the listing copy for this property first.",
      images: "Add professional property images next.",
      social: "Create the social media posts next.",
      expose: "The main content is ready. Open the property brochure.",
    },
    actions: {
      listing: "Open listing generator",
      images: "Add images",
      social: "Create social media",
      expose: "Open brochure",
    },
    cards: {
      social: ["Social Media", "Create posts for Instagram, Facebook, LinkedIn and X."],
      expose: ["Property brochure", "Open and review the professional property brochure."],
      tour: ["3D video tour", "Create a guided video presentation for the property."],
      finance: ["Financing", "Review pricing strategy, buyer financing and affordability for this property."],
      campaigns: ["Campaigns", "Plan a complete marketing sequence for the property."],
      publishing: ["Publishing Center", "Prepare, schedule and later publish marketing content."],
      reviews: ["Reviews", "Request customer feedback and use positive reviews."],
    },
  },
} as const;

const FINANCE_COPY = {
  de: {
    eyebrow: "FINANZEN & PREISSTRATEGIE",
    title: "Preise, Mieten und Provisionen zentral verwalten.",
    description:
      "Erfassen Sie die finanziellen Eckdaten dieses Objekts und behalten Sie Ihre interne Preisstrategie im Blick.",
    status: "Verfügbar",
    open: "Finanzen öffnen",
  },
  it: {
    eyebrow: "FINANZE E STRATEGIA DI PREZZO",
    title: "Gestisci prezzi, affitti e provvigioni in un unico posto.",
    description:
      "Inserisci i dati finanziari dell’immobile e mantieni sotto controllo la strategia di prezzo interna.",
    status: "Disponibile",
    open: "Apri finanze",
  },
  fr: {
    eyebrow: "FINANCES ET STRATÉGIE DE PRIX",
    title: "Gérez les prix, loyers et commissions au même endroit.",
    description:
      "Saisissez les données financières du bien et gardez une vue claire sur votre stratégie de prix interne.",
    status: "Disponible",
    open: "Ouvrir les finances",
  },
  en: {
    eyebrow: "FINANCE & PRICING STRATEGY",
    title: "Manage prices, rents and commissions in one place.",
    description:
      "Enter the property’s financial details and keep your internal pricing strategy clearly organised.",
    status: "Available",
    open: "Open finance",
  },
} as const;

function hasContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return false;

    try {
      return hasContent(JSON.parse(text));
    } catch {
      return true;
    }
  }

  return Boolean(value && typeof value === "object" && Object.keys(value).length > 0);
}

export default function MarketingHubPage() {
  const locale = useLocale();

  const [market, setMarket] =
    useState<InseratAiMarket>("CH");

  useEffect(() => {
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
      storedMarket === "CH" ||
      storedMarket === "DE"
    ) {
      setMarket(storedMarket);
    }
  }, []);
  const localeKey = locale.toLowerCase().slice(0, 2) as LocaleKey;
  const text = COPY[localeKey] ?? COPY.de;
  const financeText = FINANCE_COPY[localeKey] ?? FINANCE_COPY.de;

  const [listings, setListings] = useState<MarketingListing[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/listings", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = (await response.json()) as ListingsResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.error || text.loadError);
        }

        const nextListings = Array.isArray(data.listings) ? data.listings : [];
        setListings(nextListings);
        setSelectedId((current) =>
          nextListings.some((listing) => listing.id === current)
            ? current
            : nextListings[0]?.id ?? ""
        );
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : text.loadError);
      } finally {
        setLoading(false);
      }
    }

    void loadListings();
    return () => controller.abort();
  }, [text.loadError]);

  const selectedListing = useMemo(
    () =>
      listings.find((listing) => listing.id === selectedId) ??
      listings[0] ??
      null,
    [listings, selectedId]
  );

  const steps = useMemo(() => {
    if (!selectedListing) return [];

    return [
      {
        label: text.steps.object,
        complete: Boolean(selectedListing.location && selectedListing.propertyType),
      },
      {
        label: text.steps.listing,
        complete: hasContent(selectedListing.generatedVariants),
      },
      {
        label: text.steps.images,
        complete: (selectedListing.images?.length ?? 0) > 0,
      },
      {
        label: text.steps.social,
        complete: hasContent(selectedListing.socialVariants),
      },
    ];
  }, [selectedListing, text.steps]);

  const completedSteps = steps.filter((step) => step.complete).length;
  const progress =
    steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  const nextAction = useMemo(() => {
    if (!selectedListing) return null;

    if (!hasContent(selectedListing.generatedVariants)) {
      return {
        description: text.recommendations.listing,
        label: text.actions.listing,
        href: "/dashboard",
      };
    }

    if ((selectedListing.images?.length ?? 0) === 0) {
      return {
        description: text.recommendations.images,
        label: text.actions.images,
        href: `/cockpit/${selectedListing.id}/edit`,
      };
    }

    if (!hasContent(selectedListing.socialVariants)) {
      return {
        description: text.recommendations.social,
        label: text.actions.social,
        href: `/dashboard/social-media?listingId=${encodeURIComponent(selectedListing.id)}`,
      };
    }

    return null;
  }, [selectedListing, text.actions, text.recommendations]);

  const cards = selectedListing
    ? [
        {
          number: "01",
          title: text.cards.social[0],
          description: text.cards.social[1],
          status: text.available,
          href: `/dashboard/social-media?listingId=${encodeURIComponent(selectedListing.id)}`,
          enabled: true,
        },
        {
          number: "02",
          title: text.cards.tour[0],
          description: text.cards.tour[1],
          status: text.pro,
          href: `/dashboard/tour-guide?listingId=${encodeURIComponent(selectedListing.id)}`,
          enabled: true,
        },
        {
          number: "03",
          title: text.cards.finance[0],
          description: text.cards.finance[1],
          status: text.available,
          href: `/marketing-hub/finance/${encodeURIComponent(selectedListing.id)}`,
          enabled: true,
        },
        {
          number: "04",
          title: text.cards.campaigns[0],
          description: text.cards.campaigns[1],
          status: text.development,
          href: "",
          enabled: false,
        },
        {
          number: "05",
          title: text.cards.publishing[0],
          description: text.cards.publishing[1],
          status: text.development,
          href: "",
          enabled: false,
        },
        {
          number: "06",
          title: text.cards.reviews[0],
          description: text.cards.reviews[1],
          status: text.development,
          href: "",
          enabled: false,
        },
      ]
    : [];

  return (
    <WorkspaceFrame
      market={market}
      active="marketing"
      title="Marketing Hub"
    >
      <main className="min-h-[calc(100vh-84px)] bg-[#071a2f] px-4 pb-20 pt-6 text-white sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <section className="overflow-hidden rounded-[32px] border border-amber-300/25 bg-gradient-to-br from-slate-950 via-[#08142d] to-[#09224a] p-6 shadow-2xl shadow-black/30 sm:p-9 lg:p-12">
          <p className="mb-4 text-xs font-black tracking-[0.24em] text-amber-300 sm:text-sm">
            {text.eyebrow}
          </p>

          <h1 className="max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            {text.title}
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            {text.description}
          </p>

          <div className="mt-8 max-w-xl">
            <label
              htmlFor="marketing-listing"
              className="mb-2 block text-sm font-bold text-slate-200"
            >
              {text.select}
            </label>

            <select
              id="marketing-listing"
              value={selectedListing?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={loading || listings.length === 0}
              className="min-h-14 w-full rounded-2xl border border-amber-300/30 bg-slate-950/80 px-4 text-base font-bold text-white outline-none focus:border-amber-300 disabled:opacity-60"
            >
              {loading ? <option>{text.loading}</option> : null}

              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.propertyType} – {listing.location}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/35 bg-red-950/35 p-5 font-semibold text-red-100">
            {error}
          </div>
        ) : null}

        {!loading && !error && listings.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <h2 className="text-2xl font-black">{text.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">{text.emptyText}</p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-400 px-6 font-black text-slate-950"
            >
              {text.create}
            </Link>
          </section>
        ) : null}

        {selectedListing ? (
          <>
            {selectedListing.hasCoreAccess === false ? (
              <section className="mt-8 rounded-[28px] border border-amber-300/30 bg-amber-300/[0.07] p-6 sm:p-8">
                <h2 className="text-xl font-black text-amber-200">{text.lockedTitle}</h2>
                <p className="mt-2 text-slate-300">{text.lockedText}</p>
                <Link
                  href={`/cockpit/${selectedListing.id}`}
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-300/10 px-5 font-black text-amber-100"
                >
                  {text.openCockpit}
                </Link>
              </section>
            ) : null}

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 sm:p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">
                      {text.progress}
                    </p>
                    <p className="mt-2 text-4xl font-black">{progress}%</p>
                  </div>

                  <p className="text-sm font-bold text-slate-400">
                    {completedSteps}/{steps.length} {text.completed}
                  </p>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                    style={{width: `${progress}%`}}
                  />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {steps.map((step) => (
                    <div
                      key={step.label}
                      className={`flex items-center gap-3 rounded-2xl border p-4 ${
                        step.complete
                          ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                          : "border-white/10 bg-slate-950/35"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${
                          step.complete
                            ? "bg-emerald-400 text-emerald-950"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {step.complete ? "OK" : "–"}
                      </span>
                      <span className="font-bold text-slate-100">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.09] to-blue-500/[0.08] p-6 sm:p-8">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">
                  {text.next}
                </p>

                <h2 className="mt-4 text-2xl font-black leading-tight">
                  {nextAction?.description}
                </h2>

                {nextAction ? (
                  <Link
                    href={nextAction.href}
                    className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-amber-400 px-6 font-black text-slate-950"
                  >
                    {nextAction.label}
                    <span className="ml-2" aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="mt-8">
              {selectedListing.hasCoreAccess !== false ? (
                <Link
                  href={`/marketing-hub/finance/${selectedListing.id}`}
                  className="group block rounded-[28px] border border-amber-300/25 bg-gradient-to-br from-amber-300/[0.09] via-white/[0.045] to-blue-500/[0.08] p-6 transition hover:-translate-y-1 hover:border-amber-300/50 sm:p-8"
                >
                  <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                          {financeText.eyebrow}
                        </span>
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                          {financeText.status}
                        </span>
                      </div>
                      <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                        {financeText.title}
                      </h2>
                      <p className="mt-3 leading-7 text-slate-300">
                        {financeText.description}
                      </p>
                    </div>

                    <span className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-amber-400 px-5 font-black text-slate-950">
                      {financeText.open}
                      <span className="ml-2" aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              ) : null}
            </section>

            <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm font-black tracking-[0.18em] text-amber-300">
                        {card.number}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          card.enabled
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-slate-700/60 text-slate-300"
                        }`}
                      >
                        {card.status}
                      </span>
                    </div>

                    <h2 className="mt-7 text-2xl font-black">{card.title}</h2>
                    <p className="mt-3 min-h-[72px] leading-6 text-slate-300">
                      {card.description}
                    </p>
                    <div className="mt-6 font-black text-amber-300">
                      {!card.enabled
                    ? text.development
                    : selectedListing.hasCoreAccess === false
                      ? text.lockedTitle
                      : `${text.open} →`}
                    </div>
                  </>
                );

                if (card.enabled && selectedListing.hasCoreAccess !== false) {
                  return (
                    <Link
                      key={card.number}
                      href={card.href}
                      className="rounded-[26px] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:border-amber-300/35"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={card.number}
                    className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6 opacity-75"
                    aria-disabled="true"
                  >
                    {content}
                  </div>
                );
              })}
            </section>
          </>
        ) : null}
      </div>
    </main>
    </WorkspaceFrame>
  );
}
