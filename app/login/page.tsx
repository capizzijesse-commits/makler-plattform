"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MessageType = "success" | "error" | "info";

type LoginResponse = {
  success?: boolean;
  error?: string;
  code?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    plan?: string;
    emailVerified?: boolean;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("info");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    const registered = searchParams.get("registered");
    const verified = searchParams.get("verified");

    if (registered === "success") {
      setMessage(
        "Registrierung erfolgreich. Bitte prÃ¼fe dein E-Mail-Postfach und bestÃ¤tige dein Konto."
      );
      setMessageType("success");
      return;
    }

    if (verified === "success") {
      setMessage(
        "Deine E-Mail-Adresse wurde erfolgreich bestÃ¤tigt. Du kannst dich jetzt einloggen."
      );
      setMessageType("success");
      return;
    }

    if (verified === "expired") {
      setMessage(
        "Der BestÃ¤tigungslink ist abgelaufen. Bitte registriere dich erneut, um einen neuen Link zu erhalten."
      );
      setMessageType("error");
      return;
    }

    if (verified === "invalid") {
      setMessage(
        "Der BestÃ¤tigungslink ist ungÃ¼ltig oder wurde bereits verwendet."
      );
      setMessageType("error");
      return;
    }

    if (verified === "missing") {
      setMessage("Im BestÃ¤tigungslink fehlt der notwendige Token.");
      setMessageType("error");
      return;
    }

    if (verified === "error") {
      setMessage(
        "Die E-Mail-Adresse konnte nicht bestÃ¤tigt werden. Bitte versuche es spÃ¤ter erneut."
      );
      setMessageType("error");
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Bitte E-Mail-Adresse und Passwort eingeben.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const responseText = await response.text();

      let data: LoginResponse;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          responseText ||
            "Die Anmeldung hat keine gÃ¼ltige Antwort geliefert."
        );
      }

      if (!response.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          throw new Error(
            data.error ||
              "Bitte bestÃ¤tige zuerst deine E-Mail-Adresse."
          );
        }

        throw new Error(
          data.error ||
            `Anmeldung fehlgeschlagen â€“ HTTP ${response.status}`
        );
      }

      if (!data.user?.email) {
        throw new Error(
          "Die Benutzerdaten konnten nicht geladen werden."
        );
      }

      const loginExpiresAt =
        Date.now() + 30 * 24 * 60 * 60 * 1000;

      localStorage.setItem(
        "userName",
        data.user.name || "Makler"
      );
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem(
        "userRole",
        data.user.role || "user"
      );
      localStorage.setItem(
        "userPlan",
        data.user.plan || "free"
      );
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem(
        "loginExpiresAt",
        String(loginExpiresAt)
      );

      router.push("/cockpit");
    } catch (error) {
      console.error("LOGIN PAGE ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Die Anmeldung ist fehlgeschlagen."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  const messageStyle =
    messageType === "success"
      ? {
          background: "rgba(34, 197, 94, 0.12)",
          border: "1px solid rgba(34, 197, 94, 0.35)",
          color: "#bbf7d0",
        }
      : messageType === "error"
        ? {
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fecaca",
          }
        : {
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            color: "#bfdbfe",
          };

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
        <div
          style={{
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
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
            Melden Sie sich an und erstellen Sie professionelle
            Immobilieninserate in Sekunden.
          </p>
        </div>

        {message && (
          <div
            role="status"
            style={{
              ...messageStyle,
              marginBottom: "22px",
              padding: "14px 16px",
              borderRadius: "16px",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label
            htmlFor="login-email"
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
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@firma.ch"
            required
            autoComplete="email"
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
              boxSizing: "border-box",
            }}
          />

          <label
            htmlFor="login-password"
            style={{
              display: "block",
              color: "#e5e7eb",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            Passwort
          </label>

          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Passwort"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "14px 48px 14px 16px",
                borderRadius: "12px",
                border:
                  "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              aria-label={
                showPassword
                  ? "Passwort ausblenden"
                  : "Passwort anzeigen"
              }
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              {showPassword ? (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9 4 10 8a11.8 11.8 0 0 1-2 4.2" />
    <path d="M6.6 6.6A11.3 11.3 0 0 0 2 12c1 4 5 8 10 8a10.5 10.5 0 0 0 5.4-1.5" />
  </svg>
) : (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "24px",
              padding: "16px 22px",
              borderRadius: "16px",
              border: "none",
              background:
                "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.65 : 1,
              boxShadow:
                "0 18px 40px rgba(249, 115, 22, 0.35)",
            }}
          >
            {loading ? "Anmeldung lÃ¤uft..." : "Einloggen"}
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
            border:
              "1px solid rgba(255,255,255,0.12)",
            color: "#cbd5e1",
            fontSize: "14px",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          Inserat-AI erstellt aus wenigen Angaben professionelle
          Immobilieninserate fÃ¼r Portale, Website und Social Media.
        </div>
      </div>
    </main>
  );
}
