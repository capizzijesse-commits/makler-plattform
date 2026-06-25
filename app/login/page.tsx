"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      alert("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const nameFromEmail = email.split("@")[0] || "Makler";
    const cleanName =
      nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

    localStorage.setItem("userName", cleanName);
    localStorage.setItem("userEmail", email);

    router.push("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(37, 99, 235, 0.35), transparent 28%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.28), transparent 30%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e3a8a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: "28px",
          padding: "42px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div style={{ marginBottom: "30px", textAlign: "center" }}>
          <h1
            style={{
              color: "#ffffff",
              fontSize: "36px",
              fontWeight: 900,
              marginBottom: "12px",
              letterSpacing: "-0.04em",
            }}
          >
            Willkommen zurück
          </h1>

          <p
            style={{
              color: "#cbd5e1",
              fontSize: "16px",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Melden Sie sich an und erstellen Sie professionelle Immobilieninserate in Sekunden.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: "block",
              color: "#e5e7eb",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            E-Mail
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@firma.ch"
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
              marginBottom: "20px",
            }}
          />

          <label
            style={{
              display: "block",
              color: "#e5e7eb",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            Passwort
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort eingeben"
            style={{
              width: "100%",
              padding: "16px 18px",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
              marginBottom: "26px",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "16px 22px",
              borderRadius: "16px",
              border: "none",
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 18px 40px rgba(249, 115, 22, 0.35)",
            }}
          >
            Einloggen
          </button>
        </form>

        <p
          style={{
            color: "#cbd5e1",
            textAlign: "center",
            marginTop: "24px",
            fontSize: "15px",
          }}
        >
          Noch keinen Account?{" "}
          <Link
            href="/register"
            style={{
              color: "#fbbf24",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            30 Tage kostenlos starten
          </Link>
        </p>

        <div
          style={{
            marginTop: "28px",
            padding: "16px",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#cbd5e1",
            fontSize: "14px",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          Inserat-AI erstellt aus wenigen Angaben professionelle Immobilieninserate für Portale, Website und Social Media.
        </div>
      </div>
    </main>
  );
}
