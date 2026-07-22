"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [isSingleObject, setIsSingleObject] =
    useState(false);

  useEffect(() => {
    const selectedPlan =
      new URLSearchParams(
        window.location.search
      ).get("plan");

    setIsSingleObject(
      selectedPlan === "single-object"
    );
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister(e: FormEvent) {
  e.preventDefault();

  if (!name || !email || !password) {
    alert("Bitte alle Felder ausfÃ¼llen.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const responseText = await response.text();

let data: {
  error?: string;
  message?: string;
  success?: boolean;
};

try {
  data = responseText ? JSON.parse(responseText) : {};
} catch {
  data = {
    error: responseText || "Die Registrierung hat keine gÃ¼ltige Antwort geliefert.",
  };
}

if (!response.ok) {
  throw new Error(
    data.error ||
      data.message ||
      `Registrierung fehlgeschlagen â€“ HTTP ${response.status}`
  );
}

   router.push("/login?registered=success");

    router.push("/login");
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Registrierung fehlgeschlagen."
    );
  } finally {
    setLoading(false);
  }
}

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
  <source src="/zurich-skyline-loop1.mp4" type="video/mp4" />
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
            â† ZurÃ¼ck zur Startseite
          </Link>

          <div className="ml-3 mt-6 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold uppercase tracking-wide text-amber-300 backdrop-blur">
            {isSingleObject
              ? "Einzelimmobilie gewÃ¤hlt"
              : "30 Tage kostenlos testen"}
          </div>

          <h1 className="mt-8 max-w-3xl break-words text-[2.15rem] font-light leading-[1.08] tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl lg:text-7xl">
  Starte mit Inserat-AI und erstelle bessere Inserate.
</h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 drop-shadow sm:text-lg sm:leading-8">
            {isSingleObject
  ?
    "Registriere dich kostenlos, erstelle deine Immobilie und schalte sie anschliessend einmalig fÃ¼r CHF 9.90 frei â€“ ohne Abonnement."
  :
    "Erstelle deinen Zugang und teste Inserat-AI kostenlos. Generiere professionelle Titel, Beschreibungen, Highlights und Inhalte fÃ¼r Immobilienportale in wenigen Sekunden."}
          </p>

       <div className="mt-8 hidden max-w-2xl gap-3 sm:grid sm:grid-cols-3">
  <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur sm:p-5">
    <p className="text-2xl font-semibold text-white">
  {isSingleObject ? "CHF 9.90" : "30 Tage"}
</p>
    <p className="mt-2 text-sm text-slate-300">
  {isSingleObject
    ? "einmalig pro Immobilie"
    : "kostenlos testen"}
</p>
  </div>

  <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur sm:p-5">
    <p className="text-2xl font-semibold text-white">Sofort</p>
    <p className="mt-2 text-sm text-slate-300">Dashboard nutzen</p>
  </div>

  <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur sm:p-5">
    <p className="text-2xl font-semibold text-white">Keine</p>
    <p className="mt-2 text-sm text-slate-300">Kreditkarte nÃ¶tig</p>
  </div>
</div>
        </section>

        <section className="rounded-[2rem] border border-white/15 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-xl">
  <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/65 p-7 shadow-2xl backdrop-blur-xl md:p-9">
            <div className="mb-8 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                Inserat-AI
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Account erstellen
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {isSingleObject
  ?
    "Kostenlos registrieren und dein Objekt erstellen. Bezahlt wird erst bei der Freischaltung."
  :
    "Kostenlos starten und direkt dein erstes Inserat generieren."}
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ihr Name"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.ch"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

            
              <label className="mb-2 block text-sm font-semibold text-slate-300">
  Passwort
</label>

<div style={{ position: "relative" }}>
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Mindestens 8 Zeichen"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
    minLength={8}
    autoComplete="new-password"
    style={{
      width: "100%",
      padding: "14px 48px 14px 16px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.08)",
      color: "#fff",
      outline: "none",
      boxSizing: "border-box",
    }}
  />

  <button
    type="button"
    onClick={() => setShowPassword((current) => !current)}
    style={{
      position: "absolute",
      right: "14px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: "#fff",
      fontSize: "18px",
    }}
  >
    {showPassword ? "ðŸ™ˆ" : "ðŸ‘ï¸"}
  </button>
</div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.25)] transition hover:scale-[1.01] hover:from-amber-200 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
  ? "Account wird erstellt..."
  : isSingleObject
    ? "Kostenlos registrieren und Objekt erstellen"
    : "Kostenlos starten"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Bereits registriert?{" "}
              <Link
                href="/login"
                className="font-bold text-amber-300 transition hover:text-amber-200"
              >
                Einloggen
              </Link>
            </p>

            <div className="mt-8 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-center text-sm leading-6 text-amber-100">
  {isSingleObject ? (
    <>
      <strong>CHF 9.90 einmalig Â· kein Abonnement</strong>
      <br />
      Die Zahlung erfolgt erst, nachdem du dein konkretes
      Objekt erstellt hast.
    </>
  ) : (
    <>
      30 Tage kostenlos testen. Danach kannst du den
      passenden Plan auswÃ¤hlen.
    </>
  )}
</div>
          </div>
        </section>
      </div>
    </main>
  );
}
