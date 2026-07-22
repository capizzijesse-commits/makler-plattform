"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  createdAt: string;
  archivedAt: string | null;
  updatedAt: string;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
};

export default function CockpitPage() {
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCockpit() {
      try {
        setLoading(true);
        setError("");

        const sessionResponse = await fetch("/api/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (sessionResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionData.authenticated) {
          throw new Error(
            sessionData.error || "Die Sitzung konnte nicht geprüft werden."
          );
        }

        setUser(sessionData.user);

        const listingsResponse = await fetch("/api/listings", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (listingsResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const listingsData = await listingsResponse.json();

        if (!listingsResponse.ok || !listingsData.success) {
          throw new Error(
            listingsData.error || "Die Objekte konnten nicht geladen werden."
          );
        }

        setListings(listingsData.listings);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        console.error("Cockpit konnte nicht geladen werden:", loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Das Makler-Cockpit konnte nicht geladen werden."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCockpit();

    return () => controller.abort();
  }, [router]);

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

  function getHighlightList(highlights: string | null) {
    if (!highlights) return [];

    return highlights
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return (
    <main className="cockpitPage">
      <section className="cockpitContainer">
        <div className="cockpitHero">
          <div className="cockpitHeroText">
            <span className="eyebrow">MAKLER-COCKPIT</span>
            <h1>Meine Objekte</h1>
            <p>
              {user
                ? `Willkommen ${user.name}. Verwalte hier deine gespeicherten Immobilien, öffne sie mit einem Klick und bearbeite sie später direkt im Cockpit.`
                : "Verwalte hier deine gespeicherten Immobilien."}
            </p>
          </div>

          <Link href="/dashboard" className="newListingButton">
            <span>＋</span>
            Neues Objekt
          </Link>
        </div>

        {!loading && !error && (
          <div className="statsRow">
            <div className="statCard">
              <span>Gespeicherte Objekte</span>
              <strong>{listings.length}</strong>
            </div>

            <div className="statCard">
              <span>Aktive Objekte</span>
              <strong>{listings.filter((listing) => !listing.archivedAt).length}</strong>
            </div>

            <div className="statCard">
              <span>Dein Plan</span>
              <strong>{user?.plan || "–"}</strong>
            </div>
          </div>
        )}

        {loading && (
          <div className="statusBox">
            <div className="spinner" />
            <strong>Makler-Cockpit wird geladen …</strong>
            <span>Deine gespeicherten Objekte werden abgerufen.</span>
          </div>
        )}

        {!loading && error && (
          <div className="errorBox">
            <strong>Cockpit konnte nicht geladen werden</strong>
            <span>{error}</span>
            <button type="button" onClick={() => window.location.reload()}>
              Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="emptyBox">
            <div className="emptyIcon">⌂</div>
            <h2>Noch keine Objekte gespeichert</h2>
            <p>
              Erstelle im Dashboard dein erstes Immobilieninserat und speichere
              es dauerhaft.
            </p>
            <Link href="/dashboard" className="emptyButton">
              Erstes Objekt erstellen
            </Link>
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          <>
            <div className="sectionTitle">
              <div>
                <h2>Objektübersicht</h2>
                <p>Zuletzt bearbeitete Objekte erscheinen zuerst.</p>
              </div>
            </div>

            <div className="listingGrid">
              {listings.map((listing) => {
                const highlightList = getHighlightList(listing.highlights);

                return (
                  <article key={listing.id} className="listingCard">
                    <div className="listingVisual">
                      <div className="visualTop">
                        <span className="propertyBadge">
                          {listing.propertyType}
                        </span>

                        <span className={listing.archivedAt ? "statusBadge archived" : "statusBadge"}>{listing.archivedAt ? "Archiviert" : "Aktiv"}</span>
                      </div>

                      <div className="visualCenter">
                        <div className="visualIconWrap">
                          <div className="houseIcon">⌂</div>
                        </div>
                      </div>

                      <div className="visualBottom">
                        <div>
                          <p className="heroLocation">
                            {listing.postalCode
                              ? `${listing.postalCode} ${listing.location}`
                              : listing.location}
                          </p>

                          <h3>
                            {listing.propertyType} in {listing.location}
                          </h3>
                        </div>

                        <div className="heroPriceBox">
                          <strong>{formatPrice(listing.price)}</strong>
                          <span>
                            {formatNumber(listing.rooms)} Zimmer •{" "}
                            {formatNumber(listing.livingArea, " m²")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="listingContent">
                      <div className="propertyFacts">
                        <div className="factBox">
                          <strong>{formatNumber(listing.rooms)}</strong>
                          <span>Zimmer</span>
                        </div>

                        <div className="factBox">
                          <strong>{formatNumber(listing.livingArea, " m²")}</strong>
                          <span>Wohnfläche</span>
                        </div>
                      </div>

                      {highlightList.length > 0 && (
                        <div className="highlightList">
                          {highlightList.map((highlight) => (
                            <span key={highlight}>{highlight}</span>
                          ))}
                        </div>
                      )}

                      <div className="listingFooter">
                        <span>
                          Aktualisiert am{" "}
                          {new Date(listing.updatedAt).toLocaleDateString(
                            "de-CH"
                          )}
                        </span>

                        <Link
                          href={`/cockpit/${listing.id}`}
                          className="openButton"
                          style={{
                            display: "inline-flex",
                            minWidth: "205px",
                            minHeight: "52px",
                            padding: "0 11px 0 20px",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "16px",
                            border: "1px solid #fcd34d",
                            borderRadius: "15px",
                            background:
                              "linear-gradient(135deg, #fcd34d 0%, #fbbf24 30%, #f59e0b 65%, #d97706 100%)",
                            color: "#111827",
                            fontSize: "14px",
                            fontWeight: 900,
                            textDecoration: "none",
                            boxShadow:
                              "0 16px 34px rgba(245, 158, 11, 0.42), inset 0 1px 0 rgba(255,255,255,0.5)",
                          }}
                        >
                          <span>Objekt öffnen</span>

                          <span
                            aria-hidden="true"
                            style={{
                              display: "inline-flex",
                              width: "34px",
                              height: "34px",
                              flexShrink: 0,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "10px",
                              background: "rgba(17, 24, 39, 0.16)",
                              color: "#111827",
                              fontSize: "19px",
                              fontWeight: 900,
                            }}
                          >
                            →
                          </span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <style jsx>{`
        .cockpitPage {
          min-height: 100vh;
          padding: 48px 20px 90px;
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

        .cockpitContainer {
          width: min(1280px, 100%);
          margin: 0 auto;
        }

        .cockpitHero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 34px;
        }

        .cockpitHeroText {
          max-width: 820px;
        }

        .eyebrow {
          display: block;
          margin-bottom: 10px;
          color: #fbbf24;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        h1 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(38px, 5vw, 60px);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .cockpitHero p,
        .sectionTitle p {
          margin: 14px 0 0;
          color: rgba(226, 232, 240, 0.76);
          line-height: 1.7;
          font-size: 16px;
        }

        .newListingButton,
        .emptyButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 52px;
          padding: 0 22px;
          border: 1px solid rgba(251, 191, 36, 0.55);
          border-radius: 14px;
          background: linear-gradient(135deg, #f59e0b, #f97316);
          color: #ffffff;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 18px 38px rgba(249, 115, 22, 0.3);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .newListingButton:hover,
        .emptyButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 44px rgba(249, 115, 22, 0.4);
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 34px;
        }

        .statCard {
          padding: 22px;
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 22px;
          background:
            linear-gradient(
              135deg,
              rgba(15, 23, 42, 0.82),
              rgba(30, 41, 59, 0.66)
            );
          backdrop-filter: blur(14px);
          box-shadow: 0 16px 36px rgba(2, 6, 23, 0.24);
        }

        .statCard span {
          display: block;
          margin-bottom: 10px;
          color: rgba(226, 232, 240, 0.7);
          font-size: 13px;
          font-weight: 700;
        }

        .statCard strong {
          color: #ffffff;
          font-size: 32px;
          text-transform: capitalize;
        }

        .sectionTitle {
          margin: 6px 0 18px;
        }

        .sectionTitle h2 {
          margin: 0;
          color: #ffffff;
          font-size: 30px;
        }

        .listingGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(390px, 1fr));
          gap: 24px;
        }

        .listingCard {
          overflow: hidden;
          border: 1px solid rgba(251, 191, 36, 0.28);
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.96),
              rgba(23, 37, 67, 0.94)
            );
          box-shadow: 0 22px 58px rgba(2, 6, 23, 0.42);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .listingCard:hover {
          transform: translateY(-5px);
          border-color: rgba(251, 191, 36, 0.48);
          box-shadow: 0 28px 68px rgba(2, 6, 23, 0.52);
        }

        .listingVisual {
          position: relative;
          display: flex;
          min-height: 285px;
          flex-direction: column;
          justify-content: space-between;
          padding: 22px;
          background:
            radial-gradient(
              circle at 78% 18%,
              rgba(59, 130, 246, 0.48),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              #030712 0%,
              #0f172a 38%,
              #172554 70%,
              #2563eb 100%
            );
        }

        .listingVisual::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(2, 6, 23, 0.02) 0%,
            rgba(2, 6, 23, 0.12) 45%,
            rgba(2, 6, 23, 0.34) 100%
          );
          pointer-events: none;
        }

        .visualTop,
        .visualCenter,
        .visualBottom {
          position: relative;
          z-index: 1;
        }

        .visualTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .propertyBadge {
          display: inline-flex;
          align-items: center;
          padding: 8px 14px;
          border: 1px solid rgba(251, 191, 36, 0.45);
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.13);
          color: #fbbf24;
          font-size: 13px;
          font-weight: 900;
        }

        .statusBadge {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border: 1px solid rgba(34, 197, 94, 0.26);
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.14);
          color: #86efac;
          font-size: 12px;
          font-weight: 900;
        }

        .statusBadge.archived {
          border-color: rgba(251, 191, 36, 0.34);
          background: rgba(245, 158, 11, 0.14);
          color: #fbbf24;
        }
        .visualCenter {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: center;
        }

        .visualIconWrap {
          display: flex;
          width: 108px;
          height: 108px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }

        .houseIcon {
          color: rgba(255, 255, 255, 0.96);
          font-size: 70px;
          line-height: 1;
        }

        .visualBottom {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .heroLocation {
          margin: 0 0 6px;
          color: rgba(226, 232, 240, 0.78);
          font-size: 13px;
          font-weight: 700;
        }

        h3 {
          margin: 0;
          color: #ffffff;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .heroPriceBox {
          min-width: 200px;
          padding: 14px 16px;
          border: 1px solid rgba(251, 191, 36, 0.22);
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.34);
          backdrop-filter: blur(10px);
          box-shadow: 0 12px 28px rgba(2, 6, 23, 0.24);
        }

        .heroPriceBox strong {
          display: block;
          color: #ffffff;
          font-size: 24px;
          line-height: 1.12;
        }

        .heroPriceBox span {
          display: block;
          margin-top: 8px;
          color: #fbbf24;
          font-size: 12px;
          font-weight: 800;
        }

        .listingContent {
          padding: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(10, 18, 34, 0.98),
              rgba(20, 31, 56, 0.96)
            );
          color: #f8fafc;
        }

        .propertyFacts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .factBox {
          padding: 15px 14px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.055);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .factBox strong {
          display: block;
          color: #ffffff;
          font-size: 28px;
          line-height: 1;
        }

        .factBox span {
          display: block;
          margin-top: 7px;
          color: rgba(226, 232, 240, 0.65);
          font-size: 13px;
          font-weight: 700;
        }

        .highlightList {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .highlightList span {
          padding: 8px 12px;
          border: 1px solid rgba(251, 191, 36, 0.28);
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.11);
          color: #fbbf24;
          font-size: 12px;
          font-weight: 800;
        }

        .listingFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
        }

        .listingFooter > span {
          color: rgba(203, 213, 225, 0.58);
          font-size: 12px;
        }

        .openButton {
          display: inline-flex;
          min-height: 50px;
          padding: 0 12px 0 20px;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border: 1px solid rgba(251, 191, 36, 0.75);
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            #fbbf24 0%,
            #f59e0b 52%,
            #d97706 100%
          );
          color: #111827;
          font-weight: 900;
          text-decoration: none;
          box-shadow:
            0 14px 30px rgba(245, 158, 11, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            filter 180ms ease;
        }

        .openButton::after {
          content: "→";
          display: inline-flex;
          width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(17, 24, 39, 0.16);
          color: #111827;
          font-size: 18px;
          font-weight: 900;
          line-height: 1;
        }

        .openButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.05);
          box-shadow:
            0 19px 38px rgba(245, 158, 11, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .statusBox,
        .errorBox,
        .emptyBox {
          display: flex;
          min-height: 330px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 36px;
          border: 1px solid rgba(251, 191, 36, 0.22);
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(15, 23, 42, 0.8),
              rgba(30, 41, 59, 0.64)
            );
          color: #ffffff;
          text-align: center;
          backdrop-filter: blur(12px);
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.26);
        }

        .statusBox span,
        .errorBox span,
        .emptyBox p {
          margin-top: 8px;
          color: rgba(226, 232, 240, 0.74);
        }

        .spinner {
          width: 38px;
          height: 38px;
          margin-bottom: 18px;
          border: 4px solid rgba(251, 191, 36, 0.22);
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 800ms linear infinite;
        }

        .errorBox {
          border-color: rgba(248, 113, 113, 0.36);
          background: rgba(127, 29, 29, 0.28);
        }

        .errorBox button {
          margin-top: 20px;
          padding: 11px 17px;
          border: 1px solid rgba(248, 113, 113, 0.45);
          border-radius: 10px;
          background: #dc2626;
          color: #ffffff;
          font-weight: 900;
          cursor: pointer;
        }

        .emptyIcon {
          color: #fbbf24;
          font-size: 60px;
        }

        .emptyBox h2 {
          margin: 14px 0 0;
          color: #ffffff;
        }

        .emptyButton {
          margin-top: 22px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .openButton {
          display: inline-flex !important;
          min-width: 190px !important;
          min-height: 52px !important;
          padding: 0 11px 0 20px !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 16px !important;
          border: 1px solid #fcd34d !important;
          border-radius: 15px !important;
          background: linear-gradient(
            135deg,
            #fcd34d 0%,
            #fbbf24 28%,
            #f59e0b 65%,
            #d97706 100%
          ) !important;
          color: #111827 !important;
          font-size: 14px !important;
          font-weight: 900 !important;
          text-decoration: none !important;
          box-shadow:
            0 15px 32px rgba(245, 158, 11, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            filter 180ms ease !important;
        }

        .openButton::after {
          content: "→";
          display: inline-flex;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(17, 24, 39, 0.15);
          color: #111827;
          font-size: 19px;
          font-weight: 900;
          line-height: 1;
        }

        .openButton:hover {
          transform: translateY(-2px) !important;
          filter: brightness(1.06);
          box-shadow:
            0 20px 40px rgba(245, 158, 11, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
        }
        @media (max-width: 900px) {
          .cockpitHero {
            align-items: stretch;
            flex-direction: column;
          }

          .newListingButton {
            width: 100%;
          }

          .statsRow {
            grid-template-columns: 1fr;
          }

          .visualBottom {
            flex-direction: column;
            align-items: stretch;
          }

          .heroPriceBox {
            min-width: 0;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .cockpitPage {
            padding: 30px 14px 65px;
          }

          .listingGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(390px, 1fr));
          gap: 24px;
        }

          .listingVisual {
            min-height: 250px;
            padding: 18px;
          }

          .visualIconWrap {
            width: 92px;
            height: 92px;
          }

          .houseIcon {
            font-size: 60px;
          }

          h3 {
            font-size: 24px;
          }

          .listingContent {
          padding: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(10, 18, 34, 0.98),
              rgba(20, 31, 56, 0.96)
            );
          color: #f8fafc;
        }

          .propertyFacts {
            grid-template-columns: 1fr;
          }

          .listingFooter {
            align-items: stretch;
            flex-direction: column;
          }

          .openButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}








