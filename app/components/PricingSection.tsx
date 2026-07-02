"use client";

export default function PricingSection() {
  const founderPaymentLink = "https://buy.stripe.com/test_5kQ28sdozdIk3bsduy1wY00";
  const proPaymentLink = "https://buy.stripe.com/test_9B64gAfwHgUwbHY4Y21wY01";
  const agencyPaymentLink = "https://buy.stripe.com/test_dRm4gA5W7eMo3bs0HM1wY04";

  const plans = [
    {
      name: "Demo",
      price: "0 CHF",
      text: "Gekürzte Vorschau zum Ausprobieren",
      features: [
        "Gekürzte Demo-Vorschau",
        "Volle Version mit 3 professionellen Varianten",
        "Standard-Plan 30 Tage kostenlos testen",
      ],
    },
    {
      name: "Standard",
      price: "30 Tage kostenlos",
      text: "Danach 19.90 CHF pro Monat",
      badge: "🔥 Gründerangebot",
      highlighted: true,
      features: [
        "Heute 0 CHF zahlen",
        "30 Tage kostenlos testen",
        "Danach 19.90 CHF pro Monat",
        "3 professionelle Inserat-Varianten",
        "Für Portale und Social Media",
      ],
    },
    {
      name: "Business",
      price: "79.90 CHF",
      text: "Für aktive Makler mit regelmässiger Objektvermarktung und höherem Volumen.",
      features: [
        "Bis zu 500 Inserate pro Monat",
        "Volle Version mit 3 professionellen Varianten",
        "Für regelmässige Objektvermarktung",
        "Priorisierter Support",
        "Für Immobilienportale und Social Media verwendbar",
      ],
    }, 
    {
      name: "Agency",
      price: "149.90 CHF",
      text: "Für Teams und Agenturen",
      features: [
        "Mehrere Makler",
        "Team-Nutzung",
        "Viele Inserate",
        "Priorisierter Support",
      ],
    },
  ];

  return (
    <section
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
    display: "inline-flex",
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
    Gründerangebot: Starte 30 Tage kostenlos. Danach nutzt du den
    Standard-Plan für nur 19.90 CHF pro Monat.
  </span>
</div>

      {/* Geändert: "alignItems: stretch" sorgt dafür, dass alle Boxen gleich hoch werden */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
            {/* Neuer umschliessender Box-Inhalt für alles AUSSER dem Button */}
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
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

              <h3
                style={{
                  margin: 0,
                  fontSize: "1.35rem",
                  fontWeight: 800,
                }}
              >
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
                  marginBottom: "20px", /* Abstand zum unteren Bereich gewahrt */
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
            
            {/* Geändert: "marginTop: 'auto'" schiebt den Button ans absolute Ende der Karte */}
            <a
              href={
                plan.name === "Demo"
                  ? "/register"
                  : plan.name === "Standard"
                  ? founderPaymentLink
                  : plan.name === "Business"
                  ? proPaymentLink
                  : agencyPaymentLink
              }
              target={plan.name === "Free" ? "_self" : "_blank"}
              rel={plan.name === "Free" ? undefined : "noopener noreferrer"}
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
              {plan.name === "Standard" ? "Jetzt starten" : "Auswählen"}
            </a>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#f8fafc",
          padding: "20px 24px",
          textAlign: "center",
          fontSize: "0.95rem",
          borderRadius: "18px",
          marginTop: "26px",
          color: "#334155",
        }}
      >
        Sichere Zahlung mit
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "12px",
            flexWrap: "wrap",
          }}
        >
          {["TWINT", "VISA", "MASTERCARD", "STRIPE"].map((m) => (
            <span
              key={m}
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "8px 12px",
                fontWeight: 800,
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
