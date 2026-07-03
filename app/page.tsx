"use client";

import PricingSection from "./components/PricingSection";
import ExampleGenerator from "./components/ExampleGenerator";
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
  Aus wenigen Angaben
  <br />
  wird ein Inserat,
  <br />
  <span>das überzeugt.</span>
</h1>

<p className="landingSubline">
  Inserat-AI erstellt hochwertige Immobilieninserate in Sekunden –
  emotional formuliert, professionell strukturiert und bereit für
  Homegate, ImmoScout24, Exposés und Social Media.
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

           <div id="benefits" className="landingBenefits">
              <div className="landingBenefit">
                <div className="landingBenefitIcon">✦</div>
                <div>
                  <strong>In Sekunden erstellt</strong>
<p>Titel, Beschreibung und Highlights</p>
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

<div id="demo" className="landingVideoArea">            <div className="landingVideoCard">
              <div className="landingVideoLabel">
  <span /> Inserat-AI in 60 Sekunden erklärt
</div>

              <video className="landingVideo" controls>
                <source src="/inserat-ai-demo.mp4" type="video/mp4" />
                Dein Browser unterstützt dieses Video nicht.
              </video>
            </div>

            <div className="landingFloatingCards">
              <div className="landingMiniCard">
                <strong>✨ Inserat-Texte</strong>
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
                <strong>Portal & Social Media</strong>
                <p>
                  Inseratetexte, Exposé-Inhalte und Social-Media-Varianten in einem Schritt.
                </p>
              </div>
            </div>
          </div>
        </div>

       <div id="benefits" className="landingTrustBar">
  <div className="landingTrustTitle">
    Vorteile
  </div>

  <div className="landingTrustItems">
    <span>Entwickelt für Schweizer Immobilienprofis</span>
    <strong>DSG-konform</strong>
    <strong>Schweizer Markt</strong>
    <strong>Portaltexte & Social Media</strong>
    <strong>Keine Kreditkarte</strong>
  </div>
</div>
            </section>

      <ExampleGenerator />

      <PricingSection />
    </>
  );
}