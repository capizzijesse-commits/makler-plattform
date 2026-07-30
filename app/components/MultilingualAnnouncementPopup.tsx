"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  useLocale,
  useTranslations,
} from "next-intl";

const STORAGE_KEY =
  "inserat-ai-multilingual-announcement-2026-08-03-v1";

const ANNOUNCEMENT_END =
  Date.parse("2026-08-10T00:00:00+02:00");

export default function MultilingualAnnouncementPopup() {
  const t = useTranslations("MultilingualAnnouncement");
  const locale = useLocale();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (Date.now() >= ANNOUNCEMENT_END) {
      return;
    }

    let dismissed = false;

    try {
      dismissed =
        window.localStorage.getItem(STORAGE_KEY) === "dismissed";
    } catch {
      dismissed = false;
    }

    if (dismissed) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 650);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 40);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // Das Popup bleibt trotzdem schliessbar.
    }

    setVisible(false);
  }

  if (!mounted || !visible) {
    return null;
  }

  return createPortal(
    <div
      className="multilingualAnnouncementOverlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismiss();
        }
      }}
    >
      <section
        className="multilingualAnnouncement"
        role="dialog"
        aria-modal="true"
        aria-labelledby="multilingual-announcement-title"
        aria-describedby="multilingual-announcement-description"
        lang={locale}
      >
        <div className="multilingualAnnouncementGlow" />

        <button
          ref={closeButtonRef}
          type="button"
          className="multilingualAnnouncementClose"
          onClick={dismiss}
          aria-label={t("close")}
          title={t("close")}
        >
          ×
        </button>

        <div className="multilingualAnnouncementBrand">
          <span className="multilingualAnnouncementMark">AI</span>
          <span>Inserat-AI</span>
        </div>

        <p className="multilingualAnnouncementEyebrow">
          {t("eyebrow")}
        </p>

        <h2 id="multilingual-announcement-title">
          {t("title")}
        </h2>

        <p
          id="multilingual-announcement-description"
          className="multilingualAnnouncementDescription"
        >
          {t("description")}
        </p>

        <div
          className="multilingualAnnouncementLanguages"
          aria-label={t("languages")}
        >
          {["DE", "IT", "FR", "EN"].map((language) => (
            <span key={language}>{language}</span>
          ))}
        </div>

        <p className="multilingualAnnouncementNote">
          {t("note")}
        </p>

        <button
          type="button"
          className="multilingualAnnouncementButton"
          onClick={dismiss}
        >
          {t("button")}
        </button>
      </section>

      <style jsx>{`
        .multilingualAnnouncementOverlay {
          position: fixed;
          inset: 0;
          z-index: 2147483400;
          display: grid;
          place-items: center;
          padding: 22px;
          background:
            radial-gradient(
              circle at 50% 18%,
              rgba(245, 158, 11, 0.16),
              transparent 34%
            ),
            rgba(2, 6, 23, 0.76);
          backdrop-filter: blur(12px);
          animation: announcementFade 180ms ease-out;
        }

        .multilingualAnnouncement {
          position: relative;
          width: min(620px, 100%);
          overflow: hidden;
          border: 1px solid rgba(251, 191, 36, 0.42);
          border-radius: 28px;
          padding: 34px;
          color: #f8fafc;
          background:
            linear-gradient(
              145deg,
              rgba(8, 25, 48, 0.98),
              rgba(2, 10, 25, 0.99)
            );
          box-shadow:
            0 30px 90px rgba(2, 6, 23, 0.66),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset;
          animation: announcementEnter 220ms ease-out;
        }

        .multilingualAnnouncementGlow {
          position: absolute;
          top: -110px;
          right: -90px;
          width: 280px;
          height: 280px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.18);
          filter: blur(55px);
          pointer-events: none;
        }

        .multilingualAnnouncementClose {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 2;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          color: rgba(248, 250, 252, 0.9);
          background: rgba(15, 23, 42, 0.76);
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .multilingualAnnouncementClose:hover,
        .multilingualAnnouncementClose:focus-visible {
          transform: scale(1.05);
          border-color: rgba(251, 191, 36, 0.7);
          background: rgba(30, 41, 59, 0.96);
          outline: none;
        }

        .multilingualAnnouncementBrand {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: #f8fafc;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .multilingualAnnouncementMark {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          color: #07172f;
          background:
            linear-gradient(135deg, #fde68a, #f59e0b);
          box-shadow: 0 10px 28px rgba(245, 158, 11, 0.3);
          font-size: 0.86rem;
          letter-spacing: 0.02em;
        }

        .multilingualAnnouncementEyebrow {
          position: relative;
          z-index: 1;
          margin: 28px 0 10px;
          color: #fbbf24;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .multilingualAnnouncement h2 {
          position: relative;
          z-index: 1;
          max-width: 500px;
          margin: 0;
          font-size: clamp(2rem, 6vw, 3.35rem);
          line-height: 1.02;
          letter-spacing: -0.055em;
        }

        .multilingualAnnouncementDescription {
          position: relative;
          z-index: 1;
          max-width: 540px;
          margin: 20px 0 0;
          color: rgba(226, 232, 240, 0.82);
          font-size: 1.03rem;
          line-height: 1.7;
        }

        .multilingualAnnouncementLanguages {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .multilingualAnnouncementLanguages span {
          min-width: 58px;
          padding: 9px 14px;
          border: 1px solid rgba(251, 191, 36, 0.28);
          border-radius: 999px;
          color: #fde68a;
          background: rgba(245, 158, 11, 0.08);
          text-align: center;
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .multilingualAnnouncementNote {
          position: relative;
          z-index: 1;
          margin: 22px 0 0;
          color: rgba(248, 250, 252, 0.94);
          font-weight: 800;
        }

        .multilingualAnnouncementButton {
          position: relative;
          z-index: 1;
          width: 100%;
          min-height: 52px;
          margin-top: 28px;
          border: 0;
          border-radius: 16px;
          color: #07172f;
          background:
            linear-gradient(135deg, #fde68a, #f59e0b);
          box-shadow: 0 16px 34px rgba(245, 158, 11, 0.24);
          font-size: 0.98rem;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 160ms ease,
            filter 160ms ease;
        }

        .multilingualAnnouncementButton:hover,
        .multilingualAnnouncementButton:focus-visible {
          transform: translateY(-1px);
          filter: brightness(1.04);
          outline: 3px solid rgba(251, 191, 36, 0.22);
          outline-offset: 3px;
        }

        @keyframes announcementFade {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes announcementEnter {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 640px) {
          .multilingualAnnouncementOverlay {
            padding: 14px;
            align-items: end;
          }

          .multilingualAnnouncement {
            max-height: calc(100dvh - 28px);
            overflow-y: auto;
            border-radius: 24px;
            padding: 28px 22px 24px;
          }

          .multilingualAnnouncementEyebrow {
            margin-top: 24px;
          }

          .multilingualAnnouncementDescription {
            font-size: 0.96rem;
            line-height: 1.62;
          }

          .multilingualAnnouncementLanguages span {
            flex: 1 1 calc(50% - 10px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .multilingualAnnouncementOverlay,
          .multilingualAnnouncement {
            animation: none;
          }

          .multilingualAnnouncementClose,
          .multilingualAnnouncementButton {
            transition: none;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
