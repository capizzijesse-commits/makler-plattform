import { getTranslations } from "next-intl/server";

export default async function DatenschutzPage() {
  const t = await getTranslations("Privacy");

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "60px 20px",
        background: "#f8f6f1",
        color: "#1f2937",
      }}
    >
      <article
        style={{
          maxWidth: "850px",
          margin: "0 auto",
          padding: "clamp(28px, 6vw, 48px)",
          border: "1px solid #e5e7eb",
          borderRadius: "24px",
          background: "#ffffff",
          boxShadow: "0 18px 50px rgba(15, 23, 42, 0.07)",
          lineHeight: 1.75,
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "12px",
            fontSize: "clamp(32px, 6vw, 44px)",
            lineHeight: 1.1,
          }}
        >
          {t("title")}
        </h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: "28px",
            color: "#6b7280",
            fontSize: "0.95rem",
          }}
        >
          {t("lastUpdated")}
        </p>

        <p>{t("intro")}</p>

        <h2>{t("sections.controller.title")}</h2>
        <p>
          {t("sections.controller.text")}
          <br />
          <br />
          Jesse Capizzi
          <br />
          Inserat-AI
          <br />
          E-Mail: info@inserat-ai.ch
        </p>

        <h2>{t("sections.processedData.title")}</h2>
        <p>{t("sections.processedData.text")}</p>

        <h2>{t("sections.purpose.title")}</h2>
        <p>{t("sections.purpose.text")}</p>

        <h2>{t("sections.aiContent.title")}</h2>
        <p>{t("sections.aiContent.text")}</p>

        <h2>{t("sections.contactForm.title")}</h2>
        <p>{t("sections.contactForm.text")}</p>

        <h2>{t("sections.storage.title")}</h2>
        <p>{t("sections.storage.text")}</p>

        <h2>{t("sections.thirdParties.title")}</h2>
        <p>{t("sections.thirdParties.text")}</p>

        <h2>{t("sections.analytics.title")}</h2>
        <p>{t("sections.analytics.text")}</p>

        <p>
          <a
            href="https://privacy.microsoft.com/privacystatement"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#9a6700",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
          >
            {t("sections.analytics.microsoftPrivacy")}
          </a>
        </p>

        <h2>{t("sections.rights.title")}</h2>
        <p>{t("sections.rights.text")}</p>

        <h2>{t("sections.changes.title")}</h2>
        <p>{t("sections.changes.text")}</p>
      </article>
    </main>
  );
}
