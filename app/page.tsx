"use client";

import { useState } from "react";
import PricingSection from "./components/PricingSection";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
const [activeVariant, setActiveVariant] = useState(0);
  const [form, setForm] = useState({
    ort: "",
    zimmer: "",
    flaeche: "",
    preis: "",
      highlights: "",
  });

  async function handleGenerate() {
    setLoading(true);
   

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: form.ort,
          rooms: form.zimmer,
          livingArea: form.flaeche,
          price: form.preis,
          demo: true,
          highlights: form.highlights,
        }),
      });

      const data = await res.json();
      setVariants(data.variants || [data.text]);
setActiveVariant(0);
    } catch (err) {
     setVariants(["Fehler beim Generieren"]);
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        padding: "40px 20px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        {/* HEADER */}
        <h1
          style={{
            color: "#ffffff",
            textAlign: "center",
            fontSize: "2.2rem",
            fontWeight: 800,
          }}
        >
          Immobilieninserate in 20 Sekunden erstellen
        </h1>

        <p
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          Teste Inserat-AI direkt auf der Landingpage
        </p>

        {/* FORMULAR */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "500px",
            margin: "0 auto 30px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <input
            placeholder="Ort (z.B. Zürich)"
            value={form.ort}
            onChange={(e) => setForm({ ...form, ort: e.target.value })}
            style={inputStyle}
          />

          <input
            placeholder="Zimmer (z.B. 4.5)"
            value={form.zimmer}
            onChange={(e) => setForm({ ...form, zimmer: e.target.value })}
            style={inputStyle}
          />

          <input
            placeholder="Fläche m² (z.B. 120)"
            value={form.flaeche}
            onChange={(e) => setForm({ ...form, flaeche: e.target.value })}
            style={inputStyle}
          />

          <input
            placeholder="Preis CHF (z.B. 2500)"
            value={form.preis}
            onChange={(e) => setForm({ ...form, preis: e.target.value })}
            style={inputStyle}
          />
<input
  placeholder="Besonderheiten (z.B. Nähe Bahnhof, Spielplatz, Balkon)"
  value={form.highlights}
  onChange={(e) => setForm({ ...form, highlights: e.target.value })}
  style={inputStyle}
/>
          <button
            onClick={handleGenerate}
            style={{
              marginTop: "10px",
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "none",
              background: "#f59e0b",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Generiere..." : "Jetzt Inserat erstellen"}
          </button>
        </div>

  
  <>
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        maxWidth: "700px",
        margin: "20px auto 0",
        color: "#111827",
        whiteSpace: "pre-wrap",
        lineHeight: 1.6,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      }}
    >
     
    </div>

    <div
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "10px",
        justifyContent: "center",
      }}
    >
      <button style={variantBtn}>Variante 1</button>
      <button style={variantBtn}>Variante 2</button>
    </div>
  </>


  

        {/* PRICING */}
        <PricingSection />

      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  marginBottom: "10px",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
};
const variantBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};