"use client";

import AutomationFlowV2 from "./AutomationFlowV2";

// AUTOPILOT_PUBLIC_MAINTENANCE_V1
// Wartungsanzeige deaktivieren: auf false setzen.
const AUTOPILOT_PUBLIC_MAINTENANCE = true;

export default function AutomationPage() {
  if (AUTOPILOT_PUBLIC_MAINTENANCE) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 180px)",
          padding: "48px 20px",
          background: "#07172b",
          color: "#ffffff",
        }}
      >
        <section
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "36px",
            background: "#0d2038",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: 24,
          }}
        >
          <div
            style={{
              color: "#f59e0b",
              fontWeight: 800,
              letterSpacing: "0.1em",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            INSERAT-AI AUTOPILOT
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              lineHeight: 1.2,
              margin: "0 0 22px",
            }}
          >
            Technische Optimierungen
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              marginBottom: 20,
            }}
          >
            Wir verbessern derzeit unseren Inserat-AI Autopiloten,
            um Ihnen ein noch schnelleres und zuverlässigeres
            Erlebnis zu bieten.
          </p>

          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 32,
            }}
          >
            Wir sind in Kürze wieder für Sie da.
          </p>

          <button
            type="button"
            onClick={() => {
              window.alert(
                "Wir sind in Kürze wieder für Sie da."
              );
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "32px 20px",
              borderRadius: 16,
              border: "1px dashed rgba(245,158,11,0.65)",
              background: "#142840",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Wir sind in Kürze wieder für Sie da.
          </button>
        </section>
      </main>
    );
  }

  return <AutomationFlowV2 />;
}