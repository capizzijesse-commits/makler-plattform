"use client";

import PricingSection from "./components/PricingSection";

export default function HomePage() {
  return (
    <>
      <section className="landingHero">
        <div className="landingHeroInner">
          <div className="landingHeroContent">
            <div className="landingBadge">
              <span>BETA</span>
              Die smarte Lösung für Immobilienprofis in der Schweiz 🇨🇭
            </div>

            <h1 className="landingHeadline">
              Mehr Anfragen.
              <br />
              Weniger Aufwand.
              <br />
              <span>Inserate, die überzeugen.</span>
            </h1>

            <p className="landingSubline">
              Inserat-AI erstellt und optimiert Immobilieninserate in Sekunden –
              inklusive Texten, Highlights und Varianten. Für mehr Sichtbarkeit
              und qualifizierte Anfragen.
            </p>

            <div className="landingHeroActions">
              <a href="/register" className="landingPrimaryButton">
                Kostenlos testen <span>→</span>
              </a>

              <div className="landingCheck">
                <span>✓</span>
                Keine Kreditkarte erforderlich
              </div>
            </div>

            <div className="landingBenefits">
              <div className="landingBenefit">
                <div className="landingBenefitIcon">✦</div>
                <div>
                  <strong>In Sekunden erstellt</strong>
                  <p>KI generiert Texte & Titel</p>
                </div>
              </div>

              <div className="landingBenefit">
                <div className="landingBenefitIcon">↗</div>
                <div>
                  <strong>Mehr Sichtbarkeit</strong>
                  <p>Optimiert für Portale</p>
                </div>
              </div>

              <div className="landingBenefit">
                <div className="landingBenefitIcon">◎</div>
                <div>
                  <strong>Mehr Anfragen</strong>
                  <p>Qualifizierte Interessenten</p>
                </div>
              </div>
            </div>
          </div>

          <div className="landingVideoArea">
            <div className="landingVideoCard">
              <div className="landingVideoLabel">
                <span /> So funktioniert Inserat-AI
              </div>

              <video className="landingVideo" controls>
                <source src="/inserat-ai-demo.mp4" type="video/mp4" />
                Dein Browser unterstützt dieses Video nicht.
              </video>
            </div>

            <div className="landingFloatingCards">
              <div className="landingMiniCard">
                <strong>✨ KI-Texterstellung</strong>
                <p>
                  Moderne 4.5-Zimmer-Wohnung mit Seesicht, Balkon und perfekter
                  Anbindung.
                </p>
              </div>

              <div className="landingMiniCard">
                <strong>⭐ Highlights</strong>
                <ul>
                  <li>Seesicht</li>
                  <li>Balkon</li>
                  <li>Tiefgaragenplatz</li>
                </ul>
              </div>

              <div className="landingMiniCard">
                <strong>📄 Vorschau</strong>
                <p>
                  Exposé, Portaltext und Social-Media-Variante in einem Schritt.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="landingTrustBar">
          <span>Vertraut von Immobilienprofis in der ganzen Schweiz</span>
          <strong>SVIT Schweiz</strong>
          <strong>HEV Schweiz</strong>
          <strong>USPI Genève</strong>
          <strong>REIDA</strong>
          <span>& viele weitere</span>
        </div>
      </section>

      <PricingSection />
    </>
  );
}