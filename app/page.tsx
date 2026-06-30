"use client";
<section
  style={{
    padding: "55px 20px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e3a8a 100%)",
  }}
>
  <div
    style={{
      maxWidth: "760px",
      margin: "0 auto",
      textAlign: "center",
    }}
  >
    <h2
      style={{
        color: "#ffffff",
        fontSize: "clamp(2rem, 5vw, 3rem)",
        fontWeight: 900,
        marginBottom: "16px",
        letterSpacing: "-0.04em",
      }}
    >
      Inserat-AI in Aktion
    </h2>

    <p
      style={{
        color: "#cbd5e1",
        fontSize: "18px",
        lineHeight: 1.6,
        maxWidth: "720px",
        margin: "0 auto 36px auto",
      }}
    >
      Sehen Sie, wie aus wenigen Objektdaten in Sekunden professionelle
      Immobilieninserate entstehen.
    </p>

    <div
      style={{
        borderRadius: "28px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        background: "#020617",
      }}
    >
      <video
        src="/inserat-ai-demo.mp4"
        controls
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          display: "block",
        }}
      />
    </div>
  </div>
</section>
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
        headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
  location: form.ort,
  rooms: form.zimmer,
  livingArea: form.flaeche,
  price: form.preis,
  highlights: form.highlights,
  demo: true,
}),
      });

      const data = await res.json();
      setVariants(data.variants || []);
      setActiveVariant(0);
    

const demoVariant = data?.variants?.[0];

if (!demoVariant) {
  setVariants([{ title: "Fehler", text: "Keine Demo erhalten." }]);
  setActiveVariant(0);
  return;
}

setVariants([
  {
    title: demoVariant.title || "Demo-Inserat",
    text:
      demoVariant.text && demoVariant.text.length > 450
        ? demoVariant.text.slice(0, 450) + "..."
        : demoVariant.text,
  },
]);

setActiveVariant(0); 
    } catch {
      setVariants([{ title: "Fehler", text: "Fehler beim Generieren" }]);
      setActiveVariant(0);
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
       background:
  "linear-gradient(135deg, #0b1220 0%, #172554 50%, #92400e 100%)",
        padding: "70px 20px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1
          style={{
           color: "#ffffff",
            textAlign: "center",
            fontSize: "2.8rem",
            fontWeight: 900,
            marginBottom: "12px",
          }}
        >
         Professionelle Inserate in 20 Sekunden erstellen
        </h1>

       <p
  style={{
    color: "#e2e8f0",
    textAlign: "center",
    margin: "0 auto 28px auto",
    fontSize: "clamp(1rem, 3.8vw, 1.15rem)",
    lineHeight: 1.55,
    maxWidth: "760px",
  }}
>
  3 KI-Varianten für Homegate, ImmoScout24, Newhome und Social Media.
</p>
<div
  style={{
    textAlign: "center",
    marginBottom: "28px",
  }}
>
  <span
    style={{
      display: "inline-block",
      background: "rgba(255, 255, 255, 0.12)",
      color: "#fbbf24",
      border: "1px solid rgba(255, 255, 255, 0.22)",
      borderRadius: "999px",
      padding: "10px 16px",
      fontSize: "0.95rem",
      fontWeight: 700,
      backdropFilter: "blur(10px)",
    }}
  >
    Inserat-AI wird aktuell für die ersten Schweizer Immobilienmakler geöffnet.
    
  </span>
</div>
        <div
          style={{
            maxWidth: "580px",
            margin: "0 auto 25px",
            background: "#ffffff",
            padding: "30px",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.16)",
          }}
        >
          <input placeholder="Ort (z.B. Winterthur)" value={form.ort} onChange={(e) => setForm({ ...form, ort: e.target.value })} style={inputStyle} />
          <input placeholder="Zimmer (z.B. 4.5)" value={form.zimmer} onChange={(e) => setForm({ ...form, zimmer: e.target.value })} style={inputStyle} />
          <input placeholder="Fläche m² (z.B. 120)" value={form.flaeche} onChange={(e) => setForm({ ...form, flaeche: e.target.value })} style={inputStyle} />
          <input placeholder="Preis CHF (z.B. 2500)" value={form.preis} onChange={(e) => setForm({ ...form, preis: e.target.value })} style={inputStyle} />
          <input placeholder="Highlights (z.B. Balkon, Bahnhofsnähe)" value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} style={inputStyle} />

          <button onClick={handleGenerate} style={primaryBtn}>
            {loading ? "Generiere..." : "Jetzt Inserat erstellen"}
          </button>
        </div>

        {variants.length > 0 && (
          <>
            <div style={resultBox}>
             <h2
  style={{
    marginBottom: "12px",
    fontSize: "24px",
    fontWeight: 900,
    color: "rgba(15, 23, 42, 0.78)",
  }}
>
                {variants[activeVariant]?.title}
              </h2>
              <div
  style={{
    color: "rgba(15, 23, 42, 0.62)",
    lineHeight: 1.7,
  }}
>
  {variants[activeVariant]?.text}
</div>
            </div>

            <div style={variantWrapper}>
              {variants.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveVariant(i)}
                  style={{
                    ...variantBtn,
                    background: activeVariant === i ? "#f59e0b" : "#ffffff",
                    color: activeVariant === i ? "#ffffff" : "#111827",
                    border: activeVariant === i ? "1px solid #f59e0b" : "1px solid #e5e7eb",
                  }}
                >
                  Variante {i + 1}
                </button>
              ))}
            </div>
          </>
        )}
<section
  style={{
    padding: "35px 20px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e3a8a 100%)",
  }}
>
  <div
    style={{
      maxWidth: "1000px",
      margin: "0 auto",
      textAlign: "center",
    }}
  >
    <h2
      style={{
        color: "#ffffff",
        fontSize: "clamp(2rem, 5vw, 3rem)",
        fontWeight: 900,
        marginBottom: "16px",
        letterSpacing: "-0.04em",
      }}
    >
      So einfach entsteht Ihr Immobilieninserat
    </h2>

    <p
      style={{
        color: "#cbd5e1",
        fontSize: "18px",
        lineHeight: 1.6,
        maxWidth: "720px",
        margin: "0 auto 36px auto",
      }}
    >
      Sehen Sie, wie aus wenigen Angaben in Sekunden professionelle
      Inserat-Varianten für Immobilienportale und Social Media entstehen.
    </p>

    <div
      style={{
        borderRadius: "28px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        background: "#020617",
      }}
    >
      <video
        src="/inserat-ai-demo.mp4"
        controls
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          display: "block",
        }}
      />
    </div>
  </div>
</section>
        <PricingSection />
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
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
  padding: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#f59e0b",
  color: "#fff",
  fontWeight: 800,
  fontSize: "16px",
  cursor: "pointer",
};

const resultBox = {
  background: "rgba(255, 255, 255, 0.78)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.35)",
  borderRadius: "24px",
  padding: "34px",
  maxWidth: "900px",
  margin: "36px auto 0",
  color: "rgba(15, 23, 42, 0.68)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
userSelect: "none" as const,

};

const variantWrapper: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
  justifyContent: "center",
  flexWrap: "wrap",
};

const variantBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 700,
};