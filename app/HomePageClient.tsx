"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getInseratAiMarketFromHostname,
  INSERAT_AI_MARKET_EVENT,
  INSERAT_AI_MARKET_STORAGE_KEY,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";
import PricingSection from "./components/PricingSection";
import ExampleGenerator from "./components/ExampleGenerator";
import SocialProofSection from "./components/SocialProofSection";
import LandingAssistant from "./components/LandingAssistant";

type HomePageClientProps = {
  initialMarket: InseratAiMarket;
};

const DE_LANDING_COPY = {
  heroBadge:
    "Die smarte Lösung für Immobilienprofis in Deutschland",
  heroSubline:
    "Inserat-AI erstellt hochwertige Immobilieninserate in Sekunden – emotional formuliert, professionell strukturiert und bereit für ImmobilienScout24, immowelt und Social Media.",
  professionals:
    "Entwickelt für Immobilienprofis in Deutschland",
  dataProtection:
    "DSGVO-konformer Datenschutz im Fokus",
  market: "Deutscher Immobilienmarkt",
} as const;

export default function HomePageClient({
  initialMarket,
}: HomePageClientProps) {
  const t = useTranslations("HomePage");
  const [market, setMarket] =
    useState<InseratAiMarket>(initialMarket);

  useEffect(() => {
    const domainMarket =
      getInseratAiMarketFromHostname(
        window.location.hostname
      );

    if (domainMarket) {
      setMarket(domainMarket);
      return;
    }

    const applyStoredMarket = () => {
      const storedMarket = window.localStorage.getItem(
        INSERAT_AI_MARKET_STORAGE_KEY
      );

      if (
        storedMarket === "CH" ||
        storedMarket === "DE"
      ) {
        setMarket(storedMarket);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === INSERAT_AI_MARKET_STORAGE_KEY
      ) {
        applyStoredMarket();
      }
    };

    applyStoredMarket();
    window.addEventListener(
      INSERAT_AI_MARKET_EVENT,
      applyStoredMarket
    );
    window.addEventListener("storage", handleStorage);
    window.addEventListener("click", applyStoredMarket);

    return () => {
      window.removeEventListener(
        INSERAT_AI_MARKET_EVENT,
        applyStoredMarket
      );
      window.removeEventListener(
        "storage",
        handleStorage
      );
      window.removeEventListener(
        "click",
        applyStoredMarket
      );
    };
  }, []);

  return (
    <>
      <section className="landingHero">
        <div className="landingHeroInner">
          <div className="landingHeroContent">
            <div className="landingBadge">
              {market === "DE" ? DE_LANDING_COPY.heroBadge : t("hero.badge")}
            </div>

            <h1 className="landingHeadline">
              {t("hero.headlineLine1")}
              <br />
              {t("hero.headlineLine2")}
              <br />
              <span>{t("hero.headlineLine3")}</span>
            </h1>

            <p className="landingSubline">
              {market === "DE" ? DE_LANDING_COPY.heroSubline : t("hero.subline")}
            </p>

            <div className="landingHeroActions">
              <a
                href="/register"
                className="landingPrimaryButton"
              >
                {t("hero.register")}
                <span>{"\u2192"}</span>
              </a>

              <div className="landingCheck">
                <span>{"\u2713"}</span>
                {t("hero.noCreditCard")}
              </div>
            </div>

            <div
              id="benefits"
              className="landingBenefits"
            >
              <div className="landingBenefit">
                <div className="landingBenefitIcon">
                  {"\u2726"}
                </div>

                <div>
                  <strong>
                    {t("benefits.speedTitle")}
                  </strong>

                  <p>{t("benefits.speedText")}</p>
                </div>
              </div>

              <div className="landingBenefit">
                <div className="landingBenefitIcon">
                  {"\u2197"}
                </div>

                <div>
                  <strong>
                    {t("benefits.visibilityTitle")}
                  </strong>

                  <p>
                    {t("benefits.visibilityText")}
                  </p>
                </div>
              </div>

              <div className="landingBenefit">
                <div className="landingBenefitIcon">
                  {"\u25CE"}
                </div>

                <div>
                  <strong>
                    {t("benefits.inquiriesTitle")}
                  </strong>

                  <p>
                    {t("benefits.inquiriesText")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            id="demo"
            className="landingVideoArea"
          >
            <div className="landingVideoCard">
              <div className="landingVideoLabel">
                <span />
                {t("demo.label")}
              </div>

              <video
                className="landingVideo"
                controls
              >
                <source
                  src="/inserat-ai-demo.mp4"
                  type="video/mp4"
                />

                {t("demo.unsupported")}
              </video>
            </div>

            <div className="landingFloatingCards">
              <div className="landingMiniCard">
                <strong>
                  {t("demo.listingTextsTitle")}
                </strong>

                <p>
                  {t("demo.listingTextsText")}
                </p>
              </div>

              <div className="landingMiniCard">
                <strong>
                  {t("demo.highlightsTitle")}
                </strong>

                <ul>
                  <li>{t("demo.seaView")}</li>
                  <li>{t("demo.balcony")}</li>
                  <li>{t("demo.parking")}</li>
                </ul>
              </div>

              <div className="landingMiniCard">
                <strong>
                  {t("demo.portalTitle")}
                </strong>

                <p>{t("demo.portalText")}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          id="trust"
          className="landingTrustBar"
        >
          <div className="landingTrustTitle">
            {t("trust.title")}
          </div>

          <div className="landingTrustItems">
            <span>
              {market === "DE" ? DE_LANDING_COPY.professionals : t("trust.swissProfessionals")}
            </span>

            <strong>
              {market === "DE" ? DE_LANDING_COPY.dataProtection : t("trust.dataProtection")}
            </strong>

            <strong>
              {market === "DE" ? DE_LANDING_COPY.market : t("trust.swissMarket")}
            </strong>

            <strong>
              {t("trust.portalSocial")}
            </strong>

            <strong>
              {t("trust.noCreditCard")}
            </strong>
          </div>
        </div>
      </section>

      <SocialProofSection key={`social-proof-${market}`} market={market} />

      <ExampleGenerator key={market} market={market} />


      <section
        id="marketing-hub"
        className="landingMarketingHubSection relative mx-auto mt-24 max-w-6xl px-6"
      >
        <div className="landingMarketingHubCard relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-slate-950 via-[#08142d] to-[#0a2752] p-8 shadow-2xl shadow-black/30 md:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">
              {t("marketingHub.eyebrow")}
            </p>

            <h2 className="landingMarketingHubHeadline mt-5 max-w-4xl text-4xl font-black leading-tight tracking-[-0.045em] text-white md:text-6xl">
              {t("marketingHub.title")}
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              {t("marketingHub.description")}
            </p>

            <div className="landingMarketingHubGrid mt-10 grid gap-5 md:grid-cols-3">
              <article className="landingMarketingHubFeature rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur">
                <span className="text-sm font-black tracking-[0.18em] text-amber-300">
                  01
                </span>
                <h3 className="mt-5 text-2xl font-black text-white">
                  {t("marketingHub.cards.progress.title")}
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  {t("marketingHub.cards.progress.text")}
                </p>
              </article>

              <article className="landingMarketingHubFeature rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur">
                <span className="text-sm font-black tracking-[0.18em] text-amber-300">
                  02
                </span>
                <h3 className="mt-5 text-2xl font-black text-white">
                  {t("marketingHub.cards.nextStep.title")}
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  {t("marketingHub.cards.nextStep.text")}
                </p>
              </article>

              <article className="landingMarketingHubFeature rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur">
                <span className="text-sm font-black tracking-[0.18em] text-amber-300">
                  03
                </span>
                <h3 className="mt-5 text-2xl font-black text-white">
                  {t("marketingHub.cards.central.title")}
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  {t("marketingHub.cards.central.text")}
                </p>
              </article>
            </div>

            <div className="landingMarketingHubActions mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <a
                href="/register"
                className="inline-flex min-h-14 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5"
              >
                {t("marketingHub.cta")}
                <span className="ml-2" aria-hidden="true">
                  {"\u2192"}
                </span>
              </a>

              <span className="text-sm font-bold text-slate-400">
                {t("marketingHub.note")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <LandingAssistant key={`landing-assistant-${market}`} market={market} />

      <PricingSection key={`pricing-${market}`} market={market} />
    </>
  );
}
