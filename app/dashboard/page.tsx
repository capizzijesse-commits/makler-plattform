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
  facebookPost?: string;
  cta?: string;
  instagramHashtags?: string;
linkedinHashtags?: string;
facebookHashtags?: string;
};

export default function DashboardPage() {
  function copyText() {
  const text = document.querySelector(".outputText")?.textContent || "";
  if (!text) return;
  navigator.clipboard.writeText(text);
}

function downloadPdf() {
  const text = document.querySelector(".outputText")?.textContent || "";
  if (!text) return;

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "inserat.txt";
  a.click();

  URL.revokeObjectURL(url);
}

  const [instagramPost, setInstagramPost] = useState("");
const [linkedinPost, setLinkedinPost] = useState("");
 const [location, setLocation] = useState("")
const [rooms, setRooms] = useState("")
const [livingArea, setLivingArea] = useState("")
const [price, setPrice] = useState("")
const [propertyType, setPropertyType] = useState("")
const [styleText, setStyleText] = useState("")
const [highlights, setHighlights] = useState("")
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState("");
const [imageAnalysis, setImageAnalysis] = useState("");
const [analyzingImage, setAnalyzingImage] = useState(false);
    
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
        imageAnalysis,
      }),
    });

    const data = await response.json();

    let text = data.text;

text = text.replace(/ß/g, "ss");

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
        facebookPost: data.variants[0].facebookPost || "",
        instagramHashtags: data.variants[0].instagramHashtags || "",
