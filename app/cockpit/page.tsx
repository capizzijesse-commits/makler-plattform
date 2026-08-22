"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
type ListingImage = {
  id: string;
  url: string;
  isPrimary: boolean;
};
type Listing = {
  id: string;
  projectName: string | null;
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
  const [companyLogoPreview, setCompanyLogoPreview] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const [listings, setListings] = useState<Listing[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
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

      const accountLogoUrl =
        typeof data?.user?.companyLogoUrl === "string"
          ? data.user.companyLogoUrl.trim()
          : "";
      if (accountName) {
        setUserName(accountName);

        localStorage.setItem(
          "userName",
          accountName
        );
      }

      setCompanyName(accountCompany);


      setCompanyLogoPreview(
        (current) => {
          if (
            current &&
            current.startsWith("blob:")
          ) {
            URL.revokeObjectURL(
              current
            );
          }

          return accountLogoUrl;
        }
      );

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

    async function handleCompanyLogoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const input =
      event.currentTarget;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }


    const allowedTypes =
      new Set([
        "image/png",
        "image/jpeg",
        "image/webp",
      ]);


    if (
      !allowedTypes.has(file.type) ||
      file.size <= 0 ||
      file.size > 2 * 1024 * 1024
    ) {
      input.value = "";

      console.warn(
        "FIRMENLOGO: Nur PNG, JPG oder WebP bis 2 MB."
      );

      return;
    }


    input.disabled = true;

    const previousLogo =
      companyLogoPreview;

    const localPreview =
      URL.createObjectURL(file);


    setCompanyLogoPreview(
      localPreview
    );


    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );


      const response =
        await fetch(
          "/api/account/logo",
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );


      const data =
        (await response
          .json()
          .catch(() => null)) as
          | {
              success?: boolean;
              logoUrl?: unknown;
              error?: unknown;
            }
          | null;


      const savedLogoUrl =
        typeof data?.logoUrl === "string"
          ? data.logoUrl.trim()
          : "";


      if (
        !response.ok ||
        data?.success !== true ||
        !savedLogoUrl
      ) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Firmenlogo konnte nicht gespeichert werden."
        );
      }


      setCompanyLogoPreview(
        savedLogoUrl
      );


      if (
        previousLogo &&
        previousLogo.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          previousLogo
        );
      }


      URL.revokeObjectURL(
        localPreview
      );

    } catch (error) {

      URL.revokeObjectURL(
        localPreview
      );


      setCompanyLogoPreview(
        previousLogo
      );


      console.error(
        "FIRMENLOGO UPLOAD FEHLER:",
        error
      );

    } finally {

      input.disabled = false;
      input.value = "";

    }
  }

