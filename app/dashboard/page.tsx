"use client";

import { useMemo, useState } from "react";

type Variant = {
  title: string;
  text: string;
  highlights?: string[];
  cta?: string;
};

export default function Page() {
  const [location, setLocation] = useState("Winterthur");
  const [propertyType, setPropertyType] = useState("Wohnung");
  const [rooms, setRooms] = useState("4.5");
  const [livingArea, setLivingArea] = useState("110");
  const [price, setPrice] = useState("1'090'000");
  const [style, setStyle] = useState("Luxus / Premium");
  const [tone, setTone] = useState("Professionell, modern, vertrauenswürdig");
  const [extras, setExtras] = useState("Balkon | Lift | Garage | Ruhige Lage");

  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [active, setActive] = useState(0);
  const [freeCredits, setFreeCredit] = useState(5)

  const isUnlocked = useMemo(() => true, []);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setImages(files);
  }

  async function generate() {
    if (freeCredits <= 0) {
      alert("Gratislimit erreich. Bitte Upgrate anfordern.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      const text = await res.text();

      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        alert(text || "Fehler beim Generieren.");
        return;
      }

      if (!res.ok) {
        alert(json?.error || "Fehler beim Generieren.");
        return;
      }

      setVariants(json?.variants ?? []);
      setActive(0);
      setFreeCredit((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error(error);
      alert("Verbindungsfehler beim Generieren.");
    } finally {
      setLoading(false);
    }
  }

  async function copyActive() {
    if (!current) return;

    const fullText = [
      current.title || "",
      "",
      current.text || "",
      "",
      ...(current.highlights || []),
      "",
      current.cta ? `CTA: ${current.cta}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(fullText);
    alert("Kopiert!");
  }

  function copyPortal(portal: string) {
    if (!current) return;

    const highlightsText =
      current.highlights && current.highlights.length > 0
        ? `\n\nHighlights:\n- ${current.highlights.join("\n- ")}`
        : "";

    const ctaText = current.cta ? `\n\n${current.cta}` : "";

    let text = `${current.title}\n\n${current.text}${highlightsText}${ctaText}`;

    if (portal === "homegate") {
      text = `🏡 Immobilienangebot\n\n${text}\n\nJetzt Besichtigung vereinbaren.`;
    }

    if (portal === "immoscout") {
      text = `Immobilieninserat\n\n${text}\n\nKontaktieren Sie uns für weitere Informationen.`;
    }

    if (portal === "social") {
      text = `✨ Neue Immobilie im Angebot!\n\n${text}\n\n#immobilien #wohnung #haus`;
    }

    navigator.clipboard.writeText(text);
    alert(`${portal} kopiert!`);
  }

  function downloadPdfPlaceholder() {
    if (!current) return;

    const fullText = [
      current.title || "",
      "",
      current.text || "",
      "",
      "Highlights:",
      ...(current.highlights || []),
      "",
      current.cta ? `CTA: ${current.cta}` : "",
    ].join("\n");

    const blob = new Blob([fullText], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "immobilien-inserat.pdf";
    a.click();

    URL.revokeObjectURL(url);
  }

  const current = variants?.[active];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "#F9FAFB",
        padding: "28px",
      }}
    >
      <div
        style={{
          maxWidth: "1600px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: "24px",
        }}
      >
        <section
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "7px 12px",
              borderRadius: "999px",
              background: "rgba(200,162,77,0.14)",
              border: "1px solid rgba(200,162,77,0.35)",
              color: "#E7C97F",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            Premium Inserat Generator
          </div>

          <h1
            style={{
              fontSize: "28px",
              lineHeight: 1.15,
              fontWeight: 800,
              margin: 0,
            }}
          >
            Inserate in Sekunden – hochwertig & verkaufsstark
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#9CA3AF",
              lineHeight: 1.7,
              maxWidth: "760px",
            }}
          >
            Fokus: Schweizer Markt, klare Struktur, luxuriöses Wording ohne unseriöse Übertreibungen.
          </p>

          <div style={{ marginTop: "20px" }}>
            <button
  onClick={generate}
  disabled={loading || freeCredits <= 0}
              style={{
                background: "#0EA5E9",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
             {loading
  ? "Generiere..."
  : freeCredits <= 0
    ? "Gratislimit erreicht"
    : "Generieren (3 Varianten)"}
            </button>
          </div>
         <div
  style={{
    marginTop: "12px",
    fontSize: "14px",
    color: freeCredits > 0 ? "#E7C97F" : "#FCA5A5",
    fontWeight: 700,
  }}
>
  Verbleibend: {freeCredits} / 5 Gratis-Inserate
</div> 
{freeCredits <= 0 && (
  <div
    style={{
      marginTop: "14px",
      padding: "14px",
      borderRadius: "12px",
      background: "rgba(248,113,113,0.10)",
      border: "1px solid rgba(248,113,113,0.25)",
    }}
  >
    <div
      style={{
        color: "#FCA5A5",
        fontWeight: 800,
        fontSize: "14px",
      }}
    >
      Gratislimit erreicht
    </div>

    <div
      style={{
        marginTop: "6px",
        color: "#D1D5DB",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
    >
      Upgrade ab 29 CHF / Monat oder Testmonat anfragen.
    </div>

    <a
      href="/kontakt"
      style={{
        display: "inline-block",
        marginTop: "12px",
        background: "#C8A24D",
        color: "#FFFFFF",
        padding: "10px 16px",
        borderRadius: "10px",
        textDecoration: "none",
        fontWeight: 700,
      }}
    >
      Upgrade anfragen
    </a>
  </div>
)}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            <div>
              <div style={labelStyle}>Ort / Lage</div>
              <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>Objektart</div>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} style={inputStyle}>
                <option>Wohnung</option>
                <option>Haus</option>
                <option>Villa</option>
                <option>Attika</option>
                <option>Gewerbe</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={labelStyle}>Bilder hochladen</div>
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ color: "#E5E7EB" }} />
            </div>

            <div>
              <div style={labelStyle}>Zimmer</div>
              <input value={rooms} onChange={(e) => setRooms(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>Wohnfläche (m²)</div>
              <input value={livingArea} onChange={(e) => setLivingArea(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>Preis (CHF)</div>
              <input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>Stil</div>
              <select value={style} onChange={(e) => setStyle(e.target.value)} style={inputStyle}>
                <option>Luxus / Premium</option>
                <option>Modern</option>
                <option>Minimalistisch</option>
                <option>Klassisch</option>
              </select>
            </div>

            <div>
              <div style={labelStyle}>Ton / Sprache</div>
              <input value={tone} onChange={(e) => setTone(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <div style={labelStyle}>Highlights (mit | trennen)</div>
              <input value={extras} onChange={(e) => setExtras(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </section>

        <aside
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "7px 12px",
                  borderRadius: "999px",
                  background: "rgba(200,162,77,0.14)",
                  border: "1px solid rgba(200,162,77,0.35)",
                  color: "#E7C97F",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                Output
              </div>

              <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: 800 }}>
                Variante {active + 1} aktiv
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={downloadPdfPlaceholder} disabled={!current} style={smallBtnStyle}>
                PDF
              </button>

              <button
                onClick={copyActive}
                disabled={!current || !isUnlocked}
                style={{
                  ...smallBtnStyle,
                  background: "#0EA5E9",
                  color: "#FFFFFF",
                  border: "none",
                }}
              >
                Copy
              </button>

              <button onClick={() => copyPortal("homegate")} disabled={!current} style={smallBtnStyle}>
                Homegate
              </button>

              <button onClick={() => copyPortal("immoscout")} disabled={!current} style={smallBtnStyle}>
                ImmoScout
              </button>

              <button onClick={() => copyPortal("social")} disabled={!current} style={smallBtnStyle}>
                Social
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "20px",
              marginBottom: "18px",
            }}
          >
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  border: i === active ? "1px solid #C8A24D" : "1px solid rgba(255,255,255,0.1)",
                  background: i === active ? "rgba(200,162,77,0.18)" : "transparent",
                  color: "#F9FAFB",
                  fontWeight: i === active ? 800 : 500,
                }}
              >
                Variante {i + 1}
              </button>
            ))}
          </div>

          {!current ? (
            <div
              style={{
                minHeight: "360px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                border: "1px dashed rgba(255,255,255,0.12)",
                borderRadius: "18px",
              }}
            >
              Noch nichts generiert.
            </div>
          ) : (
            <div
              style={{
                background: "#FFFDF8",
                border: "1px solid #EADDB8",
                borderRadius: "22px",
                padding: "18px",
                color: "#1F2937",
                boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                maxHeight: "620px",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "7px 12px",
                  borderRadius: "999px",
                  background: "#F7F1E3",
                  color: "#8A6A1F",
                  fontWeight: 700,
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                Premium Inserat
              </div>

              <h2
                style={{
                  fontSize: "20px",
                  lineHeight: 1.2,
                  fontWeight: 800,
                  margin: 0,
                  color: "#1F2937",
                }}
              >
                {current.title}
              </h2>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "16px",
                  marginBottom: "18px",
                }}
              >
                {[`${rooms} Zimmer`, `${livingArea} m²`, propertyType, "Premium Stil"].map((item) => (
                  <span
                    key={item}
                    style={{
                      background: "#F6F6F6",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>

              {images.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "20px",
                  }}
                >
                  {images.slice(0, 3).map((img, i) => (
                    <img
                      key={i}
                      src={URL.createObjectURL(img)}
                      alt={`Preview ${i + 1}`}
                      style={{
                        width: "110px",
                        height: "72px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        border: "1px solid #E5E7EB",
                      }}
                    />
                  ))}
                </div>
              )}

              <div
                style={{
                  color: "#4B5563",
                  lineHeight: 1.9,
                  whiteSpace: "pre-wrap",
                  fontSize: "13px",
                }}
              >
                {current.text}
              </div>

              {current.highlights && current.highlights.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#1F2937",
                      marginBottom: "10px",
                    }}
                  >
                    Highlights
                  </div>

                  <ul
                    style={{
                      paddingLeft: "20px",
                      lineHeight: 1.9,
                      color: "#374151",
                      margin: 0,
                    }}
                  >
                    {current.highlights.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {current.cta && (
                <div
                  style={{
                    marginTop: "22px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: "#F8FAFC",
                    border: "1px solid #E5E7EB",
                    color: "#374151",
                  }}
                >
                  <strong>CTA:</strong> {current.cta}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: "14px",
              fontSize: "12px",
              color: "#9CA3AF",
            }}
          >
            Vorschau kann geblurrt werden, Copy läuft später über Abo/Login.
          </div>
        </aside>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#D1D5DB",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1F2937",
  color: "#F9FAFB",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "12px 14px",
  outline: "none",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  background: "transparent",
  color: "#F9FAFB",
  border: "1px solid rgba(255,255,255,0.1)",
};