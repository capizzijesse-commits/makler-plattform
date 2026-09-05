"use client";

import Link from "next/link";
import AccountMenu from "../components/AccountMenu";
import MarketBadge from "../components/MarketBadge";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";

import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

type CockpitImage = {
  id: string;
  url: string;
  isPrimary: boolean;
};

type CockpitListing = {
  id: string;
  projectName: string | null;
  location: string;
  postalCode: string | null;
  propertyType: string;
  rooms: number | null;
  livingArea: number | null;
  price: number | null;
  generatedVariants: unknown;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: CockpitImage[];
};

type ListingAnalytics = {
  totalViews30d: number;
  uniqueVisitors30d: number;
  views7d: number;
  viewsToday: number;
  daily7d: Array<{
    date: string;
    views: number;
  }>;
  topListings: Array<{
    id: string;
    title: string;
    views: number;
  }>;
  sources: Array<{
    source: string;
    views: number;
  }>;
};

type CockpitOverviewV2Props = {
  userName: string;
  companyName: string;
  companyLogoUrl: string;
  listings: CockpitListing[];
  loadingListings: boolean;
  listingsError: string;
};

function hasGeneratedVariants(
  value: unknown
): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0
  );
}

function getInitials(
  value: string
): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "IA";
  }

  return parts
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

type SidebarIconName =
  | "dashboard"
  | "objects"
  | "new"
  | "images"
  | "social"
  | "marketing"
  | "finance"
  | "settings"
  | "help";

