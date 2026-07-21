"use client";

import { usePathname } from "next/navigation";

type SupportAction =
  | "feedback"
  | "contact"
  | "guide";

function isGuidePage(pathname: string): boolean {
  return (
    pathname === "/cockpit" ||
    /^\/cockpit\/[^/]+\/?$/.test(pathname) ||
    /^\/cockpit\/[^/]+\/edit\/?$/.test(pathname) ||
    pathname === "/dashboard" ||
    pathname === "/dashboard/social-media" ||
    pathname === "/dashboard/tour-guide" ||
    /^\/expose\/[^/]+\/?$/.test(pathname) ||
    pathname === "/konto"
  );
}

function sendWindowEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

export default function SupportActionDock() {
  const pathname = usePathname() || "/";
  const showGuide = isGuidePage(pathname);

  function openAction(action: SupportAction) {
    sendWindowEvent("inserat-ai:close-feedback");
    sendWindowEvent("inserat-ai:close-contact");
    sendWindowEvent("inserat-ai:close-guide");

    if (action === "guide") {
      sendWindowEvent("inserat-ai:open-guide");
    }

    if (action === "feedback") {
      sendWindowEvent("inserat-ai:open-feedback");
    }

    if (action === "contact") {
      sendWindowEvent("inserat-ai:open-contact");
    }
  }

  return (
    <nav
      className="supportDock"
      aria-label="Inserat-AI Hilfe und Kontakt"
    >
      {showGuide ? (
        <button
          type="button"
          className="supportAction supportGuide"
          onClick={() => openAction("guide")}
          aria-label="Inserat-AI Guide öffnen"
        >
          <span className="supportIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 2.5 13.7 9l5.8 3-5.8 3L12 21.5 10.3 15l-5.8-3 5.8-3L12 2.5Z"
                fill="currentColor"
              />
              <path
                d="m19 3 .6 2.4L22 6l-2.4.6L19 9l-.6-2.4L16 6l2.4-.6L19 3Z"
                fill="currentColor"
                opacity="0.85"
              />
            </svg>
          </span>

          <span className="supportText">
            <strong>AI Guide</strong>
            <small>Dein Assistent</small>
          </span>
        </button>
      ) : null}

      <button
        type="button"
        className="supportAction supportFeedback"
        onClick={() => openAction("feedback")}
        aria-label="Feedback öffnen"
      >
        <span className="supportIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M7.5 10.5v10H4.8a1.8 1.8 0 0 1-1.8-1.8v-6.4a1.8 1.8 0 0 1 1.8-1.8h2.7Zm3.2 10H9.5v-10l3.1-6.1c.3-.7 1.1-1 1.8-.7.8.3 1.2 1.1 1 1.9l-.7 3.2h4.1a2.2 2.2 0 0 1 2.2 2.5l-1 7a2.6 2.6 0 0 1-2.6 2.2h-6.7Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="supportText">
          <strong>Feedback</strong>
          <small>Idee oder Problem</small>
        </span>
      </button>

      <button
        type="button"
        className="supportAction supportContact"
        onClick={() => openAction("contact")}
        aria-label="WhatsApp Kontakt öffnen"
      >
        <span className="supportIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 2.8a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.9-1.2A8.8 8.8 0 1 0 12 2.8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 7.8c.3-.2.7-.1.9.2l1 1.7c.2.3.1.7-.1.9l-.7.7c.8 1.7 2 2.9 3.7 3.7l.7-.7c.3-.3.7-.3 1-.1l1.6 1c.3.2.4.6.2.9-.5.9-1.4 1.5-2.4 1.4-3.9-.4-7-3.5-7.4-7.4-.1-.9.5-1.8 1.5-2.3Z"
              fill="currentColor"
            />
          </svg>
        </span>

        <span className="supportText">
          <strong>WhatsApp</strong>
          <small>Kontakt & Telefon</small>
        </span>
      </button>

      <style jsx>{`
        .supportDock {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 9000;
          display: grid;
          grid-template-columns: 1fr;
          gap: 5px;
          width: min(230px, calc(100vw - 40px));
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              rgba(10, 27, 55, 0.98),
              rgba(4, 14, 34, 0.98)
            );
          box-shadow:
            0 20px 55px rgba(2, 8, 23, 0.42),
            0 0 0 1px rgba(255, 255, 255, 0.035) inset;
          backdrop-filter: blur(18px);
        }

        .supportAction {
          display: flex;
          min-width: 0;
          min-height: 51px;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          border: 1px solid transparent;
          border-radius: 13px;
          color: #ffffff;
          cursor: pointer;
          font: inherit;
          text-align: left;
          transition:
            transform 160ms ease,
            filter 160ms ease,
            box-shadow 160ms ease;
        }

        .supportAction:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
        }

        .supportAction:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 3px;
        }

        .supportGuide {
          border-color: rgba(165, 243, 252, 0.58);
          background:
            linear-gradient(
              120deg,
              #0891b2,
              #6d28d9,
              #d69e2e,
              #0891b2
            );
          background-size: 240% 240%;
          box-shadow:
            0 8px 28px rgba(109, 40, 217, 0.28),
            0 0 22px rgba(34, 211, 238, 0.17);
          animation: supportGuideGlow 6s ease infinite;
        }

        .supportFeedback {
          border-color: rgba(96, 165, 250, 0.5);
          background:
            linear-gradient(
              145deg,
              rgba(37, 99, 235, 0.95),
              rgba(29, 78, 216, 0.95)
            );
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.22);
        }

        .supportContact {
          border-color: rgba(134, 239, 172, 0.45);
          background:
            linear-gradient(
              145deg,
              rgba(34, 197, 94, 0.96),
              rgba(21, 128, 61, 0.96)
            );
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.2);
        }

        .supportIcon {
          display: grid;
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.14);
          box-shadow: 0 5px 14px rgba(0, 0, 0, 0.13);
        }

        .supportIcon svg {
          width: 18px;
          height: 18px;
        }

        .supportText {
          display: grid;
          min-width: 0;
          gap: 2px;
        }

        .supportText strong {
          overflow: hidden;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .supportText small {
          overflow: hidden;
          color: rgba(255, 255, 255, 0.8);
          font-size: 8px;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @keyframes supportGuideGlow {
          0%,
          100% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }
        }

        @media (max-width: 640px) {
          .supportDock {
            right: 8px;
            bottom: calc(8px + env(safe-area-inset-bottom));
            width: min(230px, calc(100vw - 16px));
            padding: 6px;
            gap: 6px;
            border-radius: 18px;
          }

          .supportAction {
            min-height: 49px;
            padding: 7px 9px;
          }

          .supportIcon {
            width: 30px;
            height: 30px;
            flex-basis: 30px;
          }

          .supportIcon svg {
            width: 20px;
            height: 20px;
          }

          .supportText strong {
            font-size: 12px;
          }

          .supportText small {
            font-size: 9px;
          }
        }

        @media print {
          .supportDock {
            display: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .supportAction,
          .supportGuide {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
}

