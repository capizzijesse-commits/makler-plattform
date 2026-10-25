import AutomationFlowV2 from "./AutomationFlowV2";
import { isIsolatedLocalAutomationTest } from "@/lib/local-automation-test-access.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// AUTOPILOT_PUBLIC_MAINTENANCE_V1
// Wartungsanzeige deaktivieren: auf false setzen.
const AUTOPILOT_PUBLIC_MAINTENANCE = true;

export default async function AutomationPage() {
  if (AUTOPILOT_PUBLIC_MAINTENANCE && !(await isIsolatedLocalAutomationTest())) {
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
            Wir optimieren derzeit den Inserat-AI Autopiloten,
            um die Erstellung Ihrer Immobilieninserate noch
            schneller und zuverlässiger zu gestalten.
          </p>

          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 32,
            }}
          >
            Unser Autopilot steht Ihnen in Kürze wieder zur Verfügung.
          </p>

        </section>
      </main>
    );
  }

  return <AutomationFlowV2 />;
}
