"use client"


const buttonStyle: React.CSSProperties = {
  marginTop: "18px",
  padding: "10px 20px",
  background: "#D4A017", // Das Gold von deinem Founder-Angebot
  color: "#FFFFFF",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "700",
  fontSize: "14px",
  textAlign: "center",
  width: "100%",
  display: "block",
  transition: "background 0.2s"
};


const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  padding: "24px",
  borderRadius: "16px",
  border: "1px solid #E5E7EB",
  display: "flex",
  flexDirection: "column", // TypeScript erkennt das jetzt korrekt
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
};

const priceStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: "800",
  margin: "10px 0",
  color: "#1F2937"
};

const iconCircleStyle: React.CSSProperties = {
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  border: "2px solid #E5E7EB",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "10px"
};


export default function Home() {
  return (
    <>

   <main 
  className="landingPage"
  style={{
    minHeight: "100vh",
    background: "#F8F6F1",
    color: "#1F2937",
    padding: "80px 24px",
  }}
>
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "8px 14px",
            border: "1px solid #E5D7B2",
            borderRadius: "999px",
            background: "#FFFDF8",
            color: "#8A6A1F",
            fontWeight: 600,
            fontSize: "14px",
            marginBottom: "24px",
          }}
        >
          Für Immobilienmakler entwickelt
        </div>

      <div style={{
  padding: "40px 16px 24px",
  textAlign: "center",
  maxWidth: "100%",
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
  overflow: "hidden"
}}>

<h1 style={{
  fontSize: "clamp(18px, 7.5vw, 48px)",
  lineHeight: 1.08,
  fontWeight: 800,
  margin: "0 auto 18px",
  color: "#1F2937",
  maxWidth: "100%",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  textAlign: "center"
}}>

Immobilieninserate in 20 Sekunden erstellen

</h1>

<p style={{
  fontSize: "20px",
  color: "#4B5563",
  marginBottom: "35px"
}}>
Erstellen Sie professionelle Immobilieninserate für Homegate, Immoscout und Social Media in wenigen Sekunden statt Stunden
</p>

<div style={{ marginTop: "24px", textAlign: "center" }}>
  <a
    href="https://buy.stripe.com/test_5kQ28sdozdIk3bsduy1wY00"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "block",
      padding: "14px 28px",
      background: "#D4A017",
      color: "#FFFFFF",
      borderRadius: "12px",
      border: "none",
      fontSize: "16px",
      fontWeight: 700,
      textDecoration: "none",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      textAlign: "center",
      lineHeight: "1.5",
    }}
  >
    Founder Zugang sichern – 19.90 CHF / Monat<br/>
    Nur für die ersten 30 verfügbar<br/>
    regulär 39.90 CHF / Monat
  </a>
</div>

</div>
      <div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    marginTop: "26px",
    textAlign: "center",
  }}
>
  <button
  onClick={() => window.location.href = "/dashboard"}
  style={{
    padding: "14px 28px",
    background: "#0A40FF",
    color: "#FFFFFF",
    borderRadius: "10px",
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    maxWidth: "520px",
    width: "100%",
    margin: "0 auto",
    display: "block",
  }}
>
  50 Inserate kostenlos testen
  <br />
  für die ersten 100 Makler
</button>


<section style={{ marginTop: "40px", textAlign: "center", width: "100%" }}>
  <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "30px" }}>Preise</h2>

  <div style={{
  display: "grid",
  // "auto-fit" sorgt dafür, dass die Boxen untereinander springen, wenn der Platz nicht reicht
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", 
  gap: "20px",
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 20px"
}}>

    
       {/* Box 1: Free - Der Türöffner */}
    <div style={{...cardStyle, border: "1px solid #0A40FF", background: "#F0F4FF"}}>
      <div style={{...iconCircleStyle, borderColor: "#0A40FF", color: "#0A40FF"}}>0</div>
      <p style={{fontSize: "14px", fontWeight: "700"}}>Testzugang</p>
      <p style={{fontSize: "11px", color: "#4B5563"}}>50 Inserate gratis<br/>(Einmalig)</p>
    </div>

    {/* Box 2: Founder - Das unwiderstehliche Angebot */}
    <div style={{...cardStyle, border: "2px solid #D4A017", background: "#FFFDF8", transform: "scale(1.05)"}}>
      <h3 style={{fontSize: "16px", margin: "0", fontWeight: 700}}>Founder Deal</h3>
      <p style={{...priceStyle, color: "#D4A017"}}>19.90</p>
      <p style={{fontSize: "11px", color: "#8A6A1F", fontWeight: "bold"}}>Unbegrenzt Inserate<br/>Preis dauerhaft gesichert</p>
      <p>Exklusiv für die ersten 30 Makler</p>
    </div>

    {/* Box 3: Standard - Der Ankerpreis */}
    <div style={cardStyle}>
      <h3 style={{fontSize: "16px", margin: "0"}}>Standard</h3>
      <p style={priceStyle}>39.90</p>
      <p style={{fontSize: "11px", color: "#6B7280"}}>Regulärer Preis<br/>nach der Founder-Phase</p>
    </div>


    {/* Box 4: Social Media */}
    <div style={cardStyle}>
      <h3 style={{fontSize: "16px", margin: "0"}}>Social Media</h3>
      <p style={priceStyle}>79.90</p>
      <p style={{fontSize: "11px", color: "#6B7280"}}>CHF / Monat</p>
    </div>

    {/* Box 5: Agency - JETZT KOMPAKTER */}
    <div style={{
      ...cardStyle,
      gridColumn: "1 / -1", 
      marginTop: "10px",
      padding: "30px 20px", // Weniger Padding = weniger wuchtig
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h3 style={{ margin: "0 0 5px 0", fontSize: "20px" }}>Agency</h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <p style={{ ...priceStyle, fontSize: "42px", margin: 0 }}>249.90</p>
        <span style={{ fontSize: "18px", fontWeight: 700 }}>CHF</span>
      </div>
      <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "5px" }}>Für Teams & mehrere Makler</p>
    </div>
  </div>



  {/* Zahlungsmittel Sektion */}
  <div style={{ marginTop: "40px", textAlign: "center" }}>
    <div style={{ fontSize: "14px", opacity: 0.6, marginBottom: "15px" }}>
      Sichere Zahlung mit
    </div>
    <div style={{ display: "flex", justifyContent: "center", gap: "25px", fontWeight: "700", color: "#4B5563" }}>
      <span>TWINT</span>
      <span>VISA</span>
      <span>MASTERCARD</span>
      <span>STRIPE</span>
    </div>
  </div>
