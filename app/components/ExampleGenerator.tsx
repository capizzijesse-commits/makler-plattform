"use client";

import { useState } from "react";

export default function ExampleGenerator() {
  const [objectType, setObjectType] = useState("4.5-Zimmer-Wohnung");
  const [location, setLocation] = useState("Winterthur, ZH");
  const [livingSpace, setLivingSpace] = useState("112 m²");
  const [highlights, setHighlights] = useState(
    "Balkon, offene Küche, Parkettboden, ruhige Lage"
  );

  const [title, setTitle] = useState(
    "Stilvolle 4.5-Zimmer-Wohnung mit Balkon in Winterthur"
  );

  const [description, setDescription] = useState(
    "Diese attraktive Wohnung überzeugt durch helle Räume, eine moderne offene Küche und einen gemütlichen Balkon. Der hochwertige Parkettboden verleiht dem Zuhause eine warme und gepflegte Atmosphäre."
  );

  const generateExample = () => {
    const cleanLocation = location.replace(", ZH", "").trim();
    const firstHighlight =
      highlights.split(",")[0]?.trim() || "besonderen Highlights";

    setTitle(`${objectType} mit ${firstHighlight} in ${cleanLocation}`);

    setDescription(
      `Diese ${objectType.toLowerCase()} in ${cleanLocation} verbindet ein angenehmes Wohngefühl mit einer durchdachten Raumaufteilung. Besonders hervorzuheben sind ${highlights}. Das Objekt eignet sich ideal für Interessenten, die Wert auf Komfort, Lage und eine professionelle Präsentation legen.`
    );
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-28">
      <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-14 max-w-3xl">
          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold uppercase tracking-wide text-amber-300">
            Live-Beispiel
          </span>

          <h2 className="mt-7 text-4xl font-light tracking-tight text-white md:text-6xl">
            Teste direkt, wie Inserat-AI aus wenigen Angaben ein Inserat macht.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Gib ein paar Objektdaten ein und sieh sofort, wie daraus ein
            professioneller Titel und eine hochwertige Beschreibung entstehen.
          </p>
        </div>

        <div className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur md:p-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                  Eingabe
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  Objektangaben
                </h3>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                Demo
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Objektart
                </label>
                <input
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Ort
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Wohnfläche
                </label>
                <input
                  value={livingSpace}
                  onChange={(e) => setLivingSpace(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Highlights
                </label>
                <input
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-white/[0.14]"
                />
              </div>
            </div>

            <button
              onClick={generateExample}
              className="mt-8 w-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.25)] transition hover:scale-[1.01] hover:from-amber-200 hover:to-amber-400"
            >
              Inserat-Vorschau generieren
            </button>

            <p className="mt-4 text-center text-sm text-slate-400">
              Keine Anmeldung nötig – einfach ausprobieren.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-amber-400/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                  KI-Vorschau
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  Generiertes Inserat
                </h3>
              </div>

              <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                Bereit
              </span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Titel
              </p>

              <h4 className="mt-3 text-3xl font-light leading-tight text-white">
                {title}
              </h4>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {livingSpace}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {location}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  Portaltext
                </span>
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-sm uppercase tracking-wide text-slate-400">
                  Beschreibung
                </p>

                <p className="mt-4 text-lg leading-8 text-slate-300">
                  {description}
                </p>
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-sm uppercase tracking-wide text-slate-400">
                  Highlights
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {highlights.split(",").map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200"
                    >
                      {item.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/register"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-6 py-4 font-bold text-slate-950 transition hover:bg-slate-200"
              >
                Kostenlos testen
              </a>

              <a
                href="#pricing"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-6 py-4 font-bold text-white transition hover:bg-white/10"
              >
                Preise ansehen
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}