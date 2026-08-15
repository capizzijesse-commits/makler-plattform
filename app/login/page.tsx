"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";


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
  const t = useTranslations("Login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("info");

  useEffect(() => {
    const searchParams = new URLSearchParams(
      window.location.search
    );
    const registered = searchParams.get("registered");
    const verified = searchParams.get("verified");
    const reset = searchParams.get("reset");

    if (reset === "success") {
      setMessage(t("messages.resetSuccess"));
      setMessageType("success");
      return;
    }

    if (registered === "success") {
      setMessage(t("messages.registrationSuccess"));
      setMessageType("success");
      return;
    }

    if (verified === "success") {
      setMessage(t("messages.verificationSuccess"));
      setMessageType("success");
      return;
    }

    if (verified === "expired") {
      setMessage(t("messages.verificationExpired"));
      setMessageType("error");
      return;
    }

    if (verified === "invalid") {
      setMessage(t("messages.verificationInvalid"));
      setMessageType("error");
      return;
    }

    if (verified === "missing") {
      setMessage(t("messages.verificationMissing"));
      setMessageType("error");
      return;
    }

    if (verified === "error") {
      setMessage(t("messages.verificationError"));
      setMessageType("error");
    }
  }, [t]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requestedPlan =
      new URLSearchParams(
        window.location.search
      ).get("plan") === "founder"
        ? "founder"
        : "";

    if (!email.trim() || !password) {
      setMessage(t("messages.missingCredentials"));
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

      let data: LoginResponse = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        setMessage(t("messages.invalidResponse"));
        setMessageType("error");
        return;
      }

      if (!response.ok) {
        const errorKey =
          data.code === "EMAIL_NOT_VERIFIED"
            ? "messages.emailNotVerified"
            : data.code === "MISSING_CREDENTIALS"
              ? "messages.missingCredentials"
              : data.code === "LOGIN_UNAVAILABLE"
                ? "messages.loginUnavailable"
                : "messages.invalidCredentials";

        setMessage(t(errorKey));
        setMessageType("error");
        return;
      }

      if (!data.user?.email) {
        setMessage(t("messages.userLoadError"));
        setMessageType("error");
        return;
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

      if (requestedPlan === "founder") {
        setMessage(
          t("messages.founderCheckoutOpening")
        );
        setMessageType("info");

        const checkoutResponse = await fetch(
          "/api/payments/subscription/checkout",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              plan: "founder",
            }),
          }
        );

        const checkoutData =
          (await checkoutResponse
            .json()
            .catch(() => null)) as
            | {
                success?: boolean;
                url?: string;
                error?: string;
                alreadySubscribed?: boolean;
              }
            | null;

        if (checkoutData?.alreadySubscribed) {
          setMessage(
            t("messages.planAlreadyActive")
          );
          setMessageType("success");

          window.setTimeout(() => {
            router.replace("/dashboard");
          }, 900);

          return;
        }

        if (
          !checkoutResponse.ok ||
          !checkoutData?.success ||
          !checkoutData.url
        ) {
          throw new Error(
            checkoutData?.error ||
              t("messages.founderCheckoutError")
          );
        }

        window.location.assign(
          checkoutData.url
        );
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("LOGIN PAGE ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : t("messages.genericError")
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
  className="loginPage"
  style={{
        
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div className="loginCard"
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
            {t("hero.title")}
          </h1>

          <p
            style={{
              color: "#cbd5e1",
              fontSize: "16px",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {t("hero.description")}
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
            {t("fields.email")}
          </label>

         <input
  className="loginInput"
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
  {t("fields.password")}
</label>

          <div style={{ position: "relative" }}>
  <input
    className="loginInput"
    id="login-password"
    type={showPassword ? "text" : "password"}
    placeholder={t("fields.passwordPlaceholder")}
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
                  ? t("fields.hidePassword")
                  : t("fields.showPassword")
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

          <div
            style={{
              marginTop: "10px",
              textAlign: "right",
            }}
          >
            <Link
              href="/forgot-password"
              style={{
                color: "#fbbf24",
                fontSize: "13px",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              {t("actions.forgotPassword")}
            </Link>
          </div>

                <button
  id="login-submit"
  className="loginSubmit"
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
            {loading
              ? t("actions.submitting")
              : t("actions.submit")}
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
          {t("account.prompt")}{" "}
          <Link
            href="/register"
            style={{
              color: "#fbbf24",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            {t("account.register")}
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
          {t("info.description")}
        </div>
      </div>
    </main>
  );
}
