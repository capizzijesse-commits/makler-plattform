"use client";

export default function PricingSection() {
  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e5e7eb",
    minHeight: "170px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    textAlign: "center",
    boxSizing: "border-box",
  };

  return (
    <section
      style={{
        background: "#ffffff",
        fontFamily: "Inter, sans-serif",
        color: "#1f2937",
        borderRadius: "20px",
        padding: "32px 20px 40px",
        maxWidth: "1100px",
        margin: "40px auto 0",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          fontSize: "2rem",
          fontWeight: 800,
          marginBottom: "24px",
        }}
      >
        Preise
      </h2>

      <div
        className="cardsRow"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div className="priceCard" style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Free</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "12px 0 8px" }}>
            0 CHF
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
            50 Inserate kostenlos testen
          </p>
        </div>

        <div
          className="priceCard"
          style={{
            ...cardStyle,
            border: "2px solid #f5a623",
            transform: "scale(1.03)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Founder ⭐</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "12px 0 8px" }}>
            19.90 CHF
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
            Für die ersten 30 Makler
          </p>
        </div>

        <div className="priceCard" style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Standard</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "12px 0 8px" }}>
            39.90 CHF
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
            Danach
          </p>
        </div>

        <div className="priceCard" style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Pro</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800, margin: "12px 0 8px" }}>
            79.90 CHF
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
            Exposé PDF / Social Media / mehr Features
          </p>
        </div>
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          border: "1px solid #e5e7eb",
          maxWidth: "1100px",
          margin: "20px auto 0",
          minHeight: "180px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.3rem" }}>Agency</h3>
        <p style={{ fontSize: "3rem", fontWeight: 800, margin: "12px 0 8px" }}>
          249.90 CHF
        </p>
        <p style={{ color: "#6b7280", fontSize: "1rem", margin: 0 }}>
          Teams / mehrere Makler
        </p>
      </div>

      <div
        style={{
          background: "#f3f4f6",
          padding: "20px 24px",
          textAlign: "center",
          fontSize: "0.95rem",
          borderRadius: "16px",
          marginTop: "20px",
        }}
      >
        Sichere Zahlung mit
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "10px",
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
                fontWeight: 700,
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