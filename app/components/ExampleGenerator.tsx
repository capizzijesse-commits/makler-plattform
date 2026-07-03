"use client";

import { useState } from "react";

export default function ExampleGenerator() {
  const [objectType, setObjectType] = useState("4.5-Zimmer-Wohnung");
  const [location, setLocation] = useState("Winterthur, ZH");
  const [livingSpace, setLivingSpace] = useState("112 m²");
  const [highlights, setHighlights] = useState(
    "Balkon, offene Küche, Parkettboden, ruhige Lage"
  );

  const [result, setResult] = useState(
    "Stilvolle 4.5-Zimmer-Wohnung mit Balkon in Winterthur"
  );

  const generateExample = () => {
    const firstHighlight = highlights.split(",")[0]?.trim() || "besonderen Highlights";

    setResult(
      `Attraktive ${objectType} in ${location} mit ${firstHighlight}`
    );
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold uppercase tracking-wide text-amber-300">
            Live-Beispiel
          </span>

          <h2 className="mt-8 text-4xl font-light tracking-tight text-white md:text-5xl">
            So einfach entsteht dein Immobilieninserat.
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Gib wenige Eckdaten ein und Inserat-AI erstellt daraus einen
            professionellen Titel, eine emotionale Beschreibung und passende
            Highlights für dein Objekt.
          </p>

          <div className="mt-8 space-y-4 text-white">
            <p>✓ Titel automatisch generieren</p>
            <p>✓ Beschreibung im Makler-Stil</p>
            <p>✓ Highlights für Portale & Social Media</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <label className="block text-sm font-bold text-slate-200">
                Objektart
              </label>
              <input
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none focus:border-amber-400"
              />

              <label className="mt-6 block text-sm font-bold text-slate-200">
                Ort
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none focus:border-amber-400"
              />

              <label className="mt-6 block text-sm font-bold text-slate-200">
                Wohnfläche
              </label>
              <input
                value={livingSpace}
                onChange={(e) => setLivingSpace(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none focus:border-amber-400"
              />

              <label className="mt-6 block text-sm font-bold text-slate-200">
                Highlights
              </label>
              <textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={4}
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none focus:border-amber-400"
              />

              <button
                onClick={generateExample}
                className="mt-6 w-full rounded-full bg-amber-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-amber-300"
              >
                Beispiel generieren
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                KI-Vorschau
              </p>

              <h3 className="mt-6 text-2xl font-light leading-snug text-white">
                {result}
              </h3>

              <p className="mt-8 text-lg leading-8 text-slate-300">
                Diese Immobilie überzeugt durch eine durchdachte Raumaufteilung,
                helle Räume und sorgfältig ausgewählte Highlights. Die Lage in{" "}
                {location} bietet ein attraktives Wohnumfeld und spricht
                Interessenten an, die Wert auf Qualität, Komfort und ein
                gepflegtes Zuhause legen.
              </p>

              <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
                Demo-Vorschau: Die echte KI-Generierung erfolgt später im
                Dashboard.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}