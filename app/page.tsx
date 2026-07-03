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

      <section className="landingExampleSection">
        <div className="landingExampleInner">
          <div className="landingExampleContent">
            <div className="landingSectionBadge">Live-Beispiel</div>

            <h2>
              So einfach entsteht dein Immobilieninserat.
            </h2>

            <p>
              Gib wenige Eckdaten ein und Inserat-AI erstellt daraus einen
              professionellen Titel, eine emotionale Beschreibung und passende
              Highlights für dein Objekt.
            </p>

            <ul>
              <li>✓ Titel automatisch generieren</li>
              <li>✓ Beschreibung im Makler-Stil</li>
              <li>✓ Highlights für Portale & Social Media</li>
            </ul>
          </div>

          <div className="landingExampleCard">
            <div className="landingExampleForm">
              <label>
                Objektart
                <input value="4.5-Zimmer-Wohnung" readOnly />
              </label>

              <label>
                Ort
                <input value="Winterthur, ZH" readOnly />
              </label>

              <label>
                Wohnfläche
                <input value="112 m²" readOnly />
              </label>

              <label>
                Highlights
                <textarea
                  value={"Balkon, offene Küche, Parkettboden, ruhige Lage"}
                  readOnly
                />
              </label>

              <button type="button">
                Beispiel generieren
              </button>
            </div>

            <div className="landingExampleResult">
              <span>KI-Vorschau</span>

              <h3>
                Stilvolle 4.5-Zimmer-Wohnung mit Balkon in Winterthur
              </h3>

              <p>
                Diese attraktive Wohnung überzeugt durch helle Räume, eine
                moderne offene Küche und einen gemütlichen Balkon. Der
                hochwertige Parkettboden verleiht dem Zuhause eine warme und
                gepflegte Atmosphäre.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />
    </>
  );
}