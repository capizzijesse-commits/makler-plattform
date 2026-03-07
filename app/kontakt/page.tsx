export default function KontaktPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F8F6F1",
        padding: "60px 20px",
        color: "#1F2937",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "22px",
          padding: "36px",
          boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
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
            marginBottom: "16px",
          }}
        >
          Upgrade / Testmonat
        </div>

        <h1
          style={{
            fontSize: "34px",
            lineHeight: 1.15,
            fontWeight: 800,
            margin: 0,
          }}
        >
          Testmonat oder Upgrade anfragen
        </h1>

        <p
          style={{
            marginTop: "14px",
            color: "#6B7280",
            lineHeight: 1.8,
            fontSize: "17px",
          }}
        >
          Sie möchten mehr als 5 Inserate erstellen? Schreiben Sie uns kurz und
          wir richten Ihren Testmonat oder Ihr Upgrade ein.
        </p>

        <div
          style={{
            marginTop: "28px",
            display: "grid",
            gap: "16px",
          }}
        >
          <div>
            <div style={labelStyle}>Name</div>
            <input style={inputStyle} placeholder="Ihr Name oder Maklerbüro" />
          </div>

          <div>
            <div style={labelStyle}>E-Mail</div>
            <input style={inputStyle} placeholder="ihre@email.ch" />
          </div>

          <div>
            <div style={labelStyle}>Telefon</div>
            <input style={inputStyle} placeholder="+41 ..." />
          </div>

          <div>
            <div style={labelStyle}>Nachricht</div>
            <textarea
              style={{
                ...inputStyle,
                minHeight: "140px",
                resize: "vertical",
              }}
              placeholder="Ich interessiere mich für den Testmonat / das Upgrade."
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "24px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <a
            href="mailto:hello@makler-ai.ch?subject=Upgrade%20oder%20Testmonat%20anfragen"
            style={{
              background: "#C8A24D",
              color: "#FFFFFF",
              padding: "12px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Per E-Mail anfragen
          </a>

          <a
            href="/dashboard"
            style={{
              background: "#FFFFFF",
              color: "#374151",
              padding: "12px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 700,
              border: "1px solid #E5E7EB",
            }}
          >
            Zurück zum Generator
          </a>
        </div>

        <div
          style={{
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid #E5E7EB",
            color: "#6B7280",
            lineHeight: 1.8,
            fontSize: "15px",
          }}
        >
          <div><strong>Starter:</strong> 29 CHF / Monat</div>
          <div><strong>Inklusive:</strong> Inserate, Varianten, PDF, Copy, Portale & Social Media</div>
        </div>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  marginBottom: "6px",
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #D1D5DB",
  outline: "none",
  fontSize: "15px",
  color: "#1F2937",
  background: "#FFFFFF",
};