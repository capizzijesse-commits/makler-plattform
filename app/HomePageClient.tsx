"use client";

import { useEffect, useState } from "react";
import {
  getInseratAiMarketFromHostname,
  INSERAT_AI_MARKET_EVENT,
  INSERAT_AI_MARKET_STORAGE_KEY,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

type HomePageClientProps = {
  initialMarket: InseratAiMarket;
};

export default function HomePageClient({
  initialMarket,
}: HomePageClientProps) {
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
      const storedMarket =
        window.localStorage.getItem(
          INSERAT_AI_MARKET_STORAGE_KEY
        );

      if (
        storedMarket === "CH" ||
        storedMarket === "DE"
      ) {
        setMarket(storedMarket);
      }
    };

    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key ===
        INSERAT_AI_MARKET_STORAGE_KEY
      ) {
        applyStoredMarket();
      }
    };

    applyStoredMarket();

    window.addEventListener(
      INSERAT_AI_MARKET_EVENT,
      applyStoredMarket
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "click",
      applyStoredMarket
    );

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

  useEffect(() => {
    document.title =
      market === "DE"
        ? "Inserat-AI Deutschland"
        : "Inserat-AI Schweiz";
  }, [market]);

  const isDE = market === "DE";

  const currency = isDE ? "€" : "CHF";

  const city = isDE
    ? "Berlin-Charlottenburg"
    : "Zürich";

  const price = isDE
    ? "895.000 €"
    : "CHF 1'390'000";

  return (
    <main className="iaOnePage">
      <section className="iaOneHero">
        <div className="iaSkylineBackground" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source
              src="/zürich-skyline-loop.mp4"
              type="video/mp4"
            />
          </video>
          <div className="iaSkylineShade" />
        </div>

        <div className="iaOneGlow iaOneGlowGold" />
        <div className="iaOneGlow iaOneGlowBlue" />

        <div className="iaOneHeroGrid">
          <div className="iaOneCopy">
            <div className="iaOneEyebrow">
              <span className="iaOneEyebrowDot" />
              Immobilieninserate · automatisiert
            </div>

            <h1 className="iaOneTitle">
              Ein Exposé. Bilder.
              <br />
              Das fertige Inserat.
              <br />
              <span>In Sekunden.</span>
            </h1>

            <p className="iaOneLead">
              Exposé und Bilder hochladen.
              Inserat-AI erkennt die Objektdaten,
              analysiert und sortiert die Bilder
              und erstellt daraus automatisch
              das vollständige Immobilieninserat.
            </p>

            <div className="iaOneActions">
              <a
                href="/register?plan=pro"
                className="iaOnePrimary"
              >
                Inserat erstellen
                <span aria-hidden="true">→</span>
              </a>

              
            </div>
          </div>

          <div className="iaOneResultWrap">
            <div className="iaOneResultTopline">
              <span>
                AUTOMATISCH ERSTELLTES INSERAT
              </span>

              <strong>
                ✓ FERTIG
              </strong>
            </div>

            <article className="iaOneListing">
              <div className="iaOneListingImage">
                  <video
                    className="iaOneDemoVideo"
                    controls
                    playsInline
                    preload="metadata"
                  >
                    <source
                      src="/inserat-ai-demo.mp4"
                      type="video/mp4"
                    />
                  </video>
                </div>
            </article>

            <div className="iaOneAutomation">
              <span>✦</span>

              <div>
                <strong>
                  Vollautomatisch erstellt
                </strong>

                <small>
                  Daten erkannt · Bilder analysiert
                  & sortiert · 3 Texte erstellt
                </small>
              </div>

              <b>
                ca. 20 Sek.
              </b>
            </div>
          </div>
        </div>
      </section>

      <section
        id="preise"
        className="iaOnePricing"
      >
        <div className="iaOnePricingIntro">
          <span>PREISE</span>

          <strong>
            Wähle, wie du arbeiten möchtest.
          </strong>
        </div>

        <div className="iaOnePlans">
          <a href="/register?plan=single-object" className="iaOnePlan iaOnePlanLink">
            <div className="iaOnePlanLabel">
              EINZELOBJEKT
            </div>

            <div className="iaOnePrice">
              <strong>
                {currency} 9.90
              </strong>
              <span>einmalig</span>
            </div>

            <p>
              Für ein einzelnes Inserat.
            </p>

            <div className="iaOnePlanMode">
              Einzelauftrag
            </div>
          </a>

          <div className="iaOneSubscriptionTrial">
  30 TAGE KOSTENLOS · KEINE KREDITKARTE
</div>

          <a href="/register?plan=founder" className="iaOnePlan iaOnePlanLink">
            <div className="iaOnePlanLabel">
              FOUNDER
            </div>

            <div className="iaOnePrice">
              <strong>
                {currency} 19.90
              </strong>
              <span>/ Monat</span>
            </div>

            <p>
              Die Werkzeuge von Inserat-AI.
              Du arbeitest Schritt für Schritt.
            </p>

            <div className="iaOnePlanMode">
              Manuell arbeiten
            </div>
          </a>

          <div className="iaOnePlan iaOnePlanPro">
            <div className="iaOnePlanLabel">
              PRO · AUTOPILOT
            </div>
            <p>
              Technische Optimierungen: Unser Autopilot
              ist vorübergehend nicht buchbar.
            </p>
            <div className="iaOnePlanMode">
              Wir sind in Kürze wieder für Sie da.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}