return (
    <main className="cockpitPage">
      <div className="pageGlow pageGlowOne" />
      <div className="pageGlow pageGlowTwo" />

      <div className="cockpitContainer">
        <div className="cockpitTopbar">
          <div
            className="cockpitSkylineLayer"
            aria-hidden="true"
          />
          <div
            className="cockpitSkylineShade"
            aria-hidden="true"
          />
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

          <div className="cockpitTopbarBrandRow">

            <div className="cockpitTopbarIntegratedHero">
              <p className="eyebrow">
                {t("hero.eyebrow")}
              </p>

              <h1>
                {companyName.trim() ||
                  userName.trim() ||
                  t("hero.fallbackTitle")}
              </h1>
            </div>


            <div
              className={`cockpitCompanyLogoSlot ${companyLogoPreview ? "hasLogo" : ""}`}
              aria-label={
                locale === "it"
                  ? "Logo aziendale"
                  : locale === "fr"
                    ? "Logo de l'entreprise"
                    : locale === "en"
                      ? "Company logo"
                      : "Firmenlogo"
              }
            >
              {companyLogoPreview && (
                <div
                  className="cockpitCompanyLogoBackdrop"
                  style={{
                    backgroundImage:
                      `url("${companyLogoPreview}")`,
                  }}
                  aria-hidden="true"
                />
              )}

              <label
                htmlFor="cockpit-company-logo-input"
                className="cockpitCompanyLogoPicker"
                title={
                  locale === "it"
                    ? "Seleziona logo"
                    : locale === "fr"
                      ? "Choisir le logo"
                      : locale === "en"
                        ? "Choose logo"
                        : "Logo auswählen"
                }
              >
                {companyLogoPreview ? (
                  <img
                    src={companyLogoPreview}
                    alt={
                      locale === "it"
                        ? "Anteprima logo aziendale"
                        : locale === "fr"
                          ? "Aperçu du logo"
                          : locale === "en"
                            ? "Company logo preview"
                            : "Firmenlogo Vorschau"
                    }
                    className="cockpitCompanyLogoPreview"
                  />
                ) : (
                  <span
                    className="cockpitCompanyLogoIcon"
                    aria-hidden="true"
                  >
                    +
                  </span>
                )}

                <input
                  id="cockpit-company-logo-input"
                  className="cockpitCompanyLogoInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCompanyLogoChange}
                />
              </label>

              <div className="cockpitCompanyLogoText">
                <strong>
                  {locale === "it"
                    ? "Logo aziendale"
                    : locale === "fr"
                      ? "Logo de l'entreprise"
                      : locale === "en"
                        ? "Company logo"
                        : "Firmenlogo"}
                </strong>

                <small>
                  {locale === "it"
                    ? "Il vostro marchio"
                    : locale === "fr"
                      ? "Votre identité visuelle"
                      : locale === "en"
                        ? "Your brand"
                        : "Ihre Marke"}
                </small>
              </div>
            </div>

          </div>
        </div>

        <section className="heroSection">
          <div className="heroContent">
            <p className="heroDescription">
              {t("hero.description")}
            </p>

            <p className="currentDate">{currentDate}</p>
          </div>

          <div className="heroActions">



          </div>
        </section>




<section
  className="panel objectsPanel legacyObjectsPanel"
  id="objekteLegacy"
  style={{ display: "none" }}
>
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
  <div className="panelHeader quickPanelHeaderV12">
  <div>
    <p className="sectionLabel">
      {t("quick.sectionLabel")}
    </p>

    <h2>
      {t("quick.title")}
    </h2>
  </div>
</div>
<div className="quickGrid quickGridV12">
    <button
      type="button"
      className={
        projectsOpen
          ? "quickCard quickProjectsCard quickProjectsCardOpen"
          : "quickCard quickProjectsCard"
      }
      onClick={() =>
        setProjectsOpen((current) => !current)
      }
      aria-expanded={projectsOpen}
      aria-controls="quick-projects-grid-panel"
    >
      <span className="quickIcon">
        📁
      </span>

      <h3>
        {locale === "it"
          ? "I miei progetti"
          : locale === "fr"
            ? "Mes projets"
            : locale === "en"
              ? "My projects"
              : "Meine Projekte"}
      </h3>

      <p>
        {loadingListings
          ? locale === "en"
            ? "Loading saved projects…"
            : "Gespeicherte Projekte werden geladen…"
          : locale === "it"
            ? `${listings.length} progetti salvati aprire e gestire.`
            : locale === "fr"
              ? `${listings.length} projets enregistrés à ouvrir et gérer.`
              : locale === "en"
                ? `Open and manage ${listings.length} saved projects.`
                : `${listings.length} gespeicherte Projekte öffnen und verwalten.`}
      </p>

      <strong>
        {projectsOpen
          ? locale === "en"
            ? "Close projects ↑"
            : "Projekte schliessen ↑"
          : locale === "it"
            ? "Mostra progetti →"
            : locale === "fr"
              ? "Afficher les projets →"
              : locale === "en"
                ? "View projects →"
                : "Projekte anzeigen →"}
      </strong>
    </button>

    <Link href="/dashboard" className="quickCard">
      <span className="quickIcon">✨</span>

      <h3>{t("quick.newListing.title")}</h3>

      <p>{t("quick.newListing.description")}</p>

      <strong>{t("quick.newListing.action")}</strong>
    </Link>

    <button
  type="button"
  className="quickCard quickCardButton"
  onClick={() => setProjectsOpen(true)}
  aria-controls="quick-projects-grid-panel"
>
      <span className="quickIcon">🏘️</span>

      <h3>{t("quick.manage.title")}</h3>

      <p>{t("quick.manage.description")}</p>

      <strong>{t("quick.manage.action")}</strong>
    </button>

    <Link href="/dashboard" className="quickCard">
      <span className="quickIcon">🖼️</span>

      <h3>{t("quick.images.title")}</h3>

      <p>{t("quick.images.description")}</p>

      <strong>{t("quick.images.action")}</strong>
    </Link>
</div>


  {projectsOpen && (
    <div
      id="quick-projects-grid-panel"
      className="quickProjectsGridPanel"
    >

      <div className="quickProjectsGridHeader">

        <div>
          <p className="sectionLabel">
            {locale === "it"
              ? "PROGETTI"
              : locale === "fr"
                ? "PROJETS"
                : locale === "en"
                  ? "PROJECTS"
                  : "PROJEKTE"}
          </p>

          <h3>
            {locale === "it"
              ? "I miei progetti"
              : locale === "fr"
                ? "Mes projets"
                : locale === "en"
                  ? "My projects"
                  : "Meine Projekte"}
          </h3>
        </div>

        <span className="quickProjectsGridCount">
          {loadingListings ? "…" : listings.length}
        </span>

      </div>


      <div className="quickProjectsGridList">

        {loadingListings ? (

          <div className="quickProjectsGridMessage">
            {locale === "it"
              ? "Caricamento progetti…"
              : locale === "fr"
                ? "Chargement des projets…"
                : locale === "en"
                  ? "Loading projects…"
                  : "Projekte werden geladen…"}
          </div>

        ) : listingsError ? (

          <div className="quickProjectsGridMessage quickProjectsGridError">
            {listingsError}
          </div>

        ) : listings.length === 0 ? (

          <div className="quickProjectsGridMessage">
            {locale === "it"
              ? "Nessun progetto salvato."
              : locale === "fr"
                ? "Aucun projet enregistré."
                : locale === "en"
                  ? "No saved projects yet."
                  : "Noch keine Projekte gespeichert."}
          </div>

        ) : (

          listings.map((listing, index) => {

            const roomLabel =
              locale === "it"
                ? "locali"
                : locale === "fr"
                  ? "pièces"
                  : locale === "en"
                    ? "rooms"
                    : "Zimmer";

            const connector =
              locale === "fr"
                ? "à"
                : locale === "it"
                  ? "a"
                  : "in";

            const fallbackName = [
              listing.rooms !== null
                ? `${listing.rooms} ${roomLabel}`
                : "",
              listing.propertyType,
              listing.location
                ? `${connector} ${listing.location}`
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            const displayName =
              listing.projectName?.trim() ||
              fallbackName ||
              listing.location ||
              (locale === "en"
                ? "Untitled project"
                : "Unbenanntes Projekt");

            return (
              <Link
                key={listing.id}
                href={`/cockpit/${listing.id}`}
                className="quickProjectsGridRow"
              >
                <span className="quickProjectsGridIndex">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="quickProjectsGridName">
                  {displayName}
                </span>

                <span
                  className="quickProjectsGridArrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </Link>
            );
          })

        )}

      </div>

    </div>
  )}
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


/* =========================================================
   INSERAT-AI PROJECT ACCORDION V1
   Desktop + Mobile
   ========================================================= */

.legacyObjectsPanel {
  display: none !important;
}

.projectsAccordion {
  width: 100%;
  max-width: 100%;
  margin: 24px 0 28px;
}

.projectsAccordionToggle {
  display: flex;
  width: 100%;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 22px;
  border: 1px solid rgba(251, 191, 36, 0.65);
  border-radius: 18px;
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(251, 191, 36, 0.16),
      transparent 40%
    ),
    linear-gradient(
      135deg,
      rgba(12, 27, 65, 0.99),
      rgba(18, 39, 86, 0.98)
    );
  color: #ffffff;
  cursor: pointer;
  text-align: left;
  box-shadow:
    0 15px 36px rgba(0, 0, 0, 0.25),
    0 0 26px rgba(245, 158, 11, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.projectsAccordionToggle:hover {
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.95);
  box-shadow:
    0 17px 40px rgba(0, 0, 0, 0.3),
    0 0 32px rgba(245, 158, 11, 0.14);
}

.projectsAccordionTitle {
  min-width: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.projectsAccordionTitle strong {
  color: #fbbf24;
  font-weight: 900;
}

.projectsAccordionChevron {
  flex: none;
  color: #fbbf24;
  font-size: 26px;
  line-height: 1;
  transition: transform 0.22s ease;
}

.projectsAccordionChevron.open {
  transform: rotate(180deg);
}

.projectsAccordionBody {
  display: grid;
  width: 100%;
  gap: 10px;
  margin-top: 11px;
  animation: projectAccordionOpen 0.2s ease;
}

.projectRow {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 18px;
  border: 1px solid rgba(251, 191, 36, 0.32);
  border-radius: 14px;
  background:
    linear-gradient(
      135deg,
      rgba(16, 34, 75, 0.96),
      rgba(9, 23, 57, 0.97)
    );
  color: #ffffff;
  text-decoration: none;
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}

.projectRow:hover {
  transform: translateX(3px);
  border-color: rgba(251, 191, 36, 0.72);
}

.projectRowName {
  min-width: 0;
  overflow: hidden;
  color: #f8fafc;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.projectRowArrow {
  flex: none;
  color: #fbbf24;
  font-size: 28px;
  line-height: 1;
}

.projectListMessage {
  padding: 17px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 14px;
  background: rgba(8,21,53,0.74);
  color: rgba(255,255,255,0.72);
  font-size: 14px;
}

.projectListError {
  border-color: rgba(248,113,113,0.3);
  color: #fca5a5;
}

@keyframes projectAccordionOpen {
  from {
    opacity: 0;
    transform: translateY(-7px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 700px) {
  .projectsAccordion {
    margin: 18px 0 22px;
  }

  .projectsAccordionToggle {
    min-height: 60px;
    padding: 0 16px;
    gap: 12px;
    border-radius: 16px;
  }

  .projectsAccordionTitle {
    font-size: 16px;
  }

  .projectsAccordionChevron {
    font-size: 23px;
  }

  .projectsAccordionBody {
    margin-top: 9px;
    gap: 9px;
  }

  .projectRow {
    min-height: 56px;
    padding: 13px 15px;
    gap: 12px;
    border-radius: 13px;
  }

  .projectRowName {
    font-size: 14px;
  }

  .projectRowArrow {
    font-size: 25px;
  }
}

/* =========================================================
   INSERAT-AI PROJECT STAT DROPDOWN FINAL V3
   Desktop + Mobile
   ========================================================= */

.statsGrid {
  overflow: visible !important;
}

.projectsStatWrap {
  position: relative;
  min-width: 0;
  z-index: 50;
}

.projectsStatCard {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  appearance: none !important;
  text-align: left !important;
  cursor: pointer !important;
  color: inherit !important;
  font: inherit !important;
}

.projectsStatCard:hover,
.projectsStatCardOpen {
  border-color: rgba(251, 191, 36, 0.72) !important;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.26),
    0 0 28px rgba(245, 158, 11, 0.12) !important;
}

.projectsStatContent {
  min-width: 0;
}

.projectsStatChevron {
  position: absolute;
  top: 18px;
  right: 18px;
  color: #fbbf24;
  font-size: 25px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.projectsStatChevron.open {
  transform: rotate(180deg);
}

.projectsStatDropdown {
  position: absolute;
  z-index: 200;
  top: calc(100% + 10px);
  left: 0;
  display: grid;
  width: min(520px, calc(100vw - 36px));
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(251, 191, 36, 0.50);
  border-radius: 16px;
  background:
    radial-gradient(
      circle at top left,
      rgba(251, 191, 36, 0.10),
      transparent 38%
    ),
    linear-gradient(
      145deg,
      rgba(8, 21, 53, 0.995),
      rgba(16, 34, 75, 0.995)
    );
  box-shadow:
    0 26px 60px rgba(0, 0, 0, 0.46),
    0 0 34px rgba(245, 158, 11, 0.10);
  animation: projectsStatDropdownOpen 0.18s ease;
}

.projectsStatRow {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 57px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 15px;
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 12px;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,0.04),
      rgba(255,255,255,0.02)
    );
  color: #f8fafc;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.projectsStatRow:hover {
  transform: translateX(3px);
  border-color: rgba(251, 191, 36, 0.68);
  background: rgba(251, 191, 36, 0.075);
}

.projectsStatRow > span {
  min-width: 0;
  overflow: hidden;
  color: #f8fafc;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.projectsStatRow > strong {
  flex: none;
  color: #fbbf24;
  font-size: 26px;
  font-weight: 500;
  line-height: 1;
}

.projectStatMessage {
  padding: 16px;
  color: rgba(255,255,255,0.72);
  font-size: 13px;
}

.projectStatError {
  color: #fca5a5;
}

@keyframes projectsStatDropdownOpen {
  from {
    opacity: 0;
    transform: translateY(-7px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 700px) {
  .projectsStatWrap {
    position: static;
  }

  .projectsStatCard {
    min-height: 0 !important;
  }

  .projectsStatChevron {
    top: 14px;
    right: 14px;
    font-size: 22px;
  }

  .projectsStatDropdown {
    position: static;
    width: 100%;
    max-width: 100%;
    margin-top: 9px;
    padding: 8px;
    border-radius: 14px;
  }

  .projectsStatRow {
    min-height: 54px;
    gap: 12px;
    padding: 11px 13px;
  }

  .projectsStatRow > span {
    font-size: 13px;
  }

  .projectsStatRow > strong {
    font-size: 24px;
  }
}

/* =========================================================
   INSERAT-AI COCKPIT SLIM AMBER BARS V4
   3 kompakte Leisten + Premium Projekt-Dropdown
   Desktop + Mobile
   ========================================================= */


/* ---------------------------------------------------------
   TOP-STATS: NUR 3 SCHMALE LEISTEN
   --------------------------------------------------------- */

.statsGrid {
  position: relative !important;
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  align-items: start !important;
  gap: 14px !important;
  overflow: visible !important;
  margin-top: 22px !important;
}


/* Bestehende grosse Karten in kompakte Bars verwandeln */

.statsGrid > .projectsStatWrap,
.statsGrid > article.statCard {
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  margin: 0 !important;
}


/* Projekt-Bar */

.projectsStatCard {
  position: relative !important;
  display: flex !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 62px !important;
  height: 62px !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 0 !important;
  padding: 0 48px 0 18px !important;

  border:
    1px solid rgba(251, 191, 36, 0.62) !important;

  border-radius: 15px !important;

  background:
    radial-gradient(
      circle at 8% 0%,
      rgba(251, 191, 36, 0.14),
      transparent 40%
    ),
    linear-gradient(
      135deg,
      rgba(15, 31, 70, 0.98),
      rgba(9, 23, 56, 0.98)
    ) !important;

  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.20),
    inset 0 1px 0 rgba(255,255,255,0.05) !important;

  cursor: pointer !important;
  text-align: left !important;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease !important;
}


/* Normale Statistik-Bars */

.statsGrid > article.statCard {
  display: flex !important;
  min-height: 62px !important;
  height: 62px !important;
  align-items: center !important;
  justify-content: flex-start !important;
  padding: 0 18px !important;

  border:
    1px solid rgba(251, 191, 36, 0.42) !important;

  border-radius: 15px !important;

  background:
    radial-gradient(
      circle at 8% 0%,
      rgba(251, 191, 36, 0.10),
      transparent 40%
    ),
    linear-gradient(
      135deg,
      rgba(15, 31, 70, 0.98),
      rgba(9, 23, 56, 0.98)
    ) !important;

  box-shadow:
    0 10px 28px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.04) !important;
}


/* Icons in den drei Bars entfernen */

.statsGrid .statIcon {
  display: none !important;
}


/* Projektinhalt horizontal:
   Zahl zuerst, dann Text */

.projectsStatContent {
  display: flex !important;
  min-width: 0 !important;
  align-items: center !important;
  gap: 9px !important;
}

.projectsStatContent strong {
  order: 1 !important;
  margin: 0 !important;
  color: #fbbf24 !important;
  font-size: 20px !important;
  font-weight: 950 !important;
  line-height: 1 !important;
}

.projectsStatContent small {
  order: 2 !important;
  margin: 0 !important;
  overflow: hidden !important;
  color: #ffffff !important;
  font-size: 13px !important;
  font-weight: 850 !important;
  line-height: 1.2 !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.projectsStatContent p {
  display: none !important;
}


/* Die anderen beiden Bars:
   Zahl vor Bezeichnung */

.statsGrid > article.statCard > div {
  display: flex !important;
  min-width: 0 !important;
  align-items: center !important;
  gap: 9px !important;
}

.statsGrid > article.statCard > div > strong {
  order: 1 !important;
  margin: 0 !important;
  color: #fbbf24 !important;
  font-size: 20px !important;
  font-weight: 950 !important;
  line-height: 1 !important;
}

.statsGrid > article.statCard > div > small {
  order: 2 !important;
  margin: 0 !important;
  overflow: hidden !important;
  color: #ffffff !important;
  font-size: 13px !important;
  font-weight: 850 !important;
  line-height: 1.2 !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.statsGrid > article.statCard > div > p {
  display: none !important;
}


/* Hover */

.projectsStatCard:hover,
.projectsStatCardOpen,
.statsGrid > article.statCard:hover {
  transform: translateY(-1px) !important;

  border-color:
    rgba(251, 191, 36, 0.80) !important;

  box-shadow:
    0 12px 32px rgba(0,0,0,0.24),
    0 0 20px rgba(245,158,11,0.08) !important;
}


/* Dropdown-Pfeil */

.projectsStatChevron {
  position: absolute !important;
  top: 50% !important;
  right: 16px !important;
  color: #fbbf24 !important;
  font-size: 21px !important;
  line-height: 1 !important;
  transform:
    translateY(-50%) rotate(0deg) !important;
  transition:
    transform 0.2s ease !important;
}

.projectsStatChevron.open {
  transform:
    translateY(-50%) rotate(180deg) !important;
}


/* ---------------------------------------------------------
   PREMIUM PROJEKT-DROPDOWN
   --------------------------------------------------------- */

.projectsStatWrap {
  position: relative !important;
  z-index: 100 !important;
}

.projectsStatDropdown {
  position: absolute !important;
  z-index: 500 !important;

  top: calc(100% + 10px) !important;
  left: 0 !important;

  display: grid !important;

  width:
    min(560px, calc(100vw - 40px)) !important;

  gap: 9px !important;
  padding: 10px !important;

  border:
    1px solid rgba(251,191,36,0.48) !important;

  border-radius: 16px !important;

  background:
    radial-gradient(
      circle at top left,
      rgba(251,191,36,0.10),
      transparent 36%
    ),
    linear-gradient(
      145deg,
      rgba(6,17,43,0.995),
      rgba(13,31,70,0.995)
    ) !important;

  box-shadow:
    0 24px 58px rgba(0,0,0,0.48),
    0 0 30px rgba(245,158,11,0.09) !important;

  animation:
    projectPremiumOpen 0.18s ease !important;
}


/* JEDES Projekt ist eine eigene richtige Zeile */

.projectsStatRow {
  position: relative !important;

  display: flex !important;

  width: 100% !important;
  min-width: 0 !important;
  min-height: 58px !important;

  align-items: center !important;
  justify-content: space-between !important;

  gap: 16px !important;

  padding:
    12px 15px 12px 16px !important;

  border:
    1px solid rgba(251,191,36,0.26) !important;

  border-radius: 12px !important;

  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,0.055),
      rgba(255,255,255,0.018)
    ) !important;

  color: #ffffff !important;
  text-decoration: none !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04) !important;

  transition:
    transform 0.17s ease,
    border-color 0.17s ease,
    background 0.17s ease,
    box-shadow 0.17s ease !important;
}


/* kleiner Amber-Akzent links */

.projectsStatRow::before {
  content: "" !important;

  width: 3px !important;
  height: 28px !important;

  flex: none !important;

  border-radius: 999px !important;

  background:
    linear-gradient(
      180deg,
      #fbbf24,
      #f59e0b
    ) !important;

  box-shadow:
    0 0 12px rgba(251,191,36,0.20) !important;
}


/* Projektname */

.projectsStatRow > span {
  flex: 1 1 auto !important;

  min-width: 0 !important;

  overflow: hidden !important;

  color: #f8fafc !important;

  font-size: 14px !important;
  font-weight: 800 !important;

  line-height: 1.35 !important;

  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}


/* Pfeil rechts */

.projectsStatRow > strong {
  flex: none !important;

  color: #fbbf24 !important;

  font-size: 27px !important;
  font-weight: 400 !important;

  line-height: 1 !important;
}


/* Hover pro Projekt */

.projectsStatRow:hover {
  transform:
    translateX(3px) !important;

  border-color:
    rgba(251,191,36,0.68) !important;

  background:
    linear-gradient(
      135deg,
      rgba(251,191,36,0.095),
      rgba(255,255,255,0.025)
    ) !important;

  box-shadow:
    0 8px 20px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.05) !important;
}


.projectStatMessage {
  padding: 15px !important;

  border:
    1px solid rgba(255,255,255,0.08) !important;

  border-radius: 11px !important;

  color:
    rgba(255,255,255,0.70) !important;

  font-size: 13px !important;
}


@keyframes projectPremiumOpen {

  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }

}


