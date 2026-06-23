"use client";

export default function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "0 CHF",
      text: "50 Inserate kostenlos testen",
      features: ["3 KI-Varianten", "Direkt testen", "Kein Risiko"],
    },
    {
      name: "Standard",
      price: "39.90 CHF",
      text: "Für einzelne Makler",
      badge: "🔥 Meist gewählt",
      highlighted: true,
      features: [
        "100 Inserate pro Monat",
        "3 professionelle Varianten",
        "Export für Immobilienportale",
        "Social-Media-Texte",
      ],
    },
    {
      name: "Pro",
      price: "79.90 CHF",
      text: "Für aktive Makler",
      features: [
        "Mehr Inserate",
        "PDF-Exposé",
        "Facebook, Instagram & LinkedIn",
        "Mehr Features",
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
      style={{
        background: "#ffffff",
        fontFamily: "Inter, sans-serif",
        color: "#1f2937",
        borderRadius: "24px",
        padding: "36px 24px 44px",
        maxWidth: "1100px",
        margin: "45px auto 0",
        boxSizing: "border-box",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.10)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: "28px",
        }}
      >
        <p
          style={{
            display: "inline-block",
            background: "#fff7ed",
            color: "#c2410c",
            padding: "8px 14px",
            borderRadius: "999px",
            fontWeight: 800,
            fontSize: "0.85rem",
            marginBottom: "12px",
          }}
        >
       Gründerangebot: Die ersten 50 Makler sichern sich den Standard-Plan dauerhaft für 19.90 CHF statt 39.90 CHF pro Monat.
        </p>

        <h2
          style={{
            fontSize: "2.2rem",
            fontWeight: 900,
            margin: "0 0 8px",
          }}
        >
          Preise
        </h2>

        <p
          style={{
            color: "#64748b",
            margin: 0,
            fontSize: "1rem",
          }}
        >
          Teste Inserat - AI kostenlos mit 50 Inseraten und wechsle danach auf den passenden Plan.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "20px",
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
              minHeight: "330px",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
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
                marginTop: "auto",
                textAlign: "left",
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

            <button
              style={{
                marginTop: "22px",
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                background: plan.highlighted ? "#f59e0b" : "#111827",
                color: "#ffffff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {plan.highlighted ? "Jetzt starten" : "Auswählen"}
            </button>
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