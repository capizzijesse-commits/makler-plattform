export default function Navbar() {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        padding: "20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "13px",
            letterSpacing: "3px",
            color: "#9CA3AF"
          }}
        >
          MAKLER AI
        </div>

        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#F1F5F9"
          }}
        >
          Inserate Generator
        </div>
      </div>
    </div>
  );
}