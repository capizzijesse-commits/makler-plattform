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

type TextVariant = {
  title?: string;
  text?: string;
  description?: string;
  content?: string;
};

const NAVY = "#07182f";
const NAVY_SOFT = "#102746";
const GOLD = "#c9a454";
const PAPER = "#ffffff";
const INK = "#172033";
const MUTED = "#657187";
const PAGE_BACKGROUND = "#e9edf3";

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

function ImagePlaceholder({
  label = "Noch kein Objektbild vorhanden",
}: {
  label?: string;
}) {
  return (
    <div className="image-placeholder">
      <div className="image-placeholder__mark">IA</div>
      <span>{label}</span>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <div aria-hidden="true" />
    </div>
  );
}

function DataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="data-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
    setContact(getInitialContact());
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

    loadListing();

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

    router.push("/dashboard");
  }

  function exportPdf() {
    setPrinting(true);

    window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  }

  if (loading) {
    return (
      <main className="status-screen">
        <div className="status-card">
          <div className="status-logo">IA</div>
          <p>Exposé wird vorbereitet …</p>
          <div className="loading-line" />
        </div>
        <ExposeStyles />
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="status-screen">
        <div className="status-card status-card--error">
          <div className="status-logo">IA</div>
          <h1>Exposé nicht verfügbar</h1>
          <p>{error || "Das Objekt wurde nicht gefunden."}</p>
          <button type="button" onClick={goBack}>
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
        <div className="preview-toolbar__brand">
          <div className="preview-toolbar__logo">IA</div>
          <div>
            <strong>Inserat-AI</strong>
            <span>Exposé-Vorschau</span>
          </div>
        </div>

        <div className="preview-toolbar__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={goBack}
          >
            Zurück
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={exportPdf}
            disabled={printing}
          >
            {printing ? "PDF wird vorbereitet …" : "Als PDF speichern"}
          </button>
        </div>
      </header>

      <main className="preview-canvas">
        <section className="sheet cover-sheet">
          <div className="cover-topline">
            <div className="cover-brand">
              <div className="cover-brand__logo">IA</div>
              <div>
                <strong>INSERAT-AI</strong>
                <span>IMMOBILIEN-EXPOSÉ</span>
              </div>
            </div>
            <span className="cover-status">
              {listing.archivedAt ? "ARCHIVIERT" : "EXKLUSIV"}
            </span>
          </div>

          <div className="cover-image">
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt={`Hauptbild: ${title}`}
              />
            ) : (
              <ImagePlaceholder />
            )}
            <div className="cover-image__overlay" />
            <div className="cover-image__index">01</div>
          </div>

          <div className="cover-copy">
            <div className="cover-kicker">{listing.propertyType}</div>
            <h1>{title}</h1>
            <p>{place}</p>
          </div>

          <div className="cover-facts">
            <DataItem
              label="Zimmer"
              value={
                listing.rooms !== null && listing.rooms !== undefined
                  ? formatNumber(listing.rooms)
                  : "–"
              }
            />
            <DataItem
              label="Wohnfläche"
              value={
                listing.livingArea !== null &&
                listing.livingArea !== undefined
                  ? `${formatNumber(listing.livingArea)} m²`
                  : "–"
              }
            />
            <DataItem label="Kaufpreis" value={formatPrice(listing.price)} />
          </div>

          <footer className="sheet-footer sheet-footer--cover">
            <span>Professionell erstellt mit Inserat-AI</span>
            <span>{creationDate}</span>
          </footer>
        </section>

        <section className="sheet gallery-sheet">
          <div className="page-header">
            <div className="page-header__brand">
              <span>INSERAT-AI</span>
              <strong>02</strong>
            </div>
            <SectionTitle
              eyebrow="Impressionen"
              title="Bildergalerie"
            />
          </div>

          <div className="gallery-grid">
            <div className="gallery-feature">
              {primaryImage ? (
                <img
                  src={primaryImage.url}
                  alt={`Objektansicht: ${title}`}
                />
              ) : (
                <ImagePlaceholder />
              )}
            </div>

            {galleryImages.slice(0, 4).map((image, index) => (
              <div className="gallery-tile" key={image.id}>
                <img
                  src={image.url}
                  alt={`Objektbild ${index + 2}: ${title}`}
                />
              </div>
            ))}

            {galleryImages.length < 4 &&
              Array.from({ length: 4 - galleryImages.length }).map(
                (_, index) => (
                  <div
                    className="gallery-tile"
                    key={`placeholder-${index}`}
                  >
                    <ImagePlaceholder label="Weitere Aufnahme" />
                  </div>
                )
              )}
          </div>

          <div className="gallery-caption">
            <span>{listing.propertyType}</span>
            <p>{place}</p>
          </div>

          <footer className="sheet-footer">
            <span>Inserat-AI Immobilien-Exposé</span>
            <span>02</span>
          </footer>
        </section>

        <section className="sheet details-sheet">
          <div className="page-header">
            <div className="page-header__brand">
              <span>INSERAT-AI</span>
              <strong>03</strong>
            </div>
            <SectionTitle
              eyebrow="Das Objekt"
              title="Details & Beschreibung"
            />
          </div>

          <div className="details-layout">
            <aside className="details-sidebar">
              <h3>Objektdaten</h3>

              <div className="details-list">
                <DataItem
                  label="Objektart"
                  value={listing.propertyType}
                />
                <DataItem label="Ort" value={place || listing.location} />
                <DataItem
                  label="Zimmer"
                  value={
                    listing.rooms !== null &&
                    listing.rooms !== undefined
                      ? formatNumber(listing.rooms)
                      : "Nicht angegeben"
                  }
                />
                <DataItem
                  label="Wohnfläche"
                  value={
                    listing.livingArea !== null &&
                    listing.livingArea !== undefined
                      ? `${formatNumber(listing.livingArea)} m²`
                      : "Nicht angegeben"
                  }
                />
                <DataItem
                  label="Preis"
                  value={formatPrice(listing.price)}
                />
              </div>

              <div className="sidebar-accent">
                <span>INSERAT-AI</span>
                <strong>Immobilien überzeugend präsentieren.</strong>
              </div>
            </aside>

            <article className="description-column">
              <span className="article-kicker">
                {listing.propertyType} · {listing.location}
              </span>
              <h2>{title}</h2>

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
                <div className="analysis-note">
                  <span>Bildwirkung</span>
                  <p>{listing.imageAnalysis}</p>
                </div>
              )}
            </article>
          </div>

          <footer className="sheet-footer">
            <span>Inserat-AI Immobilien-Exposé</span>
            <span>03</span>
          </footer>
        </section>

        <section className="sheet final-sheet">
          <div className="page-header">
            <div className="page-header__brand">
              <span>INSERAT-AI</span>
              <strong>04</strong>
            </div>
            <SectionTitle
              eyebrow="Mehr erfahren"
              title="Highlights, Lage & Kontakt"
            />
          </div>

          <div className="final-grid">
            <section className="content-card">
              <span className="content-card__number">01</span>
              <h3>Highlights & Ausstattung</h3>

              {featureItems.length > 0 ? (
                <ul className="highlight-list">
                  {featureItems.slice(0, 10).map((item) => (
                    <li key={item}>
                      <span aria-hidden="true">◆</span>
                      <p>{item}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-copy">
                  Ausstattungsmerkmale können im Objekt ergänzt werden und
                  erscheinen danach automatisch an dieser Stelle.
                </p>
              )}
            </section>

            <section className="content-card">
              <span className="content-card__number">02</span>
              <h3>Lage</h3>
              <p className="location-copy">
                Die Immobilie befindet sich in{" "}
                <strong>{place || listing.location}</strong>. Die genaue
                Adresse sowie zusätzliche Angaben zur Mikrolage,
                Erreichbarkeit und Umgebung können im nächsten Ausbauschritt
                ergänzt oder automatisch generiert werden.
              </p>

              <div className="location-mark">
                <span>Standort</span>
                <strong>{listing.location}</strong>
                {listing.postalCode && <small>{listing.postalCode}</small>}
              </div>
            </section>
          </div>

          <section className="contact-panel">
            <div className="contact-panel__intro">
              <span>Persönliche Beratung</span>
              <h3>Interesse an dieser Immobilie?</h3>
              <p>
                Für weitere Informationen, Unterlagen oder einen
                Besichtigungstermin stehen wir gerne zur Verfügung.
              </p>
            </div>

            <div className="contact-panel__details">
              <strong>
                {contact.name || "Ihre Ansprechperson"}
              </strong>
              <span>
                {contact.company ||
                  "Kontaktdaten im Benutzerprofil ergänzen"}
              </span>

              <div className="contact-lines">
                <p>
                  <small>E-Mail</small>
                  {contact.email || "Noch nicht hinterlegt"}
                </p>
                <p>
                  <small>Telefon</small>
                  {contact.phone || "Noch nicht hinterlegt"}
                </p>
              </div>
            </div>
          </section>

          <div className="legal-note">
            Dieses Exposé wurde auf Grundlage der gespeicherten Objektdaten
            erstellt. Alle Angaben sind ohne Gewähr und vom Anbieter vor der
            Veröffentlichung zu prüfen.
          </div>

          <footer className="sheet-footer">
            <span>Inserat-AI Immobilien-Exposé</span>
            <span>04</span>
          </footer>
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
        color: ${INK};
        background: ${PAGE_BACKGROUND};
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      button,
      input,
      textarea,
      select {
        font: inherit;
      }

      .preview-toolbar {
        position: sticky;
        top: 0;
        z-index: 50;
        min-height: 76px;
        padding: 12px clamp(16px, 4vw, 48px);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        color: #ffffff;
        background:
          linear-gradient(
            90deg,
            rgba(7, 24, 47, 0.98),
            rgba(16, 39, 70, 0.98)
          );
        border-bottom: 1px solid rgba(201, 164, 84, 0.48);
        box-shadow: 0 16px 40px rgba(7, 24, 47, 0.18);
        backdrop-filter: blur(18px);
      }

      .preview-toolbar__brand,
      .preview-toolbar__actions {
        display: flex;
        align-items: center;
      }

      .preview-toolbar__brand {
        gap: 12px;
      }

      .preview-toolbar__brand > div:last-child {
        display: grid;
        gap: 2px;
      }

      .preview-toolbar__brand strong {
        font-size: 15px;
        letter-spacing: 0.1em;
      }

      .preview-toolbar__brand span {
        color: rgba(255, 255, 255, 0.66);
        font-size: 12px;
      }

      .preview-toolbar__logo,
      .status-logo {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        color: ${NAVY};
        background: ${GOLD};
        border-radius: 11px;
        font-weight: 950;
        letter-spacing: -0.04em;
        box-shadow: 0 8px 22px rgba(201, 164, 84, 0.24);
      }

      .preview-toolbar__actions {
        gap: 10px;
      }

      .button,
      .status-card button {
        min-height: 44px;
        padding: 0 18px;
        border-radius: 11px;
        border: 1px solid transparent;
        cursor: pointer;
        font-weight: 800;
        transition:
          transform 160ms ease,
          opacity 160ms ease,
          border-color 160ms ease;
      }

      .button:hover,
      .status-card button:hover {
        transform: translateY(-1px);
      }

      .button:disabled {
        cursor: wait;
        opacity: 0.7;
      }

      .button--primary,
      .status-card button {
        color: ${NAVY};
        background: ${GOLD};
        border-color: ${GOLD};
      }

      .button--secondary {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.22);
      }

      .preview-canvas {
        width: 100%;
        padding: 36px 16px 72px;
        display: grid;
        justify-items: center;
        gap: 32px;
      }

      .sheet {
        position: relative;
        width: min(210mm, calc(100vw - 32px));
        min-height: 297mm;
        padding: 18mm;
        overflow: hidden;
        color: ${INK};
        background: ${PAPER};
        box-shadow: 0 26px 80px rgba(7, 24, 47, 0.14);
      }

      .cover-sheet {
        display: flex;
        flex-direction: column;
        padding: 0;
        color: #ffffff;
        background: ${NAVY};
      }

      .cover-topline {
        height: 30mm;
        padding: 0 17mm;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .cover-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .cover-brand__logo {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        color: ${NAVY};
        background: ${GOLD};
        border-radius: 10px;
        font-weight: 950;
      }

      .cover-brand > div:last-child {
        display: grid;
        gap: 4px;
      }

      .cover-brand strong {
        font-size: 13px;
        letter-spacing: 0.18em;
      }

      .cover-brand span {
        color: rgba(255, 255, 255, 0.54);
        font-size: 8px;
        letter-spacing: 0.23em;
      }

      .cover-status {
        padding: 7px 11px;
        color: ${GOLD};
        border: 1px solid rgba(201, 164, 84, 0.55);
        border-radius: 999px;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.19em;
      }

      .cover-image {
        position: relative;
        height: 133mm;
        overflow: hidden;
        background: ${NAVY_SOFT};
      }

      .cover-image img,
      .gallery-grid img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .cover-image__overlay {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(
            180deg,
            rgba(7, 24, 47, 0.06) 38%,
            rgba(7, 24, 47, 0.78) 100%
          );
      }

      .cover-image__index {
        position: absolute;
        right: 15mm;
        bottom: 11mm;
        color: rgba(255, 255, 255, 0.58);
        font-family: Georgia, serif;
        font-size: 24px;
      }

      .cover-copy {
        min-height: 79mm;
        padding: 15mm 17mm 11mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        background:
          radial-gradient(
            circle at 86% 16%,
            rgba(201, 164, 84, 0.12),
            transparent 31%
          );
      }

      .cover-kicker,
      .article-kicker {
        color: ${GOLD};
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .cover-copy h1 {
        max-width: 155mm;
        margin: 7mm 0 4mm;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(32px, 5vw, 52px);
        font-weight: 500;
        line-height: 1.05;
        text-wrap: balance;
      }

      .cover-copy p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        letter-spacing: 0.05em;
      }

      .cover-facts {
        min-height: 37mm;
        margin: 0 17mm;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-top: 1px solid rgba(201, 164, 84, 0.42);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .cover-facts .data-item {
        padding: 9mm 7mm;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
      }

      .cover-facts .data-item:first-child {
        padding-left: 0;
      }

      .cover-facts .data-item:last-child {
        border-right: 0;
      }

      .cover-facts .data-item span {
        color: rgba(255, 255, 255, 0.48);
      }

      .cover-facts .data-item strong {
        color: #ffffff;
      }

      .sheet-footer {
        position: absolute;
        right: 18mm;
        bottom: 10mm;
        left: 18mm;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        color: #8a94a7;
        font-size: 7.5px;
        font-weight: 800;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .sheet-footer--cover {
        position: static;
        min-height: 18mm;
        margin-top: auto;
        padding: 0 17mm;
        align-items: center;
        color: rgba(255, 255, 255, 0.38);
      }

      .page-header {
        display: grid;
        grid-template-columns: 32mm 1fr;
        gap: 10mm;
        align-items: start;
        margin-bottom: 13mm;
      }

      .page-header__brand {
        display: grid;
        gap: 3mm;
      }

      .page-header__brand span {
        color: ${NAVY};
        font-size: 8px;
        font-weight: 950;
        letter-spacing: 0.18em;
      }

      .page-header__brand strong {
        color: rgba(7, 24, 47, 0.16);
        font-family: Georgia, serif;
        font-size: 34px;
        font-weight: 500;
      }

      .section-heading span {
        color: ${GOLD};
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .section-heading h2 {
        margin: 2mm 0 3mm;
        color: ${NAVY};
        font-family: Georgia, "Times New Roman", serif;
        font-size: 29px;
        font-weight: 500;
      }

      .section-heading > div {
        width: 18mm;
        height: 1px;
        background: ${GOLD};
      }

      .gallery-grid {
        height: 200mm;
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        grid-template-rows: repeat(4, 1fr);
        gap: 4mm;
      }

      .gallery-feature {
        grid-row: 1 / 5;
      }

      .gallery-feature,
      .gallery-tile {
        overflow: hidden;
        background: #edf1f5;
      }

      .gallery-caption {
        margin-top: 9mm;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-top: 1px solid #dfe4ec;
        padding-top: 5mm;
      }

      .gallery-caption span {
        color: ${GOLD};
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .gallery-caption p {
        margin: 0;
        color: ${MUTED};
        font-size: 11px;
      }

      .image-placeholder {
        width: 100%;
        height: 100%;
        min-height: 80px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 10px;
        color: #7a879b;
        background:
          linear-gradient(135deg, #eef2f6, #dfe6ed);
        text-align: center;
        font-size: 10px;
        font-weight: 700;
      }

      .image-placeholder__mark {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        color: ${NAVY};
        background: rgba(201, 164, 84, 0.72);
        border-radius: 10px;
        font-weight: 950;
      }

      .details-layout {
        min-height: 216mm;
        display: grid;
        grid-template-columns: 55mm 1fr;
        gap: 14mm;
      }

      .details-sidebar {
        position: relative;
        padding: 9mm 7mm;
        color: #ffffff;
        background: ${NAVY};
      }

      .details-sidebar h3 {
        margin: 0 0 8mm;
        color: ${GOLD};
        font-family: Georgia, serif;
        font-size: 18px;
        font-weight: 500;
      }

      .details-list {
        display: grid;
      }

      .details-list .data-item {
        padding: 5mm 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }

      .details-list .data-item span {
        color: rgba(255, 255, 255, 0.48);
      }

      .details-list .data-item strong {
        color: #ffffff;
        font-size: 11px;
      }

      .data-item {
        display: grid;
        gap: 2mm;
      }

      .data-item span {
        color: ${MUTED};
        font-size: 7.5px;
        font-weight: 900;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      .data-item strong {
        color: ${NAVY};
        font-size: 13px;
        line-height: 1.25;
      }

      .sidebar-accent {
        position: absolute;
        right: 7mm;
        bottom: 9mm;
        left: 7mm;
        display: grid;
        gap: 3mm;
      }

      .sidebar-accent span {
        color: ${GOLD};
        font-size: 7px;
        font-weight: 900;
        letter-spacing: 0.16em;
      }

      .sidebar-accent strong {
        color: rgba(255, 255, 255, 0.7);
        font-family: Georgia, serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.35;
      }

      .description-column {
        padding-top: 3mm;
      }

      .description-column h2 {
        margin: 4mm 0 8mm;
        color: ${NAVY};
        font-family: Georgia, serif;
        font-size: 28px;
        font-weight: 500;
        line-height: 1.15;
      }

      .description-text {
        color: #3c4759;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 12px;
        line-height: 1.85;
      }

      .description-text p {
        margin: 0 0 5mm;
      }

      .analysis-note {
        margin-top: 10mm;
        padding: 7mm;
        border-left: 2px solid ${GOLD};
        background: #f5f2eb;
      }

      .analysis-note span {
        color: ${GOLD};
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .analysis-note p {
        margin: 3mm 0 0;
        color: #4c5668;
        font-size: 10px;
        line-height: 1.6;
      }

      .final-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7mm;
      }

      .content-card {
        position: relative;
        min-height: 116mm;
        padding: 9mm;
        border: 1px solid #e2e6ed;
        background: #fbfcfd;
      }

      .content-card__number {
        position: absolute;
        top: 7mm;
        right: 8mm;
        color: rgba(7, 24, 47, 0.12);
        font-family: Georgia, serif;
        font-size: 28px;
      }

      .content-card h3 {
        max-width: 42mm;
        margin: 0 0 8mm;
        color: ${NAVY};
        font-family: Georgia, serif;
        font-size: 20px;
        font-weight: 500;
        line-height: 1.2;
      }

      .highlight-list {
        margin: 0;
        padding: 0;
        display: grid;
        gap: 4mm;
        list-style: none;
      }

      .highlight-list li {
        display: grid;
        grid-template-columns: 10px 1fr;
        gap: 3mm;
        align-items: start;
      }

      .highlight-list li > span {
        color: ${GOLD};
        font-size: 7px;
        line-height: 2;
      }

      .highlight-list p,
      .location-copy,
      .empty-copy {
        margin: 0;
        color: #4d586a;
        font-size: 9.5px;
        line-height: 1.55;
      }

      .location-mark {
        margin-top: 11mm;
        padding: 7mm;
        display: grid;
        gap: 2mm;
        color: #ffffff;
        background: ${NAVY};
      }

      .location-mark span {
        color: ${GOLD};
        font-size: 7px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .location-mark strong {
        font-family: Georgia, serif;
        font-size: 18px;
        font-weight: 500;
      }

      .location-mark small {
        color: rgba(255, 255, 255, 0.56);
        font-size: 9px;
      }

      .contact-panel {
        min-height: 66mm;
        margin-top: 8mm;
        padding: 10mm;
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 12mm;
        align-items: center;
        color: #ffffff;
        background:
          linear-gradient(125deg, ${NAVY}, ${NAVY_SOFT});
      }

      .contact-panel__intro > span {
        color: ${GOLD};
        font-size: 7.5px;
        font-weight: 900;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .contact-panel__intro h3 {
        margin: 3mm 0;
        font-family: Georgia, serif;
        font-size: 21px;
        font-weight: 500;
      }

      .contact-panel__intro p {
        max-width: 80mm;
        margin: 0;
        color: rgba(255, 255, 255, 0.63);
        font-size: 9px;
        line-height: 1.55;
      }

      .contact-panel__details {
        padding-left: 8mm;
        display: grid;
        gap: 2mm;
        border-left: 1px solid rgba(201, 164, 84, 0.42);
      }

      .contact-panel__details > strong {
        color: #ffffff;
        font-family: Georgia, serif;
        font-size: 18px;
        font-weight: 500;
      }

      .contact-panel__details > span {
        color: ${GOLD};
        font-size: 8px;
        line-height: 1.4;
      }

      .contact-lines {
        margin-top: 4mm;
        display: grid;
        gap: 3mm;
      }

      .contact-lines p {
        margin: 0;
        display: grid;
        gap: 1mm;
        color: rgba(255, 255, 255, 0.76);
        font-size: 9px;
      }

      .contact-lines small {
        color: rgba(255, 255, 255, 0.36);
        font-size: 6.5px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .legal-note {
        margin-top: 6mm;
        padding: 4mm 0;
        color: #8b95a7;
        border-top: 1px solid #e1e5eb;
        font-size: 7px;
        line-height: 1.45;
      }

      .status-screen {
        min-height: 100vh;
        padding: 24px;
        display: grid;
        place-items: center;
        background:
          radial-gradient(
            circle at 20% 10%,
            rgba(201, 164, 84, 0.14),
            transparent 25%
          ),
          ${NAVY};
      }

      .status-card {
        width: min(430px, 100%);
        padding: 34px;
        display: grid;
        justify-items: center;
        gap: 16px;
        color: #ffffff;
        text-align: center;
        background: rgba(16, 39, 70, 0.82);
        border: 1px solid rgba(201, 164, 84, 0.38);
        border-radius: 24px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.26);
      }

      .status-card h1,
      .status-card p {
        margin: 0;
      }

      .status-card h1 {
        font-family: Georgia, serif;
        font-weight: 500;
      }

      .status-card p {
        color: rgba(255, 255, 255, 0.66);
        line-height: 1.55;
      }

      .status-card button {
        margin-top: 6px;
      }

      .loading-line {
        width: 100%;
        height: 3px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 99px;
      }

      .loading-line::after {
        content: "";
        width: 42%;
        height: 100%;
        display: block;
        background: ${GOLD};
        border-radius: inherit;
        animation: loading 1.15s ease-in-out infinite alternate;
      }

      @keyframes loading {
        from {
          transform: translateX(-10%);
        }

        to {
          transform: translateX(150%);
        }
      }

      @media (max-width: 760px) {
        .preview-toolbar {
          position: static;
          align-items: stretch;
          flex-direction: column;
        }

        .preview-toolbar__actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .button {
          width: 100%;
        }

        .preview-canvas {
          padding: 18px 8px 48px;
          gap: 18px;
          overflow-x: hidden;
        }

        .sheet {
          width: calc(100vw - 16px);
          min-height: auto;
          padding: 28px 22px 70px;
        }

        .cover-sheet {
          min-height: calc(100vh - 24px);
          padding: 0;
        }

        .cover-topline {
          height: auto;
          padding: 22px;
        }

        .cover-image {
          height: 58vw;
          min-height: 250px;
        }

        .cover-copy {
          min-height: auto;
          padding: 34px 24px 26px;
        }

        .cover-copy h1 {
          margin: 18px 0 12px;
          font-size: 34px;
        }

        .cover-facts {
          min-height: auto;
          margin: 0 24px;
          grid-template-columns: 1fr;
        }

        .cover-facts .data-item,
        .cover-facts .data-item:first-child {
          padding: 17px 0;
          border-right: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sheet-footer--cover {
          min-height: 56px;
          padding: 0 24px;
        }

        .page-header {
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 28px;
        }

        .page-header__brand {
          grid-template-columns: 1fr auto;
          align-items: center;
        }

        .gallery-grid {
          height: auto;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto;
          gap: 10px;
        }

        .gallery-feature {
          height: 58vw;
          min-height: 260px;
          grid-column: 1 / 3;
          grid-row: auto;
        }

        .gallery-tile {
          height: 38vw;
          min-height: 150px;
        }

        .gallery-caption {
          align-items: flex-start;
          flex-direction: column;
        }

        .details-layout {
          min-height: auto;
          grid-template-columns: 1fr;
          gap: 30px;
        }

        .details-sidebar {
          min-height: 460px;
        }

        .final-grid {
          grid-template-columns: 1fr;
        }

        .content-card {
          min-height: auto;
        }

        .contact-panel {
          grid-template-columns: 1fr;
          gap: 28px;
        }

        .contact-panel__details {
          padding: 26px 0 0;
          border-top: 1px solid rgba(201, 164, 84, 0.42);
          border-left: 0;
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
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .preview-toolbar {
          display: none !important;
        }

        .preview-canvas {
          width: 210mm;
          padding: 0;
          display: block;
          background: #ffffff;
        }

        .sheet {
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          margin: 0;
          padding: 18mm;
          page-break-after: always;
          break-after: page;
          box-shadow: none;
        }

        .sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        .cover-sheet {
          padding: 0;
        }

        .gallery-grid {
          height: 200mm;
        }

        .details-layout {
          min-height: 216mm;
        }
      }
    `}</style>
  );
}
