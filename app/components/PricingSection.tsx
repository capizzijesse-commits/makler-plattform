"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { InseratAiMarket } from "@/lib/inserat-ai-market";
type CheckoutError =
  | "existing"
  | "generic"
  | null;

type Plan = {
  id: "demo" | "founder" | "pro";
  name: string;
  label: string;
  price: string;
  cadence: string;
  text: string;
  button: string;
  href: string;
  highlighted: boolean;
  features: string[];
};

type PricingSectionProps = {
  market: InseratAiMarket;
};

export default function PricingSection({
  market,
}: PricingSectionProps) {
  const t = useTranslations("Pricing");
  const isGermany = market === "DE";

  const singleObjectDescription = isGermany
    ? "Nur eine Immobilie? Für 9,90 € einmalig freischalten – ohne Abonnement."
    : t("singleObject.description");

  const singleObjectNote = isGermany
    ? "Einmalzahlung in EUR. Kein Abonnement."
    : t("singleObject.note");

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [checkoutError, setCheckoutError] =
    useState<CheckoutError>(null);

  const plans: Plan[] = [
    {
      id: "demo",
      name: "Demo",
      label: t("plans.demo.label"),
      price: isGermany ? "0 €" : "0 CHF",
      cadence: t("plans.demo.cadence"),
      text: t("plans.demo.description"),
      button: t("plans.demo.button"),
      href: "/register",
      highlighted: false,
      features: [
        t("plans.demo.features.registration"),
        t("plans.demo.features.generation"),
        t("plans.demo.features.noImages"),
        t("plans.demo.features.noBilling"),
      ],
    },
    {
      id: "founder",
      name: "Founder",
      label: t("plans.founder.label"),
      price: isGermany
        ? "30 Tage kostenlos"
        : t("plans.founder.price"),
      cadence: isGermany
        ? "danach 19,90 € / Monat"
        : t("plans.founder.cadence"),
      text: isGermany
        ? "30 Tage kostenlos testen. Die ersten 50 Founder-Kunden sichern sich 19,90 € pro Monat dauerhaft, solange das Abonnement ohne Unterbrechung aktiv bleibt."
        : t("plans.founder.description"),
      button: isGermany
        ? "30 Tage kostenlos starten"
        : t("plans.founder.button"),
      href: "#",
      highlighted: true,
      features: isGermany
        ? [
            "30 Tage kostenlos testen",
            "19,90 € pro Monat dauerhaft für die ersten 50 Founder-Kunden*",
            "Mehrere Immobilien im Makler-Cockpit",
            "3 professionelle Inserat-Varianten pro Objekt",
            "Bis zu 10 Objektbilder pro Immobilie",
            "Bildanalyse, Social-Media-Texte und Marketing Hub",
          ]
        : [
            t("plans.founder.features.trial"),
            t("plans.founder.features.founderGuarantee"),
            t("plans.founder.features.regularPrice"),
            t("plans.founder.features.projects"),
            t("plans.founder.features.variants"),
            t("plans.founder.features.images"),
            t("plans.founder.features.analysis"),
            t("plans.founder.features.social"),
            t("plans.founder.features.marketingHub"),
            t("plans.founder.features.storage"),
          ],
    },
    {
      id: "pro",
      name: "Pro",
      label: t("plans.pro.label"),
      price: isGermany ? "79,90 €" : "79.90 CHF",
      cadence: t("plans.pro.cadence"),
      text: t("plans.pro.description"),
      button: t("plans.pro.button"),
      href: "#preise",
      highlighted: false,
      features: [
        t("plans.pro.features.founder"),
        t("plans.pro.features.images"),
        t("plans.pro.features.staging"),
        t("plans.pro.features.tour"),
        t("plans.pro.features.marketingHub"),
        t("plans.pro.features.analysis"),
        t("plans.pro.features.parallel"),
        t("plans.pro.features.development"),
      ],
    },
  ];

  const visiblePlans = isGermany
    ? plans.filter((plan) => plan.id === "founder")
    : plans;

  const singleObjectFeatures = isGermany
    ? [
        "1 Immobilie freischalten",
        "3 professionelle Inserat-Varianten",
        "Bis zu 5 Objektbilder mit Bildanalyse",
        "Social-Media-Texte und Marketing Hub",
      ]
    : [
        t("singleObject.features.property"),
        t("singleObject.features.variants"),
        t("singleObject.features.images"),
        t("singleObject.features.social"),
        t("singleObject.features.marketingHub"),
        t("singleObject.features.storage"),
        t("singleObject.features.noMonthlyCosts"),
      ];

  async function startFounderCheckout() {

    if (checkoutLoading) {
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

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
  trackAnalyticsEvent(
    "register_cta_click",
    {
      cta_page:
        window.location.pathname,
      requested_plan: "founder",
      cta_text:
        isGermany
          ? "30 Tage kostenlos starten"
          : t("plans.founder.button"),
      transport_type: "beacon",
    }
  );

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
        const message =
          typeof data?.error === "string"
            ? data.error.toLocaleLowerCase(
                "de-CH"
              )
            : "";

        const founderAlreadyExists =
          message.includes("founder") &&
          (
            message.includes("bereits") ||
            message.includes("vorhanden") ||
            message.includes("already")
          );

        setCheckoutError(
          founderAlreadyExists
            ? "existing"
            : "generic"
        );

        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      console.warn(
        "FOUNDER CHECKOUT HINWEIS:",
        error
      );

      setCheckoutError("generic");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const isFounderExistingNotice =
    checkoutError === "existing";

  const checkoutErrorMessage =
    checkoutError === "existing"
      ? t("errors.founderExisting")
      : checkoutError === "generic"
        ? t("errors.checkoutStart")
        : "";

  return (
    <section
      id="preise"
      className={
        isGermany
          ? "pricingSection pricingSectionGermany"
          : "pricingSection"
      }
    >
      <div className="pricingShell">
        <header className="pricingHeader">
          <span className="pricingEyebrow">
            {t("header.eyebrow")}
          </span>

          <h2>
            {isGermany
              ? "30 Tage kostenlos starten. Danach flexibel entscheiden."
              : t("header.title")}
          </h2>

          <p>
            {isGermany
              ? "Founder ist unser empfohlener Einstieg für Makler. Alternativ kannst du eine einzelne Immobilie einmalig für 9,90 € freischalten."
              : t("header.description")}
          </p>
        </header>

        <article className="singleObjectCard">
          <div className="singleObjectMain">
            <div className="singleObjectBadge">
              {t("singleObject.badge")}
            </div>

            <h3>{t("singleObject.name")}</h3>

            <p className="singleObjectDescription">
              {singleObjectDescription}
            </p>

            <div className="singleObjectFeatures">
              {singleObjectFeatures.map(
                (feature) => (
                  <div
                    className="singleObjectFeature"
                    key={feature}
                  >
                    <span>{"\u2713"}</span>
                    <span>{feature}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="singleObjectPriceBox">
            <span className="singleObjectPriceLabel">
              {t("singleObject.priceLabel")}
            </span>

            <div className="singleObjectPrice">
              <span>{isGermany ? "€" : "CHF"}</span>
              <strong>{isGermany ? "9,90" : "9.90"}</strong>
            </div>

            <p>
              {t("singleObject.perProperty")}
            </p>

            <a
              href="/register?plan=single-object"
              className="singleObjectButton"
              onClick={() => {
                trackAnalyticsEvent(
                  "register_cta_click",
                  {
                    cta_page:
                      window.location.pathname,
                    requested_plan:
                      "single-object",
                    cta_text: isGermany
                      ? "Einzelimmobilie starten"
                      : t("singleObject.button"),
                    transport_type: "beacon",
                  }
                );
              }}
            >
              {isGermany
                ? "Einzelimmobilie starten"
                : t("singleObject.button")}
              <span aria-hidden="true">
                {"\u2192"}
              </span>
            </a>

            <small>
              {singleObjectNote}
            </small>
          </div>
        </article>

        {checkoutErrorMessage ? (
          <div
            className="checkoutNotice"
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
                ? "\u2713"
                : "!"}
            </span>

            <span>{checkoutErrorMessage}</span>
          </div>
        ) : null}

        <div className="plansGrid">
          {visiblePlans.map((plan) => (
            <article
              key={plan.id}
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
                    <span>{"\u2713"}</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.id === "founder" ? (
                <button
                  type="button"
                  onClick={startFounderCheckout}
                  disabled={checkoutLoading}
                  className="planButton planButtonHighlighted"
                  style={{
                    border: 0,
                    cursor: checkoutLoading
                      ? "wait"
                      : "pointer",
                    opacity: 1,
                    font: "inherit",
                  }}
                >
                  {checkoutLoading
                    ? t("plans.founder.loading")
                    : plan.button}

                  <span aria-hidden="true">
                    {"\u2192"}
                  </span>
                </button>
              ) : plan.id === "pro" ? (
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

                  <span aria-hidden="true">
                    {"\u{1F512}"}
                  </span>
                </button>
              ) : (
                <a
                  href={plan.href}
                  className="planButton"
                >
                  {plan.button}

                  <span aria-hidden="true">
                    {"\u2192"}
                  </span>
                </a>
              )}
            </article>
          ))}
        </div>

        {isGermany ? (
          <div className="demoTeaser">
            <div>
              <span className="demoTeaserLabel">
                KOSTENLOS KENNENLERNEN
              </span>

              <strong>
                Noch unsicher? Teste Inserat-AI kostenlos.
              </strong>

              <p>
                Keine Kreditkarte. Eine kostenlose
                Textgenerierung mit drei Varianten.
              </p>
            </div>

            <a
              href="/register"
              className="demoTeaserButton"
              onClick={() => {
                trackAnalyticsEvent(
                  "register_cta_click",
                  {
                    cta_page:
                      window.location.pathname,
                    requested_plan: "demo",
                    cta_text: "Kostenlos testen",
                    transport_type: "beacon",
                  }
                );
              }}
            >
              Kostenlos testen
              <span aria-hidden="true">
                {"\u2192"}
              </span>
            </a>
          </div>
        ) : null}

        <div className="agencyTeaser">
          {isGermany ? (
            <>
              <div>
                <span className="agencyLabel">
                  FÜR WACHSENDE TEAMS
                </span>

                <strong>Pro & Agency</strong>

                <p>
                  Mehr Automatisierung und
                  Premium-Funktionen für größere
                  Immobilien-Teams.
                </p>
              </div>

              <div className="agencyStatus">
                <span>ab 79,90 € / Monat</span>
                <strong>In Vorbereitung</strong>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="agencyLabel">
                  {t("agency.label")}
                </span>

                <strong>Agency</strong>

                <p>{t("agency.description")}</p>
              </div>

              <div className="agencyStatus">
                <span>
                  149.90 CHF /{" "}
                  {t("agency.month")}
                </span>
                <strong>
                  {t("agency.status")}
                </strong>
              </div>
            </>
          )}
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

        /* =================================================
           DE CONVERSION WAVE 2
           Founder zuerst, weniger Entscheidungsstress
           ================================================= */

        .pricingSectionGermany .pricingShell {
          display: flex;
          flex-direction: column;
        }

        .pricingSectionGermany .pricingHeader {
          order: 0;
          max-width: 820px;
          margin-bottom: 30px;
        }

        .pricingSectionGermany .checkoutNotice {
          order: 1;
        }

        .pricingSectionGermany .plansGrid {
          order: 2;
          grid-template-columns:
            minmax(0, 760px);
          justify-content: center;
          margin-top: 0;
        }

        .pricingSectionGermany .planCardHighlighted {
          min-height: 0;
          padding: 34px;
          transform: none;
          border-width: 2px;
          box-shadow:
            0 30px 75px rgba(245, 158, 11, 0.24);
        }

        .pricingSectionGermany .planDescription {
          min-height: 0;
        }

        .pricingSectionGermany .planFeatures {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 11px 20px;
        }

        .pricingSectionGermany .planButtonHighlighted {
          min-height: 56px;
          font-size: 15px;
        }

        .pricingSectionGermany .singleObjectCard {
          order: 3;
          margin-top: 22px;
          padding: 26px;
          border-color:
            rgba(148, 163, 184, 0.24);
          background:
            linear-gradient(
              135deg,
              rgba(15, 23, 42, 0.88),
              rgba(30, 41, 59, 0.72)
            );
          box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.2);
        }

        .pricingSectionGermany .singleObjectMain h3 {
          font-size:
            clamp(28px, 3vw, 36px);
        }

        .pricingSectionGermany .singleObjectFeatures {
          gap: 10px 22px;
          margin-top: 20px;
        }

        .pricingSectionGermany .singleObjectPriceBox {
          padding: 22px;
        }

        .pricingSectionGermany .singleObjectPrice strong {
          font-size:
            clamp(46px, 5vw, 58px);
        }

        .demoTeaser {
          order: 4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: 18px;
          padding: 22px 26px;
          border:
            1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          background:
            rgba(15, 23, 42, 0.52);
        }

        .demoTeaserLabel {
          display: block;
          margin-bottom: 7px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .demoTeaser strong {
          display: block;
          color: #ffffff;
          font-size: 18px;
        }

        .demoTeaser p {
          margin: 5px 0 0;
          color:
            rgba(226, 232, 240, 0.58);
          font-size: 13px;
        }

        .demoTeaserButton {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 46px;
          padding: 0 18px;
          border:
            1px solid rgba(251, 191, 36, 0.35);
          border-radius: 12px;
          background:
            rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
        }

        .pricingSectionGermany .agencyTeaser {
          order: 5;
          margin-top: 14px;
          opacity: 0.82;
        }

        @media (max-width: 900px) {
          .pricingSectionGermany .planFeatures {
            grid-template-columns: 1fr;
          }

          .pricingSectionGermany .demoTeaser {
            align-items: flex-start;
            flex-direction: column;
          }

          .pricingSectionGermany .demoTeaserButton {
            width: 100%;
          }
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


        /* =================================================
           INSERAT-AI - PRICING MOBILE-FIRST V1
           Mobile Kauf-/Abo-Erlebnis
           ================================================= */

        @media (max-width: 430px) {

          .pricingSection {
            width: 100%;
            padding:
              46px
              14px
              58px;
            scroll-margin-top: 70px;
          }

          .pricingShell {
            width: 100%;
            max-width: 100%;
          }


          /* -----------------------------------------------
             HEADER
             ----------------------------------------------- */

          .pricingHeader {
            width: 100%;
            max-width: 100%;
            margin:
              0
              0
              26px;
            text-align: left;
          }

          .pricingEyebrow {
            padding:
              7px
              11px;
            font-size: 10px;
            line-height: 1.2;
          }

          .pricingHeader h2 {
            margin-top: 17px;
            font-size: 30px;
            line-height: 1.08;
            letter-spacing: -0.035em;
          }

          .pricingHeader p {
            margin-top: 13px;
            font-size: 15px;
            line-height: 1.6;
          }


          /* -----------------------------------------------
             EINZELIMMOBILIE
             ----------------------------------------------- */

          .singleObjectCard {
            width: 100%;
            max-width: 100%;

            display: grid;
            grid-template-columns:
              minmax(0, 1fr);

            gap: 14px;

            margin-bottom: 18px;

            padding: 14px;

            border-radius: 24px;
          }

          .singleObjectMain {
            min-width: 0;

            padding:
              5px
              4px
              2px;
          }

          .singleObjectBadge {
            font-size: 10px;
            line-height: 1.2;
          }

          .singleObjectCard h3 {
            margin-top: 17px;

            font-size: 26px;
            line-height: 1.12;
            letter-spacing: -0.025em;
          }

          .singleObjectDescription {
            margin-top: 12px;

            font-size: 14px;
            line-height: 1.6;
          }

          .singleObjectFeatures {
            margin-top: 19px;

            display: grid;
            grid-template-columns:
              minmax(0, 1fr);

            gap: 9px;
          }

          .singleObjectFeature {
            min-width: 0;

            align-items: flex-start;

            font-size: 13px;
            line-height: 1.45;
          }

          .singleObjectFeature > span:first-child {
            flex: 0 0 auto;
          }


          /* -----------------------------------------------
             9.90 PREISBOX
             ----------------------------------------------- */

          .singleObjectPriceBox {
            width: 100%;
            max-width: 100%;

            padding: 18px;

            border-radius: 18px;
          }

          .singleObjectPriceLabel {
            font-size: 10px;
            line-height: 1.2;
          }

          .singleObjectPrice {
            margin-top: 8px;
          }

          .singleObjectPrice span {
            font-size: 15px;
          }

          .singleObjectPrice strong {
            font-size: 42px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .singleObjectPriceBox p {
            margin-top: 7px;

            font-size: 12px;
          }

          .singleObjectButton {
            width: 100%;

            min-height: 52px;

            margin-top: 17px;

            padding:
              12px
              16px;

            display: inline-flex;
            align-items: center;
            justify-content: center;

            border-radius: 14px;

            font-size: 14px;
            line-height: 1.2;

            touch-action: manipulation;
          }

          .singleObjectPriceBox small {
            display: block;

            margin-top: 11px;

            font-size: 10.5px;
            line-height: 1.45;
          }


          /* -----------------------------------------------
             PLÄNE = MOBILE FEED
             ----------------------------------------------- */

          .plansGrid {
            width: 100%;

            display: grid;
            grid-template-columns:
              minmax(0, 1fr);

            gap: 14px;
          }

          .planCard,
          .planCardHighlighted {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            min-height: 0;

            padding:
              20px
              18px;

            border-radius: 22px;

            transform: none;
          }

          .planCardHighlighted {
            transform: none;

            box-shadow:
              0 20px 50px
              rgba(245, 158, 11, 0.13);
          }

          .planTop {
            min-width: 0;
          }

          .planLabel {
            font-size: 10px;
            line-height: 1.2;
          }

          .planCard h3 {
            margin-top: 15px;

            font-size: 24px;
            line-height: 1.15;
          }

          .planPrice {
            margin-top: 12px;

            font-size: 34px;
            line-height: 1;
            letter-spacing: -0.035em;
          }

          .planCadence {
            margin-top: 7px;

            font-size: 12px;
            line-height: 1.4;
          }

          .planDescription {
            min-height: 0;

            margin-top: 14px;

            font-size: 14px;
            line-height: 1.6;
          }


          /* -----------------------------------------------
             FEATURES
             ----------------------------------------------- */

          .planFeatures {
            margin-top: 19px;

            display: grid;

            gap: 9px;
          }

          .planFeatures li {
            min-width: 0;

            align-items: flex-start;

            font-size: 13px;
            line-height: 1.48;
          }

          .planFeatures li > span:first-child {
            flex: 0 0 auto;
          }


          /* -----------------------------------------------
             PLAN CTA
             ----------------------------------------------- */

          .planButton {
            width: 100%;

            min-height: 52px;

            margin-top: 21px;

            padding:
              12px
              16px;

            display: inline-flex;
            align-items: center;
            justify-content: center;

            border-radius: 14px;

            font-size: 14px;
            line-height: 1.2;

            touch-action: manipulation;
          }

          .planButtonHighlighted {
            min-height: 54px;
          }


          /* -----------------------------------------------
             AGENCY
             ----------------------------------------------- */

          .agencyTeaser {
            width: 100%;

            margin-top: 16px;

            padding: 18px;

            display: flex;
            flex-direction: column;
            align-items: flex-start;

            gap: 14px;

            border-radius: 20px;
          }

          .agencyLabel {
            font-size: 9px;
          }

          .agencyTeaser strong {
            margin-top: 6px;

            font-size: 21px;
          }

          .agencyTeaser p {
            margin-top: 6px;

            font-size: 13px;
            line-height: 1.5;
          }

          .agencyStatus {
            width: 100%;

            text-align: left;
          }

          .agencyStatus span {
            font-size: 14px;
          }

          .agencyStatus strong {
            display: block;

            margin-top: 5px;

            font-size: 12px;
          }
        }


        /* Sehr kleine Geräte */

        @media (max-width: 360px) {

          .pricingSection {
            padding-left: 12px;
            padding-right: 12px;
          }

          .pricingHeader h2 {
            font-size: 28px;
          }

          .singleObjectCard h3 {
            font-size: 24px;
          }

          .singleObjectPrice strong {
            font-size: 39px;
          }

          .planPrice {
            font-size: 32px;
          }
        }

      `}</style>
    </section>
  );
}