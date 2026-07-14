"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ListingActions from "./ListingActions";

type Variant = {
  title: string;
  text: string;
  highlights?: string[];
  cta?: string;
  instagramPost?: string;
  linkedinPost?: string;
  facebookPost?: string;
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
};

function isVariant(value: unknown): value is Variant {
  if (!value || typeof value !== "object") return false;

  const variant = value as Record<string, unknown>;

  return (
    typeof variant.title === "string" &&
    typeof variant.text === "string"
  );
}

export default function CockpitListingPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = params.id;
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [listing, setListing] = useState<Listing | null>(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!listingId) {
      setError("Keine Objekt-ID gefunden.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadListing() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/listings/${encodeURIComponent(listingId!)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Das Objekt konnte nicht geladen werden."
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

        console.error("Objekt konnte nicht geladen werden:", loadError);

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
  }, [listingId, router]);

  function formatPrice(price: number | null) {
    if (price === null) return "Preis nicht angegeben";

    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    }).format(price);
  }

  function formatNumber(value: number | null, suffix = "") {
    if (value === null) return "–";

    return `${new Intl.NumberFormat("de-CH", {
      maximumFractionDigits: 1,
    }).format(value)}${suffix}`;
  }

  const variants =
    listing && Array.isArray(listing.generatedVariants)
      ? listing.generatedVariants.filter(isVariant)
      : [];

  const selectedVariant = variants[activeVariant];

  const highlightItems =
    listing?.highlights
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) || [];

  if (loading) {
    return (
      <main className="detailPage">
        <div className="statusBox">
          <div className="spinner" />
          <strong>Objekt wird geladen …</strong>
          <span>Die gespeicherten Objektdaten werden abgerufen.</span>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="detailPage">
        <div className="errorBox">
          <strong>Objekt konnte nicht geöffnet werden</strong>
          <span>{error || "Das Objekt wurde nicht gefunden."}</span>

          <Link href="/cockpit" className="primaryButton">
            Zurück zum Cockpit
          </Link>
        </div>

        <PageStyles />
      </main>
    );
  }

  return (
    <main className="detailPage">
      <section className="detailContainer">
        <div className="topNavigation">
          <Link href="/cockpit" className="backLink">
            ← Zurück zum Cockpit
          </Link>

          <Link href="/dashboard" className="dashboardLink">
            Neues Objekt erstellen
          </Link>
        </div>

        <header className="objectHeader">
          <div>
            <span className="eyebrow">OBJEKTDETAILS</span>

            <h1>
              {listing.propertyType} in {listing.location}
            </h1>

            <p className="objectLocation">
              {listing.postalCode
                ? `${listing.postalCode} ${listing.location}`
                : listing.location}
            </p>
          </div>

          <div className="headerStatus">
            <span className={listing.archivedAt ? "statusBadge archived" : "statusBadge"}>{listing.archivedAt ? "Archiviert" : "Aktiv"}</span>
            <strong>{formatPrice(listing.price)}</strong>
          </div>
        </header>

        <div className="layout">
          <div className="mainColumn">
            <section className="objectVisual">
              <div className="objectVisualTop">
                <span className="objectTypeBadge">
                  {listing.propertyType}
                </span>

                <span className="objectHeroStatus">Aktiv</span>
              </div>

              <div className="objectHeroCenter">
                <div className="houseIconWrap">
                  <div className="houseIcon">⌂</div>
                </div>
              </div>

              <div className="objectHeroBottom">
                <div className="heroPrimary">
                  <h2>
                    {listing.propertyType} in {listing.location}
                  </h2>

                  <p>
                    {listing.postalCode
                      ? `${listing.postalCode} ${listing.location}`
                      : listing.location}
                  </p>
                </div>

                <div className="heroPrice">
                  <strong>{formatPrice(listing.price)}</strong>
                  <span>
                    {formatNumber(listing.rooms)} Zimmer •{" "}
                    {formatNumber(listing.livingArea, " m²")}
                  </span>
                </div>
              </div>

              <div className="imageHint">
                <span>📷</span>
                <span>Bildergalerie folgt als Nächstes</span>
              </div>
            </section>

            <section className="contentCard">
              <div className="cardHeading">
                <div>
                  <span className="sectionLabel">OBJEKTDATEN</span>
                  <h2>Immobilie im Überblick</h2>
                </div>
              </div>

              <div className="factsGrid">
                <div className="fact">
                  <span>Objektart</span>
                  <strong>{listing.propertyType}</strong>
                </div>

                <div className="fact">
                  <span>Zimmer</span>
                  <strong>{formatNumber(listing.rooms)}</strong>
                </div>

                <div className="fact">
                  <span>Wohnfläche</span>
                  <strong>
                    {formatNumber(listing.livingArea, " m²")}
                  </strong>
                </div>

                <div className="fact">
                  <span>Verkaufspreis</span>
                  <strong>{formatPrice(listing.price)}</strong>
                </div>

                <div className="fact">
                  <span>Stil</span>
                  <strong>{listing.style || "Nicht angegeben"}</strong>
                </div>

                <div className="fact">
                  <span>Zuletzt aktualisiert</span>
                  <strong>
                    {new Date(listing.updatedAt).toLocaleDateString(
                      "de-CH"
                    )}
                  </strong>
                </div>
              </div>

              {highlightItems.length > 0 && (
                <div className="highlightsArea">
                  <h3>Highlights</h3>

                  <div className="highlightList">
                    {highlightItems.map((highlight) => (
                      <span key={highlight}>{highlight}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="contentCard">
              <div className="cardHeading">
                <div>
                  <span className="sectionLabel">INSERAT-AI</span>
                  <h2>Gespeicherte Textvarianten</h2>
                </div>

                {variants.length > 0 && (
                  <span className="variantCount">
                    {variants.length} Varianten
                  </span>
                )}
              </div>

              {variants.length === 0 ? (
                <div className="noVariants">
                  Für dieses Objekt wurden keine Inseratvarianten
                  gespeichert.
                </div>
              ) : (
                <>
                  <div className="variantTabs">
                    {variants.map((variant, index) => (
                      <button
                        key={`${variant.title}-${index}`}
                        type="button"
                        className={
                          activeVariant === index
                            ? "variantTab active"
                            : "variantTab"
                        }
                        onClick={() => setActiveVariant(index)}
                      >
                        Variante {index + 1}
                      </button>
                    ))}
                  </div>

                  {selectedVariant && (
                    <article className="variantContent">
                      <div className="variantMeta">
                        <div>
                          <span className="variantPriceLabel">
                            Verkaufspreis
                          </span>

                          <strong className="variantPrice">
                            {formatPrice(listing.price)}
                          </strong>
                        </div>

                        <span className="variantNumber">
                          Variante {activeVariant + 1}
                        </span>
                      </div>

                      <h3>{selectedVariant.title}</h3>

                      <p className="variantText">
                        {selectedVariant.text}
                      </p>

                      {selectedVariant.highlights &&
                        selectedVariant.highlights.length > 0 && (
                          <div className="generatedHighlights">
                            {selectedVariant.highlights.map(
                              (highlight, index) => (
                                <span key={`${highlight}-${index}`}>
                                  ✓ {highlight}
                                </span>
                              )
                            )}
                          </div>
                        )}

                      {selectedVariant.cta && (
                        <p className="ctaText">
                          {selectedVariant.cta}
                        </p>
                      )}
                    </article>
                  )}
                </>
              )}
            </section>
          </div>

          <aside className="sideColumn">
            <section className="sideCard">
              <span className="sectionLabel">OBJEKTSTATUS</span>
              <h2>{listing.archivedAt ? "Archiviertes Objekt" : "Aktives Objekt"}</h2>

              <div className="statusLine">
                <span>Status</span>
                <strong>{listing.archivedAt ? "Archiviert" : "Aktiv"}</strong>
              </div>

              <div className="statusLine">
                <span>Gespeichert</span>
                <strong>
                  {new Date(listing.createdAt).toLocaleDateString(
                    "de-CH"
                  )}
                </strong>
              </div>

              <div className="statusLine">
                <span>Objekt-ID</span>
                <strong className="objectId">
                  {listing.id.slice(0, 8)}…
                </strong>
              </div>
            </section>

            <section className="sideCard nextSteps">
              <span className="sectionLabel">NÄCHSTE SCHRITTE</span>
              <h2>Objekt verwalten</h2>

              <p>
                Als Nächstes ergänzen wir Bearbeiten, Archivieren und
                Löschen.
              </p>

              <Link
                href={`/cockpit/${listing.id}/edit`}
                style={{
                  display: "inline-flex",
                  width: "100%",
                  minHeight: "42px",
                  marginTop: "9px",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(251, 191, 36, 0.42)",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(135deg, #f59e0b, #f97316)",
                  color: "#ffffff",
                  fontWeight: 900,
                  textDecoration: "none",
                  boxShadow:
                    "0 12px 26px rgba(249, 115, 22, 0.24)",
                }}
              >
                Objekt bearbeiten
              </Link>

              <ListingActions
                listingId={listing.id}
                archived={Boolean(listing.archivedAt)}
              />
            </section>
          </aside>
        </div>
      </section>

      <PageStyles />
    </main>
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      .detailPage {
        min-height: 100vh;
        padding: 42px 20px 90px;
        background:
          radial-gradient(
            circle at 18% 12%,
            rgba(37, 99, 235, 0.42),
            transparent 30%
          ),
          radial-gradient(
            circle at 88% 82%,
            rgba(249, 115, 22, 0.62),
            transparent 36%
          ),
          linear-gradient(
            135deg,
            #020617 0%,
            #0f172a 38%,
            #312e81 68%,
            #7c2d12 100%
          );
        color: #f8fafc;
      }

      .detailContainer {
        width: min(1220px, 100%);
        margin: 0 auto;
      }

      .topNavigation {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 28px;
      }

      .backLink {
        color: #fbbf24;
        font-weight: 900;
        text-decoration: none;
      }

      .dashboardLink {
        padding: 11px 16px;
        border: 1px solid rgba(251, 191, 36, 0.55);
        border-radius: 11px;
        background: linear-gradient(135deg, #f59e0b, #f97316);
        color: #ffffff;
        font-weight: 900;
        text-decoration: none;
        box-shadow: 0 12px 28px rgba(249, 115, 22, 0.28);
      }

      .objectHeader {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 28px;
        margin-bottom: 28px;
      }

      .eyebrow,
      .sectionLabel {
        display: block;
        margin-bottom: 8px;
        color: #fbbf24;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.15em;
      }

      .objectHeader h1 {
        margin: 0;
        color: #ffffff;
        font-size: clamp(34px, 5vw, 52px);
        line-height: 1.05;
        letter-spacing: -0.04em;
      }

      .objectLocation {
        margin: 12px 0 0;
        color: rgba(226, 232, 240, 0.74);
        font-size: 17px;
      }

      .headerStatus {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }

      .headerStatus > strong {
        color: #ffffff;
        font-size: 24px;
      }

      .statusBadge {
        padding: 7px 12px;
        border: 1px solid rgba(34, 197, 94, 0.3);
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.16);
        color: #86efac;
        font-size: 12px;
        font-weight: 900;
      }

      .statusBadge.archived {
        border-color: rgba(251, 191, 36, 0.34);
        background: rgba(245, 158, 11, 0.14);
        color: #fbbf24;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 310px;
        gap: 22px;
      }

      .mainColumn,
      .sideColumn {
        display: flex;
        flex-direction: column;
        gap: 22px;
      }

            .objectVisual {
        position: relative;
        display: flex;
        min-height: 320px;
        flex-direction: column;
        justify-content: space-between;
        padding: 24px;
        overflow: hidden;
        border: 1px solid rgba(251, 191, 36, 0.22);
        border-radius: 30px;
        background:
          radial-gradient(
            circle at 80% 18%,
            rgba(59, 130, 246, 0.55),
            transparent 34%
          ),
          linear-gradient(
            135deg,
            #030712 0%,
            #0f172a 38%,
            #172554 70%,
            #2563eb 100%
          );
        box-shadow: 0 20px 54px rgba(2, 6, 23, 0.38);
      }

      .objectVisual::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(2, 6, 23, 0.06) 0%,
          rgba(2, 6, 23, 0.08) 30%,
          rgba(2, 6, 23, 0.34) 100%
        );
        pointer-events: none;
      }

      .objectVisualTop,
      .objectHeroCenter,
      .objectHeroBottom,
      .imageHint {
        position: relative;
        z-index: 1;
      }

      .objectVisualTop {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .objectTypeBadge {
        display: inline-flex;
        align-items: center;
        padding: 9px 16px;
        border: 1px solid rgba(251, 191, 36, 0.45);
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.13);
        color: #fbbf24;
        font-size: 14px;
        font-weight: 900;
      }

      .objectHeroStatus {
        display: inline-flex;
        align-items: center;
        padding: 9px 14px;
        border: 1px solid rgba(34, 197, 94, 0.26);
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.14);
        color: #86efac;
        font-size: 13px;
        font-weight: 900;
      }

      .objectHeroCenter {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
      }

      .houseIconWrap {
        display: flex;
        width: 142px;
        height: 142px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .houseIcon {
        color: rgba(255, 255, 255, 0.95);
        font-size: 88px;
        line-height: 1;
      }

      .objectHeroBottom {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
      }

      .heroPrimary h2 {
        margin: 0 0 8px;
        color: #ffffff;
        font-size: 31px;
        line-height: 1.1;
        letter-spacing: -0.03em;
      }

      .heroPrimary p {
        margin: 0;
        color: rgba(226, 232, 240, 0.8);
        font-size: 15px;
      }

      .heroPrice {
        min-width: 260px;
        padding: 16px 18px;
        border: 1px solid rgba(251, 191, 36, 0.22);
        border-radius: 20px;
        background: rgba(2, 6, 23, 0.34);
        backdrop-filter: blur(10px);
        box-shadow: 0 12px 28px rgba(2, 6, 23, 0.24);
      }

      .heroPrice strong {
        display: block;
        color: #ffffff;
        font-size: 30px;
        line-height: 1.08;
      }

      .heroPrice span {
        display: block;
        margin-top: 8px;
        color: #fbbf24;
        font-size: 13px;
        font-weight: 800;
      }

      .imageHint {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        align-self: flex-start;
        margin-top: 14px;
        padding: 9px 13px;
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(226, 232, 240, 0.76);
        font-size: 12px;
        font-weight: 700;
      }

      .contentCard,
      .sideCard,
      .statusBox,
      .errorBox {
        border: 1px solid rgba(251, 191, 36, 0.2);
        border-radius: 22px;
        background:
          linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.82),
            rgba(30, 41, 59, 0.68)
          );
        color: #f8fafc;
        backdrop-filter: blur(12px);
        box-shadow: 0 18px 48px rgba(2, 6, 23, 0.28);
      }

      .contentCard {
        padding: 26px;
      }

      .sideCard {
        padding: 22px;
      }

      .cardHeading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 22px;
      }

      .cardHeading h2,
      .sideCard h2 {
        margin: 0;
        color: #ffffff;
        font-size: 23px;
      }

      .variantCount {
        padding: 7px 11px;
        border: 1px solid rgba(251, 191, 36, 0.28);
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.12);
        color: #fbbf24;
        font-size: 12px;
        font-weight: 900;
      }

      .factsGrid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .fact {
        padding: 15px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 13px;
        background: rgba(255, 255, 255, 0.05);
      }

      .fact span {
        display: block;
        margin-bottom: 7px;
        color: rgba(226, 232, 240, 0.64);
        font-size: 12px;
      }

      .fact strong {
        color: #ffffff;
        font-size: 15px;
      }

      .highlightsArea {
        margin-top: 24px;
        padding-top: 22px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .highlightsArea h3 {
        margin: 0 0 12px;
        color: #ffffff;
      }

      .highlightList {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .highlightList span {
        padding: 8px 11px;
        border: 1px solid rgba(251, 191, 36, 0.24);
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.11);
        color: #fbbf24;
        font-size: 12px;
        font-weight: 800;
      }

      .variantTabs {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-bottom: 22px;
      }

      .variantTab {
        padding: 10px 15px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(226, 232, 240, 0.76);
        font-weight: 800;
        cursor: pointer;
      }

      .variantTab.active {
        border-color: #f59e0b;
        background: linear-gradient(135deg, #f59e0b, #f97316);
        color: #ffffff;
      }

      .variantContent {
        padding: 23px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.05);
      }

      .variantMeta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 22px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.09);
      }

      .variantPriceLabel {
        display: block;
        margin-bottom: 5px;
        color: rgba(226, 232, 240, 0.62);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .variantPrice {
        display: block;
        color: #fbbf24;
        font-size: 24px;
        line-height: 1.1;
      }

      .variantNumber {
        padding: 8px 12px;
        border: 1px solid rgba(251, 191, 36, 0.28);
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.11);
        color: #fbbf24;
        font-size: 12px;
        font-weight: 900;
      }
      .variantContent h3 {
        margin: 0 0 16px;
        color: #ffffff;
        font-size: 23px;
      }

      .variantText {
        margin: 0;
        color: rgba(226, 232, 240, 0.82);
        line-height: 1.75;
        white-space: pre-wrap;
      }

      .generatedHighlights {
        display: grid;
        gap: 8px;
        margin-top: 20px;
      }

      .generatedHighlights span {
        color: rgba(226, 232, 240, 0.82);
        font-size: 14px;
      }

      .ctaText {
        margin: 20px 0 0;
        padding-top: 18px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        color: #fbbf24;
        font-weight: 800;
      }

      .noVariants {
        padding: 26px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(226, 232, 240, 0.7);
        text-align: center;
      }

      .statusLine {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .statusLine span {
        color: rgba(226, 232, 240, 0.62);
        font-size: 13px;
      }

      .statusLine strong {
        color: #ffffff;
        font-size: 13px;
      }

      .objectId {
        color: #fbbf24 !important;
        font-family: monospace;
      }

      .nextSteps p {
        color: rgba(226, 232, 240, 0.68);
        font-size: 13px;
        line-height: 1.55;
      }

      .nextSteps button {
        width: 100%;
        min-height: 42px;
        margin-top: 9px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        color: rgba(226, 232, 240, 0.62);
        font-weight: 800;
        cursor: not-allowed;
      }

      .nextSteps .dangerButton {
        border-color: rgba(248, 113, 113, 0.26);
        background: rgba(239, 68, 68, 0.13);
        color: #fca5a5;
      }

      .statusBox,
      .errorBox {
        display: flex;
        width: min(700px, 100%);
        min-height: 340px;
        margin: 40px auto;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 35px;
        text-align: center;
      }

      .statusBox span,
      .errorBox span {
        margin-top: 8px;
        color: rgba(226, 232, 240, 0.7);
      }

      .spinner {
        width: 40px;
        height: 40px;
        margin-bottom: 18px;
        border: 4px solid rgba(251, 191, 36, 0.2);
        border-top-color: #f59e0b;
        border-radius: 50%;
        animation: detailSpin 800ms linear infinite;
      }

      .primaryButton {
        display: inline-flex;
        min-height: 44px;
        margin-top: 22px;
        padding: 0 18px;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: linear-gradient(135deg, #f59e0b, #f97316);
        color: #ffffff;
        font-weight: 900;
        text-decoration: none;
      }

      @keyframes detailSpin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 900px) {
        .statusBadge.archived {
        border-color: rgba(251, 191, 36, 0.34);
        background: rgba(245, 158, 11, 0.14);
        color: #fbbf24;
      }
      .layout {
          grid-template-columns: 1fr;
        }

        .sideColumn {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 700px) {
        .detailPage {
          padding: 28px 14px 65px;
        }

        .objectHeader,
        .topNavigation {
          align-items: stretch;
          flex-direction: column;
        }

        .headerStatus {
          align-items: flex-start;
        }

        .factsGrid,
        .sideColumn {
          grid-template-columns: 1fr;
        }

        .objectVisual {
          min-height: 250px;
          padding: 18px;
        }

        .objectHeroBottom {
          align-items: stretch;
          flex-direction: column;
        }

        .heroPrice {
          min-width: 0;
          width: 100%;
        }

        .heroPrimary h2 {
          font-size: 24px;
        }

        .houseIconWrap {
          width: 112px;
          height: 112px;
        }

        .houseIcon {
          font-size: 72px;
        }

        .contentCard {
          padding: 19px;
        }

        .cardHeading {
          flex-direction: column;
        }
      }
    `}</style>
  );
}




