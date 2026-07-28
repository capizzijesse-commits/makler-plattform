"use client";

import { useState } from "react";

const plans = [
  {
    name: "Demo",
    label: "Kostenlos kennenlernen",
    price: "0 CHF",
    cadence: "ohne Abonnement",
    text: "Teste Inserat-AI mit einer kostenlosen Textgenerierung und drei Varianten. Bilder, Bildanalyse und vollständige Exporte sind nicht Bestandteil der Demo.",
    button: "Kostenlos registrieren",
    href: "/register",
    external: false,
    highlighted: false,
    features: [
      "Kostenlose Registrierung",
      "1 kostenlose Textgenerierung mit 3 Varianten",
      "Keine Bilder und keine Bildanalyse",
      "Keine automatische Abbuchung",
    ],
  },
  {
    name: "Founder",
    label: "Für die ersten 50 Makler",
    price: "19.90 CHF",
    cadence: "pro Monat",
    text: "Der vollständige Basis-Arbeitsbereich für Makler, die mehrere Immobilien professionell vermarkten.",
    button: "Founder abonnieren",
    href: "#",
    external: false,
    highlighted: true,
    features: [
      "Mehrere Immobilien im Makler-Cockpit",
      "3 professionelle Inserat-Varianten pro Objekt",
      "Bis zu 10 Objektbilder pro Immobilie",
      "Standard-Bildanalyse und Bildverwaltung",
      "Social-Media-Texte",
      "Professionelles Exposé mit PDF-Export",
      "Objekte, Texte und Bilder dauerhaft speichern",
    ],
  },
  {
    name: "Pro",
    label: "Premium-Vermarktung",
    price: "79.90 CHF",
    cadence: "pro Monat",
    text: "Für Makler, die zusätzlich AI-Bildfunktionen, Video-Touren und Premium-Automatisierungen einsetzen.",
    button: "Pro in Vorbereitung",
    href: "#preise",
    external: false,
    highlighted: false,
    features: [
      "Alles aus Founder",
      "Bis zu 10 Objektbilder pro Immobilie",
      "Virtuelles Home Staging",
      "3D-Video-Tour mit AI-Stimmen",
      "Erweiterte Bildanalyse",
      "3 Inserate gleichzeitig = 9 Varianten",
      "Publishing-Center und Secret Marketing – in Entwicklung",
    ],
  },
] as const;

const FOUNDER_CHECKOUT_AVAILABLE = true;

