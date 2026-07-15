"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
};

type ListingsResponse = {
  success: boolean;
  listings?: Listing[];
  error?: string;
};
type ListingStatusFilter = "all" | "active" | "archived";

type ListingSortOrder = "updated-desc" | "updated-asc";

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: "listing",
    title: "Inserat erstellen",
    description: "Ein neues Immobilien-Inserat vorbereiten.",
    completed: false,
  },
  {
    id: "social",
    title: "Social Post vorbereiten",
    description: "Einen Beitrag für deine Kanäle erstellen.",
    completed: false,
  },
  {
    id: "images",
    title: "Bilder analysieren",
    description: "Immobilienbilder automatisch beschreiben lassen.",
    completed: false,
  },
  {
    id: "objects",
    title: "Objekte kontrollieren",
    description: "Gespeicherte Immobilien prüfen oder bearbeiten.",
    completed: false,
  },
];

function hasGeneratedVariants(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function formatPrice(price: number | null): string {
  if (price === null) {
    return "Preis auf Anfrage";
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Kürzlich bearbeitet";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function CockpitPage() {
  const [userName, setUserName] = useState("Makler");
  const [greeting, setGreeting] = useState("Willkommen");
  const [currentDate, setCurrentDate] = useState("");

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [showAllListings, setShowAllListings] = useState(false);
  const [currentListingIndex, setCurrentListingIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] =
  useState<ListingStatusFilter>("all");
const [sortOrder, setSortOrder] =
  useState<ListingSortOrder>("updated-desc");

  const [checklist, setChecklist] =
    useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  const normalizedSearchQuery = searchQuery
  .trim()
  .toLocaleLowerCase("de-CH");

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
          ?.toLocaleLowerCase("de-CH")
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

    if (storedName?.trim()) {
      setUserName(storedName.trim());
    }

    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Guten Morgen");
    } else if (hour < 18) {
      setGreeting("Guten Tag");
    } else {
      setGreeting("Guten Abend");
    }

    setCurrentDate(
      new Intl.DateTimeFormat("de-CH", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date())
    );
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
      ) as ChecklistItem[];

      if (Array.isArray(parsedChecklist)) {
        setChecklist(parsedChecklist);
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
              "Die gespeicherten Objekte konnten nicht geladen werden."
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
            : "Die gespeicherten Objekte konnten nicht geladen werden."
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
  }, []);

  function toggleChecklistItem(id: string) {
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
          <Link href="/dashboard" className="dashboardBackButton">
            <span>←</span>
            Dashboard
          </Link>

          <div className="cockpitWordmark">
            <strong>
              Inserat<span>-AI</span>
            </strong>
            <small>Makler-Cockpit</small>
          </div>

          <div className="topbarActions">
            <Link href="/socialMedia">Social Media</Link>

            <div className="userBadge">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <section className="heroSection">
          <div className="heroContent">
            <p className="eyebrow">DEIN MAKLER-COCKPIT</p>

            <h1>
              {greeting},{" "}
              <span>{userName}</span>
            </h1>

            <p className="heroDescription">
              Erstelle Inserate, verwalte Immobilien und bereite
              Social-Media-Beiträge an einem zentralen Ort vor.
            </p>

            <p className="currentDate">{currentDate}</p>
          </div>

          <div className="heroActions">
            <Link href="/dashboard" className="primaryButton">
              <span>＋</span>
              Neues Inserat
            </Link>

            <Link href="/socialMedia" className="secondaryButton">
              Social Media öffnen
            </Link>
          </div>
        </section>

        <section className="statsGrid">
          <article className="statCard">
            <span className="statIcon">🏠</span>

            <div>
              <small>Gespeicherte Objekte</small>
              <strong>
                {loadingListings ? "…" : listings.length}
              </strong>
              <p>Immobilien in deinem Cockpit</p>
            </div>
          </article>

          <article className="statCard">
            <span className="statIcon">📝</span>

            <div>
              <small>Erstellte Inserate</small>
              <strong>
                {loadingListings ? "…" : generatedListingsCount}
              </strong>
              <p>Objekte mit Textvarianten</p>
            </div>
          </article>

          <article className="statCard">
            <span className="statIcon">📱</span>

            <div>
              <small>Social Media</small>
              <strong>0</strong>
              <p>Vorbereitete Beiträge</p>
            </div>
          </article>

          <article className="statCard planCard">
            <span className="statIcon">⚡</span>

            <div>
              <small>Aktueller Plan</small>
              <strong>Testphase</strong>
              <p>30 Tage kostenlos testen</p>
            </div>
          </article>
        </section>

        <section className="mainGrid">
          <div className="mainColumn">
            <section className="panel quickPanel">
              <div className="panelHeader">
                <div>
                  <p className="sectionLabel">SCHNELLZUGRIFF</p>
                  <h2>Was möchtest du erledigen?</h2>
                </div>
              </div>

              <div className="quickGrid">
                <Link href="/dashboard" className="quickCard">
                  <span className="quickIcon">✨</span>
                  <h3>Neues Inserat</h3>
                  <p>
                    Objektdaten eingeben und drei professionelle
                    Varianten erstellen.
                  </p>
                  <strong>Inserat erstellen →</strong>
                </Link>

                <Link href="/socialMedia" className="quickCard">
                  <span className="quickIcon">📱</span>
                  <h3>Social Media</h3>
                  <p>
                    Texte für Instagram, Facebook und LinkedIn
                    vorbereiten.
                  </p>
                  <strong>Social Media öffnen →</strong>
                </Link>

                <Link href="/dashboard" className="quickCard">
                  <span className="quickIcon">🖼️</span>
                  <h3>Bilder analysieren</h3>
                  <p>
                    Immobilienbilder hochladen und automatisch
                    beschreiben lassen.
                  </p>
                  <strong>Bilder hochladen →</strong>
                </Link>

                <a href="#objekte" className="quickCard">
                  <span className="quickIcon">🏘️</span>
                  <h3>Objekte verwalten</h3>
                  <p>
                    Gespeicherte Immobilien öffnen, prüfen und
                    weiterbearbeiten.
                  </p>
                  <strong>Objekte anzeigen →</strong>
                </a>
              </div>
            </section>

            <section className="panel objectsPanel" id="objekte">
              <div className="panelHeader">
               <div className="objectsHeading">
  <p className="sectionLabel">IMMOBILIEN</p>

  <h2>
    {listings.length}{" "}
    {listings.length === 1
      ? "gespeichertes Objekt"
      : "gespeicherte Objekte"}
  </h2>
</div>

                
              </div>
<div className="listingControls">
  <label className="listingSearch">
    <span>Objekt suchen</span>

    <input
      type="search"
      value={searchQuery}
      placeholder="Ort, PLZ, Objektart oder Highlight"
      onChange={(event) => {
        setSearchQuery(event.target.value);
        
      }}
    />
  </label>

  <label className="listingControl">
    <span>Status</span>

    <select
      value={statusFilter}
      onChange={(event) => {
        setStatusFilter(
          event.target.value as ListingStatusFilter
        );
        setShowAllListings(false);
      }}
    >
      <option value="all">Alle Objekte</option>
      <option value="active">Nur aktive</option>
      <option value="archived">Nur archivierte</option>
    </select>
  </label>

  <label className="listingControl">
    <span>Sortierung</span>

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
        Zuletzt bearbeitet
      </option>

      <option value="updated-asc">
        Älteste Bearbeitung
      </option>
    </select>
  </label>
</div>
              {loadingListings ? (
                <div className="messageBox">
                  <div className="loadingSpinner" />
                  <h3>Objekte werden geladen</h3>
                  <p>
                    Inserat-AI verbindet sich mit deiner Datenbank.
                  </p>
                </div>
              ) : listingsError ? (
                <div className="messageBox errorBox">
                  <span className="messageIcon">⚠️</span>
                  <h3>Objekte konnten nicht geladen werden</h3>
                  <p>{listingsError}</p>
                </div>
              ) : currentListing === null ? (
                <div className="messageBox">
                  <span className="messageIcon">🏡</span>
                  <h3>Noch keine Objekte vorhanden</h3>
                  <p>
                    Speichere dein erstes Objekt im Inserat-Generator
                    dauerhaft ab.
                  </p>

                  <Link
                    href="/dashboard"
                    className="primaryButton messageButton"
                  >
                    Erstes Objekt erstellen
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
    aria-label="Vorheriges Objekt"
  >
    ‹
  </button>

  <div className="currentObjectLabel">
    Objekt {activeListingIndex + 1}
  </div>

  <button
    type="button"
    className="slideshowArrow"
    onClick={showNextListing}
    disabled={filteredListings.length <= 1}
    aria-label="Nächstes Objekt"
  >
    ›
  </button>
</div>
<Link
  key={currentListing.id}
  href={`/cockpit/${currentListing.id}`}
  className="propertyCard slideshowCard"
>
  <div className="propertyTop">
    <span className="propertyIcon">🏠</span>

    <span
      className={
        currentListing.archivedAt
          ? "propertyStatus archived"
          : "propertyStatus"
      }
    >
      {currentListing.archivedAt ? "Archiviert" : "Aktiv"}
    </span>
  </div>

  <div className="propertyHeading">
    <small>{currentListing.propertyType}</small>

    <h3>
      {currentListing.propertyType} in{" "}
      {currentListing.location}
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
      <span>Zimmer</span>
      <strong>
        {currentListing.rooms !== null
          ? currentListing.rooms
          : "–"}
      </strong>
    </div>

    <div>
      <span>Wohnfläche</span>
      <strong>
        {currentListing.livingArea !== null
          ? `${currentListing.livingArea} m²`
          : "–"}
      </strong>
    </div>

    <div className="priceFact">
      <span>Verkaufspreis</span>
      <strong>{formatPrice(currentListing.price)}</strong>
    </div>
  </div>

  {currentListing.highlights && (
    <div className="highlightsBox">
      <span>Highlights</span>
      <p>{currentListing.highlights}</p>
    </div>
  )}

  <div className="propertyFooter">
    <span>
      Bearbeitet am {formatDate(currentListing.updatedAt)}
    </span>

    <strong>Objekt öffnen →</strong>
  </div>
</Link>
</div>
              )}
            </section>
          </div>

          <aside className="sideColumn">
            <section className="panel checklistPanel">
              <div className="panelHeader checklistTitle">
                <div>
                  <p className="sectionLabel">HEUTE</p>
                  <h2>Deine Checkliste</h2>
                </div>

                <button type="button" onClick={resetChecklist}>
                  Zurücksetzen
                </button>
              </div>

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
                  <span>{checklistProgress}% erledigt</span>
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
                    onClick={() =>
                      toggleChecklistItem(item.id)
                    }
                  >
                    <span className="checkBox">
                      {item.completed ? "✓" : ""}
                    </span>

                    <span className="checkText">
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel tipPanel">
              <span className="tipIcon">💡</span>
              <p className="sectionLabel">INSERAT-AI TIPP</p>
              <h3>Highlights verbessern dein Inserat</h3>
              <p>
                Ergänze Lage, Aussicht, Ausstattung und
                Renovationen für überzeugendere Texte.
              </p>
              <Link href="/dashboard">
                Jetzt ausprobieren →
              </Link>
            </section>
          </aside>
        </section>
      </div>

      <style jsx>{`
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
          justify-self: start;
          gap: 9px;
          min-height: 43px;
          padding: 0 16px;
          border: 1px solid rgba(251, 191, 36, 0.28);
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.08);
          color: #fbbf24;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .dashboardBackButton:hover {
          transform: translateY(-2px);
          background: rgba(245, 158, 11, 0.14);
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
  .listingSlideshow {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.slideshowNavigation {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 52px;
  align-items: center;
  gap: 16px;
  width: 100%;
  margin: 20px 0;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(8, 21, 53, 0.62);
}

.slideshowArrow {
  display: flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(251, 191, 36, 0.45);
  border-radius: 14px;
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.slideshowArrow span {
  display: block;
  margin-top: -3px;
  font-size: 38px;
  line-height: 1;
}

.slideshowArrow:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
}

.slideshowArrow:active:not(:disabled) {
  transform: scale(0.95);
}

.slideshowArrow:disabled {
  cursor: not-allowed;
  opacity: 0.25;
}

.slideshowTabs {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow-x: auto;
  padding: 3px;
  scrollbar-width: none;
}

.slideshowTabs::-webkit-scrollbar {
  display: none;
}

.slideshowTab {
  flex: 0 0 auto;
  min-width: 92px;
  padding: 11px 16px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.045);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.slideshowTab:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.55);
  color: #ffffff;
}

.slideshowTab.active {
  border-color: #fbbf24;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #07142f;
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.22);
}

.slideshowCard {
  width: 100%;
  min-height: 0;
  animation: listingSlideIn 0.3s ease;
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

@media (max-width: 700px) {
  .slideshowNavigation {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    gap: 8px;
    padding: 10px;
  }

  .slideshowArrow {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  .slideshowArrow span {
    font-size: 32px;
  }

  .slideshowTabs {
    justify-content: flex-start;
  }

  .slideshowTab {
    min-width: 82px;
    padding: 9px 13px;
    font-size: 12px;
  }
}

.slideshowArrow {
  display: inline-flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(251, 191, 36, 0.45);
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  cursor: pointer;
  font-size: 24px;
  font-weight: 900;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.slideshowArrow:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.18);
}

.slideshowArrow:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}



.slideshowCard {
  width: 100%;
  min-height: 0;
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
      `}</style>
    </main>
  );
}