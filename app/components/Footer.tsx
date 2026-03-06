export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #333",
        padding: "25px",
        marginTop: "60px",
        textAlign: "center",
        color: "#aaa"
      }}
    >
      <p>
        © {new Date().getFullYear()} Helvetic Immobilien Capizzi
      </p>

      <div style={{ marginTop: "12px", display: "flex", gap: "14px", justifyContent: "center" }}>
        <a href="https://instagram.com" target="_blank">Instagram</a>
        <a href="https://facebook.com" target="_blank">Facebook</a>
        <a href="https://linkedin.com" target="_blank">LinkedIn</a>
        <a href="https://tiktok.com" target="_blank">TikTok</a>
        <a href="https://x.com" target="_blank">X</a>
      </div>

      <div style={{ marginTop: "10px", fontSize: "13px", opacity: 0.7 }}>
        <a href="/impressum">Impressum</a> ·
        <a href="/datenschutz"> Datenschutz</a> ·
        <a href="/kontakt"> Kontakt</a>
      </div>
    </footer>
  );
}