/* ---------------------------------------------------------
   MOBILE
   --------------------------------------------------------- */

@media (max-width: 700px) {

  .statsGrid {
    grid-template-columns: 1fr !important;
    gap: 9px !important;
  }

  .projectsStatCard,
  .statsGrid > article.statCard {
    min-height: 58px !important;
    height: 58px !important;
    border-radius: 14px !important;
  }

  .projectsStatCard {
    padding:
      0 44px 0 15px !important;
  }

  .statsGrid > article.statCard {
    padding:
      0 15px !important;
  }

  .projectsStatContent strong,
  .statsGrid > article.statCard > div > strong {
    font-size: 19px !important;
  }

  .projectsStatContent small,
  .statsGrid > article.statCard > div > small {
    font-size: 12px !important;
  }

  .projectsStatWrap {
    position: relative !important;
  }

  .projectsStatDropdown {
    position: static !important;

    width: 100% !important;
    max-width: 100% !important;

    margin-top: 8px !important;

    padding: 8px !important;

    border-radius: 14px !important;
  }

  .projectsStatRow {
    min-height: 55px !important;

    padding:
      11px 12px !important;
  }

  .projectsStatRow::before {
    height: 25px !important;
  }

  .projectsStatRow > span {
    font-size: 13px !important;
  }

  .projectsStatRow > strong {
    font-size: 24px !important;
  }

}

/* =========================================================
   INSERAT-AI COCKPIT TOP STRIPS V5
   Eigenständige Struktur ohne alte statCard-Abhängigkeiten
   ========================================================= */

.cockpitStatsArea {
  position: relative;
  z-index: 120;
  width: 100%;
  margin: 20px 0 28px;
  overflow: visible;
}


/* =========================================================
   3 LEISTEN - KOMPLETTE BREITE
   ========================================================= */

.cockpitStatBars {
  display: grid;
  width: 100%;
  grid-template-columns:
    minmax(0, 1.65fr)
    minmax(0, 0.85fr)
    minmax(0, 1fr);
  gap: 12px;
}


.cockpitStatStrip {
  position: relative;

  display: flex;
  width: 100%;
  height: 52px;
  min-width: 0;

  align-items: center;

  gap: 9px;

  padding: 0 16px;

  overflow: hidden;

  border:
    1px solid rgba(251, 191, 36, 0.88);

  border-radius: 12px;

  background:
    linear-gradient(
      100deg,
      rgba(245, 158, 11, 0.30) 0%,
      rgba(251, 191, 36, 0.15) 32%,
      rgba(13, 30, 68, 0.98) 75%
    );

  box-shadow:
    inset 0 1px 0 rgba(255, 226, 151, 0.18),
    0 8px 22px rgba(0, 0, 0, 0.16),
    0 0 18px rgba(245, 158, 11, 0.06);

  color: #ffffff;
}


/* Goldkante oben */

.cockpitStatStrip::before {
  content: "";

  position: absolute;

  top: 0;
  right: 12px;
  left: 12px;

  height: 1px;

  background:
    linear-gradient(
      90deg,
      transparent,
      #fbbf24,
      #f59e0b,
      transparent
    );

  opacity: 0.9;
}


/* Erste Leiste stärker hervorheben */

.cockpitProjectStrip {
  appearance: none;

  padding-right: 46px;

  cursor: pointer;

  text-align: left;

  background:
    linear-gradient(
      100deg,
      rgba(245, 158, 11, 0.42) 0%,
      rgba(251, 191, 36, 0.20) 36%,
      rgba(13, 30, 68, 0.98) 78%
    );

  transition:
    transform 0.17s ease,
    box-shadow 0.17s ease,
    border-color 0.17s ease;
}


.cockpitProjectStrip:hover,
.cockpitProjectStripOpen {
  transform: translateY(-1px);

  border-color: #fbbf24;

  box-shadow:
    inset 0 1px 0 rgba(255, 231, 170, 0.24),
    0 10px 28px rgba(0, 0, 0, 0.22),
    0 0 26px rgba(245, 158, 11, 0.14);
}


.cockpitStatNumber {
  flex: none;

  color: #fbbf24;

  font-size: 19px;
  font-weight: 950;

  line-height: 1;
}


.cockpitStatLabel {
  min-width: 0;

  overflow: hidden;

  color: #fffaf0;

  font-size: 13px;
  font-weight: 850;

  line-height: 1.15;

  text-overflow: ellipsis;
  white-space: nowrap;
}


.cockpitStripChevron {
  position: absolute;

  top: 50%;
  right: 15px;

  color: #fbbf24;

  font-size: 21px;

  line-height: 1;

  transform:
    translateY(-50%) rotate(0deg);

  transition:
    transform 0.18s ease;
}


.cockpitStripChevron.open {
  transform:
    translateY(-50%) rotate(180deg);
}


/* =========================================================
   DROPDOWN - GANZE BREITE
   LEISTEN BLEIBEN FEST STEHEN
   ========================================================= */

.cockpitProjectsDropdown {
  position: absolute;

  z-index: 900;

  top: calc(100% + 10px);
  right: 0;
  left: 0;

  width: 100%;

  padding: 14px;

  border:
    1px solid rgba(251, 191, 36, 0.78);

  border-radius: 17px;

  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(245, 158, 11, 0.18),
      transparent 31%
    ),
    linear-gradient(
      145deg,
      rgba(5, 16, 41, 0.995),
      rgba(12, 29, 67, 0.995)
    );

  box-shadow:
    0 30px 70px rgba(0, 0, 0, 0.52),
    0 0 34px rgba(245, 158, 11, 0.13);

  animation:
    cockpitProjectsOpen 0.18s ease;
}


.cockpitProjectsDropdownHeader {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 20px;

  margin-bottom: 12px;

  padding:
    2px 3px 12px;

  border-bottom:
    1px solid rgba(251, 191, 36, 0.20);
}


.cockpitProjectsDropdownHeader > div {
  display: grid;
  gap: 4px;
}


.cockpitProjectsDropdownHeader small {
  color: #fbbf24;

  font-size: 10px;
  font-weight: 900;

  letter-spacing: 0.15em;
}


.cockpitProjectsDropdownHeader strong {
  color: #ffffff;

  font-size: 17px;
  font-weight: 900;
}


.cockpitProjectsClose {
  display: grid;

  width: 34px;
  height: 34px;

  flex: none;

  place-items: center;

  border:
    1px solid rgba(251, 191, 36, 0.38);

  border-radius: 10px;

  background:
    rgba(245, 158, 11, 0.08);

  color: #fbbf24;

  cursor: pointer;

  font-size: 22px;

  line-height: 1;
}


.cockpitProjectsList {
  display: grid;

  width: 100%;

  max-height: 430px;

  gap: 9px;

  overflow-y: auto;

  padding-right: 2px;
}


/* =========================================================
   JEDES PROJEKT ALS EIGENE PREMIUM-ZEILE
   ========================================================= */

.cockpitProjectRow {
  position: relative;

  display: grid;

  width: 100%;
  min-width: 0;
  min-height: 62px;

  grid-template-columns:
    38px
    minmax(0, 1fr)
    34px;

  align-items: center;

  gap: 12px;

  padding: 9px 12px;

  border:
    1px solid rgba(251, 191, 36, 0.28);

  border-radius: 13px;

  background:
    linear-gradient(
      90deg,
      rgba(245, 158, 11, 0.09),
      rgba(255, 255, 255, 0.035) 35%,
      rgba(255, 255, 255, 0.018)
    );

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.045);

  color: #ffffff;

  text-decoration: none;

  transition:
    transform 0.17s ease,
    border-color 0.17s ease,
    background 0.17s ease,
    box-shadow 0.17s ease;
}


.cockpitProjectRow:hover {
  transform:
    translateX(3px);

  border-color:
    rgba(251, 191, 36, 0.78);

  background:
    linear-gradient(
      90deg,
      rgba(245, 158, 11, 0.16),
      rgba(255, 255, 255, 0.045)
    );

  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255,255,255,0.05);
}


/* Nummer links */

.cockpitProjectIndex {
  display: grid;

  width: 34px;
  height: 34px;

  place-items: center;

  border:
    1px solid rgba(251, 191, 36, 0.50);

  border-radius: 10px;

  background:
    linear-gradient(
      145deg,
      rgba(245, 158, 11, 0.24),
      rgba(251, 191, 36, 0.08)
    );

  color: #fbbf24;

  font-size: 11px;
  font-weight: 950;
}


/* Projekttext */

