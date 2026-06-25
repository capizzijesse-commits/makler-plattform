"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleRegister(e: FormEvent) {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Bitte alle Felder ausfüllen.");
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem("userName", name);
      localStorage.setItem("userEmail", email);

      router.push("/dashboard");
    } catch {
      alert("Fehler bei der Registrierung.");
      setLoading(false);
    }
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
        padding: "60px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: "28px",
          padding: "42px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div style={{ marginBottom: "30px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(251, 191, 36, 0.45)",
              color: "#fbbf24",
              fontWeight: 800,
              fontSize: "14px",
              marginBottom: "18px",
              background: "rgba(255,255,255,0.08)",
            }}
          >
            30 Tage kostenlos testen
          </div>

          <h1
            style={{
              color: "#ffffff",
              fontSize: "38px",
              fontWeight: 900,
              marginBottom: "12px",
              letterSpacing: "-0.04em",
            }}
          >
            Account erstellen
          </h1>

          <p
            style={{
              color: "#cbd5e1",
              fontSize: "16px",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Erstellen Sie Ihren Zugang und generieren Sie professionelle Immobilieninserate in Sekunden.
          </p>
        </div>

        <form onSubmit={handleRegister}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ihr Name"
            style={inputStyle}
          />

          <label style={labelStyle}>E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@firma.ch"
            style={inputStyle}
          />

          <label style={labelStyle}>Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort eingeben"
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
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
              marginTop: "8px",
            }}
          >
            {loading ? "Account wird erstellt..." : "Account erstellen"}
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
          Bereits registriert?{" "}
          <Link
            href="/login"
            style={{
              color: "#fbbf24",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Einloggen
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
          30 Tage kostenlos testen. Danach startet der Standard-Plan für 19.90 CHF pro Monat.
        </div>
      </div>
    </main>
  );
}

const labelStyle = {
  display: "block",
  color: "#e5e7eb",
  fontWeight: 800,
  marginBottom: "8px",
};

const inputStyle = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)",
  color: "#ffffff",
  fontSize: "16px",
  outline: "none",
  marginBottom: "20px",
};