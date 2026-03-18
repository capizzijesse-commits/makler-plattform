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
            <div className="badge">Makler AI Pro</div>
            <h1>Premium Inserat Generator</h1>
            <p>
              Hochwertige Immobilientexte für Homegate, ImmoScout24, Exposé und
              Social Media – strukturiert, verkaufsstark und professionell.
            </p>
          </div>

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
        </div>

        <div className="grid">
          <section className="leftCard">
            <div className="badge">Objektdaten</div>
            <h2>Eingabe</h2>
            <p className="sectionText">
              Erfasse die wichtigsten Eckdaten der Immobilie. Die KI erstellt
              daraus mehrere professionelle Textvarianten.
            </p>

            <div className="grid">
            <input placeholder="Winterthur" />
<input placeholder="4.5" />
<input placeholder="110" />
<input placeholder="1090000" />
<input placeholder="Balkon, Lift, Garage, ruhige Lage" />
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

            <div className="miniStats">
              <MiniStat title="Markt" value="Schweiz" />
              <MiniStat title="Output" value="3 Varianten" />
              <MiniStat title="Stil" value="Premium" />
            </div>
          </section>
<section className="rightCard">
  <div className="outputTop">
    <div>
      <div className="outputBadge">Output</div>
      <div className="outputState">
        {variants.length > 0
          ? `Variante ${activeIndex + 1} aktiv`
          : "Noch nichts generiert"}
      </div>
    </div>

    {variants.length > 0 && (
      <div className="tabs">
        {variants.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`tab ${i === activeIndex ? "active" : ""}`}
          >
            Variante {i + 1}
          </button>
        ))}
      </div>
    )}
  </div>

  <div className="outputCard">
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
        .rightCard {
  background: #fff9ec;
  border: 1px solid #e9d7a8;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  color: #1f2937;
  height: 750px;
  overflow-y: auto;
}

.outputTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.outputBadge {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: #8a6a1f;
  background: #f7ebc8;
  border: 1px solid #e4c97e;
  padding: 6px 10px;
  border-radius: 999px;
}

.outputState {
  font-size: 24px;
  font-weight: 800;
  color: #1f2937;
  margin-top: 10px;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #e8d9b5;
  background: #fffdf7;
  color: #6b5530;
  font-weight: 700;
  cursor: pointer;
}

.tab.active {
  border: 1px solid #c59a2d;
  background: #f7e4b5;
  color: #4f3d1d;
}

.outputCard {
  background: #ffffff;
  border: 1px solid #f0e3c1;
  border-radius: 18px;
  padding: 22px;
  min-height: 260px;
}

.emptyState {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #8b8b8b;
}

.emptyTitle {
  font-weight: 700;
  font-size: 22px;
  margin-bottom: 10px;
  color: #6b7280;
}

.emptyText {
  line-height: 1.6;
}

.outputTitle {
  margin: 0 0 18px 0;
  font-size: 36px;
  line-height: 1.08;
  color: #1f2937;
}

.outputText {
  white-space: pre-line;
  font-size: 18px;
  line-height: 1.8;
  color: #4b5563;
  margin: 0;
}
  .grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 22px;
  align-items: start;
}

.outputMeta {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.metaBlock {
  color: #7b7b7b;
  line-height: 1.7;
}

.metaTitle {
  font-weight: 700;
  color: #5c5c5c;
  margin-bottom: 4px;
}

.metaLine {
  color: #8c8c8c;
}

.bonusBlock {
  border: 1px solid #f0e3c1;
  background: #fffaf0;
  border-radius: 16px;
  padding: 16px;
}

.bonusTitle {
  font-weight: 800;
  margin-bottom: 8px;
  color: #8a6a1f;
}

.bonusText {
  color: #7b6a46;
  line-height: 1.6;
  margin-bottom: 12px;
}

.bonusBtn {
  border: 1px solid #ecd9a3;
  background: #f8ebc4;
  color: #7a6021;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
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