linkedinHashtags: data.variants[0].linkedinHashtags || "",
facebookHashtags: data.variants[0].facebookHashtags || "",
      },
      {
        title: data.variants[1].title,
        objectType: data.variants[1].objectType || propertyType,
        price: data.variants[1].price || price,
        text: data.variants[1].text,
        highlights: data.variants[1].highlights || [],
        instagramPost: data.variants[1].instagramPost || "",
        linkedinPost: data.variants[1].linkedinPost || "",
        facebookPost: data.variants[1].facebookPost || "",
        instagramHashtags: data.variants[1].instagramHashtags || "",
linkedinHashtags: data.variants[1].linkedinHashtags || "",
facebookHashtags: data.variants[1].facebookHashtags || "",
      },
      {
        title: data.variants[2].title,
        objectType: data.variants[2].objectType || propertyType,
        price: data.variants[2].price || price,
        text: data.variants[2].text,
        highlights: data.variants[2].highlights || [],
        instagramPost: data.variants[2].instagramPost || "",
        linkedinPost: data.variants[2].linkedinPost || "",
        facebookPost: data.variants[2].facebookPost || "",
        instagramHashtags: data.variants[2].instagramHashtags || "",
linkedinHashtags: data.variants[2].linkedinHashtags || "",
facebookHashtags: data.variants[2].facebookHashtags || "",
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
async function analyzeImage() {
  if (!selectedImage) {
    alert("Bitte zuerst ein Bild auswählen.");
    return;
  }

  setAnalyzingImage(true);

  try {
    const formData = new FormData();
    formData.append("image", selectedImage);

    const response = await fetch("/api/analyze-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    setImageAnalysis(data.analysis || "");

  } catch (error) {
    alert("Fehler bei der Bildanalyse.");
  } finally {
    setAnalyzingImage(false);
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


 
  const FREE_LIMIT = 50;
const MINUTES_PER_INSERT = 20;

const remaining = FREE_LIMIT - freeGenerationsUsed;
const minutesSaved = freeGenerationsUsed * MINUTES_PER_INSERT;
const hoursSaved = Math.floor(minutesSaved / 60);
  const cleanedBody = (current?.text || "")
  .split(/Instagram|LinkedIn|Facebook|Highlights/i)[0]
  .trim();

const cleanedHighlights = current?.highlights || [];
const cleanedCta = current?.cta || "";

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
    facebookPost: data.variants[0].facebookPost || "",
    cta: data.variants[0].cta || "",
  },
  {
    title: data.variants[1].title,
    objectType: data.variants[1].objectType || propertyType,
    price: data.variants[1].price || price,
    text: data.variants[1].text,
    highlights: data.variants[1].highlights || [],
    instagramPost: data.variants[1].instagramPost || "",
    linkedinPost: data.variants[1].linkedinPost || "",
    facebookPost: data.variants[1].facebookPost || "",
    cta: data.variants[1].cta || "",
  },
  {
    title: data.variants[2].title,
    objectType: data.variants[2].objectType || propertyType,
    price: data.variants[2].price || price,
    text: data.variants[2].text,
    highlights: data.variants[2].highlights || [],
    instagramPost: data.variants[2].instagramPost || "",
    linkedinPost: data.variants[2].linkedinPost || "",
    facebookPost: data.variants[2].facebookPost || "",
    cta: data.variants[2].cta || "",
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
            <h1>Inserat Generator für Immobilienmakler</h1>
            <p>
              Hochwertige Immobilientexte für Homegate, ImmoScout24, Exposé und
              Social Media – strukturiert, verkaufsstark und professionell.
            </p>
          </div>

        </div>

        <div className="grid">
          <section className="leftCard">
            <div className="badge">Objektdaten</div>
            <h2>Eingabe</h2>
            <p className="sectionText">
              Erfasse die wichtigsten Eckdaten der Immobilie. Daraus entstehen automatisch mehrere
              professionelle Textvarianten.
            </p>

        <div className="formGrid">
  <Field label="Ort / Lage">
   <input
   className="input"
autoComplete="off"
  value={location}
  onChange={(e) => setLocation(e.target.value)}
  placeholder="Zürich Seefeld"
/>
  </Field>

  <Field label="Zimmer">
   <input
   className="input"
autoComplete="off"
  value={rooms}
  onChange={(e) => setRooms(e.target.value)}
  placeholder="4.5"
/>
  </Field>

  <Field label="Wohnfläche (m²)">
   <input
   className="input"
autoComplete="off"
  value={livingArea}
  onChange={(e) => setLivingArea(e.target.value)}
  placeholder="120"
/>
  </Field>

  <Field label="Preis (CHF)">
    <input
    className="input"
autoComplete="off"
  value={price}
  onChange={(e) => setPrice(e.target.value)}
  placeholder="1'095'000"
/>
  </Field>

  <Field label="Objektart">
    <input
    className="input"
autoComplete="off"
  value={propertyType}
  onChange={(e) => setPropertyType(e.target.value)}
  placeholder="Wohnung"
/>
  </Field>

  <Field label="Stil">
  <input
  className="input"
autoComplete="off"
  value={styleText}
  onChange={(e) => setStyleText(e.target.value)}
  placeholder="Modern / Premium"
/>
  </Field>

  <Field label="Highlights (mit Komma trennen)">
  <input
  className="input"
autoComplete="off"
  value={highlights}
  onChange={(e) => setHighlights(e.target.value)}
  placeholder="Balkon, Tiefgarage, Lift, ruhige Lage"
/><Field label="Immobilienfoto">
  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
    <label className="btn btn-secondary" style={{ display: "inline-block" }}>
      Datei auswählen
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setSelectedImage(file);

          if (file) {
            setImagePreview(URL.createObjectURL(file));
          } else {
            setImagePreview("");
          }
        }}
      />
    </label>

    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
      {selectedImage ? selectedImage.name : "Keine Datei ausgewählt"}
    </span>
  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}></div>

   <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center", flexWrap: "nowrap" }}>
  <button
    onClick={generateText}
    style={{
      padding: "12px 16px",
      borderRadius: "12px",
      border: "none",
      background: "#1cc8ff",
      color: "#fff",
      fontWeight: 700,
      fontSize: "15px",
      cursor: "pointer",
      whiteSpace: "nowrap"
    }}
  >
    Inserat generieren (3 Varianten)
  </button>

  <button
  onClick={copyText}
  style={{
    padding: "12px 14px",
    borderRadius: "12px",
    border: "none",
    background: "#2d3748",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap"
  }}
>
  Copy
</button>

  <button
    onClick={downloadPdf}
    style={{
      padding: "12px 14px",
      borderRadius: "12px",
      border: "none",
      background: "#2d3748",
      color: "#fff",
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap"
    }}
  >
    PDF
  </button>
</div>

  <div
    style={{
      textAlign: "center",
      fontSize: "13px",
      marginTop: "6px",
      opacity: 0.7,
    }}
  >
    Erstellt 3 professionelle Varianten in wenigen Sekunden
  </div>
</div>
</Field>
  </Field>
 
{imagePreview && (
  <div style={{ marginTop: "12px" }}>
    <img
      src={imagePreview}
      alt="Vorschau"
      style={{
        width: "100%",
        maxWidth: "320px",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    />
  </div>
)}

<div style={{ marginTop: "12px" }}>
  <button
  type="button"
  className="btn btn-secondary"
  onClick={analyzeImage}
  disabled={analyzingImage || !selectedImage}
>
  {analyzingImage ? "Bild wird analysiert..." : "Foto analysieren"}
</button>
</div>
{imageAnalysis && (
  <div
    style={{
      marginTop: "16px",
      padding: "14px",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.85)",
      lineHeight: 1.7,
      whiteSpace: "pre-line",
    }}
  >
    <strong>Bildanalyse:</strong>
    <div style={{ marginTop: "8px" }}>{imageAnalysis}</div>
  </div>
)}
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
           <p style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
  {current.text
    ?.replace(/Highlights:[\s\S]*/i, "")
    ?.trim()}
</p>
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

  <div
    style={{
      marginTop: "24px",
      display: "grid",
      gap: "16px",
    }}
  >
    <div
  style={{
    marginTop: "24px",
    display: "grid",
    gap: "16px",
  }}
>

{/* Instagram */}
{current?.instagramPost && (
  <div
    style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "20px",
      border: "1px solid rgba(15,23,42,0.08)",
    }}
  >
    <h3 style={{ marginBottom: "10px", fontSize: "18px", fontWeight: 800 }}>
      Instagram Post
    </h3>

    <p style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
      {current.instagramPost}
    </p>

    {current.instagramHashtags && (
      <p
        style={{
          whiteSpace: "pre-line",
          lineHeight: 1.7,
          marginTop: "12px",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        {current.instagramHashtags}
      </p>
    )}
  </div>
)}

{/* LinkedIn */}
{current?.linkedinPost && (
  <div
    style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "20px",
      border: "1px solid rgba(15,23,42,0.08)",
    }}
  >
    <h3 style={{ marginBottom: "10px", fontSize: "18px", fontWeight: 800 }}>
      LinkedIn Post
    </h3>

    <p style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
      {current.linkedinPost}
    </p>

    {current.linkedinHashtags && (
      <p
        style={{
          whiteSpace: "pre-line",
          lineHeight: 1.7,
          marginTop: "12px",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        {current.linkedinHashtags}
      </p>
    )}
  </div>
)}

{/* Facebook */}
{current?.facebookPost && (
  <div
    style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "20px",
      border: "1px solid rgba(15,23,42,0.08)",
    }}
  >
    <h3 style={{ marginBottom: "10px", fontSize: "18px", fontWeight: 800 }}>
      Facebook Post
    </h3>

    <p style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
      {current.facebookPost}
    </p>

    {current.facebookHashtags && (
      <p
        style={{
          whiteSpace: "pre-line",
          lineHeight: 1.7,
          marginTop: "12px",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        {current.facebookHashtags}
      </p>
    )}
  </div>
)}

</div>
    
  </div>
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
            <div
  style={{
    marginTop: "20px",
    padding: "16px",
    background: "#f8f5ee",
    borderRadius: "12px",
    color: "#1f2937",
  }}
>
  <div style={{ fontWeight: 700 }}>
    Du hast {freeGenerationsUsed} Inserate erstellt
  </div>

  <div style={{ marginTop: "6px" }}>
    ≈ {hoursSaved} Stunden Arbeit gespart
  </div>

  <div style={{ marginTop: "6px" }}>
    Noch {remaining} kostenlose Inserate übrig
  </div>
</div>

<div
  style={{
    marginTop: "20px",
    padding: "16px",
    border: "1px dashed #d6caa8",
    borderRadius: "12px",
    color: "#1f2937",
  }}
>
  <div style={{ fontWeight: 700 }}>
    🎁 Bonus
  </div>

  <div style={{ marginTop: "6px" }}>
    Empfehle InseratAI einem Maklerkollegen und erhalte 5 zusätzliche Inserate kostenlos.
  </div>

  <button
    style={{
      marginTop: "10px",
      padding: "8px 14px",
      borderRadius: "8px",
      background: "#e8d9b5",
      border: "none",
      cursor: "pointer",
    }}
    onClick={() => {
      navigator.clipboard.writeText(window.location.href);
      alert("Empfehlungslink kopiert");
    }}
  >
    Empfehlungslink kopieren
  </button>
</div>
           
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
  border-radius: 14px;
  padding: 14px 15px;
  outline: none;
  box-sizing: border-box;
  font-size: 15px;
  color: #ffffff;
}
  .input::placeholder {
  color: rgba(255, 255, 255, 0.38);
}
  .input:-webkit-autofill,
.input:-webkit-autofill:hover,
.input:-webkit-autofill:focus,
.input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.05) inset !important;
  -webkit-text-fill-color: #ffffff !important;
  caret-color: #ffffff !important;
  transition: background-color 9999s ease-in-out 0s;
}
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
            .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
    text-align: center;
  }

  .outputTop {
    flex-direction: column;
    align-items: stretch;
  }

  .tabs {
    width: 100%;
  }

  .tab {
    flex: 1;
    text-align: center;
  }

  .hero p {
    font-size: 15px;
    line-height: 1.6;
  }

  .outputBox {
    min-height: auto;
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
      <a
href="mailto:support@inserat-ai.ch?subject=Inserat AI Support"
style={{
position: "fixed",
bottom: "16px",
right: "16px",
background: "#0ea5e9",
color: "white",
padding: "10px 14px",
borderRadius: "12px",
textDecoration: "none",
fontSize: "13px",
fontWeight: "600",
boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
}}
>
💬 Feedback / Support
</a>
    </div>
  );
}