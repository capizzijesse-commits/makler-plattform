"use client";

export default function PricingSection() {
  const founderPaymentLink =
  "https://buy.stripe.com/5kQ14o93d8Du1WR74b6J201";

const proPaymentLink =
  "https://buy.stripe.com/00w14o2EP5ri9pj1JR6J200";

const agencyPaymentLink =
  "https://buy.stripe.com/fZuaEYfrBaLC5933RZ6J203";

  const plans = [
    {
      name: "Demo",
      price: "0 CHF",
      text: "Kostenlos ausprobieren – ohne Risiko.",
      button: "Kostenlos testen",
      disabled: false,
      href: "/register",
      features: [
        "Einfach registrieren",
        "Inserat-AI kennenlernen",
        "Erste Funktionen testen",
        "Ideal zum Ausprobieren",
      ],
    },
  {
  name: "Founder",
  price: "30 Tage kostenlos",
  text: "Danach nur 19.90 CHF pro Monat statt 39.90 CHF.",
  badge: "🔥 Gründerangebot",
  highlighted: true,
  button: "Founder sichern",
  href: founderPaymentLink,
  disabled: false,
  features: [
    "Heute 0 CHF zahlen",
    "30 Tage kostenlos testen",
    "Danach 19.90 CHF pro Monat",
    "3 professionelle Inserat-Varianten",
    "Social-Media-Texte",
    "PDF, Copy und Portal-Export",
    "Begrenztes Makler-Cockpit",
    "Objekte, Texte und Bilder speichern",
  ],
},
{
  name: "Pro",
  price: "30 Tage kostenlos",
  text: "Danach 79.90 CHF pro Monat. Für die zentrale Immobilienvermarktung.",
  badge: "Empfohlen für aktive Makler",
  button: "Pro starten",
  href: proPaymentLink,
  disabled: false,
  features: [
    "Heute 0 CHF zahlen",
    "30 Tage kostenlos testen",
    "Alles aus Founder",
    "Vollständiges Makler-Cockpit",
    "Mehr Objekte dauerhaft verwalten",
    "Social-Media-Cockpit",
    "Erweiterte Bild- und Marketingfunktionen",
    "Kommende Premium-Funktionen ohne Aufpreis",
    "Priorisierter Support",
  ],
},
{
  name: "Agency",
  price: "149.90 CHF",
  text: "Geplant für Teams, Agenturen und grössere Immobilienbüros.",
  button: "Demnächst verfügbar",
  href: agencyPaymentLink,
  disabled: true,
  features: [
    "Alles aus Pro",
    "Mehrere Benutzer",
    "Gemeinsamer Objektbestand",
    "Rollen und Berechtigungen",
    "Firmenbranding",
    "Teamübersicht",
    "Premium-Support",
  ],
},
];
  

  return (
    <section
      id="pricing"
      className="pricingSection"
      style={{
        background: "#ffffff",
        fontFamily: "Inter, sans-serif",
        color: "#1f2937",
        borderRadius: "24px",
        padding: "36px 40px 44px",
        maxWidth: "1100px",
        margin: "45px auto 0",
        boxSizing: "border-box",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "9px 16px",
          borderRadius: "999px",
          background:
            "linear-gradient(135deg, rgba(251, 191, 36, 0.16), rgba(245, 158, 11, 0.10))",
          border: "1px solid rgba(245, 158, 11, 0.28)",
          color: "#92400e",
          fontWeight: 800,
          fontSize: "0.9rem",
          marginBottom: "16px",
        }}
      >
        <span>✨</span>
        <span>
          30 Tage kostenlos testen. ✨ Gründerangebot: 19.90 CHF statt 39.90 CHF pro Monat – nur für unsere ersten Kunden. 
         
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          alignItems: "stretch",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              background: plan.highlighted
                ? "linear-gradient(135deg, #fff7ed, #ffffff)"
                : "#ffffff",
              borderRadius: "20px",
              padding: "26px 22px",
              border: plan.highlighted
                ? "2px solid #f59e0b"
                : "1px solid #e5e7eb",
              boxShadow: plan.highlighted
                ? "0 18px 40px rgba(245, 158, 11, 0.22)"
                : "0 10px 24px rgba(15, 23, 42, 0.06)",
              transform: plan.highlighted ? "translateY(-6px)" : "none",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    background: "#f59e0b",
                    color: "#ffffff",
                    padding: "7px 11px",
                    borderRadius: "999px",
                    fontSize: "0.8rem",
                    fontWeight: 900,
                    marginBottom: "14px",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800 }}>
                {plan.name}
              </h3>

              <p
                style={{
                  fontSize: "2rem",
                  fontWeight: 900,
                  margin: "14px 0 6px",
                  color: "#111827",
                }}
              >
                {plan.price}
              </p>

              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.95rem",
                  margin: "0 0 18px",
                }}
              >
                {plan.text}
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  textAlign: "left",
                  marginBottom: "20px",
                }}
              >
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    style={{
                      color: "#334155",
                      fontSize: "0.95rem",
                      lineHeight: 1.4,
                    }}
                  >
                    ✓ {feature}
                  </div>
                ))}
              </div>
            </div>

            <a
              href={plan.href}
              target={plan.name === "Demo" ? "_self" : "_blank"}
              rel={plan.name === "Demo" ? undefined : "noopener noreferrer"}
              style={{
                display: "block",
                padding: "14px 28px",
                background: plan.highlighted ? "#f59e0b" : "#111827",
                color: "#ffffff",
                borderRadius: "12px",
                textDecoration: "none",
                width: "100%",
                boxSizing: "border-box",
                textAlign: "center",
                fontWeight: 700,
                marginTop: "auto",
              }}
            >
              {plan.button}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}