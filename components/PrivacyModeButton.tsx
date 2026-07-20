"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "inseratAiPrivacyMode";

export default function PrivacyModeButton() {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedValue =
      localStorage.getItem(STORAGE_KEY) === "true";

    setActive(savedValue);

    document.documentElement.classList.toggle(
      "privacy-mode",
      savedValue
    );

    setReady(true);
  }, []);

  function togglePrivacyMode() {
    const nextValue = !active;

    setActive(nextValue);

    localStorage.setItem(
      STORAGE_KEY,
      String(nextValue)
    );

    document.documentElement.classList.toggle(
      "privacy-mode",
      nextValue
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <button
      type="button"
      className={
        active
          ? "globalPrivacyButton active"
          : "globalPrivacyButton"
      }
      onClick={togglePrivacyMode}
      aria-pressed={active}
      aria-label={
        active
          ? "Privatsphäre-Modus ausschalten"
          : "Privatsphäre-Modus einschalten"
      }
      title={
        active
          ? "Privatsphäre aktiv – Bilder anzeigen"
          : "Bilder vorübergehend schützen"
      }
    >
      {active ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="privacyIcon"
        >
          <path
            d="M3 3l18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M10.6 10.7a2 2 0 002.7 2.7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <path
            d="M9.9 4.3A10.7 10.7 0 0112 4c5.6 0 9 8 9 8a16 16 0 01-2.2 3.4M6.2 6.2C3.9 8.1 3 12 3 12s3.4 8 9 8a9.7 9.7 0 004.1-.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="privacyIcon"
        >
          <path
            d="M3 12s3.4-8 9-8 9 8 9 8-3.4 8-9 8-9-8-9-8z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <circle
            cx="12"
            cy="12"
            r="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}

      <span className="privacyStatusDot" />
    </button>
  );
}