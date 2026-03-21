"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Login fehlgeschlagen");
      return;
    }

    localStorage.setItem("userName", data.user.name);
    localStorage.setItem("userEmail", data.user.email);

    window.location.href = "/dashboard";
  } catch (error) {
    console.error(error);
    alert("Fehler beim Login");
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
          Login
        </div>

        <h1
          style={{
            fontSize: "40px",
            fontWeight: 800,
            marginBottom: "12px",
            color: "#fff7ed",
          }}
        >
          Willkommen zurück
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.75)",
            marginBottom: "28px",
          }}
        >
          Melden Sie sich an, um den Inserat Generator zu nutzen.
        </p>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: "16px" }}>
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
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
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
            {loading ? "Wird geladen..." : "Login"}
          </button>
        </form>

        <p
          style={{
            marginTop: "20px",
            color: "rgba(255,255,255,0.7)",
            fontSize: "14px",
          }}
        >
          Noch kein Konto?{" "}
          <a href="/register" style={{ color: "#fbbf24" }}>
            Account erstellen
          </a>
        </p>
      </div>
    </main>
  );
}