.cockpitProjectMain {
  display: grid;

  min-width: 0;

  gap: 3px;
}


.cockpitProjectMain > strong {
  overflow: hidden;

  color: #ffffff;

  font-size: 14px;
  font-weight: 850;

  line-height: 1.25;

  text-overflow: ellipsis;
  white-space: nowrap;
}


.cockpitProjectMain > small {
  color:
    rgba(255, 255, 255, 0.49);

  font-size: 10px;
  font-weight: 650;
}


/* Pfeil rechts als eigener Amber-Button */

.cockpitProjectArrow {
  display: grid;

  width: 30px;
  height: 30px;

  place-items: center;

  border:
    1px solid rgba(251, 191, 36, 0.38);

  border-radius: 9px;

  background:
    rgba(245, 158, 11, 0.08);

  color: #fbbf24;

  font-size: 22px;

  line-height: 1;
}


.cockpitProjectMessage {
  padding: 18px;

  border:
    1px solid rgba(251, 191, 36, 0.20);

  border-radius: 12px;

  background:
    rgba(255, 255, 255, 0.025);

  color:
    rgba(255, 255, 255, 0.70);

  font-size: 13px;
}


.cockpitProjectError {
  color: #fca5a5;
}


@keyframes cockpitProjectsOpen {

  from {
    opacity: 0;

    transform:
      translateY(-7px);
  }

  to {
    opacity: 1;

    transform:
      translateY(0);
  }

}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitStatsArea {
    margin:
      16px 0 22px;
  }


  .cockpitStatBars {
    grid-template-columns: 1fr;

    gap: 8px;
  }


  .cockpitStatStrip {
    height: 48px;

    padding:
      0 14px;

    border-radius: 11px;
  }


  .cockpitProjectStrip {
    padding-right: 42px;
  }


  .cockpitStatNumber {
    font-size: 18px;
  }


  .cockpitStatLabel {
    font-size: 12px;
  }


  /*
   * Mobile Dropdown erst NACH allen drei Leisten.
   * Darum verschieben sich die anderen Leisten NICHT.
   */

  .cockpitProjectsDropdown {
    position: static;

    width: 100%;

    margin-top: 9px;

    padding: 10px;

    border-radius: 14px;
  }


  .cockpitProjectsDropdownHeader {
    margin-bottom: 9px;

    padding-bottom: 9px;
  }


  .cockpitProjectsList {
    max-height: 370px;

    gap: 8px;
  }


  .cockpitProjectRow {
    min-height: 58px;

    grid-template-columns:
      34px
      minmax(0, 1fr)
      30px;

    gap: 9px;

    padding:
      8px 9px;
  }


  .cockpitProjectIndex {
    width: 31px;
    height: 31px;

    border-radius: 9px;
  }


  .cockpitProjectMain > strong {
    font-size: 12px;
  }


  .cockpitProjectArrow {
    width: 28px;
    height: 28px;
  }

}
`}</style>





<style jsx global>{`
/* =========================================================
   INSERAT-AI COCKPIT PREMIUM V10
   ========================================================= */


/* =========================================================
   NEUES INSERAT CTA
   ========================================================= */

.cockpitNewListingButton {
  display: inline-flex !important;

  min-height: 44px !important;

  align-items: center !important;

  gap: 10px !important;

  padding:
    0 17px 0 9px !important;

  border:
    1px solid rgba(251,191,36,0.26) !important;

  border-radius:
    13px !important;

  background:
    linear-gradient(
      145deg,
      rgba(19,39,78,0.96),
      rgba(8,22,53,0.99)
    ) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.06),
    0 10px 24px rgba(0,0,0,0.16) !important;

  color:
    rgba(255,255,255,0.94) !important;

  font-size:
    13px !important;

  font-weight:
    750 !important;

  text-decoration:
    none !important;

  transition:
    transform 0.17s ease,
    border-color 0.17s ease,
    box-shadow 0.17s ease !important;
}


.cockpitNewListingButton:hover {
  transform:
    translateY(-1px) !important;

  border-color:
    rgba(251,191,36,0.48) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 14px 30px rgba(0,0,0,0.20),
    0 0 22px rgba(245,158,11,0.07) !important;
}


.cockpitNewListingIcon {
  display: grid !important;

  width: 28px !important;
  height: 28px !important;

  flex: none !important;

  place-items: center !important;

  border-radius:
    9px !important;

  background:
    linear-gradient(
      145deg,
      #fbbf24,
      #f59e0b
    ) !important;

  box-shadow:
    0 5px 14px rgba(245,158,11,0.20) !important;

  color:
    #07152f !important;

  font-size:
    19px !important;

  font-weight:
    700 !important;

  line-height:
    1 !important;
}


/* =========================================================
   TOP-STATS
   ========================================================= */

.cockpitStatsArea {
  position: relative !important;

  z-index: 120 !important;

  width: 100% !important;

  margin:
    22px 0 30px !important;
}


.cockpitStatBars {
  display: grid !important;

  width: 100% !important;

  grid-template-columns:
    minmax(0, 1.35fr)
    minmax(0, 0.82fr)
    minmax(0, 0.92fr) !important;

  gap:
    14px !important;

  overflow:
    visible !important;

  border:
    0 !important;

  background:
    transparent !important;

  box-shadow:
    none !important;
}


.cockpitStatBars::before {
  display:
    none !important;
}


/* =========================================================
   KARTEN
   ========================================================= */

.cockpitStatStrip {
  position: relative !important;

  display: flex !important;

  width: 100% !important;
  height: 66px !important;

  min-width: 0 !important;

  align-items:
    center !important;

  gap:
    13px !important;

  padding:
    0 20px !important;

  box-sizing:
    border-box !important;

  overflow:
    hidden !important;

  border:
    1px solid rgba(255,255,255,0.075) !important;

  border-radius:
    17px !important;

  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(83,115,190,0.12),
      transparent 47%
    ),
    linear-gradient(
      145deg,
      rgba(17,37,77,0.96),
      rgba(7,20,49,0.99)
    ) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.055),
    0 12px 26px rgba(0,0,0,0.15) !important;

  color:
    white !important;

  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease !important;
}


/* kleiner Lichtakzent oben */

.cockpitStatStrip::before {
  content: "" !important;

  display: block !important;

  position: absolute !important;

  top: 0 !important;
  left: 22px !important;

  width: 72px !important;
  height: 2px !important;

  border-radius:
    999px !important;

  background:
    linear-gradient(
      90deg,
      #f59e0b,
      #fbbf24,
      transparent
    ) !important;

  opacity:
    0.88 !important;
}


/* alte Regeln vollständig neutralisieren */

.cockpitStatStrip::after {
  display:
    none !important;
}


.cockpitStatStrip + .cockpitStatStrip {
  border-left:
    1px solid rgba(255,255,255,0.075) !important;
}


/* =========================================================
   PROJEKTE-KARTE
   ========================================================= */

.cockpitProjectStrip {
  appearance:
    none !important;

  padding-right:
    57px !important;

  cursor:
    pointer !important;

  font:
    inherit !important;

  text-align:
    left !important;

  background:
    radial-gradient(
      circle at 8% 50%,
      rgba(245,158,11,0.095),
      transparent 37%
    ),
    linear-gradient(
      145deg,
      rgba(20,42,84,0.97),
      rgba(7,20,49,0.99)
    ) !important;
}


.cockpitStatStrip:hover,
.cockpitProjectStripOpen {
  transform:
    translateY(-2px) !important;

  border-color:
    rgba(251,191,36,0.20) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.065),
    0 17px 34px rgba(0,0,0,0.19) !important;
}


/* =========================================================
   ZAHL
   ========================================================= */

.cockpitStatNumber {
  position:
    relative !important;

  z-index:
    2 !important;

  display:
    block !important;

  width:
    auto !important;

  height:
    auto !important;

  margin:
    0 !important;

  border:
    0 !important;

  background:
    transparent !important;

  box-shadow:
    none !important;

  color:
    #fbbf24 !important;

  font-size:
    25px !important;

  font-weight:
    850 !important;

  line-height:
    1 !important;

  letter-spacing:
    -0.05em !important;
}


/* Text */

.cockpitStatLabel {
  position:
    relative !important;

  z-index:
    2 !important;

  min-width:
    0 !important;

  overflow:
    hidden !important;

  color:
    rgba(255,255,255,0.90) !important;

  font-size:
    13px !important;

  font-weight:
    690 !important;

  letter-spacing:
    -0.01em !important;

  text-overflow:
    ellipsis !important;

  white-space:
    nowrap !important;
}


/* =========================================================
   DROPDOWN-PFEIL
   ========================================================= */

.cockpitStripChevron {
  position:
    absolute !important;

  top:
    50% !important;

  right:
    17px !important;

  display:
    grid !important;

  width:
    31px !important;

  height:
    31px !important;

  place-items:
    center !important;

  border:
    1px solid rgba(255,255,255,0.075) !important;

  border-radius:
    10px !important;

  background:
    rgba(255,255,255,0.025) !important;

  color:
    #fbbf24 !important;

  font-size:
    15px !important;

  transform:
    translateY(-50%) rotate(0deg) !important;

  transition:
    transform 0.18s ease,
    background 0.18s ease !important;
}


.cockpitStripChevron.open {
  background:
    rgba(245,158,11,0.07) !important;

  transform:
    translateY(-50%) rotate(180deg) !important;
}


/* =========================================================
   PROJEKT-DROPDOWN
   ========================================================= */

.cockpitProjectsDropdown {
  position:
    absolute !important;

  z-index:
    1000 !important;

  top:
    calc(100% + 10px) !important;

  left:
    0 !important;

  right:
    auto !important;

  width:
    min(620px, 100%) !important;

  padding:
    8px !important;

  overflow:
    hidden !important;

  box-sizing:
    border-box !important;

  border:
    1px solid rgba(255,255,255,0.08) !important;

  border-radius:
    16px !important;

  background:
    linear-gradient(
      180deg,
      rgba(12,28,62,0.997),
      rgba(6,18,43,0.997)
    ) !important;

  box-shadow:
    0 30px 68px rgba(0,0,0,0.48),
    0 0 25px rgba(245,158,11,0.035) !important;
}


/* Dropdown Header */

.cockpitProjectsDropdownHeader {
  display:
    flex !important;

  min-height:
    47px !important;

  align-items:
    center !important;

  justify-content:
    flex-start !important;

  margin:
    0 !important;

  padding:
    0 11px !important;

  border-bottom:
    1px solid rgba(255,255,255,0.06) !important;
}


.cockpitProjectsDropdownHeader > div {
  display:
    flex !important;

  align-items:
    center !important;

  gap:
    10px !important;
}


.cockpitProjectsDropdownHeader small {
  color:
    #fbbf24 !important;

  font-size:
    9px !important;

  font-weight:
    850 !important;

  letter-spacing:
    0.13em !important;
}


.cockpitProjectsDropdownHeader strong {
  color:
    rgba(255,255,255,0.42) !important;

  font-size:
    10px !important;

  font-weight:
    650 !important;
}


.cockpitProjectsClose {
  display:
    none !important;
}


/* =========================================================
   PROJEKTLISTE
   ========================================================= */

.cockpitProjectsList {
  display:
    block !important;

  width:
    100% !important;

  max-height:
    315px !important;

  overflow-y:
    auto !important;
}


