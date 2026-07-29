"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
type ListingImage = {
  id: string;
  url: string;
  isPrimary: boolean;
};
type Listing = {
  id: string;
  location: string;
  postalCode: string | null;
  propertyType: string;
  rooms: number | null;
  livingArea: number | null;
  price: number | null;
  highlights: string | null;
  style: string | null;
  generatedVariants: unknown;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: ListingImage[];
};

type ListingsResponse = {
  success: boolean;
  listings?: Listing[];
  error?: string;
};
type ListingStatusFilter = "all" | "active" | "archived";

type ListingSortOrder = "updated-desc" | "updated-asc";

type ChecklistItemId =
  | "listing"
  | "social"
  | "images"
  | "objects";

type ChecklistItem = {
  id: ChecklistItemId;
  completed: boolean;
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "listing", completed: false },
  { id: "social", completed: false },
  { id: "images", completed: false },
  { id: "objects", completed: false },
];

const CHECKLIST_TRANSLATION_KEYS = {
  listing: {
    title: "checklist.items.listing.title",
    description: "checklist.items.listing.description",
  },
  social: {
    title: "checklist.items.social.title",
    description: "checklist.items.social.description",
  },
  images: {
    title: "checklist.items.images.title",
    description: "checklist.items.images.description",
  },
  objects: {
    title: "checklist.items.objects.title",
    description: "checklist.items.objects.description",
  },
} as const;