</section>
{/* --- ENDE PREISE --- */}


  <div
    style={{
      marginTop: "6px",
      color: "#8A6A1F",
      fontWeight: 600,
      fontSize: "15px",
      lineHeight: 1.6,
    }}
  >
    Testen Sie die Plattform kostenlos und erstellen Sie
    Immobilieninserate in Sekunden.
  </div>

  <div
    style={{
      marginTop: "10px",
      color: "#8A6A1F",
      fontWeight: 600,
      fontSize: "15px",
      lineHeight: 1.6,
    }}
  >
    Funktioniert perfekt für:
    <br />
    Für Homegate, ImmoScout24, Exposé-PDF und Social Media
  </div>
</div>  
      </section>

      <section
       style={{
  maxWidth: "600px",
  margin: "40px auto 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  textAlign: "center"
}}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "18px",
            padding: "28px",
            textAlign: "center",
            boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
            border: "1px solid #F1F5F9",
          }}
        >
          <h3 style={{ fontSize: "20px", fontWeight: 700 }}>Zeit sparen</h3>
          <p style={{ marginTop: "10px", color: "#6B7280", lineHeight: 1.7 }}>
            Sparen Sie bis zu 30 Minuten pro Objekt bei Inserat, Exposé und
            Vermarktung.
          </p>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
            border: "1px solid #F1F5F9",
          }}
        >
          <h3 style={{ fontSize: "20px", fontWeight: 700 }}>
            Eine Eingabe, mehrere Outputs
          </h3>
          <p style={{ marginTop: "10px", color: "#6B7280", lineHeight: 1.7 }}>
            Aus einem Objekt entstehen direkt mehrere professionelle Textvarianten.
          </p>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
            border: "1px solid #F1F5F9",
          }}
        >
          <h3 style={{ fontSize: "20px", fontWeight: 700 }}>
            Für Makler entwickelt
          </h3>
          <p style={{ marginTop: "10px", color: "#6B7280", lineHeight: 1.7 }}>
            Optimiert für Immobilienvermarktung, Portale, Besichtigungen und
            Verkauf.
          </p>
        </div>
      </section>
<section
  style={{
    maxWidth: "1100px",
    margin: "72px auto 0",
    textAlign: "center",
  }}
>
  <h2
    style={{
      fontSize: "32px",
      fontWeight: 800,
      marginBottom: "20px",
    }}
  >
    Ein Objekt – alle Marketingkanäle
  </h2>

  <p
    style={{
      color: "#6B7280",
      maxWidth: "700px",
      margin: "0 auto 40px",
      lineHeight: 1.7,
      fontSize: "18px",
    }}
  >
    Erstellen Sie Inserate und Social-Media-Posts automatisch – optimiert für die
    wichtigsten Immobilienplattformen und Marketingkanäle.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "24px",
      maxWidth: "800px",
      margin: "0 auto",
    }}
  >
    <div
      style={{
        background: "#FFFFFF",
        padding: "26px",
        borderRadius: "16px",
        border: "1px solid #eee",
      }}
    >
      <h3 style={{ fontWeight: 700, marginBottom: "10px" }}>
        Immobilienportale
      </h3>

      <p style={{ color: "#6B7280", lineHeight: 1.8 }}>
        Homegate • ImmoScout24 • Newhome • Flatfox • Comparis
      </p>
    </div>

    <div
      style={{
        background: "#FFFFFF",
        padding: "26px",
        borderRadius: "16px",
        maxWidth: "650px",
        margin: "20px auto",
        border: "1px solid #eee",
      }}
    >
      <h3 style={{ fontWeight: 700, marginBottom: "10px" }}>
        Social Media
      </h3>

      <p style={{ color: "#6B7280", lineHeight: 1.8 }}>
        Instagram • Facebook • LinkedIn • TikTok • YouTube
      </p>
    </div>
  </div>
