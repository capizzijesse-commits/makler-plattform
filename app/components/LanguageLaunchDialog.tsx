"use client";

import {useEffect, useId, useRef, useState} from "react";
import {useLocale} from "next-intl";
import styles from "./LanguageLaunchDialog.module.css";

const STORAGE_KEY = "inserat-ai-language-launch-2026-08-03-v2";

type SupportedLocale = "de" | "it" | "fr" | "en";

const content: Record<
  SupportedLocale,
  {
    eyebrow: string;
    title: string;
    description: string;
    slogan: string;
    confirm: string;
    close: string;
    languagesLabel: string;
  }
> = {
  de: {
    eyebrow: "NEU AB MONTAG",
    title: "Inserat-AI spricht vier Sprachen.",
    description:
      "Ab Montag, 3. August 2026, ist Inserat-AI vollständig auf Deutsch, Italienisch, Französisch und Englisch verfügbar – von der Startseite bis zum Exposé.",
    slogan: "Eine Plattform. Vier Sprachen. Für die ganze Schweiz.",
    confirm: "Verstanden",
    close: "Ankündigung schliessen",
    languagesLabel: "Verfügbare Sprachen",
  },

  it: {
    eyebrow: "NOVITÀ DA LUNEDÌ",
    title: "Inserat-AI parla quattro lingue.",
    description:
      "Da lunedì 3 agosto 2026, Inserat-AI sarà completamente disponibile in tedesco, italiano, francese e inglese – dalla pagina iniziale fino all’esposé.",
    slogan: "Una piattaforma. Quattro lingue. Per tutta la Svizzera.",
    confirm: "Ho capito",
    close: "Chiudi l’annuncio",
    languagesLabel: "Lingue disponibili",
  },

  fr: {
    eyebrow: "NOUVEAU DÈS LUNDI",
    title: "Inserat-AI parle quatre langues.",
    description:
      "Dès le lundi 3 août 2026, Inserat-AI sera entièrement disponible en allemand, italien, français et anglais – de la page d’accueil jusqu’à l’exposé.",
    slogan: "Une plateforme. Quatre langues. Pour toute la Suisse.",
    confirm: "Compris",
    close: "Fermer l’annonce",
    languagesLabel: "Langues disponibles",
  },

  en: {
    eyebrow: "NEW FROM MONDAY",
    title: "Inserat-AI speaks four languages.",
    description:
      "From Monday, 3 August 2026, Inserat-AI will be fully available in German, Italian, French and English – from the homepage through to the property brochure.",
    slogan: "One platform. Four languages. For all of Switzerland.",
    confirm: "Got it",
    close: "Close announcement",
    languagesLabel: "Available languages",
  },
};

const languages = [
  {
    code: "DE",
    name: "Deutsch",
    flagClass: "flagGermany",
  },
  {
    code: "IT",
    name: "Italiano",
    flagClass: "flagItaly",
  },
  {
    code: "FR",
    name: "Français",
    flagClass: "flagFrance",
  },
  {
    code: "EN",
    name: "English",
    flagClass: "flagUnitedKingdom",
  },
] as const;

export default function LanguageLaunchDialog() {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const normalizedLocale = locale
    .toLowerCase()
    .slice(0, 2) as SupportedLocale;

  const text = content[normalizedLocale] ?? content.de;

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);

      if (dismissed !== "dismissed") {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function dismissDialog() {
    setIsOpen(false);

    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // Funktioniert trotzdem während der aktuellen Sitzung.
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismissDialog();
        }
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className={styles.glow} aria-hidden="true" />

        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logo} aria-hidden="true">
              AI
            </div>

            <span className={styles.brandName}>Inserat-AI</span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={dismissDialog}
            aria-label={text.close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className={styles.content}>
          <p className={styles.eyebrow}>{text.eyebrow}</p>

          <h2 id={titleId} className={styles.title}>
            {text.title}
          </h2>

          <p id={descriptionId} className={styles.description}>
            {text.description}
          </p>

          <div
            className={styles.languages}
            aria-label={text.languagesLabel}
          >
            {languages.map((language) => (
              <div className={styles.language} key={language.code}>
                <span className={styles.languageCode}>
                  {language.code}
                </span>

                <span
                  className={`${styles.flag} ${
                    styles[language.flagClass]
                  }`}
                  role="img"
                  aria-label={language.name}
                />
              </div>
            ))}
          </div>

          <p className={styles.slogan}>{text.slogan}</p>

          <button
            type="button"
            className={styles.confirmButton}
            onClick={dismissDialog}
          >
            {text.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}