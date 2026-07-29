"use client";

import { useTranslations } from "next-intl";
import PricingSection from "./components/PricingSection";
import ExampleGenerator from "./components/ExampleGenerator";

export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <>
      <section className="landingHero">
        <div className="landingHeroInner">
          <div className="landingHeroContent">
            <div className="landingBadge">
              <span>BETA</span>
              {t("hero.badge")}
            </div>

            <h1 className="landingHeadline">
              {t("hero.headlineLine1")}
              <br />
              {t("hero.headlineLine2")}
              <br />
              <span>{t("hero.headlineLine3")}</span>
            </h1>

            <p className="landingSubline">
              {t("hero.subline")}
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
              {t("trust.swissProfessionals")}
            </span>

            <strong>
              {t("trust.dataProtection")}
            </strong>

            <strong>
              {t("trust.swissMarket")}
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

      <ExampleGenerator />

      <section className="relative mx-auto mt-24 max-w-6xl px-6">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur md:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">
              {t("future.eyebrow")}
            </p>

            <h2 className="mt-5 max-w-4xl text-4xl font-light leading-tight tracking-tight text-white md:text-6xl">
              {t("future.headline")}
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              {t("future.description")}
            </p>

            <p className="mt-6 text-xl font-black text-amber-200">
              {t("future.closing")}
            </p>
          </div>
        </div>
      </section>

      <PricingSection />
    </>
  );
}
