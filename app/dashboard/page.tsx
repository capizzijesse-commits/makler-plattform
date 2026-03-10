"use client";

import { useState } from "react";

type Variant = {
  title: string;
  objectType?: string;
  price?: string;
  text: string;
  highlights?: string[];
  instagramPost?: string;
  linkedinPost?: string;
  cta?: string;
};

export default function DashboardPage() {
  const [instagramPost, setInstagramPost] = useState("");
const [linkedinPost, setLinkedinPost] = useState("");
 const [location, setLocation] = useState("")
const [propertyType, setPropertyType] = useState("")
const [rooms, setRooms] = useState("")
const [livingArea, setLivingArea] = useState("")
const [price, setPrice] = useState("1'095'000")
const [styleText, setStyleText] = useState("")
const [highlights, setHighlights] = useState("")
    
    "Balkon, Lift, Garage, ruhige Lage"
  ;

  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [plan, setPlan] = useState("free");
const [freeGenerationsUsed, setFreeGenerationsUsed] = useState(0);
const [showUpgrade, setShowUpgrade] = useState(false);
async function generateText() {
  if (plan === "free" && freeGenerationsUsed >= 5) {
    setShowUpgrade(true);
    return;
  }

  setLoading(true);

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
        styleText,
        highlights,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Fehler beim Generieren.");
      return;
    }

    setVariants([
      {
        title: data.variants[0].title,
        objectType: data.variants[0].objectType || propertyType,
        price: data.variants[0].price || price,
        text: data.variants[0].text,
        highlights: data.variants[0].highlights || [],
        instagramPost: data.variants[0].instagramPost || "",
        linkedinPost: data.variants[0].linkedinPost || "",
      },
      {
        title: data.variants[1].title,
        objectType: data.variants[1].objectType || propertyType,
        price: data.variants[1].price || price,
        text: data.variants[1].text,
        highlights: data.variants[1].highlights || [],
        instagramPost: data.variants[1].instagramPost || "",
        linkedinPost: data.variants[1].linkedinPost || "",
      },
      {
        title: data.variants[2].title,
        objectType: data.variants[2].objectType || propertyType,
        price: data.variants[2].price || price,
        text: data.variants[2].text,
        highlights: data.variants[2].highlights || [],
        instagramPost: data.variants[2].instagramPost || "",
        linkedinPost: data.variants[2].linkedinPost || "",
      },
    ]);

    if (plan === "free") {
      setFreeGenerationsUsed((prev) => prev + 1);
    }
  } catch (error) {
    alert("Fehler beim Generieren.");
  } finally {
    setLoading(false);
  }
}
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

  

  async function copyActive() {
    if (!current) {
      alert("Bitte zuerst eine Variante generieren.");
      return;
    }
async function generateText() {
  if (plan === "free" && freeGenerationsUsed >= 5) {
    setShowUpgrade(true);
    return;
  }

  setLoading(true);

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
        styleText,
        highlights,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Fehler beim Generieren.");
      return;
    }

    setVariants([
      {
        title: data.variants[0].title,
        objectType: data.variants[0].objectType || propertyType,
        price: data.variants[0].price || price,
        text: data.variants[0].text,
        highlights: data.variants[0].highlights || [],
        instagramPost: data.variants[0].instagramPost || "",
        linkedinPost: data.variants[0].linkedinPost || "",
      },
      {
        title: data.variants[1].title,
        objectType: data.variants[1].objectType || propertyType,
        price: data.variants[1].price || price,
        text: data.variants[1].text,
        highlights: data.variants[1].highlights || [],
        instagramPost: data.variants[1].instagramPost || "",
        linkedinPost: data.variants[1].linkedinPost || "",
      },
      {
        title: data.variants[2].title,
        objectType: data.variants[2].objectType || propertyType,
        price: data.variants[2].price || price,
        text: data.variants[2].text,
        highlights: data.variants[2].highlights || [],
        instagramPost: data.variants[2].instagramPost || "",
        linkedinPost: data.variants[2].linkedinPost || "",
      },
    ]);

    if (plan === "free") {
      setFreeGenerationsUsed((prev) => prev + 1);
    }
  } catch (error) {
    alert("Fehler beim Generieren.");
  } finally {
    setLoading(false);
  }
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
className="btn btn-secondary"
onClick={() => {
  if (current?.text) {
    navigator.clipboard.writeText(current.text);
  }
}}
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

        <div className="formGrid">
  <Field label="Ort / Lage">
    <input
      value={location}
      placeholder="Winterthur"
      onChange={(e) => setLocation(e.target.value)}
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
      placeholder="1'095'000"
      onChange={(e) => setPrice(e.target.value)}
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
                  {current
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

            {current ? (
              <div
  className="outputBox"
  style={{
    maxHeight: "500px",
    overflowY: "auto",
    paddingRight: "10px"
  }}
>
   
                <h3>{current.title}</h3>
                <p>{current.text}</p>
             

                {current.highlights && current.highlights.length > 0 && (
                  <div style={{ marginTop: "24px" }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "16px",
                        marginBottom: "10px",
                        color: "#1f2937",
                      }}
                    >
                      Highlights
                    </div>

                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "20px",
                        color: "#445066",
                        lineHeight: 1.8,
                        fontSize: "16px",
                      }}
                    >
                      {current.highlights.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(instagramPost || linkedinPost) && (
  <div style={{ marginTop: "30px" }}>

    {instagramPost && (
      <div style={{ marginBottom: "20px" }}>
        
      </div>
    )}


  </div>
)}
              </div>
            ) : (
              
              <div className="emptyBox">
                <div className="emptyTitle">Noch keine Variante vorhanden</div>
                <div className="emptyText">
                  Gib links die Objektdaten ein und klicke auf „Generieren (3
                  Varianten)“.
                </div>
              </div>
            )}
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
          </section>
        </div>
      </div>

      <style jsx>{`
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
          max-width: 1380px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 26px;
        }

        .hero {
          max-width: 760px;
        }

        .badge {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          color: #e7c97f;
          background: rgba(231, 201, 127, 0.14);
          border: 1px solid rgba(231, 201, 127, 0.18);
          padding: 6px 10px;
          border-radius: 999px;
          margin-bottom: 12px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .hero p {
          margin: 10px 0 0 0;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.65;
          font-size: 16px;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
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
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #1cb8f6 0%, #129ce0 100%);
          color: #ffffff;
          box-shadow: 0 10px 24px rgba(28, 184, 246, 0.25);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .grid {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 22px;
        }

        .leftCard {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
        }

        .rightCard {
          background: #fff9ec;
          border: 1px solid #e9d7a8;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
          color: #1f2937;
        }

        .leftCard h2 {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 10px 0;
        }

        .sectionText {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.65;
          margin-bottom: 22px;
          font-size: 15px;
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
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border-radius: 14px;
          padding: 14px 15px;
          outline: none;
          box-sizing: border-box;
          font-size: 15px;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 22px 0;
        }

        .miniStats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
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
          background: #ffffff;
          color: #3b2f17;
          font-weight: 700;
          cursor: pointer;
        }

        .tab.active {
          border: 2px solid #c79a36;
          background: #fff5dd;
        }

        .outputBox {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid #f0e3c1;
          padding: 22px;
          min-height: 420px;
        }

        .outputBox h3 {
          margin: 0 0 18px 0;
          font-size: clamp(34px, 4vw, 52px);
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: #1f2937;
        }

        .outputBox p {
          margin: 0;
          white-space: pre-line;
          color: #445066;
          line-height: 2;
          font-size: 17px;
        }

        .emptyBox {
          border-radius: 18px;
          border: 1px dashed #d8c392;
          background: rgba(255, 255, 255, 0.65);
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          color: #374151;
          flex-direction: column;
        }

        .emptyTitle {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .emptyText {
          color: #6b7280;
          line-height: 1.7;
          max-width: 420px;
        }

        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .formGrid {
            grid-template-columns: 1fr;
          }

          .miniStats {
            grid-template-columns: 1fr;
          }

          .hero h1 {
            font-size: 34px;
          }

          .outputState {
            font-size: 22px;
          }

          .outputBox h3 {
            font-size: 34px;
          }

          .page {
            padding: 20px 12px 32px;
          }

          .leftCard,
          .rightCard {
            padding: 18px;
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