function hasGeneratedVariants(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function formatPrice(
  price: number | null,
  locale: string,
  priceOnRequest: string
): string {
  if (price === null) {
    return priceOnRequest;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(
  value: string,
  locale: string,
  fallback: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function CockpitPage() {
  const t = useTranslations("CockpitOverview");
  const locale = useLocale();
  const intlLocale =
    locale === "it"
      ? "it-CH"
      : locale === "fr"
        ? "fr-CH"
        : locale === "en"
          ? "en-CH"
          : "de-CH";

  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [showAllListings, setShowAllListings] = useState(false);
  const [currentListingIndex, setCurrentListingIndex] = useState(0);
  const [activeCockpitImageIndex, setActiveCockpitImageIndex] =
  useState(0);
  const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] =
  useState<ListingStatusFilter>("all");
const [sortOrder, setSortOrder] =
  useState<ListingSortOrder>("updated-desc");

  const [checklist, setChecklist] =
    useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  const normalizedSearchQuery = searchQuery
  .trim()
  .toLocaleLowerCase(intlLocale);

const filteredListings = listings
  .filter((listing) => {
    const searchableValues = [
      listing.location,
      listing.postalCode,
      listing.propertyType,
      listing.highlights,
    ];

    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      searchableValues.some((value) =>
        value
          ?.toLocaleLowerCase(intlLocale)
          .includes(normalizedSearchQuery)
      );

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !listing.archivedAt) ||
      (statusFilter === "archived" && Boolean(listing.archivedAt));

    return matchesSearch && matchesStatus;
  })
  .sort((firstListing, secondListing) => {
    const firstUpdatedAt = new Date(
      firstListing.updatedAt
    ).getTime();

    const secondUpdatedAt = new Date(
      secondListing.updatedAt
    ).getTime();

    return sortOrder === "updated-asc"
      ? firstUpdatedAt - secondUpdatedAt
      : secondUpdatedAt - firstUpdatedAt;
  });


  const activeListingIndex =
  filteredListings.length === 0
    ? 0
    : Math.min(
        currentListingIndex,
        filteredListings.length - 1
      );

const currentListing =
  filteredListings[activeListingIndex] ?? null;
  const currentListingImages = currentListing?.images ?? [];

const safeCockpitImageIndex =
  currentListingImages.length === 0
    ? 0
    : Math.min(
        activeCockpitImageIndex,
        currentListingImages.length - 1
      );

const currentCockpitImage =
  currentListingImages[safeCockpitImageIndex] ?? null;

const cockpitThumbnailStart = Math.max(
  0,
  Math.min(
    safeCockpitImageIndex - 1,
    Math.max(0, currentListingImages.length - 3)
  )
);

const visibleCockpitImages = currentListingImages.slice(
  cockpitThumbnailStart,
  cockpitThumbnailStart + 3
);

useEffect(() => {
  setActiveCockpitImageIndex(0);
}, [currentListing?.id]);

function showPreviousCockpitImage() {
  if (currentListingImages.length <= 1) {
    return;
  }

  setActiveCockpitImageIndex((currentIndex) =>
    currentIndex === 0
      ? currentListingImages.length - 1
      : currentIndex - 1
  );
}

function showNextCockpitImage() {
  if (currentListingImages.length <= 1) {
    return;
  }

  setActiveCockpitImageIndex((currentIndex) =>
    currentIndex === currentListingImages.length - 1
      ? 0
      : currentIndex + 1
  );
}

function showPreviousListing() {
  if (filteredListings.length <= 1) {
    return;
  }

  setCurrentListingIndex((currentIndex) =>
    currentIndex === 0
      ? filteredListings.length - 1
      : currentIndex - 1
  );
}

function showNextListing() {
  if (filteredListings.length <= 1) {
    return;
  }

  setCurrentListingIndex((currentIndex) =>
    currentIndex === filteredListings.length - 1
      ? 0
      : currentIndex + 1
  );
}

  const generatedListingsCount = listings.filter((listing) =>
    hasGeneratedVariants(listing.generatedVariants)
  ).length;

  const completedTasks = checklist.filter(
    (item) => item.completed
  ).length;

  const checklistProgress =
    checklist.length === 0
      ? 0
      : Math.round((completedTasks / checklist.length) * 100);

useEffect(() => {
  setCurrentListingIndex(0);
}, [searchQuery, statusFilter, sortOrder]);
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedCompany =
      localStorage.getItem("companyName");

    if (storedName?.trim()) {
      setUserName(storedName.trim());
    }

    if (storedCompany?.trim()) {
      setCompanyName(storedCompany.trim());
    }

    setCurrentDate(
      new Intl.DateTimeFormat(intlLocale, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date())
    );
  }, [intlLocale]);

useEffect(() => {
  const controller = new AbortController();

  async function loadCockpitIdentity() {
    try {
      const response = await fetch("/api/account", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        return;
      }

      const data = await response
        .json()
        .catch(() => null);

      const accountName =
        typeof data?.user?.name === "string"
          ? data.user.name.trim()
          : "";

      const accountCompany =
        typeof data?.user?.company === "string"
          ? data.user.company.trim()
          : "";

      if (accountName) {
        setUserName(accountName);

        localStorage.setItem(
          "userName",
          accountName
        );
      }

      setCompanyName(accountCompany);

      localStorage.setItem(
        "companyName",
        accountCompany
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.warn(
        "COCKPIT-PROFIL KONNTE NICHT GELADEN WERDEN:",
        error
      );
    }
  }

  void loadCockpitIdentity();

  return () => {
    controller.abort();
  };
}, []);

  useEffect(() => {
    const savedChecklist = localStorage.getItem(
      "inseratAiCockpitChecklist"
    );

    if (!savedChecklist) {
      return;
    }

    try {
      const parsedChecklist = JSON.parse(
        savedChecklist
      ) as Array<{
        id?: unknown;
        completed?: unknown;
      }>;

      if (Array.isArray(parsedChecklist)) {
        setChecklist(
          DEFAULT_CHECKLIST.map((defaultItem) => {
            const savedItem = parsedChecklist.find(
              (item) => item?.id === defaultItem.id
            );

            return {
              id: defaultItem.id,
              completed: savedItem?.completed === true,
            };
          })
        );
      }
    } catch {
      localStorage.removeItem("inseratAiCockpitChecklist");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      try {
        setLoadingListings(true);
        setListingsError("");

        const response = await fetch("/api/listings", {
          method: "GET",
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
          throw new Error(
            data.error ||
              t("errors.loadListings")
          );
        }

        setListings(
          Array.isArray(data.listings) ? data.listings : []
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setListingsError(
          error instanceof Error
            ? error.message
            : t("errors.loadListings")
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingListings(false);
        }
      }
    }

    void loadListings();

    return () => {
      controller.abort();
    };
  }, [t]);

  function toggleChecklistItem(id: ChecklistItemId) {
    setChecklist((currentChecklist) => {
      const updatedChecklist = currentChecklist.map((item) =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      );

      localStorage.setItem(
        "inseratAiCockpitChecklist",
        JSON.stringify(updatedChecklist)
      );

      return updatedChecklist;
    });
  }

  function resetChecklist() {
    setChecklist(DEFAULT_CHECKLIST);

    localStorage.setItem(
      "inseratAiCockpitChecklist",
      JSON.stringify(DEFAULT_CHECKLIST)
    );
  }

  return (
    <main className="cockpitPage">
      <div className="pageGlow pageGlowOne" />
      <div className="pageGlow pageGlowTwo" />

      <div className="cockpitContainer">
        <div className="cockpitTopbar">
          <Link
  href="/dashboard"
  className="dashboardBackButton"
  style={{
    display: "inline-flex",
    width: "fit-content",
justifySelf: "start",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    minHeight: "44px",
    padding: "0 18px",
    border: "1px solid rgba(251, 191, 36, 0.72)",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(245, 158, 11, 0.08))",
    color: "#fbbf24",
    fontSize: "13px",
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 8px 20px rgba(245, 158, 11, 0.12)",
  }}
>
  <span>←</span>
  {t("navigation.dashboard")}
</Link>

        <div className="cockpitWordmark">
  <strong>
    {t("wordmark.prefix")}<span>{t("wordmark.accent")}</span>
  </strong>
</div>

          <div className="topbarActions">
            <div className="userBadge">
              {(companyName || userName)
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </div>

        <section className="heroSection">
          <div className="heroContent">
            <p className="eyebrow">{t("hero.eyebrow")}</p>

            <h1>
              {companyName.trim() ||
                userName.trim() ||
                t("hero.fallbackTitle")}
            </h1>

            <p className="heroDescription">
              {t("hero.description")}
            </p>

            <p className="currentDate">{currentDate}</p>
          </div>

          <div className="heroActions">
            <Link href="/dashboard" className="primaryButton">
              <span>＋</span>
              {t("hero.newListing")}
            </Link>

           
          </div>
        </section>

        <section className="statsGrid">
          <article className="statCard">
            <span className="statIcon">🏠</span>

            <div>
              <small>{t("stats.saved.title")}</small>
              <strong>
                {loadingListings ? "…" : listings.length}
              </strong>
              <p>{t("stats.saved.description")}</p>
            </div>
          </article>

          <article className="statCard">
            <span className="statIcon">📝</span>

            <div>
              <small>{t("stats.generated.title")}</small>
              <strong>
                {loadingListings ? "…" : generatedListingsCount}
              </strong>
              <p>{t("stats.generated.description")}</p>
            </div>
          </article>

          <article className="statCard">
            <span className="statIcon">📱</span>

            <div>
              <small>{t("stats.social.title")}</small>
              <strong>0</strong>
              <p>{t("stats.social.description")}</p>
            </div>
          </article>

          <article className="statCard planCard">
            <span className="statIcon">⚡</span>

            <div>
              <small>{t("stats.plan.title")}</small>
              <strong>{t("stats.plan.value")}</strong>
              <p>{t("stats.plan.description")}</p>
            </div>
          </article>
        </section>

            <section className="panel objectsPanel" id="objekte">
              <div className="panelHeader">
               <div className="objectsHeading">
  <p className="sectionLabel">{t("objects.sectionLabel")}</p>

  <h2>
    {t("objects.count", { count: listings.length })}
  </h2>
</div>

                
              </div>
<div className="listingControls">
  <label className="listingSearch">
    <span>{t("filters.searchLabel")}</span>

    <input
      type="search"
      value={searchQuery}
      placeholder={t("filters.searchPlaceholder")}
      onChange={(event) => {
        setSearchQuery(event.target.value);
        
      }}
    />
  </label>

  <label className="listingControl">
    <span>{t("filters.statusLabel")}</span>

    <select
      value={statusFilter}
      onChange={(event) => {
        setStatusFilter(
          event.target.value as ListingStatusFilter
        );
        setShowAllListings(false);
      }}
    >
      <option value="all">{t("filters.all")}</option>
      <option value="active">{t("filters.active")}</option>
      <option value="archived">{t("filters.archived")}</option>
    </select>
  </label>

  <label className="listingControl">
    <span>{t("filters.sortLabel")}</span>

    <select
      value={sortOrder}
      onChange={(event) => {
        setSortOrder(
          event.target.value as ListingSortOrder
        );
        setShowAllListings(false);
      }}
    >
      <option value="updated-desc">
        {t("filters.updatedDesc")}
      </option>

      <option value="updated-asc">
        {t("filters.updatedAsc")}
      </option>
    </select>
  </label>
</div>
              {loadingListings ? (
                <div className="messageBox">
                  <div className="loadingSpinner" />
                  <h3>{t("states.loadingTitle")}</h3>
                  <p>{t("states.loadingDescription")}</p>
                </div>
              ) : listingsError ? (
                <div className="messageBox errorBox">
                  <span className="messageIcon">⚠️</span>
                  <h3>{t("states.errorTitle")}</h3>
                  <p>{listingsError}</p>
                </div>
              ) : currentListing === null ? (
                <div className="messageBox">
                  <span className="messageIcon">🏡</span>
                  <h3>{t("states.emptyTitle")}</h3>
                  <p>{t("states.emptyDescription")}</p>

                  <Link
                    href="/dashboard"
                    className="primaryButton messageButton"
                  >
                    {t("states.createFirst")}
                  </Link>
                </div>
              ) : (
                <div className="listingSlideshow">
 <div className="slideshowNavigation">
  <button
    type="button"
    className="slideshowArrow"
    onClick={showPreviousListing}
    disabled={filteredListings.length <= 1}
    aria-label={t("aria.previousListing")}
  >
    ‹
  </button>

  <div className="currentObjectLabel">
    {t("objects.position", {
      index: activeListingIndex + 1,
    })}
  </div>

  <button
    type="button"
    className="slideshowArrow"
    onClick={showNextListing}
    disabled={filteredListings.length <= 1}
    aria-label={t("aria.nextListing")}
  >
    ›
  </button>

</div>
<article
  key={currentListing.id}
  className="propertyCard slideshowCard"
>
  <div className="propertyTop">
    <span
      className={
        currentListing.archivedAt
          ? "propertyStatus archived"
          : "propertyStatus"
      }
    >
      {currentListing.archivedAt
        ? t("status.archived")
        : t("status.active")}
    </span>
  </div>

  

  <div className="cockpitMediaGallery">
    <div className="cockpitMediaHeader">
      <button
        type="button"
        className="cockpitMediaArrow"
        onClick={showPreviousCockpitImage}
        disabled={currentListingImages.length <= 1}
        aria-label={t("aria.previousImage")}
      >
        ‹
      </button>

      <div className="cockpitMediaHeaderText">
        <span>{t("images.sectionLabel")}</span>

        <strong>
          {t("images.count", {
            count: currentListingImages.length,
          })}
        </strong>
      </div>

      <button
        type="button"
        className="cockpitMediaArrow"
        onClick={showNextCockpitImage}
        disabled={currentListingImages.length <= 1}
        aria-label={t("aria.nextImage")}
      >
        ›
      </button>
    </div>
   

<div
  className="cockpitMediaLayout"
  style={{
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 145px",
    gap: "13px",
    width: "100%",
    minHeight: "360px",
  }}
>
    <div
  className="cockpitMediaMain"
  style={{
    minWidth: 0,
    minHeight: "360px",
  }}
>
        {currentCockpitImage ? (
          <img
            src={currentCockpitImage.url}
            alt={t("images.mainAlt", {
              type: currentListing.propertyType,
              location: currentListing.location,
            })}
          />
        ) : (
          <div className="cockpitMediaEmpty">
            <span>📷</span>
            <strong>{t("images.empty")}</strong>
          </div>
        )}
      </div>

      {currentListingImages.length > 0 && (
       <div
  className="cockpitThumbnailRail"
  style={{
    display: "grid",
    gridTemplateRows: "34px minmax(0, 1fr) 34px",
    gridTemplateColumns: "1fr",
    gap: "8px",
    minWidth: 0,
  }}
>
          <button
            type="button"
            className="cockpitThumbnailNavigation"
            onClick={showPreviousCockpitImage}
            disabled={currentListingImages.length <= 1}
            aria-label={t("aria.thumbnailsUp")}
          >
            ▲
          </button>

<div
  className="cockpitThumbnails"
  style={{
    display: "grid",
    gridTemplateColumns: "1fr",
    gridTemplateRows: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
    minHeight: 0,
  }}
>            {visibleCockpitImages.map((image) => {
              const imageIndex =
                currentListingImages.findIndex(
                  (currentImage) =>
                    currentImage.id === image.id
                );

              return (
                <button
                  type="button"
                  key={image.id}
                  className={
                    imageIndex === safeCockpitImageIndex
                      ? "cockpitThumbnail active"
                      : "cockpitThumbnail"
                  }
                  onClick={() =>
                    setActiveCockpitImageIndex(imageIndex)
                  }
                  aria-label={t("aria.showImage", {
                    index: imageIndex + 1,
                  })}
                >
                  <img
                    src={image.url}
                    alt={t("images.thumbnailAlt", {
                      index: imageIndex + 1,
                    })}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="cockpitThumbnailNavigation"
            onClick={showNextCockpitImage}
            disabled={currentListingImages.length <= 1}
            aria-label={t("aria.thumbnailsDown")}
          >
            ▼
          </button>
        </div>
      )}
    </div>
  </div>
  <div className="propertyHeading">
    <small>{currentListing.propertyType}</small>

    <h3>
      {t("objects.propertyTitle", {
        type: currentListing.propertyType,
        location: currentListing.location,
      })}
    </h3>

    <p>
      📍{" "}
      {currentListing.postalCode
        ? `${currentListing.postalCode} `
        : ""}
      {currentListing.location}
    </p>
  </div>

  <div className="propertyFacts">
    <div>
      <span>{t("facts.rooms")}</span>

      <strong>
        {currentListing.rooms !== null
          ? currentListing.rooms
          : "–"}
      </strong>
    </div>

    <div>
      <span>{t("facts.livingArea")}</span>

      <strong>
        {currentListing.livingArea !== null
          ? `${currentListing.livingArea} m²`
          : "–"}
      </strong>
    </div>

    <div className="priceFact">
      <span>{t("facts.salePrice")}</span>
      <strong>
        {formatPrice(
          currentListing.price,
          intlLocale,
          t("objects.priceOnRequest")
        )}
      </strong>
    </div>
  </div>

  {currentListing.highlights && (
    <div className="highlightsBox">
      <span>{t("facts.highlights")}</span>
      <p>{currentListing.highlights}</p>
    </div>
  )}

  <div className="propertyFooter">
    <span>
      {t("objects.updatedOn", {
        date: formatDate(
          currentListing.updatedAt,
          intlLocale,
          t("objects.recentlyEdited")
        ),
      })}
    </span>

    <Link
  href={`/cockpit/${currentListing.id}`}
  className="propertyOpenLink"
  style={{
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "42px",
    padding: "0 17px",
    border: "1px solid rgba(251, 191, 36, 0.72)",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(245, 158, 11, 0.08))",
    color: "#fbbf24",
    fontSize: "12px",
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 8px 20px rgba(245, 158, 11, 0.12)",
  }}
>
  {t("objects.open")}
</Link>
  </div>
</article>
</div>
              )}
            </section>
            <section className="panel quickPanel allFunctionsPanel">
  <div className="panelHeader">
    <div>
      <p className="sectionLabel">{t("quick.sectionLabel")}</p>
      <h2>{t("quick.title")}</h2>
    </div>
  </div>

  <div className="quickGrid">
    <Link href="/dashboard" className="quickCard">
      <span className="quickIcon">✨</span>

      <h3>{t("quick.newListing.title")}</h3>

      <p>{t("quick.newListing.description")}</p>

      <strong>{t("quick.newListing.action")}</strong>
    </Link>

    <Link href="/dashboard" className="quickCard">
      <span className="quickIcon">🖼️</span>

      <h3>{t("quick.images.title")}</h3>

      <p>{t("quick.images.description")}</p>

      <strong>{t("quick.images.action")}</strong>
    </Link>

    <a href="#objekte" className="quickCard">
      <span className="quickIcon">🏘️</span>

      <h3>{t("quick.manage.title")}</h3>

      <p>{t("quick.manage.description")}</p>

      <strong>{t("quick.manage.action")}</strong>
    </a>
  </div>

  <div className="functionsDivider" />

  <div className="checklistInside">
    <div className="panelHeader checklistTitle">
      <div>
        <p className="sectionLabel">{t("checklist.sectionLabel")}</p>
        <h2>{t("checklist.title")}</h2>
      </div>

      <button type="button" onClick={resetChecklist}>
        {t("checklist.reset")}
      </button>
    </div>

    <div className="checklistInsideLayout">
      <div
        className="progressCircle"
        style={{
          background: `
            radial-gradient(
              circle at center,
              #0c1738 59%,
              transparent 61%
            ),
            conic-gradient(
              #fbbf24 0deg,
              #fbbf24 ${checklistProgress * 3.6}deg,
              rgba(255,255,255,0.09)
                ${checklistProgress * 3.6}deg,
              rgba(255,255,255,0.09) 360deg
            )
          `,
        }}
      >
        <div>
          <strong>
            {completedTasks}/{checklist.length}
          </strong>

          <span>
            {t("checklist.completedPercent", {
              percent: checklistProgress,
            })}
          </span>
        </div>
      </div>

      <div className="checklist">
        {checklist.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.completed
                ? "checkItem completed"
                : "checkItem"
            }
            onClick={() => toggleChecklistItem(item.id)}
          >
            <span className="checkBox">
              {item.completed ? "✓" : ""}
            </span>

            <span className="checkText">
              <strong>
                {t(CHECKLIST_TRANSLATION_KEYS[item.id].title)}
              </strong>
              <small>
                {t(CHECKLIST_TRANSLATION_KEYS[item.id].description)}
              </small>
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
</section>
      </div>

      <style jsx>{`
      /* SAUBERE COCKPIT-BILDERGALERIE */

.slideshowCard .cockpitMediaGallery {
  width: 100% !important;
  margin: 18px 0 20px !important;
  padding: 18px !important;
  border: 1px solid rgba(251, 191, 36, 0.34) !important;
  border-radius: 20px !important;
  background:
    linear-gradient(
      145deg,
      rgba(4, 14, 38, 0.98),
      rgba(18, 33, 74, 0.96)
    ) !important;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
}

.slideshowCard .cockpitMediaHeader {
  display: grid !important;
  grid-template-columns: 48px minmax(0, 1fr) 48px !important;
  align-items: center !important;
  gap: 14px !important;
  margin-bottom: 16px !important;
}

.slideshowCard .cockpitMediaHeaderText {
  min-width: 0 !important;
  text-align: center !important;
}

.slideshowCard .cockpitMediaHeaderText span,
.slideshowCard .cockpitMediaHeaderText strong {
  display: block !important;
}

.slideshowCard .cockpitMediaHeaderText span {
  color: #fbbf24 !important;
  font-size: 9px !important;
  font-weight: 900 !important;
  letter-spacing: 0.15em !important;
}

.slideshowCard .cockpitMediaHeaderText strong {
  margin-top: 5px !important;
  color: #ffffff !important;
  font-size: 16px !important;
  line-height: 1.2 !important;
}

.slideshowCard .cockpitMediaArrow {
  display: grid !important;
  place-items: center !important;
  width: 48px !important;
  height: 48px !important;
  padding: 0 !important;
  border: 1px solid rgba(251, 191, 36, 0.66) !important;
  border-radius: 14px !important;
  background: rgba(245, 158, 11, 0.1) !important;
  color: #fbbf24 !important;
  cursor: pointer !important;
  font-size: 30px !important;
  line-height: 1 !important;
}

.slideshowCard .cockpitMediaArrow:hover:not(:disabled) {
  border-color: #fbbf24 !important;
  background: rgba(245, 158, 11, 0.2) !important;
}

.slideshowCard .cockpitMediaLayout {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 165px !important;
  gap: 14px !important;
  width: 100% !important;
  height: 380px !important;
  min-height: 380px !important;
}

.slideshowCard .cockpitMediaMain {
  display: flex !important;
  width: 100% !important;
  height: 380px !important;
  min-width: 0 !important;
  min-height: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 16px !important;
  background: #020617 !important;
}

.slideshowCard .cockpitMediaMain img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  max-height: none !important;
  object-fit: contain !important;
}

.slideshowCard .cockpitThumbnailRail {
  display: grid !important;
  grid-template-columns: 1fr !important;
  grid-template-rows: 34px minmax(0, 1fr) 34px !important;
  gap: 8px !important;
  width: 165px !important;
  height: 380px !important;
  min-width: 0 !important;
  min-height: 0 !important;
}

.slideshowCard .cockpitThumbnailNavigation {
  display: grid !important;
  place-items: center !important;
  width: 100% !important;
  min-height: 0 !important;
  padding: 0 !important;
  border: 1px solid rgba(251, 191, 36, 0.32) !important;
  border-radius: 9px !important;
  background: rgba(245, 158, 11, 0.08) !important;
  color: #fbbf24 !important;
  cursor: pointer !important;
  font-size: 12px !important;
}

.slideshowCard .cockpitThumbnails {
  display: grid !important;
  grid-template-columns: 1fr !important;
  grid-template-rows: repeat(3, minmax(0, 1fr)) !important;
  gap: 8px !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.slideshowCard .cockpitThumbnail {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 11px !important;
  background: rgba(255, 255, 255, 0.04) !important;
  cursor: pointer !important;
}

.slideshowCard .cockpitThumbnail img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

.slideshowCard .cockpitThumbnail.active {
  border-color: #fbbf24 !important;
  box-shadow:
    0 0 0 2px rgba(251, 191, 36, 0.2),
    0 8px 20px rgba(0, 0, 0, 0.3) !important;
}
/* GEMEINSAMER SCHNELLZUGRIFF + CHECKLISTE */

.allFunctionsPanel {
  width: 100% !important;
  padding: 28px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 22px !important;
  background: rgba(8, 22, 55, 0.94) !important;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.2) !important;
}

.allFunctionsPanel > .panelHeader {
  margin-bottom: 22px !important;
}

.allFunctionsPanel h2 {
  margin: 0 !important;
  font-size: 22px !important;
  color: #ffffff !important;
}

.allFunctionsPanel .quickGrid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 16px !important;
}

.allFunctionsPanel .quickCard {
 position: relative;
  overflow: hidden;
  display: flex !important;
  flex-direction: column !important;
  min-height: 180px !important;
  padding: 20px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 17px !important;
  background: rgba(255, 255, 255, 0.035) !important;
  color: #ffffff !important;
  text-decoration: none !important;
}
 

.allFunctionsPanel .quickCard:hover {
  border-color: rgba(251, 191, 36, 0.4) !important;
  background: rgba(251, 191, 36, 0.06) !important;
  transform: translateY(-2px) !important;
}

.allFunctionsPanel .quickIcon {
  display: grid !important;
  place-items: center !important;
  width: 42px !important;
  height: 42px !important;
  margin-bottom: 14px !important;
  border-radius: 13px !important;
  background: rgba(255, 255, 255, 0.09) !important;
}

.allFunctionsPanel .quickCard h3 {
  margin: 0 !important;
  font-size: 15px !important;
  color: #ffffff !important;
}

.allFunctionsPanel .quickCard p {
  margin: 8px 0 16px !important;
  color: #97a4bf !important;
  font-size: 12px !important;
  line-height: 1.55 !important;
}

.allFunctionsPanel .quickCard strong {
  margin-top: auto !important;
  color: #fbbf24 !important;
  font-size: 12px !important;
}

.allFunctionsPanel .functionsDivider {
  width: 100% !important;
  height: 1px !important;
  margin: 30px 0 26px !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.allFunctionsPanel .checklistInside > .panelHeader {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 22px !important;
}

.allFunctionsPanel .checklistTitle button {
  padding: 8px 12px !important;
  border: 1px solid rgba(251, 191, 36, 0.3) !important;
  border-radius: 10px !important;
  background: rgba(251, 191, 36, 0.07) !important;
  color: #fbbf24 !important;
  cursor: pointer !important;
}

.allFunctionsPanel .checklistInsideLayout {
  display: grid !important;
  grid-template-columns: 170px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 28px !important;
}

.allFunctionsPanel .progressCircle {
  display: grid !important;
  place-items: center !important;
  width: 140px !important;
  height: 140px !important;
  margin: 0 auto !important;
  border-radius: 50% !important;
}

.allFunctionsPanel .progressCircle > div {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

.allFunctionsPanel .progressCircle strong {
  font-size: 27px !important;
  color: #ffffff !important;
}

.allFunctionsPanel .progressCircle span {
  margin-top: 7px !important;
  color: #8e9bb8 !important;
  font-size: 10px !important;
}

.allFunctionsPanel .checklist {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
}

.allFunctionsPanel .checkItem {
  display: flex !important;
  align-items: flex-start !important;
  gap: 12px !important;
  min-height: 76px !important;
  padding: 15px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, 0.035) !important;
  color: #ffffff !important;
  text-align: left !important;
}

.allFunctionsPanel .checkBox {
  display: grid !important;
  place-items: center !important;
  width: 22px !important;
  height: 22px !important;
  flex: 0 0 22px !important;
  border: 1px solid rgba(251, 191, 36, 0.7) !important;
  border-radius: 6px !important;
  color: #fbbf24 !important;
}

.allFunctionsPanel .checkText {
  display: flex !important;
  flex-direction: column !important;
}

.allFunctionsPanel .checkText strong {
  font-size: 12px !important;
  color: #ffffff !important;
}

.allFunctionsPanel .checkText small {
  margin-top: 5px !important;
  color: #8794af !important;
  font-size: 10px !important;
  line-height: 1.4 !important;
}

@media (max-width: 900px) {
  .allFunctionsPanel .quickGrid,
  .allFunctionsPanel .checklist {
    grid-template-columns: 1fr !important;
  }

  .allFunctionsPanel .checklistInsideLayout {
    grid-template-columns: 1fr !important;
  }
}
@media (max-width: 800px) {
  .slideshowCard .cockpitMediaLayout {
    grid-template-columns: 1fr !important;
    height: auto !important;
    min-height: 0 !important;
  }

  .slideshowCard .cockpitMediaMain {
    height: 280px !important;
  }

  .slideshowCard .cockpitThumbnailRail {
    grid-template-columns: 34px minmax(0, 1fr) 34px !important;
    grid-template-rows: 78px !important;
    width: 100% !important;
    height: 78px !important;
  }

  .slideshowCard .cockpitThumbnails {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: 78px !important;
  }
}
      .objectsPanel .panelHeader {
  display: block;
}

.objectsHeading {
  width: 100%;
  text-align: center;
}

.objectsHeading .sectionLabel {
  text-align: center;
}

.slideshowNavigation {
  display: grid;
  grid-template-columns: 56px minmax(140px, 220px) 56px;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  margin: 24px 0;
}

.slideshowArrow {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(251, 191, 36, 0.55);
  border-radius: 16px;
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  cursor: pointer;
  font-size: 38px;
  line-height: 1;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.slideshowArrow:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
}

.slideshowArrow:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.currentObjectLabel {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  border: 1px solid #fbbf24;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.2),
    rgba(245, 158, 11, 0.08)
  );
  color: #fbbf24;
  font-size: 16px;
  font-weight: 900;
  text-align: center;
  box-shadow: 0 10px 24px rgba(245, 158, 11, 0.12);
}
  .objectsPanel .panelHeader {
  display: block;
}

.objectsHeading {
  width: 100%;
  text-align: center;
}

.objectsHeading .sectionLabel {
  text-align: center;
}

.slideshowNavigation {
  display: grid;
  grid-template-columns: 56px minmax(140px, 220px) 56px;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  margin: 24px 0;
}

.slideshowArrow {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(251, 191, 36, 0.55);
  border-radius: 16px;
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  cursor: pointer;
  font-size: 38px;
  line-height: 1;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.slideshowArrow:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
}

.slideshowArrow:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.currentObjectLabel {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  border: 1px solid #fbbf24;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.2),
    rgba(245, 158, 11, 0.08)
  );
  color: #fbbf24;
  font-size: 16px;
  font-weight: 900;
  text-align: center;
  box-shadow: 0 10px 24px rgba(245, 158, 11, 0.12);
}
        * {
          box-sizing: border-box;
        }

        .cockpitPage {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 28px;
          background:
            radial-gradient(
              circle at 90% 12%,
              rgba(91, 68, 191, 0.28),
              transparent 32%
            ),
            radial-gradient(
              circle at 7% 75%,
              rgba(17, 95, 190, 0.22),
              transparent 34%
            ),
            linear-gradient(
              145deg,
              #07142f 0%,
              #111d4a 50%,
              #30246b 100%
            );
          color: #ffffff;
        }

        .pageGlow {
          position: fixed;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.14;
          pointer-events: none;
        }

        .pageGlowOne {
          top: -180px;
          right: -80px;
          background: #7c3aed;
        }

        .pageGlowTwo {
          bottom: -230px;
          left: -100px;
          background: #2563eb;
        }

        .cockpitContainer {
          position: relative;
          z-index: 1;
          width: min(1400px, 100%);
          margin: 0 auto;
        }

        .cockpitTopbar {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          min-height: 76px;
          padding: 14px 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          background: rgba(8, 19, 48, 0.85);
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(18px);
        }

        .dashboardBackButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  gap: 9px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(251, 191, 36, 0.72);
  border-radius: 13px;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.18),
    rgba(245, 158, 11, 0.08)
  );
  color: #fbbf24 !important;
  font-size: 13px;
  font-weight: 900;
  text-decoration: none;
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.12);
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.dashboardBackButton:hover {
  transform: translateY(-2px);
  border-color: #fbbf24;
  background: linear-gradient(135deg, #f59e0b, #facc15);
  color: #10162e !important;
}

        .cockpitWordmark {
          text-align: center;
        }

        .cockpitWordmark strong {
          display: block;
          font-size: 22px;
          letter-spacing: -0.04em;
        }

        .cockpitWordmark strong span {
          color: #fbbf24;
        }

        .cockpitWordmark small {
          display: block;
          margin-top: 4px;
          color: #95a3c4;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .topbarActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
        }

        .topbarActions a {
          color: #dce4f7;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }

        .userBadge {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border: 1px solid rgba(251, 191, 36, 0.27);
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          font-weight: 900;
        }

        .heroSection {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 40px;
          padding: 58px 10px 36px;
        }

        .eyebrow,
        .sectionLabel {
          margin: 0 0 10px;
          color: #fbbf24;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .heroSection h1 {
          margin: 0;
          font-size: clamp(40px, 5vw, 68px);
          line-height: 1;
          letter-spacing: -0.055em;
        }

        .heroSection h1 span {
          color: #fbbf24;
        }

        .heroDescription {
          max-width: 700px;
          margin: 19px 0 0;
          color: #b3bfd9;
          font-size: 16px;
          line-height: 1.65;
        }

        .currentDate {
          margin: 14px 0 0;
          color: #7d8bad;
          font-size: 12px;
          text-transform: capitalize;
        }

        .heroActions {
          display: flex;
          flex-direction: column;
          gap: 11px;
          min-width: 225px;
        }

        .primaryButton,
        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 49px;
          padding: 0 19px;
          border-radius: 13px;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
        }

        .primaryButton {
          background: linear-gradient(135deg, #f59e0b, #facc15);
          color: #10162e;
          box-shadow: 0 14px 30px rgba(245, 158, 11, 0.23);
        }

        .secondaryButton {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 18px;
        }

        .statCard {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-height: 135px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          background: rgba(10, 23, 57, 0.86);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.18);
        }

        .planCard {
          border-color: rgba(251, 191, 36, 0.28);
          background: linear-gradient(
            145deg,
            rgba(245, 158, 11, 0.14),
            rgba(10, 23, 57, 0.92)
          );
        }

        .statIcon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          border-radius: 13px;
          background: rgba(245, 158, 11, 0.11);
          font-size: 20px;
        }

        .statCard small,
        .statCard strong,
        .statCard p {
          display: block;
        }

        .statCard small {
          color: #8f9dbd;
          font-size: 11px;
          font-weight: 800;
        }

        .statCard strong {
          margin-top: 8px;
          font-size: 24px;
          line-height: 1;
        }

        .statCard p {
          margin: 10px 0 0;
          color: #697797;
          font-size: 10px;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.75fr) minmax(310px, 0.75fr);
          gap: 18px;
          padding-bottom: 45px;
        }

        .mainColumn,
        .sideColumn {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .panel {
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 21px;
          background: rgba(9, 22, 54, 0.87);
          box-shadow: 0 24px 65px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(17px);
        }

        .panelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 21px;
        }

        .panel h2 {
          margin: 0;
          font-size: 21px;
          letter-spacing: -0.03em;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .quickCard {
          display: flex;
          flex-direction: column;
          min-height: 205px;
          padding: 19px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.035);
          color: #ffffff;
          text-decoration: none;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .quickCard:hover {
          transform: translateY(-4px);
          border-color: rgba(251, 191, 36, 0.38);
          background: rgba(245, 158, 11, 0.07);
        }

        .quickIcon {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: rgba(245, 158, 11, 0.12);
          font-size: 21px;
        }

        .quickCard h3 {
          margin: 19px 0 8px;
          font-size: 16px;
        }

        .quickCard p {
          margin: 0;
          color: #96a3bf;
          font-size: 12px;
          line-height: 1.55;
        }

        .quickCard strong {
          margin-top: auto;
          padding-top: 17px;
          color: #fbbf24;
          font-size: 11px;
        }
.listingControls {
  display: grid;
  grid-template-columns:
    minmax(0, 1.5fr)
    minmax(170px, 0.75fr)
    minmax(190px, 0.9fr);
  gap: 14px;
  align-items: end;
  margin: 20px 0 24px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(8, 21, 53, 0.72);
}

.listingSearch,
.listingControl {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.listingSearch span,
.listingControl span {
  color: rgba(255, 255, 255, 0.68);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.listingSearch input,
.listingControl select {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  outline: none;
  background: rgba(19, 36, 78, 0.96);
  color: #ffffff;
  font: inherit;
  font-size: 14px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.listingSearch input::placeholder {
  color: rgba(255, 255, 255, 0.38);
}

.listingControl select {
  cursor: pointer;
}

.listingControl select option {
  background: #101f48;
  color: #ffffff;
}

.listingSearch input:hover,
.listingControl select:hover {
  border-color: rgba(251, 191, 36, 0.45);
}

.listingSearch input:focus,
.listingControl select:focus {
  border-color: rgba(251, 191, 36, 0.9);
  background: rgba(23, 42, 88, 1);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
}

.listingSlideshow {
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  align-self: stretch;
  box-sizing: border-box;
  flex-direction: column;
  gap: 18px;
}

.slideshowCard {
  width: 100%;
  min-height: 0;
  animation: listingSlideIn 0.3s ease;
}

.slideshowCard .propertyTop {
  justify-content: flex-end;
}

@keyframes listingSlideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
        .showAllButton,
        .checklistTitle button {
          padding: 0;
          border: 0;
          background: transparent;
          color: #fbbf24;
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
        }

        .propertyGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .propertyCard {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 390px;
          overflow: hidden;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: 18px;
          background:
            radial-gradient(
              circle at top right,
              rgba(245, 158, 11, 0.11),
              transparent 35%
            ),
            linear-gradient(
              145deg,
              rgba(25, 41, 88, 0.97),
              rgba(10, 23, 57, 0.97)
            );
          color: #ffffff;
          text-decoration: none;
          box-shadow: 0 17px 40px rgba(0, 0, 0, 0.22);
          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .propertyCard:hover {
          transform: translateY(-5px);
          border-color: rgba(251, 191, 36, 0.46);
        }

        .propertyCard::before {
          position: absolute;
          top: 0;
          right: 22px;
          left: 22px;
          height: 3px;
          border-radius: 0 0 999px 999px;
          background: linear-gradient(90deg, #f59e0b, #facc15);
          content: "";
        }

        .propertyTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .propertyIcon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border: 1px solid rgba(251, 191, 36, 0.23);
          border-radius: 14px;
          background: rgba(245, 158, 11, 0.11);
          font-size: 21px;
        }

        .propertyStatus {
          padding: 6px 10px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.1);
          color: #86efac;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .propertyStatus.archived {
          border-color: rgba(148, 163, 184, 0.25);
          background: rgba(148, 163, 184, 0.08);
          color: #cbd5e1;
        }

        .propertyHeading {
          padding: 20px 0 17px;
        }

        .propertyHeading small {
          color: #fbbf24;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .propertyHeading h3 {
          margin: 7px 0 0;
          font-size: 19px;
          line-height: 1.3;
        }

        .propertyHeading p {
          margin: 8px 0 0;
          color: #96a3bf;
          font-size: 11px;
        }

        .propertyFacts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .propertyFacts > div {
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.035);
        }

        .propertyFacts span,
        .propertyFacts strong {
          display: block;
        }

        .propertyFacts span {
          color: #7f8dac;
          font-size: 9px;
        }

        .propertyFacts strong {
          margin-top: 5px;
          font-size: 13px;
        }

        .propertyFacts .priceFact {
          grid-column: 1 / -1;
          border-color: rgba(251, 191, 36, 0.19);
          background: rgba(245, 158, 11, 0.07);
        }

        .propertyFacts .priceFact strong {
          color: #fbbf24;
          font-size: 17px;
        }

        .highlightsBox {
          margin-top: 13px;
          padding: 12px 14px;
          border-left: 3px solid #fbbf24;
          border-radius: 0 11px 11px 0;
          background: rgba(255, 255, 255, 0.03);
        }

        .highlightsBox span {
          color: #fbbf24;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .highlightsBox p {
          display: -webkit-box;
          overflow: hidden;
          margin: 6px 0 0;
          color: #aab4cb;
          font-size: 10px;
          line-height: 1.45;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .propertyFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
          padding-top: 17px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .propertyFooter span {
          color: #71809f;
          font-size: 9px;
        }

        .propertyFooter strong {
          color: #fbbf24;
          font-size: 10px;
          white-space: nowrap;
        }

        .messageBox {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 280px;
          padding: 30px;
          border: 1px dashed rgba(255, 255, 255, 0.13);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.025);
          text-align: center;
        }

        .messageBox h3 {
          margin: 17px 0 8px;
        }

        .messageBox p {
          max-width: 470px;
          margin: 0;
          color: #96a3bf;
          font-size: 12px;
          line-height: 1.55;
        }

        .messageIcon {
          font-size: 28px;
        }

        .messageButton {
          margin-top: 20px;
        }

        .errorBox {
          border-color: rgba(248, 113, 113, 0.25);
        }

        .loadingSpinner {
          width: 43px;
          height: 43px;
          border: 4px solid rgba(255, 255, 255, 0.09);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.checklistPanel {

        .checklistPanel {
          min-height: 500px;
        }

        .checklistTitle {
          align-items: flex-start;
        }

        .progressCircle {
          display: grid;
          place-items: center;
          width: 145px;
          height: 145px;
          margin: 25px auto;
          border-radius: 50%;
        }

        .progressCircle div {
          text-align: center;
        }

        .progressCircle strong,
        .progressCircle span {
          display: block;
        }

        .progressCircle strong {
          font-size: 28px;
        }

        .progressCircle span {
          margin-top: 4px;
          color: #8e9bbb;
          font-size: 9px;
        }

        .checklist {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .checkItem {
          display: flex;
          align-items: flex-start;
          width: 100%;
          gap: 11px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          color: #ffffff;
          cursor: pointer;
          text-align: left;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .checkItem:hover {
          transform: translateY(-1px);
          border-color: rgba(251, 191, 36, 0.28);
        }

        .checkBox {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 21px;
          height: 21px;
          border: 2px solid rgba(251, 191, 36, 0.45);
          border-radius: 6px;
          color: #10162e;
          font-size: 12px;
          font-weight: 900;
        }

        .checkText strong,
        .checkText small {
          display: block;
        }

        .checkText strong {
          font-size: 11px;
        }

        .checkText small {
          margin-top: 4px;
          color: #8491ae;
          font-size: 9px;
          line-height: 1.4;
        }

        .checkItem.completed {
          border-color: rgba(34, 197, 94, 0.18);
          background: rgba(34, 197, 94, 0.06);
        }

        .checkItem.completed .checkBox {
          border-color: #22c55e;
          background: #22c55e;
        }

        .checkItem.completed .checkText strong {
          color: #8d98af;
          text-decoration: line-through;
        }

        .tipPanel {
          border-color: rgba(251, 191, 36, 0.21);
          background: linear-gradient(
            145deg,
            rgba(245, 158, 11, 0.11),
            rgba(9, 22, 54, 0.94)
          );
        }

        .tipIcon {
          display: block;
          margin-bottom: 17px;
          font-size: 26px;
        }

        .tipPanel h3 {
          margin: 0;
          font-size: 16px;
        }

        .tipPanel > p:last-of-type {
          margin: 11px 0 17px;
          color: #98a4bd;
          font-size: 11px;
          line-height: 1.55;
        }

        .tipPanel a {
          color: #fbbf24;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
        }

        @media (max-width: 1100px) {
          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mainGrid {
            grid-template-columns: 1fr;
          }

          .sideColumn {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 780px) {
          .cockpitPage {
            padding: 14px;
          }

          .cockpitTopbar {
            grid-template-columns: 1fr auto;
          }

          .cockpitWordmark {
            display: none;
          }

          .heroSection {
            flex-direction: column;
            align-items: stretch;
            padding-top: 42px;
          }

          .heroActions {
            width: 100%;
          }
        
}
        @media (max-width: 640px) {
          .topbarActions a {
            display: none;
          }

          .statsGrid,
          .quickGrid,
          .propertyGrid,
          .sideColumn {
            grid-template-columns: 1fr;
          }

          .panel {
            padding: 18px;
          }

          .heroSection h1 {
            font-size: 39px;
          }

          .propertyCard {
            min-height: 370px;
          }

          .propertyFooter {
            align-items: flex-start;
            flex-direction: column;
          }
        }
          /* Finale Slider-Navigation: Pfeile ganz links und rechts */
.slideshowNavigation {
  position: relative !important;
  display: flex !important;
  grid-template-columns: none !important;
  width: 100% !important;
  min-height: 72px;
  align-items: center !important;
  justify-content: center !important;
  gap: 0 !important;
  margin: 26px 0 24px !important;
  padding: 0 84px !important;
}

.slideshowNavigation .slideshowArrow {
  position: absolute !important;
  top: 50% !important;
  width: 58px !important;
  height: 58px !important;
  padding: 0 !important;
  border: 1px solid rgba(251, 191, 36, 0.75) !important;
  border-radius: 50% !important;
  background: linear-gradient(
    145deg,
    rgba(251, 191, 36, 0.2),
    rgba(245, 158, 11, 0.06)
  ) !important;
  color: #fbbf24 !important;
  font-size: 34px !important;
  line-height: 1 !important;
  transform: translateY(-50%) !important;
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.28),
    0 0 18px rgba(251, 191, 36, 0.08) !important;
}

.slideshowNavigation .slideshowArrow:first-child {
  left: 0 !important;
}

.slideshowNavigation .slideshowArrow:last-child {
  right: 0 !important;
}

.slideshowNavigation .slideshowArrow:hover:not(:disabled) {
  border-color: #fbbf24 !important;
  background: rgba(251, 191, 36, 0.22) !important;
  transform: translateY(-50%) scale(1.07) !important;
}

.slideshowNavigation .currentObjectLabel {
  width: min(320px, 100%) !important;
  min-height: 58px !important;
  margin: 0 auto !important;
  padding: 0 28px !important;
  border: 1px solid rgba(251, 191, 36, 0.8) !important;
  border-radius: 18px !important;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.18),
    rgba(245, 158, 11, 0.06)
  ) !important;
  color: #fbbf24 !important;
  text-align: center !important;
}

@media (max-width: 700px) {
  .slideshowNavigation {
    padding: 0 62px !important;
  }

  .slideshowNavigation .slideshowArrow {
    width: 46px !important;
    height: 46px !important;
    font-size: 28px !important;
  }
    }
.propertyFiles {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 15px;
  width: 100%;
  min-height: 82px;
  margin: 18px 0 22px;
  padding: 14px 18px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.12),
      rgba(18, 35, 76, 0.82)
    );
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.propertyFilesIcon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid rgba(251, 191, 36, 0.32);
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.13);
  font-size: 23px;
}

.propertyFilesContent {
  min-width: 0;
}

.propertyFilesContent span,
.propertyFilesContent strong {
  display: block;
}

.propertyFilesContent span {
  margin-bottom: 5px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.propertyFilesContent strong {
  color: #ffffff;
  font-size: 16px;
  line-height: 1.3;
}

.propertyFilesAction {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .propertyFiles {
    grid-template-columns: 46px minmax(0, 1fr);
    padding: 13px;
  }

  .propertyFilesIcon {
    width: 46px;
    height: 46px;
  }

  .propertyFilesAction {
    display: none;
  }
}
  .cockpitMediaGallery {
  margin: 18px 0 20px;
  padding: 15px;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 20px;
  background:
    linear-gradient(
      145deg,
      rgba(5, 15, 40, 0.96),
      rgba(19, 34, 76, 0.9)
    );
  box-shadow:
    0 16px 36px rgba(2, 6, 23, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.cockpitMediaHeader {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 46px;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.cockpitMediaHeaderText {
  min-width: 0;
  text-align: center;
}

.cockpitMediaHeaderText span,
.cockpitMediaHeaderText strong {
  display: block;
}

.cockpitMediaHeaderText span {
  color: #fbbf24;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.cockpitMediaHeaderText strong {
  margin-top: 5px;
  color: #ffffff;
  font-size: 15px;
}

.cockpitMediaArrow {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 1px solid rgba(251, 191, 36, 0.62);
  border-radius: 13px;
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  cursor: pointer;
  font: inherit;
  font-size: 29px;
  line-height: 1;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.cockpitMediaArrow:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #fbbf24;
  background: rgba(245, 158, 11, 0.2);
}

.cockpitMediaArrow:disabled,
.cockpitThumbnailNavigation:disabled {
  cursor: not-allowed;
  opacity: 0.25;
}

.cockpitMediaLayout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 145px;
  gap: 13px;
  min-height: 360px;
}

.cockpitMediaMain {
  display: flex;
  min-width: 0;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 17px;
  background: #020617;
}

.cockpitMediaMain img {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 410px;
  object-fit: contain;
}

.cockpitMediaEmpty {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  color: rgba(226, 232, 240, 0.58);
}

.cockpitMediaEmpty span {
  font-size: 36px;
}

.cockpitThumbnailRail {
  display: grid;
  grid-template-rows: 34px minmax(0, 1fr) 34px;
  gap: 8px;
  min-width: 0;
}

.cockpitThumbnailNavigation {
  display: grid;
  place-items: center;
  width: 100%;
  padding: 0;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 9px;
  background: rgba(245, 158, 11, 0.08);
  color: #fbbf24;
  cursor: pointer;
  font-size: 12px;
}

.cockpitThumbnailNavigation:hover:not(:disabled) {
  border-color: rgba(251, 191, 36, 0.7);
  background: rgba(245, 158, 11, 0.16);
}

.cockpitThumbnails {
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 8px;
  min-height: 0;
}

.cockpitThumbnail {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.cockpitThumbnail:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.55);
}

.cockpitThumbnail img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cockpitThumbnail.active {
  border-color: #fbbf24;
  box-shadow:
    0 0 0 2px rgba(251, 191, 36, 0.18),
    0 8px 20px rgba(2, 6, 23, 0.24);
}

.propertyOpenLink {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 17px;
  border: 1px solid rgba(251, 191, 36, 0.72);
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.18),
    rgba(245, 158, 11, 0.08)
  );
  color: #fbbf24 !important;
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.12);
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.propertyOpenLink:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, #f59e0b, #facc15);
  color: #10162e !important;
  text-decoration: none;
}

@media (max-width: 700px) {
  .cockpitMediaHeader {
    grid-template-columns: 42px minmax(0, 1fr) 42px;
  }

  .cockpitMediaArrow {
    width: 42px;
    height: 42px;
    font-size: 26px;
  }

  .cockpitMediaLayout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .cockpitMediaMain {
    min-height: 270px;
  }

  .cockpitThumbnailRail {
    grid-template-columns: 34px minmax(0, 1fr) 34px;
    grid-template-rows: auto;
  }

  .cockpitThumbnails {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: 78px;
  }

  .cockpitThumbnailNavigation {
    min-height: 78px;
  }
}
/* Desktop-Korrektur für die Cockpit-Bildergalerie */

.slideshowCard {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
}

@media (min-width: 701px) {
  .cockpitMediaLayout {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 145px !important;
    gap: 13px !important;
    width: 100% !important;
    min-height: 360px !important;
  }

  .cockpitMediaMain {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 360px !important;
  }

  .cockpitThumbnailRail {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 34px minmax(0, 1fr) 34px !important;
    gap: 8px !important;
    min-width: 0 !important;
  }

  .cockpitThumbnails {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: repeat(3, minmax(0, 1fr)) !important;
    gap: 8px !important;
  }

  .cockpitThumbnailNavigation {
    width: 100% !important;
    min-height: 0 !important;
  }
}
  /* Schnellzugriff und Checkliste als gemeinsamer Block */

.mainGrid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.75fr)
    minmax(310px, 0.75fr);
  gap: 0;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 21px;
  background: rgba(9, 22, 54, 0.87);
  box-shadow: 0 24px 65px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(17px);
}

.mainGrid .mainColumn,
.mainGrid .sideColumn {
  display: block;
  min-width: 0;
}

.mainGrid .quickPanel,
.mainGrid .checklistPanel {
  height: 100%;
  min-height: 100%;
  padding: 24px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.mainGrid .checklistPanel {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(5, 16, 43, 0.28);
}

@media (max-width: 1100px) {
  .mainGrid {
    grid-template-columns: 1fr;
  }

  .mainGrid .checklistPanel {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-left: 0;
  }
}

@media (max-width: 640px) {
  .mainGrid .quickPanel,
  .mainGrid .checklistPanel {
    padding: 18px;
  }
}
  /* FINAL: Schnellzugriff + Checkliste als EIN gemeinsamer Block */

.mainGrid {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 390px) !important;
  align-items: stretch !important;
  gap: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 22px !important;
  background: rgba(9, 22, 54, 0.87) !important;
  box-shadow: 0 24px 65px rgba(0, 0, 0, 0.2) !important;
}

.mainGrid > .mainColumn,
.mainGrid > .sideColumn {
  display: block !important;
  min-width: 0 !important;
  height: 100% !important;
  gap: 0 !important;
  margin: 0 !important;
}

.mainGrid > .mainColumn > .quickPanel,
.mainGrid > .sideColumn > .checklistPanel {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  margin: 0 !important;
  padding: 24px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}

.mainGrid > .sideColumn > .checklistPanel {
  border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(5, 16, 43, 0.3) !important;
}

@media (max-width: 1100px) {
  .mainGrid {
    grid-template-columns: 1fr !important;
  }

  .mainGrid > .sideColumn > .checklistPanel {
    border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-left: 0 !important;
  }
}

@media (max-width: 640px) {
  .mainGrid > .mainColumn > .quickPanel,
  .mainGrid > .sideColumn > .checklistPanel {
    padding: 18px !important;
  }
}
  /* Schnellzugriff und Checkliste wirklich in EINEM Block */

.allFunctionsPanel {
  display: block;
  width: 100%;
}

.functionsDivider {
  width: 100%;
  height: 1px;
  margin: 28px 0 24px;
  background: rgba(255, 255, 255, 0.1);
}

.checklistInside {
  width: 100%;
}

.checklistInsideLayout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: center;
  gap: 30px;
}

.checklistInside .progressCircle {
  margin: 0 auto;
}

.checklistInside .checklist {
  width: 100%;
}

@media (max-width: 800px) {
  .checklistInsideLayout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .allFunctionsPanel {
    padding: 18px;
  }
}
  /* FINAL – GEMEINSAMER FUNKTIONSBLOCK SAUBER GEGLIEDERT */

.allFunctionsPanel {
  display: block !important;
  width: 100% !important;
  padding: 28px !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 255, 255, 0.11) !important;
  border-radius: 22px !important;
  background: rgba(8, 23, 58, 0.9) !important;
  box-shadow: 0 24px 65px rgba(0, 0, 0, 0.2) !important;
}

/* Überschrift Schnellzugriff */

.allFunctionsPanel > .panelHeader {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 20px !important;
}

.allFunctionsPanel .sectionLabel {
  margin: 0 0 8px !important;
  color: #fbbf24 !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: 0.16em !important;
}

.allFunctionsPanel h2 {
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 22px !important;
  line-height: 1.2 !important;
}

/* Drei Schnellzugriff-Karten */

.allFunctionsPanel .quickGrid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 16px !important;
  width: 100% !important;
}

.allFunctionsPanel .quickCard {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  min-height: 185px !important;
  padding: 20px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 17px !important;
  background: rgba(255, 255, 255, 0.035) !important;
  color: #ffffff !important;
  text-decoration: none !important;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease !important;
}

.allFunctionsPanel .quickCard:hover {
  transform: translateY(-3px) !important;
  border-color: rgba(251, 191, 36, 0.42) !important;
  background: rgba(251, 191, 36, 0.065) !important;
}

.allFunctionsPanel .quickIcon {
  display: grid !important;
  place-items: center !important;
  width: 42px !important;
  height: 42px !important;
  margin-bottom: 16px !important;
  border-radius: 13px !important;
  background: rgba(255, 255, 255, 0.09) !important;
  font-size: 19px !important;
}

.allFunctionsPanel .quickCard h3 {
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 15px !important;
  font-weight: 800 !important;
}

.allFunctionsPanel .quickCard p {
  margin: 8px 0 16px !important;
  color: #9aa8c5 !important;
  font-size: 12px !important;
  line-height: 1.55 !important;
}

.allFunctionsPanel .quickCard strong {
  display: block !important;
  margin-top: auto !important;
  color: #fbbf24 !important;
  font-size: 12px !important;
  font-weight: 900 !important;
}

/* Trennlinie zwischen Funktionen und Checkliste */

.allFunctionsPanel .functionsDivider {
  width: 100% !important;
  height: 1px !important;
  margin: 30px 0 26px !important;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.16),
    transparent
  ) !important;
}

/* Checklisten-Bereich */

.allFunctionsPanel .checklistInside {
  display: block !important;
  width: 100% !important;
}

.allFunctionsPanel .checklistInside > .panelHeader {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 20px !important;
  margin-bottom: 22px !important;
}

.allFunctionsPanel .checklistTitle button {
  padding: 8px 12px !important;
  border: 1px solid rgba(251, 191, 36, 0.28) !important;
  border-radius: 10px !important;
  background: rgba(251, 191, 36, 0.07) !important;
  color: #fbbf24 !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
}

.allFunctionsPanel .checklistInsideLayout {
  display: grid !important;
  grid-template-columns: 180px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 30px !important;
  width: 100% !important;
}

/* Fortschrittskreis */

.allFunctionsPanel .progressCircle {
  position: relative !important;
  display: grid !important;
  place-items: center !important;
  width: 145px !important;
  height: 145px !important;
  margin: 0 auto !important;
  border-radius: 50% !important;
  flex: none !important;
}

.allFunctionsPanel .progressCircle > div {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
}

.allFunctionsPanel .progressCircle strong {
  color: #ffffff !important;
  font-size: 27px !important;
  line-height: 1 !important;
}

.allFunctionsPanel .progressCircle span {
  display: block !important;
  margin-top: 8px !important;
  color: #8795b3 !important;
  font-size: 10px !important;
}

/* Aufgaben als sauberes 2x2-Raster */

.allFunctionsPanel .checklist {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
  width: 100% !important;
}

.allFunctionsPanel .checkItem {
  display: flex !important;
  align-items: flex-start !important;
  gap: 12px !important;
  width: 100% !important;
  min-height: 78px !important;
  padding: 15px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, 0.035) !important;
  color: #ffffff !important;
  text-align: left !important;
  cursor: pointer !important;
}

.allFunctionsPanel .checkItem:hover {
  border-color: rgba(251, 191, 36, 0.35) !important;
  background: rgba(251, 191, 36, 0.055) !important;
}

.allFunctionsPanel .checkBox {
  display: grid !important;
  place-items: center !important;
  width: 22px !important;
  height: 22px !important;
  flex: 0 0 22px !important;
  border: 1px solid rgba(251, 191, 36, 0.7) !important;
  border-radius: 6px !important;
  color: #fbbf24 !important;
  font-size: 12px !important;
  font-weight: 900 !important;
}

.allFunctionsPanel .checkText {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important;
}

.allFunctionsPanel .checkText strong {
  color: #ffffff !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
}

.allFunctionsPanel .checkText small {
  display: block !important;
  margin-top: 5px !important;
  color: #8593af !important;
  font-size: 10px !important;
  line-height: 1.45 !important;
}

.allFunctionsPanel .checkItem.completed {
  border-color: rgba(34, 197, 94, 0.3) !important;
  background: rgba(34, 197, 94, 0.07) !important;
}

.allFunctionsPanel .checkItem.completed .checkBox {
  border-color: #22c55e !important;
  background: rgba(34, 197, 94, 0.17) !important;
  color: #86efac !important;
}

/* Tablet */

@media (max-width: 900px) {
  .allFunctionsPanel .quickGrid {
    grid-template-columns: 1fr !important;
  }

  .allFunctionsPanel .quickCard {
    min-height: auto !important;
  }

  .allFunctionsPanel .checklistInsideLayout {
    grid-template-columns: 1fr !important;
  }

  .allFunctionsPanel .checklist {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

/* Smartphone */

@media (max-width: 600px) {
  .allFunctionsPanel {
    padding: 18px !important;
    border-radius: 18px !important;
  }

  .allFunctionsPanel h2 {
    font-size: 19px !important;
  }

  .allFunctionsPanel .quickGrid,
  .allFunctionsPanel .checklist {
    grid-template-columns: 1fr !important;
  }

  .allFunctionsPanel .checklistInside > .panelHeader {
    align-items: center !important;
  }

  .allFunctionsPanel .progressCircle {
    width: 130px !important;
    height: 130px !important;
  }
}
  /* FINALE SEITENBEZEICHNUNG IM COCKPIT */

.cockpitWordmark {
  position: relative !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  justify-self: center !important;
  min-width: 280px !important;
  padding: 15px 26px 17px !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 255, 255, 0.13) !important;
  border-radius: 18px !important;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.055),
      rgba(255, 255, 255, 0.018)
    ) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 14px 34px rgba(0, 0, 0, 0.18) !important;
}

.cockpitWordmark::before {
  content: "";
  position: absolute;
  top: -45px;
  right: -20px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.1);
  filter: blur(28px);
  pointer-events: none;
}

.cockpitWordmark::after {
  content: "";
  position: absolute;
  bottom: 8px;
  left: 50%;
  width: 58px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    #fbbf24,
    transparent
  );
  transform: translateX(-50%);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.38);
}

.cockpitWordmark strong {
  position: relative !important;
  z-index: 1 !important;
  display: block !important;
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 26px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  letter-spacing: -0.045em !important;
}

.cockpitWordmark strong span {
  color: #fbbf24 !important;
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
}
  /* DREI EINHEITLICHE SCHNELLZUGRIFF-KARTEN */

.allFunctionsPanel .quickGrid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  align-items: stretch !important;
  gap: 20px !important;
  width: 100% !important;
}

.allFunctionsPanel .quickGrid .quickCard {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;

  width: 100% !important;
  min-width: 0 !important;
  min-height: 245px !important;
  padding: 24px !important;

  border: 1px solid rgba(251, 191, 36, 0.34) !important;
  border-radius: 19px !important;

  background:
    radial-gradient(
      circle at top left,
      rgba(251, 191, 36, 0.1),
      transparent 48%
    ),
    rgba(255, 255, 255, 0.035) !important;

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 18px 38px rgba(0, 0, 0, 0.18) !important;

  color: #ffffff !important;
  text-decoration: none !important;
}

.allFunctionsPanel .quickGrid .quickCard:nth-child(2) {
  border-color: rgba(34, 211, 238, 0.36) !important;

  background:
    radial-gradient(
      circle at top left,
      rgba(34, 211, 238, 0.1),
      transparent 48%
    ),
    rgba(255, 255, 255, 0.035) !important;
}

.allFunctionsPanel .quickGrid .quickCard:nth-child(3) {
  border-color: rgba(129, 140, 248, 0.38) !important;

  background:
    radial-gradient(
      circle at top left,
      rgba(129, 140, 248, 0.11),
      transparent 48%
    ),
    rgba(255, 255, 255, 0.035) !important;
}

.allFunctionsPanel .quickGrid .quickCard strong {
  margin-top: auto !important;
}

@media (max-width: 900px) {
  .allFunctionsPanel .quickGrid {
    grid-template-columns: 1fr !important;
  }

  .allFunctionsPanel .quickGrid .quickCard {
    min-height: 185px !important;
  }
}
  
      `}</style>
    </main>
  );
}