function SidebarIcon({
  name,
}: {
  name: SidebarIconName;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "dashboard" && (
        <>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9.5 20v-6h5v6" />
        </>
      )}

      {name === "objects" && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8v8H8z" />
        </>
      )}

      {name === "new" && (
        <>
          <path d="M6 3.5h8l4 4V20H6z" />
          <path d="M14 3.5V8h4" />
          <path d="M12 11v6" />
          <path d="M9 14h6" />
        </>
      )}

      {name === "images" && (
        <>
          <rect x="3.5" y="4" width="17" height="16" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="m5.5 17 4-4 3 3 2-2 4 3" />
        </>
      )}

      {name === "social" && (
        <>
          <circle cx="6" cy="12" r="2.2" />
          <circle cx="18" cy="6" r="2.2" />
          <circle cx="18" cy="18" r="2.2" />
          <path d="m8 11 7.8-4" />
          <path d="m8 13 7.8 4" />
        </>
      )}

      {name === "marketing" && (
        <>
          <path d="M4 20V10" />
          <path d="M10 20V5" />
          <path d="M16 20v-7" />
          <path d="M22 20V3" />
        </>
      )}

      {name === "finance" && (
        <>
          <path d="M4 7h16" />
          <path d="M6 7V5h12v2" />
          <path d="M6 11h12" />
          <path d="M7 11v8" />
          <path d="M17 11v8" />
          <path d="M4 19h16" />
        </>
      )}
      {name === "settings" && (
        <>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <circle cx="16" cy="7" r="2" />
          <path d="M4 17h2" />
          <path d="M10 17h10" />
          <circle cx="8" cy="17" r="2" />
        </>
      )}

      {name === "help" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9a2.4 2.4 0 0 1 4.6 1c0 2-2.4 2.2-2.4 4" />
          <path d="M12 17h.01" />
        </>
      )}
    </svg>
  );
}
export default function CockpitOverviewV2({
  userName,
  companyName,
  companyLogoUrl,
  listings,
  loadingListings,
  listingsError,
}: CockpitOverviewV2Props) {
  const locale = useLocale();

  const [market, setMarket] =
    useState<InseratAiMarket>("CH");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [showAll, setShowAll] =
    useState(false);

  const [analytics, setAnalytics] =
    useState<ListingAnalytics | null>(null);

  const [
    analyticsLoading,
    setAnalyticsLoading,
  ] = useState(true);

  const [
    analyticsError,
    setAnalyticsError,
  ] = useState("");

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

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError("");

        const response =
          await fetch(
            "/api/listing-analytics",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "Statistiken konnten nicht geladen werden."
          );
        }

        if (
          !cancelled &&
          data?.analytics
        ) {
          setAnalytics(
            data.analytics as ListingAnalytics
          );
        }
      } catch (error) {
        if (!cancelled) {
          setAnalyticsError(
            error instanceof Error
              ? error.message
              : "Statistiken konnten nicht geladen werden."
          );
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  const intlLocale =
    market === "DE"
      ? "de-DE"
      : locale === "it"
        ? "it-CH"
        : locale === "fr"
          ? "fr-CH"
          : locale === "en"
            ? "en-CH"
            : "de-CH";

  const currency =
    market === "DE"
      ? "EUR"
      : "CHF";

  const analyticsData =
    analytics ?? {
      totalViews30d: 0,
      uniqueVisitors30d: 0,
      views7d: 0,
      viewsToday: 0,
      daily7d: [],
      topListings: [],
      sources: [],
    };

  const maxDailyViews =
    Math.max(
      1,
      ...analyticsData.daily7d.map(
        (item) => item.views
      )
    );

  const formatAnalyticsDate = (
    value: string
  ): string => {
    const date =
      new Date(
        `${value}T12:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      intlLocale,
      {
        weekday: "short",
      }
    ).format(date);
  };

  const displayName =
    userName.trim() ||
    companyName.trim() ||
    "Makler";

  const normalizedSearch =
    searchQuery
      .trim()
      .toLocaleLowerCase(intlLocale);

  const sortedListings =
    useMemo(() => {
      return [...listings].sort(
        (first, second) =>
          new Date(
            second.updatedAt
          ).getTime() -
          new Date(
            first.updatedAt
          ).getTime()
      );
    }, [listings]);

  const filteredListings =
    useMemo(() => {
      if (!normalizedSearch) {
        return sortedListings;
      }

      return sortedListings.filter(
        (listing) => {
          const values = [
            listing.projectName,
            listing.location,
            listing.postalCode,
            listing.propertyType,
          ];

          return values.some(
            (value) =>
              value
                ?.toLocaleLowerCase(
                  intlLocale
                )
                .includes(
                  normalizedSearch
                )
          );
        }
      );
    }, [
      intlLocale,
      normalizedSearch,
      sortedListings,
    ]);

  const generatedCount =
    listings.filter((listing) =>
      hasGeneratedVariants(
        listing.generatedVariants
      )
    ).length;

  const activeCount =
    listings.filter(
      (listing) =>
        !listing.archivedAt
    ).length;

  const archivedCount =
    listings.length -
    activeCount;

  const heroImage =
    sortedListings
      .flatMap((listing) => {
        const primary =
          listing.images.find(
            (image) =>
              image.isPrimary
          );

        return primary
          ? [primary.url]
          : listing.images[0]?.url
            ? [listing.images[0].url]
            : [];
      })
      .find(Boolean) ?? "";

  const visibleListings =
    showAll
      ? filteredListings
      : filteredListings.slice(0, 3);

  const formatPrice = (
    price: number | null
  ) => {
    if (price === null) {
      return market === "DE"
        ? "Preis auf Anfrage"
        : "Preis auf Anfrage";
    }

    return new Intl.NumberFormat(
      intlLocale,
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }
    ).format(price);
  };

  const isGerman =
    locale === "de";

  const labels =
    locale === "it"
      ? {
          dashboard: "Dashboard",
          objects: "I miei immobili",
          newListing: "Nuovo annuncio",
          images: "Analizza immagini",
          social: "Social Media",
          marketing: "Marketing Hub",
          finance: "Finanziamento",
          settings: "Impostazioni",
          help: "Aiuto e supporto",
          search: "Cerca immobili, località o parole chiave...",
          welcome: "Bentornato",
          heroText:
            "Crea annunci immobiliari professionali con AI – più velocemente, più facilmente e con tutti gli strumenti in un unico posto.",
          create: "Crea nuovo annuncio",
          myObjects: "I miei immobili",
          totalObjects: "Immobili",
          generated: "Annunci creati",
          active: "Attivi",
          archived: "Archiviati",
          recent: "I miei ultimi immobili",
          all: "Mostra tutti",
          less: "Mostra meno",
          empty: "Nessun immobile trovato.",
          ready: "Pronto",
          draft: "Bozza",
          archivedStatus: "Archiviato",
          quick: "Accesso rapido",
        }
      : locale === "fr"
        ? {
            dashboard: "Tableau de bord",
            objects: "Mes biens",
            newListing: "Nouvelle annonce",
            images: "Analyser les images",
            social: "Réseaux sociaux",
            marketing: "Marketing Hub",
            finance: "Financement",
            settings: "Paramètres",
            help: "Aide et support",
            search: "Rechercher un bien, un lieu ou un mot-clé...",
            welcome: "Bon retour",
            heroText:
              "Créez des annonces immobilières professionnelles avec l’IA – plus rapidement et avec tous vos outils au même endroit.",
            create: "Créer une annonce",
            myObjects: "Mes biens",
            totalObjects: "Biens",
            generated: "Annonces créées",
            active: "Actifs",
            archived: "Archivés",
            recent: "Mes derniers biens",
            all: "Tout afficher",
            less: "Afficher moins",
            empty: "Aucun bien trouvé.",
            ready: "Prêt",
            draft: "Brouillon",
            archivedStatus: "Archivé",
            quick: "Accès rapide",
          }
        : locale === "en"
          ? {
              dashboard: "Dashboard",
              objects: "My properties",
              newListing: "New listing",
              images: "Analyze images",
              social: "Social Media",
              marketing: "Marketing Hub",
              finance: "Financing",
              settings: "Settings",
              help: "Help & Support",
              search: "Search properties, locations or keywords...",
              welcome: "Welcome back",
              heroText:
                "Create professional real-estate listings with AI – faster, easier and with all your tools in one place.",
              create: "Create new listing",
              myObjects: "My properties",
              totalObjects: "Properties",
              generated: "Listings created",
              active: "Active",
              archived: "Archived",
              recent: "My latest properties",
              all: "View all",
              less: "Show less",
              empty: "No properties found.",
              ready: "Ready",
              draft: "Draft",
              archivedStatus: "Archived",
              quick: "Quick access",
            }
          : {
              dashboard: "Dashboard",
              objects: "Meine Objekte",
              newListing: "Neues Inserat",
              images: "Bilder analysieren",
              social: "Social Media",
              marketing: "Marketing Hub",
              finance: "Finanzierung",
              settings: "Einstellungen",
              help: "Hilfe & Support",
              search: "Suche nach Objekten, Adressen oder Stichworten...",
              welcome: "Willkommen zurück",
              heroText:
                "Erstelle überzeugende Immobilieninserate mit KI – schneller, einfacher und professioneller.",
              create: "Neues Inserat erstellen",
              myObjects: "Meine Objekte",
              totalObjects: "Meine Objekte",
              generated: "Erstellte Inserate",
              active: "Aktive Objekte",
              archived: "Archiviert",
              recent: "Meine letzten Objekte",
              all: "Alle Objekte anzeigen",
              less: "Weniger anzeigen",
              empty: "Noch keine passenden Objekte gefunden.",
              ready: "Bereit",
              draft: "Entwurf",
              archivedStatus: "Archiviert",
              quick: "Schnellzugriff",
            };


  const navItems = [
    {
      icon: "dashboard" as SidebarIconName,
      label: labels.dashboard,
      href: "/cockpit",
      active: true,
    },
    {
      icon: "objects" as SidebarIconName,
      label: labels.objects,
      href: "#v2-objects",
    },
    {
      icon: "new" as SidebarIconName,
      label: labels.newListing,
      href: "/dashboard",
    },
    {
      icon: "images" as SidebarIconName,
      label: labels.images,
      href: "/dashboard/analyse",
    },
    {
      icon: "social" as SidebarIconName,
      label: labels.social,
      href: "/dashboard/social-media",
    },
    {
      icon: "marketing" as SidebarIconName,
      label: labels.marketing,
      href: "/marketing-hub",
    },
    {
      icon: "finance" as SidebarIconName,
      label: labels.finance,
      href: "/finanzierung",
    },
  ];

  return (
    <div className="v2Shell">
      <aside className="v2Sidebar v2SidebarPremium">
        <Link
          href="/"
          className="v2Brand v2BrandPremium"
        >
          <span className="v2BrandMark">
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
          </span>

          <span className="v2BrandCopy">
            <strong>Inserat-AI</strong>

          </span>
        </Link>

        <div className="v2NavSectionLabel">
          ARBEITSBEREICH
        </div>

        <nav className="v2Nav">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                item.active
                  ? "v2NavItem active"
                  : "v2NavItem"
              }
            >
              <span className="v2NavIcon">
                <SidebarIcon
                  name={item.icon}
                />
              </span>

              <span className="v2NavLabel">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="v2SidebarBottom">
          <div className="v2NavSectionLabel bottom">
            KONTO
          </div>

          <Link
            href="/konto"
            className="v2NavItem"
          >
            <span className="v2NavIcon">
              <SidebarIcon
                name="settings"
              />
            </span>

            <span className="v2NavLabel">
              {labels.settings}
            </span>
          </Link>

          <Link
            href="/kontakt"
            className="v2NavItem"
          >
            <span className="v2NavIcon">
              <SidebarIcon
                name="help"
              />
            </span>

            <span className="v2NavLabel">
              {labels.help}
            </span>
          </Link>

          <AccountMenu
            displayName={displayName}
            subtitle={
              companyName.trim() ||
              "Makler-Account"
            }
            avatarUrl={
              companyLogoUrl || null
            }
          />
        </div>
      </aside>

      <div className="v2Main">
        <header className="v2Topbar">
          <label className="v2Search">
            <span aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder={
                labels.search
              }
            />
          </label>

          <div className="v2TopActions">
            <div className="v2MarketPill">
              <MarketBadge
                market={market}
              />
            </div>

            <div className="v2TopProfile">
              <span className="v2Avatar">
                {getInitials(displayName)}
              </span>
            </div>
          </div>
        </header>

        <main className="v2Content">
          <section className="v2Hero v2HeroBrand">
            <div className="v2HeroCopy">
              <span className="v2Eyebrow">
                {market === "DE"
                  ? "INSERAT-AI DEUTSCHLAND"
                  : "INSERAT-AI SCHWEIZ"}
              </span>

              <h1>
                {labels.welcome},
                <br />
                {displayName}!
              </h1>

              <p>
                {labels.heroText}
              </p>

              <div className="v2HeroActions">
                <Link
                  href="/dashboard"
                  className="v2PrimaryButton"
                >
                  <span>＋</span>
                  {labels.create}
                </Link>

                <a
                  href="#v2-objects"
                  className="v2SecondaryButton"
                >
                  {labels.myObjects}
                </a>
              </div>
            </div>

            <div className="v2HeroInsight">
              <span className="v2InsightIcon">
                ▥
              </span>

              <strong>
                {activeCount}
              </strong>

              <span>
                {labels.active}
              </span>

              <p>
                {isGerman
                  ? "Alle wichtigen Immobilien und Marketing-Werkzeuge an einem Ort."
                  : labels.heroText}
              </p>
            </div>
          </section>

          <section className="v2Stats">
            <article>
              <span className="v2StatIcon blue">
                ▣
              </span>
              <div>
                <strong>
                  {listings.length}
                </strong>
                <span>
                  {labels.totalObjects}
                </span>
              </div>
            </article>

            <article>
              <span className="v2StatIcon violet">
                ▤
              </span>
              <div>
                <strong>
                  {generatedCount}
                </strong>
                <span>
                  {labels.generated}
                </span>
              </div>
            </article>

            <article>
              <span className="v2StatIcon green">
                ✓
              </span>
              <div>
                <strong>
                  {activeCount}
                </strong>
                <span>
                  {labels.active}
                </span>
              </div>
            </article>

            <article>
              <span className="v2StatIcon gray">
                ◫
              </span>
              <div>
                <strong>
                  {archivedCount}
                </strong>
                <span>
                  {labels.archived}
                </span>
              </div>
            </article>
          </section>

          <section className="v2Performance">
            <div className="v2SectionHeader">
              <div>
                <span className="v2Eyebrow dark">
                  ANALYTICS
                </span>

                <h2>
                  Objekt-Performance
                </h2>
              </div>

              <span className="v2PerformancePeriod">
                Letzte 30 Tage
              </span>
            </div>

            {analyticsError ? (
              <div className="v2PerformanceError">
                {analyticsError}
              </div>
            ) : (
              <div className="v2PerformanceLayout">
                <div className="v2PerformanceMain">
                  <div className="v2PerformanceKpis">
                    <article>
                      <span className="v2PerformanceIcon blue">
                        ◉
                      </span>

                      <div>
                        <strong>
                          {analyticsLoading
                            ? "–"
                            : analyticsData.totalViews30d}
                        </strong>

                        <span>
                          Aufrufe
                        </span>
                      </div>
                    </article>

                    <article>
                      <span className="v2PerformanceIcon violet">
                        ◎
                      </span>

                      <div>
                        <strong>
                          {analyticsLoading
                            ? "–"
                            : analyticsData.uniqueVisitors30d}
                        </strong>

                        <span>
                          Besucher
                        </span>
                      </div>
                    </article>

                    <article>
                      <span className="v2PerformanceIcon green">
                        ↗
                      </span>

                      <div>
                        <strong>
                          {analyticsLoading
                            ? "–"
                            : analyticsData.views7d}
                        </strong>

                        <span>
                          Letzte 7 Tage
                        </span>
                      </div>
                    </article>

                    <article>
                      <span className="v2PerformanceIcon gold">
                        ●
                      </span>

                      <div>
                        <strong>
                          {analyticsLoading
                            ? "–"
                            : analyticsData.viewsToday}
                        </strong>

                        <span>
                          Heute
                        </span>
                      </div>
                    </article>
                  </div>

                  <div className="v2ChartCard">
                    <div className="v2ChartHeader">
                      <div>
                        <strong>
                          Aufrufe im Verlauf
                        </strong>

                        <span>
                          Letzte 7 Tage
                        </span>
                      </div>

                      <span className="v2ChartTotal">
                        {analyticsData.views7d}
                      </span>
                    </div>

                    {analyticsLoading ? (
                      <div className="v2ChartLoading">
                        Statistiken werden geladen…
                      </div>
                    ) : analyticsData.daily7d.length === 0 ? (
                      <div className="v2ChartEmpty">
                        Noch keine Aufrufe erfasst.
                      </div>
                    ) : (
                      <div className="v2MiniChart">
                        {analyticsData.daily7d.map(
                          (item) => (
                            <div
                              key={item.date}
                              className="v2MiniChartColumn"
                            >
                              <div className="v2MiniChartValue">
                                {item.views}
                              </div>

                              <div className="v2MiniChartTrack">
                                <div
                                  className="v2MiniChartBar"
                                  style={{
                                    height:
                                      `${
                                        Math.max(
                                          8,
                                          (
                                            item.views /
                                            maxDailyViews
                                          ) * 100
                                        )
                                      }%`,
                                  }}
                                />
                              </div>

                              <span>
                                {formatAnalyticsDate(
                                  item.date
                                )}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <aside className="v2TopObjects">
                  <div className="v2TopObjectsHeader">
                    <span>
                      Top-Objekte
                    </span>

                    <small>
                      30 Tage
                    </small>
                  </div>

                  {analyticsLoading ? (
                    <div className="v2TopObjectsEmpty">
                      Wird geladen…
                    </div>
                  ) : analyticsData.topListings.length === 0 ? (
                    <div className="v2TopObjectsEmpty">
                      <strong>
                        Noch keine Aufrufe
                      </strong>

                      <p>
                        Sobald Interessenten einen
                        messbaren Inserat-AI-Link öffnen,
                        erscheinen hier die meistgesehenen
                        Objekte.
                      </p>
                    </div>
                  ) : (
                    <div className="v2TopObjectsList">
                      {analyticsData.topListings.map(
                        (
                          listing,
                          index
                        ) => (
                          <Link
                            key={listing.id}
                            href={`/cockpit/${listing.id}`}
                            className="v2TopObjectRow"
                          >
                            <span className="v2TopObjectRank">
                              {String(
                                index + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </span>

                            <span className="v2TopObjectName">
                              {listing.title}
                            </span>

                            <strong>
                              {listing.views}
                            </strong>
                          </Link>
                        )
                      )}
                    </div>
                  )}

                  <div className="v2PrivacyNote">
                    <span>✓</span>

                    <p>
                      Anonyme Besucher werden nur
                      datenschutzfreundlich gezählt.
                      Es werden keine Namen oder
                      IP-Adressen angezeigt.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </section>

          <section
            className="v2Objects"
            id="v2-objects"
          >
            <div className="v2SectionHeader">
              <div>
                <span className="v2Eyebrow dark">
                  IMMOBILIEN
                </span>
                <h2>
                  {labels.recent}
                </h2>
              </div>

              {filteredListings.length > 3 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAll(
                      (current) =>
                        !current
                    )
                  }
                >
                  {showAll
                    ? labels.less
                    : labels.all}
                  <span>→</span>
                </button>
              )}
            </div>

            {loadingListings ? (
              <div className="v2LoadingGrid">
                <div />
                <div />
                <div />
              </div>
            ) : listingsError ? (
              <div className="v2StateBox error">
                {listingsError}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="v2StateBox">
                {labels.empty}
              </div>
            ) : (
              <div className="v2PropertyGrid">
                {visibleListings.map(
                  (listing) => {
                    const primaryImage =
                      listing.images.find(
                        (image) =>
                          image.isPrimary
                      ) ??
                      listing.images[0] ??
                      null;

                    const generated =
                      hasGeneratedVariants(
                        listing.generatedVariants
                      );

                    const status =
                      listing.archivedAt
                        ? labels.archivedStatus
                        : generated
                          ? labels.ready
                          : labels.draft;

                    const title =
                      listing.projectName?.trim() ||
                      `${listing.propertyType} in ${listing.location}`;

                    return (
                      <Link
                        key={listing.id}
                        href={`/cockpit/${listing.id}`}
                        className="v2PropertyCard"
                      >
                        <div className="v2PropertyImage">
                          {primaryImage ? (
                            <img
                              src={
                                primaryImage.url
                              }
                              alt={title}
                            />
                          ) : (
                            <div className="v2PropertyFallback">
                              <span>⌂</span>
                            </div>
                          )}

                          <span
                            className={
                              listing.archivedAt
                                ? "v2Status archived"
                                : generated
                                  ? "v2Status ready"
                                  : "v2Status draft"
                            }
                          >
                            {status}
                          </span>
                        </div>

                        <div className="v2PropertyBody">
                          <strong className="v2Price">
                            {formatPrice(
                              listing.price
                            )}
                          </strong>

                          <h3>{title}</h3>

                          <p className="v2Location">
                            {listing.postalCode
                              ? `${listing.postalCode} `
                              : ""}
                            {listing.location}
                          </p>

                          <div className="v2Facts">
                            <span>
                              {listing.rooms ??
                                "–"}{" "}
                              Zi.
                            </span>

                            <span>
                              {listing.livingArea !==
                              null
                                ? `${listing.livingArea} m²`
                                : "– m²"}
                            </span>

                            <span>
                              {
                                listing.propertyType
                              }
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                )}

                {!showAll && (
                  <Link
                    href="/dashboard"
                    className="v2CreateCard"
                  >
                    <span className="v2CreatePlus">
                      +
                    </span>
                    <strong>
                      {labels.create}
                    </strong>
                    <small>
                      {isGerman
                        ? "In wenigen Minuten zum professionellen Immobilieninserat."
                        : labels.heroText}
                    </small>
                  </Link>
                )}
              </div>
            )}
          </section>

          <section className="v2QuickSection">
            <div className="v2SectionHeader">
              <div>
                <span className="v2Eyebrow dark">
                  TOOLS
                </span>
                <h2>
                  {labels.quick}
                </h2>
              </div>
            </div>

            <div className="v2QuickGrid">
              <Link href="/dashboard">
                <span>＋</span>
                <strong>
                  {labels.newListing}
                </strong>
                <small>
                  {isGerman
                    ? "Immobilie erfassen und Inserat erstellen"
                    : labels.create}
                </small>
              </Link>

              <Link href="/dashboard/analyse">
                <span>◇</span>
                <strong>
                  {labels.images}
                </strong>
                <small>
                  {isGerman
                    ? "Objektbilder mit KI analysieren"
                    : labels.images}
                </small>
              </Link>

              <Link href="/dashboard/social-media">
                <span>◎</span>
                <strong>
                  {labels.social}
                </strong>
                <small>
                  {isGerman
                    ? "Beiträge für deine Kanäle vorbereiten"
                    : labels.social}
                </small>
              </Link>

              <Link href="/marketing-hub">
                <span>▥</span>
                <strong>
                  {labels.marketing}
                </strong>
                <small>
                  {isGerman
                    ? "Vermarktung zentral organisieren"
                    : labels.marketing}
                </small>
              </Link>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .v2Shell {
          min-height: 100vh;
          background: #eef3f9;
          color: #0f172a;
          font-family: inherit;
        }

        .v2Sidebar {
          position: fixed;
          z-index: 50;
          inset: 0 auto 0 0;
          display: flex;
          width: 230px;
          flex-direction: column;
          padding: 22px 16px 18px;
          background:
            linear-gradient(
              180deg,
              #07172d 0%,
              #081b34 55%,
              #061426 100%
            );
          color: #e8eef8;
          box-shadow:
            12px 0 42px rgba(15, 23, 42, 0.12);
        }

        .v2Brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 8px 22px;
          color: white;
          text-decoration: none;
        }

        .v2BrandMark {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          flex: 0 0 38px;
          color: #fbbf24;
        }

        .v2BrandMark svg {
          width: 36px;
          height: 36px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .v2Brand > span:last-child {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .v2Brand strong {
          font-size: 15px;
          line-height: 1.1;
        }

        .v2Brand small {
          margin-top: 3px;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 700;
        }

        .v2Nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .v2NavItem {
          display: flex;
          min-height: 44px;
          align-items: center;
          gap: 11px;
          padding: 0 12px;
          border-radius: 10px;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
          transition:
            background 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }

        .v2NavItem:hover {
          background: rgba(255,255,255,.06);
          color: white;
          transform: translateX(2px);
        }

        .v2NavItem.active {
          background:
            linear-gradient(
              135deg,
              rgba(29, 78, 216, .42),
              rgba(14, 116, 144, .26)
            );
          color: white;
          box-shadow:
            inset 0 0 0 1px
            rgba(96, 165, 250, .16);
        }

        .v2NavIcon {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border-radius: 8px;
          background: rgba(255,255,255,.055);
          color: #dbeafe;
          font-size: 16px;
          font-weight: 900;
        }

        .v2SidebarBottom {
          display: flex;
          margin-top: auto;
          flex-direction: column;
          gap: 5px;
        }

        .v2ProfileCard {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          padding: 12px;
          border:
            1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: rgba(255,255,255,.035);
        }

        .v2ProfileCard img,
        .v2Avatar {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          flex: 0 0 36px;
          border-radius: 50%;
          object-fit: cover;
        }

        .v2Avatar {
          background:
            linear-gradient(
              135deg,
              #6280a9,
              #344d73
            );
          color: white;
          font-size: 12px;
          font-weight: 900;
        }

        .v2ProfileText {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .v2ProfileText strong {
          overflow: hidden;
          color: white;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v2ProfileText small {
          margin-top: 2px;
          overflow: hidden;
          color: #8494ad;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v2Main {
          min-height: 100vh;
          margin-left: 230px;
        }

        .v2Topbar {
          position: sticky;
          z-index: 40;
          top: 0;
          display: flex;
          min-height: 72px;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          padding: 11px 24px;
          border-bottom: 1px solid #dce5f0;
          background: rgba(247,250,253,.92);
          backdrop-filter: blur(18px);
        }

        .v2Search {
          display: flex;
          width: min(540px, 58vw);
          min-height: 44px;
          align-items: center;
          gap: 10px;
          padding: 0 15px;
          border: 1px solid #cfd9e6;
          border-radius: 11px;
          background: white;
          box-shadow:
            0 5px 15px rgba(15,23,42,.035);
        }

        .v2Search > span {
          color: #64748b;
          font-size: 21px;
          line-height: 1;
        }

        .v2Search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font: inherit;
          font-size: 13px;
        }

        .v2Search input::placeholder {
          color: #94a3b8;
        }

        .v2TopActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .v2MarketPill,
        .v2TopProfile {
          display: flex;
          min-height: 42px;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          border: 1px solid #d6e0eb;
          border-radius: 12px;
          background: white;
          box-shadow:
            0 5px 15px rgba(15,23,42,.035);
        }

        .v2MarketPill strong {
          font-size: 12px;
        }

        .v2SwissBadge {
          position: relative;
          display: block;
          width: 18px;
          height: 18px;
          border-radius: 4px;
          background: #d71920;
          box-shadow:
            inset 0 0 0 1px rgba(0,0,0,.08),
            0 2px 6px rgba(215,25,32,.22);
        }

        .v2SwissBadge::before,
        .v2SwissBadge::after {
          position: absolute;
          top: 50%;
          left: 50%;
          background: #ffffff;
          transform: translate(-50%, -50%);
          border-radius: 1px;
          content: "";
        }

        .v2SwissBadge::before {
          width: 10px;
          height: 3px;
        }

        .v2SwissBadge::after {
          width: 3px;
          height: 10px;
        }

        .v2TopProfile {
          padding: 3px;
          border-radius: 50%;
        }

        .v2Content {
          width: min(1380px, 100%);
          margin: 0 auto;
          padding: 24px 26px 48px;
        }

        .v2Hero {
          position: relative;
          display: grid;
          min-height: 300px;
          grid-template-columns:
            minmax(0, 1fr) 270px;
          align-items: center;
          gap: 34px;
          overflow: hidden;
          padding: 38px 40px;
          border-radius: 18px;
          background:
            linear-gradient(
              120deg,
              #0a2242,
              #143b67 60%,
              #174c78
            );
          background-position: center;
          background-size: cover;
          box-shadow:
            0 20px 42px
            rgba(15,23,42,.12);
        }

        .v2Hero::after {
          position: absolute;
          inset: 0;
          pointer-events: none;
          content: "";
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.025),
              transparent
            );
        }

        .v2HeroCopy,
        .v2HeroInsight {
          position: relative;
          z-index: 2;
        }

        .v2Eyebrow {
          display: block;
          margin-bottom: 12px;
          color: #a8c6ec;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .13em;
        }

        .v2Eyebrow.dark {
          margin-bottom: 6px;
          color: #64748b;
        }

        .v2Hero h1 {
          max-width: 700px;
          margin: 0;
          color: white;
          font-size:
            clamp(34px, 4vw, 54px);
          line-height: 1.02;
          letter-spacing: -.045em;
        }

        .v2HeroCopy > p {
          max-width: 610px;
          margin: 18px 0 0;
          color: #d8e6f5;
          font-size: 14px;
          line-height: 1.65;
        }

        .v2HeroActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .v2PrimaryButton,
        .v2SecondaryButton {
          display: inline-flex;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 17px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .v2PrimaryButton {
          background:
            linear-gradient(
              135deg,
              #ffd84d,
              #f7b928
            );
          color: #172033;
          box-shadow:
            0 10px 24px
            rgba(245, 183, 37, .23);
        }

        .v2SecondaryButton {
          border: 1px solid
            rgba(255,255,255,.45);
          background:
            rgba(4,15,35,.25);
          color: white;
        }

        .v2PrimaryButton:hover,
        .v2SecondaryButton:hover {
          transform: translateY(-2px);
        }

        .v2HeroInsight {
          display: flex;
          min-height: 195px;
          flex-direction: column;
          justify-content: center;
          padding: 24px;
          border:
            1px solid rgba(255,255,255,.16);
          border-radius: 16px;
          background:
            rgba(7,25,52,.68);
          color: white;
          box-shadow:
            0 18px 40px
            rgba(0,0,0,.14);
          backdrop-filter: blur(12px);
        }

        .v2InsightIcon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          margin-bottom: 18px;
          border:
            1px solid rgba(255,255,255,.12);
          border-radius: 11px;
          background: rgba(255,255,255,.09);
          font-size: 21px;
        }

        .v2HeroInsight > strong {
          font-size: 34px;
          line-height: 1;
        }

        .v2HeroInsight > span:not(.v2InsightIcon) {
          margin-top: 5px;
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 800;
        }

        .v2HeroInsight p {
          margin: 16px 0 0;
          color: #9eb2ca;
          font-size: 11px;
          line-height: 1.55;
        }

        .v2Stats {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 12px;
          margin: -20px 18px 0;
        }

        .v2Stats article {
          display: flex;
          min-height: 90px;
          align-items: center;
          gap: 13px;
          padding: 15px 17px;
          border: 1px solid #dce5ef;
          border-radius: 12px;
          background: white;
          box-shadow:
            0 10px 26px
            rgba(15,23,42,.07);
        }

        .v2StatIcon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 11px;
          font-size: 18px;
          font-weight: 900;
        }

        .v2StatIcon.blue {
          background: #e8f1ff;
          color: #2563eb;
        }

        .v2StatIcon.violet {
          background: #eeeafe;
          color: #6d4aff;
        }

        .v2StatIcon.green {
          background: #e7f8ef;
          color: #168f52;
        }

        .v2StatIcon.gray {
          background: #eef2f7;
          color: #64748b;
        }

        .v2Stats article > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .v2Stats strong {
          color: #101828;
          font-size: 23px;
          line-height: 1;
        }

        .v2Stats article span:last-child {
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .v2Objects,
        .v2QuickSection {
          padding-top: 34px;
        }

        .v2SectionHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 15px;
        }

        .v2SectionHeader h2 {
          margin: 0;
          color: #101828;
          font-size: 21px;
          letter-spacing: -.025em;
        }

        .v2SectionHeader button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: transparent;
          color: #315fe8;
          cursor: pointer;
          font-size: 11px;
          font-weight: 850;
        }

        .v2PropertyGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 13px;
        }

        .v2PropertyCard,
        .v2CreateCard {
          overflow: hidden;
          min-width: 0;
          border: 1px solid #dce5ef;
          border-radius: 12px;
          background: white;
          color: inherit;
          text-decoration: none;
          box-shadow:
            0 8px 20px
            rgba(15,23,42,.05);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .v2PropertyCard:hover,
        .v2CreateCard:hover {
          transform: translateY(-3px);
          box-shadow:
            0 14px 30px
            rgba(15,23,42,.1);
        }

        .v2PropertyImage {
          position: relative;
          height: 155px;
          overflow: hidden;
          background: #dbe5f0;
        }

        .v2PropertyImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition:
            transform 260ms ease;
        }

        .v2PropertyCard:hover
        .v2PropertyImage img {
          transform: scale(1.025);
        }

        .v2PropertyFallback {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              #dbe6f2,
              #f3f6fa
            );
          color: #8ca0b8;
          font-size: 40px;
        }

        .v2Status {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
          box-shadow:
            0 4px 10px
            rgba(15,23,42,.1);
        }

        .v2Status.ready {
          background: #bdf5ce;
          color: #116c35;
        }

        .v2Status.draft {
          background: #eef2f7;
          color: #475569;
        }

        .v2Status.archived {
          background: #fee2e2;
          color: #991b1b;
        }

        .v2PropertyBody {
          padding: 13px 14px 14px;
        }

        .v2Price {
          display: block;
          color: #101828;
          font-size: 16px;
        }

        .v2PropertyBody h3 {
          overflow: hidden;
          margin: 7px 0 0;
          color: #1e293b;
          font-size: 12px;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v2Location {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 10px;
        }

        .v2Facts {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #edf1f5;
          color: #64748b;
          font-size: 9px;
          font-weight: 750;
        }

        .v2CreateCard {
          display: flex;
          min-height: 260px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 24px;
          border-style: dashed;
          text-align: center;
        }

        .v2CreatePlus {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          margin-bottom: 15px;
          border-radius: 50%;
          background: #eef2ff;
          color: #3658e8;
          font-size: 30px;
          font-weight: 400;
        }

        .v2CreateCard strong {
          color: #284ed8;
          font-size: 12px;
        }

        .v2CreateCard small {
          max-width: 180px;
          margin-top: 8px;
          color: #64748b;
          font-size: 9px;
          line-height: 1.5;
        }

        .v2QuickGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 12px;
        }

        .v2QuickGrid a {
          display: flex;
          min-height: 105px;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid #dde6ef;
          border-radius: 12px;
          background: white;
          color: #101828;
          text-decoration: none;
          box-shadow:
            0 6px 18px
            rgba(15,23,42,.04);
        }

        .v2QuickGrid a > span {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          flex: 0 0 38px;
          border-radius: 10px;
          background: #eff4ff;
          color: #315fe8;
          font-size: 19px;
          font-weight: 900;
        }

        .v2QuickGrid strong,
        .v2QuickGrid small {
          display: block;
        }

        .v2QuickGrid strong {
          font-size: 11px;
        }

        .v2QuickGrid small {
          margin-top: 4px;
          color: #7a889c;
          font-size: 9px;
          line-height: 1.4;
        }

        .v2StateBox {
          padding: 34px;
          border: 1px solid #dce5ef;
          border-radius: 12px;
          background: white;
          color: #64748b;
          text-align: center;
        }

        .v2StateBox.error {
          color: #b91c1c;
        }

        .v2LoadingGrid {
          display: grid;
          grid-template-columns:
            repeat(3,1fr);
          gap: 13px;
        }

        .v2LoadingGrid div {
          height: 260px;
          border-radius: 12px;
          background:
            linear-gradient(
              90deg,
              #e7edf4 25%,
              #f5f7fa 50%,
              #e7edf4 75%
            );
          background-size: 200% 100%;
          animation:
            v2Loading 1.3s infinite;
        }

        @keyframes v2Loading {
          to {
            background-position: -200% 0;
          }
        }

        @media (max-width: 1180px) {
          .v2PropertyGrid {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }

          .v2QuickGrid,
          .v2Stats {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 900px) {
          .v2Sidebar {
            position: relative;
            width: 100%;
            min-height: auto;
          }

          .v2Nav {
            display: grid;
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }

          .v2SidebarBottom {
            display: none;
          }

          .v2Main {
            margin-left: 0;
          }

          .v2Topbar {
            position: relative;
          }

          .v2Hero {
            grid-template-columns: 1fr;
          }

          .v2HeroInsight {
            min-height: auto;
          }
        }

        @media (max-width: 650px) {
          .v2Sidebar {
            padding: 14px;
          }

          .v2Nav {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .v2Content {
            padding: 16px 12px 36px;
          }

          .v2Topbar {
            padding: 10px 12px;
          }

          .v2Search {
            width: 100%;
          }

          .v2MarketPill {
            display: flex !important;
            min-height: 36px !important;
            padding: 0 8px !important;
            border-radius: 10px !important;
          }

          .v2Hero {
            min-height: 0;
            padding: 28px 22px;
          }

          .v2HeroInsight {
            display: none;
          }

          .v2Stats {
            grid-template-columns: 1fr 1fr;
            margin: 12px 0 0;
          }

          .v2PropertyGrid,
          .v2QuickGrid,
          .v2LoadingGrid {
            grid-template-columns: 1fr;
          }

          .v2PropertyImage {
            height: 220px;
          }
        }
        /* ========================================
           INSERAT-AI COCKPIT SIDEBAR V2.1
           ======================================== */

        .v2Sidebar {
          width: 248px !important;
          padding: 22px 14px 18px !important;
          background:
            linear-gradient(
              180deg,
              #06162b 0%,
              #071a32 52%,
              #051326 100%
            ) !important;
          border-right:
            1px solid rgba(148, 163, 184, .10) !important;
          box-shadow:
            12px 0 40px rgba(15, 23, 42, .12) !important;
        }

        .v2Main {
          margin-left: 248px !important;
        }


        /* LOGO */

        .v2Brand {
          display: flex !important;
          min-height: 70px !important;
          align-items: center !important;
          gap: 12px !important;
          margin-bottom: 10px !important;
          padding: 4px 9px 17px !important;
          border-bottom:
            1px solid rgba(255,255,255,.07) !important;
        }

        .v2BrandMark {
          width: 40px !important;
          height: 40px !important;
          flex: 0 0 40px !important;
          color: #fbbf24 !important;
        }

        .v2BrandMark svg {
          width: 38px !important;
          height: 38px !important;
        }

        .v2Brand > span:last-child {
          display: flex !important;
          min-width: 0 !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: center !important;
          line-height: 1 !important;
        }

        .v2Brand strong {
          display: block !important;
          color: #ffffff !important;
          font-size: 15px !important;
          font-weight: 900 !important;
          line-height: 1.1 !important;
          letter-spacing: -.02em !important;
          white-space: nowrap !important;
        }

        .v2Brand small {
          display: block !important;
          margin-top: 4px !important;
          color: #8ea5bf !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }


        /* NAVIGATION */

        .v2Nav {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          margin-top: 3px !important;
        }

        .v2NavItem {
          display: flex !important;
          min-height: 46px !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 11px !important;
          padding: 0 11px !important;
          border:
            1px solid transparent !important;
          border-radius: 10px !important;
          background:
            transparent !important;
          color: #b9c8da !important;
          font-size: 12px !important;
          font-weight: 750 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        .v2NavItem:hover {
          transform: none !important;
          border-color:
            rgba(148,163,184,.08) !important;
          background:
            rgba(255,255,255,.045) !important;
          color: #ffffff !important;
        }

        .v2NavItem.active {
          border-color:
            rgba(96,165,250,.12) !important;
          background:
            linear-gradient(
              90deg,
              rgba(31, 82, 137, .78),
              rgba(18, 52, 90, .64)
            ) !important;
          color: #ffffff !important;
          box-shadow:
            inset 3px 0 0 #fbbf24,
            0 7px 16px rgba(0,0,0,.10) !important;
        }


        /* ICONS */

        .v2NavIcon {
          display: grid !important;
          width: 25px !important;
          height: 25px !important;
          flex: 0 0 25px !important;
          place-items: center !important;
          border: 0 !important;
          border-radius: 0 !important;
          background:
            transparent !important;
          color: #91abc5 !important;
          font-size: 15px !important;
          font-weight: 800 !important;
        }

        .v2NavItem.active .v2NavIcon {
          color: #ffffff !important;
        }

        .v2NavItem:hover .v2NavIcon {
          color: #dbeafe !important;
        }


        /* UNTERER BEREICH */

        .v2SidebarBottom {
          padding-top: 12px !important;
          border-top:
            1px solid rgba(255,255,255,.07) !important;
        }

        .v2ProfileCard {
          min-height: 62px !important;
          margin-top: 10px !important;
          padding: 10px !important;
          border:
            1px solid rgba(148,163,184,.10) !important;
          border-radius: 11px !important;
          background:
            rgba(255,255,255,.025) !important;
          box-shadow: none !important;
        }

        .v2ProfileCard img,
        .v2ProfileCard .v2Avatar {
          width: 34px !important;
          height: 34px !important;
          flex-basis: 34px !important;
        }

        .v2ProfileText strong {
          font-size: 10px !important;
        }

        .v2ProfileText small {
          color: #71859e !important;
          font-size: 8px !important;
        }


        @media (max-width: 900px) {
          .v2Sidebar {
            width: 100% !important;
          }

          .v2Main {
            margin-left: 0 !important;
          }
        }

        /* ======================================
           SIDEBAR V2.2 PREMIUM
           ====================================== */

        .v2SidebarPremium {
          width: 224px !important;
          padding: 18px 12px 16px !important;
          background:
            linear-gradient(
              180deg,
              #06162c 0%,
              #07192f 52%,
              #041224 100%
            ) !important;
          border-right:
            1px solid rgba(148,163,184,.09) !important;
          box-shadow:
            10px 0 34px rgba(15,23,42,.10) !important;
          overflow-y: auto !important;
        }

        .v2Main {
          margin-left: 224px !important;
        }

        .v2BrandPremium {
          display: flex !important;
          min-height: 63px !important;
          align-items: center !important;
          gap: 11px !important;
          margin: 0 3px 18px !important;
          padding: 5px 7px 15px !important;
          border-bottom:
            1px solid rgba(255,255,255,.075) !important;
        }

        .v2BrandPremium .v2BrandMark {
          width: 39px !important;
          height: 39px !important;
          flex: 0 0 39px !important;
        }

        .v2BrandPremium .v2BrandMark svg {
          width: 38px !important;
          height: 38px !important;
        }

        .v2BrandCopy {
          display: flex !important;
          min-width: 0 !important;
          flex-direction: column !important;
          align-items: flex-start !important;
        }

        .v2BrandCopy strong {
          display: block !important;
          color: #ffffff !important;
          font-size: 15px !important;
          font-weight: 900 !important;
          line-height: 1.05 !important;
          letter-spacing: -.025em !important;
        }

        .v2BrandCopy small {
          display: block !important;
          margin-top: 5px !important;
          color: #8fa4bd !important;
          font-size: 9px !important;
          font-weight: 800 !important;
          line-height: 1 !important;
          letter-spacing: .025em !important;
        }

        .v2NavSectionLabel {
          margin:
            0 11px 8px !important;
          color: #526d89 !important;
          font-size: 7px !important;
          font-weight: 900 !important;
          letter-spacing: .17em !important;
        }

        .v2NavSectionLabel.bottom {
          margin-top: 2px !important;
        }

        .v2SidebarPremium .v2Nav {
          gap: 3px !important;
        }

        .v2SidebarPremium .v2NavItem {
          position: relative !important;
          display: flex !important;
          min-height: 42px !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 10px !important;
          padding: 0 11px !important;
          border:
            1px solid transparent !important;
          border-radius: 9px !important;
          background:
            transparent !important;
          color: #aebfd2 !important;
          font-size: 11px !important;
          font-weight: 750 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        .v2SidebarPremium
        .v2NavItem:hover {
          transform: none !important;
          background:
            rgba(255,255,255,.045) !important;
          color: white !important;
        }

        .v2SidebarPremium
        .v2NavItem.active {
          background:
            linear-gradient(
              90deg,
              #153d69,
              #102f52
            ) !important;
          border-color:
            rgba(96,165,250,.12) !important;
          color: #ffffff !important;
          box-shadow:
            0 7px 18px rgba(0,0,0,.12) !important;
        }

        .v2SidebarPremium
        .v2NavItem.active::before {
          position: absolute;
          top: 9px;
          bottom: 9px;
          left: 0;
          width: 2px;
          border-radius: 999px;
          background: #fbbf24;
          content: "";
        }

        .v2SidebarPremium .v2NavIcon {
          display: grid !important;
          width: 21px !important;
          height: 21px !important;
          flex: 0 0 21px !important;
          place-items: center !important;
          border: 0 !important;
          border-radius: 0 !important;
          background:
            transparent !important;
          color: #7894af !important;
        }

        .v2SidebarPremium
        .v2NavIcon svg {
          display: block;
          width: 18px;
          height: 18px;
        }

        .v2SidebarPremium
        .v2NavItem.active
        .v2NavIcon {
          color: #dbeafe !important;
        }

        .v2NavLabel {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .v2SidebarPremium
        .v2SidebarBottom {
          margin-top: auto !important;
          padding-top: 13px !important;
          border-top:
            1px solid rgba(255,255,255,.07) !important;
        }

        .v2SidebarPremium
        .v2ProfileCard {
          position: relative;
          min-height: 58px !important;
          margin-top: 10px !important;
          padding: 9px 28px 9px 9px !important;
          border:
            1px solid rgba(148,163,184,.09) !important;
          border-radius: 10px !important;
          background:
            rgba(255,255,255,.028) !important;
        }

        .v2SidebarPremium
        .v2ProfileCard img,
        .v2SidebarPremium
        .v2ProfileCard .v2Avatar {
          width: 32px !important;
          height: 32px !important;
          flex: 0 0 32px !important;
        }

        .v2SidebarPremium
        .v2ProfileText strong {
          color: #f8fafc !important;
          font-size: 9px !important;
        }

        .v2SidebarPremium
        .v2ProfileText small {
          color: #687f99 !important;
          font-size: 7px !important;
        }

        .v2ProfileChevron {
          position: absolute;
          top: 50%;
          right: 10px;
          color: #607894;
          font-size: 17px;
          transform: translateY(-50%);
        }

        @media (max-width: 900px) {
          .v2SidebarPremium {
            width: 100% !important;
          }

          .v2Main {
            margin-left: 0 !important;
          }

          .v2NavSectionLabel {
            display: none;
          }
        }
        /* SIDEBAR V2.3 ICON COLORS */

        .v2SidebarPremium .v2NavIcon {
          width: 28px !important;
          height: 28px !important;
          flex: 0 0 28px !important;
          border-radius: 8px !important;
          background:
            rgba(116, 145, 173, .07) !important;
          color: #86a0ba !important;
          transition:
            color 160ms ease,
            background 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease !important;
        }

        .v2SidebarPremium
        .v2NavIcon svg {
          width: 17px !important;
          height: 17px !important;
        }


        /* NORMALER MENÜPUNKT */

        .v2SidebarPremium
        .v2NavItem {
          color: #bac8d8 !important;
          transition:
            color 160ms ease,
            background 160ms ease,
            border-color 160ms ease !important;
        }


        /* HOVER */

        .v2SidebarPremium
        .v2NavItem:hover {
          background:
            rgba(66, 109, 154, .12) !important;
          color: #f8fafc !important;
        }

        .v2SidebarPremium
        .v2NavItem:hover
        .v2NavIcon {
          background:
            rgba(96, 165, 250, .11) !important;
          color: #dbeafe !important;
          transform:
            translateY(-1px) !important;
        }


        /* AKTIVER MENÜPUNKT */

        .v2SidebarPremium
        .v2NavItem.active {
          background:
            linear-gradient(
              90deg,
              rgba(25, 63, 104, .96),
              rgba(13, 44, 76, .78)
            ) !important;
          color: #ffffff !important;
        }

        .v2SidebarPremium
        .v2NavItem.active
        .v2NavIcon {
          background:
            linear-gradient(
              135deg,
              rgba(251, 191, 36, .22),
              rgba(245, 158, 11, .10)
            ) !important;
          color: #fbbf24 !important;
          box-shadow:
            0 0 0 1px
              rgba(251, 191, 36, .18),
            0 5px 14px
              rgba(245, 158, 11, .10) !important;
        }

        .v2SidebarPremium
        .v2NavItem.active::before {
          width: 3px !important;
          background:
            linear-gradient(
              180deg,
              #fcd34d,
              #f59e0b
            ) !important;
          box-shadow:
            0 0 12px
              rgba(251, 191, 36, .38) !important;
        }


        /* TEXTE ETWAS KLARER */

        .v2SidebarPremium
        .v2NavLabel {
          letter-spacing:
            -.01em !important;
        }
        /* ======================================
           HERO V2.4 INSERAT-AI BRAND
           ====================================== */

        .v2HeroBrand {
          position: relative !important;
          isolation: isolate !important;
          overflow: hidden !important;
          border:
            1px solid rgba(251,191,36,.12) !important;

          background:
            radial-gradient(
              circle at 87% 16%,
              rgba(251,191,36,.16) 0%,
              rgba(251,191,36,.07) 16%,
              transparent 34%
            ),
            radial-gradient(
              circle at 73% 86%,
              rgba(37,99,235,.26) 0%,
              transparent 39%
            ),
            radial-gradient(
              circle at 19% 18%,
              rgba(59,130,246,.11) 0%,
              transparent 34%
            ),
            linear-gradient(
              118deg,
              #041329 0%,
              #071b36 32%,
              #0b2b50 63%,
              #102f54 80%,
              #08182d 100%
            ) !important;

          box-shadow:
            0 24px 54px rgba(15,23,42,.18),
            inset 0 1px 0 rgba(255,255,255,.035) !important;
        }


        /* ABSTRAKTE ARCHITEKTUR / GLASFASSADE */

        .v2HeroBrand::before {
          position: absolute;
          z-index: 0;
          top: -8%;
          right: -3%;
          width: 58%;
          height: 118%;
          pointer-events: none;
          content: "";

          background:
            linear-gradient(
              122deg,
              transparent 0%,
              transparent 18%,
              rgba(255,255,255,.045) 18.2%,
              rgba(255,255,255,.018) 44%,
              transparent 44.3%
            ),
            repeating-linear-gradient(
              90deg,
              rgba(147,197,253,.075) 0px,
              rgba(147,197,253,.075) 1px,
              transparent 1px,
              transparent 54px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(147,197,253,.055) 0px,
              rgba(147,197,253,.055) 1px,
              transparent 1px,
              transparent 45px
            ),
            linear-gradient(
              145deg,
              rgba(96,165,250,.08),
              rgba(15,23,42,.02)
            );

          clip-path:
            polygon(
              22% 4%,
              100% 0,
              100% 100%,
              0 100%
            );

          opacity: .72;
          transform:
            perspective(900px)
            rotateY(-6deg)
            skewX(-4deg);
          transform-origin: right center;
        }


        /* DUNKLER TEXTBEREICH + GOLDENER LICHTAKZENT */

        .v2HeroBrand::after {
          position: absolute;
          z-index: 1;
          inset: 0;
          pointer-events: none;
          content: "";

          background:
            radial-gradient(
              ellipse at 88% 4%,
              rgba(252,211,77,.11),
              transparent 26%
            ),
            linear-gradient(
              90deg,
              rgba(3,12,28,.54) 0%,
              rgba(3,12,28,.30) 43%,
              rgba(3,12,28,.05) 72%,
              rgba(3,12,28,.20) 100%
            ) !important;
        }


        .v2HeroBrand .v2HeroCopy,
        .v2HeroBrand .v2HeroInsight {
          position: relative !important;
          z-index: 3 !important;
        }


        /* FEINER BRAND-STRICH OBEN */

        .v2HeroBrand {
          border-top-color:
            rgba(251,191,36,.24) !important;
        }


        /* INSIGHT-KARTE PASSEND ZUM BRAND */

        .v2HeroBrand .v2HeroInsight {
          border:
            1px solid rgba(148,163,184,.18) !important;

          background:
            linear-gradient(
              145deg,
              rgba(11,31,57,.88),
              rgba(20,48,79,.74)
            ) !important;

          box-shadow:
            0 18px 40px rgba(0,0,0,.20),
            inset 0 1px 0 rgba(255,255,255,.04) !important;

          backdrop-filter:
            blur(16px) !important;
        }


        .v2HeroBrand .v2InsightIcon {
          border:
            1px solid rgba(251,191,36,.18) !important;

          background:
            linear-gradient(
              135deg,
              rgba(251,191,36,.15),
              rgba(59,130,246,.09)
            ) !important;

          color: #fbbf24 !important;
        }


        .v2HeroBrand .v2Eyebrow {
          color: #d7e8fb !important;
        }


        @media (max-width: 650px) {
          .v2HeroBrand::before {
            right: -38%;
            width: 100%;
            opacity: .38;
          }
        }
        /* ======================================
           OBJECT PERFORMANCE V1
           ====================================== */

        .v2Performance {
          padding-top: 34px;
        }

        .v2PerformancePeriod {
          padding: 7px 10px;
          border: 1px solid #dce5ef;
          border-radius: 9px;
          background: #ffffff;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
        }

        .v2PerformanceLayout {
          display: grid;
          grid-template-columns:
            minmax(0, 1.7fr)
            minmax(250px, .7fr);
          gap: 13px;
        }

        .v2PerformanceMain {
          min-width: 0;
        }

        .v2PerformanceKpis {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 10px;
          margin-bottom: 10px;
        }

        .v2PerformanceKpis article {
          display: flex;
          min-height: 72px;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px solid #dce5ef;
          border-radius: 11px;
          background: #ffffff;
          box-shadow:
            0 7px 18px
            rgba(15,23,42,.045);
        }

        .v2PerformanceKpis article > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .v2PerformanceKpis strong {
          color: #101828;
          font-size: 20px;
          line-height: 1;
        }

        .v2PerformanceKpis article div span {
          margin-top: 5px;
          color: #64748b;
          font-size: 8px;
          font-weight: 750;
          white-space: nowrap;
        }

        .v2PerformanceIcon {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          place-items: center;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 900;
        }

        .v2PerformanceIcon.blue {
          background: #e8f1ff;
          color: #2563eb;
        }

        .v2PerformanceIcon.violet {
          background: #eeeafe;
          color: #6d4aff;
        }

        .v2PerformanceIcon.green {
          background: #e7f8ef;
          color: #168f52;
        }

        .v2PerformanceIcon.gold {
          background: #fff6d8;
          color: #c58a00;
        }

        .v2ChartCard,
        .v2TopObjects {
          border: 1px solid #dce5ef;
          border-radius: 12px;
          background: #ffffff;
          box-shadow:
            0 8px 20px
            rgba(15,23,42,.045);
        }

        .v2ChartCard {
          min-height: 225px;
          padding: 17px;
        }

        .v2ChartHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .v2ChartHeader > div {
          display: flex;
          flex-direction: column;
        }

        .v2ChartHeader strong {
          color: #101828;
          font-size: 11px;
        }

        .v2ChartHeader span {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 8px;
        }

        .v2ChartTotal {
          color: #315fe8 !important;
          font-size: 20px !important;
          font-weight: 900;
        }

        .v2MiniChart {
          display: grid;
          height: 155px;
          grid-template-columns:
            repeat(7, minmax(0,1fr));
          align-items: end;
          gap: 9px;
          margin-top: 15px;
        }

        .v2MiniChartColumn {
          display: grid;
          height: 100%;
          grid-template-rows:
            18px minmax(0,1fr) 18px;
          align-items: end;
          text-align: center;
        }

        .v2MiniChartValue {
          color: #64748b;
          font-size: 7px;
          font-weight: 800;
        }

        .v2MiniChartTrack {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
          border-radius: 5px;
          background:
            linear-gradient(
              180deg,
              #f6f8fb,
              #eef2f7
            );
        }

        .v2MiniChartBar {
          width: min(24px, 58%);
          min-height: 4px;
          border-radius:
            5px 5px 2px 2px;
          background:
            linear-gradient(
              180deg,
              #4f7cff,
              #274cdb
            );
          box-shadow:
            0 4px 12px
            rgba(49,95,232,.18);
          transition:
            height 260ms ease;
        }

        .v2MiniChartColumn > span {
          align-self: end;
          color: #94a3b8;
          font-size: 7px;
          font-weight: 750;
        }

        .v2ChartLoading,
        .v2ChartEmpty {
          display: grid;
          min-height: 155px;
          place-items: center;
          color: #94a3b8;
          font-size: 9px;
        }

        .v2TopObjects {
          display: flex;
          min-height: 307px;
          flex-direction: column;
          overflow: hidden;
        }

        .v2TopObjectsHeader {
          display: flex;
          min-height: 48px;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          border-bottom:
            1px solid #edf1f5;
        }

        .v2TopObjectsHeader span {
          color: #101828;
          font-size: 10px;
          font-weight: 900;
        }

        .v2TopObjectsHeader small {
          color: #94a3b8;
          font-size: 8px;
        }

        .v2TopObjectsList {
          display: flex;
          flex-direction: column;
        }

        .v2TopObjectRow {
          display: grid;
          min-height: 48px;
          grid-template-columns:
            24px minmax(0,1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          border-bottom:
            1px solid #f0f3f7;
          color: inherit;
          text-decoration: none;
        }

        .v2TopObjectRow:hover {
          background: #f8faff;
        }

        .v2TopObjectRank {
          color: #94a3b8;
          font-size: 8px;
          font-weight: 900;
        }

        .v2TopObjectName {
          overflow: hidden;
          color: #334155;
          font-size: 9px;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v2TopObjectRow strong {
          color: #315fe8;
          font-size: 10px;
        }

        .v2TopObjectsEmpty {
          display: flex;
          min-height: 165px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 18px;
          text-align: center;
        }

        .v2TopObjectsEmpty strong {
          color: #334155;
          font-size: 10px;
        }

        .v2TopObjectsEmpty p {
          max-width: 210px;
          margin: 7px 0 0;
          color: #94a3b8;
          font-size: 8px;
          line-height: 1.55;
        }

        .v2PrivacyNote {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: auto;
          padding: 11px 14px;
          border-top:
            1px solid #edf1f5;
          background: #f8fafc;
        }

        .v2PrivacyNote > span {
          color: #168f52;
          font-size: 9px;
          font-weight: 900;
        }

        .v2PrivacyNote p {
          margin: 0;
          color: #7a889c;
          font-size: 7px;
          line-height: 1.45;
        }

        .v2PerformanceError {
          padding: 18px;
          border:
            1px solid #fecaca;
          border-radius: 11px;
          background: #fff7f7;
          color: #b91c1c;
          font-size: 10px;
        }

        @media (max-width: 1180px) {
          .v2PerformanceLayout {
            grid-template-columns: 1fr;
          }

          .v2PerformanceKpis {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 650px) {
          .v2PerformanceKpis {
            grid-template-columns:
              1fr 1fr;
          }

          .v2MiniChart {
            gap: 4px;
          }
        }

        /* COCKPIT_MOBILE_PREMIUM_GRID_V1 */
        @media (max-width: 650px) {

          .v2SidebarPremium {
            width: 100% !important;
            min-height: auto !important;
            padding: 12px 10px 10px !important;
            overflow: visible !important;
          }

          .v2SidebarPremium .v2Nav {
            display: grid !important;
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 4px 7px !important;
          }

          .v2SidebarPremium .v2NavItem {
            min-width: 0 !important;
            min-height: 36px !important;
            gap: 6px !important;
            padding: 0 7px !important;
            border-radius: 8px !important;
            font-size: 9px !important;
          }

          .v2SidebarPremium .v2NavIcon {
            width: 20px !important;
            height: 20px !important;
            flex: 0 0 20px !important;
            border-radius: 6px !important;
          }

          .v2SidebarPremium .v2NavIcon svg {
            width: 14px !important;
            height: 14px !important;
          }

          .v2SidebarPremium .v2NavLabel {
            min-width: 0 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          .v2SidebarPremium .v2SidebarBottom {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}