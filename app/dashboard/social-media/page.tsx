"use client";

import { useState } from "react";
import Link from "next/link";

type SocialVariant = {
  title: string;
  text: string;
};

export default function SocialMediaPage() {
  const [location, setLocation] = useState("Winterthur");
  const [propertyType, setPropertyType] = useState("Wohnung");
  const [rooms, setRooms] = useState("4.5");
  const [livingArea, setLivingArea] = useState("112");
  const [price, setPrice] = useState("1'450'000");
  const [highlights, setHighlights] = useState(
    "Balkon, offene Küche, Parkettboden, ruhige Lage"
  );
  const [styleText, setStyleText] = useState(
    "hochwertig, modern und einladend"
  );
  const [imageAnalysis, setImageAnalysis] = useState("");

  const [variants, setVariants] = useState<SocialVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerateSocial() {
    setLoading(true);
    setError("");
    setVariants([]);

    try {
      const userEmail = localStorage.getItem("userEmail");

      const response = await fetch("/api/generate-social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location,
          rooms,
          livingArea,
          price,
          propertyType,
          highlights,
          styleText,
          imageAnalysis,
          email: userEmail,
          demo: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler beim Erstellen der Social-Media-Texte.");
        return;
      }

      setVariants(data.variants || []);
    } catch {
      setError("Fehler beim Erstellen der Social-Media-Texte.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Text wurde kopiert.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative px-6 py-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-0 top-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-5 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              ← Zurück zum Dashboard
            </Link>

            <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold text-amber-300">
              Neues Modul · Social Media Studio
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">
                Inserat-AI Studio
              </p>

              <h1 className="mt-6 max-w-4xl text-5xl font-light leading-tight tracking-tight text-white md:text-7xl">
                Social-Media-Texte, die Immobilien sichtbar machen.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
                Erstelle aus wenigen Objektdaten Beiträge für Instagram,
                Facebook und LinkedIn – mit Call-to-Action, Hashtags und
                professioneller Ansprache.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                  Instagram Captions
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                  Facebook Posts
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                  LinkedIn Texte
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200">
                  Hashtags inklusive
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[440px]">
              <div className="absolute -inset-6 rounded-[3rem] bg-amber-400/20 blur-3xl" />

              <div className="relative rounded-[2.5rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl backdrop-blur">
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-amber-300">
                        Live Preview
                      </p>
                      <p className="text-sm text-slate-400">
                        Immobilien-Post Vorschau
                      </p>
                    </div>

                    <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                      Ready
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white">
                    <div className="h-44 bg-gradient-to-br from-slate-200 via-amber-100 to-slate-300" />

                    <div className="p-5 text-slate-950">
                      <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                        Instagram Caption
                      </p>

                      <h3 className="mt-2 text-xl font-black">
                        Stilvoll wohnen in {location}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {rooms}-Zimmer-{propertyType} mit ausgewählten
                        Highlights – professionell präsentiert für Social
                        Media.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          #ImmobilienSchweiz
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          #{location.replace(/\s+/g, "")}
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          #Zuhause
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                      <p className="text-lg font-black">IG</p>
                      <p className="text-xs text-slate-400">Caption</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                      <p className="text-lg font-black">FB</p>
                      <p className="text-xs text-slate-400">Post</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
                      <p className="text-lg font-black">IN</p>
                      <p className="text-xs text-slate-400">LinkedIn</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur">
              <div className="mb-7">
                <p className="text-sm font-black uppercase tracking-wide text-amber-300">
                  Eingabe
                </p>

                <h2 className="mt-2 text-3xl font-black">Objektdaten</h2>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Diese Daten werden nur für die Social-Media-Texte verwendet.
                  Der Hauptgenerator bleibt unverändert.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ort / Lage" value={location} onChange={setLocation} />

                <Field
                  label="Objektart"
                  value={propertyType}
                  onChange={setPropertyType}
                />

                <Field label="Zimmer" value={rooms} onChange={setRooms} />

                <Field
                  label="Wohnfläche m²"
                  value={livingArea}
                  onChange={setLivingArea}
                />

                <Field label="Preis" value={price} onChange={setPrice} />

                <Field label="Stil" value={styleText} onChange={setStyleText} />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Highlights
                </label>

                <input
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-slate-200">
                  Zusätzliche Hinweise optional
                </label>

                <textarea
                  value={imageAnalysis}
                  onChange={(e) => setImageAnalysis(e.target.value)}
                  rows={4}
                  placeholder="z.B. helle Räume, moderne Küche, hochwertiger Ausbau"
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateSocial}
                disabled={loading}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-8 py-4 font-black text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.25)] transition hover:scale-[1.01] hover:from-amber-200 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Social-Media-Texte werden erstellt..."
                  : "Social-Media-Texte erstellen"}
              </button>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
                  {error}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-amber-300/25 bg-amber-50 p-6 text-slate-950 shadow-2xl">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-amber-700">
                    Ausgabe
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Fertige Social-Media-Posts
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-amber-900">
                    Jeder Text wird mit Plattform-Stil, Call-to-Action und
                    passenden Hashtags erstellt.
                  </p>
                </div>

                <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  3 Plattformen
                </div>
              </div>

              {variants.length === 0 ? (
                <div className="grid gap-5 md:grid-cols-3">
                  <EmptyPost platform="Instagram" />
                  <EmptyPost platform="Facebook" />
                  <EmptyPost platform="LinkedIn" />
                </div>
              ) : (
                <div className="grid gap-5">
                  {variants.map((variant, index) => (
                    <div
                      key={index}
                      className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xl font-black">{variant.title}</h3>

                        <button
                          type="button"
                          onClick={() => copyText(variant.text)}
                          className="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-black text-amber-900 transition hover:bg-amber-200"
                        >
                          Text kopieren
                        </button>
                      </div>

                      <p className="whitespace-pre-wrap text-base leading-8 text-slate-700">
                        {variant.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-200">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
      />
    </div>
  );
}

function EmptyPost({ platform }: { platform: string }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-white p-5">
      <div className="h-28 rounded-2xl bg-gradient-to-br from-amber-100 to-slate-100" />

      <p className="mt-4 font-black">{platform}</p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Vorschau erscheint nach dem Generieren.
      </p>
    </div>
  );
}