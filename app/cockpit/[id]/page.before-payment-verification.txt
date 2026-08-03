"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ListingActions from "./ListingActions";
import { useAppDialog } from "../../../components/AppDialogProvider";

type Variant = {
  title: string;
  text: string;
  highlights?: string[];
  cta?: string;
  instagramPost?: string;
  linkedinPost?: string;
  facebookPost?: string;
};
type ListingImage = {
  id: string;
  url: string;
  storageKey: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  position: number;
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
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;

  paymentModel: string;
  unlockStatus: string;
  singleObjectPriceCents: number;
  images: ListingImage[];
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingImageId, setDeletingImageId] = useState<string | null>(
  null
);

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
async function deleteListingImage(imageId: string) {
  const confirmed = window.confirm(
    "Dieses Bild wirklich dauerhaft löschen?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeletingImageId(imageId);

    const response = await fetch(
      `/api/listing-images/${encodeURIComponent(imageId)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      nextPrimaryImage?: ListingImage | null;
    };

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Das Bild konnte nicht gelöscht werden."
      );
    }

    setListing((currentListing) => {
      if (!currentListing) {
        return currentListing;
      }

      const deletedImageWasPrimary =
        currentListing.images.find(
          (image) => image.id === imageId
        )?.isPrimary === true;

      const remainingImages = currentListing.images.filter(
        (image) => image.id !== imageId
      );

      if (!deletedImageWasPrimary) {
        return {
          ...currentListing,
          images: remainingImages,
        };
      }

      const nextPrimaryId = data.nextPrimaryImage?.id;

      return {
        ...currentListing,
        images: remainingImages.map((image) => ({
          ...image,
          isPrimary: image.id === nextPrimaryId,
        })),
      };
    });
  } catch (deleteError) {
    console.error("Bild konnte nicht gelöscht werden:", deleteError);

    window.alert(
      deleteError instanceof Error
        ? deleteError.message
        : "Das Bild konnte nicht gelöscht werden."
    );
  } finally {
    setDeletingImageId(null);
  }
}
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
  function formatFileSize(sizeBytes: number | null) {
  if (sizeBytes === null) {
    return "Dateigrösse unbekannt";
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

  const variants =
    listing && Array.isArray(listing.generatedVariants)
      ? listing.generatedVariants.filter(isVariant)
      : [];
      const selectedVariant = variants[activeVariant];

 const galleryImages = listing?.images ?? [];

const safeActiveImageIndex =
  galleryImages.length === 0
    ? 0
    : Math.min(activeImageIndex, galleryImages.length - 1);

const activeGalleryImage =
  galleryImages[safeActiveImageIndex] ?? null;
  function showPreviousImage() {
  if (galleryImages.length <= 1) {
    return;
  }

  setActiveImageIndex((currentIndex) =>
    currentIndex === 0
      ? galleryImages.length - 1
      : currentIndex - 1
  );
}

function showNextImage() {
  if (galleryImages.length <= 1) {
    return;
  }

  setActiveImageIndex((currentIndex) =>
    currentIndex === galleryImages.length - 1
      ? 0
      : currentIndex + 1
  );
}

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

       <header className="listingIntro">
  <span className="eyebrow">OBJEKTDETAILS</span>

  <h1>
    {listing.rooms !== null
      ? `${formatNumber(listing.rooms)}-Zimmer-`
      : ""}
    {listing.propertyType} in {listing.location}
  </h1>

  <div className="listingIntroMeta">
    <span>{formatNumber(listing.livingArea, " m²")}</span>

    <span className="listingIntroDivider" />

    <strong>{formatPrice(listing.price)}</strong>
  </div>
</header>

        <div className="layout">
          <div className="mainColumn">
            <section className="objectGalleryCard">
  <div className="objectGalleryHeading">
    <div>
      <span className="sectionLabel">OBJEKTBILDER</span>
      <h2>Bildergalerie</h2>
    </div>

    {galleryImages.length > 0 && (
      <span className="galleryCounter">
        {safeActiveImageIndex + 1} / {galleryImages.length}
      </span>
    )}
  </div>

  <div className="objectGalleryStage">
    <button
      type="button"
      className="galleryArrow galleryArrowLeft"
      onClick={showPreviousImage}
      disabled={galleryImages.length <= 1}
      aria-label="Vorheriges Bild"
    >
      ‹
    </button>

    {activeGalleryImage ? (
      <img
        src={activeGalleryImage.url}
        alt={
          activeGalleryImage.fileName ||
          `${listing.propertyType} Bild ${
            safeActiveImageIndex + 1
          }`
        }
        className="objectGalleryImage"
      />
    ) : (
      <div className="objectGalleryEmpty">
        <span>📷</span>
        <strong>Noch keine Objektbilder</strong>
      </div>
    )}

    <button
      type="button"
      className="galleryArrow galleryArrowRight"
      onClick={showNextImage}
      disabled={galleryImages.length <= 1}
      aria-label="Nächstes Bild"
    >
      ›
    </button>
  </div>

  {galleryImages.length > 1 && (
    <div className="galleryDots">
      {galleryImages.map((image, index) => (
        <button
          key={image.id}
          type="button"
          className={
            index === safeActiveImageIndex
              ? "galleryDot active"
              : "galleryDot"
          }
          onClick={() => setActiveImageIndex(index)}
          aria-label={`Bild ${index + 1} anzeigen`}
        />
      ))}
    </div>
  )}
  </section>
<section className="objectInsightBar">
  <div className="objectInsightItem">
    <span className="objectInsightIcon">👁</span>

    <div>
      <small>Aufrufe</small>
      <strong>Noch keine Daten</strong>
      <p>Verfügbar, sobald das Objekt öffentlich geteilt wird.</p>
    </div>
  </div>

  <div className="objectInsightItem">
    <span className="objectInsightIcon">↗</span>

    <div>
      <small>Social Media</small>
      <strong>Nach Veröffentlichung verfügbar</strong>
      <p>Likes und Kommentare werden später hier angezeigt.</p>
    </div>
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
<Link
  href={`/dashboard/social-media?listingId=${listing.id}`}
  style={{
    display: "inline-flex",
    width: "100%",
    minHeight: "42px",
    marginTop: "10px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "1px solid rgba(251, 191, 36, 0.65)",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(251, 191, 36, 0.08))",
    color: "#fbbf24",
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 10px 24px rgba(245, 158, 11, 0.14)",
  }}
>
  <span>📱</span>
  Social Media erstellen
</Link>

<Link
  href={`/expose/${listing.id}`}
  style={{
    display: "inline-flex",
    width: "100%",
    minHeight: "46px",
    marginTop: "10px",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    padding: "10px 16px",
    border: "1px solid rgba(245, 189, 33, 0.58)",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, rgba(245, 189, 33, 0.24), rgba(107, 92, 255, 0.22))",
    color: "#ffffff",
    fontWeight: 900,
    textDecoration: "none",
    boxSizing: "border-box",
    boxShadow:
      "0 12px 28px rgba(245, 189, 33, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  }}
>
  <span
    style={{
      display: "inline-flex",
      width: "28px",
      height: "28px",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "9px",
      background:
        "linear-gradient(135deg, rgba(245, 189, 33, 0.95), rgba(255, 217, 106, 0.9))",
      color: "#081323",
      fontSize: "15px",
      boxShadow: "0 0 18px rgba(245, 189, 33, 0.22)",
    }}
  >
    📄
  </span>

  Exposé erstellen
</Link>

<Link
  href={`/dashboard/tour-guide?listingId=${listing.id}`}
  style={{
    display: "inline-flex",
    width: "100%",
    minHeight: "46px",
    marginTop: "10px",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "14px",
    border: "1px solid rgba(34, 211, 238, 0.35)",
    background:
      "linear-gradient(135deg, rgba(8, 145, 178, 0.28), rgba(79, 70, 229, 0.3))",
    color: "#ffffff",
    fontWeight: 900,
    textDecoration: "none",
    boxSizing: "border-box",
  }}
>
  🎬 3D-Video-Tour erstellen
</Link>
<Link
  href={`/cockpit/${listing.id}/home-staging`}
  style={{
    display: "inline-flex",
    width: "100%",
    minHeight: "48px",
    marginTop: "10px",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    padding: "10px 16px",
    border: "1px solid rgba(34, 211, 238, 0.48)",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, rgba(34, 211, 238, 0.22), rgba(139, 92, 246, 0.28), rgba(245, 189, 33, 0.18))",
    color: "#ffffff",
    fontWeight: 900,
    textDecoration: "none",
    boxSizing: "border-box",
    boxShadow: "0 12px 28px rgba(34, 211, 238, 0.12)",
  }}
>
  <span aria-hidden="true">🛋️</span>
  Virtuelles Home Staging
</Link>

              <ListingActions
                listingId={listing.id}
                archived={Boolean(listing.archivedAt)}
                unlockStatus={listing.unlockStatus}
                singleObjectPriceCents={
                  listing.singleObjectPriceCents
                }

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
        .objectVisual {
  position: relative;
  isolation: isolate;
}

.objectHeroCenter.hasImage {
  position: absolute;
  inset: 0;
  z-index: -2;
  overflow: hidden;
}

.objectHeroCenter.hasImage::after {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(5, 15, 40, 0.2) 0%,
      rgba(5, 15, 40, 0.12) 38%,
      rgba(5, 15, 40, 0.88) 100%
    );
  content: "";
}

.objectHeroImage {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.objectVisualTop,
.objectHeroBottom {
  position: relative;
  z-index: 2;
}
  .objectImagesGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.objectImageCard {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.045);
  box-shadow: 0 14px 32px rgba(2, 6, 23, 0.2);
}

.objectImagePreview {
  position: relative;
  display: block;
  height: 220px;
  overflow: hidden;
  background: rgba(2, 6, 23, 0.5);
}

.objectImagePreview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.objectImagePreview:hover img {
  transform: scale(1.035);
}

.primaryImageBadge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 7px 11px;
  border: 1px solid rgba(251, 191, 36, 0.65);
  border-radius: 999px;
  background: rgba(7, 20, 47, 0.82);
  color: #fbbf24;
  font-size: 10px;
  font-weight: 900;
  backdrop-filter: blur(10px);
}

.objectImageInformation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 15px;
}

.objectImageInformation strong,
.objectImageInformation span {
  display: block;
}

.objectImageInformation strong {
  max-width: 260px;
  overflow: hidden;
  color: #ffffff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.objectImageInformation span {
  margin-top: 5px;
  color: rgba(226, 232, 240, 0.58);
  font-size: 11px;
}

.objectImageActions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.objectImageActions a,
.objectImageActions button {
  display: inline-flex;
  min-height: 36px;
  padding: 0 12px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
  text-decoration: none;
}

.objectImageActions a {
  border: 1px solid rgba(251, 191, 36, 0.42);
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
}

.objectImageActions button {
  border: 1px solid rgba(248, 113, 113, 0.32);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  cursor: pointer;
}

.objectImageActions button:disabled {
  cursor: wait;
  opacity: 0.55;
}

@media (max-width: 700px) {
  .objectImagesGrid {
    grid-template-columns: 1fr;
     max-height: 1240px;
  }

  .objectImagePreview {
    height: 200px;
  }

  .objectImageInformation {
    align-items: stretch;
    flex-direction: column;
  }

  .objectImageActions a,
  .objectImageActions button {
    flex: 1;
  }
}
  .objectMediaCard {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 28px;
  background: #020617;
  box-shadow: 0 20px 54px rgba(2, 6, 23, 0.38);
}

.objectMediaTop {
  position: absolute;
  top: 18px;
  right: 18px;
  left: 18px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.objectMediaFrame {
  display: flex;
  width: 100%;
  height: clamp(360px, 48vw, 600px);
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(
      circle at center,
      rgba(37, 99, 235, 0.15),
      transparent 55%
    ),
    #020617;
}

.objectMediaImage {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.objectSummaryBar {
  display: flex;
  min-height: 92px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 24px;
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 20px;
  background:
    linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.13),
      rgba(15, 23, 42, 0.88)
    );
  box-shadow: 0 14px 34px rgba(2, 6, 23, 0.25);
}

.objectSummaryPrice span,
.objectSummaryPrice strong {
  display: block;
}

.objectSummaryPrice span {
  margin-bottom: 5px;
  color: rgba(226, 232, 240, 0.62);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.objectSummaryPrice strong {
  color: #ffffff;
  font-size: 28px;
  line-height: 1.1;
}

.objectSummaryFacts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 9px;
}

.objectSummaryFacts span {
  padding: 9px 13px;
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.08);
  color: #fbbf24;
  font-size: 12px;
  font-weight: 850;
}

@media (max-width: 700px) {
  .objectMediaFrame {
    height: 340px;
  }

  .objectSummaryBar {
    align-items: stretch;
    flex-direction: column;
  }

  .objectSummaryFacts {
    justify-content: flex-start;
  }

  .objectSummaryPrice strong {
    font-size: 24px;
  }
}
  .listingIntro {
  margin-bottom: 28px;
  padding: 28px 30px;
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at top right,
      rgba(245, 158, 11, 0.12),
      transparent 40%
    ),
    linear-gradient(
      135deg,
      rgba(8, 20, 50, 0.94),
      rgba(20, 30, 68, 0.88)
    );
  box-shadow: 0 18px 44px rgba(2, 6, 23, 0.28);
}

.listingIntro h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(32px, 4.5vw, 52px);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.listingIntroMeta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}

.listingIntroMeta span {
  color: rgba(226, 232, 240, 0.76);
  font-size: 17px;
  font-weight: 750;
}

.listingIntroMeta strong {
  color: #fbbf24;
  font-size: 23px;
  line-height: 1;
}

.listingIntroDivider {
  width: 1px;
  height: 22px;
  background: rgba(251, 191, 36, 0.38);
}

@media (max-width: 700px) {
  .listingIntro {
    padding: 22px 19px;
  }

  .listingIntroMeta {
    gap: 10px;
  }

  .listingIntroMeta span {
    font-size: 15px;
  }

  .listingIntroMeta strong {
    font-size: 20px;
  }
}
  /* Finale Objektgalerie */

.objectGalleryCard {
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 26px;
  background:
    linear-gradient(
      145deg,
      rgba(7, 20, 47, 0.98),
      rgba(16, 28, 65, 0.96)
    );
  box-shadow:
    0 22px 55px rgba(2, 6, 23, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.objectGalleryHeading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px 18px;
}

.objectGalleryHeading h2 {
  margin: 0;
  color: #ffffff;
  font-size: 25px;
}

.galleryCounter {
  padding: 8px 13px;
  border: 1px solid rgba(251, 191, 36, 0.42);
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  font-size: 12px;
  font-weight: 900;
}

.objectGalleryStage {
  position: relative;
  display: flex;
  width: calc(100% - 40px);
  height: clamp(370px, 47vw, 580px);
  margin: 0 20px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 20px;
  background:
    radial-gradient(
      circle at center,
      rgba(37, 99, 235, 0.14),
      transparent 60%
    ),
    #020617;
}

.objectGalleryImage {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.galleryArrow {
  position: absolute;
  top: 50%;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid rgba(251, 191, 36, 0.75);
  border-radius: 50%;
  background: rgba(5, 15, 40, 0.84);
  color: #fbbf24;
  cursor: pointer;
  font-size: 38px;
  line-height: 1;
  transform: translateY(-50%);
  backdrop-filter: blur(14px);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(251, 191, 36, 0.08);
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.galleryArrowLeft {
  left: 18px;
}

.galleryArrowRight {
  right: 18px;
}

.galleryArrow:hover:not(:disabled) {
  border-color: #fbbf24;
  background: rgba(245, 158, 11, 0.28);
  transform: translateY(-50%) scale(1.07);
}

.galleryArrow:disabled {
  cursor: not-allowed;
  opacity: 0.25;
}

.galleryDots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 17px 20px 20px;
}

.galleryDot {
  width: 9px;
  height: 9px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition:
    width 0.2s ease,
    background 0.2s ease;
}

.galleryDot.active {
  width: 28px;
  background: #fbbf24;
}

/* Statistikleiste */

.objectStatsBar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.1),
      rgba(12, 25, 58, 0.94)
    );
  box-shadow: 0 14px 34px rgba(2, 6, 23, 0.25);
}

.objectStatItem {
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: center;
  gap: 13px;
  padding: 16px 18px;
}

.objectStatItem + .objectStatItem {
  border-left: 1px solid rgba(255, 255, 255, 0.09);
}

.objectStatIcon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  font-size: 18px;
}

.objectStatItem small,
.objectStatItem strong {
  display: block;
}

.objectStatItem small {
  color: rgba(226, 232, 240, 0.62);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.objectStatItem strong {
  margin-top: 5px;
  color: #ffffff;
  font-size: 20px;
}

@media (max-width: 700px) {
  .objectGalleryHeading {
    padding: 18px 16px 15px;
  }

  .objectGalleryStage {
    width: calc(100% - 24px);
    height: 330px;
    margin: 0 12px;
  }

  .galleryArrow {
    width: 46px;
    height: 46px;
    font-size: 30px;
  }

  .galleryArrowLeft {
    left: 10px;
  }

  .galleryArrowRight {
    right: 10px;
  }

  .objectStatItem {
    min-height: 76px;
    gap: 8px;
    padding: 12px 7px;
  }

  .objectStatIcon {
    width: 34px;
    height: 34px;
    font-size: 15px;
  }

  .objectStatItem small {
    font-size: 8px;
  }

  .objectStatItem strong {
    font-size: 17px;
  }
}
  .objectInsightBar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: 19px;
  background:
    linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.09),
      rgba(11, 24, 57, 0.96)
    );
  box-shadow: 0 14px 34px rgba(2, 6, 23, 0.25);
}

.objectInsightItem {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  min-height: 112px;
  align-items: center;
  gap: 15px;
  padding: 19px 22px;
}

.objectInsightItem + .objectInsightItem {
  border-left: 1px solid rgba(255, 255, 255, 0.09);
}

.objectInsightIcon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(251, 191, 36, 0.32);
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.11);
  color: #fbbf24;
  font-size: 20px;
}

.objectInsightItem small,
.objectInsightItem strong {
  display: block;
}

.objectInsightItem small {
  color: #fbbf24;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.objectInsightItem strong {
  margin-top: 6px;
  color: #ffffff;
  font-size: 15px;
  line-height: 1.3;
}

.objectInsightItem p {
  margin: 6px 0 0;
  color: rgba(226, 232, 240, 0.55);
  font-size: 10px;
  line-height: 1.45;
}

@media (max-width: 700px) {
  .objectInsightBar {
    grid-template-columns: 1fr;
  }

  .objectInsightItem + .objectInsightItem {
    border-top: 1px solid rgba(255, 255, 255, 0.09);
    border-left: 0;
  }

  .objectInsightItem {
    min-height: 100px;
    padding: 16px;
  }
}
    `}</style>
  );
}




