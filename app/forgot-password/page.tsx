"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type ForgotPasswordResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      const data = (await response.json()) as ForgotPasswordResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Die Anfrage konnte momentan nicht verarbeitet werden."
        );
      }

      setSuccessMessage(
        data.message ||
          "Falls ein Konto existiert, wurde ein Reset-Link versendet."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Anfrage ist fehlgeschlagen."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background:
          "radial-gradient(circle at 20% 10%, rgba(37, 99, 235, 0.34), transparent 30%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.24), transparent 32%), linear-gradient(135deg, #020617 0%, #0f172a 48%, #172554 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "clamp(24px, 7vw, 42px)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderRadius: "26px",
          background: "rgba(8, 18, 45, 0.88)",
          boxShadow: "0 28px 80px rgba(0, 0, 0, 0.38)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            marginBottom: "28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "18px",
              padding: "8px 14px",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              borderRadius: "999px",
              background: "rgba(245, 158, 11, 0.09)",
              color: "#fbbf24",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.08em",
            }}
          >
            INSERAT-AI
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              color: "#ffffff",
              fontSize: "clamp(30px, 9vw, 38px)",
              fontWeight: 950,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
            }}
          >
            Passwort vergessen?
          </h1>

          <p
            style={{
              margin: 0,
              color: "#cbd5e1",
              fontSize: "15px",
              lineHeight: 1.65,
            }}
          >
            Gib deine registrierte E-Mail-Adresse ein. Wir senden dir
            einen Link, mit dem du ein neues Passwort festlegen kannst.
          </p>
        </div>

        {successMessage && (
          <div
            role="status"
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              border: "1px solid rgba(34, 197, 94, 0.38)",
              borderRadius: "14px",
              background: "rgba(34, 197, 94, 0.12)",
              color: "#bbf7d0",
              fontSize: "14px",
              fontWeight: 750,
              lineHeight: 1.55,
            }}
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              border: "1px solid rgba(239, 68, 68, 0.38)",
              borderRadius: "14px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#fecaca",
              fontSize: "14px",
              fontWeight: 750,
              lineHeight: 1.55,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="forgot-password-email"
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#e5e7eb",
              fontSize: "14px",
              fontWeight: 850,
            }}
          >
            E-Mail-Adresse
          </label>

          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@firma.ch"
            autoComplete="email"
            required
            disabled={loading}
            style={{
              width: "100%",
              minHeight: "52px",
              padding: "0 16px",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#ffffff",
              fontSize: "16px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              minHeight: "52px",
              marginTop: "20px",
              padding: "0 18px",
              border: "none",
              borderRadius: "14px",
              background:
                "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 900,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.65 : 1,
              boxShadow: "0 16px 36px rgba(249, 115, 22, 0.3)",
            }}
          >
            {loading ? "Link wird versendet ..." : "Reset-Link senden"}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
          }}
        >
          <Link
            href="/login"
            style={{
              color: "#fbbf24",
              fontSize: "14px",
              fontWeight: 850,
              textDecoration: "none",
            }}
          >
            ← Zurück zum Login
          </Link>
        </div>

        <p
          style={{
            margin: "24px 0 0",
            color: "#94a3b8",
            fontSize: "12px",
            lineHeight: 1.55,
            textAlign: "center",
          }}
        >
          Aus Sicherheitsgründen zeigen wir nicht an, ob eine
          E-Mail-Adresse bei Inserat-AI registriert ist.
        </p>
      </section>
    </main>
  );
}