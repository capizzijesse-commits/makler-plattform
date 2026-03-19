"use client";

import { useState } from "react";

type Variant = {
  title: string;
  text: string;
  highlights?: string[];
  cta?: string;
};

export default function DashboardPage() {
  const [instagramPost, setInstagramPost] = useState("");
const [linkedinPost, setLinkedinPost] = useState("");
 const [location, setLocation] = useState("")
const [propertyType, setPropertyType] = useState("")
const [rooms, setRooms] = useState("")
const [livingArea, setLivingArea] = useState("")
const [price, setPrice] = useState("")
const [styleText, setStyleText] = useState("")
const [highlights, setHighlights] = useState("")
    
    "Balkon, Lift, Garage, ruhige Lage"
  ;

  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  {(instagramPost || linkedinPost) && (
  <div
    style={{
      marginTop: "24px",
      display: "grid",
      gap: "16px",
    }}
  >
    {instagramPost && (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          border: "1px solid #f0e3c1",
          padding: "18px",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "16px",
            marginBottom: "10px",
            color: "#1f2937",
          }}
        >
          Instagram Post
        </div>
        <p
          style={{
            margin: 0,
            whiteSpace: "pre-line",
            color: "#445066",
            lineHeight: 1.8,
            fontSize: "15px",
          }}
        >
          {instagramPost}
        </p>
      </div>
    )}

    {linkedinPost && (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          border: "1px solid #f0e3c1",
          padding: "18px",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "16px",
            marginBottom: "10px",
            color: "#1f2937",
          }}
        >
          LinkedIn Post
        </div>
        <p
          style={{
            margin: 0,
            whiteSpace: "pre-line",
            color: "#445066",
            lineHeight: 1.8,
            fontSize: "15px",
          }}
        >
          {linkedinPost}
        </p>
      </div>
    )}
  </div>
)}

  const current = variants[activeIndex];

 async function generateText() {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location,
        rooms,
        livingArea,
        price,
        propertyType,
        highlights,
        styleText,
        imageAnalysis: "",
      }),
    });

    const data = await response.json();
    console.log("GENERATE RESPONSE:", data);

    if (!response.ok) {
      throw new Error(data?.error || "Fehler beim Generieren");
    }

    const variants = Array.isArray(data?.variants) ? data.variants : [];

    if (!variants.length) {
      throw new Error("Keine Varianten erhalten");
    }

    setVariants(variants);
    setActiveIndex(0);
  } catch (error) {
    console.error("FRONTEND GENERATE ERROR:", error);
    alert("Fehler beim Generieren.");
  }
}

  async function copyActive() {
    if (!current) {
      alert("Bitte zuerst eine Variante generieren.");
      return;
    }

    const bulletText =
      current.highlights && current.highlights.length > 0
        ? `\n\nHighlights\n${current.highlights.map((h) => `• ${h}`).join("\n")}`
          : "";

  const ctaText = current.cta ? `\n\n${current.cta}` : "";

const fullText = `${current.title}\n\n${current.text}${bulletText}${ctaText}`;

await navigator.clipboard.writeText(fullText);
  }

  function exportPdf() {
    if (!current) {
      alert("Bitte zuerst eine Variante generieren.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      alert("Pop-up blockiert. Bitte Pop-ups erlauben.");
      return;
    }

    const title = current.title;
    const text = current.text.replace(/\n/g, "<br>");
    const bulletHtml =
      current.highlights && current.highlights.length > 0
        ? `
          <div style="margin-top:24px;">
            <div style="font-weight:700;font-size:16px;margin-bottom:10px;">Highlights</div>
            <ul style="margin:0;padding-left:20px;line-height:1.8;">
              ${current.highlights.map((h) => `<li>${h}</li>`).join("")}
            </ul>
          </div>
        `
        : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              line-height: 1.7;
              color: #1f2937;
            }
            h1 {
              font-size: 30px;
              margin-bottom: 24px;
              line-height: 1.15;
            }
            .meta {
              margin-bottom: 14px;
              font-size: 12px;
              color: #8b7355;
              font-weight: bold;
              letter-spacing: 0.04em;
            }
            .container {
              max-width: 900px;
              margin: auto;
            }
            .content {
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="meta">Makler AI Pro – PDF Export</div>
            <h1>${title}</h1>
            <div class="content">${text}</div>
            ${bulletHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  return (
    <main className="page">
      <div className="shell">
        <div className="topbar">
          <div className="hero">
            <h1>Premium Inserat Generator</h1>
            <p>
              Hochwertige Immobilientexte für Homegate, ImmoScout24, Exposé und
              Social Media – strukturiert, verkaufsstark und professionell.
            </p>
          </div>

        </div>

        <div className="grid">
          <section
  className="leftCard"
  style={{
    height: "620px",
    display: "flex",
    flexDirection: "column",
  }}
>
         
            <h2>Eingabe</h2>
            <p className="sectionText">
              Erfasse die wichtigsten Eckdaten der Immobilie. Die KI erstellt
              daraus mehrere professionelle Textvarianten.
            </p>

            <div className="grid">

<Field label="Ort / Lage">
  <input
    value={location}
    placeholder="Winterthur"
    onChange={(e) => setLocation(e.target.value)}
    className="input"
  />
</Field>

<Field label="Objektart">
  <input
    value={propertyType}
    placeholder="Wohnung"
    onChange={(e) => setPropertyType(e.target.value)}
    className="input"
  />
</Field>

<Field label="Zimmer">
  <input
    value={rooms}
    placeholder="4.5"
    onChange={(e) => setRooms(e.target.value)}
    className="input"
  />
</Field>

<Field label="Wohnfläche (m²)">
  <input
    value={livingArea}
    placeholder="110"
    onChange={(e) => setLivingArea(e.target.value)}
    className="input"
  />
</Field>

<Field label="Preis (CHF)">
  <input
    value={price}
    placeholder="1090000"
    onChange={(e) => setPrice(e.target.value)}
    className="input"
  />
</Field>

<Field label="Stil">
  <input
    value={styleText}
    placeholder="Luxus / Premium"
    onChange={(e) => setStyleText(e.target.value)}
    className="input"
  />
</Field>

<Field label="Highlights (mit Komma trennen)">
  <input
    value={highlights}
    placeholder="Balkon, Lift, Garage, ruhige Lage"
    onChange={(e) => setHighlights(e.target.value)}
    className="input"
  />
</Field>
</div>
            <div className="divider" />

          <div className="actions">
            <button
              onClick={generateText}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Generiere..." : "Generieren (3 Varianten)"}
            </button>

            <button
              onClick={copyActive}
              disabled={!current}
              className="btn btn-secondary"
            >
              Copy
            </button>

            <button
              onClick={exportPdf}
              disabled={!current}
              className="btn btn-secondary"
            >
              PDF
            </button>
          </div>
            <div className="miniStats">
              <MiniStat title="Markt" value="Schweiz" />
              <MiniStat title="Output" value="3 Varianten" />
              <MiniStat title="Stil" value="Premium" />
            </div>
          </section>
<section
  className="rightCard"
  style={{
    height: "100%",
    display: "flex",
    flexDirection: "column",
  }}
>
  <div className="outputTop">
    <div>
      <div className="outputBadge">Output</div>
      <div className="outputState">
        {variants.length > 0
          ? `Variante ${activeIndex + 1} aktiv`
          : "Noch nichts generiert"}
      </div>
    </div>

    <div className="tabs">
      {variants.length > 0 &&
        variants.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`tab ${i === activeIndex ? "active" : ""}`}
          >
            Variante {i + 1}
          </button>
        ))}
    </div>
  </div>

 <div
  className="outputCard"
  style={{
    flex: 1,
    overflowY: "auto",
    overflow: "visible",
    paddingRight: "6px",
  }}
>
    {variants.length === 0 ? (
      <div className="emptyState">
        <div className="emptyTitle">Noch keine Variante vorhanden</div>
        <div className="emptyText">
          Gib links die Objektdaten ein und klicke auf „Generieren (3 Varianten)“.
        </div>
      </div>
    ) : (
      <>
        <h2 className="outputTitle">
          {variants[activeIndex]?.title}
        </h2>

        <p className="outputText">
          {variants[activeIndex]?.text}
        </p>
      </>
    )}
  </div>

  <div className="outputMeta">
    <div className="metaBlock">
      <div className="metaTitle">
        Du hast {variants.length > 0 ? 1 : 0} Inserate erstellt
      </div>
      <div className="metaLine">≈ 0 Stunden Arbeit gespart</div>
      <div className="metaLine">Noch 50 kostenlose Inserate übrig</div>
    </div>

    <div className="bonusBlock">
      <div className="bonusTitle">🎁 Bonus</div>
      <div className="bonusText">
        Empfehle InseratAI einem Maklerkollegen und erhalte 5 zusätzliche Inserate kostenlos.
      </div>
      <button className="bonusBtn">Empfehlungslink kopieren</button>
    </div>
  </div>
</section>
        </div>
      </div>

    <style jsx>{`
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #07111e 0%, #0a1627 45%, #0d1b2e 100%);
  color: #ffffff;
  padding: 28px 16px 40px;
}

.shell {
flex: 1;
  max-width: 1280px;
  margin: 0 auto;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.logo {
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.08em;
}

.grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 22px;
  align-items: stretch;
}

/* ---------- LEFT CARD ---------- */

.leftCard {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(0,0,0,0.22);
}

.leftCard h2 {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 10px;
}

.sectionText {
  color: rgba(255,255,255,0.72);
  margin-bottom: 22px;
  line-height: 1.6;
  font-size: 14px;
}

.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full {
  grid-column: 1 / -1;
}

.input {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 14px 15px;
  color: #fff;
  font-size: 15px;
  outline: none;
}

.input::placeholder {
  color: rgba(255,255,255,0.4);
}

.divider {
  height: 1px;
  background: rgba(255,255,255,0.08);
  margin: 22px 0;
}

/* ---------- BUTTONS ---------- */

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 28px;
  margin-bottom: 22px;
}
.btn {
  border-radius: 12px;
  padding: 12px 18px;
  font-weight: 800;
  cursor: pointer;
  border: none;
  transition: 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #1cb8f6 0%, #129ce0 100%);
  color: #fff;
  box-shadow: 0 10px 24px rgba(28,184,246,0.25);
}

.btn-secondary {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
}

/* ---------- MINI STATS ---------- */

.miniStats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 14px;
  margin-bottom: 30px;
}
  .miniStats div {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 12px;
}

/* ---------- RIGHT CARD ---------- */

.rightCard {
  background: #fff9ec;
  border: 1px solid #e9d7a8;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(0,0,0,0.18);
  color: #1f2937;
  height: 750px;
  overflow-y: auto;
}

.outputTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.outputBadge {
  font-size: 12px;
  font-weight: 700;
  color: #8a6a1f;
  background: #f7ebc8;
  border: 1px solid #e4c97e;
  padding: 6px 10px;
  border-radius: 999px;
}

.outputState {
  font-size: 22px;
  font-weight: 800;
  margin-top: 8px;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #e8d9b5;
  background: #fffdf7;
  cursor: pointer;
  font-weight: 700;
}

.tab.active {
  background: #f7e4b5;
  border: 1px solid #c59a2d;
}

.outputCard {
  background: #fff;
  border: 1px solid #f0e3c1;
  border-radius: 18px;
  padding: 20px;
}

.outputTitle {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 14px;
}

.outputText {
  font-size: 17px;
  line-height: 1.7;
  color: #4b5563;
}

.outputMeta {
  margin-top: 18px;
  display: grid;
  gap: 12px;
}

.metaBlock {
  color: #777;
}

.bonusBlock {
  border: 1px solid #f0e3c1;
  background: #fffaf0;
  border-radius: 14px;
  padding: 14px;
}

.bonusBtn {
  margin-top: 10px;
  border: 1px solid #ecd9a3;
  background: #f8ebc4;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 700;
}

/* ---------- MOBILE ---------- */

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .rightCard {
    height: auto;
  }

  .formGrid {
    grid-template-columns: 1fr;
  }

  .miniStats {
    grid-template-columns: 1fr;
  }
}
`}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "13px",
          color: "rgba(255,255,255,0.72)",
          marginBottom: "8px",
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.58)",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "#FFFFFF",
        }}
      >
        {value}
      </div>
    </div>
  );
}