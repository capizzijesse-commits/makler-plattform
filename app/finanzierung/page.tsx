"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import WorkspaceFrame from "../components/WorkspaceFrame";

import {
  getInseratAiMarketFromHostname,
  INSERAT_AI_MARKET_STORAGE_KEY,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";


type FinanceListing = {
  id: string;
  market?: InseratAiMarket | null;
  location?: string | null;
  propertyType?: string | null;
  price?: number | null;
  hasCoreAccess?: boolean;
};

type ListingsResponse = {
  success?: boolean;
  listings?: FinanceListing[];
  error?: string;
};


export default function FinanceOverviewPage() {
  const [market, setMarket] =
    useState<InseratAiMarket>("CH");

  const [listings, setListings] =
    useState<FinanceListing[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedListingId,
    setSelectedListingId,
  ] = useState("");


  useEffect(() => {
    const hostnameMarket =
      getInseratAiMarketFromHostname(
        window.location.hostname
      );

    const stored =
      localStorage.getItem(
        INSERAT_AI_MARKET_STORAGE_KEY
      );

    const storedMarket =
      stored === "DE" || stored === "CH"
        ? stored
        : null;

    setMarket(
      hostnameMarket ??
        storedMarket ??
        "CH"
    );
  }, []);


  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/listings",
            {
              credentials: "include",
              cache: "no-store",
            }
          );

        if (response.status === 401) {
          window.location.href =
            "/login";
          return;
        }

        const data =
          (await response.json()) as
            ListingsResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Objekte konnten nicht geladen werden."
          );
        }

        if (cancelled) {
          return;
        }

        setListings(
          Array.isArray(data.listings)
            ? data.listings
            : []
        );
      } catch (caught) {
        if (cancelled) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Objekte konnten nicht geladen werden."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      cancelled = true;
    };
  }, []);


  const currency =
    market === "DE"
      ? "EUR"
      : "CHF";

  const marketName =
    market === "DE"
      ? "Deutschland"
      : "Schweiz";


  const visibleListings =
    listings.filter(
      (listing) =>
        listing.market === market
    );

  useEffect(() => {
    setSelectedListingId(
      (current) => {
        if (
          visibleListings.some(
            (listing) =>
              listing.id === current
          )
        ) {
          return current;
        }

        return (
          visibleListings[0]?.id ??
          ""
        );
      }
    );
  }, [listings, market]);

  const selectedListing =
    visibleListings.find(
      (listing) =>
        listing.id ===
        selectedListingId
    ) ??
    visibleListings[0] ??
    null;

  const selectedListingTitle =
    selectedListing?.location?.trim() ||
    selectedListing?.propertyType?.trim() ||
    "Immobilie";

  const selectedFinanceHref =
    selectedListing
      ? selectedListing.hasCoreAccess ===
        false
        ? "/cockpit/" +
          selectedListing.id
        : "/marketing-hub/finance/" +
          selectedListing.id
      : "#";

  function formatPrice(
    value: number | null | undefined
  ) {
    if (
      value == null ||
      !Number.isFinite(value)
    ) {
      return "Preis noch offen";
    }

    return new Intl.NumberFormat(
      market === "DE"
        ? "de-DE"
        : "de-CH",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }
    ).format(value);
  }


  return (
    <WorkspaceFrame
      market={market}
      active="finance"
      title="Finanzierung"
    >
      <main className="financeWorkspace">
        <section className="financeHero">
          <div>
            <span className="financeEyebrow">
              INSERAT-AI FINANZIERUNG
            </span>

            <h1>
              Finanzierung &amp;
              Preisstrategie
            </h1>

            <p>
              Preise, Provisionen und
              Finanzierungsdaten deiner
              Immobilien zentral verwalten.
            </p>
          </div>

          <div className="financeMarketCard">
            <small>
              AKTIVER MARKT
            </small>

            <strong>
              {marketName}
            </strong>

            <span>
              {currency}
            </span>
          </div>
        </section>


        <section className="financeIntroGrid">
          <article>
            <span className="financeIcon financeCurrencyIcon">
              {market === "DE"
                ? "€"
                : "CHF"}
            </span>

            <div>
              <strong>
                Preisstrategie
              </strong>

              <p>
                Angebotspreis,
                Preisuntergrenze und
                Provision zentral erfassen.
              </p>
            </div>
          </article>

          <article>
            <span className="financeIcon">
              %
            </span>

            <div>
              <strong>
                Käufer-Finanzierung
              </strong>

              <p>
                Finanzierungswerte passend
                zum jeweiligen Markt
                berechnen.
              </p>
            </div>
          </article>

          <article>
            <span className="financeIcon">
              ↗
            </span>

            <div>
              <strong>
                Entscheidungsgrundlage
              </strong>

              <p>
                Finanzielle Eckdaten direkt
                mit dem jeweiligen Objekt
                verbinden.
              </p>
            </div>
          </article>
        </section>


        <section className="financeObjects">
          <div className="financeSectionHead">
            <div>
              <span>
                FINANZ-CONTROL-CENTER
              </span>

              <h2>
                Finanzierungsobjekt
              </h2>
            </div>

            <Link href="/dashboard">
              + Neues Inserat
            </Link>
          </div>


          {loading ? (
            <div className="financeState">
              Objekte werden geladen …
            </div>
          ) : null}


          {!loading && error ? (
            <div className="financeState error">
              {error}
            </div>
          ) : null}


          {!loading &&
          !error &&
          visibleListings.length === 0 ? (
            <div className="financeEmpty">
              <strong>
                Noch kein Objekt vorhanden
              </strong>

              <p>
                Erstelle zuerst ein Inserat.
                Danach kannst du hier die
                Finanzdaten verwalten.
              </p>

              <Link href="/dashboard">
                Inserat erstellen
              </Link>
            </div>
          ) : null}


          {!loading &&
          !error &&
          selectedListing ? (
            <div className="financeControlGrid">
              <section className="financeSelectorCard">
                <span className="financePanelEyebrow">
                  OBJEKT
                </span>

                <h3>
                  Objekt auswählen
                </h3>

                <p>
                  Wähle die Immobilie, deren
                  Preis- und Finanzierungsdaten
                  du bearbeiten möchtest.
                </p>

                <label className="financeSelectLabel">
                  Immobilienobjekt
                  <select
                    value={
                      selectedListing.id
                    }
                    onChange={(event) =>
                      setSelectedListingId(
                        event.target.value
                      )
                    }
                    className="financeSelect"
                  >
                    {visibleListings.map(
                      (listing) => {
                        const title =
                          listing.location?.trim() ||
                          listing.propertyType?.trim() ||
                          "Immobilie";

                        return (
                          <option
                            key={listing.id}
                            value={listing.id}
                          >
                            {title}
                            {" · "}
                            {listing.propertyType ||
                              "Objekt"}
                          </option>
                        );
                      }
                    )}
                  </select>
                </label>

                <div className="financeSelectorHint">
                  Keine zweite Objektverwaltung:
                  Hier wählst du nur aus, womit
                  du finanziell arbeiten willst.
                </div>
              </section>


              <section className="financeSelectedCard">
                <div className="financeSelectedHeader">
                  <div>
                    <span className="financePanelEyebrow">
                      AUSGEWÄHLTES OBJEKT
                    </span>

                    <h3>
                      {selectedListingTitle}
                    </h3>

                    <p>
                      {selectedListing.propertyType ||
                        "Immobilie"}
                      {" · "}
                      {marketName}
                    </p>
                  </div>

                  <span
                    className={
                      selectedListing.hasCoreAccess ===
                      false
                        ? "financeAccessBadge locked"
                        : "financeAccessBadge"
                    }
                  >
                    {selectedListing.hasCoreAccess ===
                    false
                      ? "Nicht freigeschaltet"
                      : "Bereit"}
                  </span>
                </div>


                <div className="financeSelectedGrid">
                  <article className="financeMetric">
                    <small>
                      ANGEBOTSPREIS
                    </small>

                    <strong>
                      {formatPrice(
                        selectedListing.price
                      )}
                    </strong>
                  </article>

                  <article className="financeMetric">
                    <small>
                      MARKT
                    </small>

                    <strong>
                      {marketName}
                    </strong>

                    <span>
                      {currency}
                    </span>
                  </article>

                  <article className="financeMetric">
                    <small>
                      FINANZSTATUS
                    </small>

                    <strong>
                      {selectedListing.hasCoreAccess ===
                      false
                        ? "Gesperrt"
                        : "Aktiv"}
                    </strong>
                  </article>
                </div>


                <div
                  className={
                    selectedListing.hasCoreAccess ===
                    false
                      ? "financeWorkflow locked"
                      : "financeWorkflow"
                  }
                >
                  <div className="financeWorkflowStep">
                    <span>01</span>

                    <div>
                      <strong>
                        Preisstrategie
                      </strong>

                      <small>
                        Angebotspreis,
                        Preisuntergrenze &
                        Provision
                      </small>
                    </div>
                  </div>

                  <div className="financeWorkflowStep">
                    <span>02</span>

                    <div>
                      <strong>
                        Käufer-Finanzierung
                      </strong>

                      <small>
                        Eigenkapital &
                        Finanzierungs-Check
                      </small>
                    </div>
                  </div>

                  <div className="financeWorkflowStep">
                    <span>03</span>

                    <div>
                      <strong>
                        Entscheidung
                      </strong>

                      <small>
                        Finanzielle Eckdaten
                        auf einen Blick
                      </small>
                    </div>
                  </div>
                </div>


                {selectedListing.hasCoreAccess ===
                false ? (
                  <div className="financeLockedNotice">
                    <span aria-hidden="true">
                      🔒
                    </span>

                    <div>
                      <strong>
                        Nach Freischaltung verfügbar
                      </strong>

                      <small>
                        Preisstrategie,
                        Käufer-Finanzierung und
                        Entscheidungsdaten werden
                        nach der Objektfreischaltung
                        aktiviert.
                      </small>
                    </div>
                  </div>
                ) : null}

                <Link
                  href={selectedFinanceHref}
                  className={
                    selectedListing.hasCoreAccess ===
                    false
                      ? "financeLaunchButton locked"
                      : "financeLaunchButton"
                  }
                  style={{
                    display: "flex",
                    width: "fit-content",
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    gap: 14,
                    marginTop: 16,
                    marginLeft: "auto",
                    padding: "0 16px",
                    borderRadius: 13,
                    border:
                      selectedListing.hasCoreAccess ===
                      false
                        ? "1px solid rgba(245,158,11,.55)"
                        : "1px solid rgba(5,150,105,.28)",
                    background:
                      selectedListing.hasCoreAccess ===
                      false
                        ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                        : "linear-gradient(135deg,#047857,#0f766e)",
                    color:
                      selectedListing.hasCoreAccess ===
                      false
                        ? "#071426"
                        : "#ffffff",
                    fontSize: 11,
                    fontWeight: 900,
                    textDecoration: "none",
                    boxShadow:
                      selectedListing.hasCoreAccess ===
                      false
                        ? "0 12px 28px rgba(245,158,11,.20)"
                        : "0 12px 28px rgba(15,118,110,.18)",
                  }}
                >
                  <span>
                    {selectedListing.hasCoreAccess ===
                    false
                      ? "Objekt freischalten"
                      : "Finanz-Cockpit öffnen"}
                  </span>

                  <strong>
                    →
                  </strong>
                </Link>

                <p className="financeDisclaimer">
                  Finanzierungswerte dienen
                  der internen Orientierung
                  und ersetzen keine
                  individuelle Finanzberatung.
                </p>
              </section>
            </div>
          ) : null}
        </section>


        <style jsx>{`
          .financeWorkspace {
            min-height: calc(100vh - 84px);
            padding: 22px 28px 48px;
            background:
              radial-gradient(
                circle at 82% 5%,
                rgba(16,185,129,.09),
                transparent 30%
              ),
              #eef4f8;
            color: #10213a;
          }

          .financeHero {
            display: flex;
            min-height: 205px;
            align-items: center;
            justify-content: space-between;
            gap: 32px;
            padding: 34px 40px;
            border:
              1px solid rgba(15,118,110,.18);
            border-radius: 24px;
            background:
              radial-gradient(
                circle at 86% 30%,
                rgba(52,211,153,.20),
                transparent 36%
              ),
              linear-gradient(
                120deg,
                #06192c 0%,
                #0b2b35 56%,
                #0f514b 100%
              );
            box-shadow:
              0 22px 50px
              rgba(15,23,42,.10);
            color: white;
          }

          .financeEyebrow {
            color: #6ee7b7;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .18em;
          }

          .financeHero h1 {
            margin: 10px 0 8px;
            font-size: clamp(
              32px,
              4vw,
              50px
            );
            font-weight: 900;
            letter-spacing: -.04em;
          }

          .financeHero p {
            max-width: 680px;
            margin: 0;
            color: #cbd9e7;
            font-size: 15px;
            line-height: 1.7;
          }

          .financeMarketCard {
            display: flex;
            min-width: 180px;
            flex-direction: column;
            padding: 22px;
            border:
              1px solid rgba(110,231,183,.22);
            border-radius: 18px;
            background:
              rgba(4,24,35,.54);
            box-shadow:
              inset 0 1px 0
              rgba(255,255,255,.04);
          }

          .financeMarketCard small {
            color: #7dd3c0;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .14em;
          }

          .financeMarketCard strong {
            margin-top: 7px;
            font-size: 18px;
          }

          .financeMarketCard span {
            margin-top: 5px;
            color: #6ee7b7;
            font-size: 12px;
            font-weight: 900;
          }

          .financeIntroGrid {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0,1fr));
            gap: 14px;
            margin-top: 18px;
          }

          .financeIntroGrid article {
            display: flex;
            min-height: 110px;
            align-items: center;
            gap: 15px;
            padding: 20px;
            border:
              1px solid #d9e4ec;
            border-radius: 17px;
            background: white;
            box-shadow:
              0 10px 25px
              rgba(15,23,42,.045);
          }

          .financeIcon {
            display: grid;
            width: 44px;
            height: 44px;
            flex: 0 0 44px;
            place-items: center;
            border-radius: 13px;
            background: #e5f8f1;
            color: #058467;
            font-size: 18px;
            font-weight: 900;
          }

          .financeCurrencyIcon {
            font-size: 12px;
            letter-spacing: -.02em;
          }

          .financeIntroGrid strong {
            font-size: 14px;
          }

          .financeIntroGrid p {
            margin: 5px 0 0;
            color: #6b7e91;
            font-size: 11px;
            line-height: 1.55;
          }

          .financeObjects {
            margin-top: 28px;
          }

          .financeSectionHead {
            display: flex;
            align-items: end;
            justify-content:
              space-between;
            gap: 20px;
            margin-bottom: 14px;
          }

          .financeSectionHead span {
            color: #0f766e;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .18em;
          }

          .financeSectionHead h2 {
            margin: 5px 0 0;
            font-size: 25px;
          }

          .financeSectionHead a {
            color: #0f766e;
            font-size: 11px;
            font-weight: 900;
            text-decoration: none;
          }

          .financeNotice {
            margin-bottom: 15px;
            padding: 16px 18px;
            border:
              1px solid #b7e4d5;
            border-radius: 14px;
            background: #f0fdf8;
          }

          .financeNotice strong {
            color: #08634f;
            font-size: 12px;
          }

          .financeNotice p {
            margin: 5px 0 0;
            color: #527267;
            font-size: 10px;
            line-height: 1.55;
          }

          .financeControlGrid {
            display: grid;
            grid-template-columns:
              minmax(260px, .72fr)
              minmax(0, 1.6fr);
            gap: 16px;
          }

          .financeSelectorCard,
          .financeSelectedCard {
            border:
              1px solid #d8e3ea;
            border-radius: 20px;
            background: white;
            box-shadow:
              0 14px 32px
              rgba(15,23,42,.055);
          }

          .financeSelectorCard {
            align-self: start;
            padding: 24px;
          }

          .financeSelectedCard {
            padding: 26px;
          }

          .financePanelEyebrow {
            color: #0f766e;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .16em;
          }

          .financeSelectorCard h3,
          .financeSelectedCard h3 {
            margin: 7px 0 0;
            color: #10213a;
            font-size: 21px;
            letter-spacing: -.02em;
          }

          .financeSelectorCard > p {
            margin: 8px 0 22px;
            color: #6b7e91;
            font-size: 11px;
            line-height: 1.6;
          }

          .financeSelectLabel {
            display: grid;
            gap: 7px;
            color: #53677c;
            font-size: 10px;
            font-weight: 800;
          }

          .financeSelect {
            width: 100%;
            min-height: 48px;
            padding: 0 38px 0 13px;
            border:
              1px solid #cddbe5;
            border-radius: 12px;
            outline: none;
            background: #f8fbfd;
            color: #10213a;
            font: inherit;
            font-size: 12px;
            font-weight: 700;
          }

          .financeSelect:focus {
            border-color: #0f766e;
            box-shadow:
              0 0 0 3px
              rgba(15,118,110,.10);
          }

          .financeSelectorHint {
            margin-top: 15px;
            padding: 12px 13px;
            border:
              1px solid #d9efe8;
            border-radius: 11px;
            background: #f2fbf8;
            color: #58766d;
            font-size: 9px;
            line-height: 1.55;
          }

          .financeSelectedHeader {
            display: flex;
            align-items: flex-start;
            justify-content:
              space-between;
            gap: 18px;
          }

          .financeSelectedHeader p {
            margin: 6px 0 0;
            color: #718397;
            font-size: 11px;
          }

          .financeAccessBadge {
            flex: 0 0 auto;
            padding: 7px 10px;
            border-radius: 999px;
            background: #e7f8f1;
            color: #047857;
            font-size: 8px;
            font-weight: 900;
          }

          .financeAccessBadge.locked {
            background: #f1f5f9;
            color: #64748b;
          }

          .financeSelectedGrid {
            display: grid;
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
            gap: 10px;
            margin-top: 22px;
          }

          .financeMetric {
            min-height: 100px;
            padding: 16px;
            border:
              1px solid #e0e8ee;
            border-radius: 14px;
            background:
              linear-gradient(
                145deg,
                #f9fcfd,
                #f3f8fa
              );
          }

          .financeMetric small {
            display: block;
            color: #8193a5;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: .09em;
          }

          .financeMetric strong {
            display: block;
            margin-top: 9px;
            color: #10213a;
            font-size: 15px;
          }

          .financeMetric span {
            display: block;
            margin-top: 4px;
            color: #0f766e;
            font-size: 9px;
            font-weight: 900;
          }

          .financeWorkflow {
            display: grid;
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
            gap: 10px;
            margin-top: 12px;
          }

          .financeWorkflow.locked
          .financeWorkflowStep {
            opacity: .45;
            filter:
              grayscale(.18);
            background:
              #f8fafc;
            border-color:
              #e5e9ee;
          }

          .financeWorkflow.locked
          .financeWorkflowStep > span {
            background:
              #eef2f6;
            color:
              #94a3b8;
          }

          .financeLockedNotice {
            display: flex;
            align-items: center;
            gap: 11px;
            margin-top: 14px;
            padding: 12px 14px;
            border:
              1px solid
              #e2e8f0;
            border-radius: 12px;
            background:
              #f8fafc;
            color: #64748b;
          }

          .financeLockedNotice > span {
            display: grid;
            width: 31px;
            height: 31px;
            flex: 0 0 31px;
            place-items: center;
            border-radius: 9px;
            background:
              #eef2f6;
            font-size: 14px;
          }

          .financeLockedNotice div {
            display: grid;
            gap: 3px;
          }

          .financeLockedNotice strong {
            color: #475569;
            font-size: 10px;
          }

          .financeLockedNotice small {
            color: #7c8b9b;
            font-size: 8px;
            line-height: 1.45;
          }

          .financeWorkflowStep {
            display: flex;
            min-height: 78px;
            align-items: center;
            gap: 11px;
            padding: 13px;
            border:
              1px solid #e3eaf0;
            border-radius: 13px;
            background: white;
          }

          .financeWorkflowStep > span {
            display: grid;
            width: 31px;
            height: 31px;
            flex: 0 0 31px;
            place-items: center;
            border-radius: 9px;
            background: #e5f8f1;
            color: #047857;
            font-size: 9px;
            font-weight: 900;
          }

          .financeWorkflowStep div {
            display: grid;
            gap: 3px;
          }

          .financeWorkflowStep strong {
            color: #183047;
            font-size: 10px;
          }

          .financeWorkflowStep small {
            color: #7a8da0;
            font-size: 8px;
            line-height: 1.4;
          }

          .financeLaunchButton {
            display: flex;
            min-height: 50px;
            align-items: center;
            justify-content:
              space-between;
            gap: 14px;
            margin-top: 16px;
            padding: 0 17px;
            border-radius: 13px;
            background:
              linear-gradient(
                135deg,
                #047857,
                #0f766e
              );
            color: white;
            font-size: 11px;
            font-weight: 900;
            text-decoration: none;
            box-shadow:
              0 10px 24px
              rgba(15,118,110,.17);
          }

          .financeLaunchButton.locked {
            background:
              linear-gradient(
                135deg,
                #334155,
                #475569
              );
            box-shadow:
              0 10px 24px
              rgba(51,65,85,.14);
          }

          .financeDisclaimer {
            margin:
              10px 2px 0;
            color: #8494a5;
            font-size: 8px;
            line-height: 1.45;
          }

          .financeObjectGrid {
            display: grid;
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
            gap: 15px;
          }

          .financeObjectCard {
            padding: 20px;
            border:
              1px solid #d8e3ea;
            border-radius: 18px;
            background: white;
            box-shadow:
              0 12px 28px
              rgba(15,23,42,.05);
          }

          .financeObjectTop {
            display: flex;
            align-items: center;
            justify-content:
              space-between;
            gap: 12px;
          }

          .financeObjectBadge,
          .financeObjectStatus {
            padding: 5px 8px;
            border-radius: 8px;
            font-size: 8px;
            font-weight: 900;
          }

          .financeObjectBadge {
            background: #ecfdf5;
            color: #047857;
          }

          .financeObjectStatus {
            background: #f1f5f9;
            color: #64748b;
          }

          .financeObjectCard h3 {
            margin: 17px 0 0;
            overflow: hidden;
            font-size: 17px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .financePrice {
            margin: 7px 0 18px;
            color: #53677c;
            font-size: 12px;
            font-weight: 800;
          }

          .financeOpenButton {
            display: flex;
            width: 100%;
            min-height: 42px;
            align-items: center;
            justify-content:
              space-between;
            padding: 0 14px;
            border: 0;
            border-radius: 11px;
            background:
              linear-gradient(
                135deg,
                #047857,
                #0f766e
              );
            color: white;
            cursor: pointer;
            font-size: 10px;
            font-weight: 900;
            text-decoration: none;
          }

          .financeOpenButton.locked {
            background:
              linear-gradient(
                135deg,
                #334155,
                #475569
              );
          }

          .financeOpenButton.disabled {
            justify-content: center;
            background: #d7e2e8;
            color: #718293;
            cursor: not-allowed;
          }

          .financeState,
          .financeEmpty {
            padding: 30px;
            border:
              1px solid #d8e3ea;
            border-radius: 18px;
            background: white;
            color: #687b8e;
          }

          .financeState.error {
            color: #b42318;
          }

          .financeEmpty strong {
            color: #10213a;
          }

          .financeEmpty p {
            margin: 7px 0 15px;
            font-size: 12px;
          }

          .financeEmpty a {
            color: #047857;
            font-size: 11px;
            font-weight: 900;
          }

          @media (
            max-width: 1000px
          ) {
            .financeIntroGrid,
            .financeObjectGrid,
            .financeControlGrid,
            .financeSelectedGrid,
            .financeWorkflow {
              grid-template-columns:
                1fr;
            }

            .financeHero {
              align-items: flex-start;
              flex-direction: column;
            }

            .financeMarketCard {
              width: 100%;
            }
          }

          @media (
            max-width: 700px
          ) {
            .financeWorkspace {
              padding:
                12px 10px 32px;
            }

            .financeHero {
              padding: 25px 20px;
              border-radius: 18px;
            }

            .financeSectionHead {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}</style>
      </main>
    </WorkspaceFrame>
  );
}