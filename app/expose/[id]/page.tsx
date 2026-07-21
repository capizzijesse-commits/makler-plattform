"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ListingImage = {
  id: string;
  url: string;
  fileName?: string | null;
  position: number;
  isPrimary: boolean;
};

type Listing = {
  id: string;
  location: string;
  postalCode?: string | null;
  propertyType: string;
  rooms?: number | null;
  livingArea?: number | null;
  price?: number | null;
  highlights?: string | null;
  style?: string | null;
  generatedVariants?: unknown;
  socialVariants?: unknown;
  imageAnalysis?: string | null;
  locationDescription?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  images?: ListingImage[];
};

type ContactDetails = {
  name: string;
  company: string;
  email: string;
  phone: string;
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
};

type SessionResponse = {
  success?: boolean;
  authenticated?: boolean;
  user?: SessionUser;
};

type TextVariant = {
  title?: string;
  text?: string;
  description?: string;
  content?: string;
};

const NAVY = "#050b1d";
const NAVY_2 = "#0b1733";
const NAVY_3 = "#101d42";
const GOLD = "#f5bd21";
const GOLD_SOFT = "#ffd96a";
const CYAN = "#55d8ff";
const VIOLET = "#6b5cff";
const ORANGE = "#ff7a1a";
const TEXT = "#f7f9ff";
const MUTED = "#9aa9c6";
const PAGE_BACKGROUND = "#030817";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectTextVariants(value: unknown): TextVariant[] {
  if (Array.isArray(value)) {
    return value
      .filter(isRecord)
      .map((item) => ({
        title: readText(item.title),
        text: readText(item.text),
        description: readText(item.description),
        content: readText(item.content),
      }));
  }

  if (!isRecord(value)) {
    return [];
  }

  const directVariant: TextVariant = {
    title: readText(value.title),
    text: readText(value.text),
    description: readText(value.description),
    content: readText(value.content),
  };

  const nestedCandidates = [
    value.variants,
    value.generatedVariants,
    value.results,
    value.items,
  ];

  const nestedVariants = nestedCandidates.flatMap((candidate) =>
    collectTextVariants(candidate)
  );

  const hasDirectText = Object.values(directVariant).some(Boolean);

  return hasDirectText ? [directVariant, ...nestedVariants] : nestedVariants;
}

function getExposeTitle(listing: Listing): string {
  const variants = collectTextVariants(listing.generatedVariants);
  const generatedTitle = variants.find((variant) => variant.title)?.title;

  if (generatedTitle) {
    return generatedTitle;
  }

  const place = [listing.postalCode, listing.location]
    .filter(Boolean)
    .join(" ");

  return `${listing.propertyType} in ${place || listing.location}`.trim();
}

function getDescription(listing: Listing): string {
  if (typeof listing.generatedVariants === "string") {
    const text = listing.generatedVariants.trim();

    if (text) {
      return text;
    }
  }

  const variants = collectTextVariants(listing.generatedVariants);

  for (const variant of variants) {
    const text =
      variant.text || variant.description || variant.content || "";

    if (text) {
      return text;
    }
  }

  return [
    `Dieses ${listing.propertyType.toLowerCase()} befindet sich in ${
      listing.location
    }.`,
    listing.rooms
      ? `Die Immobilie verfügt über ${formatNumber(listing.rooms)} Zimmer.`
      : "",
    listing.livingArea
      ? `Die Wohnfläche beträgt rund ${formatNumber(
          listing.livingArea
        )} m².`
      : "",
    "Weitere Angaben können direkt im Objekt ergänzt und anschliessend im Exposé übernommen werden.",
  ]
    .filter(Boolean)
    .join(" ");
}

function splitHighlights(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/\r?\n|,|;|•|\|/g)
        .map((item) => item.trim().replace(/^[-–—]\s*/, ""))
        .filter(Boolean)
    )
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPrice(value?: number | null): string {
  if (value === null || value === undefined) {
    return "Auf Anfrage";
  }

  return `CHF ${new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatDate(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function getPdfDocumentTitle(listing: Listing): string {
  const propertyType = sanitizeFilePart(listing.propertyType || "Immobilie");
  const location = sanitizeFilePart(listing.location || "Schweiz");

  return `Expose_${propertyType}_${location}`;
}

function getInitialContact(): ContactDetails {
  if (typeof window === "undefined") {
    return {
      name: "",
      company: "",
      email: "",
      phone: "",
    };
  }

  return {
    name:
      localStorage.getItem("userName")?.trim() ||
      localStorage.getItem("contactName")?.trim() ||
      "",
    company:
      localStorage.getItem("companyName")?.trim() ||
      localStorage.getItem("userCompany")?.trim() ||
      "",
    email:
      localStorage.getItem("userEmail")?.trim() ||
      localStorage.getItem("contactEmail")?.trim() ||
      "",
    phone:
      localStorage.getItem("userPhone")?.trim() ||
      localStorage.getItem("contactPhone")?.trim() ||
      "",
  };
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`}>
      <span className="brand-mark__icon" aria-hidden="true">
        <span className="brand-mark__roof" />
        <span className="brand-mark__line brand-mark__line--one" />
        <span className="brand-mark__line brand-mark__line--two" />
        <span className="brand-mark__line brand-mark__line--three" />
      </span>

      <span className="brand-mark__copy">
        <strong>Inserat-AI</strong>
        <small>Immobilien-Exposé</small>
      </span>
    </div>
  );
}

function ImagePlaceholder({
  label = "Noch kein Objektbild vorhanden",
}: {
  label?: string;
}) {
  return (
    <div className="image-placeholder">
      <div className="image-placeholder__glow" />
      <div className="image-placeholder__icon">
        <span />
      </div>
      <strong>{label}</strong>
      <small>Bilder im Makler-Cockpit hinzufügen</small>
    </div>
  );
}

