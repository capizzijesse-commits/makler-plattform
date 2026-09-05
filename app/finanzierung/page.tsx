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
                IMMOBILIEN
              </span>

              <h2>
                Objekt auswählen
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
          listings.length === 0 ? (
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
          listings.length > 0 ? (
            <div className="financeObjectGrid">
              {listings.map(
                (listing) => {
                  const title =
                    listing.location?.trim() ||
                    listing.propertyType?.trim() ||
                    "Immobilie";

                  return (
                    <article
                      key={listing.id}
                      className="financeObjectCard"
                    >
                      <div className="financeObjectTop">
                        <span className="financeObjectBadge">
                          {listing.propertyType ||
                            "Objekt"}
                        </span>

                        <span className="financeObjectStatus">
                          {listing.hasCoreAccess ===
                          false
                            ? "Nicht freigeschaltet"
                            : "Bereit"}
                        </span>
                      </div>

                      <h3>
                        {title}
                      </h3>

                      <p className="financePrice">
                        {formatPrice(
                          listing.price
                        )}
                      </p>

                      {listing.hasCoreAccess === false ? (
                        <Link
                          href={
                            "/cockpit/" +
                            listing.id
                          }
                          className="financeOpenButton locked"
                        >
                          Objekt freischalten
                          <span>→</span>
                        </Link>
                      ) : (
                        <Link
                          href={
                            "/marketing-hub/finance/" +
                            listing.id
                          }
                          className="financeOpenButton"
                        >
                          Finanzierung öffnen
                          <span>→</span>
                        </Link>
                      )}
                    </article>
                  );
                }
              )}
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
            .financeObjectGrid {
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