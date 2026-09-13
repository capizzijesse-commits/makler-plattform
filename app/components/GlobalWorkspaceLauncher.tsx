"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import {
  usePathname,
} from "next/navigation";

type WorkspaceItem = {
  key:
    | "today"
    | "connect"
    | "maps"
    | "marketing"
    | "finance";
  label: string;
  href: string;
};

const ITEMS: WorkspaceItem[] = [
  {
    key: "today",
    label: "Heute",
    href: "/cockpit",
  },
  {
    key: "maps",
    label: "Maps",
    href: "/map",
  },
  {
    key: "marketing",
    label: "Marketing Hub",
    href: "/marketing-hub",
  },
  {
    key: "finance",
    label: "Finanzierung",
    href: "/finanzierung",
  },
];

function WorkspaceIcon({
  name,
}: {
  name: WorkspaceItem["key"];
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "today" && (
        <>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9.5 20v-6h5v6" />
        </>
      )}

      {name === "connect" && (
        <>
          <circle
            cx="8"
            cy="8"
            r="2.5"
          />
          <circle
            cx="16"
            cy="8"
            r="2.5"
          />
          <path d="M3.5 18c.5-3.2 2.2-5 4.5-5s4 1.8 4.5 5" />
          <path d="M11.5 18c.5-3.2 2.2-5 4.5-5s4 1.8 4.5 5" />
        </>
      )}

      {name === "maps" && (
        <>
          <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
        </>
      )}

      {name === "finance" && (
        <>
          <path d="M4 7h16" />
          <path d="M6 7V5h12v2" />
          <path d="M6 11h12" />
          <path d="M7 11v8" />
          <path d="M17 11v8" />
          <path d="M4 19h16" />
        </>
      )}

      {name === "marketing" && (
        <>
          <path d="M4 20V10" />
          <path d="M10 20V5" />
          <path d="M16 20v-7" />
          <path d="M22 20V3" />
        </>
      )}
    </svg>
  );
}