function PageLabel({
  number,
  eyebrow,
  title,
}: {
  number: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="page-label">
      <span className="page-label__number">{number}</span>
      <div>
        <span className="page-label__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = "gold",
}: {
  label: string;
  value: string;
  accent?: "gold" | "cyan" | "violet";
}) {
  return (
    <div className={`metric-card metric-card--${accent}`}>
      <span className="metric-card__dot" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PageFooter({
  page,
  date,
}: {
  page: string;
  date?: string;
}) {
  return (
    <footer className="sheet-footer">
      <BrandMark compact />
      <div className="sheet-footer__meta">
        {date && <span>{date}</span>}
        <strong>{page}</strong>
      </div>
    </footer>
  );
}

export default function ExposePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const listingId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [contact, setContact] = useState<ContactDetails>({
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadContactDetails() {
      const fallback = getInitialContact();

      try {
        const response = await fetch("/api/session", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const data = (await response.json().catch(() => null)) as
          | SessionResponse
          | null;

        if (!active) {
          return;
        }

        const sessionName =
          typeof data?.user?.name === "string"
            ? data.user.name.trim()
            : "";

        const sessionEmail =
          typeof data?.user?.email === "string"
            ? data.user.email.trim()
            : "";

        const sessionCompany =
          typeof data?.user?.company === "string"
            ? data.user.company.trim()
            : "";

        const sessionPhone =
          typeof data?.user?.phone === "string"
            ? data.user.phone.trim()
            : "";

        setContact({
          name: sessionName || fallback.name,
          company: sessionCompany || fallback.company,
          email: sessionEmail || fallback.email,
          phone: sessionPhone || fallback.phone,
        });
      } catch {
        if (active) {
          setContact(fallback);
        }
      }
    }

    void loadContactDetails();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!listingId) {
      setError("Es wurde keine Objekt-ID übergeben.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadListing() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/listings/${encodeURIComponent(listingId)}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
          }
        );

        const data = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              listing?: Listing;
              error?: string;
            }
          | null;

        if (!response.ok || !data?.listing) {
          throw new Error(
            data?.error || "Das Objekt konnte nicht geladen werden."
          );
        }

        setListing(data.listing);
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
            : "Das Objekt konnte nicht geladen werden."
        );
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

  const sortedImages = useMemo(() => {
    if (!listing?.images?.length) {
      return [];
    }

    return [...listing.images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }

      return a.position - b.position;
    });
  }, [listing]);

  const primaryImage = sortedImages[0] ?? null;
  const galleryImages = sortedImages.slice(1, 7);
  const highlights = useMemo(
    () => splitHighlights(listing?.highlights),
    [listing?.highlights]
  );

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/cockpit");
  }

  function exportPdf() {
    if (printing || !listing) {
      return;
    }

    const previousTitle = document.title;
    const pdfDocumentTitle = getPdfDocumentTitle(listing);
    let cleanedUp = false;

    function cleanupPrintState() {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      document.title = previousTitle;
      setPrinting(false);
      window.removeEventListener("afterprint", cleanupPrintState);
    }

    setPrinting(true);
    document.title = pdfDocumentTitle;
    window.addEventListener("afterprint", cleanupPrintState);

    window.setTimeout(() => {
      window.print();
    }, 180);

    window.setTimeout(cleanupPrintState, 15000);
  }

  if (loading) {
    return (
      <main className="status-screen">
        <div className="status-card">
          <BrandMark />
          <div className="status-card__copy">
            <span>EXPOSÉ-GENERATOR</span>
            <h1>Exposé wird vorbereitet</h1>
            <p>Objektdaten, Texte und Bilder werden zusammengestellt.</p>
          </div>
          <div className="loading-track">
            <span />
          </div>
        </div>
        <ExposeStyles />
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="status-screen">
        <div className="status-card status-card--error">
          <BrandMark />
          <div className="status-card__copy">
            <span>EXPOSÉ-GENERATOR</span>
            <h1>Exposé nicht verfügbar</h1>
            <p>{error || "Das Objekt wurde nicht gefunden."}</p>
          </div>
          <button type="button" className="primary-button" onClick={goBack}>
            Zurück zum Makler-Cockpit
          </button>
        </div>
        <ExposeStyles />
      </main>
    );
  }

  const title = getExposeTitle(listing);
  const description = getDescription(listing);
  const place = [listing.postalCode, listing.location]
    .filter(Boolean)
    .join(" ");
  const creationDate = formatDate(listing.updatedAt || listing.createdAt);

  const featureItems = [
    listing.style ? `Stil: ${listing.style}` : "",
    ...highlights,
  ].filter(Boolean);

  return (
    <>
      <header className="preview-toolbar">
        <div className="preview-toolbar__card">
          <div className="preview-toolbar__middle">
            <span className="preview-status-dot" />

            <div className="preview-toolbar__copy">
              <span className="preview-toolbar__eyebrow">
                EXPOSÉ-BEREIT
              </span>
              <strong>Exposé-Vorschau</strong>
              <span className="preview-toolbar__meta">
                {listing.propertyType} · {place || listing.location}
              </span>
            </div>
          </div>

          <div className="preview-toolbar__actions">
            <button
              type="button"
              className="toolbar-button toolbar-button--ghost"
              onClick={goBack}
            >
              <span
                className="toolbar-button__back-icon"
                aria-hidden="true"
              >
                ←
              </span>
              Zurück
            </button>

            <button
              type="button"
              className="toolbar-button toolbar-button--primary"
              onClick={exportPdf}
              disabled={printing}
            >
              <span className="toolbar-button__icon" aria-hidden="true">
                ↓
              </span>
              {printing ? "PDF wird vorbereitet …" : "PDF speichern"}
            </button>
          </div>
        </div>
      </header>

      <main className="preview-canvas">
        <section className="sheet cover-sheet">
          <div className="sheet-orb sheet-orb--violet" />
          <div className="sheet-orb sheet-orb--orange" />
          <div className="sheet-grid" />

          <div className="cover-header">
            <BrandMark />
            <span className="status-pill">
              <span />
              {listing.archivedAt ? "ARCHIVIERT" : "AKTIVES OBJEKT"}
            </span>
          </div>

          <div className="cover-hero">
            <div className="cover-image-card">
              {primaryImage ? (
                <img src={primaryImage.url} alt={`Hauptbild: ${title}`} />
              ) : (
                <ImagePlaceholder />
              )}

              <div className="cover-image-card__overlay" />

              <div className="cover-image-card__badge">
                <span>01</span>
                <small>HAUPTBILD</small>
              </div>
            </div>

            <div className="cover-copy">
              <span className="section-kicker">
                <span />
                {listing.propertyType}
              </span>

              <h1>{title}</h1>

              <div className="location-line">
                <span className="location-line__pin" aria-hidden="true" />
                <span>{place || listing.location}</span>
              </div>
            </div>
          </div>

          <div className="cover-metrics">
            <MetricCard
              label="Zimmer"
              value={
                listing.rooms !== null && listing.rooms !== undefined
                  ? formatNumber(listing.rooms)
                  : "–"
              }
              accent="gold"
            />
            <MetricCard
              label="Wohnfläche"
              value={
                listing.livingArea !== null &&
                listing.livingArea !== undefined
                  ? `${formatNumber(listing.livingArea)} m²`
                  : "–"
              }
              accent="cyan"
            />
            <MetricCard
              label="Kaufpreis"
              value={formatPrice(listing.price)}
              accent="violet"
            />
          </div>

          <PageFooter page="01 / 04" date={creationDate} />
        </section>

        <section className="sheet gallery-sheet">
          <div className="sheet-orb sheet-orb--cyan" />
          <div className="sheet-grid" />

          <PageLabel
            number="02"
            eyebrow="OBJEKTBILDER"
            title="Galerie & Impressionen"
          />

          <div className="gallery-dashboard">
            <div className="gallery-main">
              {primaryImage ? (
                <img src={primaryImage.url} alt={`Objektansicht: ${title}`} />
              ) : (
                <ImagePlaceholder />
              )}

              <div className="gallery-card-label">
                <span>HAUPTAUFNAHME</span>
                <strong>{listing.location}</strong>
              </div>
            </div>

            <div className="gallery-side">
              {galleryImages.slice(0, 4).map((image, index) => (
                <div className="gallery-thumb" key={image.id}>
                  <img
                    src={image.url}
                    alt={`Objektbild ${index + 2}: ${title}`}
                  />
                  <span>{String(index + 2).padStart(2, "0")}</span>
                </div>
              ))}

              {galleryImages.length < 4 &&
                Array.from({ length: 4 - galleryImages.length }).map(
                  (_, index) => (
                    <div
                      className="gallery-thumb gallery-thumb--empty"
                      key={`placeholder-${index}`}
                    >
                      <ImagePlaceholder label="Weitere Aufnahme" />
                      <span>
                        {String(galleryImages.length + index + 2).padStart(
                          2,
                          "0"
                        )}
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>

          <div className="gallery-info-strip">
            <div>
              <span>OBJEKT</span>
              <strong>{listing.propertyType}</strong>
            </div>
            <div>
              <span>STANDORT</span>
              <strong>{place || listing.location}</strong>
            </div>
            <div>
              <span>BILDER</span>
              <strong>{sortedImages.length || "Noch keine"}</strong>
            </div>
          </div>

          <PageFooter page="02 / 04" />
        </section>

        <section className="sheet details-sheet">
          <div className="sheet-orb sheet-orb--violet" />
          <div className="sheet-grid" />

          <PageLabel
            number="03"
            eyebrow="OBJEKTPROFIL"
            title="Details & Beschreibung"
          />

          <div className="details-dashboard">
            <aside className="property-panel">
              <div className="property-panel__header">
                <span>OBJEKTDATEN</span>
                <strong>Alle Fakten auf einen Blick</strong>
              </div>

              <div className="property-stat-grid">
                <MetricCard
                  label="Objektart"
                  value={listing.propertyType}
                  accent="gold"
                />
                <MetricCard
                  label="Zimmer"
                  value={
                    listing.rooms !== null &&
                    listing.rooms !== undefined
                      ? formatNumber(listing.rooms)
                      : "–"
                  }
                  accent="cyan"
                />
                <MetricCard
                  label="Wohnfläche"
                  value={
                    listing.livingArea !== null &&
                    listing.livingArea !== undefined
                      ? `${formatNumber(listing.livingArea)} m²`
                      : "–"
                  }
                  accent="violet"
                />
                <MetricCard
                  label="Preis"
                  value={formatPrice(listing.price)}
                  accent="gold"
                />
              </div>

              <div className="property-location-card">
                <span className="property-location-card__icon" />
                <div>
                  <span>STANDORT</span>
                  <strong>{place || listing.location}</strong>
                </div>
              </div>
            </aside>

            <article className="description-panel">
              <div className="description-panel__top">
                <span className="section-kicker">
                  <span />
                  {listing.propertyType} · {listing.location}
                </span>

                <h2>{title}</h2>
              </div>

              <div className="description-text">
                {description
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 24)}-${index}`}>
                      {paragraph}
                    </p>
                  ))}
              </div>

              {listing.imageAnalysis && (
                <div className="ai-analysis-card">
                  <div className="ai-analysis-card__icon">AI</div>
                  <div>
                    <span>AI-BILDANALYSE</span>
                    <p>{listing.imageAnalysis}</p>
                  </div>
                </div>
              )}
            </article>
          </div>

          <PageFooter page="03 / 04" />
        </section>

        <section className="sheet final-sheet">
          <div className="sheet-orb sheet-orb--orange" />
          <div className="sheet-orb sheet-orb--cyan" />
          <div className="sheet-grid" />

          <PageLabel
            number="04"
            eyebrow="ABSCHLUSS"
            title="Highlights, Lage & Kontakt"
          />

          <div className="final-dashboard">
            <section className="feature-panel">
              <div className="panel-heading">
                <span className="panel-heading__icon">01</span>
                <div>
                  <span>HIGHLIGHTS</span>
                  <h3>Ausstattung & Vorteile</h3>
                </div>
              </div>

              {featureItems.length > 0 ? (
                <div className="feature-chip-grid">
                  {featureItems.slice(0, 10).map((item, index) => (
                    <div className="feature-chip" key={`${item}-${index}`}>
                      <span className="feature-chip__check">✓</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-panel">
                  <span>+</span>
                  <p>
                    Highlights können im Objekt ergänzt werden und erscheinen
                    anschliessend automatisch hier.
                  </p>
                </div>
              )}
            </section>

            <section className="location-panel">
              <div className="panel-heading">
                <span className="panel-heading__icon panel-heading__icon--cyan">
                  02
                </span>
                <div>
                  <span>LAGE</span>
                  <h3>{listing.location}</h3>
                </div>
              </div>

              <div className="location-visual">
                <span className="location-visual__ring location-visual__ring--one" />
                <span className="location-visual__ring location-visual__ring--two" />
                <span className="location-visual__pin" />
                <div>
                  <strong>{place || listing.location}</strong>
                  <span>Schweiz</span>
                </div>
              </div>

              <p>
                {listing.locationDescription ||
                  `Die Immobilie befindet sich in ${
                    place || listing.location
                  }. Die Lage verbindet ein angenehmes Wohnumfeld mit den vielfältigen Möglichkeiten der umliegenden Region.`}
              </p>
            </section>
          </div>

          <section className="contact-panel">
            <div className="contact-panel__glow" />

            <div className="contact-panel__intro">
              <span className="section-kicker">
                <span />
                PERSÖNLICHE BERATUNG
              </span>
              <h3>Interesse an dieser Immobilie?</h3>
              <p>
                Für weitere Informationen oder einen Besichtigungstermin stehen
                wir gerne zur Verfügung.
              </p>
            </div>

            <div className="contact-card">
              <div className="contact-avatar">
                {(contact.name || "IA")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="contact-card__main">
                <strong>{contact.name || "Ihre Ansprechperson"}</strong>
                <span>
                  {contact.company ||
                    "Kontaktdaten im Benutzerprofil ergänzen"}
                </span>
              </div>

              <div className="contact-card__details">
                <p>
                  <span>E-MAIL</span>
                  <strong>{contact.email || "Noch nicht hinterlegt"}</strong>
                </p>
                <p>
                  <span>TELEFON</span>
                  <strong>{contact.phone || "Noch nicht hinterlegt"}</strong>
                </p>
              </div>
            </div>
          </section>

          <div className="legal-note">
            Alle Angaben sind ohne Gewähr und vor Veröffentlichung durch den
            Anbieter zu prüfen.
          </div>

          <PageFooter page="04 / 04" />
        </section>
      </main>

      <ExposeStyles />
    </>
  );
}

function ExposeStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      html {
        background: ${PAGE_BACKGROUND};
      }

      body {
        margin: 0;
        color: ${TEXT};
        background:
          radial-gradient(
            circle at 18% 4%,
            rgba(85, 216, 255, 0.08),
            transparent 26%
          ),
          radial-gradient(
            circle at 86% 14%,
            rgba(107, 92, 255, 0.12),
            transparent 29%
          ),
          ${PAGE_BACKGROUND};
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      button {
        font: inherit;
      }

      .preview-toolbar {
        position: relative;
        z-index: 40;
        width: 100%;
        padding: 22px 28px 0;
        background: transparent;
      }

      .preview-toolbar__card {
        width: min(1180px, 100%);
        min-height: 84px;
        margin: 0 auto;
        padding: 14px 16px 14px 20px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 22px;
        overflow: hidden;
        background:
          radial-gradient(
            circle at 0% 50%,
            rgba(85, 216, 255, 0.09),
            transparent 28%
          ),
          linear-gradient(
            135deg,
            rgba(12, 25, 55, 0.96),
            rgba(7, 15, 35, 0.98)
          );
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 22px;
        box-shadow:
          0 22px 58px rgba(0, 0, 0, 0.32),
          0 0 0 1px rgba(245, 189, 33, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(22px);
      }

      .brand-mark {
        display: flex;
        align-items: center;
        gap: 13px;
      }

      .brand-mark__icon {
        position: relative;
        width: 44px;
        height: 44px;
        flex: 0 0 auto;
      }

      .brand-mark__roof {
        position: absolute;
        top: 5px;
        left: 10px;
        width: 24px;
        height: 24px;
        border-top: 3px solid ${GOLD};
        border-left: 3px solid ${GOLD};
        transform: rotate(45deg);
        border-radius: 2px;
      }

      .brand-mark__line {
        position: absolute;
        left: 12px;
        height: 2px;
        background: ${GOLD};
        border-radius: 999px;
        box-shadow: 0 0 10px rgba(245, 189, 33, 0.45);
      }

      .brand-mark__line--one {
        bottom: 12px;
        width: 20px;
      }

      .brand-mark__line--two {
        bottom: 7px;
        width: 15px;
      }

      .brand-mark__line--three {
        bottom: 2px;
        width: 9px;
      }

      .brand-mark__copy {
        display: grid;
        gap: 3px;
      }

      .brand-mark__copy strong {
        font-size: 16px;
        font-weight: 900;
        letter-spacing: -0.02em;
      }

      .brand-mark__copy small {
        color: ${MUTED};
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .brand-mark--compact {
        gap: 8px;
      }

      .brand-mark--compact .brand-mark__icon {
        width: 24px;
        height: 24px;
        transform: scale(0.58);
        transform-origin: left center;
        margin-right: -8px;
      }

      .brand-mark--compact .brand-mark__copy strong {
        font-size: 8px;
      }

      .brand-mark--compact .brand-mark__copy small {
        display: none;
      }

      .preview-toolbar__middle {
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 14px;
      }

      .preview-status-dot {
        width: 12px;
        height: 12px;
        flex: 0 0 auto;
        background: ${CYAN};
        border: 3px solid rgba(85, 216, 255, 0.18);
        border-radius: 50%;
        box-shadow:
          0 0 0 7px rgba(85, 216, 255, 0.05),
          0 0 20px rgba(85, 216, 255, 0.72);
      }

      .preview-toolbar__copy {
        min-width: 0;
        display: grid;
        gap: 2px;
        text-align: left;
      }

      .preview-toolbar__eyebrow {
        color: ${GOLD};
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.18em;
      }

      .preview-toolbar__copy strong {
        font-size: 15px;
        font-weight: 950;
        letter-spacing: -0.02em;
      }

      .preview-toolbar__meta {
        max-width: 100%;
        overflow: hidden;
        color: ${MUTED};
        font-size: 10px;
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .preview-toolbar__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .toolbar-button,
      .primary-button {
        min-height: 52px;
        padding: 0 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        border: 1px solid transparent;
        border-radius: 16px;
        cursor: pointer;
        font-weight: 950;
        letter-spacing: -0.01em;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          background 160ms ease,
          box-shadow 160ms ease,
          opacity 160ms ease;
      }

      .toolbar-button:hover,
      .primary-button:hover {
        transform: translateY(-2px);
      }

      .toolbar-button:disabled {
        cursor: wait;
        opacity: 0.65;
        transform: none;
      }

      .toolbar-button--ghost {
        color: #e9eef8;
        background:
          linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.075),
            rgba(255, 255, 255, 0.025)
          );
        border-color: rgba(255, 255, 255, 0.13);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.04),
          0 10px 24px rgba(0, 0, 0, 0.16);
      }

      .toolbar-button--ghost:hover {
        border-color: rgba(85, 216, 255, 0.34);
        background:
          linear-gradient(
            145deg,
            rgba(85, 216, 255, 0.1),
            rgba(255, 255, 255, 0.035)
          );
      }

      .toolbar-button--primary,
      .primary-button {
        color: #08101f;
        background:
          linear-gradient(135deg, #f5b914 0%, #ffd45f 58%, #f7b51a 100%);
        border-color: rgba(255, 255, 255, 0.28);
        box-shadow:
          0 14px 34px rgba(245, 185, 20, 0.23),
          inset 0 1px 0 rgba(255, 255, 255, 0.46);
      }

      .toolbar-button--primary:hover,
      .primary-button:hover {
        box-shadow:
          0 18px 42px rgba(245, 185, 20, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.5);
      }

      .toolbar-button__back-icon,
      .toolbar-button__icon {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 950;
      }

      .toolbar-button__back-icon {
        color: ${CYAN};
        background: rgba(85, 216, 255, 0.08);
        border: 1px solid rgba(85, 216, 255, 0.18);
      }

      .toolbar-button__icon {
        color: ${GOLD};
        background: ${NAVY};
        border: 1px solid rgba(5, 11, 29, 0.62);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .preview-canvas {
        width: 100%;
        padding: 38px 28px 80px;
        display: grid;
        justify-items: center;
        gap: 34px;
      }

      .sheet {
        position: relative;
        width: min(1180px, calc(100vw - 56px));
        min-height: 1080px;
        padding: 15mm;
        overflow: hidden;
        color: ${TEXT};
        background:
          linear-gradient(
            145deg,
            rgba(15, 29, 66, 0.97),
            rgba(5, 11, 29, 0.99)
          );
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 26px;
        box-shadow:
          0 35px 100px rgba(0, 0, 0, 0.42),
          0 0 0 1px rgba(85, 216, 255, 0.03);
      }

      .sheet-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0.055;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px),
          linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.4) 1px,
            transparent 1px
          );
        background-size: 22px 22px;
        mask-image: linear-gradient(to bottom, black, transparent 82%);
      }

      .sheet-orb {
        position: absolute;
        width: 120mm;
        height: 120mm;
        pointer-events: none;
        border-radius: 50%;
        filter: blur(36px);
        opacity: 0.18;
      }

      .sheet-orb--violet {
        top: -35mm;
        right: -42mm;
        background: ${VIOLET};
      }

      .sheet-orb--orange {
        right: -40mm;
        bottom: -44mm;
        background: ${ORANGE};
      }

      .sheet-orb--cyan {
        top: 30mm;
        left: -55mm;
        background: ${CYAN};
      }

      .cover-sheet {
        padding: 13mm 15mm 14mm;
      }

      .cover-header,
      .cover-hero,
      .cover-metrics,
      .sheet-footer,
      .page-label,
      .gallery-dashboard,
      .gallery-info-strip,
      .details-dashboard,
      .final-dashboard,
      .contact-panel,
      .legal-note {
        position: relative;
        z-index: 2;
      }

      .cover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .status-pill {
        min-height: 30px;
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: ${GOLD_SOFT};
        background: rgba(245, 189, 33, 0.08);
        border: 1px solid rgba(245, 189, 33, 0.34);
        border-radius: 999px;
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.15em;
      }

      .status-pill > span {
        width: 6px;
        height: 6px;
        background: ${GOLD};
        border-radius: 50%;
        box-shadow: 0 0 12px ${GOLD};
      }

      .cover-hero {
        margin-top: 10mm;
      }

      .cover-image-card {
        position: relative;
        height: 500px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(85, 216, 255, 0.17);
        border-radius: 7mm;
        box-shadow:
          0 20px 70px rgba(0, 0, 0, 0.34),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .cover-image-card img,
      .gallery-dashboard img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .cover-image-card__overlay {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(
            180deg,
            rgba(5, 11, 29, 0.02) 42%,
            rgba(5, 11, 29, 0.74) 100%
          );
        pointer-events: none;
      }

      .cover-image-card__badge {
        position: absolute;
        right: 6mm;
        bottom: 6mm;
        width: 20mm;
        height: 20mm;
        display: grid;
        place-content: center;
        gap: 1mm;
        color: ${TEXT};
        background: rgba(5, 11, 29, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 5mm;
        backdrop-filter: blur(12px);
        text-align: center;
      }

      .cover-image-card__badge span {
        color: ${GOLD};
        font-size: 16px;
        font-weight: 950;
      }

      .cover-image-card__badge small {
        color: ${MUTED};
        font-size: 5px;
        font-weight: 900;
        letter-spacing: 0.12em;
      }

      .cover-copy {
        margin-top: 8mm;
      }

      .section-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: ${GOLD};
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .section-kicker > span {
        width: 22px;
        height: 2px;
        background: linear-gradient(90deg, ${GOLD}, ${ORANGE});
        border-radius: 999px;
        box-shadow: 0 0 10px rgba(245, 189, 33, 0.5);
      }

      .cover-copy h1 {
        max-width: 160mm;
        margin: 4mm 0 3mm;
        font-size: clamp(29px, 4.5vw, 45px);
        font-weight: 900;
        letter-spacing: -0.055em;
        line-height: 1.03;
        text-wrap: balance;
      }

      .location-line {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #d8e1f2;
        font-size: 11px;
        font-weight: 700;
      }

      .location-line__pin {
        position: relative;
        width: 17px;
        height: 17px;
        border: 2px solid ${CYAN};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 0 12px rgba(85, 216, 255, 0.38);
      }

      .location-line__pin::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 5px;
        height: 5px;
        background: ${CYAN};
        border-radius: 50%;
      }

      .cover-metrics {
        margin-top: 8mm;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4mm;
      }

      .metric-card {
        position: relative;
        min-height: 28mm;
        padding: 6mm;
        display: grid;
        align-content: center;
        gap: 2mm;
        background:
          linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.075),
            rgba(255, 255, 255, 0.025)
          );
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 5mm;
        overflow: hidden;
      }

      .metric-card::before {
        content: "";
        position: absolute;
        right: -20%;
        bottom: -72%;
        width: 30mm;
        height: 30mm;
        border-radius: 50%;
        filter: blur(16px);
        opacity: 0.28;
      }

      .metric-card--gold::before {
        background: ${GOLD};
      }

      .metric-card--cyan::before {
        background: ${CYAN};
      }

      .metric-card--violet::before {
        background: ${VIOLET};
      }

      .metric-card__dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      .metric-card--gold .metric-card__dot {
        background: ${GOLD};
        box-shadow: 0 0 12px ${GOLD};
      }

      .metric-card--cyan .metric-card__dot {
        background: ${CYAN};
        box-shadow: 0 0 12px ${CYAN};
      }

      .metric-card--violet .metric-card__dot {
        background: #8d82ff;
        box-shadow: 0 0 12px #8d82ff;
      }

      .metric-card > span:not(.metric-card__dot) {
        color: ${MUTED};
        font-size: 6.5px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .metric-card strong {
        max-width: 100%;
        overflow-wrap: anywhere;
        font-size: 13px;
        font-weight: 950;
        line-height: 1.18;
      }

      .page-label {
        display: grid;
        grid-template-columns: 24mm 1fr;
        gap: 8mm;
        align-items: start;
      }

      .page-label__number {
        width: 18mm;
        height: 18mm;
        display: grid;
        place-items: center;
        color: ${GOLD};
        background:
          linear-gradient(
            145deg,
            rgba(245, 189, 33, 0.15),
            rgba(245, 189, 33, 0.04)
          );
        border: 1px solid rgba(245, 189, 33, 0.34);
        border-radius: 5mm;
        font-size: 16px;
        font-weight: 950;
        box-shadow: 0 0 24px rgba(245, 189, 33, 0.1);
      }

      .page-label__eyebrow,
      .panel-heading > div > span,
      .property-panel__header > span {
        color: ${CYAN};
        font-size: 7px;
        font-weight: 950;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .page-label h2 {
        margin: 2mm 0 0;
        font-size: 28px;
        font-weight: 950;
        letter-spacing: -0.04em;
      }

      .gallery-dashboard {
        height: 745px;
        margin-top: 11mm;
        display: grid;
        grid-template-columns: 1.25fr 0.75fr;
        gap: 4mm;
      }

      .gallery-main,
      .gallery-thumb {
        position: relative;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 6mm;
      }

      .gallery-main {
        box-shadow:
          0 22px 70px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(85, 216, 255, 0.035);
      }

      .gallery-card-label {
        position: absolute;
        right: 5mm;
        bottom: 5mm;
        left: 5mm;
        padding: 5mm;
        display: grid;
        gap: 1mm;
        background: rgba(5, 11, 29, 0.74);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 4mm;
        backdrop-filter: blur(16px);
      }

      .gallery-card-label span {
        color: ${GOLD};
        font-size: 6px;
        font-weight: 950;
        letter-spacing: 0.15em;
      }

      .gallery-card-label strong {
        font-size: 11px;
      }

      .gallery-side {
        display: grid;
        grid-template-rows: repeat(4, 1fr);
        gap: 4mm;
      }

      .gallery-thumb > span {
        position: absolute;
        top: 3mm;
        right: 3mm;
        width: 9mm;
        height: 9mm;
        display: grid;
        place-items: center;
        color: ${TEXT};
        background: rgba(5, 11, 29, 0.72);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 3mm;
        font-size: 7px;
        font-weight: 950;
      }

      .gallery-thumb--empty {
        border-style: dashed;
        border-color: rgba(85, 216, 255, 0.22);
      }

      .gallery-info-strip {
        margin-top: 6mm;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4mm;
        overflow: hidden;
      }

      .gallery-info-strip > div {
        min-height: 20mm;
        padding: 4mm 6mm;
        display: grid;
        align-content: center;
        gap: 1mm;
        background: rgba(255, 255, 255, 0.035);
        border-right: 1px solid rgba(255, 255, 255, 0.09);
      }

      .gallery-info-strip > div:last-child {
        border-right: 0;
      }

      .gallery-info-strip span {
        color: ${MUTED};
        font-size: 6px;
        font-weight: 900;
        letter-spacing: 0.13em;
      }

      .gallery-info-strip strong {
        font-size: 9px;
      }

      .image-placeholder {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 90px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 8px;
        overflow: hidden;
        color: ${TEXT};
        background:
          linear-gradient(
            145deg,
            rgba(85, 216, 255, 0.045),
            rgba(107, 92, 255, 0.065)
          );
        text-align: center;
      }

      .image-placeholder__glow {
        position: absolute;
        width: 60mm;
        height: 60mm;
        background: rgba(85, 216, 255, 0.12);
        border-radius: 50%;
        filter: blur(24px);
      }

      .image-placeholder__icon {
        position: relative;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        background:
          linear-gradient(
            145deg,
            rgba(245, 189, 33, 0.22),
            rgba(245, 189, 33, 0.08)
          );
        border: 1px solid rgba(245, 189, 33, 0.36);
        border-radius: 13px;
        box-shadow: 0 0 25px rgba(245, 189, 33, 0.11);
      }

      .image-placeholder__icon > span {
        width: 20px;
        height: 14px;
        border: 2px solid ${GOLD};
        border-radius: 4px;
      }

      .image-placeholder__icon > span::before {
        content: "";
        position: absolute;
        width: 5px;
        height: 5px;
        margin: 2px 0 0 2px;
        background: ${GOLD};
        border-radius: 50%;
      }

      .image-placeholder strong,
      .image-placeholder small {
        position: relative;
      }

      .image-placeholder strong {
        font-size: 8px;
      }

      .image-placeholder small {
        color: ${MUTED};
        font-size: 6px;
      }

      .details-dashboard {
        min-height: 760px;
        margin-top: 11mm;
        display: grid;
        grid-template-columns: 61mm 1fr;
        gap: 5mm;
      }

      .property-panel,
      .description-panel,
      .feature-panel,
      .location-panel {
        background:
          linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.065),
            rgba(255, 255, 255, 0.02)
          );
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 6mm;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
      }

      .property-panel {
        padding: 6mm;
      }

      .property-panel__header {
        display: grid;
        gap: 2mm;
      }

      .property-panel__header strong {
        font-size: 12px;
        line-height: 1.25;
      }

      .property-stat-grid {
        margin-top: 6mm;
        display: grid;
        gap: 3mm;
      }

      .property-stat-grid .metric-card {
        min-height: 27mm;
        padding: 4mm;
      }

      .property-stat-grid .metric-card strong {
        font-size: 10px;
      }

      .property-location-card {
        margin-top: 4mm;
        padding: 4mm;
        display: flex;
        align-items: center;
        gap: 3mm;
        background: rgba(85, 216, 255, 0.06);
        border: 1px solid rgba(85, 216, 255, 0.16);
        border-radius: 4mm;
      }

      .property-location-card__icon {
        width: 10mm;
        height: 10mm;
        flex: 0 0 auto;
        background: ${CYAN};
        border: 3px solid rgba(5, 11, 29, 0.85);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 0 18px rgba(85, 216, 255, 0.28);
      }

      .property-location-card > div {
        display: grid;
        gap: 1mm;
      }

      .property-location-card span {
        color: ${MUTED};
        font-size: 5.5px;
        font-weight: 900;
        letter-spacing: 0.12em;
      }

      .property-location-card strong {
        font-size: 8px;
      }

      .description-panel {
        padding: 8mm;
      }

      .description-panel__top h2 {
        margin: 4mm 0 7mm;
        font-size: 24px;
        font-weight: 950;
        letter-spacing: -0.045em;
        line-height: 1.07;
      }

      .description-text {
        color: #d9e2f2;
        font-size: 10px;
        line-height: 1.75;
      }

      .description-text p {
        margin: 0 0 4mm;
      }

      .ai-analysis-card {
        margin-top: 7mm;
        padding: 5mm;
        display: grid;
        grid-template-columns: 13mm 1fr;
        gap: 4mm;
        background:
          linear-gradient(
            135deg,
            rgba(107, 92, 255, 0.13),
            rgba(85, 216, 255, 0.07)
          );
        border: 1px solid rgba(107, 92, 255, 0.24);
        border-radius: 4mm;
      }

      .ai-analysis-card__icon {
        width: 13mm;
        height: 13mm;
        display: grid;
        place-items: center;
        color: ${TEXT};
        background: linear-gradient(135deg, ${VIOLET}, #8b7fff);
        border-radius: 4mm;
        font-size: 8px;
        font-weight: 950;
        box-shadow: 0 0 20px rgba(107, 92, 255, 0.24);
      }

      .ai-analysis-card > div:last-child {
        display: grid;
        gap: 2mm;
      }

      .ai-analysis-card span {
        color: #a89fff;
        font-size: 6px;
        font-weight: 950;
        letter-spacing: 0.13em;
      }

      .ai-analysis-card p {
        margin: 0;
        color: #cbd5e7;
        font-size: 8px;
        line-height: 1.55;
      }

      .final-dashboard {
        margin-top: 10mm;
        display: grid;
        grid-template-columns: 1.08fr 0.92fr;
        gap: 5mm;
      }

      .feature-panel,
      .location-panel {
        min-height: 116mm;
        padding: 7mm;
      }

      .panel-heading {
        display: flex;
        align-items: center;
        gap: 4mm;
      }

      .panel-heading__icon {
        width: 13mm;
        height: 13mm;
        display: grid;
        place-items: center;
        color: #111827;
        background: linear-gradient(135deg, ${GOLD}, ${GOLD_SOFT});
        border-radius: 4mm;
        font-size: 8px;
        font-weight: 950;
        box-shadow: 0 0 20px rgba(245, 189, 33, 0.15);
      }

      .panel-heading__icon--cyan {
        background: linear-gradient(135deg, ${CYAN}, #9ceaff);
      }

      .panel-heading > div {
        display: grid;
        gap: 1mm;
      }

      .panel-heading h3 {
        margin: 0;
        font-size: 15px;
      }

      .feature-chip-grid {
        margin-top: 7mm;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3mm;
      }

      .feature-chip {
        min-height: 19mm;
        padding: 3mm;
        display: grid;
        grid-template-columns: 8mm 1fr;
        gap: 2mm;
        align-items: center;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 3.5mm;
      }

      .feature-chip__check {
        width: 8mm;
        height: 8mm;
        display: grid;
        place-items: center;
        color: #081323;
        background: ${GOLD};
        border-radius: 50%;
        font-size: 6px;
        font-weight: 950;
        box-shadow: 0 0 12px rgba(245, 189, 33, 0.25);
      }

      .feature-chip p {
        margin: 0;
        color: #e2e8f5;
        font-size: 7px;
        font-weight: 700;
        line-height: 1.3;
      }

      .empty-panel {
        min-height: 72mm;
        margin-top: 7mm;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 4mm;
        padding: 8mm;
        color: ${MUTED};
        background: rgba(255, 255, 255, 0.025);
        border: 1px dashed rgba(255, 255, 255, 0.14);
        border-radius: 4mm;
        text-align: center;
      }

      .empty-panel > span {
        width: 12mm;
        height: 12mm;
        display: grid;
        place-items: center;
        color: ${GOLD};
        background: rgba(245, 189, 33, 0.09);
        border: 1px solid rgba(245, 189, 33, 0.24);
        border-radius: 50%;
        font-size: 18px;
      }

      .empty-panel p {
        max-width: 55mm;
        margin: 0;
        font-size: 8px;
        line-height: 1.5;
      }

      .location-visual {
        position: relative;
        height: 52mm;
        margin-top: 7mm;
        display: grid;
        place-content: center;
        justify-items: center;
        overflow: hidden;
        background:
          radial-gradient(
            circle at center,
            rgba(85, 216, 255, 0.12),
            transparent 55%
          ),
          rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(85, 216, 255, 0.12);
        border-radius: 4mm;
      }

      .location-visual__ring {
        position: absolute;
        border: 1px solid rgba(85, 216, 255, 0.18);
        border-radius: 50%;
      }

      .location-visual__ring--one {
        width: 42mm;
        height: 42mm;
      }

      .location-visual__ring--two {
        width: 28mm;
        height: 28mm;
      }

      .location-visual__pin {
        position: relative;
        z-index: 2;
        width: 10mm;
        height: 10mm;
        background: ${CYAN};
        border: 3px solid ${NAVY};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow:
          0 0 0 6px rgba(85, 216, 255, 0.1),
          0 0 24px rgba(85, 216, 255, 0.4);
      }

      .location-visual > div {
        position: relative;
        z-index: 2;
        margin-top: 4mm;
        display: grid;
        gap: 1mm;
        text-align: center;
      }

      .location-visual strong {
        font-size: 10px;
      }

      .location-visual > div > span {
        color: ${MUTED};
        font-size: 6px;
      }

      .location-panel > p {
        margin: 6mm 0 0;
        color: #c8d3e7;
        font-size: 8px;
        line-height: 1.55;
      }

      .contact-panel {
        position: relative;
        min-height: 72mm;
        margin-top: 6mm;
        padding: 7mm;
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        gap: 7mm;
        align-items: center;
        overflow: hidden;
        background:
          linear-gradient(
            125deg,
            rgba(107, 92, 255, 0.18),
            rgba(85, 216, 255, 0.08)
          );
        border: 1px solid rgba(107, 92, 255, 0.24);
        border-radius: 6mm;
      }

      .contact-panel__glow {
        position: absolute;
        right: -24mm;
        bottom: -30mm;
        width: 70mm;
        height: 70mm;
        background: ${ORANGE};
        border-radius: 50%;
        filter: blur(30px);
        opacity: 0.15;
      }

      .contact-panel__intro {
        position: relative;
        z-index: 2;
      }

      .contact-panel__intro h3 {
        margin: 3mm 0;
        font-size: 20px;
        line-height: 1.05;
      }

      .contact-panel__intro p {
        max-width: 75mm;
        margin: 0;
        color: #c8d3e7;
        font-size: 8px;
        line-height: 1.5;
      }

      .contact-card {
        position: relative;
        z-index: 2;
        padding: 5mm;
        display: grid;
        grid-template-columns: 13mm 1fr;
        gap: 4mm;
        background: rgba(5, 11, 29, 0.58);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 5mm;
        backdrop-filter: blur(18px);
      }

      .contact-avatar {
        width: 13mm;
        height: 13mm;
        display: grid;
        place-items: center;
        color: #07111f;
        background: linear-gradient(135deg, ${GOLD}, ${GOLD_SOFT});
        border-radius: 4mm;
        font-size: 8px;
        font-weight: 950;
      }

      .contact-card__main {
        display: grid;
        align-content: center;
        gap: 1mm;
      }

      .contact-card__main strong {
        font-size: 10px;
      }

      .contact-card__main span {
        color: ${GOLD};
        font-size: 6.5px;
      }

      .contact-card__details {
        grid-column: 1 / 3;
        padding-top: 4mm;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3mm;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .contact-card__details p {
        margin: 0;
        display: grid;
        gap: 1mm;
      }

      .contact-card__details span {
        color: ${MUTED};
        font-size: 5.5px;
        font-weight: 900;
        letter-spacing: 0.12em;
      }

      .contact-card__details strong {
        overflow-wrap: anywhere;
        font-size: 7px;
      }

      .legal-note {
        margin-top: 4mm;
        color: #70809d;
        font-size: 6px;
        line-height: 1.4;
        text-align: center;
      }

      .sheet-footer {
        position: absolute;
        right: 15mm;
        bottom: 8mm;
        left: 15mm;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .sheet-footer__meta {
        display: flex;
        align-items: center;
        gap: 5mm;
      }

      .sheet-footer__meta span {
        color: ${MUTED};
        font-size: 6px;
        font-weight: 700;
      }

      .sheet-footer__meta strong {
        color: ${GOLD};
        font-size: 7px;
        letter-spacing: 0.14em;
      }

      .status-screen {
        min-height: 100vh;
        padding: 24px;
        display: grid;
        place-items: center;
        background:
          radial-gradient(
            circle at 22% 16%,
            rgba(85, 216, 255, 0.12),
            transparent 27%
          ),
          radial-gradient(
            circle at 82% 80%,
            rgba(255, 122, 26, 0.14),
            transparent 28%
          ),
          ${PAGE_BACKGROUND};
      }

      .status-card {
        position: relative;
        width: min(500px, 100%);
        padding: 34px;
        display: grid;
        gap: 28px;
        overflow: hidden;
        background:
          linear-gradient(
            145deg,
            rgba(16, 29, 66, 0.95),
            rgba(5, 11, 29, 0.98)
          );
        border: 1px solid rgba(245, 189, 33, 0.28);
        border-radius: 24px;
        box-shadow:
          0 30px 90px rgba(0, 0, 0, 0.4),
          0 0 45px rgba(245, 189, 33, 0.07);
      }

      .status-card__copy {
        display: grid;
        gap: 8px;
      }

      .status-card__copy > span {
        color: ${CYAN};
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.18em;
      }

      .status-card h1,
      .status-card p {
        margin: 0;
      }

      .status-card h1 {
        font-size: 28px;
      }

      .status-card p {
        color: ${MUTED};
        line-height: 1.55;
      }

      .loading-track {
        height: 5px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 999px;
      }

      .loading-track span {
        width: 42%;
        height: 100%;
        display: block;
        background: linear-gradient(90deg, ${CYAN}, ${GOLD}, ${ORANGE});
        border-radius: inherit;
        animation: loading 1.2s ease-in-out infinite alternate;
        box-shadow: 0 0 16px rgba(85, 216, 255, 0.35);
      }

      @keyframes loading {
        from {
          transform: translateX(-10%);
        }

        to {
          transform: translateX(155%);
        }
      }

      @media (max-width: 850px) {
        .preview-toolbar {
          padding: 14px 10px 0;
        }

        .preview-toolbar__card {
          grid-template-columns: 1fr;
          gap: 14px;
          padding: 16px;
          border-radius: 18px;
        }

        .preview-toolbar__middle {
          display: flex;
        }

        .preview-toolbar__actions {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
        }

        .toolbar-button {
          width: 100%;
        }

        .preview-canvas {
          padding: 18px 8px 50px;
          gap: 18px;
        }

        .sheet {
          width: calc(100vw - 16px);
          min-height: auto;
          padding: 28px 22px 72px;
          border-radius: 0;
        }

        .cover-sheet {
          padding: 24px 20px 72px;
        }

        .cover-header {
          align-items: flex-start;
          gap: 14px;
        }

        .cover-header .brand-mark__copy small {
          display: none;
        }

        .cover-image-card {
          height: 58vw;
          min-height: 260px;
          border-radius: 22px;
        }

        .cover-copy h1 {
          font-size: 34px;
        }

        .cover-metrics {
          grid-template-columns: 1fr;
        }

        .page-label {
          grid-template-columns: auto 1fr;
        }

        .gallery-dashboard {
          height: auto;
          grid-template-columns: 1fr;
        }

        .gallery-main {
          height: 62vw;
          min-height: 280px;
        }

        .gallery-side {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto;
        }

        .gallery-thumb {
          height: 38vw;
          min-height: 150px;
        }

        .gallery-info-strip {
          grid-template-columns: 1fr;
        }

        .gallery-info-strip > div {
          border-right: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .details-dashboard {
          min-height: auto;
          grid-template-columns: 1fr;
        }

        .property-stat-grid {
          grid-template-columns: 1fr 1fr;
        }

        .final-dashboard,
        .contact-panel {
          grid-template-columns: 1fr;
        }

        .feature-panel,
        .location-panel {
          min-height: auto;
        }

        .sheet-footer {
          right: 22px;
          bottom: 22px;
          left: 22px;
        }
      }

      @page {
        size: A4;
        margin: 0;
      }

      @media print {
        html,
        body {
          width: 210mm;
          margin: 0;
          background: ${PAGE_BACKGROUND} !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
        }

        .siteNavbar,
        .appCentralNavbar,
        .appMenuOverlay,
        .appMenuDrawer,
        .preview-toolbar {
          display: none !important;
        }

        .preview-canvas {
          width: 210mm;
          padding: 0;
          display: block;
          background: ${PAGE_BACKGROUND};
        }

        .sheet {
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          margin: 0;
          padding: 15mm;
          border: 0;
          border-radius: 0;
          page-break-after: always;
          break-after: page;
          box-shadow: none;
        }

        .sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        .cover-sheet {
          padding: 13mm 15mm 14mm;
        }

        .cover-image-card {
          height: 121mm;
        }

        .gallery-dashboard {
          height: 191mm;
        }

        .details-dashboard {
          min-height: 214mm;
        }

        .cover-header {
          align-items: center;
        }

        .cover-header .brand-mark__copy small {
          display: block;
        }

        .cover-metrics {
          grid-template-columns: repeat(3, 1fr) !important;
        }

        .gallery-dashboard {
          height: 191mm !important;
          min-height: 0 !important;
          grid-template-columns: 1.25fr 0.75fr !important;
        }

        .gallery-main,
        .gallery-thumb {
          height: auto !important;
          min-height: 0 !important;
        }

        .gallery-side {
          height: 100% !important;
          min-height: 0 !important;
          grid-template-columns: 1fr !important;
          grid-template-rows: repeat(4, minmax(0, 1fr)) !important;
        }

        .gallery-thumb {
          overflow: hidden !important;
        }

        .gallery-info-strip {
          grid-template-columns: repeat(3, 1fr) !important;
        }

        .gallery-info-strip > div {
          border-right: 1px solid rgba(255, 255, 255, 0.09) !important;
          border-bottom: 0 !important;
        }

        .gallery-info-strip > div:last-child {
          border-right: 0 !important;
        }

        .details-dashboard {
          grid-template-columns: 61mm 1fr !important;
        }

        .property-stat-grid {
          grid-template-columns: 1fr !important;
        }

        .final-dashboard {
          grid-template-columns: 1.08fr 0.92fr !important;
        }

        .contact-panel {
          grid-template-columns: 0.9fr 1.1fr !important;
        }

        .feature-panel,
        .location-panel {
          min-height: 116mm !important;
        }
      }
    `}</style>
  );
}
