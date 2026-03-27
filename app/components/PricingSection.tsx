"use client";

export default function PricingSection() {
  return (
    <section style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#1a2035" }}>

      <div
  className="cardsRow"
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  }}
>

       <div
  className="priceCard"
  style={{
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
  }}
>
        <div
  className="priceCard"
  style={{
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
  }}
></div>

       <div
  className="priceCard"
  style={{
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
  }}
></div>

      <div
  className="priceCard"
  style={{
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
  }}
></div>

       <div
  className="priceCard"
  style={{
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
  }}
></div>

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
></div>
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