.cockpitProjectRow {
  display:
    grid !important;

  width:
    100% !important;

  min-height:
    49px !important;

  grid-template-columns:
    29px minmax(0,1fr) 23px !important;

  align-items:
    center !important;

  gap:
    10px !important;

  padding:
    0 11px !important;

  box-sizing:
    border-box !important;

  border:
    0 !important;

  border-bottom:
    1px solid rgba(255,255,255,0.052) !important;

  border-radius:
    0 !important;

  background:
    transparent !important;

  box-shadow:
    none !important;

  text-decoration:
    none !important;

  transition:
    background 0.15s ease !important;
}


.cockpitProjectRow:last-child {
  border-bottom:
    0 !important;
}


.cockpitProjectRow:hover {
  transform:
    none !important;

  background:
    linear-gradient(
      90deg,
      rgba(245,158,11,0.065),
      transparent
    ) !important;

  box-shadow:
    none !important;
}


.cockpitProjectIndex {
  display:
    block !important;

  width:
    auto !important;

  height:
    auto !important;

  border:
    0 !important;

  background:
    transparent !important;

  color:
    rgba(251,191,36,0.76) !important;

  font-size:
    9px !important;

  font-weight:
    850 !important;
}


.cockpitProjectMain {
  display:
    block !important;

  min-width:
    0 !important;
}


.cockpitProjectMain > strong {
  display:
    block !important;

  overflow:
    hidden !important;

  color:
    rgba(255,255,255,0.90) !important;

  font-size:
    12px !important;

  font-weight:
    670 !important;

  text-overflow:
    ellipsis !important;

  white-space:
    nowrap !important;
}


.cockpitProjectMain > small {
  display:
    none !important;
}


.cockpitProjectArrow {
  display:
    block !important;

  width:
    auto !important;

  height:
    auto !important;

  border:
    0 !important;

  background:
    transparent !important;

  color:
    rgba(251,191,36,0.75) !important;

  font-size:
    18px !important;

  text-align:
    right !important;
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitStatBars {
    grid-template-columns:
      1fr !important;

    gap:
      8px !important;
  }


  .cockpitStatStrip {
    height:
      56px !important;

    border-radius:
      14px !important;
  }


  .cockpitStatNumber {
    font-size:
      22px !important;
  }


  .cockpitStatLabel {
    font-size:
      12px !important;
  }


  .cockpitProjectsDropdown {
    position:
      static !important;

    width:
      100% !important;

    margin-top:
      9px !important;
  }


  .cockpitNewListingButton {
    min-height:
      42px !important;

    padding-right:
      14px !important;
  }

}
`}</style>

<style jsx global>{`
/* =========================================================
   INSERAT-AI QUICK GRID FOUR V12
   4 gleichwertige Hauptaktionen
   ========================================================= */


.allFunctionsPanel > .quickPanelHeaderV12 {
  margin-bottom: 22px !important;
}


/* =========================================================
   4ER GRID
   ========================================================= */

.allFunctionsPanel .quickGridV12 {
  display: grid !important;

  width: 100% !important;

  grid-template-columns:
    repeat(4, minmax(0, 1fr)) !important;

  align-items: stretch !important;

  gap: 14px !important;
}


/* =========================================================
   KARTEN KOMPAKTER
   ========================================================= */

.allFunctionsPanel .quickGridV12 .quickCard {
  width: 100% !important;

  min-width: 0 !important;
  min-height: 205px !important;

  padding: 20px !important;

  box-sizing: border-box !important;

  border-radius: 18px !important;
}


/* vierte Karte */

.allFunctionsPanel .quickGridV12 .quickProjectsCard {
  appearance: none !important;

  position: relative !important;

  overflow: hidden !important;

  border:
    1px solid rgba(251,191,36,0.28) !important;

  background:
    radial-gradient(
      circle at top left,
      rgba(245,158,11,0.11),
      transparent 47%
    ),
    linear-gradient(
      145deg,
      rgba(23,39,77,0.98),
      rgba(10,24,56,0.98)
    ) !important;

  color: white !important;

  cursor: pointer !important;

  font: inherit !important;

  text-align: left !important;

  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease !important;
}


.allFunctionsPanel .quickGridV12 .quickProjectsCard::before {
  content: "" !important;

  position: absolute !important;

  top: 0 !important;
  left: 18px !important;
  right: 18px !important;

  height: 2px !important;

  border-radius: 999px !important;

  background:
    linear-gradient(
      90deg,
      #f59e0b,
      #fbbf24,
      rgba(251,191,36,0)
    ) !important;
}


.allFunctionsPanel .quickGridV12 .quickProjectsCard:hover,
.allFunctionsPanel .quickGridV12 .quickProjectsCardOpen {
  transform: translateY(-3px) !important;

  border-color:
    rgba(251,191,36,0.48) !important;

  box-shadow:
    0 16px 32px rgba(0,0,0,0.18),
    0 0 22px rgba(245,158,11,0.055) !important;
}


/* =========================================================
   PROJEKTPANEL
   ========================================================= */

.quickProjectsGridPanel {
  width: 100% !important;

  margin-top: 18px !important;

  padding: 18px !important;

  box-sizing: border-box !important;

  border:
    1px solid rgba(255,255,255,0.085) !important;

  border-radius: 17px !important;

  background:
    radial-gradient(
      circle at top left,
      rgba(245,158,11,0.06),
      transparent 32%
    ),
    rgba(6,18,45,0.60) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04) !important;

  animation:
    quickProjectsGridOpen 0.18s ease !important;
}


.quickProjectsGridHeader {
  display: flex !important;

  align-items: center !important;
  justify-content: space-between !important;

  gap: 20px !important;

  margin-bottom: 14px !important;

  padding-bottom: 13px !important;

  border-bottom:
    1px solid rgba(255,255,255,0.065) !important;
}


.quickProjectsGridHeader .sectionLabel {
  margin-bottom: 5px !important;
}


.quickProjectsGridHeader h3 {
  margin: 0 !important;

  color:
    rgba(255,255,255,0.94) !important;

  font-size: 16px !important;
  font-weight: 800 !important;
}


.quickProjectsGridCount {
  display: grid !important;

  width: 34px !important;
  height: 34px !important;

  place-items: center !important;

  border:
    1px solid rgba(251,191,36,0.22) !important;

  border-radius: 10px !important;

  background:
    rgba(245,158,11,0.055) !important;

  color: #fbbf24 !important;

  font-size: 13px !important;
  font-weight: 900 !important;
}


/* Zwei Spalten für die gespeicherten Projekte */

.quickProjectsGridList {
  display: grid !important;

  grid-template-columns:
    repeat(2, minmax(0, 1fr)) !important;

  gap: 9px !important;
}


.quickProjectsGridRow {
  display: grid !important;

  min-width: 0 !important;
  min-height: 52px !important;

  grid-template-columns:
    29px minmax(0,1fr) 22px !important;

  align-items: center !important;

  gap: 10px !important;

  padding: 0 13px !important;

  border:
    1px solid rgba(255,255,255,0.065) !important;

  border-radius: 12px !important;

  background:
    rgba(255,255,255,0.025) !important;

  color: white !important;

  text-decoration: none !important;

  transition:
    border-color 0.15s ease,
    background 0.15s ease !important;
}


.quickProjectsGridRow:hover {
  border-color:
    rgba(251,191,36,0.24) !important;

  background:
    linear-gradient(
      90deg,
      rgba(245,158,11,0.065),
      rgba(255,255,255,0.025)
    ) !important;
}


.quickProjectsGridIndex {
  color:
    rgba(251,191,36,0.72) !important;

  font-size: 9px !important;
  font-weight: 900 !important;

  letter-spacing: 0.06em !important;
}


.quickProjectsGridName {
  min-width: 0 !important;

  overflow: hidden !important;

  color:
    rgba(255,255,255,0.90) !important;

  font-size: 12px !important;
  font-weight: 680 !important;

  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}


.quickProjectsGridArrow {
  color:
    rgba(251,191,36,0.72) !important;

  font-size: 18px !important;

  text-align: right !important;
}


.quickProjectsGridMessage {
  grid-column: 1 / -1 !important;

  padding: 15px !important;

  color:
    rgba(255,255,255,0.58) !important;

  font-size: 12px !important;
}


.quickProjectsGridError {
  color: #fca5a5 !important;
}


@keyframes quickProjectsGridOpen {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}



/* =========================================================
   FINALER 4ER DESKTOP BLOCK
   ========================================================= */

