"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Vorläufig nur Demo
      alert(`Account erstellt für: ${name} (${email})`);
    } catch (error) {
      alert("Fehler bei der Registrierung.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-max py-16">
      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div className="badge" style={{ marginBottom: "16px" }}>
          Kostenlos testen
        </div>

        <h1
          style={{
            fontSize: "40px",
            lineHeight: 1.1,
            fontWeight: 800,
            marginBottom: "12px",
            color: "#fff7ed",
          }}
        >
          Account erstellen
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.75)",
            marginBottom: "28px",
            fontSize: "16px",
          }}
        >
          Erstellen Sie Ihren Zugang und testen Sie den Inserat Generator.
        </p>

        <form onSubmit={handleRegister} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#fff7ed",
                fontWeight: 600,
              }}
            >
              Name
            </label>
            <input
              type="text"
              placeholder="Ihr Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#1f2937",
                color: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#fff7ed",
                fontWeight: 600,
              }}
            >
              E-Mail
            </label>
            <input
              type="email"
              placeholder="name@firma.ch"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#1f2937",
                color: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#fff7ed",
                fontWeight: 600,
              }}
            >
              Passwort
            </label>
            <input
              type="password"
              placeholder="Passwort eingeben"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#1f2937",
                color: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "14px 18px",
              borderRadius: "14px",
              border: "none",
              background: "#f59e0b",
              color: "#111827",
              fontWeight: 700,
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            {loading ? "Wird erstellt..." : "Account erstellen"}
          </button>
        </form>

        <p
          style={{
            marginTop: "18px",
            color: "rgba(255,255,255,0.7)",
            fontSize: "14px",
          }}
        >
          Bereits registriert? <a href="/login" style={{ color: "#fbbf24" }}>Login</a>
        </p>
      </div>
    </main>
  );
}