export default function GlobalWorkspaceLauncher() {
  const pathname =
    usePathname() || "/";

  const [open, setOpen] =
    useState(false);

  useEffect(() => {
    const openWorkspace = () => {
      setOpen(true);
    };

    const closeWorkspace = () => {
      setOpen(false);
    };

    window.addEventListener(
      "inserat-ai:open-workspace",
      openWorkspace
    );

    window.addEventListener(
      "inserat-ai:close-workspace",
      closeWorkspace
    );

    return () => {
      window.removeEventListener(
        "inserat-ai:open-workspace",
        openWorkspace
      );

      window.removeEventListener(
        "inserat-ai:close-workspace",
        closeWorkspace
      );
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  function isActive(
    item: WorkspaceItem
  ) {
    if (
      item.key === "today"
    ) {
      return pathname === "/cockpit";
    }

    if (item.key === "maps") {
      return (
        pathname === "/map" ||
        pathname.startsWith("/map/")
      );
    }

    if (item.key === "marketing") {
      return pathname.startsWith(
        "/marketing-hub"
      );
    }

    return false;
  }

  function openConnect(
    event:
      MouseEvent<HTMLAnchorElement>
  ) {
    event.preventDefault();

    setOpen(false);

    window.dispatchEvent(
      new Event(
        "inserat-ai:open-chat"
      )
    );
  }

  const showFloatingLauncher =
    pathname === "/map" ||
    pathname.startsWith("/map/");

  return (
    <>
      <button
        type="button"
        style={
          showFloatingLauncher
            ? undefined
            : { display: "none" }
        }
        className={
          open
            ? "iaGlobalLauncher active"
            : "iaGlobalLauncher"
        }
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
        aria-expanded={open}
        aria-controls="ia-global-workspace"
        aria-label="Inserat-AI Workspace öffnen"
      >
        <span className="iaLauncherMark">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h10" />
            <circle
              cx="18"
              cy="17"
              r="2"
            />
          </svg>
        </span>

        <span className="iaLauncherText">
          Workspace
        </span>

        <span
          className={
            open
              ? "iaLauncherChevron open"
              : "iaLauncherChevron"
          }
        >
          ›
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="iaWorkspaceBackdrop"
            aria-label="Workspace schließen"
            onClick={() =>
              setOpen(false)
            }
          />

          <aside
            id="ia-global-workspace"
            className="iaWorkspacePanel"
            aria-label="Inserat-AI Workspace"
          >
            <div className="iaWorkspacePanelHead">
              <div>
                <span className="iaWorkspaceEyebrow">
                  INSERAT-AI
                </span>

                <strong>
                  Dein Workspace
                </strong>

                <small>
                  Alles Wichtige mit einem Klick.
                </small>
              </div>

              <button
                type="button"
                className="iaWorkspaceClose"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Workspace schließen"
              >
                ×
              </button>
            </div>

            <nav className="iaWorkspacePanelNav">
              {ITEMS.map(
                (item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={
                      item.key ===
                      "connect"
                        ? openConnect
                        : () =>
                            setOpen(
                              false
                            )
                    }
                    className={
                      isActive(item)
                        ? "iaWorkspacePanelItem active"
                        : "iaWorkspacePanelItem"
                    }
                  >
                    <span className="iaWorkspacePanelIcon">
                      <WorkspaceIcon
                        name={
                          item.key
                        }
                      />
                    </span>

                    <span className="iaWorkspacePanelCopy">
                      <strong>
                        {item.label}
                      </strong>

                      <small>
                        {item.key ===
                        "today"
                          ? "Dein Tagesüberblick"
                          : item.key ===
                            "connect"
                          ? "Nachrichten & Kontakte"
                          : item.key ===
                            "maps"
                          ? "Objekte auf der Karte"
                          : item.key ===
                            "finance"
                          ? "Finanzierung & Beratung"
                          : "Vermarktung steuern"}
                      </small>
                    </span>

                    <span className="iaWorkspacePanelArrow">
                      →
                    </span>
                  </Link>
                )
              )}
            </nav>

            <div className="iaWorkspacePanelFoot">
              <span className="iaWorkspaceStatusDot" />
              Workspace bereit
            </div>
          </aside>
        </>
      ) : null}

      <style jsx>{`
        .iaGlobalLauncher {
          position: fixed;
          z-index: 240;
          top: 206px;
          left: 430px;
          right: auto;
          bottom: auto;
          display: flex;
          width: 148px;
          min-height: 48px;
          align-items: center;
          justify-content:
            flex-start;
          gap: 9px;
          padding:
            0 12px 0 10px;
          overflow: hidden;
          transform:
            none;
          border:
            1px solid
            rgba(245,158,11,.38);
          border-left:
            1px solid
            rgba(245,158,11,.38);
          border-radius:
            16px;
          background:
            linear-gradient(
              135deg,
              rgba(6,22,44,.98),
              rgba(10,34,61,.98)
            );
          color: #f8fafc;
          box-shadow:
            8px 12px 32px
            rgba(2,8,23,.24);
          cursor: pointer;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease;
        }

        .iaGlobalLauncher:hover {
          transform:
            translateX(2px);
          border-color:
            rgba(245,158,11,.68);
          background:
            linear-gradient(
              135deg,
              rgba(8,28,53,.99),
              rgba(13,43,73,.99)
            );
          box-shadow:
            10px 16px 36px
            rgba(2,8,23,.3);
        }

        .iaGlobalLauncher.active {
          z-index: 255;
          border-color:
            rgba(103,232,249,.55);
          box-shadow:
            10px 16px 38px
            rgba(2,8,23,.32);
        }

        .iaLauncherMark {
          display: grid;
          width: 26px;
          height: 26px;
          place-items: center;
          border-radius: 8px;
          background:
            rgba(245,158,11,.12);
          color: #fbbf24;
        }

        .iaLauncherMark svg {
          width: 17px;
          height: 17px;
        }

        .iaLauncherText {
          overflow: hidden;
          opacity: 1;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -.01em;
        }

        .iaLauncherChevron {
          margin-left: auto;
          color: #67e8f9;
          font-size: 20px;
          font-weight: 900;
          line-height: 1;
          opacity: .95;
          transform:
            rotate(0deg);
          transition:
            transform 160ms ease,
            opacity 160ms ease;
        }

        .iaGlobalLauncher:hover
        .iaLauncherChevron {
          opacity: 1;
        }

        .iaLauncherChevron.open {
          transform:
            rotate(180deg);
        }

        .iaWorkspaceBackdrop {
          position: fixed;
          z-index: 245;
          inset: 0;
          border: 0;
          background:
            rgba(2,8,23,.22);
          backdrop-filter:
            blur(2px);
        }

        .iaWorkspacePanel {
          position: fixed;
          z-index: 250;
          top: 264px;
          left: 430px;
          right: auto;
          bottom: auto;
          width:
            min(360px, calc(100vw - 440px));
          max-height:
            calc(100vh - 120px);
          overflow-y: auto;
          transform:
            none;
          border:
            1px solid
            rgba(148,163,184,.18);
          border-radius: 20px;
          background:
            linear-gradient(
              180deg,
              #07192f 0%,
              #06162c 100%
            );
          color: #f8fafc;
          box-shadow:
            0 28px 70px
            rgba(2,8,23,.36);
        }

        .iaWorkspacePanelHead {
          display: flex;
          align-items: flex-start;
          justify-content:
            space-between;
          gap: 16px;
          padding:
            22px 20px 18px;
          border-bottom:
            1px solid
            rgba(148,163,184,.12);
        }

        .iaWorkspacePanelHead > div {
          display: flex;
          flex-direction: column;
        }

        .iaWorkspaceEyebrow {
          margin-bottom: 5px;
          color: #fbbf24;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .iaWorkspacePanelHead strong {
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -.025em;
        }

        .iaWorkspacePanelHead small {
          margin-top: 5px;
          color: #8fa4bd;
          font-size: 11px;
        }

        .iaWorkspaceClose {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          border:
            1px solid
            rgba(148,163,184,.15);
          border-radius: 10px;
          background:
            rgba(255,255,255,.045);
          color: #cbd5e1;
          font-size: 21px;
          cursor: pointer;
        }

        .iaWorkspacePanelNav {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 12px;
        }

        .iaWorkspacePanelItem {
          display: flex;
          min-height: 62px;
          align-items: center;
          gap: 12px;
          padding: 9px 11px;
          border:
            1px solid transparent;
          border-radius: 13px;
          color: #d7e2ee;
          text-decoration: none;
          transition:
            background 150ms ease,
            border-color 150ms ease;
        }

        .iaWorkspacePanelItem:hover {
          border-color:
            rgba(103,232,249,.12);
          background:
            rgba(35,73,111,.28);
        }

        .iaWorkspacePanelItem.active {
          border-color:
            rgba(245,158,11,.25);
          background:
            linear-gradient(
              90deg,
              rgba(245,158,11,.11),
              rgba(14,54,88,.28)
            );
        }

        .iaWorkspacePanelIcon {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          flex: 0 0 38px;
          border-radius: 11px;
          background:
            rgba(103,232,249,.07);
          color: #67e8f9;
        }

        .iaWorkspacePanelItem.active
        .iaWorkspacePanelIcon {
          background:
            rgba(245,158,11,.12);
          color: #fbbf24;
        }

        .iaWorkspacePanelIcon svg {
          width: 20px;
          height: 20px;
        }

        .iaWorkspacePanelCopy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
        }

        .iaWorkspacePanelCopy strong {
          font-size: 12px;
          font-weight: 800;
        }

        .iaWorkspacePanelCopy small {
          margin-top: 3px;
          color: #8297ad;
          font-size: 10px;
        }

        .iaWorkspacePanelArrow {
          color: #5f7993;
          font-size: 15px;
        }

        .iaWorkspacePanelFoot {
          display: flex;
          min-height: 45px;
          align-items: center;
          gap: 8px;
          padding: 0 20px;
          border-top:
            1px solid
            rgba(148,163,184,.1);
          color: #8095aa;
          font-size: 10px;
        }

        .iaWorkspaceStatusDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #67e8f9;
          box-shadow:
            0 0 12px
            rgba(103,232,249,.7);
        }

        @media (
          max-width: 720px
        ) {
          .iaGlobalLauncher {
            top: auto;
            left: 12px;
            right: auto;
            bottom: 92px;
            width: 48px;
            min-height: 48px;
            justify-content: center;
            padding: 0;
            transform: none;
            border:
              1px solid
              rgba(245,158,11,.38);
            border-radius: 50%;
          }

          .iaGlobalLauncher:hover,
          .iaGlobalLauncher.active {
            width: 48px;
            justify-content: center;
            padding: 0;
            transform:
              translateY(-1px);
          }

          .iaWorkspacePanel {
            top: auto;
            right: 10px;
            left: 10px;
            bottom: 150px;
            width: auto;
            max-height:
              calc(100vh - 175px);
            overflow-y: auto;
            transform: none;
          }

          .iaLauncherText,
          .iaLauncherChevron {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
