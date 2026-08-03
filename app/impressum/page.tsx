import { getTranslations } from "next-intl/server";

export default async function ImpressumPage() {
  const t = await getTranslations("Imprint");

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
          maxWidth: "800px",
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
            marginBottom: "28px",
            fontSize: "clamp(32px, 6vw, 44px)",
            lineHeight: 1.1,
          }}
        >
          {t("title")}
        </h1>

        <p>
          <strong>Capizzi Inserat AI Winterthur</strong>
          <br />
          {t("companyType")}
        </p>

        <p>
          <strong>{t("labels.owner")}:</strong>
          <br />
          Jesse Capizzi
        </p>

        <p>
          <strong>{t("labels.address")}:</strong>
          <br />
          Wässerwiesenstrasse 62
          <br />
          8408 Winterthur
          <br />
          {t("country")}
        </p>

        <p>
          <strong>{t("labels.contact")}:</strong>
          <br />
          {t("labels.phone")}: +41 77 232 35 67
          <br />
          {t("labels.email")}: info@inserat-ai.ch
          <br />
          {t("labels.website")}: https://www.inserat-ai.ch
        </p>

        <p>{t("productNotice")}</p>
      </article>
    </main>
  );
}
