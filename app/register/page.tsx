"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  useLocale,
  useTranslations,
} from "next-intl";

import {
  locales,
  type AppLocale,
} from "@/i18n/config";

type RequestedPlan =
  | ""
  | "founder"
  | "single-object";

type RegisterResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
};

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const detectedLocale = useLocale();
  const t = useTranslations("Register");

  const locale: AppLocale = locales.includes(
    detectedLocale as AppLocale
  )
    ? (detectedLocale as AppLocale)
    : "de";

  const [
    requestedPlan,
    setRequestedPlan,
  ] = useState<RequestedPlan>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [dialogMessage, setDialogMessage] =
    useState("");
    const registerFormStartedRef =
  useRef(false);

function handleRegisterFormStart() {
  if (registerFormStartedRef.current) {
    return;
  }

  registerFormStartedRef.current = true;

  trackAnalyticsEvent(
    "register_form_start",
    {
      page_path:
        window.location.pathname,
      requested_plan:
        requestedPlan || "none",
    }
  );
}

 useEffect(() => {
  const plan = new URLSearchParams(
    window.location.search
  ).get("plan");

  const normalizedPlan: RequestedPlan =
    plan === "founder" ||
    plan === "single-object"
      ? plan
      : "";

  setRequestedPlan(normalizedPlan);

  trackAnalyticsEvent(
    "register_page_view",
    {
      page_path:
        window.location.pathname,
      requested_plan:
        normalizedPlan || "none",
    }
  );
}, []);

  useEffect(() => {
    if (!dialogMessage) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setDialogMessage("");
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [dialogMessage]);

  const isFounderRegistration =
    requestedPlan === "founder";

  const isSingleObjectRegistration =
    requestedPlan === "single-object";

  const planContent =
    isFounderRegistration
      ? {
          eyebrow:
            t("plans.founder.eyebrow"),
          title:
            t("plans.founder.title"),
          description:
            t("plans.founder.description"),
          submit:
            t("plans.founder.submit"),
          note:
            t("plans.founder.note"),

          stats: [
            {
              value:
                t("plans.founder.statTrialValue"),
              label:
                t("plans.founder.statTrialLabel"),
            },
            {
              value: "CHF 19.90",
              label:
                t("plans.founder.statAfterTrial"),
            },
            {
              value: "50",
              label:
                t("plans.founder.statPlaces"),
            },
          ],
        }
      : isSingleObjectRegistration
        ? {
            eyebrow:
              t("plans.singleObject.eyebrow"),
            title:
              t("plans.singleObject.title"),
            description:
              t(
                "plans.singleObject.description"
              ),
            submit:
              t("plans.singleObject.submit"),
            note:
              t("plans.singleObject.note"),

            stats: [
              {
                value: "CHF 9.90",
                label:
                  t(
                    "plans.singleObject.statPrice"
                  ),
              },
              {
                value: "5",
                label:
                  t(
                    "plans.singleObject.statImages"
                  ),
              },
              {
                value:
                  t(
                    "plans.singleObject.statNo"
                  ),
                label:
                  t(
                    "plans.singleObject.statSubscription"
                  ),
              },
            ],
          }
        : {
            eyebrow:
              t("plans.demo.eyebrow"),
            title:
              t("plans.demo.title"),
            description:
              t("plans.demo.description"),
            submit:
              t("plans.demo.submit"),
            note:
              t("plans.demo.note"),

            stats: [
              {
                value: "1 Demo",
                label:
                  t("plans.demo.statGeneration"),
              },
              {
                value:
                  t("plans.demo.statInstant"),
                label:
                  t("plans.demo.statDashboard"),
              },
              {
                value:
                  t("plans.demo.statNo"),
                label:
                  t("plans.demo.statCreditCard"),
              },
            ],
          };

  function getErrorMessage(
    errorCode?: string,
    serverMessage?: string
  ): string {
    switch (errorCode) {
      case "INVALID_JSON":
        return t("errors.invalidResponse");

      case "MISSING_FIELDS":
        return t("errors.missingFields");

      case "INVALID_NAME":
        return t("errors.invalidName");

      case "INVALID_EMAIL":
        return t("errors.invalidEmail");

      case "INVALID_PASSWORD":
        return t("errors.invalidPassword");

      case "SERVICE_UNAVAILABLE":
        return t(
          "errors.serviceUnavailable"
        );

      case "EMAIL_SEND_FAILED":
        return t("errors.emailSendFailed");

      case "PROCESSING_FAILED":
        return t("errors.processingFailed");

      default:
        return (
          serverMessage ||
          t("errors.processingFailed")
        );
    }
  }

  function validateForm(): string | null {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (
      !cleanName ||
      !cleanEmail ||
      !password
    ) {
      return t("errors.missingFields");
    }

    if (
      cleanName.length < 2 ||
      cleanName.length > 100
    ) {
      return t("errors.invalidName");
    }

    if (
      cleanEmail.length > 254 ||
      !EMAIL_PATTERN.test(cleanEmail)
    ) {
      return t("errors.invalidEmail");
    }

    if (
      password.length < 8 ||
      password.length > 128
    ) {
      return t("errors.invalidPassword");
    }

    return null;
  }

  async function handleRegister(
    event: FormEvent
  ) {
    event.preventDefault();
let registerErrorTracked = false;
    const validationError =
      validateForm();

 if (validationError) {
  trackAnalyticsEvent(
    "register_error",
    {
      error_type: "validation",
      requested_plan:
        requestedPlan || "none",
    }
  );

  setDialogMessage(validationError);
  return;
}

    setLoading(true);

    try {
      const response = await fetch(
        "/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            plan:
              requestedPlan || undefined,
            locale,
          }),
        }
      );

      const responseText =
        await response.text();

      let data: RegisterResponse = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {
          errorCode: "INVALID_JSON",
        };
      }

      if (!response.ok) {
  trackAnalyticsEvent(
    "register_error",
    {
      error_type: "api",
      error_code:
        data.errorCode ||
        "UNKNOWN",
      requested_plan:
        requestedPlan || "none",
    }
  );

  registerErrorTracked = true;

  throw new Error(
    getErrorMessage(
      data.errorCode,
      data.error || data.message
    )
  );
}

      trackAnalyticsEvent("sign_up", { method: "email" });

      const loginParameters =
        new URLSearchParams({
          registered: "success",
        });

      if (requestedPlan) {
        loginParameters.set(
          "plan",
          requestedPlan
        );
      }

      router.push(
        "/login?" +
          loginParameters.toString()
      );
    } catch (error) {
  if (!registerErrorTracked) {
    trackAnalyticsEvent(
      "register_error",
      {
        error_type: "network_or_unexpected",
        requested_plan:
          requestedPlan || "none",
      }
    );
  }

  setDialogMessage(
        error instanceof Error
          ? error.message
          : t("errors.processingFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  const loginHref = requestedPlan
    ? "/login?plan=" +
      encodeURIComponent(requestedPlan)
    : "/login";

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-20 text-white">
      <video
        className="absolute inset-0 -z-30 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source
          src="/zurich-skyline-loop-mobile.mp4"
          media="(max-width: 768px)"
          type="video/mp4"
        />

        <source
          src="/zurich-skyline-loop1.mp4"
          type="video/mp4"
        />
      </video>

      <div className="absolute inset-0 -z-20 bg-slate-950/25" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/75 via-slate-950/35 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
        <section>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.08] px-5 py-2 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-white/15 hover:text-white"
          >
            <span aria-hidden="true">
              {"\u2190"}
            </span>

            <span className="ml-2">
              {t("back")}
            </span>
          </Link>

          <div className="ml-3 mt-6 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold uppercase tracking-wide text-amber-300 backdrop-blur">
            {t("badge")}
          </div>

          <h1 className="mt-8 max-w-3xl break-words text-[2.15rem] font-light leading-[1.08] tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl lg:text-7xl">
            {t("hero.title")}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 drop-shadow sm:text-lg sm:leading-8">
            {t("hero.description")}
          </p>

          <div className="mt-8 hidden max-w-2xl gap-3 sm:grid sm:grid-cols-3">
            {planContent.stats.map(
              (stat, index) => (
                <div
                  key={stat.value + index}
                  className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur sm:p-5"
                >
                  <p className="text-2xl font-semibold text-white">
                    {stat.value}
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {stat.label}
                  </p>
                </div>

              )

            )}

          </div>
        </section>

        <section className="rounded-[2rem] border border-white/15 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-xl">
          <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/65 p-7 shadow-2xl backdrop-blur-xl md:p-9">
            <div className="mb-8 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                {planContent.eyebrow}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {planContent.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {planContent.description}
              </p>
            </div>

            <form
  onSubmit={handleRegister}
  onFocus={handleRegisterFormStart}
  noValidate
  className="space-y-5"
>
              <div>
                <label
                  htmlFor="register-name"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  {t("form.name")}
                </label>

                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder={t(
                    "form.namePlaceholder"
                  )}
                  autoComplete="name"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  {t("form.email")}
                </label>

                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="name@firma.ch"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  {t("form.password")}
                </label>

                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <input
                    id="register-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder={t(
                      "form.passwordPlaceholder"
                    )}
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                    style={{
                      width: "100%",
                      padding:
                        "14px 48px 14px 16px",
                      borderRadius: "12px",
                      border:
                        "1px solid rgba(255,255,255,0.15)",
                      background:
                        "rgba(255,255,255,0.08)",
                      color: "#fff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? t("form.hidePassword")
                        : t("form.showPassword")
                    }
                    title={
                      showPassword
                        ? t("form.hidePassword")
                        : t("form.showPassword")
                    }
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      background:
                        "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#fff",
                      fontSize: "18px",
                    }}
                  >
                    {showPassword
                      ? "\u{1F648}"
                      : "\u{1F441}\uFE0F"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.25)] transition hover:scale-[1.01] hover:from-amber-200 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? t("form.loading")
                  : planContent.submit}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              {t("login.alreadyRegistered")}{" "}

              <Link
                href={loginHref}
                className="font-bold text-amber-300 transition hover:text-amber-200"
              >
                {t("login.button")}
              </Link>
            </p>

            <div className="mt-8 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-center text-sm leading-6 text-amber-100">
              {planContent.note}
            </div>
          </div>
        </section>
      </div>

      {dialogMessage ? (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDialogMessage("");
            }
          }}
          className="fixed inset-0 z-[2147483647] grid place-items-center bg-slate-950/75 px-5 backdrop-blur-md"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="register-dialog-title"
            aria-describedby="register-dialog-message"
            className="w-full max-w-md overflow-hidden rounded-[1.6rem] border border-amber-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_40px_rgba(245,158,11,0.10)]"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl border border-amber-300/35 bg-amber-400/10 text-xl font-black text-amber-300">
                !
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                  Inserat-AI
                </p>

                <h2
                  id="register-dialog-title"
                  className="mt-2 text-2xl font-semibold text-white"
                >
                  {t("dialog.title")}
                </h2>

                <p
                  id="register-dialog-message"
                  className="mt-3 text-sm leading-6 text-slate-300"
                >
                  {dialogMessage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setDialogMessage("")
              }
              autoFocus
              className="mt-6 w-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3.5 font-black text-slate-950 transition hover:from-amber-200 hover:to-amber-400"
            >
              {t("dialog.close")}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
