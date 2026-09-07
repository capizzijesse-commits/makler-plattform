"use client";

import { useEffect, useState } from "react";



import { usePathname } from "next/navigation";
import PrivacyModeButton from "@/components/PrivacyModeButton";


type SupportAction =
  | "feedback"
  | "contact"
  | "guide"
  | "chat";

  
function isGuidePage(pathname: string): boolean {
  return (
    pathname !== "/impressum" &&
    pathname !== "/datenschutz"
  );
}

function sendWindowEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

export default function SupportActionDock() {
  const pathname = usePathname() || "/";
  const showGuide = isGuidePage(pathname);

  const [isDockOpen, setIsDockOpen] =
    useState(false);

  const [unreadCount, setUnreadCount] =
    useState(0);

  async function refreshUnreadCount() {
    try {
      const response =
        await fetch(
          "/api/makler-chat?summary=1",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );

      if (!response.ok) {
        return;
      }

      const data: {
        unreadCount?: number;
      } =
        await response.json();

      setUnreadCount(
        typeof data.unreadCount ===
          "number"
          ? Math.max(
              0,
              data.unreadCount
            )
          : 0
      );
    } catch {
      // Auf öffentlichen Seiten oder
      // ohne Login bleibt der Badge leer.
    }
  }

  useEffect(() => {
    void refreshUnreadCount();

    const interval =
      window.setInterval(
        () => {
          void refreshUnreadCount();
        },
        15000
      );

    const refresh = () => {
      void refreshUnreadCount();
    };

    window.addEventListener(
      "inserat-ai:chat-read",
      refresh
    );

    window.addEventListener(
      "inserat-ai:chat-message",
      refresh
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "inserat-ai:chat-read",
        refresh
      );

      window.removeEventListener(
        "inserat-ai:chat-message",
        refresh
      );
    };
  }, []);

  function openAction(action: SupportAction) {
    sendWindowEvent("inserat-ai:close-feedback");
    sendWindowEvent("inserat-ai:close-contact");
    sendWindowEvent("inserat-ai:close-guide");
    sendWindowEvent("inserat-ai:close-chat");

    setIsDockOpen(false);

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
      className={
        isDockOpen
          ? "supportDock open"
          : "supportDock"
      }
      aria-label="Inserat-AI Hilfe und Kontakt"
    >
      <div className="supportGrid">
        <button
          type="button"
          className="supportAction supportChat"
          data-unread={
            unreadCount > 0
              ? Math.min(
                  unreadCount,
                  99
                )
              : undefined
          }
        onClick={() => {
          setIsDockOpen(false);

          window.setTimeout(
            () => {
              window.dispatchEvent(
                new Event(
                  "inserat-ai:open-chat"
                )
              );
            },
            40
          );
        }}
        aria-label="Inserat-AI Chat öffnen"
      >
        <span
          className="supportIcon"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.8A2.5 2.5 0 0 1 4 13.5v-8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 8h8M8 11.5h5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <span className="supportText">
          <strong>
            Inserat-AI Chat
          </strong>
          <small>
            Makler-Chat & AI
          </small>
        </span>
      </button>
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

      </div>

      <button
        type="button"
        className="supportLauncher"
        data-unread={
          unreadCount > 0
            ? Math.min(
                unreadCount,
                99
              )
            : undefined
        }
        onClick={() =>
          setIsDockOpen(
            (current) => !current
          )
        }
        aria-expanded={isDockOpen}
        aria-label={
          isDockOpen
            ? "Inserat-AI Menü schließen"
            : "Inserat-AI Chat und Hilfe öffnen"
        }
      >
        <span
          className="supportLauncherIcon"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24">
            <rect
              x="4"
              y="4"
              width="6"
              height="6"
              rx="1.5"
            />
            <rect
              x="14"
              y="4"
              width="6"
              height="6"
              rx="1.5"
            />
            <rect
              x="4"
              y="14"
              width="6"
              height="6"
              rx="1.5"
            />
            <rect
              x="14"
              y="14"
              width="6"
              height="6"
              rx="1.5"
            />
          </svg>
        </span>

        <span className="supportLauncherText">
          {isDockOpen
            ? "Schließen"
            : "Inserat-AI"}
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

        .supportChat {
          border-color:
            rgba(251, 191, 36, 0.58);
          background:
            linear-gradient(
              145deg,
              #7c3aed,
              #4338ca,
              #b45309
            );
          box-shadow:
            0 8px 28px
              rgba(124, 58, 237, 0.25),
            0 0 22px
              rgba(251, 191, 36, 0.10);
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
    right: 10px;
    bottom: calc(
      10px + env(safe-area-inset-bottom)
    );

    display: flex;
    grid-template-columns: none;
    width: auto;
    max-width: calc(100vw - 20px);
    gap: 6px;
    padding: 5px;
    border-radius: 999px;
  }

  .supportAction {
    width: 48px;
    min-width: 48px;
    min-height: 48px;
    flex: 0 0 48px;
    justify-content: center;
    gap: 0;
    padding: 0;
    border-radius: 999px;
  }

  .supportGuide {
    width: auto;
    min-width: 116px;
    flex-basis: auto;
    gap: 8px;
    padding: 0 13px 0 8px;
  }

  .supportIcon {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    border-radius: 50%;
  }

  .supportIcon svg {
    width: 19px;
    height: 19px;
  }

  .supportChat .supportText,
  .supportFeedback .supportText,
  .supportContact .supportText {
    display: none;
  }

  .supportGuide .supportText {
    display: grid;
  }

  .supportGuide .supportText strong {
    font-size: 11px;
  }

  .supportGuide .supportText small {
    display: none;
  }
}


        /* INSERAT_AI_SUPPORT_POPUP_GRID_V1 */

        .supportDock {
          right: 20px !important;
          bottom: 20px !important;
          display: block !important;
          width: auto !important;
          max-width: none !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .supportGrid {
          position: absolute;
          right: 0;
          bottom: 66px;

          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 8px;

          width: 348px;
          padding: 9px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.13
            );

          border-radius: 22px;

          background:
            linear-gradient(
              150deg,
              rgba(
                8,
                24,
                48,
                0.985
              ),
              rgba(
                3,
                13,
                31,
                0.99
              )
            );

          box-shadow:
            0 24px 70px
              rgba(
                2,
                8,
                23,
                0.48
              ),
            0 0 0 1px
              rgba(
                255,
                255,
                255,
                0.025
              )
              inset;

          backdrop-filter:
            blur(20px);

          opacity: 0;
          visibility: hidden;
          pointer-events: none;

          transform:
            translateY(12px)
            scale(0.96);

          transform-origin:
            right bottom;

          transition:
            opacity 170ms ease,
            transform 170ms ease,
            visibility 170ms ease;
        }

        .supportDock.open
        .supportGrid {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;

          transform:
            translateY(0)
            scale(1);
        }

        .supportGrid
        .supportAction {
          width: auto !important;
          min-width: 0 !important;
          min-height: 78px !important;

          align-items: center;
          justify-content:
            flex-start;

          gap: 10px;

          padding:
            11px 12px !important;

          border-radius:
            16px !important;
        }

        .supportGrid
        .supportIcon {
          width: 36px;
          height: 36px;
          flex:
            0 0 36px;
        }

        .supportGrid
        .supportText {
          display: grid !important;
        }

        .supportGrid
        .supportText strong {
          font-size: 11px;
        }

        .supportGrid
        .supportText small {
          display: block !important;
          margin-top: 2px;
          font-size: 8px;
        }

        .supportLauncher {
          position: relative;

          display: flex;
          width: 148px;
          height: 56px;

          align-items: center;
          justify-content:
            flex-start;

          gap: 9px;

          padding: 0 15px 0 8px;

          border:
            1px solid
            rgba(
              251,
              191,
              36,
              0.52
            );

          border-radius: 999px;

          background:
            linear-gradient(
              120deg,
              #061a34,
              #132f54,
              #83520b
            );

          color: #ffffff;

          cursor: pointer;

          box-shadow:
            0 15px 40px
              rgba(
                2,
                8,
                23,
                0.36
              ),
            0 0 24px
              rgba(
                251,
                191,
                36,
                0.10
              );

          font: inherit;

          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .supportLauncher:hover {
          transform:
            translateY(-2px);

          border-color:
            rgba(
              251,
              191,
              36,
              0.80
            );

          box-shadow:
            0 18px 46px
              rgba(
                2,
                8,
                23,
                0.42
              ),
            0 0 30px
              rgba(
                251,
                191,
                36,
                0.15
              );
        }

        .supportDock.open
        .supportLauncher {
          border-color:
            rgba(
              251,
              191,
              36,
              0.88
            );

          background:
            linear-gradient(
              120deg,
              #101d37,
              #49320d
            );
        }

        .supportLauncherIcon {
          display: grid;

          width: 40px;
          height: 40px;

          flex:
            0 0 40px;

          place-items: center;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.19
            );

          border-radius: 50%;

          background:
            linear-gradient(
              145deg,
              #fbbf24,
              #f59e0b
            );

          color: #071426;

          box-shadow:
            0 6px 18px
              rgba(
                245,
                158,
                11,
                0.22
              );
        }

        .supportLauncherIcon svg {
          width: 20px;
          height: 20px;

          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
        }

        .supportLauncherText {
          overflow: hidden;

          font-size: 11px;
          font-weight: 950;

          text-overflow:
            ellipsis;

          white-space: nowrap;
        }


        @media (
          max-width: 640px
        ) {

          .supportDock {
            right: 10px !important;

            bottom:
              calc(
                10px +
                env(
                  safe-area-inset-bottom
                )
              )
              !important;
          }

          .supportLauncher {
            width: 56px;
            height: 56px;

            justify-content:
              center;

            padding: 0;

            border-radius: 50%;
          }

          .supportLauncherIcon {
            width: 42px;
            height: 42px;

            flex:
              0 0 42px;
          }

          .supportLauncherText {
            display: none;
          }

          .supportGrid {
            right: 0;
            bottom: 66px;

            width:
              min(
                318px,
                calc(
                  100vw - 20px
                )
              );

            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );

            gap: 7px;
            padding: 8px;
          }

          .supportGrid
          .supportAction,
          .supportGrid
          .supportGuide,
          .supportGrid
          .supportChat {
            width: auto !important;
            min-width: 0 !important;
            min-height: 72px !important;

            flex:
              1 1 auto !important;

            justify-content:
              flex-start !important;

            gap: 8px !important;

            padding:
              9px !important;

            border-radius:
              14px !important;
          }

          .supportGrid
          .supportFeedback
          .supportText,
          .supportGrid
          .supportContact
          .supportText,
          .supportGrid
          .supportGuide
          .supportText,
          .supportGrid
          .supportChat
          .supportText {
            display:
              grid !important;
          }

          .supportGrid
          .supportText strong {
            font-size: 9px;
          }

          .supportGrid
          .supportText small {
            display:
              block !important;

            font-size: 7px;
          }

          .supportGrid
          .supportIcon {
            width: 32px;
            height: 32px;

            flex:
              0 0 32px;
          }
        }

        /* INSERAT_AI_CHAT_UNREAD_BADGE_V1 */

        .supportChat,
        .supportLauncher {
          position: relative;
        }

        .supportChat[data-unread]::after,
        .supportLauncher[data-unread]::after {
          content: attr(data-unread);

          position: absolute;
          top: -6px;
          right: -6px;

          display: grid;

          min-width: 22px;
          height: 22px;

          place-items: center;

          padding: 0 6px;

          border: 2px solid #071426;
          border-radius: 999px;

          background: #ef4444;
          color: #ffffff;

          box-shadow:
            0 7px 18px
              rgba(239, 68, 68, 0.34);

          font-size: 9px;
          font-weight: 950;
          line-height: 1;
        }
        @media print {
          .supportDock {
            display: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .supportAction,
          .supportChat {
          border-color:
            rgba(251, 191, 36, 0.58);
          background:
            linear-gradient(
              145deg,
              #7c3aed,
              #4338ca,
              #b45309
            );
          box-shadow:
            0 8px 28px
              rgba(124, 58, 237, 0.25),
            0 0 22px
              rgba(251, 191, 36, 0.10);
        }
        .supportGuide {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
}

