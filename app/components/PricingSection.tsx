"use client";

export default function PricingSection() {
  return (
    <section style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#1a2035" }}>

      <div className="cardsRow" style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "16px" }}>
        <style>{`
          @media (min-width: 768px) {
            .cardsRow { flex-direction: row !important; overflow-x: auto; }
            .priceCard { flex: 0 0 220px !important; width: auto !important; }
          }
        `}</style>

        <div className="priceCard" style={{ background: "#f7f5ee", borderRadius: "20px", padding: "28px 22px", width: "100%" }}>
          <h3>Free</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800 }}>0 CHF</p>
          <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>50 Inserate kostenlos testen</p>
        </div>

        <div className="priceCard" style={{ background: "linear-gradient(160deg,#fffbe6,#fdf3cc)", border: "2.5px solid #f0b429", borderRadius: "20px", padding: "28px 22px", width: "100%" }}>
          <h3>Founder ⭐</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800 }}>19.90 CHF</p>
          <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>Für die ersten 30 Makler</p>
        </div>

        <div className="priceCard" style={{ background: "#f7f5ee", borderRadius: "20px", padding: "28px 22px", width: "100%" }}>
          <h3>Standard</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800 }}>39.90 CHF</p>
          <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>danach</p>
        </div>

        <div className="priceCard" style={{ background: "#f7f5ee", borderRadius: "20px", padding: "28px 22px", width: "100%" }}>
          <h3>Pro</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: 800 }}>79.90 CHF</p>
          <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>Exposé PDF / Social Media / mehr Features</p>
        </div>

      </div>

      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <h3>Agency</h3>
        <p style={{ fontSize: "3rem", fontWeight: 800 }}>249.90 CHF</p>
        <p style={{ color: "#6b7280" }}>Teams / mehrere Makler</p>
      </div>

      <div style={{ background: "#f3f4f6", padding: "20px 24px", textAlign: "center", fontSize: "0.88rem", color: "#6b7280" }}>
        Sichere Zahlung mit
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
          {["TWINT", "VISA", "MASTERCARD", "STRIPE"].map((m) => (
            <span key={m} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700 }}>{m}</span>
          ))}
        </div>
      </div>

    </section>
  );
}