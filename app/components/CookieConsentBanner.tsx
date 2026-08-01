"use client";

import { useEffect, useState } from "react";

type SupportedLocale = "de" | "it" | "fr" | "en";
type ConsentChoice = "accepted" | "rejected";

type ClarityFunction = ((...args: unknown[]) => void) & {
  q?: unknown[][];
};

declare global {
  interface Window {
    clarity?: ClarityFunction;
  }
}

const CLARITY_PROJECT_ID = "xvk3vfu24c";
const STORAGE_KEY = "inserat_ai_analytics_consent_v1";
const CLARITY_SCRIPT_ID = "inserat-ai-clarity-script";

const translations = {
  de: {
    settings: "Datenschutz-Einstellungen",
    title: "Ihre Privatsphäre",
    text:
      "Wir verwenden notwendige Technologien für den sicheren Betrieb von Inserat-AI. Mit Ihrer Zustimmung nutzen wir Microsoft Clarity, um Nutzungsabläufe, Heatmaps und Sitzungsaufzeichnungen auszuwerten und unsere Plattform zu verbessern.",
    privacy: "Datenschutzerklärung",
    reject: "Nur notwendige",
    accept: "Analyse erlauben",
  },
  it: {
    settings: "Impostazioni privacy",
    title: "La vostra privacy",
    text:
      "Utilizziamo tecnologie necessarie per il funzionamento sicuro di Inserat-AI. Con il vostro consenso utilizziamo Microsoft Clarity per analizzare i percorsi di utilizzo, le mappe di calore e le registrazioni delle sessioni e migliorare la piattaforma.",
    privacy: "Informativa sulla privacy",
    reject: "Solo necessari",
    accept: "Consenti analisi",
  },
  fr: {
    settings: "Paramètres de confidentialité",
    title: "Votre vie privée",
    text:
      "Nous utilisons les technologies nécessaires au fonctionnement sécurisé d’Inserat-AI. Avec votre consentement, nous utilisons Microsoft Clarity afin d’analyser les parcours d’utilisation, les cartes thermiques et les enregistrements de sessions et d’améliorer la plateforme.",
    privacy: "Politique de confidentialité",
    reject: "Nécessaires uniquement",
    accept: "Autoriser l’analyse",
  },
  en: {
    settings: "Privacy settings",
    title: "Your privacy",
    text:
      "We use necessary technologies for the secure operation of Inserat-AI. With your consent, we use Microsoft Clarity to analyse user journeys, heatmaps and session recordings and improve the platform.",
    privacy: "Privacy policy",
    reject: "Necessary only",
    accept: "Allow analytics",
  },
} satisfies Record<
  SupportedLocale,
  {
    settings: string;
    title: string;
    text: string;
    privacy: string;
    reject: string;
    accept: string;
  }
>;

function detectLocale(): SupportedLocale {
  const browserLocale = document.documentElement.lang
    .toLowerCase()
    .split("-")[0];

  if (
    browserLocale === "de" ||
    browserLocale === "it" ||
    browserLocale === "fr" ||
    browserLocale === "en"
  ) {
    return browserLocale;
  }

  return "de";
}

function ensureClarityQueue(): ClarityFunction {
  if (typeof window.clarity === "function") {
    return window.clarity;
  }

  const clarity: ClarityFunction = (...args: unknown[]) => {
    clarity.q = clarity.q ?? [];
    clarity.q.push(args);
  };

  window.clarity = clarity;
  return clarity;
}

function allowClarity(): void {
  const clarity = ensureClarityQueue();

  clarity("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: "granted",
  });

  if (document.getElementById(CLARITY_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = CLARITY_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;

  document.head.appendChild(script);
}

function denyClarity(): void {
  window.clarity?.("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: "denied",
  });
}

export default function CookieConsentBanner() {
  const [locale, setLocale] = useState<SupportedLocale>("de");
  const [isOpen, setIsOpen] = useState(false);
  const [hasChoice, setHasChoice] = useState(false);

  useEffect(() => {
    setLocale(detectLocale());

    const savedChoice = window.localStorage.getItem(
      STORAGE_KEY
    ) as ConsentChoice | null;

    if (savedChoice === "accepted") {
      allowClarity();
      setHasChoice(true);
      return;
    }

    if (savedChoice === "rejected") {
      denyClarity();
      setHasChoice(true);
      return;
    }

    setIsOpen(true);
  }, []);

  const copy = translations[locale];

  function acceptAnalytics() {
    window.localStorage.setItem(STORAGE_KEY, "accepted");
    allowClarity();
    setHasChoice(true);
    setIsOpen(false);
  }

  function rejectAnalytics() {
    const previousChoice = window.localStorage.getItem(STORAGE_KEY);

    window.localStorage.setItem(STORAGE_KEY, "rejected");
    denyClarity();
    setHasChoice(true);
    setIsOpen(false);

    if (previousChoice === "accepted") {
      window.setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }

  return (
    <>
      {hasChoice && !isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-3 left-3 z-[9998] rounded-full border border-amber-300/30 bg-[#071127]/95 px-3 py-2 text-xs font-medium text-amber-100 shadow-lg backdrop-blur transition hover:border-amber-300/60 hover:bg-[#0b1733]"
          aria-label={copy.settings}
        >
          {copy.settings}
        </button>
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-consent-title"
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-300/25 bg-[#071127] shadow-2xl shadow-black/50">
            <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600" />

            <div className="p-5 sm:p-7">
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Inserat-AI
                </p>

                <h2
                  id="cookie-consent-title"
                  className="text-xl font-semibold text-white sm:text-2xl"
                >
                  {copy.title}
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {copy.text}
                </p>

                <a
                  href="/datenschutz"
                  className="mt-3 inline-flex text-sm font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-4 transition hover:text-amber-200"
                >
                  {copy.privacy}
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={rejectAnalytics}
                  className="min-h-12 rounded-xl border border-slate-500/60 bg-transparent px-5 py-3 font-semibold text-white transition hover:border-slate-300 hover:bg-white/5"
                >
                  {copy.reject}
                </button>

                <button
                  type="button"
                  onClick={acceptAnalytics}
                  className="min-h-12 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-500 to-amber-300 px-5 py-3 font-semibold text-[#071127] shadow-lg shadow-amber-500/10 transition hover:brightness-105"
                >
                  {copy.accept}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
