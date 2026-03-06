"use client";

import { useMemo, useState } from "react";

type Variant = {
  title: string;
  text: string;
  highlights: string[];
};

function formatStandard(v: Variant) {
  return [
    v.title,
    "",
    v.text,
    "",
    "Highlights:",
    ...v.highlights.map((h) => `• ${h}`),
  ].join("\n");
}

function formatHomegate(v: Variant) {
  // Homegate: eher kompakt, klare Absätze + Highlights
  return [
    v.title.toUpperCase(),
    "",
    v.text,
    "",
    v.highlights.map((h) => `- ${h}`).join("\n"),
    "",
    "Kontakt: Helvetic Immobilien Capizzi",
  ].join("\n");
}

function formatImmoScout(v: Variant) {
  // ImmoScout: lesbar, Bulletpoints + kurzer CTA
  return [
    v.title,
    "",
    v.text,
    "",
    "Vorteile:",
    v.highlights.map((h) => `• ${h}`).join("\n"),
    "",
    "Jetzt Besichtigung anfragen.",
  ].join("\n");
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function DashboardPage() {
  // 🔒 “Unlocked” (später Abo/Login). Für jetzt: true damit du testen kannst.
  // Wenn du "copy" sperren willst: return false
  const isUnlocked = useMemo(() => true, []);

  const [activePortal, setActivePortal] = useState<"standard" | "homegate" | "immoscout">("standard");

  // Demo-Varianten (später kommen die von deiner API)
  const [variants, setVariants] = useState<Variant[]>([
    {
      title: "Moderne 3.5-Zimmer-Wohnung in Winterthur – hell & zentral",
      text:
        "Diese attraktive Wohnung überzeugt mit einem klaren Grundriss, viel Tageslicht und einer Lage, die Alltag und Lebensqualität perfekt verbindet. Ideal für Paare oder kleine Familien, die Komfort und Nähe zur Stadt schätzen.",
      highlights: ["3.5 Zimmer", "Helle Räume", "Zentrale Lage", "Guter Grundriss", "ÖV & Einkauf in Nähe"],
    },
    {
      title: "Charmantes Zuhause mit durchdachter Raumaufteilung",
      text:
        "Ein Objekt, das mit Atmosphäre punktet: moderne Linien, angenehme Proportionen und eine Umgebung, in der man sich sofort wohlfühlt. Einziehen, ankommen, geniessen.",
      highlights: ["Wohnqualität", "Praktische Aufteilung", "Angenehmes Wohngefühl", "Nahe Infrastruktur"],
    },
    {
      title: "Stilvoll wohnen – effizient, ruhig und wertbeständig",
      text:
        "Wer Wert auf Stil, Ruhe und eine clevere Flächennutzung legt, findet hier die passende Basis. Ob Eigennutzung oder Investment: die Kombination aus Lage und Konzept überzeugt.",
      highlights: ["Ruhige Umgebung", "Effiziente Fläche", "Wertige Basis", "Gutes Potenzial"],
    },
  ]);

  function getPortalText(v: Variant) {
    if (activePortal === "homegate") return formatHomegate(v);
    if (activePortal === "immoscout") return formatImmoScout(v);
    return formatStandard(v);
  }

  return (
    <main className="min-h-screen">
      <div className="container-max py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted mt-2">
              Portal-Outputs (Standard / Homegate / ImmoScout) + Copy-Buttons. Theme ist oben rechts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge">Copy: {isUnlocked ? "aktiv" : "gesperrt"}</span>
          </div>
        </div>

        {/* Portal Tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            className={`btn ${activePortal === "standard" ? "btn-accent" : "btn-ghost"}`}
            onClick={() => setActivePortal("standard")}
          >
            Standard
          </button>
          <button
            className={`btn ${activePortal === "homegate" ? "btn-accent" : "btn-ghost"}`}
            onClick={() => setActivePortal("homegate")}
          >
            Homegate
          </button>
          <button
            className={`btn ${activePortal === "immoscout" ? "btn-accent" : "btn-ghost"}`}
            onClick={() => setActivePortal("immoscout")}
          >
            ImmoScout24
          </button>
        </div>

        {/* Variants */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {variants.map((v, idx) => {
            const text = getPortalText(v);

            return (
              <div key={idx} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">Variante {idx + 1}</div>
                  <span className="badge">{activePortal}</span>
                </div>

                <div className="mt-3 text-sm whitespace-pre-wrap text-muted">
                  {text}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="btn btn-accent"
                    onClick={async () => {
                      if (!isUnlocked) return alert("Copy ist gesperrt (später Abo/Login).");
                      await copyToClipboard(text);
                      alert("✅ Kopiert!");
                    }}
                  >
                    Copy
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      // Quick edit title to show it works
                      const next = [...variants];
                      next[idx] = { ...next[idx], title: next[idx].title + " ✓" };
                      setVariants(next);
                    }}
                  >
                    Titel markieren
                  </button>
                </div>

                {!isUnlocked && (
                  <div className="mt-3 text-xs text-muted">
                    Copy ist absichtlich deaktiviert. Später wird hier Login/Abo angebunden.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Social share quick links */}
        <div className="mt-10 card p-5">
          <div className="font-semibold">Teilen</div>
          <p className="text-muted text-sm mt-1">
            Diese Buttons verknüpfen sofort mit Social Media (Share-Link). Für echtes Auto-Posting
            braucht es API/Partnerzugang.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-ghost" target="_blank" rel="noreferrer"
               href="https://wa.me/?text=Schau%20dir%20dieses%20Inserat%20an%20(Platzhalter)%20https%3A%2F%2Fdeine-domain.ch">
              WhatsApp Share
            </a>

            <a className="btn btn-ghost" target="_blank" rel="noreferrer"
               href="https://t.me/share/url?url=https%3A%2F%2Fdeine-domain.ch&text=Inserat%20(Platzhalter)">
              Telegram Share
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}