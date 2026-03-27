"use client";
import { useState } from "react";
import PricingSection from "./components/PricingSection";

export default function Home() {
    const [loading, setLoading] = useState(false);
const [result, setResult] = useState("");

const [form, setForm] = useState({
  ort: "",
  zimmer: "",
  flaeche: "",
  preis: "",
});
async function handleGenerate() {
  setLoading(true);
  setResult("");

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
      }),
    });

    const data = await res.json();
    setResult(data?.text || "Fehler");
  } catch {
    setResult("Fehler");
  }

  setLoading(false);
}
return (
    <main style={{ padding: "40px 20px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ marginTop: "40px" }}>
          <div
            style={{
              display: "inline-block",
              fontSize: "13px",
              color: "#c7a76a",
              marginBottom: "14px",
              padding: "6px 12px",
              border: "1px solid rgba(199,167,106,0.35)",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Für Immobilienmakler entwickelt
          </div>

          <h1
            style={{
              fontSize: "48px",
              lineHeight: 1.1,
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 16px",
            }}
          >
            Immobilieninserate in 20 Sekunden erstellen
          </h1>

          <p
            style={{
              maxWidth: "900px",
              margin: "0 auto 34px",
              fontSize: "18px",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            Erstellen Sie professionelle Immobilieninserate für Homegate,
            ImmoScout24, Exposés und Social Media in wenigen Sekunden statt
            Stunden.
          </p>
        </div>

        <div
          style={{
            maxWidth: "620px",
            margin: "0 auto 28px",
            background: "#ffffff",
            borderRadius: "18px",
            padding: "26px",
            border: "1px solid rgba(17,24,39,0.08)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Jetzt direkt testen
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              marginBottom: "18px",
            }}
          >
            Gib ein paar Eckdaten ein und erhalte sofort ein Beispiel-Inserat.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
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
          </div>

          <button
            onClick={handleGenerate}
            style={{
              marginTop: "16px",
              width: "100%",
              padding: "14px 18px",
              background: "#f5a623",
              color: "#111827",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            {loading ? "Generiere..." : "Jetzt Inserat erstellen"}
          </button>
        </div>

        {result && (
          <div
            style={{
              maxWidth: "760px",
              margin: "0 auto 48px",
              textAlign: "left",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "26px",
              border: "1px solid rgba(17,24,39,0.08)",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                marginBottom: "10px",
              }}
            >
              Beispiel eines automatisch generierten Inserats:
            </p>

            <div
              style={{
                whiteSpace: "pre-wrap",
                color: "#1f2937",
                lineHeight: 1.75,
                fontSize: "15px",
              }}
            >
              {result}
            </div>
          </div>
        )}

        <PricingSection />
      </div>
    </main>
  );
}const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};