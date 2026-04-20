"use client";

import { useState } from "react";
import PricingSection from "./components/PricingSection";

export default function Home() {
  const [loading, setLoading] = useState(false);
 const [variants, setVariants] = useState<any[]>([]);
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
  setVariants(data.variants || []);
      setActiveVariant(0);
    } catch (err) {
     setVariants([{ title: "Fehler", text: "Fehler beim Generieren" }]);
      setActiveVariant(0);
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        padding: "60px 20px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1
          style={{
            color: "#ffffff",
            textAlign: "center",
            fontSize: "2.8rem",
            fontWeight: 800,
            marginBottom: "10px",
          }}
        >
          Immobilieninserate in 20 Sekunden erstellen
        </h1>

        <p
          style={{
            color: "#cbd5e1",
            textAlign: "center",
            marginBottom: "30px",
            fontSize: "1.05rem",
          }}
        >
          Teste Inserat-AI direkt auf der Landingpage
        </p>

        <div
          style={{
            maxWidth: "560px",
            margin: "0 auto 30px",
            background: "rgba(255,255,255,0.96)",
            padding: "30px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
            backdropFilter: "blur(10px)",
          }}
        >
          <input
            placeholder="Ort (z.B. Winterthur)"
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
            placeholder="Fläche m² (z.B. 150)"
            value={form.flaeche}
            onChange={(e) => setForm({ ...form, flaeche: e.target.value })}
            style={inputStyle}
          />

          <input
            placeholder="Preis CHF (z.B. 1000000)"
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

          <button onClick={handleGenerate} style={primaryBtn}>
            {loading ? "Generiere..." : "Jetzt Inserat erstellen"}
          </button>
        </div>

        {variants.length > 0 && (
  <>
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        maxWidth: "760px",
        margin: "20px auto 0",
        color: "#111827",
        whiteSpace: "pre-wrap",
        lineHeight: 1.7,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      }}
    >
      <h2 style={{ marginBottom: "10px", fontSize: "22px" }}>
        {variants[activeVariant]?.title}
      </h2>

      <div>{variants[activeVariant]?.text}</div>
    </div>

    <div
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "10px",
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      {variants.map((_, i) => (
        <button
          key={i}
          onClick={() => setActiveVariant(i)}
          style={{
            ...variantBtn,
            background: activeVariant === i ? "#111827" : "#ffffff",
            color: activeVariant === i ? "#ffffff" : "#111827",
          }}
        >
          Variante {i + 1}
        </button>
      ))}
    </div>
  </>
)}

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
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "none",
  background: "#f59e0b",
  color: "#fff",
  fontWeight: 700,
  fontSize: "16px",
  cursor: "pointer",
};

const variantBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};