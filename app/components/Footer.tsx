import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid #333",
        padding: "25px",
        marginTop: "60px",
        textAlign: "center",
        color: "#aaa",
      }}
    >
      <p>{t("product")}</p>

      <p>{t("copyright", { year: currentYear })}</p>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          justifyContent: "center",
        }}
      >
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>

        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>

        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>

        <a
          href="https://tiktok.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          TikTok
        </a>

        <a
          href="https://x.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          X
        </a>
      </div>

      <div
        style={{
          marginTop: "10px",
          fontSize: "13px",
          opacity: 0.7,
        }}
      >
        <a href="/impressum">
          {t("links.legalNotice")}
        </a>

        {" \u00B7 "}

        <a href="/datenschutz">
          {t("links.privacy")}
        </a>

        {" \u00B7 "}

        <a href="/kontakt">
          {t("links.contact")}
        </a>
      </div>
    </footer>
  );
}
