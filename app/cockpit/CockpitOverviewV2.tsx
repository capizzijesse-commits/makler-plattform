"use client";

import Link from "next/link";
import BatchPublishingV23 from "./BatchPublishingV23";
import CockpitOverviewV3View from "./CockpitOverviewV3View";
import AccountMenu from "../components/AccountMenu";
import MarketBadge from "../components/MarketBadge";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";
import PortalConnectionsCard from "./PortalConnectionsCard";

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
  countryCode: string | null;
  market: string | null;
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

/* DAILY_COCKPIT_V22 */
type DailyActivityItem = {
  id?:
    string;

  kind:
    string;

  severity?:
    "info" |
    "success" |
    "warning" |
    "error";

  status?:
    string |
    null;

  listingId:
    string;

  listingLabel:
    string;

  location:
    string;

  title?:
    string;

  message?:
    string;

  icon?:
    string;

  count:
    number;

  uniqueVisitors?:
    number;

  createdAt?:
    string;

  latestAt:
    string;

  unread:
    boolean;

  href:
    string;
};

type DailyActivityResponse = {
  success:
    boolean;

  unreadCount:
    number;

  items:
    DailyActivityItem[];

  summary:
    {
      views7d:
        number;

      uniqueVisitors7d:
        number;

      operationalEvents7d?:
        number;

      actionRequired7d?:
        number;
    };
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
  | "connect"
  | "maps"
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

      {name === "connect" && (
        <>
          <circle
            cx="8"
            cy="8"
            r="2.5"
          />
          <circle
            cx="16"
            cy="8"
            r="2.5"
          />
          <path d="M3.5 18c.5-3.2 2.2-5 4.5-5s4 1.8 4.5 5" />
          <path d="M11.5 18c.5-3.2 2.2-5 4.5-5s4 1.8 4.5 5" />
        </>
      )}

      {name === "maps" && (
        <>
          <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
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

  const [
    marketResolved,
    setMarketResolved,
  ] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [showAll, setShowAll] =
    useState(false);


  /*
   * LISTING TRASH V1
   *
   * "Löschen" ist zunächst ein sicherer
   * Soft Delete über archivedAt.
   */
  const [
    localListings,
    setLocalListings,
  ] =
    useState<CockpitListing[]>(
      listings
    );

  const [
    objectView,
    setObjectView,
  ] =
    useState<
      "active" |
      "trash"
    >("active");

  const [
    listingActionId,
    setListingActionId,
  ] =
    useState<string | null>(
      null
    );

  const [
    listingActionMessage,
    setListingActionMessage,
  ] =
    useState("");

  const [
    listingActionError,
    setListingActionError,
  ] =
    useState(false);


  /*
   * INSERAT-AI CONFIRMATION MODAL
   *
   * Kein Browser-window.confirm.
   * Das Cockpit übernimmt die Bestätigung
   * vollständig im eigenen Inserat-AI Design.
   */
  const [
    trashConfirmListing,
    setTrashConfirmListing,
  ] =
    useState<CockpitListing | null>(
      null
    );


  useEffect(() => {
    setLocalListings(
      listings
    );
  }, [
    listings,
  ]);


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

  const [
    dailyActivity,
    setDailyActivity,
  ] =
    useState<DailyActivityResponse | null>(
      null
    );

  const [
    dailyActivityLoading,
    setDailyActivityLoading,
  ] =
    useState(true);

  const [
    dailyActivityError,
    setDailyActivityError,
  ] =
    useState("");

  useEffect(() => {
    const domainMarket =
      getInseratAiMarketFromHostname(
        window.location.hostname
      );

    if (domainMarket) {
      setMarket(domainMarket);
      setMarketResolved(true);
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

    setMarketResolved(true);
  }, []);

  useEffect(() => {
    document.title =
      market === "DE"
        ? "Inserat-AI Deutschland"
        : "Inserat-AI Schweiz";
  }, [market]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError("");

        const response =
          await fetch(
            `/api/listing-analytics?market=${market}`,
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
  }, [market]);

  useEffect(() => {
    let cancelled =
      false;


    async function loadDailyActivity() {
      try {
        setDailyActivityLoading(
          true
        );

        setDailyActivityError(
          ""
        );


        const today =
          new Date();

        today.setHours(
          0,
          0,
          0,
          0
        );


        const response =
          await fetch(
            "/api/activity-center?mode=all&since=" +
              encodeURIComponent(
                today.toISOString()
              ),
            {
              method:
                "GET",

              cache:
                "no-store",
            }
          );


        const data =
          await response.json();


        if (
          !response.ok
        ) {
          throw new Error(
            typeof data?.error ===
              "string"
              ? data.error
              : "Aktivitäten konnten nicht geladen werden."
          );
        }


        if (
          !cancelled
        ) {
          setDailyActivity(
            data as DailyActivityResponse
          );
        }
      }
      catch (
        error
      ) {
        if (
          !cancelled
        ) {
          setDailyActivityError(
            error instanceof Error
              ? error.message
              : "Aktivitäten konnten nicht geladen werden."
          );
        }
      }
      finally {
        if (
          !cancelled
        ) {
          setDailyActivityLoading(
            false
          );
        }
      }
    }


    void loadDailyActivity();


    return () => {
      cancelled =
        true;
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

  const marketListings =
    useMemo(() => {
      return localListings.filter(
        (listing) => {
          const countryCode =
            listing.countryCode
              ?.trim()
              .toUpperCase();

          if (countryCode) {
            return (
              countryCode === market
            );
          }

          /*
           * Legacy-Objekte vor countryCode:
           * vorhandenen Markt verwenden.
           * Ganz alte Datensätze gelten als CH.
           */
          const legacyMarket =
            listing.market
              ?.trim()
              .toUpperCase();

          if (
            legacyMarket === "CH" ||
            legacyMarket === "DE"
          ) {
            return (
              legacyMarket === market
            );
          }

          return market === "CH";
        }
      );
    }, [
      localListings,
      market,
    ]);

  const sortedListings =
    useMemo(() => {
      return [...marketListings].sort(
        (first, second) =>
          new Date(
            second.updatedAt
          ).getTime() -
          new Date(
            first.updatedAt
          ).getTime()
      );
    }, [marketListings]);

  const viewListings =
    useMemo(() => {
      return sortedListings.filter(
        (listing) =>
          objectView ===
            "trash"
            ? Boolean(
                listing.archivedAt
              )
            : !listing.archivedAt
      );
    }, [
      sortedListings,
      objectView,
    ]);


  const filteredListings =
    useMemo(() => {
      if (!normalizedSearch) {
        return viewListings;
      }

      return viewListings.filter(
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
      viewListings,
    ]);

  const generatedCount =
    marketListings.filter((listing) =>
      hasGeneratedVariants(
        listing.generatedVariants
      )
    ).length;

  const activeCount =
    marketListings.filter(
      (listing) =>
        !listing.archivedAt
    ).length;

  const archivedCount =
    marketListings.length -
    activeCount;


  const activeMarketListings =
    marketListings.filter(
      (listing) =>
        !listing.archivedAt
    );


  const readyForReviewListings =
    activeMarketListings.filter(
      (listing) =>
        hasGeneratedVariants(
          listing.generatedVariants
        ) &&
        listing.images.length >
          0
    );


  const actionNeededListings =
    activeMarketListings.filter(
      (listing) =>
        !hasGeneratedVariants(
          listing.generatedVariants
        ) ||
        listing.images.length ===
          0
    );


  const marketListingIds =
    new Set(
      marketListings.map(
        (listing) =>
          listing.id
      )
    );


  const marketActivityItems =
    (
      dailyActivity?.items ??
      []
    )
      .filter(
        (item) =>
          marketListingIds.has(
            item.listingId
          )
      )
      .slice(
        0,
        4
      );


  const unreadActivityCount =
    marketActivityItems.filter(
      (item) =>
        item.unread
    ).length;


  const primaryActionListing =
    actionNeededListings[0] ??
    readyForReviewListings[0] ??
    activeMarketListings[0] ??
    null;


  const primaryActionHref =
    primaryActionListing
      ? actionNeededListings.some(
          (listing) =>
            listing.id ===
            primaryActionListing.id
        )
        ? `/cockpit/${primaryActionListing.id}/edit`
        : `/cockpit/${primaryActionListing.id}#portal-publishing`
      : "/dashboard";


  const primaryActionLabel =
    primaryActionListing
      ? actionNeededListings.some(
          (listing) =>
            listing.id ===
            primaryActionListing.id
        )
        ? "Objekt fertigstellen"
        : "Veröffentlichung prüfen"
      : "Neues Objekt erstellen";

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

  async function setListingArchived(
    listing:
      CockpitListing,
    archived:
      boolean
  ) {

    if (
      listingActionId
    ) {
      return;
    }


    try {

      setListingActionId(
        listing.id
      );

      setListingActionMessage(
        ""
      );

      setListingActionError(
        false
      );


      const response =
        await fetch(
          `/api/listings/${encodeURIComponent(
            listing.id
          )}`,
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                archived,
              }),
          }
        );


      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          typeof data.error ===
            "string"
            ? data.error
            : "Objekt konnte nicht aktualisiert werden."
        );
      }


      const serverArchivedAt =
        typeof data.listing
          ?.archivedAt ===
          "string"
          ? data.listing.archivedAt
          : null;


      setLocalListings(
        (current) =>
          current.map(
            (item) =>
              item.id ===
                listing.id
                ? {
                    ...item,

                    archivedAt:
                      archived
                        ? (
                            serverArchivedAt ||
                            new Date()
                              .toISOString()
                          )
                        : null,
                  }
                : item
          )
      );


      setListingActionMessage(
        archived
          ? trashLabels.moved
          : trashLabels.restored
      );

    }
    catch (
      actionError
    ) {

      setListingActionError(
        true
      );

      setListingActionMessage(
        actionError instanceof
          Error
          ? actionError.message
          : "Objekt konnte nicht aktualisiert werden."
      );

    }
    finally {

      setListingActionId(
        null
      );
    }
  }


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


  const trashLabels =
    locale === "it"
      ? {
          trash:
            "Cestino",
          objects:
            "Immobili",
          move:
            "Sposta nel cestino",
          restore:
            "Ripristina",
          confirm:
            "Spostare questo immobile nel cestino?",
          moved:
            "Immobile spostato nel cestino.",
          restored:
            "Immobile ripristinato.",
          empty:
            "Il cestino è vuoto.",
        }
      : locale === "fr"
        ? {
            trash:
              "Corbeille",
            objects:
              "Biens",
            move:
              "Mettre à la corbeille",
            restore:
              "Restaurer",
            confirm:
              "Déplacer ce bien dans la corbeille ?",
            moved:
              "Bien placé dans la corbeille.",
            restored:
              "Bien restauré.",
            empty:
              "La corbeille est vide.",
          }
        : locale === "en"
          ? {
              trash:
                "Trash",
              objects:
                "Properties",
              move:
                "Move to trash",
              restore:
                "Restore",
              confirm:
                "Move this property to the trash?",
              moved:
                "Property moved to trash.",
              restored:
                "Property restored.",
              empty:
                "The trash is empty.",
            }
          : {
              trash:
                "Papierkorb",
              objects:
                "Objekte",
              move:
                "In Papierkorb",
              restore:
                "Wiederherstellen",
              confirm:
                "Dieses Objekt in den Papierkorb verschieben?",
              moved:
                "Objekt wurde in den Papierkorb verschoben.",
              restored:
                "Objekt wurde wiederhergestellt.",
              empty:
                "Der Papierkorb ist leer.",
            };


  const trashDialogLabels =
    locale === "it"
      ? {
          eyebrow:
            "INSERAT-AI SICUREZZA",
          title:
            "Spostare nel cestino?",
          description:
            "L'immobile viene rimosso dalla vista attiva, ma non viene cancellato definitivamente.",
          safety:
            "Puoi ripristinarlo in qualsiasi momento dal cestino.",
          cancel:
            "Annulla",
          confirm:
            "Sposta nel cestino",
        }
      : locale === "fr"
        ? {
            eyebrow:
              "SÉCURITÉ INSERAT-AI",
            title:
              "Déplacer vers la corbeille ?",
            description:
              "Le bien disparaît de la vue active, mais n'est pas supprimé définitivement.",
            safety:
              "Vous pourrez le restaurer à tout moment depuis la corbeille.",
            cancel:
              "Annuler",
            confirm:
              "Mettre à la corbeille",
          }
        : locale === "en"
          ? {
              eyebrow:
                "INSERAT-AI SAFETY",
              title:
                "Move to trash?",
              description:
                "The property disappears from your active workspace but is not permanently deleted.",
              safety:
                "You can restore it at any time from the trash.",
              cancel:
                "Cancel",
              confirm:
                "Move to trash",
            }
          : {
              eyebrow:
                "INSERAT-AI SICHERHEIT",
              title:
                "Objekt in den Papierkorb?",
              description:
                "Das Objekt verschwindet aus deinem aktiven Arbeitsbereich, wird aber nicht endgültig gelöscht.",
              safety:
                "Du kannst es jederzeit aus dem Papierkorb wiederherstellen.",
              cancel:
                "Abbrechen",
              confirm:
                "In Papierkorb",
            };


  const todayLabel =
    locale === "it"
      ? "Oggi"
      : locale === "fr"
      ? "Aujourd’hui"
      : locale === "en"
      ? "Today"
      : "Heute";


  const [portalNavOpen, setPortalNavOpen] =
    useState(true);


  const navItems: Array<{
    key:
      | "today"
      | "connect"
      | "maps"
      | "marketing"
      | "finance";
    icon: SidebarIconName;
    label: string;
    href: string;
    active?: boolean;
  }> = [
    {
      key: "today",
      icon: "dashboard",
      label: todayLabel,
      href: "/cockpit",
      active: true,
    },
    {
      key: "maps",
      icon: "maps",
      label: "Maps",
      href: "/map",
    },
    {
      key: "marketing",
      icon: "marketing",
      label: labels.marketing,
      href: "/marketing-hub",
    },
  ];

  return (
    <div className="v2Shell">

      {trashConfirmListing && (
        <div
          className="iaTrashConfirmBackdrop"
          role="presentation"
          onMouseDown={() =>
            setTrashConfirmListing(
              null
            )
          }
        >
          <section
            className="iaTrashConfirmDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ia-trash-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="iaTrashConfirmGlow" />

            <div className="iaTrashConfirmBrand">
              <span className="iaTrashConfirmMark">
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

              <div>
                <span>
                  {trashDialogLabels.eyebrow}
                </span>

                <strong>
                  Inserat-AI
                </strong>
              </div>
            </div>


            <div className="iaTrashConfirmIcon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M9 7V4h6v3" />
                <path d="M7 7l1 13h8l1-13" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </div>


            <div className="iaTrashConfirmCopy">
              <h2 id="ia-trash-title">
                {trashDialogLabels.title}
              </h2>

              <strong className="iaTrashObjectName">
                {trashConfirmListing
                  .projectName
                  ?.trim() ||
                  `${trashConfirmListing.propertyType} in ${trashConfirmListing.location}`}
              </strong>

              <p>
                {trashDialogLabels.description}
              </p>
            </div>


            <div className="iaTrashSafety">
              <span aria-hidden="true">
                ✓
              </span>

              <p>
                {trashDialogLabels.safety}
              </p>
            </div>


            <div className="iaTrashConfirmActions">

              <button
                type="button"
                className="iaTrashCancel"
                onClick={() =>
                  setTrashConfirmListing(
                    null
                  )
                }
              >
                {trashDialogLabels.cancel}
              </button>


              <button
                type="button"
                className="iaTrashConfirm"
                onClick={() => {

                  const listing =
                    trashConfirmListing;

                  setTrashConfirmListing(
                    null
                  );

                  void setListingArchived(
                    listing,
                    true
                  );
                }}
              >
                <span aria-hidden="true">
                  🗑
                </span>

                {trashDialogLabels.confirm}
              </button>

            </div>
          </section>
        </div>
      )}

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

        <Link
          href="/dashboard"
          className="v2DashboardBack"
          aria-label="Zurück zum Dashboard"
          style={{
            display: "flex",
            minHeight: 38,
            alignItems: "center",
            gap: 8,
            margin: "0 4px 14px",
            padding: "0 10px",
            border:
              "1px solid rgba(103,232,249,.14)",
            borderRadius: 9,
            background:
              "rgba(15,42,71,.42)",
            color: "#b8c8d9",
            fontSize: 11,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              color: "#fbbf24",
              fontSize: 17,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            ←
          </span>

          <span>
            Dashboard
          </span>
        </Link>

        <div className="v2NavSectionLabel">
          ARBEITSBEREICH
        </div>

        <nav className="v2Nav">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={(event) => {
                if (
                  item.key === "connect"
                ) {
                  event.preventDefault();

                  window.dispatchEvent(
                    new Event(
                      "inserat-ai:open-chat"
                    )
                  );

                  return;
                }

              }}
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

          {isGerman ? (
            <div className="v2PortalNavGroup">
              <button
                type="button"
                className="v2NavItem v2PortalNavToggle"
                onClick={() =>
                  setPortalNavOpen(
                    (current) =>
                      !current
                  )
                }
                aria-expanded={portalNavOpen}
              >
                <span className="v2NavIcon">
                  <SidebarIcon
                    name="connect"
                  />
                </span>

                <span className="v2NavLabel">
                  Portale
                </span>

                <span
                  className={
                    portalNavOpen
                      ? "v2PortalNavArrow open"
                      : "v2PortalNavArrow"
                  }
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {portalNavOpen ? (
                <div className="v2PortalSubnav">
                  <div className="v2PortalCountry">
                    Deutschland
                  </div>

                  <Link
                    href="/cockpit#portale"
                    className="v2PortalSubitem"
                  >
                    ImmoScout24 DE
                  </Link>

                  <Link
                    href="/cockpit#portale"
                    className="v2PortalSubitem"
                  >
                    Immowelt
                  </Link>

                  <Link
                    href="/cockpit#portale"
                    className="v2PortalSubitem"
                  >
                    Kleinanzeigen
                  </Link>

                  <Link
                    href="/cockpit#portale"
                    className="v2PortalSubitem"
                  >
                    Immobilien.de
                  </Link>

                  <Link
                    href="/cockpit#portale"
                    className="v2PortalSubitem"
                  >
                    WG-Gesucht
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <Link
            href="/finanzierung"
            className="v2NavItem"
          >
            <span className="v2NavIcon">
              <SidebarIcon
                name="finance"
              />
            </span>

            <span className="v2NavLabel">
              {labels.finance}
            </span>
          </Link>
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

        {/* COCKPIT_V3_CLEAN */}
          <CockpitOverviewV3View
            market={market}
            displayName={displayName}
            activeCount={activeCount}
            readyCount={readyForReviewListings.length}
            actionCount={actionNeededListings.length}
            viewsToday={
              analyticsLoading
                ? null
                : analyticsData.viewsToday
            }
            primaryAction={
              primaryActionListing
                ? {
                    id:
                      primaryActionListing.id,

                    title:
                      primaryActionListing
                        .projectName
                        ?.trim() ||
                      `${primaryActionListing.propertyType} in ${primaryActionListing.location}`,

                    location:
                      primaryActionListing.location,

                    postalCode:
                      primaryActionListing.postalCode,

                    rooms:
                      primaryActionListing.rooms,

                    livingArea:
                      primaryActionListing.livingArea,

                    imageUrl:
                      primaryActionListing.images
                        ?.find(
                          (image) =>
                            image.isPrimary
                        )
                        ?.url ??
                      primaryActionListing.images?.[0]?.url ??
                      null,

                    href:
                      primaryActionHref,

                    label:
                      primaryActionLabel,
                  }
                : null
            }
            activityItems={marketActivityItems}
            activityLoading={dailyActivityLoading}
            activityError={dailyActivityError}
            listings={marketListings}
          />


          <main className="v2Content v2LegacyHidden">
          {/* ONE_SCREEN_COCKPIT_V25 */}
          {/* PREMIUM_COCKPIT_V26 */}
          <section className="v26PremiumHero">
            <div className="v26HeroCopy">
              <span className="v26HeroEyebrow">
                {market === "DE"
                  ? "INSERAT-AI DEUTSCHLAND"
                  : "INSERAT-AI SCHWEIZ"}
              </span>

              <div className="v26HeroTitleRow">
                <h1>
                  {labels.welcome}, {displayName}
                </h1>

                <span className="v26HeroStatus">
                  <span />
                  {activeCount} aktiv
                </span>
              </div>

              <p>
                Mehr Reichweite. Mehr Anfragen.
                Mit KI zu besseren Inseraten.
              </p>
            </div>


            <div className="v26HeroRight">
              <div className="v26HeroScene">
                <span>
                  Immobilien
                  <br />
                  haben Zukunft.
                </span>

                <div className="v26Mountain v26MountainBack" />
                <div className="v26Mountain v26MountainFront" />

                <div className="v26SwissFlag">
                  +
                </div>
              </div>


              <div className="v26HeroActions">
                <Link
                  href="/dashboard"
                  className="v26HeroPrimary"
                  style={{
                    display: "inline-flex",
                    background:
                      "linear-gradient(135deg,#ffd44d,#ff9e1b)",
                    color:
                      "#111827",
                    boxShadow:
                      "0 12px 30px rgba(255,158,27,.35)",
                    border:
                      "1px solid rgba(255,190,48,.55)",
                  }}
                >
                  <span className="v28CtaIcon">
                    ＋
                  </span>

                  <span className="v28CtaText">
                    Neues Objekt
                  </span>
                </Link>

                <a
                  href="#batch-publishing"
                  className="v26HeroSecondary"
                >
                  Veröffentlichen →
                </a>
              </div>
            </div>
          </section>

          {/* DAILY_COCKPIT_V22 */}
          <section className="v22Daily">
            <div className="v22DailyHeader">
              <div>
                <span className="v2Eyebrow dark">
                  HEUTE
                </span>

                <h2>
                  Dein Arbeitstag auf einen Blick
                </h2>

                <p>
                  Die wichtigsten Objekte, Aufgaben und Aktivitäten – ohne Umwege.
                </p>
              </div>

              <div className="v26TodayStatus">
                <span className="v26TodaySun">
                  ☀
                </span>

                <span>
                  <strong>
                    {new Date().toLocaleDateString(
                      locale === "it"
                        ? "it-CH"
                        : "de-CH",
                      {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </strong>

                  <small>
                    Schön, dass du da bist!
                  </small>
                </span>
              </div>
            </div>


            <div className="v22KpiGrid">
              <article>
                <span className="v22KpiIcon blue">
                  ▣
                </span>

                <div>
                  <strong>
                    {activeCount}
                  </strong>

                  <span>
                    Aktive Objekte
                  </span>

                  <small>
                    aktuell im Bestand
                  </small>
                </div>
              </article>


              <article>
                <span className="v22KpiIcon green">
                  ✓
                </span>

                <div>
                  <strong>
                    {readyForReviewListings.length}
                  </strong>

                  <span>
                    Paket bereit
                  </span>

                  <small>
                    Text + Bilder vorhanden
                  </small>
                </div>
              </article>


              <article>
                <span className="v22KpiIcon gold">
                  !
                </span>

                <div>
                  <strong>
                    {actionNeededListings.length}
                  </strong>

                  <span>
                    Aktion nötig
                  </span>

                  <small>
                    Inhalt oder Bilder fehlen
                  </small>
                </div>
              </article>


              <article>
                <span className="v22KpiIcon violet">
                  ◉
                </span>

                <div>
                  <strong>
                    {analyticsLoading
                      ? "–"
                      : analyticsData.viewsToday}
                  </strong>

                  <span>
                    Aufrufe heute
                  </span>

                  <small>
                    echte Inserat-AI-Aufrufe
                  </small>
                </div>
              </article>
            </div>


            <div className="v22DailyMain">
              <article className="v22NextAction">
                <div className="v22CardTitle">
                  <div>
                    <span className="v2Eyebrow dark">
                      JETZT ERLEDIGEN
                    </span>

                    <h3>
                      {primaryActionListing
                        ? (
                            primaryActionListing.projectName?.trim() ||
                            `${primaryActionListing.propertyType} in ${primaryActionListing.location}`
                          )
                        : "Alles bereit"}
                    </h3>
                  </div>

                  {actionNeededListings.length > 0 ? (
                    <span className="v22State warning">
                      Aktion nötig
                    </span>
                  ) : readyForReviewListings.length > 0 ? (
                    <span className="v22State ready">
                      Bereit
                    </span>
                  ) : (
                    <span className="v22State neutral">
                      Alles erledigt
                    </span>
                  )}
                </div>


                {primaryActionListing ? (
                  <>
                    <p>
                      {actionNeededListings.some(
                        (listing) =>
                          listing.id ===
                          primaryActionListing.id
                      )
                        ? "Dieses Objekt benötigt noch einen Schritt, bevor es vollständig vorbereitet ist."
                        : "Dieses Objektpaket ist vorbereitet und kann als Nächstes geprüft werden."}
                    </p>

                    <div className="v22ActionMeta">
                      <span>
                        {primaryActionListing.postalCode
                          ? `${primaryActionListing.postalCode} `
                          : ""}
                        {primaryActionListing.location}
                      </span>

                      <span>
                        {primaryActionListing.rooms ?? "–"} Zi.
                      </span>

                      <span>
                        {primaryActionListing.livingArea !== null
                          ? `${primaryActionListing.livingArea} m²`
                          : "– m²"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p>
                    Aktuell ist kein aktives Objekt offen. Du kannst direkt ein neues Projekt starten.
                  </p>
                )}


                <Link
                  href={primaryActionHref}
                  className="v22PrimaryAction"
                >
                  {primaryActionLabel}
                  <span>
                    →
                  </span>
                </Link>
              </article>


              <article className="v22ActivityCard">
                <div className="v22CardTitle">
                  <div>
                    <span className="v2Eyebrow dark">
                      AKTIVITÄT
                    </span>

                    <h3>
                      Was passiert gerade?
                    </h3>
                  </div>

                  {unreadActivityCount > 0 && (
                    <span className="v22ActivityBadge">
                      {unreadActivityCount} neu
                    </span>
                  )}
                </div>


                {dailyActivityLoading ? (
                  <div className="v22ActivityEmpty">
                    Aktivitäten werden geladen…
                  </div>
                ) : dailyActivityError ? (
                  <div className="v22ActivityEmpty error">
                    {dailyActivityError}
                  </div>
                ) : marketActivityItems.length === 0 ? (
                  <div className="v22ActivityEmpty">
                    Heute gibt es noch keine neue Objektaktivität.
                  </div>
                ) : (
                  <div className="v22ActivityList">
                    {marketActivityItems.map(
                      (item) => (
                        <Link
                          key={
                            item.listingId +
                            "-" +
                            item.latestAt
                          }
                          href={
                            item.href ||
                            `/cockpit/${item.listingId}`
                          }
                          className="v22ActivityRow"
                        >
                          <span className="v22ActivityDot">
                            ◉
                          </span>

                          <span className="v22ActivityText">
                            <strong>
                              {item.listingLabel}
                            </strong>

                            <small>
                              {item.count} Aufruf{item.count === 1 ? "" : "e"}
                              {item.location
                                ? ` · ${item.location}`
                                : ""}
                            </small>
                          </span>

                          <span className="v22ActivityArrow">
                            →
                          </span>
                        </Link>
                      )
                    )}
                  </div>
                )}
              </article>
            </div>
          </section>


          {/* COMPACT_COCKPIT_V24
    Alte KPI-Reihe entfernt:
    Daily Cockpit enthält diese Informationen bereits.
*/}

          <BatchPublishingV23
            listings={marketListings}
          />


          <details className="v24Section">
            <summary className="v24SectionSummary">
              <div>
                <span className="v24Icon">
                  ↗
                </span>

                <span>
                  <strong>
                    Performance
                  </strong>

                  <small>
                    Aufrufe, Besucher und Entwicklung
                  </small>
                </span>
              </div>

              <span className="v24Open">
                Anzeigen
              </span>
            </summary>

            <div className="v24SectionBody">
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
            </div>
          </details>

          <details className="v25Fold">
            <summary className="v25FoldSummary">
              <div>
                <span className="v25FoldIcon">
                  ▣
                </span>

                <span>
                  <strong>
                    Meine Objekte
                  </strong>

                  <small>
                    {activeCount} aktiv · Objekte und Papierkorb
                  </small>
                </span>
              </div>

              <span className="v25FoldAction">
                Anzeigen
              </span>
            </summary>

            <div className="v25FoldBody">
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

                            <div className="v2ObjectHeaderActions">

                              <button
                                type="button"
                                className={
                                  objectView ===
                                    "trash"
                                    ? "v2TrashToggle active"
                                    : "v2TrashToggle"
                                }
                                onClick={() => {

                                  const nextView =
                                    objectView ===
                                      "active"
                                      ? "trash"
                                      : "active";

                                  setObjectView(
                                    nextView
                                  );

                                  setShowAll(
                                    nextView ===
                                      "trash"
                                  );

                                  setListingActionMessage(
                                    ""
                                  );

                                  setListingActionError(
                                    false
                                  );
                                }}
                              >
                                <span aria-hidden="true">
                                  {objectView ===
                                    "trash"
                                    ? "←"
                                    : "🗑"}
                                </span>

                                {objectView ===
                                  "trash"
                                  ? trashLabels.objects
                                  : `${trashLabels.trash} (${archivedCount})`}
                              </button>


                              {objectView ===
                                "active" &&
                                filteredListings.length >
                                  3 && (
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
                          </div>

                          {listingActionMessage && (
                            <div
                              className={
                                listingActionError
                                  ? "v2TrashMessage error"
                                  : "v2TrashMessage"
                              }
                              role="status"
                            >
                              {listingActionMessage}
                            </div>
                          )}


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
                              {objectView ===
                                "trash"
                                ? trashLabels.empty
                                : labels.empty}
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
                                    <article
                                      key={listing.id}
                                      className="v2PropertyCardWrap"
                                    >
                                      <Link
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


                                    <button
                                      type="button"
                                      className={
                                        objectView ===
                                          "trash"
                                          ? "v2ListingAction restore"
                                          : "v2ListingAction trash"
                                      }
                                      disabled={
                                        listingActionId ===
                                        listing.id
                                      }
                                      aria-label={
                                        objectView ===
                                          "trash"
                                          ? trashLabels.restore
                                          : trashLabels.move
                                      }
                                      title={
                                        objectView ===
                                          "trash"
                                          ? trashLabels.restore
                                          : trashLabels.move
                                      }
                                      onClick={() => {

                                        if (
                                          objectView ===
                                          "trash"
                                        ) {
                                          void setListingArchived(
                                            listing,
                                            false
                                          );

                                          return;
                                        }


                                        setTrashConfirmListing(
                                          listing
                                        );
                                      }}
                                    >
                                      {listingActionId ===
                                      listing.id
                                        ? "…"
                                        : objectView ===
                                            "trash"
                                          ? "↶"
                                          : "🗑"}
                                    </button>

                                  </article>
                                  );
                                }
                              )}

                              {!showAll &&
                                objectView ===
                                  "active" && (
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
            </div>
          </details>

          <details className="v25Fold">
            <summary className="v25FoldSummary">
              <div>
                <span className="v25FoldIcon">
                  ⚡
                </span>

                <span>
                  <strong>
                    Schnellzugriff
                  </strong>

                  <small>
                    Inserat · Bilder · Social · Marketing
                  </small>
                </span>
              </div>

              <span className="v25FoldAction">
                Anzeigen
              </span>
            </summary>

            <div className="v25FoldBody v25QuickBody">
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
            </div>
          </details>
          {marketResolved ? (
            <div
              id="portale"
              style={{
                paddingTop: 34,
                scrollMarginTop: 24,
              }}
            >
              {/* PREMIUM_PORTALS_V26 */}
              <details className="v26PortalFold">
                <summary className="v26PortalSummary">
                  <div>
                    <span className="v26PortalIcon">
                      ⇄
                    </span>

                    <span>
                      <strong>
                        Portal-Verbindungen
                      </strong>

                      <small>
                        Freigaben und technische Details
                      </small>
                    </span>
                  </div>

                  <span className="v26PortalOpen">
                    Portale verwalten
                  </span>
                </summary>

                {/* MOCKUP_MATCH_V28 */}
                <div
                  className="v28PortalLogoStrip"
                  aria-label="Immobilienportale"
                >
                  <div className="v28PortalLogoTile">
                    <span className="v28Scout">
                      <b>Immo</b>
                      <span>Scout24</span>
                    </span>
                  </div>


                  <div className="v28PortalLogoTile">
                    <span className="v28Homegate">
                      <b>✕</b>
                      <span>homegate</span>
                    </span>
                  </div>


                  <div className="v28PortalLogoTile">
                    <span className="v28Immowelt">
                      <b>immo</b>
                      <span>welt</span>
                    </span>
                  </div>


                  <div className="v28PortalLogoTile">
                    <span className="v28Kleinanzeigen">
                      <b>♧</b>
                      <span>kleinanzeigen</span>
                    </span>
                  </div>


                  <div className="v28PortalLogoTile">
                    <span className="v28Comparis">
                      <b>✓</b>
                      <span>comparis</span>
                    </span>
                  </div>
                </div>


                <div className="v26PortalBody">
                  <PortalConnectionsCard
                    market={market}
                  />
                </div>
              </details>
            </div>
          ) : null}
        </main>
      </div>

      <style jsx>{`
        /*
         * ONE_SCREEN_COCKPIT_V25
         */

        .v25MiniHero {
          display: flex;
          min-height: 82px;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 20px;
          border: 1px solid rgba(36, 92, 151, .18);
          border-radius: 16px;
          background:
            linear-gradient(
              125deg,
              #07192e 0%,
              #0d2c50 65%,
              #173a5e 100%
            );
          box-shadow:
            0 12px 30px
            rgba(15, 23, 42, .10);
        }

        .v25MiniHeroIdentity {
          min-width: 0;
        }

        .v25MiniEyebrow {
          display: block;
          margin-bottom: 5px;
          color: #fbbf24;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .13em;
        }

        .v25MiniTitle {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 10px;
        }

        .v25MiniTitle h1 {
          margin: 0;
          overflow: hidden;
          color: #fff;
          font-size: clamp(
            18px,
            2vw,
            25px
          );
          font-weight: 700;
          letter-spacing: -.025em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v25ActiveBadge {
          flex: 0 0 auto;
          padding: 5px 8px;
          border: 1px solid rgba(134,239,172,.18);
          border-radius: 999px;
          background: rgba(34,197,94,.10);
          color: #86efac;
          font-size: 8px;
          font-weight: 900;
        }

        .v25MiniActions {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 7px;
        }

        .v25MiniPrimary,
        .v25MiniSecondary {
          display: inline-flex;
          min-height: 37px;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          border-radius: 9px;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
        }

        .v25MiniPrimary {
          background:
            linear-gradient(
              135deg,
              #ffd84d,
              #f7b928
            );
          color: #172033;
        }

        .v25MiniSecondary {
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.055);
          color: #dbeafe;
        }

        .v25Fold {
          margin-top: 10px;
          overflow: hidden;
          border: 1px solid #dce5ef;
          border-radius: 14px;
          background: #fff;
        }

        .v25FoldSummary {
          display: flex;
          min-height: 58px;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 14px;
          cursor: pointer;
          list-style: none;
        }

        .v25FoldSummary::-webkit-details-marker {
          display: none;
        }

        .v25FoldSummary > div {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 10px;
        }

        .v25FoldSummary > div > span:last-child {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .v25FoldSummary strong {
          color: #0f172a;
          font-size: 11px;
        }

        .v25FoldSummary small {
          margin-top: 2px;
          color: #94a3b8;
          font-size: 8px;
        }

        .v25FoldIcon {
          display: grid;
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          place-items: center;
          border-radius: 9px;
          background: #eef4fb;
          color: #173c69;
          font-size: 11px;
          font-weight: 950;
        }

        .v25FoldAction {
          flex: 0 0 auto;
          color: #64748b;
          font-size: 8px;
          font-weight: 850;
        }

        .v25Fold[open]
          .v25FoldAction::after {
          content: " · geöffnet";
        }

        .v25FoldBody {
          padding: 0 14px 14px;
        }

        .v25FoldBody
          .v2Objects,
        .v25FoldBody
          .v2QuickSection {
          padding-top: 4px !important;
        }

        .v25QuickBody
          .v2QuickGrid a {
          min-height: 70px;
          padding: 10px 12px;
        }

        .v25QuickBody
          .v2QuickGrid a > span {
          width: 30px;
          height: 30px;
          flex-basis: 30px;
          font-size: 14px;
        }

        .v25QuickBody
          .v2QuickGrid small {
          display: none;
        }

        @media (max-width: 700px) {
          .v25MiniHero {
            align-items: stretch;
            flex-direction: column;
          }

          .v25MiniTitle {
            align-items: flex-start;
            flex-direction: column;
          }

          .v25MiniTitle h1 {
            white-space: normal;
          }

          .v25MiniActions {
            width: 100%;
          }

          .v25MiniActions a {
            flex: 1;
          }
        }

        .v2Shell {
          min-height: 100vh;
          background: #eef3f9;
          color: #0f172a;
          font-family: inherit;
        }


        .v2PortalNavGroup {
          display: flex;
          flex-direction: column;
        }

        .v2PortalNavToggle {
          width: 100%;
          border: 0;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .v2PortalNavArrow {
          margin-left: auto;
          font-size: 20px;
          line-height: 1;
          transition:
            transform 160ms ease;
        }

        .v2PortalNavArrow.open {
          transform:
            rotate(90deg);
        }

        .v2PortalSubnav {
          display: flex;
          flex-direction: column;
          margin:
            2px 0 8px 36px;
          padding:
            3px 0 5px 13px;
          border-left:
            1px solid
            rgba(103, 232, 249, 0.18);
        }

        .v2PortalCountry {
          padding:
            5px 8px 6px;
          color:
            #71869d;
          font-size:
            10px;
          font-weight:
            800;
          letter-spacing:
            0.08em;
        }

        .v2PortalSubitem {
          display: block;
          padding:
            6px 8px;
          border-radius:
            7px;
          color:
            #aebfd1;
          font-size:
            12px;
          font-weight:
            650;
          text-decoration:
            none;
        }

        .v2PortalSubitem:hover {
          background:
            rgba(103, 232, 249, 0.07);
          color:
            #ffffff;
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
          width: min(1540px, 100%);
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

        /*
         * DAILY_COCKPIT_V22
         */
        /*
         * COMPACT_COCKPIT_V24
         */

        .v2Hero {
          min-height: 0 !important;
          padding-top: 28px !important;
          padding-bottom: 28px !important;
        }

        .v2Hero h1 {
          margin-bottom: 8px !important;
        }

        .v22Daily {
          margin-top: 14px !important;
          padding: 18px !important;
        }

        .v22DailyHeader {
          margin-bottom: 14px !important;
        }

        .v22DailyHeader h2 {
          font-size: 20px !important;
        }

        .v22KpiGrid {
          gap: 8px !important;
        }

        .v22KpiGrid article {
          padding: 10px 12px !important;
          min-height: 62px;
        }

        .v22KpiGrid strong {
          font-size: 19px !important;
        }

        .v22DailyMain {
          margin-top: 9px !important;
          gap: 9px !important;
        }

        .v22NextAction,
        .v22ActivityCard {
          padding: 13px !important;
        }

        .v24Section {
          margin-top: 12px;
          border: 1px solid #dce5ef;
          border-radius: 14px;
          background: #ffffff;
          overflow: hidden;
        }

        .v24SectionSummary {
          min-height: 60px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          cursor: pointer;
          list-style: none;
        }

        .v24SectionSummary::-webkit-details-marker {
          display: none;
        }

        .v24SectionSummary > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .v24SectionSummary > div > span:last-child {
          display: flex;
          flex-direction: column;
        }

        .v24SectionSummary strong {
          color: #0f172a;
          font-size: 11px;
        }

        .v24SectionSummary small {
          margin-top: 2px;
          color: #94a3b8;
          font-size: 8px;
        }

        .v24Icon {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 9px;
          background: #eef4fb;
          color: #173c69;
          font-size: 12px;
          font-weight: 900;
        }

        .v24Open {
          color: #64748b;
          font-size: 9px;
          font-weight: 850;
        }

        .v24Section[open]
          .v24Open::after {
          content: " · geöffnet";
        }

        .v24SectionBody {
          padding: 0 12px 12px;
        }

        .v22Daily {
          margin-top: 22px;
          padding: 24px;
          border: 1px solid #dce5f0;
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f8fbff
            );
          box-shadow:
            0 16px 36px
            rgba(15, 23, 42, .06);
        }

        .v22DailyHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .v22DailyHeader h2 {
          margin: 0;
          color: #0f172a;
          font-size: 24px;
          letter-spacing: -.025em;
        }

        .v22DailyHeader p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .v22NewObject {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 15px;
          border-radius: 10px;
          background:
            linear-gradient(
              135deg,
              #ffd84d,
              #f7b928
            );
          color: #172033;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
          box-shadow:
            0 10px 22px
            rgba(245, 183, 37, .20);
        }

        .v22KpiGrid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 10px;
        }

        .v22KpiGrid article {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 11px;
          padding: 14px;
          border:
            1px solid #e3eaf2;
          border-radius: 13px;
          background: #fff;
        }

        .v22KpiGrid article > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .v22KpiGrid strong {
          color: #0f172a;
          font-size: 22px;
          line-height: 1;
        }

        .v22KpiGrid span:not(.v22KpiIcon) {
          margin-top: 4px;
          color: #334155;
          font-size: 11px;
          font-weight: 850;
        }

        .v22KpiGrid small {
          margin-top: 2px;
          overflow: hidden;
          color: #94a3b8;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v22KpiIcon {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          place-items: center;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 950;
        }

        .v22KpiIcon.blue {
          background: #e8f2ff;
          color: #2563eb;
        }

        .v22KpiIcon.green {
          background: #eaf9f0;
          color: #16a34a;
        }

        .v22KpiIcon.gold {
          background: #fff7dc;
          color: #d97706;
        }

        .v22KpiIcon.violet {
          background: #f1ecff;
          color: #7c3aed;
        }

        .v22DailyMain {
          display: grid;
          grid-template-columns:
            minmax(0, 1.15fr)
            minmax(320px, .85fr);
          gap: 12px;
          margin-top: 12px;
        }

        .v22NextAction,
        .v22ActivityCard {
          padding: 17px;
          border:
            1px solid #e3eaf2;
          border-radius: 14px;
          background: #fff;
        }

        .v22CardTitle {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .v22CardTitle h3 {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
          line-height: 1.2;
        }

        .v22State,
        .v22ActivityBadge {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
        }

        .v22State.warning {
          background: #fff7dc;
          color: #b45309;
        }

        .v22State.ready {
          background: #eaf9f0;
          color: #15803d;
        }

        .v22State.neutral {
          background: #eef2f7;
          color: #64748b;
        }

        .v22ActivityBadge {
          background: #e8f2ff;
          color: #2563eb;
        }

        .v22NextAction > p {
          margin: 12px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.55;
        }

        .v22ActionMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .v22ActionMeta span {
          padding: 5px 8px;
          border:
            1px solid #e5eaf0;
          border-radius: 8px;
          background: #f8fafc;
          color: #475569;
          font-size: 9px;
          font-weight: 750;
        }

        .v22PrimaryAction {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 14px;
          padding: 0 14px;
          border-radius: 9px;
          background: #0b2748;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
        }

        .v22PrimaryAction span {
          color: #fbbf24;
        }

        .v22ActivityList {
          display: flex;
          flex-direction: column;
          margin-top: 10px;
        }

        .v22ActivityRow {
          display: flex;
          min-height: 48px;
          align-items: center;
          gap: 9px;
          padding: 8px 4px;
          border-bottom:
            1px solid #edf1f5;
          color: inherit;
          text-decoration: none;
        }

        .v22ActivityRow:last-child {
          border-bottom: 0;
        }

        .v22ActivityDot {
          color: #2563eb;
          font-size: 11px;
        }

        .v22ActivityText {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
        }

        .v22ActivityText strong {
          overflow: hidden;
          color: #0f172a;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v22ActivityText small {
          margin-top: 2px;
          overflow: hidden;
          color: #94a3b8;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .v22ActivityArrow {
          color: #94a3b8;
          font-size: 12px;
        }

        .v22ActivityEmpty {
          margin-top: 10px;
          padding: 16px;
          border-radius: 10px;
          background: #f8fafc;
          color: #64748b;
          font-size: 10px;
          text-align: center;
        }

        .v22ActivityEmpty.error {
          background: #fff1f2;
          color: #be123c;
        }

        @media (max-width: 1050px) {
          .v22KpiGrid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .v22DailyMain {
            grid-template-columns:
              1fr;
          }
        }

        @media (max-width: 640px) {
          .v22Daily {
            padding: 16px;
          }

          .v22DailyHeader {
            flex-direction: column;
          }

          .v22NewObject {
            width: 100%;
          }

          .v22KpiGrid {
            grid-template-columns:
              1fr;
          }
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

        .iaTrashConfirmBackdrop {
          position: fixed;
          z-index: 10000;
          inset: 0;

          display: grid;
          place-items: center;

          padding: 24px;

          background:
            rgba(2, 6, 23, 0.72);

          backdrop-filter:
            blur(12px);
        }

        .iaTrashConfirmDialog {
          position: relative;

          width:
            min(460px, 100%);

          overflow: hidden;

          padding:
            26px;

          border:
            1px solid
            rgba(251, 191, 36, 0.28);

          border-radius:
            24px;

          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(37, 99, 235, 0.22),
              transparent 35%
            ),
            linear-gradient(
              145deg,
              #07111f 0%,
              #0b1b31 55%,
              #111827 100%
            );

          color:
            #ffffff;

          box-shadow:
            0 36px 90px
            rgba(0, 0, 0, 0.52),
            inset 0 1px 0
            rgba(255,255,255,.06);

          animation:
            iaTrashModalIn
            180ms ease-out;
        }

        .iaTrashConfirmGlow {
          position: absolute;

          right: -80px;
          bottom: -110px;

          width: 240px;
          height: 240px;

          border-radius: 50%;

          background:
            rgba(249, 115, 22, 0.18);

          filter:
            blur(38px);

          pointer-events: none;
        }

        .iaTrashConfirmBrand {
          position: relative;
          z-index: 1;

          display: flex;
          align-items: center;

          gap: 11px;
        }

        .iaTrashConfirmMark {
          display: grid;

          width: 42px;
          height: 42px;

          place-items: center;

          border:
            1px solid
            rgba(251,191,36,.35);

          border-radius:
            13px;

          background:
            linear-gradient(
              145deg,
              rgba(251,191,36,.18),
              rgba(249,115,22,.09)
            );

          color:
            #fbbf24;
        }

        .iaTrashConfirmMark svg {
          width: 23px;
          height: 23px;

          fill: none;

          stroke:
            currentColor;

          stroke-width:
            1.8;

          stroke-linecap:
            round;

          stroke-linejoin:
            round;
        }

        .iaTrashConfirmBrand > div {
          display: flex;

          flex-direction:
            column;
        }

        .iaTrashConfirmBrand div span {
          color:
            #67e8f9;

          font-size:
            9px;

          font-weight:
            900;

          letter-spacing:
            .13em;
        }

        .iaTrashConfirmBrand strong {
          margin-top: 2px;

          font-size:
            15px;

          letter-spacing:
            -.01em;
        }

        .iaTrashConfirmIcon {
          position: relative;
          z-index: 1;

          display: grid;

          width: 64px;
          height: 64px;

          place-items: center;

          margin-top:
            26px;

          border:
            1px solid
            rgba(248,113,113,.25);

          border-radius:
            20px;

          background:
            rgba(239,68,68,.09);

          color:
            #fca5a5;
        }

        .iaTrashConfirmIcon svg {
          width: 29px;
          height: 29px;

          fill: none;

          stroke:
            currentColor;

          stroke-width:
            1.7;

          stroke-linecap:
            round;

          stroke-linejoin:
            round;
        }

        .iaTrashConfirmCopy {
          position: relative;
          z-index: 1;

          margin-top:
            20px;
        }

        .iaTrashConfirmCopy h2 {
          margin: 0;

          color:
            #ffffff;

          font-size:
            25px;

          letter-spacing:
            -.035em;
        }

        .iaTrashObjectName {
          display: block;

          margin-top:
            10px;

          color:
            #fbbf24;

          font-size:
            14px;
        }

        .iaTrashConfirmCopy p {
          margin:
            10px 0 0;

          color:
            rgba(226,232,240,.72);

          font-size:
            13px;

          line-height:
            1.6;
        }

        .iaTrashSafety {
          position: relative;
          z-index: 1;

          display: flex;
          align-items: center;

          gap: 9px;

          margin-top:
            20px;

          padding:
            11px 13px;

          border:
            1px solid
            rgba(34,197,94,.16);

          border-radius:
            12px;

          background:
            rgba(34,197,94,.07);
        }

        .iaTrashSafety > span {
          display: grid;

          width: 22px;
          height: 22px;

          place-items: center;

          flex:
            0 0 22px;

          border-radius:
            50%;

          background:
            rgba(34,197,94,.14);

          color:
            #86efac;

          font-size:
            11px;

          font-weight:
            900;
        }

        .iaTrashSafety p {
          margin: 0;

          color:
            #bbf7d0;

          font-size:
            11px;

          font-weight:
            700;

          line-height:
            1.45;
        }

        .iaTrashConfirmActions {
          position: relative;
          z-index: 1;

          display: grid;

          grid-template-columns:
            1fr 1.35fr;

          gap: 10px;

          margin-top:
            24px;
        }

        .iaTrashConfirmActions button {
          min-height:
            48px;

          border-radius:
            13px;

          cursor:
            pointer;

          font:
            inherit;

          font-size:
            12px;

          font-weight:
            900;

          transition:
            transform 140ms ease,
            box-shadow 140ms ease;
        }

        .iaTrashConfirmActions button:hover {
          transform:
            translateY(-1px);
        }

        .iaTrashCancel {
          border:
            1px solid
            rgba(255,255,255,.13);

          background:
            rgba(255,255,255,.055);

          color:
            #cbd5e1;
        }

        .iaTrashConfirm {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 8px;

          border:
            1px solid
            rgba(251,191,36,.44);

          background:
            linear-gradient(
              135deg,
              #f5b914,
              #f59e0b 54%,
              #f97316
            );

          color:
            #07111f;

          box-shadow:
            0 12px 26px
            rgba(249,115,22,.18);
        }

        @keyframes iaTrashModalIn {
          from {
            opacity: 0;

            transform:
              translateY(8px)
              scale(.985);
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        @media (max-width: 520px) {
          .iaTrashConfirmDialog {
            padding: 21px;
          }

          .iaTrashConfirmActions {
            grid-template-columns:
              1fr;
          }
        }


        .v2ObjectHeaderActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .v2TrashToggle {
          display: inline-flex !important;
          min-height: 34px;
          align-items: center;
          gap: 7px !important;
          padding: 0 11px !important;
          border:
            1px solid #d8e1eb !important;
          border-radius: 9px;
          background:
            #ffffff !important;
          color:
            #475569 !important;
          box-shadow:
            0 4px 12px
            rgba(15,23,42,.04);
        }

        .v2TrashToggle.active {
          border-color:
            rgba(239,68,68,.26) !important;
          background:
            #fff7f7 !important;
          color:
            #b42318 !important;
        }

        .v2TrashMessage {
          margin: -3px 0 13px;
          padding: 10px 13px;
          border:
            1px solid
            rgba(34,197,94,.2);
          border-radius: 9px;
          background:
            rgba(34,197,94,.07);
          color: #16794b;
          font-size: 11px;
          font-weight: 750;
        }

        .v2TrashMessage.error {
          border-color:
            rgba(239,68,68,.22);
          background:
            rgba(239,68,68,.07);
          color: #b42318;
        }

        .v2PropertyGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 13px;
        }

        .v2PropertyCardWrap {
          position: relative;
          min-width: 0;
        }

        .v2PropertyCard {
          display: block;
          height: 100%;
        }

        .v2ListingAction {
          position: absolute;
          z-index: 6;
          top: 10px;
          right: 10px;

          display: grid;
          width: 33px;
          height: 33px;
          place-items: center;

          padding: 0;
          border-radius: 10px;

          cursor: pointer;

          font-size: 14px;
          font-weight: 900;

          box-shadow:
            0 6px 16px
            rgba(15,23,42,.16);

          transition:
            transform 140ms ease,
            opacity 140ms ease;
        }

        .v2ListingAction:hover {
          transform:
            scale(1.07);
        }

        .v2ListingAction:disabled {
          cursor: wait;
          opacity: .55;
        }

        .v2ListingAction.trash {
          border:
            1px solid
            rgba(239,68,68,.26);
          background:
            rgba(255,255,255,.96);
          color:
            #dc2626;
        }

        .v2ListingAction.restore {
          border:
            1px solid
            rgba(34,197,94,.3);
          background:
            rgba(255,255,255,.96);
          color:
            #15803d;
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

        /*
         * ========================================
         * PREMIUM_COCKPIT_V26
         * ========================================
         */

        .v2Shell,
        .v2Content {
          background:
            linear-gradient(
              180deg,
              #f8fbff 0%,
              #edf4fa 100%
            ) !important;
        }


        .v26PremiumHero {
          position: relative;
          display: grid;
          min-height: 150px;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(410px, .85fr);
          align-items: center;
          gap: 24px;
          overflow: hidden;
          padding: 24px 30px;
          border:
            1px solid
            rgba(14,116,144,.16);
          border-radius: 22px;
          background:
            radial-gradient(
              circle at 72% 20%,
              rgba(34,211,238,.27),
              transparent 27%
            ),
            linear-gradient(
              115deg,
              #07182c 0%,
              #07375d 52%,
              #0582a6 100%
            );
          box-shadow:
            0 18px 42px
            rgba(15,48,81,.15);
        }


        .v26PremiumHero::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              115deg,
              transparent 45%,
              rgba(255,255,255,.065) 45.2%,
              transparent 72%
            );
        }


        .v26HeroCopy,
        .v26HeroRight {
          position: relative;
          z-index: 2;
        }


        .v26HeroEyebrow {
          display: block;
          margin-bottom: 8px;
          color: #ffd34a;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .16em;
        }


        .v26HeroTitleRow {
          display: flex;
          align-items: center;
          gap: 11px;
        }


        .v26HeroTitleRow h1 {
          margin: 0;
          color: #fff;
          font-size:
            clamp(
              24px,
              2.5vw,
              38px
            );
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -.035em;
        }


        .v26HeroCopy > p {
          margin: 10px 0 0;
          color: rgba(235,246,255,.84);
          font-size: 12px;
        }


        .v26HeroStatus {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border:
            1px solid
            rgba(74,222,128,.28);
          border-radius: 999px;
          background:
            rgba(22,163,74,.18);
          color: #a7f3c1;
          font-size: 8px;
          font-weight: 900;
        }


        .v26HeroStatus > span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow:
            0 0 9px
            rgba(74,222,128,.8);
        }


        .v26HeroRight {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 20px;
        }


        .v26HeroScene {
          position: relative;
          width: 220px;
          height: 98px;
          overflow: hidden;
        }


        .v26HeroScene > span {
          position: relative;
          z-index: 5;
          display: block;
          margin-top: 7px;
          color: rgba(255,255,255,.9);
          font-family:
            Georgia,
            serif;
          font-size: 18px;
          font-style: italic;
          line-height: 1.25;
          transform:
            rotate(-4deg);
        }


        .v26Mountain {
          position: absolute;
          bottom: -16px;
          clip-path:
            polygon(
              50% 0,
              100% 100%,
              0 100%
            );
        }


        .v26MountainBack {
          right: 77px;
          width: 125px;
          height: 70px;
          background:
            linear-gradient(
              135deg,
              #d8f6ff,
              #2f849f
            );
          opacity: .6;
        }


        .v26MountainFront {
          right: 4px;
          width: 145px;
          height: 90px;
          background:
            linear-gradient(
              135deg,
              #f4fbff 0%,
              #91d8e9 38%,
              #146f8c 75%
            );
        }


        .v26SwissFlag {
          position: absolute;
          z-index: 6;
          right: 25px;
          bottom: 29px;
          display: grid;
          width: 21px;
          height: 21px;
          place-items: center;
          border-radius: 4px;
          background: #e31b23;
          color: #fff;
          font-size: 15px;
          font-weight: 950;
        }


        .v26HeroActions {
          display: flex;
          width: 170px;
          flex: 0 0 170px;
          flex-direction: column;
          gap: 8px;
        }


        .v26HeroPrimary,
        .v26HeroSecondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 950;
        }


        .v26HeroPrimary {
          min-height: 50px;
          gap: 7px;
          background:
            linear-gradient(
              135deg,
              #ffd64d,
              #ff9f1c
            );
          color: #172033;
          font-size: 11px;
          box-shadow:
            0 12px 28px
            rgba(255,159,28,.30);
        }


        .v26HeroPrimary > span {
          display: grid;
          width: 27px;
          height: 27px;
          place-items: center;
          border-radius: 8px;
          background: rgba(17,24,39,.15);
          font-size: 16px;
        }


        .v26HeroSecondary {
          min-height: 29px;
          border:
            1px solid
            rgba(255,255,255,.15);
          background:
            rgba(255,255,255,.06);
          color: #dcecff;
          font-size: 8px;
        }


        .v22Daily {
          margin-top: 14px !important;
          padding: 20px !important;
          border:
            1px solid
            #e5edf5 !important;
          border-radius:
            22px !important;
          background:
            linear-gradient(
              180deg,
              #fff,
              #fcfdff
            ) !important;
          box-shadow:
            0 14px 36px
            rgba(31,62,91,.06) !important;
        }


        .v22DailyHeader {
          align-items: center !important;
          margin-bottom: 16px !important;
        }


        .v22DailyHeader h2 {
          color: #10233e !important;
          font-size: 20px !important;
          font-weight: 800 !important;
        }


        .v22DailyHeader p {
          color: #75869b !important;
        }


        .v26TodayStatus {
          display: flex;
          align-items: center;
          gap: 9px;
          padding-left: 18px;
          border-left:
            1px solid #e5ebf2;
        }


        .v26TodayStatus > span:last-child {
          display: flex;
          flex-direction: column;
        }


        .v26TodayStatus strong {
          color: #233b59;
          font-size: 10px;
        }


        .v26TodayStatus small {
          margin-top: 2px;
          color: #8a98aa;
          font-size: 8px;
        }


        .v26TodaySun {
          color: #ffab1a;
          font-size: 22px;
        }


        .v22KpiGrid {
          gap: 10px !important;
        }


        .v22KpiGrid article {
          min-height: 84px !important;
          padding: 13px !important;
          border-radius: 14px !important;
          box-shadow: none !important;
        }


        .v22KpiGrid article:nth-child(1) {
          border-color:
            #d7e8ff !important;
          background:
            linear-gradient(
              135deg,
              #f7faff,
              #edf5ff
            ) !important;
        }


        .v22KpiGrid article:nth-child(2) {
          border-color:
            #d8f0e2 !important;
          background:
            linear-gradient(
              135deg,
              #f7fdf9,
              #edf9f3
            ) !important;
        }


        .v22KpiGrid article:nth-child(3) {
          border-color:
            #f7dfbd !important;
          background:
            linear-gradient(
              135deg,
              #fffaf3,
              #fff3e2
            ) !important;
        }


        .v22KpiGrid article:nth-child(4) {
          border-color:
            #eadfff !important;
          background:
            linear-gradient(
              135deg,
              #fbf9ff,
              #f3edff
            ) !important;
        }


        .v22KpiIcon {
          width: 40px !important;
          height: 40px !important;
          flex-basis: 40px !important;
          border-radius: 50% !important;
          font-size: 16px !important;
        }


        .v22KpiIcon.blue {
          background: #dcecff !important;
          color: #1677e8 !important;
        }


        .v22KpiIcon.green {
          background: #d9f5e5 !important;
          color: #20a35a !important;
        }


        .v22KpiIcon.gold {
          background: #ffe8c5 !important;
          color: #e9790c !important;
        }


        .v22KpiIcon.violet {
          background: #eadfff !important;
          color: #8b4de8 !important;
        }


        .v22KpiGrid strong {
          color: #10233e !important;
          font-size: 21px !important;
          font-weight: 850 !important;
        }


        .v22NextAction,
        .v22ActivityCard {
          min-height: 150px;
          padding: 16px !important;
          border:
            1px solid
            #e5edf6 !important;
          border-radius: 16px !important;
          background: #fff !important;
          box-shadow:
            0 6px 18px
            rgba(31,62,91,.035);
        }


        .v22CardTitle h3 {
          color: #10233e !important;
          font-size: 16px !important;
        }


        .v22PrimaryAction {
          min-height: 35px !important;
          border-radius: 9px !important;
          background:
            linear-gradient(
              135deg,
              #1677e8,
              #075fbd
            ) !important;
          box-shadow:
            0 7px 16px
            rgba(22,119,232,.20);
        }


        .v22State.warning {
          background: #fff2db !important;
          color: #dc7200 !important;
        }


        .v22ActivityEmpty {
          background:
            linear-gradient(
              180deg,
              #f8fbff,
              #f3f8fc
            ) !important;
          color: #708299 !important;
        }


        .v24Section,
        .v25Fold,
        .v26PortalFold {
          border:
            1px solid
            #e2eaf3 !important;
          border-radius: 15px !important;
          background: #fff !important;
          box-shadow:
            0 8px 22px
            rgba(31,62,91,.04);
        }


        .v26PortalFold {
          margin-top: 10px;
          overflow: hidden;
        }


        .v26PortalSummary {
          display: flex;
          min-height: 62px;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 11px 15px;
          cursor: pointer;
          list-style: none;
        }


        .v26PortalSummary::-webkit-details-marker {
          display: none;
        }


        .v26PortalSummary > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }


        .v26PortalSummary > div > span:last-child {
          display: flex;
          flex-direction: column;
        }


        .v26PortalSummary strong {
          color: #10233e;
          font-size: 11px;
        }


        .v26PortalSummary small {
          margin-top: 2px;
          color: #8a98aa;
          font-size: 8px;
        }


        .v26PortalIcon {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          border-radius: 10px;
          background: #e8f3ff;
          color: #1677e8;
          font-size: 15px;
          font-weight: 950;
        }


        .v26PortalOpen {
          color: #1677e8;
          font-size: 8px;
          font-weight: 900;
        }


        .v26PortalBody {
          padding: 0 12px 12px;
        }


        @media (max-width: 1100px) {

          .v26PremiumHero {
            grid-template-columns: 1fr;
          }


          .v26HeroRight {
            justify-content: space-between;
          }
        }


        @media (max-width: 720px) {

          .v26PremiumHero {
            padding: 18px;
          }


          .v26HeroTitleRow {
            align-items: flex-start;
            flex-direction: column;
          }


          .v26HeroRight {
            align-items: stretch;
            flex-direction: column;
          }


          .v26HeroScene {
            display: none;
          }


          .v26HeroActions {
            width: 100%;
          }


          .v26TodayStatus {
            display: none;
          }
        }


        /*
         * ========================================
         * MOCKUP_MATCH_V27
         * final visual overrides
         * ========================================
         */


        /*
         * TOP TOOLBAR
         */

        .v2Topbar {
          min-height: 72px !important;
          padding:
            13px 28px !important;
          border-bottom:
            1px solid #e6edf5 !important;
          background:
            rgba(
              255,
              255,
              255,
              .98
            ) !important;
          box-shadow:
            0 4px 18px
            rgba(15,43,72,.045) !important;
          backdrop-filter:
            blur(16px);
        }


        .v2Search {
          width:
            min(
              590px,
              57vw
            ) !important;
          min-height:
            46px !important;
          padding:
            0 16px !important;
          border:
            1px solid
            #dde7f1 !important;
          border-radius:
            13px !important;
          background:
            #ffffff !important;
          box-shadow:
            0 6px 18px
            rgba(29,57,86,.05) !important;
        }


        .v2Search > span {
          color:
            #52708f !important;
        }


        .v2Search input {
          color:
            #182b44 !important;
          font-size:
            12px !important;
        }


        .v2MarketPill,
        .v2TopProfile {
          border-radius:
            12px !important;
          box-shadow:
            0 4px 14px
            rgba(26,58,92,.05);
        }


        /*
         * HERO
         */

        .v26PremiumHero {
          min-height:
            152px !important;

          grid-template-columns:
            minmax(
              0,
              1.45fr
            )
            minmax(
              440px,
              .8fr
            ) !important;

          gap:
            14px !important;

          padding:
            23px 32px !important;

          border-radius:
            22px !important;

          background:
            radial-gradient(
              circle at 74% 18%,
              rgba(73,210,239,.34),
              transparent 27%
            ),
            linear-gradient(
              112deg,
              #061a30 0%,
              #07345a 51%,
              #068aaa 100%
            ) !important;

          box-shadow:
            0 18px 44px
            rgba(16,55,91,.17) !important;
        }


        .v26HeroCopy {
          min-width: 0;
        }


        .v26HeroTitleRow {
          flex-wrap:
            nowrap !important;
        }


        .v26HeroTitleRow h1 {
          max-width:
            none !important;

          color:
            #ffffff !important;

          font-size:
            clamp(
              27px,
              2.45vw,
              38px
            ) !important;

          font-weight:
            800 !important;

          letter-spacing:
            -.035em !important;

          line-height:
            1.04 !important;

          white-space:
            nowrap !important;
        }


        .v26HeroCopy > p {
          margin-top:
            11px !important;

          color:
            rgba(
              241,
              248,
              255,
              .84
            ) !important;

          font-size:
            12px !important;
        }


        .v26HeroRight {
          gap:
            15px !important;
        }


        .v26HeroScene {
          width:
            210px !important;

          height:
            104px !important;
        }


        .v26HeroScene > span {
          margin-top:
            8px !important;

          font-size:
            18px !important;

          text-shadow:
            0 2px 10px
            rgba(3,37,64,.25);
        }


        .v26MountainBack {
          right:
            72px !important;

          bottom:
            -17px !important;

          width:
            135px !important;

          height:
            73px !important;

          opacity:
            .68 !important;
        }


        .v26MountainFront {
          right:
            0 !important;

          bottom:
            -17px !important;

          width:
            152px !important;

          height:
            94px !important;

          filter:
            drop-shadow(
              0 8px 9px
              rgba(4,61,82,.16)
            );
        }


        .v26HeroActions {
          width:
            188px !important;

          flex-basis:
            188px !important;
        }


        .v26HeroPrimary {
          min-height:
            52px !important;

          border-radius:
            13px !important;

          background:
            linear-gradient(
              135deg,
              #ffd44d,
              #ff9e1b
            ) !important;

          color:
            #111827 !important;

          font-size:
            12px !important;

          box-shadow:
            0 13px 30px
            rgba(255,158,27,.34) !important;
        }


        .v26HeroPrimary:hover {
          transform:
            translateY(-1px);

          filter:
            brightness(1.025);
        }


        .v26HeroSecondary {
          color:
            #e7f3ff !important;
        }


        /*
         * DAILY HEADER
         */

        .v22Daily {
          margin-top:
            14px !important;

          padding:
            19px 20px 20px !important;

          border-radius:
            20px !important;

          background:
            #ffffff !important;

          box-shadow:
            0 13px 35px
            rgba(21,57,91,.065) !important;
        }


        .v22DailyHeader {
          min-height:
            50px;

          align-items:
            center !important;
        }


        .v22DailyHeader >
        div:first-child {
          position:
            relative;

          min-height:
            48px;

          padding-left:
            57px;
        }


        .v22DailyHeader >
        div:first-child::before {
          content:
            "▣";

          position:
            absolute;

          top:
            2px;

          left:
            0;

          display:
            grid;

          width:
            43px;

          height:
            43px;

          place-items:
            center;

          border-radius:
            12px;

          background:
            linear-gradient(
              135deg,
              #147fe9,
              #36c8db
            );

          color:
            #ffffff;

          font-size:
            17px;

          font-weight:
            900;

          box-shadow:
            0 7px 18px
            rgba(20,127,233,.22);
        }


        .v22DailyHeader h2 {
          font-size:
            20px !important;

          line-height:
            1.08 !important;
        }


        .v2Eyebrow.dark {
          color:
            #4c6684 !important;
        }


        .v26TodayStatus {
          padding-left:
            22px !important;
        }


        .v26TodaySun {
          font-size:
            25px !important;
        }


        /*
         * KPI CARDS
         */

        .v22KpiGrid {
          gap:
            12px !important;
        }


        .v22KpiGrid article {
          position:
            relative;

          min-height:
            93px !important;

          gap:
            12px !important;

          padding:
            14px 15px !important;

          border-radius:
            14px !important;

          transition:
            transform .16s ease,
            box-shadow .16s ease;
        }


        .v22KpiGrid article:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 9px 20px
            rgba(22,62,100,.07) !important;
        }


        .v22KpiIcon {
          width:
            46px !important;

          height:
            46px !important;

          flex-basis:
            46px !important;

          box-shadow:
            inset 0 0 0
            8px
            rgba(255,255,255,.32);
        }


        .v22KpiGrid strong {
          font-size:
            23px !important;
        }


        .v22KpiGrid article
        div span {
          color:
            #20344e !important;

          font-weight:
            850 !important;
        }


        /*
         * TWO WORK CARDS
         */

        .v22DailyMain {
          grid-template-columns:
            minmax(0,1.05fr)
            minmax(0,1fr) !important;

          gap:
            12px !important;

          margin-top:
            11px !important;
        }


        .v22NextAction,
        .v22ActivityCard {
          position:
            relative;

          min-height:
            177px !important;

          border-radius:
            16px !important;

          border:
            1px solid
            #e4ecf4 !important;

          box-shadow:
            0 7px 21px
            rgba(22,55,89,.04) !important;
        }


        /*
         * Fake thumbnail only when no
         * real image is shown yet.
         */

        .v22NextAction::before {
          content:
            "⌂";

          position:
            absolute;

          top:
            57px;

          left:
            16px;

          display:
            grid;

          width:
            88px;

          height:
            74px;

          place-items:
            center;

          overflow:
            hidden;

          border:
            1px solid
            #d7e7f4;

          border-radius:
            11px;

          background:
            linear-gradient(
              155deg,
              #a7dcff 0%,
              #e6f5ff 45%,
              #8bc68a 46%,
              #5d9d69 100%
            );

          color:
            #153c61;

          font-size:
            41px;

          text-shadow:
            0 2px 2px
            rgba(255,255,255,.4);
        }


        .v22NextAction
        .v22CardTitle h3 {
          margin-left:
            102px;
        }


        .v22NextAction >
        p {
          margin-left:
            102px !important;
        }


        .v22NextAction
        .v22ActionMeta {
          margin-left:
            102px !important;
        }


        .v22NextAction
        .v22PrimaryAction {
          margin-left:
            102px !important;

          background:
            transparent !important;

          color:
            #0874df !important;

          box-shadow:
            none !important;

          padding:
            0 !important;

          justify-content:
            flex-start !important;

          font-size:
            10px !important;
        }


        /*
         * ACTIVITY EMPTY STATE
         */

        .v22ActivityCard
        .v22ActivityEmpty {
          position:
            relative;

          min-height:
            102px;

          display:
            flex;

          align-items:
            flex-end;

          justify-content:
            center;

          padding:
            56px 14px 14px !important;

          border-radius:
            12px !important;

          background:
            linear-gradient(
              180deg,
              #fbfdff,
              #f3f8fd
            ) !important;

          text-align:
            center;
        }


        .v22ActivityCard
        .v22ActivityEmpty::before {
          content:
            "⌄";

          position:
            absolute;

          top:
            13px;

          left:
            50%;

          display:
            grid;

          width:
            43px;

          height:
            31px;

          place-items:
            center;

          border:
            3px solid
            #bfd4e8;

          border-radius:
            8px 8px 12px 12px;

          color:
            #1383eb;

          font-size:
            17px;

          font-weight:
            900;

          transform:
            translateX(-50%);
        }


        /*
         * FOLDS
         */

        .v24Section,
        .v25Fold,
        .v26PortalFold {
          margin-top:
            9px !important;

          border-radius:
            14px !important;
        }


        /*
         * RESPONSIVE
         */

        @media
        (max-width: 1280px) {

          .v26PremiumHero {
            grid-template-columns:
              minmax(0,1fr)
              390px !important;
          }


          .v26HeroTitleRow h1 {
            font-size:
              28px !important;
          }


          .v26HeroScene {
            width:
              175px !important;
          }
        }


        @media
        (max-width: 1050px) {

          .v26HeroTitleRow h1 {
            white-space:
              normal !important;
          }


          .v22NextAction::before {
            display:
              none;
          }


          .v22NextAction
          .v22CardTitle h3,
          .v22NextAction >
          p,
          .v22NextAction
          .v22ActionMeta,
          .v22NextAction
          .v22PrimaryAction {
            margin-left:
              0 !important;
          }
        }


        /*
         * ========================================
         * MOCKUP_MATCH_V28
         * ========================================
         */


        /*
         * INSERT AI 3D PRIMARY CTA
         */

        .v26HeroActions {
          width:
            206px !important;

          flex-basis:
            206px !important;
        }


        .v26HeroPrimary {
          position:
            relative !important;

          isolation:
            isolate;

          min-height:
            58px !important;

          gap:
            11px !important;

          overflow:
            visible !important;

          padding:
            0 17px !important;

          border:
            1px solid
            rgba(
              255,
              224,
              104,
              .95
            ) !important;

          border-radius:
            15px !important;

          background:
            linear-gradient(
              180deg,
              #ffe878 0%,
              #ffd348 38%,
              #ffae21 72%,
              #f18b08 100%
            ) !important;

          color:
            #121923 !important;

          font-size:
            13px !important;

          font-weight:
            950 !important;

          letter-spacing:
            -.015em;

          text-shadow:
            0 1px 0
            rgba(255,255,255,.45);

          box-shadow:
            0 2px 0
            #fff2a6 inset,

            0 -5px 0
            rgba(174,83,0,.33)
            inset,

            0 7px 0
            #b55b00,

            0 14px 22px
            rgba(255,157,14,.32),

            0 0 25px
            rgba(255,196,56,.28) !important;

          transform:
            translateY(-3px);

          transition:
            transform .15s ease,
            box-shadow .15s ease,
            filter .15s ease;
        }


        .v26HeroPrimary::before {
          content:
            "";

          position:
            absolute;

          z-index:
            -1;

          top:
            3px;

          right:
            6px;

          bottom:
            17px;

          left:
            6px;

          border-radius:
            11px;

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.50),
              rgba(255,255,255,0)
            );

          pointer-events:
            none;
        }


        .v26HeroPrimary::after {
          content:
            "";

          position:
            absolute;

          z-index:
            -2;

          right:
            -8px;

          bottom:
            -13px;

          left:
            -8px;

          height:
            23px;

          border-radius:
            50%;

          background:
            radial-gradient(
              ellipse at center,
              rgba(255,164,23,.44),
              rgba(255,164,23,0) 70%
            );

          filter:
            blur(5px);

          pointer-events:
            none;
        }


        .v26HeroPrimary:hover {
          transform:
            translateY(-5px)
            scale(1.018) !important;

          filter:
            saturate(1.06)
            brightness(1.025);

          box-shadow:
            0 2px 0
            #fff6bd inset,

            0 -5px 0
            rgba(174,83,0,.30)
            inset,

            0 9px 0
            #ac5600,

            0 18px 27px
            rgba(255,157,14,.36),

            0 0 32px
            rgba(255,200,65,.38) !important;
        }


        .v26HeroPrimary:active {
          transform:
            translateY(2px)
            scale(.995) !important;

          box-shadow:
            0 2px 0
            #fff1a5 inset,

            0 -3px 0
            rgba(174,83,0,.25)
            inset,

            0 2px 0
            #a95400,

            0 7px 12px
            rgba(255,157,14,.24) !important;
        }


        .v28CtaIcon {
          display:
            grid !important;

          width:
            35px !important;

          height:
            35px !important;

          flex:
            0 0 35px !important;

          place-items:
            center;

          border:
            1px solid
            rgba(53,28,0,.30);

          border-radius:
            10px !important;

          background:
            linear-gradient(
              180deg,
              #522e04,
              #241300
            ) !important;

          color:
            #ffe368 !important;

          font-size:
            24px !important;

          font-weight:
            500 !important;

          line-height:
            1;

          text-shadow:
            0 0 9px
            rgba(255,207,57,.55);

          box-shadow:
            0 2px 0
            rgba(255,255,255,.14)
            inset,

            0 4px 7px
            rgba(64,31,0,.26);
        }


        .v28CtaText {
          display:
            block;

          white-space:
            nowrap;
        }


        /*
         * SECONDARY CTA
         */

        .v26HeroSecondary {
          min-height:
            34px !important;

          margin-top:
            4px;

          border:
            1px solid
            rgba(199,236,255,.34) !important;

          border-radius:
            13px !important;

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.12),
              rgba(255,255,255,.035)
            ) !important;

          color:
            #ffffff !important;

          box-shadow:
            0 1px 0
            rgba(255,255,255,.10)
            inset;
        }


        /*
         * PORTAL CONNECTION CARD
         */

        .v26PortalFold {
          overflow:
            hidden;

          margin-top:
            11px !important;

          border:
            1px solid
            #dfe9f3 !important;

          border-radius:
            18px !important;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #fbfdff
            ) !important;

          box-shadow:
            0 12px 29px
            rgba(25,63,99,.055) !important;
        }


        .v26PortalSummary {
          min-height:
            66px !important;

          padding:
            12px 17px !important;
        }


        .v26PortalIcon {
          width:
            39px !important;

          height:
            39px !important;

          border-radius:
            11px !important;

          background:
            linear-gradient(
              135deg,
              #e8f5ff,
              #dbeeff
            ) !important;

          color:
            #0d7fe8 !important;

          font-size:
            18px !important;
        }


        .v26PortalSummary strong {
          color:
            #10233e !important;

          font-size:
            13px !important;

          font-weight:
            900 !important;
        }


        .v26PortalSummary small {
          color:
            #76889d !important;

          font-size:
            9px !important;
        }


        .v26PortalOpen {
          color:
            #0878e4 !important;

          font-size:
            9px !important;

          font-weight:
            900 !important;
        }


        /*
         * ALWAYS VISIBLE PORTAL LOGOS
         */

        .v28PortalLogoStrip {
          display:
            grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0,1fr)
            );

          gap:
            10px;

          padding:
            0 17px 16px;
        }


        .v28PortalLogoTile {
          display:
            flex;

          min-width:
            0;

          min-height:
            62px;

          align-items:
            center;

          justify-content:
            center;

          padding:
            8px 10px;

          overflow:
            hidden;

          border:
            1px solid
            #dfe8f1;

          border-radius:
            12px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f8fbfe
            );

          box-shadow:
            0 3px 10px
            rgba(35,71,105,.035);

          transition:
            transform .15s ease,
            box-shadow .15s ease,
            border-color .15s ease;
        }


        .v28PortalLogoTile:hover {
          transform:
            translateY(-2px);

          border-color:
            #c8dced;

          box-shadow:
            0 8px 17px
            rgba(35,71,105,.075);
        }


        /*
         * IMMOSCOUT24
         */

        .v28Scout {
          display:
            inline-flex;

          align-items:
            center;

          color:
            #26313e;

          font-size:
            18px;

          font-weight:
            650;

          letter-spacing:
            -.045em;

          white-space:
            nowrap;
        }


        .v28Scout b {
          display:
            inline-block;

          margin-right:
            -1px;

          padding:
            3px 5px;

          background:
            #43e0cb;

          color:
            #087a77;

          font-weight:
            600;

          transform:
            skew(-7deg);
        }


        .v28Scout span {
          font-weight:
            650;
        }


        /*
         * HOMEGATE
         */

        .v28Homegate {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            8px;

          color:
            #232936;

          font-size:
            19px;

          font-weight:
            650;

          letter-spacing:
            -.04em;

          white-space:
            nowrap;
        }


        .v28Homegate b {
          color:
            #ef3340;

          font-size:
            27px;

          font-weight:
            950;

          line-height:
            1;
        }


        /*
         * IMMOWELT
         */

        .v28Immowelt {
          display:
            inline-flex;

          align-items:
            center;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            #383d42;

          color:
            #ffffff;

          font-size:
            16px;

          font-weight:
            850;

          line-height:
            1;

          white-space:
            nowrap;
        }


        .v28Immowelt b {
          padding:
            7px 3px 7px 11px;

          font-weight:
            850;
        }


        .v28Immowelt span {
          padding:
            7px 11px 7px 3px;

          border-radius:
            999px;

          background:
            #ffc32b;

          color:
            #373434;

          font-weight:
            900;
        }


        /*
         * KLEINANZEIGEN
         */

        .v28Kleinanzeigen {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            7px;

          color:
            #30753b;

          font-size:
            16px;

          font-weight:
            650;

          letter-spacing:
            -.035em;

          white-space:
            nowrap;
        }


        .v28Kleinanzeigen b {
          color:
            #68aa59;

          font-size:
            28px;

          font-weight:
            400;

          line-height:
            1;
        }


        /*
         * COMPARIS
         */

        .v28Comparis {
          display:
            inline-flex;

          align-items:
            center;

          color:
            #49ad23;

          font-size:
            20px;

          font-weight:
            650;

          letter-spacing:
            -.045em;

          white-space:
            nowrap;
        }


        .v28Comparis b {
          margin-right:
            -2px;

          color:
            #49ad23;

          font-size:
            22px;
        }


        /*
         * TECH DETAILS STAY COLLAPSIBLE
         */

        .v26PortalBody {
          padding:
            0 14px 14px !important;
        }


        .v26PortalFold:not([open])
        .v26PortalBody {
          display:
            none;
        }


        /*
         * HERO BALANCE
         */

        .v26HeroScene {
          filter:
            drop-shadow(
              0 10px 18px
              rgba(0,56,81,.13)
            );
        }


        .v26HeroScene > span {
          font-size:
            19px !important;

          line-height:
            1.16 !important;
        }


        /*
         * RESPONSIVE
         */

        @media
        (max-width: 1180px) {

          .v28PortalLogoStrip {
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
          }
        }


        @media
        (max-width: 760px) {

          .v28PortalLogoStrip {
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );
          }


          .v26HeroActions {
            width:
              100% !important;

            flex-basis:
              auto !important;
          }


          .v26HeroPrimary {
            width:
              100%;
          }
        }


        @media
        (max-width: 480px) {

          .v28PortalLogoStrip {
            grid-template-columns:
              1fr;
          }
        }

      `}</style>
    </div>
  );
}