"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ResetPasswordResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  code?: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [tokenLoaded, setTokenLoaded] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] =
    useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(
      window.location.search
    );

    setToken(searchParams.get("token")?.trim() || "");
    setTokenLoaded(true);
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!token) {
      setErrorMessage(
        "Der Reset-Link ist unvollständig oder ungültig."
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        "Das neue Passwort muss mindestens 8 Zeichen lang sein."
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage(
        "Die beiden Passwörter stimmen nicht überein."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data =
        (await response.json()) as ResetPasswordResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Das Passwort konnte nicht geändert werden."
        );
      }

      setSuccessMessage(
        data.message ||
          "Dein Passwort wurde erfolgreich geändert."
      );

      setPassword("");
      setPasswordConfirmation("");

      window.setTimeout(() => {
        router.push("/login?reset=success");
      }, 1800);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Das Passwort konnte nicht geändert werden."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    minHeight: "52px",
    padding: "0 50px 0 16px",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const eyeButtonStyle = {
    position: "absolute" as const,
    top: "50%",
    right: "14px",
    transform: "translateY(-50%)",
    display: "grid",
    placeItems: "center",
    padding: "4px",
    border: "none",
    background: "transparent",
    color: "#ffffff",
    cursor: "pointer",
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 86px)",
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
          background: "rgba(8, 18, 45, 0.9)",
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
              border:
                "1px solid rgba(251, 191, 36, 0.3)",
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
              fontSize: "clamp(29px, 9vw, 38px)",
              fontWeight: 950,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
            }}
          >
            Neues Passwort
          </h1>

          <p
            style={{
              margin: 0,
              color: "#cbd5e1",
              fontSize: "15px",
              lineHeight: 1.65,
            }}
          >
            Lege jetzt ein neues Passwort für dein
            Inserat-AI-Konto fest.
          </p>
        </div>

        {!tokenLoaded && (
          <div
            style={{
              padding: "16px",
              color: "#cbd5e1",
              textAlign: "center",
            }}
          >
            Reset-Link wird geprüft ...
          </div>
        )}

        {tokenLoaded && !token && (
          <div
            role="alert"
            style={{
              padding: "14px 16px",
              border:
                "1px solid rgba(239, 68, 68, 0.38)",
              borderRadius: "14px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#fecaca",
              fontSize: "14px",
              fontWeight: 750,
              lineHeight: 1.55,
            }}
          >
            Der Link enthält keinen gültigen Reset-Token.
            Fordere bitte einen neuen Link an.
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              border:
                "1px solid rgba(34, 197, 94, 0.38)",
              borderRadius: "14px",
              background: "rgba(34, 197, 94, 0.12)",
              color: "#bbf7d0",
              fontSize: "14px",
              fontWeight: 750,
              lineHeight: 1.55,
            }}
          >
            {successMessage}
            <div style={{ marginTop: "6px" }}>
              Du wirst zum Login weitergeleitet.
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              border:
                "1px solid rgba(239, 68, 68, 0.38)",
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

        {tokenLoaded && token && !successMessage && (
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="reset-password"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e5e7eb",
                fontSize: "14px",
                fontWeight: 850,
              }}
            >
              Neues Passwort
            </label>

            <div style={{ position: "relative" }}>
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Mindestens 8 Zeichen"
                autoComplete="new-password"
                required
                disabled={loading}
                style={inputStyle}
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
                style={eyeButtonStyle}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            <label
              htmlFor="reset-password-confirmation"
              style={{
                display: "block",
                marginTop: "18px",
                marginBottom: "8px",
                color: "#e5e7eb",
                fontSize: "14px",
                fontWeight: 850,
              }}
            >
              Passwort bestätigen
            </label>

            <div style={{ position: "relative" }}>
              <input
                id="reset-password-confirmation"
                type={
                  showConfirmation ? "text" : "password"
                }
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                placeholder="Passwort erneut eingeben"
                autoComplete="new-password"
                required
                disabled={loading}
                style={inputStyle}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmation((current) => !current)
                }
                aria-label={
                  showConfirmation
                    ? "Passwort ausblenden"
                    : "Passwort anzeigen"
                }
                style={eyeButtonStyle}
              >
                {showConfirmation ? "🙈" : "👁"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                minHeight: "52px",
                marginTop: "22px",
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
                boxShadow:
                  "0 16px 36px rgba(249, 115, 22, 0.3)",
              }}
            >
              {loading
                ? "Passwort wird geändert ..."
                : "Neues Passwort speichern"}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
          }}
        >
          <Link
            href="/forgot-password"
            style={{
              color: "#fbbf24",
              fontSize: "14px",
              fontWeight: 850,
              textDecoration: "none",
            }}
          >
            Neuen Reset-Link anfordern
          </Link>
        </div>
      </section>
    </main>
  );
}