@media (min-width: 901px) {

  .allFunctionsPanel .quickGridV12 {
    display: grid !important;

    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;

    align-items: stretch !important;

    gap: 14px !important;

    width: 100% !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 205px !important;
    height: 100% !important;

    flex-direction: column !important;

    align-items: flex-start !important;
    justify-content: flex-start !important;

    padding: 20px !important;

    box-sizing: border-box !important;

    text-align: left !important;
  }


  .allFunctionsPanel .quickGridV12 button.quickCard {
    appearance: none !important;

    margin: 0 !important;

    font: inherit !important;

    text-align: left !important;
  }


  .allFunctionsPanel .quickGridV12 .quickIcon {
    flex: none !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard h3 {
    width: 100% !important;

    margin: 0 !important;

    text-align: left !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard p {
    width: 100% !important;

    margin: 8px 0 16px !important;

    text-align: left !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard strong {
    display: block !important;

    width: 100% !important;

    margin-top: auto !important;

    text-align: left !important;
  }

}
/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 900px) {

  .allFunctionsPanel .quickGridV12 {
    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;
  }

}


@media (max-width: 700px) {

  .allFunctionsPanel .quickGridV12 {
    grid-template-columns:
      1fr !important;

    gap: 10px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard {
    min-height: 175px !important;
  }


  .quickProjectsGridPanel {
    margin-top: 12px !important;

    padding: 12px !important;
  }


  .quickProjectsGridList {
    grid-template-columns:
      1fr !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPACT QUICK GRID V13
   Vier kompakte Karten nebeneinander
   ========================================================= */


/* =========================================================
   DESKTOP: IMMER 4 KARTEN
   ========================================================= */

@media (min-width: 1001px) {

  .allFunctionsPanel .quickGridV12 {
    display: grid !important;

    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;

    gap: 10px !important;

    width: 100% !important;

    align-items: stretch !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    min-height: 155px !important;
    height: 155px !important;

    flex-direction: column !important;

    align-items: flex-start !important;
    justify-content: flex-start !important;

    padding: 15px !important;

    box-sizing: border-box !important;

    border-radius: 15px !important;

    text-align: left !important;
  }


  /* Icon kleiner */

  .allFunctionsPanel .quickGridV12 .quickIcon {
    display: grid !important;

    width: 34px !important;
    height: 34px !important;

    flex: none !important;

    place-items: center !important;

    margin-bottom: 10px !important;

    border-radius: 10px !important;

    font-size: 16px !important;
  }


  /* Titel */

  .allFunctionsPanel .quickGridV12 .quickCard h3 {
    width: 100% !important;

    margin: 0 !important;

    overflow: hidden !important;

    font-size: 13px !important;
    line-height: 1.2 !important;

    text-align: left !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }


  /* Beschreibung */

  .allFunctionsPanel .quickGridV12 .quickCard p {
    display: -webkit-box !important;

    width: 100% !important;

    margin: 7px 0 8px !important;

    overflow: hidden !important;

    color: #9aa8c5 !important;

    font-size: 10px !important;
    line-height: 1.4 !important;

    text-align: left !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }


  /* Action unten */

  .allFunctionsPanel .quickGridV12 .quickCard strong {
    display: block !important;

    width: 100% !important;

    margin-top: auto !important;

    padding-top: 7px !important;

    overflow: hidden !important;

    color: #fbbf24 !important;

    font-size: 10px !important;
    line-height: 1.2 !important;

    text-align: left !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }


  /* Buttons wie normale Karten behandeln */

  .allFunctionsPanel .quickGridV12 button.quickCard {
    appearance: none !important;

    margin: 0 !important;

    font: inherit !important;

    text-align: left !important;
  }

}


/* =========================================================
   MITTLERE BREITE: 4 BLEIBEN BIS 1000 PX
   ========================================================= */

@media (min-width: 901px) and (max-width: 1000px) {

  .allFunctionsPanel .quickGridV12 {
    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;

    gap: 8px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard {
    min-height: 145px !important;
    height: 145px !important;

    padding: 12px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickIcon {
    width: 31px !important;
    height: 31px !important;

    margin-bottom: 8px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard h3 {
    font-size: 12px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard p,
  .allFunctionsPanel .quickGridV12 .quickCard strong {
    font-size: 9px !important;
  }

}


/* =========================================================
   TABLET: 2 x 2
   ========================================================= */

@media (min-width: 701px) and (max-width: 900px) {

  .allFunctionsPanel .quickGridV12 {
    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;

    gap: 10px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard {
    min-height: 150px !important;
    height: 150px !important;

    padding: 14px !important;
  }

}


/* =========================================================
   MOBILE: 1 SPALTE
   ========================================================= */

@media (max-width: 700px) {

  .allFunctionsPanel .quickGridV12 {
    grid-template-columns:
      1fr !important;

    gap: 9px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickCard {
    min-height: 138px !important;
    height: auto !important;

    padding: 14px !important;
  }


  .allFunctionsPanel .quickGridV12 .quickIcon {
    width: 34px !important;
    height: 34px !important;

    margin-bottom: 9px !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI QUICK GRID SKETCH V14
   4 kleine Karten in EINER Reihe
   ========================================================= */


/* =========================================================
   DESKTOP
   ========================================================= */

@media (min-width: 901px) {

  /*
   * Absichtlich hohe Spezifität:
   * alte 3-Spalten-Regeln können dies nicht mehr überschreiben.
   */

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12 {
    display: grid !important;

    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;

    grid-auto-flow: row !important;

    width: 100% !important;

    gap: 11px !important;

    align-items: stretch !important;
  }


  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > .quickCard {
    display: flex !important;

    width: 100% !important;
    min-width: 0 !important;

    height: 124px !important;
    min-height: 124px !important;
    max-height: 124px !important;

    flex-direction: column !important;

    align-items: flex-start !important;
    justify-content: flex-start !important;

    margin: 0 !important;

    padding: 13px 14px !important;

    box-sizing: border-box !important;

    border-radius: 14px !important;

    text-align: left !important;

    overflow: hidden !important;
  }


  /* Auch Button-Karten exakt gleich behandeln */

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > button.quickCard {
    appearance: none !important;

    font: inherit !important;

    text-align: left !important;
  }


  /* Icons kompakt */

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > .quickCard
  > .quickIcon {
    display: grid !important;

    width: 30px !important;
    height: 30px !important;

    flex: none !important;

    place-items: center !important;

    margin: 0 0 8px !important;

    border-radius: 9px !important;

    font-size: 15px !important;
  }


  /* Titel */

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > .quickCard
  > h3 {
    width: 100% !important;

    margin: 0 !important;

    overflow: hidden !important;

    color: #ffffff !important;

    font-size: 12px !important;
    font-weight: 800 !important;

    line-height: 1.2 !important;

    text-align: left !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }


  /*
   * Beschreibung auf Desktop weg.
   * Genau dadurch werden die vier Karten klein und ruhig.
   */

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > .quickCard
  > p {
    display: none !important;
  }


  /* Aktion unten */

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > .quickCard
  > strong {
    display: block !important;

    width: 100% !important;

    margin-top: auto !important;

    padding-top: 8px !important;

    overflow: hidden !important;

    color: #fbbf24 !important;

    font-size: 9px !important;
    font-weight: 850 !important;

    line-height: 1.2 !important;

    text-align: left !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }


  /* Schnellzugriff insgesamt etwas kompakter */

  section.panel.quickPanel.allFunctionsPanel {
    padding: 22px !important;
  }


  section.panel.quickPanel.allFunctionsPanel
  > .quickPanelHeaderV12 {
    margin-bottom: 17px !important;
  }


  section.panel.quickPanel.allFunctionsPanel
  > .quickPanelHeaderV12 h2 {
    margin-top: 5px !important;

    font-size: 20px !important;
  }

}


/* =========================================================
   TABLET: 2 x 2
   ========================================================= */

@media (min-width: 701px) and (max-width: 900px) {

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12 {
    display: grid !important;

    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;

    gap: 10px !important;
  }


  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > .quickCard {
    min-height: 145px !important;

    padding: 14px !important;
  }

}


/* =========================================================
   HANDY
   ========================================================= */

@media (max-width: 700px) {

  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12 {
    display: grid !important;

    grid-template-columns:
      1fr !important;

    gap: 9px !important;
  }


  section.panel.quickPanel.allFunctionsPanel
  > div.quickGrid.quickGridV12
  > .quickCard {
    min-height: 130px !important;

    padding: 13px !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COCKPIT INTEGRATED HEADER V15
   Titel direkt im oberen Makler-Cockpit-Block
   ========================================================= */


/* =========================================================
   OBERER GESAMTBLOCK
   ========================================================= */

.cockpitTopbar {
  position: relative !important;

  display: grid !important;

  grid-template-columns:
    auto minmax(0, 1fr) auto !important;

  align-items: center !important;

  row-gap: 20px !important;

  padding:
    16px 20px 28px !important;

  overflow: hidden !important;

  border-radius:
    20px !important;
}


/* dezenter Amber/Navy Lichtschein */

.cockpitTopbar::after {
  content: "" !important;

  position: absolute !important;

  right: -90px !important;
  bottom: -110px !important;

  width: 300px !important;
  height: 240px !important;

  pointer-events: none !important;

  border-radius: 50% !important;

  background:
    radial-gradient(
      circle,
      rgba(129, 91, 246, 0.12),
      rgba(245,158,11,0.035) 38%,
      transparent 69%
    ) !important;

  filter:
    blur(12px) !important;
}


/* =========================================================
   NEUER TITEL INNERHALB TOPBAR
   ========================================================= */

.cockpitTopbarIntegratedHero {
  position: relative !important;

  z-index: 2 !important;

  grid-column:
    1 / -1 !important;

  width:
    100% !important;

  padding:
    18px 10px 4px !important;
}


.cockpitTopbarIntegratedHero .eyebrow {
  margin:
    0 0 14px !important;

  color:
    #fbbf24 !important;

  font-size:
    10px !important;

  font-weight:
    900 !important;

  letter-spacing:
    0.18em !important;

  text-transform:
    uppercase !important;
}


.cockpitTopbarIntegratedHero h1 {
  margin:
    0 !important;

  color:
    #ffffff !important;

  font-size:
    clamp(44px, 5vw, 68px) !important;

  font-weight:
    400 !important;

  line-height:
    0.98 !important;

  letter-spacing:
    -0.055em !important;

  text-shadow:
    0 12px 34px rgba(0,0,0,0.16) !important;
}


/* =========================================================
   BESCHREIBUNG + DATUM DARUNTER
   ========================================================= */

.heroSection {
  display: block !important;

  padding:
    22px 10px 28px !important;
}


.heroContent {
  width:
    100% !important;
}


.heroDescription {
  max-width:
    760px !important;

  margin:
    0 !important;

  color:
    #b3bfd9 !important;
}


.currentDate {
  margin:
    14px 0 0 !important;
}


/* leerer alter Action-Bereich braucht keinen Platz */

.heroActions {
  display:
    none !important;
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitTopbar {
    grid-template-columns:
      minmax(0, 1fr) auto !important;

    row-gap:
      15px !important;

    padding:
      12px 13px 20px !important;

    border-radius:
      17px !important;
  }


  .cockpitTopbarIntegratedHero {
    padding:
      13px 4px 2px !important;
  }


  .cockpitTopbarIntegratedHero .eyebrow {
    margin-bottom:
      10px !important;

    font-size:
      9px !important;
  }


  .cockpitTopbarIntegratedHero h1 {
    font-size:
      clamp(36px, 12vw, 46px) !important;
  }


  .heroSection {
    padding:
      17px 4px 23px !important;
  }


  .heroDescription {
    font-size:
      13px !important;

    line-height:
      1.55 !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO SLOT V16
   Firmenbranding rechts im Cockpit-Header
   ========================================================= */


.cockpitTopbarBrandRow {
  position: relative !important;

  z-index: 2 !important;

  display: grid !important;

  grid-column:
    1 / -1 !important;

  grid-template-columns:
    minmax(0, 1fr)
    250px !important;

  align-items: center !important;

  gap:
    34px !important;

  width:
    100% !important;

  padding:
    18px 10px 4px !important;

  box-sizing:
    border-box !important;
}


/* bestehender Hero soll innerhalb der neuen Zeile bleiben */

.cockpitTopbarBrandRow
.cockpitTopbarIntegratedHero {
  grid-column:
    auto !important;

  width:
    auto !important;

  padding:
    0 !important;
}


/* =========================================================
   LOGO SLOT
   ========================================================= */

.cockpitCompanyLogoSlot {
  position: relative !important;

  display: flex !important;

  width:
    100% !important;

  min-height:
    118px !important;

  align-items: center !important;
  justify-content: center !important;

  gap:
    13px !important;

  padding:
    17px !important;

  box-sizing:
    border-box !important;

  overflow:
    hidden !important;

  border:
    1px solid rgba(251,191,36,0.20) !important;

  border-radius:
    17px !important;

  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(251,191,36,0.08),
      transparent 44%
    ),
    linear-gradient(
      145deg,
      rgba(255,255,255,0.045),
      rgba(255,255,255,0.016)
    ) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.055),
    0 14px 30px rgba(0,0,0,0.13) !important;
}


/* kleine Amber-Linie */

.cockpitCompanyLogoSlot::before {
  content: "" !important;

  position: absolute !important;

  top: 0 !important;
  left: 18px !important;
  right: 18px !important;

  height:
    2px !important;

  border-radius:
    999px !important;

  background:
    linear-gradient(
      90deg,
      transparent,
      #f59e0b,
      #fbbf24,
      transparent
    ) !important;

  opacity:
    0.78 !important;
}


/* Logo-Platzhalter-Symbol */

.cockpitCompanyLogoIcon {
  display: grid !important;

  width:
    46px !important;

  height:
    46px !important;

  flex:
    none !important;

  place-items:
    center !important;

  border:
    1px solid rgba(251,191,36,0.24) !important;

  border-radius:
    13px !important;

  background:
    rgba(245,158,11,0.07) !important;

  color:
    #fbbf24 !important;

  font-size:
    24px !important;

  line-height:
    1 !important;
}


/* Text */

.cockpitCompanyLogoText {
  display: grid !important;

  min-width:
    0 !important;

  gap:
    4px !important;
}


.cockpitCompanyLogoText strong {
  color:
    rgba(255,255,255,0.92) !important;

  font-size:
    12px !important;

  font-weight:
    800 !important;
}


.cockpitCompanyLogoText small {
  color:
    rgba(179,191,217,0.64) !important;

  font-size:
    9px !important;

  font-weight:
    650 !important;
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitTopbarBrandRow {
    grid-template-columns:
      1fr !important;

    gap:
      16px !important;

    padding:
      13px 4px 2px !important;
  }


  .cockpitCompanyLogoSlot {
    min-height:
      82px !important;

    justify-content:
      flex-start !important;

    padding:
      13px !important;
  }


  .cockpitCompanyLogoIcon {
    width:
      38px !important;

    height:
      38px !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COCKPIT REAL SKYLINE LAYER V18
   Explizite Skyline-Ebene statt CSS background
   ========================================================= */

.cockpitPage .cockpitTopbar {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;

  background:
    #071431 !important;
}


/* =========================================================
   DAS EIGENTLICHE BILD
   ========================================================= */

.cockpitSkylineLayer {
  position: absolute !important;

  inset: 0 !important;

  z-index: 0 !important;

  display: block !important;

  width: 100% !important;
  height: 100% !important;

  pointer-events: none !important;

  background-image:
    url("/cockpit-skyline.png") !important;

  background-size:
    cover !important;

  background-position:
    center center !important;

  background-repeat:
    no-repeat !important;

  opacity:
    1 !important;

  filter:
    brightness(1.08)
    saturate(1.08) !important;
}


/* =========================================================
   LESBARKEITSVERLAUF ÜBER DEM BILD
   Links stärker dunkel, rechts Skyline sichtbar
   ========================================================= */

.cockpitSkylineShade {
  position: absolute !important;

  inset: 0 !important;

  z-index: 1 !important;

  display: block !important;

  pointer-events: none !important;

  background:
    linear-gradient(
      90deg,
      rgba(3,15,43,0.86) 0%,
      rgba(3,15,43,0.72) 27%,
      rgba(5,17,48,0.42) 50%,
      rgba(18,19,70,0.16) 73%,
      rgba(48,26,103,0.10) 100%
    ) !important;
}


/* =========================================================
   ALLE BEDIENELEMENTE ÜBER SKYLINE
   ========================================================= */

.cockpitPage .cockpitTopbar
> *:not(.cockpitSkylineLayer):not(.cockpitSkylineShade) {
  position: relative !important;

  z-index: 3 !important;
}


.cockpitTopbarBrandRow {
  z-index: 3 !important;
}


.cockpitTopbarIntegratedHero {
  z-index: 4 !important;
}


.cockpitCompanyLogoSlot {
  z-index: 4 !important;

  background:
    linear-gradient(
      145deg,
      rgba(18,27,66,0.74),
      rgba(14,20,53,0.62)
    ) !important;

  backdrop-filter:
    blur(13px) !important;

  -webkit-backdrop-filter:
    blur(13px) !important;
}


/* =========================================================
   ALTE PSEUDO-HINTERGRÜNDE DÜRFEN BILD NICHT VERDECKEN
   ========================================================= */

.cockpitPage .cockpitTopbar::before,
.cockpitPage .cockpitTopbar::after {
  z-index:
    2 !important;

  pointer-events:
    none !important;
}


.cockpitPage .cockpitTopbar::before {
  opacity:
    0.22 !important;
}


.cockpitPage .cockpitTopbar::after {
  opacity:
    0.16 !important;
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitSkylineLayer {
    background-position:
      67% center !important;
  }

  .cockpitSkylineShade {
    background:
      linear-gradient(
        90deg,
        rgba(3,15,43,0.91) 0%,
        rgba(3,15,43,0.70) 48%,
        rgba(25,22,80,0.27) 100%
      ) !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI SKYLINE FULL WIDTH V19
   Stadtbild über die komplette Header-Fläche
   ========================================================= */

@media (min-width: 701px) {

  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineLayer {

    /*
       Wir verwenden hauptsächlich die rechte Bildhälfte,
       auf der Häuser + Hochhäuser liegen,
       und ziehen sie über die gesamte Fläche.
    */

    background-size:
      195% 100% !important;

    background-position:
      100% 50% !important;

    background-repeat:
      no-repeat !important;

    opacity:
      1 !important;

    filter:
      brightness(1.08)
      saturate(1.12)
      contrast(1.04) !important;
  }


  /* Text bleibt lesbar, Skyline aber viel sichtbarer */

  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineShade {

    background:
      linear-gradient(
        90deg,
        rgba(3,15,43,0.64) 0%,
        rgba(3,15,43,0.48) 24%,
        rgba(4,17,49,0.34) 48%,
        rgba(13,18,65,0.19) 70%,
        rgba(44,27,101,0.08) 100%
      ) !important;
  }


  /* Alte Effekte noch weiter zurücknehmen */

  .cockpitPage .cockpitTopbar::before {
    opacity:
      0.10 !important;
  }

  .cockpitPage .cockpitTopbar::after {
    opacity:
      0.08 !important;
  }

}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineLayer {

    background-size:
      225% 100% !important;

    background-position:
      94% 50% !important;

    background-repeat:
      no-repeat !important;
  }


  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineShade {

    background:
      linear-gradient(
        90deg,
        rgba(3,15,43,0.72) 0%,
        rgba(3,15,43,0.48) 50%,
        rgba(30,23,88,0.14) 100%
      ) !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI SKYLINE MIRROR V20
   Skyline-Bild spiegelverkehrt
   ========================================================= */

.cockpitPage
.cockpitTopbar
.cockpitSkylineLayer {
  transform: scaleX(-1) !important;
  transform-origin: center center !important;
}


/* optional: leichte Feinjustierung */
@media (min-width: 701px) {
  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineLayer {
    background-position: center center !important;
  }
}

@media (max-width: 700px) {
  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineLayer {
    background-position: center center !important;
  }
}
`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI SKYLINE MIRROR FIX V21
   Spiegelung behalten + Stadt wieder über ganze Fläche
   ========================================================= */

@media (min-width: 701px) {

  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineLayer {

    transform:
      scaleX(-1) !important;

    transform-origin:
      center center !important;

    background-size:
      195% 100% !important;

    background-position:
      100% 50% !important;

    background-repeat:
      no-repeat !important;

    opacity:
      1 !important;

    filter:
      brightness(1.10)
      saturate(1.12)
      contrast(1.04) !important;
  }

}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitPage
  .cockpitTopbar
  .cockpitSkylineLayer {

    transform:
      scaleX(-1) !important;

    transform-origin:
      center center !important;

    background-size:
      225% 100% !important;

    background-position:
      94% 50% !important;

    background-repeat:
      no-repeat !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO PICKER V22
   Klickbares Symbol öffnet lokale Dateien
   ========================================================= */

.cockpitCompanyLogoPicker {
  position: relative !important;

  display: grid !important;

  width: 54px !important;
  height: 54px !important;

  flex: none !important;

  place-items: center !important;

  overflow: hidden !important;

  border:
    1px solid rgba(251,191,36,0.42) !important;

  border-radius:
    15px !important;

  background:
    linear-gradient(
      145deg,
      rgba(251,191,36,0.12),
      rgba(255,255,255,0.035)
    ) !important;

  cursor: pointer !important;

  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease !important;
}


.cockpitCompanyLogoPicker:hover {
  transform:
    translateY(-2px) scale(1.03) !important;

  border-color:
    rgba(251,191,36,0.82) !important;

  background:
    linear-gradient(
      145deg,
      rgba(251,191,36,0.20),
      rgba(255,255,255,0.055)
    ) !important;

  box-shadow:
    0 10px 25px rgba(245,158,11,0.16) !important;
}


/* Plus / Upload Symbol */

.cockpitCompanyLogoPicker
.cockpitCompanyLogoIcon {
  display: grid !important;

  width: 100% !important;
  height: 100% !important;

  place-items: center !important;

  border: 0 !important;

  border-radius: 0 !important;

  background: transparent !important;

  color:
    #fbbf24 !important;

  font-size:
    27px !important;

  font-weight:
    400 !important;

  line-height:
    1 !important;
}


/* echter File Input unsichtbar */

.cockpitCompanyLogoInput {
  position: absolute !important;

  width: 1px !important;
  height: 1px !important;

  opacity: 0 !important;

  pointer-events: none !important;
}


/* ausgewähltes Logo */

.cockpitCompanyLogoPreview {
  display: block !important;

  width: 100% !important;
  height: 100% !important;

  object-fit: contain !important;

  padding: 6px !important;

  box-sizing: border-box !important;
}


/* ganzer Firmenlogo-Bereich wirkt interaktiv */

.cockpitCompanyLogoSlot {
  align-items: center !important;
}


/* Mobile */

@media (max-width: 700px) {

  .cockpitCompanyLogoPicker {
    width: 46px !important;
    height: 46px !important;

    border-radius:
      13px !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO FULL BLOCK V23
   Logo deckt bei Auswahl den ganzen Block
   ========================================================= */


/* Standard */
.cockpitCompanyLogoSlot {
  position: relative !important;

  overflow: hidden !important;
}


/* =========================================================
   WENN LOGO VORHANDEN: GANZER BLOCK = LOGO
   ========================================================= */

.cockpitCompanyLogoSlot.hasLogo {
  position: relative !important;

  padding: 0 !important;

  overflow: hidden !important;
}


.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPicker {
  position: absolute !important;

  inset: 0 !important;

  width: 100% !important;
  height: 100% !important;

  display: block !important;

  border: 0 !important;

  border-radius: inherit !important;

  background:
    linear-gradient(
      145deg,
      rgba(8,18,48,0.20),
      rgba(14,20,54,0.10)
    ) !important;

  box-shadow: none !important;
}


/* Das eigentliche Logo füllt die komplette Karte */
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPreview {
  display: block !important;

  width: 100% !important;
  height: 100% !important;

  object-fit: contain !important;

  padding: 18px 22px !important;

  box-sizing: border-box !important;
}


/* Text ausblenden, damit das Logo wirklich die ganze Karte dominiert */
.cockpitCompanyLogoSlot.hasLogo strong,
.cockpitCompanyLogoSlot.hasLogo span,
.cockpitCompanyLogoSlot.hasLogo p,
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoText {
  display: none !important;
}


/* sanfter Hover */
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPicker:hover {
  background:
    linear-gradient(
      145deg,
      rgba(251,191,36,0.06),
      rgba(255,255,255,0.02)
    ) !important;
}


/* Optionaler Hinweis beim Hover */
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPicker::after {
  content: "Logo ändern" !important;

  position: absolute !important;

  right: 14px !important;
  bottom: 12px !important;

  padding: 6px 10px !important;

  border: 1px solid rgba(251,191,36,0.35) !important;
  border-radius: 999px !important;

  background: rgba(7,18,45,0.74) !important;

  color: #fbbf24 !important;

  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1 !important;

  opacity: 0 !important;

  transform: translateY(4px) !important;

  transition:
    opacity 0.18s ease,
    transform 0.18s ease !important;

  pointer-events: none !important;
}

.cockpitCompanyLogoSlot.hasLogo:hover .cockpitCompanyLogoPicker::after {
  opacity: 1 !important;
  transform: translateY(0) !important;
}


/* Wenn noch KEIN Logo da ist, bleibt der kleine Picker wie bisher */
.cockpitCompanyLogoSlot:not(.hasLogo) .cockpitCompanyLogoPicker {
  position: relative !important;
}


/* Mobile */
@media (max-width: 700px) {

  .cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPreview {
    padding: 14px 16px !important;
  }

  .cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPicker::after {
    font-size: 10px !important;
    right: 10px !important;
    bottom: 10px !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO FULL BLOCK V24
   Logo deckt den ganzen Firmenlogo-Block
   ========================================================= */

.cockpitCompanyLogoSlot {
  position: relative !important;
  overflow: hidden !important;
}


/* =========================================================
   WENN LOGO VORHANDEN
   ========================================================= */

.cockpitCompanyLogoSlot.hasLogo {
  padding: 0 !important;
  overflow: hidden !important;
  border-radius: 24px !important;
}


/* ganzer Block klickbar */
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPicker {
  position: absolute !important;
  inset: 0 !important;

  display: block !important;

  width: 100% !important;
  height: 100% !important;

  padding: 0 !important;
  margin: 0 !important;

  border: 0 !important;
  border-radius: inherit !important;

  background: transparent !important;
  box-shadow: none !important;
}


/* Logo füllt wirklich den kompletten Block */
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPreview {
  position: absolute !important;
  inset: 0 !important;

  width: 100% !important;
  height: 100% !important;

  display: block !important;

  object-fit: cover !important;
  object-position: center center !important;

  padding: 0 !important;
  margin: 0 !important;

  border-radius: inherit !important;

  background: #081736 !important;
}


/* eventuelle Wrapper ebenfalls vollflächig */
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoImageWrap,
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoPreviewWrap {
  position: absolute !important;
  inset: 0 !important;

  width: 100% !important;
  height: 100% !important;

  padding: 0 !important;
  margin: 0 !important;
}


/* Text + kleines Symbol ausblenden */
.cockpitCompanyLogoSlot.hasLogo strong,
.cockpitCompanyLogoSlot.hasLogo span,
.cockpitCompanyLogoSlot.hasLogo p,
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoText,
.cockpitCompanyLogoSlot.hasLogo .cockpitCompanyLogoIcon {
  display: none !important;
}


/* leichter dunkler Overlay für Premium-Look */
.cockpitCompanyLogoSlot.hasLogo::after {
  content: "" !important;

  position: absolute !important;
  inset: 0 !important;

  background:
    linear-gradient(
      145deg,
      rgba(6,16,44,0.10),
      rgba(10,18,48,0.22)
    ) !important;

  pointer-events: none !important;
}


/* kleiner Hinweis beim Hover */
.cockpitCompanyLogoSlot.hasLogo::before {
  content: "Logo ändern" !important;

  position: absolute !important;
  right: 14px !important;
  bottom: 12px !important;

  z-index: 3 !important;

  padding: 6px 10px !important;

  border: 1px solid rgba(251,191,36,0.35) !important;
  border-radius: 999px !important;

  background: rgba(7,18,45,0.72) !important;

  color: #fbbf24 !important;

  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1 !important;

  opacity: 0 !important;
  transform: translateY(4px) !important;

  transition:
    opacity 0.18s ease,
    transform 0.18s ease !important;

  pointer-events: none !important;
}

.cockpitCompanyLogoSlot.hasLogo:hover::before {
  opacity: 1 !important;
  transform: translateY(0) !important;
}


/* wenn noch KEIN Logo da ist -> normales Verhalten behalten */
.cockpitCompanyLogoSlot:not(.hasLogo) .cockpitCompanyLogoPicker {
  position: relative !important;
}


/* mobile */
@media (max-width: 700px) {

  .cockpitCompanyLogoSlot.hasLogo {
    border-radius: 18px !important;
  }

  .cockpitCompanyLogoSlot.hasLogo::before {
    right: 10px !important;
    bottom: 10px !important;
    font-size: 10px !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO CENTER V27
   Firmenlogo rechts im gesamten Header zentriert
   ========================================================= */

@media (min-width: 701px) {

  /*
   * BrandRow bleibt für Inserat-AI zuständig,
   * dient aber nicht mehr als Bezugspunkt des Logo-Blocks.
   */
  .cockpitTopbarBrandRow {
    position: static !important;
  }


  /*
   * Firmenlogo exakt mittig auf der rechten Seite
   * des kompletten Skyline-Headers.
   */
  .cockpitCompanyLogoSlot {
    position: absolute !important;

    top: 50% !important;
    right: 32px !important;

    width: 250px !important;

    margin: 0 !important;

    transform:
      translateY(-50%) !important;

    z-index: 6 !important;
  }

}


/* =========================================================
   MOBILE BLEIBT IM NORMALEN FLOW
   ========================================================= */

@media (max-width: 700px) {

  .cockpitTopbarBrandRow {
    position: relative !important;
  }

  .cockpitCompanyLogoSlot {
    position: relative !important;

    top: auto !important;
    right: auto !important;

    width: 100% !important;

    margin: 0 !important;

    transform: none !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO PREMIUM V28
   Vollflächiges Branding ohne Abschneiden
   ========================================================= */

@media (min-width: 701px) {

  .cockpitCompanyLogoSlot.hasLogo {
    width: 280px !important;

    min-height: 128px !important;
    height: 128px !important;

    padding: 0 !important;

    overflow: hidden !important;

    border:
      1px solid rgba(251,191,36,0.34) !important;

    border-radius:
      22px !important;

    background:
      #06122d !important;

    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 18px 40px rgba(0,0,0,0.24) !important;
  }

}


/* =========================================================
   WEICHER VOLLFLÄCHIGER HINTERGRUND
   ========================================================= */

.cockpitCompanyLogoBackdrop {
  position: absolute !important;

  inset: -16px !important;

  z-index: 0 !important;

  background-size:
    cover !important;

  background-position:
    center center !important;

  background-repeat:
    no-repeat !important;

  filter:
    blur(18px)
    brightness(0.42)
    saturate(1.25) !important;

  opacity:
    0.82 !important;

  transform:
    scale(1.14) !important;

  pointer-events:
    none !important;
}


/* dunkle Premium-Ebene */

.cockpitCompanyLogoSlot.hasLogo::after {
  content: "" !important;

  position: absolute !important;

  inset: 0 !important;

  z-index: 1 !important;

  display: block !important;

  background:
    linear-gradient(
      135deg,
      rgba(5,14,38,0.24),
      rgba(8,15,42,0.46)
    ) !important;

  pointer-events:
    none !important;
}


/* =========================================================
   ALTE AMBER-LINIE / LOGO-ÄNDERN TEXTE ENTFERNEN
   ========================================================= */

.cockpitCompanyLogoSlot.hasLogo::before {
  content: none !important;
  display: none !important;
}


.cockpitCompanyLogoSlot.hasLogo
.cockpitCompanyLogoPicker::after {
  content: none !important;
  display: none !important;
}


/* =========================================================
   GANZER BLOCK BLEIBT KLICKBAR
   ========================================================= */

.cockpitCompanyLogoSlot.hasLogo
.cockpitCompanyLogoPicker {
  position: absolute !important;

  inset: 0 !important;

  z-index: 3 !important;

  display: block !important;

  width: 100% !important;
  height: 100% !important;

  margin: 0 !important;
  padding: 0 !important;

  border: 0 !important;

  border-radius:
    inherit !important;

  background:
    transparent !important;

  box-shadow:
    none !important;

  cursor:
    pointer !important;

  transform:
    none !important;
}


/* =========================================================
   EIGENTLICHES LOGO
   ========================================================= */

.cockpitCompanyLogoSlot.hasLogo
.cockpitCompanyLogoPreview {
  position: absolute !important;

  inset: 0 !important;

  z-index: 3 !important;

  display: block !important;

  width: 100% !important;
  height: 100% !important;

  box-sizing:
    border-box !important;

  padding:
    10px 18px !important;

  margin:
    0 !important;

  object-fit:
    contain !important;

  object-position:
    center center !important;

  border-radius:
    inherit !important;

  background:
    transparent !important;

  filter:
    drop-shadow(
      0 8px 18px rgba(0,0,0,0.28)
    ) !important;
}


/* Text komplett weg */

.cockpitCompanyLogoSlot.hasLogo
.cockpitCompanyLogoText,
.cockpitCompanyLogoSlot.hasLogo
.cockpitCompanyLogoIcon {
  display: none !important;
}


/* dezenter Hover statt Schrift */

.cockpitCompanyLogoSlot.hasLogo:hover {
  border-color:
    rgba(251,191,36,0.62) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 20px 44px rgba(0,0,0,0.26),
    0 0 0 1px rgba(251,191,36,0.05) !important;
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {

  .cockpitCompanyLogoSlot.hasLogo {
    width: 100% !important;

    min-height: 100px !important;
    height: 100px !important;

    border-radius:
      18px !important;
  }


  .cockpitCompanyLogoSlot.hasLogo
  .cockpitCompanyLogoPreview {
    padding:
      8px 14px !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO CENTER V29
   Logo-Block exakt mittig in der rechten Header-Hälfte
   ========================================================= */

@media (min-width: 701px) {

  .cockpitCompanyLogoSlot {
    position: absolute !important;

    top: 50% !important;
    left: 75% !important;
    right: auto !important;

    width: 280px !important;

    margin: 0 !important;

    transform:
      translate(-50%, -50%) !important;

    z-index: 6 !important;
  }


  .cockpitCompanyLogoSlot.hasLogo {
    top: 50% !important;
    left: 75% !important;
    right: auto !important;

    transform:
      translate(-50%, -50%) !important;
  }

}


/* Mobile bleibt normal im Layout */

@media (max-width: 700px) {

  .cockpitCompanyLogoSlot,
  .cockpitCompanyLogoSlot.hasLogo {
    position: relative !important;

    top: auto !important;
    left: auto !important;
    right: auto !important;

    width: 100% !important;

    transform: none !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO POSITION V30
   Alte Rechtsposition + etwas weiter nach oben
   ========================================================= */

@media (min-width: 701px) {

  .cockpitCompanyLogoSlot,
  .cockpitCompanyLogoSlot.hasLogo {

    position:
      absolute !important;

    /* wieder wie vorher rechts */
    left:
      auto !important;

    right:
      32px !important;

    /* nur vertikal weiter nach oben */
    top:
      42% !important;

    margin:
      0 !important;

    transform:
      translateY(-50%) !important;

    z-index:
      6 !important;
  }

}


/* Mobile bleibt unverändert */

@media (max-width: 700px) {

  .cockpitCompanyLogoSlot,
  .cockpitCompanyLogoSlot.hasLogo {

    position:
      relative !important;

    top:
      auto !important;

    left:
      auto !important;

    right:
      auto !important;

    width:
      100% !important;

    transform:
      none !important;
  }

}

`}</style>
<style jsx global>{`
/* =========================================================
   INSERAT-AI COMPANY LOGO HIGHER V31
   Firmenlogo weiter nach oben
   ========================================================= */

@media (min-width: 701px) {

  .cockpitCompanyLogoSlot,
  .cockpitCompanyLogoSlot.hasLogo {

    position: absolute !important;
    right: 32px !important;
    left: auto !important;

    /* vorher 42%, jetzt deutlich höher */
    top: 34% !important;

    margin: 0 !important;
    transform: translateY(-50%) !important;
    z-index: 6 !important;
  }

}

`}</style></main>
  );
}