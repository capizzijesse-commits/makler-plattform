"use client";

import { useMemo, useState } from "react";

type Variant = { title: string; text: string };

export default function Page() {
  const [location, setLocation] = useState("Winterthur");
  const [propertyType, setPropertyType] = useState("Wohnung");
  const [rooms, setRooms] = useState("4.5");
  const [livingArea, setLivingArea] = useState("110");
  const [price, setPrice] = useState("1'090'000");
  const [style, setStyle] = useState("Luxus / Premium");
  const [tone, setTone] = useState("Professionell, modern, vertrauenswürdig");
  const [extras, setExtras] = useState("Balkon | Lift | Garage | Ruhige Lage");

  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [active, setActive] = useState(0);

  // Copy-Schutz: Preview ist blurred, Copy geht nur über Button
  const isUnlocked = useMemo(() => {
    // Später: hier kommt Abo/Login
    return true; // für jetzt: true, damit du testen kannst
  }, []);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          propertyType,
          rooms,
          livingArea,
          price,
          style,
          tone,
          extras,
          variants: 3,
        }),
      });
      const json = await res.json();
      setVariants(json?.variants ?? []);
      setActive(0);
    } finally {
      setLoading(false);
    }
  }

  async function copyActive() {
    const v = variants[active];
    if (!v) return;
    await navigator.clipboard.writeText(`${v.title}\n\n${v.text}`);
    alert("✅ Text kopiert");
  }

  function downloadPdfPlaceholder() {
    alert("PDF Export ist bei dir bereits integriert – das hängen wir hier sauber an.");
  }

  const current = variants[active];

  return (
    <div className="grid2">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="badge">Premium Inserat Generator</div>
            <h1 style={{ margin: "12px 0 6px", fontSize: 28, fontWeight: 800 }}>
              Inserate in Sekunden – hochwertig & verkaufsstark
            </h1>
            <div style={{ color: "rgb(var(--muted))", fontSize: 14, maxWidth: 620 }}>
              Fokus: Schweizer Markt, klare Struktur, luxuriöses Wording ohne unseriöse Übertreibungen.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btnPrimary" onClick={generate} disabled={loading}>
              {loading ? "Generiere…" : "Generieren (3 Varianten)"}
            </button>
          </div>
        </div>

        <div style={{ height: 16 }} />

        <div className="row">
          <div>
            <div className="label">Ort / Lage</div>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <div className="label">Objektart</div>
            <select className="select" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              <option>Wohnung</option>
              <option>Haus</option>
              <option>Villa</option>
              <option>Attika</option>
              <option>Gewerbe</option>
            </select>
          </div>
          <div>
            <div className="label">Zimmer</div>
            <input className="input" value={rooms} onChange={(e) => setRooms(e.target.value)} />
          </div>
          <div>
            <div className="label">Wohnfläche (m²)</div>
            <input className="input" value={livingArea} onChange={(e) => setLivingArea(e.target.value)} />
          </div>
          <div>
            <div className="label">Preis (CHF)</div>
            <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <div className="label">Stil</div>
            <select className="select" value={style} onChange={(e) => setStyle(e.target.value)}>
              <option>Luxus / Premium</option>
              <option>Modern</option>
              <option>Klassisch</option>
              <option>Minimalistisch</option>
              <option>Familienfreundlich</option>
            </select>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div className="row">
          <div>
            <div className="label">Ton / Sprache</div>
            <input className="input" value={tone} onChange={(e) => setTone(e.target.value)} />
          </div>
          <div>
            <div className="label">Highlights (mit | trennen)</div>
            <input className="input" value={extras} onChange={(e) => setExtras(e.target.value)} />
          </div>
        </div>
      </section>

      <aside className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div className="badge">Output</div>
            <div style={{ marginTop: 6, fontWeight: 800 }}>Varianten</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={downloadPdfPlaceholder} disabled={!current}>
              PDF
            </button>
            <button className="btn btnPrimary" onClick={copyActive} disabled={!current || !isUnlocked}>
              Copy
            </button>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {variants.map((v, i) => (
            <button
              key={i}
              className="btn"
              style={{
                borderColor: i === active ? `rgb(var(--accent))` : undefined,
                background: i === active ? `rgba(var(--accent), 0.15)` : undefined,
              }}
              onClick={() => setActive(i)}
            >
              Variante {i + 1}
            </button>
          ))}
        </div>

        <div style={{ height: 12 }} />

        <div className="previewBox">
          <div className={!isUnlocked ? "previewBlur" : undefined}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>
              {current?.title || "Noch nichts generiert"}
            </div>
            <div style={{ height: 8 }} />
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "rgba(244,244,245,0.92)" }}>
              {current?.text ||
                "Klicke auf “Generieren”, um hochwertige Inserate zu erstellen. Copy & PDF sind für den professionellen Workflow gedacht."}
            </div>
          </div>

          {!isUnlocked && (
            <div className="overlayLock">
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>🔒 Vorschau-Modus</div>
                <div style={{ marginTop: 6, color: "rgba(244,244,245,0.85)" }}>
                  Voller Text + Copy/PDF nur mit Zugang.
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: 12 }} />

        <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
          Anti-Copy Hinweis: Vorschau kann geblurrt werden, Copy läuft über Button (später Abo/Login).
        </div>
      </aside>
    </div>
  );
}