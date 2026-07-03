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

      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      localStorage.setItem("trialStartDate", trialStart.toISOString());
      localStorage.setItem("trialEndDate", trialEnd.toISOString());
      localStorage.setItem("trialStatus", "active");

      router.push("/dashboard");
    } catch {
      alert("Fehler bei der Registrierung.");
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-20 text-white">
      <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute right-0 top-1/3 h-[360px] w-[360px] rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
        <section>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ← Zurück zur Startseite
          </Link>

          <div className="mt-10 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold uppercase tracking-wide text-amber-300">
            30 Tage kostenlos testen
          </div>

          <h1 className="mt-8 max-w-3xl text-5xl font-light leading-tight tracking-tight text-white md:text-7xl">
            Starte mit Inserat-AI und erstelle bessere Immobilieninserate.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            Erstelle deinen Zugang und teste Inserat-AI kostenlos. Generiere
            professionelle Titel, Beschreibungen, Highlights und Inhalte für
            Immobilienportale in wenigen Sekunden.
          </p>

          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-2xl font-semibold text-white">30 Tage</p>
              <p className="mt-2 text-sm text-slate-400">kostenlos testen</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-2xl font-semibold text-white">Sofort</p>
              <p className="mt-2 text-sm text-slate-400">Dashboard nutzen</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-2xl font-semibold text-white">Keine</p>
              <p className="mt-2 text-sm text-slate-400">Kreditkarte nötig</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-7 md:p-9">
            <div className="mb-8 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                Inserat-AI
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Account erstellen
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Kostenlos starten und direkt dein erstes Inserat generieren.
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

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.25)] transition hover:scale-[1.01] hover:from-amber-200 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Account wird erstellt..." : "Kostenlos starten"}
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
              30 Tage kostenlos testen. Danach kannst du den passenden Plan
              auswählen.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}