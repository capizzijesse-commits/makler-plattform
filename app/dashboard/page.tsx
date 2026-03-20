"use client";

import { useState, type ReactNode } from "react";

type Variant = {
  title: string;
  text: string;
  highlights?: string[];
  cta?: string;
};

export default function DashboardPage() {
  const [instagramPost, setInstagramPost] = useState("");
  const [linkedinPost, setLinkedinPost] = useState("");
  const [facebookPost, setFacebookPost] = useState("");

  const [location, setLocation] = useState("Winterthur");
  const [propertyType, setPropertyType] = useState("Wohnung");
  const [rooms, setRooms] = useState("4.5");
  const [livingArea, setLivingArea] = useState("110");
  const [price, setPrice] = useState("1090000");
  const [styleText, setStyleText] = useState("Luxus / Premium");
  const [highlights, setHighlights] = useState(
    "Balkon, Lift, Garage, ruhige Lage"
  );

  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const current = variants[activeIndex];

  async function generateText() {
    try {
      setLoading(true);

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

      const newVariants = Array.isArray(data?.variants) ? data.variants : [];

      if (!newVariants.length) {
        throw new Error("Keine Varianten erhalten");
      }

      setVariants(newVariants);
      setActiveIndex(0);
     setInstagramPost(data?.social?.instagram || "");
setLinkedinPost(data?.social?.linkedin || "");
setFacebookPost(data?.social?.facebook || "");
    } catch (error) {
      console.error("FRONTEND GENERATE ERROR:", error);
      alert("Fehler beim Generieren.");
    } finally {
      setLoading(false);
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
        

        <div className="hero">
          <h1>Inserat Generator für Immobilienmakler</h1>
          <p>
          <p>
  Erstelle in Sekunden hochwertige Immobilieninserate für Homegate, ImmoScout24,
  Exposés und Social Media. Professionell formuliert, strukturiert aufgebaut und
  auf maximale Wirkung bei Käufern ausgelegt.
</p>
          </p>
        </div>

        <div className="grid">
          <section className="leftCard">
            <h2>Eingabe</h2>
            <p className="sectionText">
              Erfasse die wichtigsten Eckdaten der Immobilie. Die KI erstellt
              daraus mehrere professionelle Textvarianten.
            </p>

            <div className="formGrid">
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

              <div className="full">
                <Field label="Highlights (mit Komma trennen)">
                  <input
                    value={highlights}
                    placeholder="Balkon, Lift, Garage, ruhige Lage"
                    onChange={(e) => setHighlights(e.target.value)}
                    className="input"
                  />
                </Field>
              </div>
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

            <div className="miniStats">
              <MiniStat title="Markt" value="Schweiz" />
              <MiniStat title="Output" value="3 Varianten" />
              <MiniStat title="Stil" value="Premium" />
            </div>
          </section>

   <section className="rightCard">
  <div className="topStats">
    <div className="topStat">
      <div className="topStatValue">{variants.length > 0 ? 1 : 0}</div>
      <div className="topStatLabel">Inserate erstellt</div>
    </div>

    <div className="topStat">
      <div className="topStatValue">0</div>
      <div className="topStatLabel">Stunden Arbeit gespart</div>
    </div>

    <div className="topStat">
      <div className="topStatValue">50</div>
      <div className="topStatLabel">Kostenlose Inserate übrig</div>
    </div>
  </div>

  <div className="outputShell">
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
          <h2 className="outputTitle">{variants[activeIndex]?.title}</h2>
          <p className="outputText">{variants[activeIndex]?.text}</p>
        </>
      )}
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
      .topStats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  flex-shrink: 0;
}

.topStat {
  background: #fffdf7;
  border: 1px solid #eedfb9;
  border-radius: 14px;
  padding: 12px;
}

.topStatValue {
  font-size: 22px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 6px;
}

.topStatLabel {
  font-size: 12px;
  color: #7b6a46;
  line-height: 1.4;
}

.outputShell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
        .page {
          min-height: 100vh;
          background: linear-gradient(
            180deg,
            #07111e 0%,
            #0a1627 45%,
            #0d1b2e 100%
          );
          color: #ffffff;
          padding: 28px 16px 40px;
        }

        .shell {
          max-width: 1280px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .logo {
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 0.08em;
        }

        .topbarRight {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .topLink {
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          opacity: 0.9;
        }

        .topCta {
          background: #c8a24d;
          color: #111827;
          text-decoration: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 700;
          font-size: 14px;
        }
.hero {
  margin-bottom: 28px;
  text-align: center;
}

.hero h1 {
  margin: 0 0 10px 0;
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 800;
  line-height: 1.08;
}

.hero p {
  margin: 0 auto;
  max-width: 980px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.7;
  font-size: 16px;
}

        .grid {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 22px;
          align-items: stretch;
        }

        .leftCard {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 24px;

          display: flex;
          flex-direction: column;
        }

        .leftCard h2 {
          font-size: 26px;
          font-weight: 800;
          margin: 0 0 10px 0;
        }

        .sectionText {
          color: rgba(255, 255, 255, 0.72);
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
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 14px 15px;
          color: #ffffff;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }

        .input::placeholder {
          color: rgba(255, 255, 255, 0.28);
        }

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
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(28, 184, 246, 0.25);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .miniStats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 14px;
        }
.rightCard {
  background: #fff9ec;
  border: 1px solid #e9d7a8;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  
  height: 750px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.outputTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.outputCard {
  background: #ffffff;
  border: 1px solid #f0e3c1;
  border-radius: 18px;
  padding: 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

        .outputState {
          font-size: 22px;
          font-weight: 800;
          margin-top: 8px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #e8d9b5;
          background: #fffdf7;
          cursor: pointer;
          font-weight: 700;
          color: #6b5530;
        }

        .tab.active {
          background: #f7e4b5;
          border: 1px solid #c59a2d;
          color: #4f3d1d;
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
          font-size: 30px;
          font-weight: 800;
          margin: 0 0 14px 0;
          line-height: 1.15;
        }

        .outputText {
          font-size: 17px;
          line-height: 1.7;
          color: #4b5563;
          margin: 0;
          white-space: pre-line;
        }

        .bonusBlock {
          border: 1px solid #f0e3c1;
          background: #fffaf0;
          border-radius: 14px;
          padding: 14px;
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
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 700;
          color: #7a6021;
        }

        .socialWrap {
          margin-top: 24px;
          display: grid;
          gap: 16px;
        }

        .socialCard {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #f0e3c1;
          padding: 18px;
        }

        .socialTitle {
          font-weight: 800;
          font-size: 16px;
          margin-bottom: 10px;
          color: #1f2937;
        }

        .socialText {
          margin: 0;
          white-space: pre-line;
          color: #445066;
          line-height: 1.8;
          font-size: 15px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .miniStats {
            grid-template-columns: 1fr;
          }

          .rightCard {
            height: auto;
          }

          .topbar {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
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
  children: ReactNode;
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