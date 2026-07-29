"use client";

import { useTranslations } from "next-intl";

export default function KontaktPage() {
  const t = useTranslations("Contact");
  const emailSubject = encodeURIComponent(t("email.subject"));
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
          {t("badge")}
        </div>

        <h1
        
          style={{
            fontSize: "34px",
            lineHeight: 1.15,
            fontWeight: 800,
            margin: 0,
          }}
        >
          {t("title")}
        </h1>
<div style={{ marginTop: "24px", lineHeight: 1.8 }}>
  <p>
    <strong>Helvetic Immobilien Capizzi</strong><br />
    {t("details.owner")}: Jesse Capizzi
  </p>

  <p>
    <strong>{t("details.phoneJesse")}:</strong><br />
    +41 77 232 35 67
  </p>

  <p>
    <strong>{t("details.phoneDanja")}:</strong><br />
    +41 77 231 72 59
  </p>

  <p>
    <strong>{t("details.email")}:</strong><br />
    info@inserat-ai.ch
  </p>

  <p>
    <strong>{t("details.website")}:</strong><br />
    https://www.inserat-ai.ch
  </p>
</div>
        <p
          style={{
            marginTop: "14px",
            color: "#6B7280",
            lineHeight: 1.8,
            fontSize: "17px",
          }}
        >
          {t("description")}
        </p>

        <div
          style={{
            marginTop: "28px",
            display: "grid",
            gap: "16px",
          }}
        >
          <div>
            <div style={labelStyle}>{t("form.name")}</div>
            <input style={inputStyle} placeholder={t("form.namePlaceholder")} />
          </div>

          <div>
            <div style={labelStyle}>{t("form.email")}</div>
            <input style={inputStyle} placeholder={t("form.emailPlaceholder")} />
          </div>

          <div>
            <div style={labelStyle}>{t("form.phone")}</div>
            <input style={inputStyle} placeholder="+41 ..." />
          </div>

          <div>
            <div style={labelStyle}>{t("form.message")}</div>
            <textarea
              style={{
                ...inputStyle,
                minHeight: "140px",
                resize: "vertical",
              }}
              placeholder={t("form.messagePlaceholder")}
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
            href={`mailto:info@inserat-ai.ch?subject=${emailSubject}`}
            style={{
              background: "#C8A24D",
              color: "#FFFFFF",
              padding: "12px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            {t("actions.email")}
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
            {t("actions.backToGenerator")}
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
          <div>
            <strong>{t("footer.responseTitle")}:</strong>{" "}
            {t("footer.responseText")}
          </div>
          <div>
            <strong>{t("footer.supportTitle")}:</strong>{" "}
            {t("footer.supportText")}
          </div>
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
