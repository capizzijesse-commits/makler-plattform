"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: string;
  badge?: string;
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
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

type ListingsResponse = {
  success: boolean;
  listings?: Listing[];
  error?: string;
};
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
    id: "follow-up",
    title: "Objekte prüfen",
    description: "Gespeicherte Objekte kontrollieren oder bearbeiten.",
    completed: false,
  },
];
function hasGeneratedVariants(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function formatPrice(price: number | null): string {
  if (price === null) return "Preis offen";

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatListingDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "kürzlich";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const quickActions: QuickAction[] = [
  {
    title: "Neues Inserat",
    description: "Objektdaten eingeben und drei Inserat-Varianten erstellen.",
    href: "/dashboard",
    icon: "✨",
  },
  {
    title: "Social Media",
    description: "Beiträge für Instagram, Facebook und LinkedIn vorbereiten.",
    href: "/socialMedia",
    icon: "📱",
  },
  {
    title: "Bilder analysieren",
    description: "Immobilienbilder hochladen und automatisch beschreiben lassen.",
    href: "/dashboard",
    icon: "🖼️",
  },
  {
    title: "Objekte verwalten",
    description: "Gespeicherte Immobilien öffnen und weiterbearbeiten.",
    href: "#objekte",
    icon: "🏠",
    badge: "Als Nächstes",
  },
];

export default function CockpitPage() {
  const [userName, setUserName] = useState("Makler");
  const [currentDate, setCurrentDate] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
const [loadingListings, setLoadingListings] = useState(true);
const [listingsError, setListingsError] = useState("");
const [checklist, setChecklist] =
  useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

const completedTasks = checklist.filter(
  (item) => item.completed
).length;

const checklistProgress =
  checklist.length === 0
    ? 0
    : Math.round((completedTasks / checklist.length) * 100);

const recentListings = listings.slice(0, 4);

const generatedListingsCount = listings.filter((listing) =>
  hasGeneratedVariants(listing.generatedVariants)
).length;

  useEffect(() => {
  const storedName = localStorage.getItem("userName");

  if (storedName?.trim()) {
    setUserName(storedName.trim());
  }
useEffect(() => {
  const savedChecklist = localStorage.getItem(
    "inseratAiCockpitChecklist"
  );

  if (!savedChecklist) return;

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
  const controller = new AbortController();
  useEffect(() => {
  const savedChecklist = localStorage.getItem(
    "inseratAiCockpitChecklist"
  );

  if (!savedChecklist) return;

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

      setListings(Array.isArray(data.listings) ? data.listings : []);
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
  return (
    <main className="cockpitPage">
      <div className="backgroundGlow backgroundGlowOne" />
      <div className="backgroundGlow backgroundGlowTwo" />

      <section className="cockpitShell">
        <header className="topbar">
          <Link href="/" className="brand">
  <div className="brandWordmark">
    <strong>
      Inserat<span>-AI</span>
    </strong>

    <small>Makler-Cockpit</small>
  </div>
</Link>

          <nav className="topNavigation">
            <Link href="/dashboard">Inserat erstellen</Link>
            <Link href="/socialMedia">Social Media</Link>
            <Link href="/">Startseite</Link>
          </nav>

          <div className="profile">
            <div className="profileAvatar">
              {userName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{userName}</strong>
              <span>Maklerkonto</span>
            </div>
          </div>
        </header>

        <section className="welcomeSection">
          <div>
            <p className="eyebrow">DEIN ARBEITSBEREICH</p>

            <h1>
              Guten Morgen, <span>{userName}</span>
            </h1>

            <p className="welcomeText">
              Erstelle Inserate, bereite Social-Media-Beiträge vor und behalte
              deine Immobilien an einem zentralen Ort im Blick.
            </p>

            <p className="dateText">{currentDate}</p>
          </div>

          <div className="welcomeActions">
            <Link href="/dashboard" className="primaryButton">
              <span>＋</span>
              Neues Inserat erstellen
            </Link>

            <Link href="/socialMedia" className="secondaryButton">
              Social Media öffnen
            </Link>
          </div>
        </section>

        <section className="statsGrid">
          <article className="statCard">
            <div className="statIcon">🏠</div>

            <div>
              <span>Gespeicherte Objekte</span>
              <strong>0</strong>
              <small>Noch keine Objekte gespeichert</small>
            </div>
          </article>

          <article className="statCard">
            <div className="statIcon">📝</div>

            <div>
              <span>Erstellte Inserate</span>
              <strong>0</strong>
              <small>Deine Aktivität erscheint hier</small>
            </div>
          </article>

          <article className="statCard">
            <div className="statIcon">📣</div>

            <div>
              <span>Social-Media-Beiträge</span>
              <strong>0</strong>
              <small>Bereit für deine ersten Beiträge</small>
            </div>
          </article>

          <article className="statCard highlightedStat">
            <div className="statIcon">⚡</div>

            <div>
              <span>Aktueller Plan</span>
              <strong>Testphase</strong>
              <small>30 Tage kostenlos testen</small>
            </div>
          </article>
        </section>

        <section className="contentGrid">
          <div className="mainColumn">
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <p className="sectionLabel">SCHNELLZUGRIFF</p>
                  <h2>Was möchtest du heute erledigen?</h2>
                </div>
              </div>

              <div className="quickActionGrid">
                {quickActions.map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="quickActionCard"
                  >
                    <div className="quickActionTop">
                      <span className="quickActionIcon">{action.icon}</span>

                      {action.badge && (
                        <span className="actionBadge">{action.badge}</span>
                      )}
                    </div>

                    <h3>{action.title}</h3>
                    <p>{action.description}</p>

                    <span className="actionLink">
                      Öffnen <span>→</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="panel" id="objekte">
              <div className="panelHeader">
                <div>
                  <p className="sectionLabel">IMMOBILIEN</p>
                  <h2>Zuletzt bearbeitete Objekte</h2>
                </div>

                <button type="button" className="textButton">
                  Alle anzeigen
                </button>
              </div>

             {loadingListings ? (
  <div className="listingsMessage">
    <div className="loadingSpinner" />

    <h3>Objekte werden geladen</h3>

    <p>Inserat-AI verbindet sich mit deiner Online-Datenbank.</p>
  </div>
) : listingsError ? (
  <div className="listingsMessage errorMessage">
    <div className="emptyStateIcon">⚠️</div>

    <h3>Objekte konnten nicht geladen werden</h3>

    <p>{listingsError}</p>
  </div>
) : recentListings.length === 0 ? (
  <div className="emptyState">
    <div className="emptyStateIcon">🏡</div>

    <h3>Noch keine Objekte vorhanden</h3>

    <p>
      Speichere im Inserat-Generator dein erstes Objekt dauerhaft.
      Anschliessend erscheint es automatisch in deinem Makler-Cockpit.
    </p>

    <Link href="/dashboard" className="primaryButton smallButton">
      Erstes Inserat erstellen
    </Link>
  </div>
) : (
  <div className="listingGrid">
    {recentListings.map((listing) => {
      const objectDetails = [
        listing.postalCode,
        listing.rooms !== null ? `${listing.rooms} Zimmer` : null,
        listing.livingArea !== null
          ? `${listing.livingArea} m²`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return (
  <Link
    key={listing.id}
    href={`/cockpit/${listing.id}`}
    className="propertyCard"
  >
    <div className="propertyCardHeader">
      <div className="propertyIcon">🏠</div>

      <span
        className={
          listing.archivedAt
            ? "propertyStatus propertyStatusArchived"
            : "propertyStatus"
        }
      >
        {listing.archivedAt ? "Archiviert" : "Aktiv"}
      </span>
    </div>

    <div className="propertyTitleArea">
      <p className="propertyType">{listing.propertyType}</p>

      <h3>
        {listing.propertyType} in {listing.location}
      </h3>

      <span className="propertyLocation">
        📍 {listing.postalCode ? `${listing.postalCode} ` : ""}
        {listing.location}
      </span>
    </div>

    <div className="propertyFacts">
      <div className="propertyFact">
        <span>Zimmer</span>
        <strong>
          {listing.rooms !== null ? listing.rooms : "–"}
        </strong>
      </div>

      <div className="propertyFact">
        <span>Wohnfläche</span>
        <strong>
          {listing.livingArea !== null
            ? `${listing.livingArea} m²`
            : "–"}
        </strong>
      </div>

      <div className="propertyFact propertyPriceFact">
        <span>Verkaufspreis</span>
        <strong>{formatPrice(listing.price)}</strong>
      </div>
    </div>

    {listing.highlights && (
      <div className="propertyHighlights">
        <span>Highlights</span>
        <p>{listing.highlights}</p>
      </div>
    )}

    <div className="propertyCardFooter">
      <span>
        Bearbeitet am {formatListingDate(listing.updatedAt)}
      </span>

      <strong>
        Objekt öffnen <span>→</span>
      </strong>
    </div>
  </Link>
);
    })}
  </div>
)}
            </section>
          </div>

          <aside className="sideColumn">
            <section className="panel progressPanel">
              <p className="sectionLabel">HEUTE</p>
              <h2>Dein Tagesüberblick</h2>

              <div className="progressCircle">
                <div>
                  <strong>0</strong>
                  <span>Aufgaben</span>
                </div>
              </div>

              <div className="taskList">
                <div className="taskItem">
                  <span className="taskStatus" />
                  <div>
                    <strong>Inserat erstellen</strong>
                    <p>Starte mit deinem ersten Objekt.</p>
                  </div>
                </div>

                <div className="taskItem">
                  <span className="taskStatus" />
                  <div>
                    <strong>Social Post vorbereiten</strong>
                    <p>Nutze den Text direkt für deine Kanäle.</p>
                  </div>
                </div>

                <div className="taskItem">
                  <span className="taskStatus" />
                  <div>
                    <strong>Bilder analysieren</strong>
                    <p>Lass Immobilienbilder automatisch beschreiben.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel tipPanel">
              <div className="tipIcon">💡</div>

              <p className="sectionLabel">INSERAT-AI TIPP</p>

              <h3>Mehrere Highlights verbessern dein Inserat</h3>

              <p>
                Ergänze Lage, Aussicht, Ausstattung und Renovationen. Inserat-AI
                kann daraus überzeugendere Texte erstellen.
              </p>

              <Link href="/dashboard">Jetzt ausprobieren →</Link>
            </section>
          </aside>
        </section>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .cockpitPage {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at top left,
              rgba(22, 163, 74, 0.12),
              transparent 32%
            ),
            linear-gradient(145deg, #07110d 0%, #0a1711 45%, #07100c 100%);
          color: #f8fafc;
          padding: 24px;
        }

        .backgroundGlow {
          position: fixed;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          filter: blur(110px);
          pointer-events: none;
          opacity: 0.18;
        }

        .backgroundGlowOne {
          top: -180px;
          right: 10%;
          background: #22c55e;
        }

        .backgroundGlowTwo {
          bottom: -240px;
          left: -100px;
          background: #14b8a6;
        }

        .cockpitShell {
          position: relative;
          width: min(1480px, 100%);
          margin: 0 auto;
          z-index: 1;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          min-height: 76px;
          padding: 14px 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          background: rgba(10, 24, 17, 0.82);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(18px);
        }
.brand > span:last-child {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  line-height: 1.2 !important;
}

.brand > span:last-child strong {
  display: block !important;
  font-size: 17px !important;
  line-height: 1.2 !important;
}

.brand > span:last-child small {
  display: block !important;
  margin-top: 4px !important;
  color: #91a69a !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
}

.welcomeActions .primaryButton {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 50px !important;
  padding: 0 22px !important;
  border-radius: 14px !important;
  background: linear-gradient(135deg, #16a34a, #22c55e) !important;
  color: #ffffff !important;
  text-decoration: none !important;
  box-shadow: 0 16px 34px rgba(22, 163, 74, 0.25) !important;
}

.welcomeActions .secondaryButton {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 50px !important;
  padding: 0 22px !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, 0.04) !important;
  color: #dbe8df !important;
  text-decoration: none !important;
}
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #ffffff;
          text-decoration: none;
        }

        .brandIcon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #16a34a, #4ade80);
          color: #ffffff;
          font-size: 22px;
          font-weight: 900;
          box-shadow: 0 12px 30px rgba(34, 197, 94, 0.24);
        }

        .brand strong,
        .brand small {
          display: block;
        }

        .brand strong {
          font-size: 17px;
          letter-spacing: -0.02em;
        }

        .brand small {
          margin-top: 2px;
          color: #91a69a;
          font-size: 12px;
        }

        .topNavigation {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .topNavigation a {
          color: #b7c5bc;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .topNavigation a:hover {
          color: #ffffff;
          transform: translateY(-1px);
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .profileAvatar {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.14);
          color: #86efac;
          font-weight: 900;
        }

        .profile strong,
        .profile span {
          display: block;
        }

        .profile strong {
          font-size: 14px;
        }

        .profile span {
          margin-top: 3px;
          color: #8ea096;
          font-size: 11px;
        }

        .welcomeSection {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 36px;
          padding: 58px 10px 34px;
        }

        .eyebrow,
        .sectionLabel {
          margin: 0 0 10px;
          color: #4ade80;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .welcomeSection h1 {
          margin: 0;
          max-width: 780px;
          font-size: clamp(38px, 5vw, 66px);
          line-height: 1.02;
          letter-spacing: -0.055em;
        }

        .welcomeSection h1 span {
          color: #4ade80;
        }

        .welcomeText {
          max-width: 720px;
          margin: 19px 0 0;
          color: #a8b7ae;
          font-size: 17px;
          line-height: 1.65;
        }

        .dateText {
          margin: 16px 0 0;
          color: #667a6e;
          font-size: 13px;
          text-transform: capitalize;
        }

        .welcomeActions {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 11px;
          min-width: 230px;
        }

        .primaryButton,
        .secondaryButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 50px;
          padding: 0 20px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 900;
          text-decoration: none;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .primaryButton {
          background: linear-gradient(135deg, #16a34a, #22c55e);
          color: #ffffff;
          box-shadow: 0 16px 34px rgba(22, 163, 74, 0.25);
        }

        .secondaryButton {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.035);
          color: #dbe8df;
        }

        .primaryButton:hover,
        .secondaryButton:hover {
          transform: translateY(-2px);
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 18px;
        }

        .statCard {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          min-height: 144px;
          padding: 22px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 20px;
          background: rgba(13, 29, 21, 0.82);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(16px);
        }

        .highlightedStat {
          border-color: rgba(74, 222, 128, 0.25);
          background: linear-gradient(
            145deg,
            rgba(22, 163, 74, 0.2),
            rgba(13, 29, 21, 0.9)
          );
        }

        .statIcon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 45px;
          height: 45px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.055);
          font-size: 20px;
        }

        .statCard span,
        .statCard strong,
        .statCard small {
          display: block;
        }

        .statCard span {
          color: #8fa198;
          font-size: 12px;
          font-weight: 700;
        }

        .statCard strong {
          margin-top: 9px;
          color: #ffffff;
          font-size: 26px;
          line-height: 1;
        }

        .statCard small {
          margin-top: 12px;
          color: #687b70;
          font-size: 11px;
          line-height: 1.45;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.75fr) minmax(300px, 0.75fr);
          gap: 18px;
          padding-bottom: 40px;
        }

        .mainColumn,
        .sideColumn {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .panel {
          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 22px;
          background: rgba(13, 29, 21, 0.82);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(16px);
          padding: 25px;
        }

        .panelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .panel h2 {
          margin: 0;
          color: #f8fafc;
          font-size: 22px;
          letter-spacing: -0.03em;
        }

        .quickActionGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .quickActionCard {
          min-height: 210px;
          padding: 19px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.025);
          color: #ffffff;
          text-decoration: none;
          transition:
            transform 0.22s ease,
            border-color 0.22s ease,
            background 0.22s ease;
        }

        .quickActionCard:hover {
          transform: translateY(-4px);
          border-color: rgba(74, 222, 128, 0.28);
          background: rgba(34, 197, 94, 0.075);
        }

        .quickActionTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .quickActionIcon {
          display: grid;
          place-items: center;
          width: 47px;
          height: 47px;
          border-radius: 15px;
          background: rgba(74, 222, 128, 0.1);
          font-size: 21px;
        }

        .actionBadge {
          padding: 6px 9px;
          border: 1px solid rgba(250, 204, 21, 0.2);
          border-radius: 999px;
          background: rgba(250, 204, 21, 0.08);
          color: #fde047;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .quickActionCard h3 {
          margin: 22px 0 9px;
          font-size: 17px;
        }

        .quickActionCard p {
          min-height: 44px;
          margin: 0;
          color: #8fa198;
          font-size: 13px;
          line-height: 1.55;
        }

        .actionLink {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 19px;
          color: #4ade80;
          font-size: 12px;
          font-weight: 900;
        }

        .textButton {
          border: 0;
          background: transparent;
          color: #4ade80;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
        }

        .emptyState {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          padding: 34px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.018);
          text-align: center;
        }

        .emptyStateIcon {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: rgba(74, 222, 128, 0.09);
          font-size: 29px;
        }

        .emptyState h3 {
          margin: 19px 0 8px;
          font-size: 18px;
        }

        .emptyState p {
          max-width: 490px;
          margin: 0;
          color: #8fa198;
          font-size: 13px;
          line-height: 1.65;
        }

        .smallButton {
          min-height: 44px;
          margin-top: 22px;
          padding: 0 17px;
          font-size: 12px;
        }

        .progressPanel {
          min-height: 440px;
        }

        .progressCircle {
          display: grid;
          place-items: center;
          width: 150px;
          height: 150px;
          margin: 28px auto;
          border-radius: 50%;
          background:
            radial-gradient(circle at center, #0d1d15 59%, transparent 61%),
            conic-gradient(
              #22c55e 0deg,
              #22c55e 12deg,
              rgba(255, 255, 255, 0.07) 12deg,
              rgba(255, 255, 255, 0.07) 360deg
            );
        }

        .progressCircle div {
          text-align: center;
        }

        .progressCircle strong,
        .progressCircle span {
          display: block;
        }

        .progressCircle strong {
          font-size: 34px;
        }

        .progressCircle span {
          margin-top: 3px;
          color: #82958a;
          font-size: 11px;
        }

        .taskList {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .taskItem {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .taskStatus {
          flex: 0 0 auto;
          width: 11px;
          height: 11px;
          margin-top: 4px;
          border: 2px solid rgba(74, 222, 128, 0.5);
          border-radius: 50%;
        }

        .taskItem strong {
          display: block;
          font-size: 12px;
        }

        .taskItem p {
          margin: 5px 0 0;
          color: #76897e;
          font-size: 11px;
          line-height: 1.45;
        }

        .tipPanel {
          position: relative;
          overflow: hidden;
          border-color: rgba(74, 222, 128, 0.16);
          background: linear-gradient(
            145deg,
            rgba(22, 163, 74, 0.15),
            rgba(13, 29, 21, 0.9)
          );
        }

        .tipIcon {
          margin-bottom: 19px;
          font-size: 28px;
        }

        .tipPanel h3 {
          margin: 0;
          font-size: 17px;
          line-height: 1.35;
        }

        .tipPanel > p:last-of-type {
          margin: 12px 0 18px;
          color: #91a49a;
          font-size: 12px;
          line-height: 1.6;
        }

        .tipPanel a {
          color: #4ade80;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }
/* Cockpit optisch an das Inserat-AI Dashboard anpassen */

.cockpitPage {
  background:
    radial-gradient(
      circle at 85% 15%,
      rgba(124, 58, 237, 0.25),
      transparent 35%
    ),
    radial-gradient(
      circle at 10% 80%,
      rgba(37, 99, 235, 0.22),
      transparent 38%
    ),
    linear-gradient(
      145deg,
      #07142f 0%,
      #111d4a 48%,
      #30246b 100%
    ) !important;
}

.topbar,
.panel,
.statCard {
  border-color: rgba(255, 255, 255, 0.11) !important;
  background: rgba(10, 22, 52, 0.84) !important;
  box-shadow: 0 24px 65px rgba(0, 0, 0, 0.28) !important;
}

.highlightedStat {
  border-color: rgba(250, 204, 21, 0.35) !important;
  background: linear-gradient(
    145deg,
    rgba(245, 158, 11, 0.18),
    rgba(15, 28, 65, 0.92)
  ) !important;
}

.eyebrow,
.sectionLabel {
  color: #fbbf24 !important;
}

.welcomeSection h1 span {
  color: #fbbf24 !important;
}

.primaryButton {
  background: linear-gradient(
    135deg,
    #f59e0b,
    #facc15
  ) !important;
  color: #10162e !important;
  box-shadow: 0 15px 32px rgba(245, 158, 11, 0.25) !important;
}

.secondaryButton {
  border-color: rgba(255, 255, 255, 0.14) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

.quickActionCard {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.04) !important;
}

.quickActionCard:hover {
  border-color: rgba(250, 204, 21, 0.4) !important;
  background: rgba(245, 158, 11, 0.09) !important;
}

.quickActionIcon,
.emptyStateIcon,
.listingCardIcon {
  background: rgba(245, 158, 11, 0.14) !important;
}

.actionLink,
.textButton,
.tipPanel a {
  color: #fbbf24 !important;
}

.tipPanel {
  border-color: rgba(250, 204, 21, 0.25) !important;
  background: linear-gradient(
    145deg,
    rgba(245, 158, 11, 0.13),
    rgba(15, 28, 65, 0.94)
  ) !important;
}

/* Gespeicherte Objekte */

.listingGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.propertyCard {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 390px;
  overflow: hidden;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 20px;
  background:
    radial-gradient(
      circle at top right,
      rgba(245, 158, 11, 0.12),
      transparent 35%
    ),
    linear-gradient(
      145deg,
      rgba(27, 43, 91, 0.96),
      rgba(12, 25, 59, 0.96)
    );
  color: #ffffff;
  text-decoration: none;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.23);
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.propertyCard:hover {
  transform: translateY(-5px);
  border-color: rgba(251, 191, 36, 0.52);
  box-shadow: 0 26px 55px rgba(0, 0, 0, 0.32);
}

.propertyCard::before {
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: linear-gradient(90deg, #f59e0b, #facc15);
  content: "";
}

.propertyCardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.propertyIcon {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 15px;
  background: rgba(245, 158, 11, 0.13);
  font-size: 23px;
}

.propertyStatus {
  padding: 7px 12px;
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.11);
  color: #86efac;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.propertyStatusArchived {
  border-color: rgba(148, 163, 184, 0.28);
  background: rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
}

.propertyTitleArea {
  padding: 22px 0 18px;
}

.propertyType {
  margin: 0 0 7px;
  color: #fbbf24;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.propertyTitleArea h3 {
  margin: 0;
  color: #ffffff;
  font-size: 21px;
  line-height: 1.3;
  letter-spacing: -0.03em;
}

.propertyLocation {
  display: block;
  margin-top: 9px;
  color: #aab7d5;
  font-size: 12px;
}

.propertyFacts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.propertyFact {
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.045);
}

.propertyFact span,
.propertyFact strong {
  display: block;
}

.propertyFact span {
  color: #8998bc;
  font-size: 10px;
  font-weight: 700;
}

.propertyFact strong {
  margin-top: 6px;
  color: #ffffff;
  font-size: 14px;
}

.propertyPriceFact {
  grid-column: 1 / -1;
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(251, 191, 36, 0.2);
}

.propertyPriceFact strong {
  color: #fbbf24;
  font-size: 19px;
}

.propertyHighlights {
  margin-top: 15px;
  padding: 13px 15px;
  border-left: 3px solid #fbbf24;
  border-radius: 0 12px 12px 0;
  background: rgba(255, 255, 255, 0.035);
}

.propertyHighlights span {
  display: block;
  color: #fbbf24;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.propertyHighlights p {
  display: -webkit-box;
  overflow: hidden;
  margin: 6px 0 0;
  color: #b6c0da;
  font-size: 11px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.propertyCardFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: auto;
  padding-top: 19px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.propertyCardFooter > span {
  color: #7f8dab;
  font-size: 10px;
}

.propertyCardFooter > strong {
  color: #fbbf24;
  font-size: 11px;
  white-space: nowrap;
}

.propertyCardFooter > strong span {
  margin-left: 4px;
}

.listingsMessage h3 {
  margin: 18px 0 8px;
}

.listingsMessage p {
  margin: 0;
  color: #aeb9d2;
  font-size: 13px;
}

.loadingSpinner {
  width: 44px;
  height: 44px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #fbbf24;
  border-radius: 50%;
  animation: cockpitSpin 0.8s linear infinite;
}

@keyframes cockpitSpin {
  to {
    transform: rotate(360deg);
  }
}
  .brand {
  display: inline-flex !important;
  align-items: center !important;
  color: #ffffff !important;
  text-decoration: none !important;
}

.brandWordmark {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 5px !important;
}

.brandWordmark strong {
  display: block !important;
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 23px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  letter-spacing: -0.04em !important;
}

.brandWordmark strong span {
  color: #fbbf24 !important;
}

.brandWordmark small {
  display: block !important;
  margin: 0 !important;
  color: #9ca9c8 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}
  .checklistHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.checklistHeader > span {
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.checklistHeader button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #fbbf24;
  cursor: pointer;
  font-size: 10px;
  font-weight: 800;
}

.checklistHeader button:hover {
  text-decoration: underline;
}

.taskList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checklistItem {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 12px;
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.035);
  color: #ffffff;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.checklistItem:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.32);
  background: rgba(245, 158, 11, 0.07);
}

.checklistBox {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 21px;
  height: 21px;
  border: 2px solid rgba(251, 191, 36, 0.5);
  border-radius: 6px;
  color: #10162e;
  font-size: 13px;
  font-weight: 900;
}

.checklistContent {
  display: block;
}

.checklistContent strong,
.checklistContent small {
  display: block;
}

.checklistContent strong {
  color: #ffffff;
  font-size: 12px;
}

.checklistContent small {
  margin-top: 5px;
  color: #8e9abc;
  font-size: 10px;
  line-height: 1.45;
}

.checklistItemCompleted {
  border-color: rgba(34, 197, 94, 0.2);
  background: rgba(34, 197, 94, 0.07);
}

.checklistItemCompleted .checklistBox {
  border-color: #22c55e;
  background: #22c55e;
}

.checklistItemCompleted .checklistContent strong {
  color: #9ca3af;
  text-decoration: line-through;
}

.checklistItemCompleted .checklistContent small {
  color: #667085;
}
        @media (max-width: 1100px) {
          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }

          .sideColumn {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .cockpitPage {
            padding: 14px;
          }

          .topNavigation {
            display: none;
          }

          .welcomeSection {
            flex-direction: column;
            align-items: stretch;
            padding-top: 42px;
          }

          .welcomeActions {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .topbar {
            min-height: 66px;
            padding: 11px 13px;
            border-radius: 17px;
          }

          .brand small,
          .profile > div:last-child {
            display: none;
          }

          .welcomeSection {
            padding: 36px 3px 26px;
          }

          .welcomeSection h1 {
            font-size: 40px;
          }

          .welcomeText {
            font-size: 15px;
          }

          .statsGrid,
          .quickActionGrid,
          .sideColumn {
            grid-template-columns: 1fr;
          }

          .statCard {
            min-height: auto;
          }

          .panel {
            padding: 19px;
            border-radius: 18px;
          }

          .panelHeader {
            align-items: flex-start;
          }

          .quickActionCard {
            min-height: 190px;
          }

          .emptyState {
            min-height: 270px;
            padding: 25px 17px;
          }
        }
      `}</style>
    </main>
  );
}