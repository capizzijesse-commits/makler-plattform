"use client";

import { useEffect, useState } from "react";
import type { InseratAiMarket } from "@/lib/inserat-ai-market";

type SocialProofSectionProps = {
  market: InseratAiMarket;
};

type SocialProofResponse = {
  success?: boolean;
  registrations?: number;
};

export default function SocialProofSection({
  market,
}: SocialProofSectionProps) {
  const [registrations, setRegistrations] =
    useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSocialProof() {
      try {
        const response = await fetch(
          "/api/public/social-proof",
          {
            cache: "no-store",
          }
        );

        const data = (await response
          .json()
          .catch(() => null)) as
          | SocialProofResponse
          | null;

        if (
          cancelled ||
          !response.ok ||
          !data?.success ||
          typeof data.registrations !== "number"
        ) {
          return;
        }

        setRegistrations(
          Math.max(0, Math.floor(data.registrations))
        );
      } catch {
        // Die Startseite bleibt auch ohne Live-Zahl vollständig nutzbar.
      }
    }

    void loadSocialProof();

    return () => {
      cancelled = true;
    };
  }, []);

  const showRegistrationCount =
    registrations !== null && registrations >= 10;

  const isGermany = market === "DE";

  const cards = isGermany
    ? [
        {
          number: "01",
          title: "Kostenlos ausprobieren",
          text: "Ohne Kreditkarte starten und Inserat-AI direkt mit einer eigenen Immobilie kennenlernen.",
        },
        {
          number: "02",
          title: "In wenigen Minuten zum Inserat",
          text: "Objektdaten eingeben und daraus professionelle Inserat-Varianten für die Vermarktung erstellen.",
        },
        {
          number: "03",
          title: "Alles an einem Ort",
          text: "Inserat, Bilder, Social Media und weitere Marketing-Inhalte zentral bearbeiten.",
        },
      ]
    : [
        {
          number: "01",
          title: "Kostenlos ausprobieren",
          text: "Ohne Kreditkarte starten und Inserat-AI direkt mit einer eigenen Immobilie kennenlernen.",
        },
        {
          number: "02",
          title: "Schneller zum fertigen Inserat",
          text: "Aus wenigen Objektdaten entstehen professionelle Varianten für Ihre Immobilienvermarktung.",
        },
        {
          number: "03",
          title: "Zentral arbeiten",
          text: "Inserat, Bilder, Social Media und weitere Marketing-Inhalte an einem Ort bearbeiten.",
        },
      ];

  return (
    <section
      aria-labelledby="social-proof-title"
      className="relative mx-auto mt-12 max-w-6xl px-4 sm:px-6 md:mt-16"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-white/[0.075] via-white/[0.045] to-amber-400/[0.035] p-6 shadow-2xl backdrop-blur md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative">
          <div className="max-w-3xl">
            <span className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
              {isGermany
                ? "Für den Immobilienalltag entwickelt"
                : "Für Immobilienprofis entwickelt"}
            </span>

            <h2
              id="social-proof-title"
              className="mt-4 text-3xl font-black tracking-[-0.035em] text-white md:text-5xl"
            >
              {isGermany
                ? "Professionelle Immobilienvermarktung. Einfacher gemacht."
                : "Professionelle Immobilienvermarktung. Einfacher gemacht."}
            </h2>

            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              {isGermany
                ? "Inserat-AI unterstützt Immobilienprofis dabei, hochwertige Inhalte schneller zu erstellen und den gesamten Vermarktungsprozess übersichtlich zu organisieren."
                : "Inserat-AI unterstützt Immobilienprofis dabei, hochwertige Inhalte schneller zu erstellen und den Vermarktungsprozess übersichtlich zu organisieren."}
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <article
                key={card.number}
                className="group rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-6 transition duration-300 hover:-translate-y-1 hover:border-amber-300/25 hover:bg-white/[0.065]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black tracking-[0.18em] text-amber-300">
                    {card.number}
                  </span>

                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-sm font-black text-emerald-300"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-black text-white">
                  {card.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {card.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm font-bold text-slate-400">
            <span>✓ Keine Kreditkarte erforderlich</span>

            <span>✓ Datenschutz im Fokus</span>

            {isGermany && (
              <span>✓ Für den deutschen Immobilienmarkt</span>
            )}

            {showRegistrationCount && (
              <span>
                ✓ Bereits {registrations} registrierte Nutzer
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