</section>
<section
  style={{
    maxWidth: "100%",
    margin: "40px auto 0",
  }}
>
  <h2
    style={{
      fontSize: "32px",
      fontWeight: 800,
      textAlign: "center",
      marginBottom: "40px",
    }}
  >
    Beispiel-Inserat
  </h2>

  <div
  style={{
    background: "#fff",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
    maxWidth: "900px",
    margin: "0 auto"
  }}
>
  <h3
    style={{
      fontSize: "24px",
      fontWeight: 700,
      color: "#27364a",
      marginBottom: "18px"
    }}
  >
    Moderne 4.5 Zimmer Wohnung in Winterthur
  </h3>

  <p style={{ marginBottom: "8px", color: "#4b5563", fontSize: "16px" }}>
    <strong>Objektart:</strong> Eigentumswohnung
  </p>

  <p style={{ marginBottom: "22px", color: "#4b5563", fontSize: "16px" }}>
    <strong>Preis:</strong> CHF 1&apos;095&apos;000
  </p>

  <p style={{ color: "#4b5563", lineHeight: 1.8, marginBottom: "18px" }}>
    Diese stilvolle Wohnung bietet auf 110 m² grosszügigen Wohnraum in ruhiger Lage.
    Der Balkon lädt zum Entspannen ein, während der Lift einen komfortablen Zugang ermöglicht.
  </p>

  <p style={{ color: "#4b5563", lineHeight: 1.8, marginBottom: "24px" }}>
    Die Wohnung ist ideal für Familien oder Paare, die Wert auf eine ruhige Umgebung
    mit guter Anbindung legen.
  </p>

  <h4
    style={{
      fontSize: "18px",
      fontWeight: 700,
      color: "#27364a",
      marginBottom: "14px"
    }}
  >
    Highlights
  </h4>

  <ul
    style={{
      paddingLeft: "20px",
      margin: 0,
      color: "#4b5563",
      lineHeight: 1.9
    }}
  >
    <li>4.5 Zimmer</li>
    <li>110 m² Wohnfläche</li>
    <li>Balkon</li>
    <li>Lift</li>
    <li>Garage</li>
    <li>Ruhige Lage</li>
  </ul>
</div>
</section>
      <section
        style={{
          maxWidth: "1100px",
          margin: "72px auto 0",
          background: "#FFFFFF",
          borderRadius: "24px",
          padding: "34px",
          boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
          border: "1px solid #F1F5F9",
        }}
      >
        <h2 style={{ fontSize: "32px", fontWeight: 800, textAlign: "center" }}>
Generiert automatisch
</h2>

        <div
style={{
display: "grid",
gridTemplateColumns: "repeat(2, minmax(0,1fr))",
gap: "14px",
marginTop: "20px",
color: "#374151",
lineHeight: 1.8,
textAlign: "center",
justifyItems: "center"
}}
>
          <div>• Immobilien-Inserat</div>
          <div>• Exposé-PDF</div>
          <div>• Homegate-Text</div>
          <div>• ImmoScout24-Text</div>
          <div>• Instagram-Post</div>
          <div>• LinkedIn-Post</div>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1100px",
          margin: "72px auto 0",
          textAlign: "center",
          background: "linear-gradient(180deg, #FFFDF8 0%, #F7F1E3 100%)",
          border: "1px solid #EADDB8",
          borderRadius: "24px",
          padding: "40px 24px",
        }}
      >
       <h2 style={{ fontSize: "34px", fontWeight: 800 }}>
50 Inserate kostenlos testen
</h2>

<p
style={{
marginTop: "14px",
color: "#6B7280",
maxWidth: "720px",
marginLeft: "auto",
marginRight: "auto",
lineHeight: 1.7
}}
>
Founder-Angebot: Die ersten 100 Makler erhalten 50 Inserate kostenlos.
</p>

        <div style={{ marginTop: "26px" }}>
   
 <div style={{ marginTop: "24px", textAlign: "center" }}>
  <a
    href="https://buy.stripe.com/test_5kQ28sdozdIk3bsduy1wY00"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "block",
      padding: "14px 28px",
      background: "#D4A017",
      color: "#FFFFFF",
      borderRadius: "12px",
      border: "none",
      fontSize: "16px",
      fontWeight: 700,
      textDecoration: "none",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      textAlign: "center",
      lineHeight: "1.5",
    }}
  >
    Founder Zugang sichern – 19.90 CHF / Monat<br/>
    Nur für die ersten 30 verfügbar<br/>
    regulär 39.90 CHF / Monat
  </a>
</div>
        </div>

      </section>
    </main>
    </>
  );
  }