export default function PricingSection() {
  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [checkoutError, setCheckoutError] =
    useState("");

  async function startFounderCheckout() {
    if (checkoutLoading) {
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError("");

      const response = await fetch(
        "/api/payments/subscription/checkout",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: "founder",
          }),
        }
      );

      const data = (await response
        .json()
        .catch(() => null)) as
        | {
            success?: boolean;
            url?: string;
            loginRequired?: boolean;
            verificationRequired?: boolean;
            error?: string;
          }
        | null;

      if (
        response.status === 401 ||
        data?.loginRequired
      ) {
        window.location.assign(
          "/register?plan=founder"
        );
        return;
      }

      if (
        !response.ok ||
        !data?.success ||
        !data.url
      ) {
        const checkoutMessage =
          data?.error ||
          "Der Founder-Checkout konnte nicht gestartet werden.";

        const founderAlreadyExists =
          checkoutMessage.includes(
            "bereits ein Founder-Abonnement"
          );

        setCheckoutError(
          founderAlreadyExists
            ? "Founder-Abonnement bereits vorhanden. Für dieses Konto besteht bereits ein aktives oder begonnenes Founder-Abonnement. Du kannst es unter Mein Konto verwalten."
            : checkoutMessage
        );

        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      console.warn(
        "FOUNDER CHECKOUT HINWEIS:",
        error
      );

      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Der Founder-Checkout konnte nicht gestartet werden."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  const isFounderExistingNotice =
    checkoutError.startsWith(
      "Founder-Abonnement bereits vorhanden."
    );

  return (
    <section id="preise" className="pricingSection">
      <div className="pricingShell">
        <header className="pricingHeader">
          <span className="pricingEyebrow">
            TRANSPARENTE PREISE
          </span>

          <h2>Das passende Angebot für deinen Bedarf</h2>

          <p>
            Wähle zwischen einer einzelnen Immobilie ohne
            Abonnement, dem Founder-Basiszugang für Makler oder
            dem Pro-Angebot mit Premiumfunktionen.
          </p>
        </header>

        <article className="singleObjectCard">
          <div className="singleObjectMain">
            <div className="singleObjectBadge">
              OHNE ABONNEMENT
            </div>

            <h3>Einzelimmobilie</h3>

            <p className="singleObjectDescription">
              Ein hochwertiger Arbeitsbereich für genau eine
              Immobilie. Einmal CHF 9.90 bezahlen und nur dieses
              konkrete Objekt mit bis zu 5 Objektbildern
              freischalten – ohne Abonnement.
            </p>

            <div className="singleObjectFeatures">
              {[
                "1 konkrete Immobilie freischalten",
                "3 professionelle Inserat-Varianten",
                "Bis zu 5 Objektbilder mit Standard-Bildanalyse",
                "Social-Media-Texte",
                "Professionelles Exposé mit PDF-Export",
                "Objekt, Texte und Bilder dauerhaft speichern",
                "Keine monatlichen Kosten",
              ].map((feature) => (
                <div
                  className="singleObjectFeature"
                  key={feature}
                >
                  <span>✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="singleObjectPriceBox">
            <span className="singleObjectPriceLabel">
              EINMALIG
            </span>

            <div className="singleObjectPrice">
              <span>CHF</span>
              <strong>9.90</strong>
            </div>

            <p>pro Immobilie</p>

            <a
              href="/register?plan=single-object"
              className="singleObjectButton"
            >
              Einzelimmobilie starten
              <span aria-hidden="true">→</span>
            </a>

            <small>
              Kein Makler-Abonnement und kein Zugriff auf
              Pro-Funktionen.
            </small>
          </div>
        </article>

        {checkoutError && (
          <div
            role={
              isFounderExistingNotice
                ? "status"
                : "alert"
            }
            aria-live="polite"
            style={{
              maxWidth: 760,
              margin: "0 auto 22px",
              padding: "15px 17px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              border: isFounderExistingNotice
                ? "1px solid rgba(245,189,33,.58)"
                : "1px solid rgba(248,113,113,.55)",
              borderRadius: 15,
              background: isFounderExistingNotice
                ? "linear-gradient(135deg, rgba(15,23,42,.97), rgba(92,63,14,.9))"
                : "rgba(127,29,29,.88)",
              color: "#fff",
              fontWeight: 800,
              lineHeight: 1.5,
              boxShadow: isFounderExistingNotice
                ? "0 16px 38px rgba(245,189,33,.12)"
                : "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                color: isFounderExistingNotice
                  ? "#f5bd21"
                  : "#fecaca",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              {isFounderExistingNotice
                ? "✓"
                : "!"}
            </span>

            <span>{checkoutError}</span>
          </div>
        )}

        <div className="plansGrid">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                plan.highlighted
                  ? "planCard planCardHighlighted"
                  : "planCard"
              }
            >
              <div className="planTop">
                <span className="planLabel">
                  {plan.label}
                </span>

                <h3>{plan.name}</h3>

                <div className="planPrice">
                  {plan.price}
                </div>

                <div className="planCadence">
                  {plan.cadence}
                </div>

                <p className="planDescription">
                  {plan.text}
                </p>
              </div>

              <ul className="planFeatures">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.name === "Founder" ? (
                <button
                  type="button"
                  onClick={startFounderCheckout}
                  disabled={
                    !FOUNDER_CHECKOUT_AVAILABLE ||
                    checkoutLoading
                  }
                  className="planButton planButtonHighlighted"
                  style={{
                    border: 0,
                    cursor:
                      !FOUNDER_CHECKOUT_AVAILABLE
                        ? "not-allowed"
                        : checkoutLoading
                          ? "wait"
                          : "pointer",
                    opacity:
                      FOUNDER_CHECKOUT_AVAILABLE
                        ? 1
                        : 0.68,
                    font: "inherit",
                  }}
                >
                  {!FOUNDER_CHECKOUT_AVAILABLE
                    ? "Founder-Zugang ab morgen verfügbar"
                    : checkoutLoading
                      ? "Founder-Checkout wird geöffnet …"
                      : plan.button}
                  <span aria-hidden="true">→</span>
                </button>
              ) : plan.name === "Pro" ? (
                <button
                  type="button"
                  disabled
                  className="planButton"
                  style={{
                    border: 0,
                    font: "inherit",
                    opacity: 0.62,
                    cursor: "not-allowed",
                  }}
                >
                  {plan.button}
                  <span aria-hidden="true">🔒</span>
                </button>
              ) : (
                <a
                  href={plan.href}
                  className="planButton"
                >
                  {plan.button}
                  <span aria-hidden="true">→</span>
                </a>
              )}
            </article>
          ))}
        </div>

        <div className="agencyTeaser">
          <div>
            <span className="agencyLabel">
              FÜR TEAMS UND IMMOBILIENBÜROS
            </span>

            <strong>Agency</strong>

            <p>
              Mehrere Benutzer, gemeinsame Objekte,
              Berechtigungen und Firmenbranding.
            </p>
          </div>

          <div className="agencyStatus">
            <span>149.90 CHF / Monat</span>
            <strong>Demnächst verfügbar</strong>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pricingSection {
          width: 100%;
          padding: 78px 20px;
          box-sizing: border-box;
          color: #ffffff;
          background:
            radial-gradient(
              circle at 15% 5%,
              rgba(37, 99, 235, 0.18),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 20%,
              rgba(245, 158, 11, 0.16),
              transparent 28%
            ),
            linear-gradient(
              145deg,
              #020617 0%,
              #071020 48%,
              #0f172a 100%
            );
        }

        .pricingShell {
          width: min(1220px, 100%);
          margin: 0 auto;
        }

        .pricingHeader {
          max-width: 760px;
          margin: 0 auto 34px;
          text-align: center;
        }

        .pricingEyebrow {
          display: inline-flex;
          padding: 8px 13px;
          border: 1px solid rgba(251, 191, 36, 0.34);
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.15em;
        }

        .pricingHeader h2 {
          margin: 18px 0 12px;
          color: #ffffff;
          font-size: clamp(34px, 5vw, 54px);
          line-height: 1.05;
          letter-spacing: -0.045em;
        }

        .pricingHeader p {
          margin: 0;
          color: rgba(226, 232, 240, 0.72);
          font-size: 17px;
          line-height: 1.65;
        }

        .singleObjectCard {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(250px, 320px);
          gap: 34px;
          padding: 34px;
          border: 1px solid rgba(251, 191, 36, 0.44);
          border-radius: 26px;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(245, 158, 11, 0.18),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              rgba(15, 23, 42, 0.98),
              rgba(30, 41, 59, 0.94)
            );
          box-shadow:
            0 28px 70px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .singleObjectBadge {
          display: inline-flex;
          padding: 7px 11px;
          border-radius: 999px;
          background: #f59e0b;
          color: #111827;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.13em;
        }

        .singleObjectMain h3 {
          margin: 17px 0 10px;
          color: #ffffff;
          font-size: clamp(30px, 4vw, 44px);
          letter-spacing: -0.035em;
        }

        .singleObjectDescription {
          max-width: 720px;
          margin: 0;
          color: rgba(226, 232, 240, 0.76);
          font-size: 16px;
          line-height: 1.65;
        }

        .singleObjectFeatures {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px 22px;
          margin-top: 26px;
        }

        .singleObjectFeature {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.45;
        }

        .singleObjectFeature > span:first-child {
          color: #fbbf24;
          font-weight: 950;
        }

        .singleObjectPriceBox {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 25px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: rgba(2, 6, 23, 0.58);
          text-align: center;
        }

        .singleObjectPriceLabel {
          color: #fbbf24;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .singleObjectPrice {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 8px;
          margin-top: 9px;
          color: #ffffff;
        }

        .singleObjectPrice span {
          padding-top: 12px;
          color: #fbbf24;
          font-size: 16px;
          font-weight: 900;
        }

        .singleObjectPrice strong {
          font-size: clamp(50px, 6vw, 70px);
          line-height: 1;
          letter-spacing: -0.06em;
        }

        .singleObjectPriceBox p {
          margin: 6px 0 20px;
          color: rgba(226, 232, 240, 0.62);
          font-size: 13px;
        }

        .singleObjectButton,
        .planButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 50px;
          padding: 0 18px;
          border-radius: 13px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .singleObjectButton {
          background:
            linear-gradient(
              135deg,
              #fcd34d,
              #f59e0b
            );
          color: #111827;
          box-shadow:
            0 14px 28px rgba(245, 158, 11, 0.24);
        }

        .singleObjectButton:hover,
        .planButton:hover {
          transform: translateY(-2px);
        }

        .singleObjectPriceBox small {
          margin-top: 13px;
          color: rgba(226, 232, 240, 0.48);
          font-size: 10px;
          line-height: 1.45;
        }

        .plansGrid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 20px;
          margin-top: 22px;
        }

        .planCard {
          display: flex;
          min-width: 0;
          min-height: 530px;
          flex-direction: column;
          padding: 28px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 22px;
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
        }

        .planCardHighlighted {
          border: 2px solid #f59e0b;
          background:
            linear-gradient(
              145deg,
              #fffbeb,
              #ffffff
            );
          box-shadow:
            0 22px 55px rgba(245, 158, 11, 0.22);
          transform: translateY(-6px);
        }

        .planLabel {
          display: inline-flex;
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .planCardHighlighted .planLabel {
          background: #f59e0b;
          color: #ffffff;
        }

        .planCard h3 {
          margin: 20px 0 10px;
          font-size: 25px;
          letter-spacing: -0.025em;
        }

        .planPrice {
          color: #0f172a;
          font-size: clamp(29px, 3vw, 38px);
          font-weight: 950;
          line-height: 1.08;
          letter-spacing: -0.045em;
        }

        .planCadence {
          min-height: 22px;
          margin-top: 8px;
          color: #d97706;
          font-size: 13px;
          font-weight: 850;
        }

        .planDescription {
          min-height: 70px;
          margin: 14px 0 20px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.55;
        }

        .planFeatures {
          display: grid;
          gap: 12px;
          margin: 0 0 24px;
          padding: 0;
          list-style: none;
        }

        .planFeatures li {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: #334155;
          font-size: 13px;
          line-height: 1.45;
        }

        .planFeatures li > span:first-child {
          color: #f59e0b;
          font-weight: 950;
        }

        .planButton {
          margin-top: auto;
          background: #0f172a;
          color: #ffffff;
        }

        .planButtonHighlighted {
          background:
            linear-gradient(
              135deg,
              #f59e0b,
              #d97706
            );
          box-shadow:
            0 13px 26px rgba(245, 158, 11, 0.22);
        }

        .agencyTeaser {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: 22px;
          padding: 23px 27px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 19px;
          background: rgba(15, 23, 42, 0.7);
        }

        .agencyLabel {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .agencyTeaser strong {
          display: block;
          margin-top: 6px;
          color: #ffffff;
          font-size: 21px;
        }

        .agencyTeaser p {
          margin: 5px 0 0;
          color: rgba(226, 232, 240, 0.58);
          font-size: 13px;
        }

        .agencyStatus {
          flex-shrink: 0;
          text-align: right;
        }

        .agencyStatus span {
          display: block;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 800;
        }

        .agencyStatus strong {
          margin-top: 5px;
          color: #fbbf24;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .singleObjectCard {
            grid-template-columns: 1fr;
          }

          .plansGrid {
            grid-template-columns: 1fr;
          }

          .planCard,
          .planCardHighlighted {
            min-height: 0;
            transform: none;
          }

          .planDescription {
            min-height: 0;
          }
        }

        @media (max-width: 640px) {
          .pricingSection {
            padding: 55px 14px;
          }

          .singleObjectCard {
            padding: 23px;
            border-radius: 20px;
          }

          .singleObjectFeatures {
            grid-template-columns: 1fr;
          }

          .singleObjectPriceBox {
            padding: 22px 17px;
          }

          .planCard {
            padding: 23px;
          }

          .agencyTeaser {
            align-items: flex-start;
            flex-direction: column;
          }

          .agencyStatus {
            text-align: left;
          }
        }
      `}</style>
    </section>
  );
}