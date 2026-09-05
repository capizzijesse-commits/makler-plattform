"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type SessionResponse = {
  success?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
  };
};

type AccountMenuProps = {
  displayName?: string;
  subtitle?: string;
  avatarUrl?: string | null;
  compact?: boolean;
};

function getInitials(value: string) {
  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return "IA";
  }

  return parts
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

export default function AccountMenu({
  displayName,
  subtitle = "Makler-Account",
  avatarUrl,
  compact = false,
}: AccountMenuProps) {
  const [open, setOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [sessionName, setSessionName] =
    useState("");

  const [sessionEmail, setSessionEmail] =
    useState("");

  const rootRef =
    useRef<HTMLDivElement | null>(
      null
    );


  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response =
          await fetch(
            "/api/session",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as
            SessionResponse;

        if (cancelled) {
          return;
        }

        if (
          typeof data.user?.name ===
            "string" &&
          data.user.name.trim()
        ) {
          setSessionName(
            data.user.name.trim()
          );
        }

        if (
          typeof data.user?.email ===
            "string" &&
          data.user.email.trim()
        ) {
          setSessionEmail(
            data.user.email.trim()
          );
        }
      } catch {
        // Fallback-Werte bleiben sichtbar.
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);


  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const response =
        await fetch(
          "/api/logout",
          {
            method: "POST",
            credentials: "include",
          }
        );

      let data:
        | {
            success?: boolean;
            error?: string;
          }
        | undefined;

      try {
        data =
          await response.json();
      } catch {
        data = undefined;
      }

      if (
        !response.ok ||
        data?.success === false
      ) {
        throw new Error(
          data?.error ||
            "Abmelden fehlgeschlagen."
        );
      }

      localStorage.removeItem(
        "isLoggedIn"
      );
      localStorage.removeItem(
        "userName"
      );
      localStorage.removeItem(
        "userEmail"
      );
      localStorage.removeItem(
        "userRole"
      );
      localStorage.removeItem(
        "userPlan"
      );
      localStorage.removeItem(
        "loginExpiresAt"
      );

      window.location.href =
        "/login";
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Abmelden fehlgeschlagen."
      );

      setLoggingOut(false);
    }
  }


  const resolvedName =
    displayName?.trim() ||
    sessionName ||
    sessionEmail ||
    "Inserat-AI";

  const resolvedSubtitle =
    subtitle?.trim() ||
    "Makler-Account";


  return (
    <div
      ref={rootRef}
      className={
        compact
          ? "iaAccountMenuRoot compact"
          : "iaAccountMenuRoot"
      }
    >
      {open ? (
        <div
          className="iaAccountPopover"
          role="menu"
        >
          <div className="iaAccountPopoverHead">
            <strong>
              {resolvedName}
            </strong>

            <small>
              {sessionEmail ||
                resolvedSubtitle}
            </small>
          </div>

          <Link
            href="/konto"
            className="iaAccountMenuItem"
            role="menuitem"
            onClick={() =>
              setOpen(false)
            }
          >
            <span
              className="iaAccountMenuIcon"
              aria-hidden="true"
            >
              ◯
            </span>

            <span>
              Mein Konto
            </span>
          </Link>

          <Link
            href="/konto"
            className="iaAccountMenuItem"
            role="menuitem"
            onClick={() =>
              setOpen(false)
            }
          >
            <span
              className="iaAccountMenuIcon"
              aria-hidden="true"
            >
              ⚙
            </span>

            <span>
              Einstellungen
            </span>
          </Link>

          <div className="iaAccountMenuDivider" />

          <button
            type="button"
            className="iaAccountMenuItem danger"
            role="menuitem"
            disabled={loggingOut}
            onClick={
              handleLogout
            }
          >
            <span
              className="iaAccountMenuIcon"
              aria-hidden="true"
            >
              ↪
            </span>

            <span>
              {loggingOut
                ? "Wird abgemeldet …"
                : "Abmelden"}
            </span>
          </button>
        </div>
      ) : null}


      <button
        type="button"
        className="iaAccountMenuTrigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="iaAccountMenuAvatar image"
          />
        ) : (
          <span className="iaAccountMenuAvatar">
            {getInitials(
              resolvedName
            )}
          </span>
        )}

        <span className="iaAccountMenuCopy">
          <strong>
            {resolvedName}
          </strong>

          <small>
            {resolvedSubtitle}
          </small>
        </span>

        <span
          className={
            open
              ? "iaAccountMenuChevron open"
              : "iaAccountMenuChevron"
          }
          aria-hidden="true"
        >
          ›
        </span>
      </button>


      <style jsx>{`
        .iaAccountMenuRoot {
          position: relative;
          width: 100%;
          margin-top: 10px;
        }

        .iaAccountMenuTrigger {
          display: flex;
          width: 100%;
          min-height: 58px;
          align-items: center;
          gap: 9px;
          padding: 9px;
          border:
            1px solid rgba(148,163,184,.12);
          border-radius: 11px;
          background:
            rgba(255,255,255,.03);
          color: #f8fafc;
          cursor: pointer;
          text-align: left;
          transition:
            border-color .18s ease,
            background .18s ease,
            transform .18s ease;
        }

        .iaAccountMenuTrigger:hover {
          border-color:
            rgba(245,158,11,.32);
          background:
            rgba(255,255,255,.055);
        }

        .iaAccountMenuAvatar {
          display: grid;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          place-items: center;
          overflow: hidden;
          border:
            1px solid rgba(245,158,11,.28);
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #172e4d,
              #0b1d35
            );
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
        }

        .iaAccountMenuAvatar.image {
          object-fit: cover;
        }

        .iaAccountMenuCopy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
        }

        .iaAccountMenuCopy strong {
          overflow: hidden;
          color: #f8fafc;
          font-size: 10px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .iaAccountMenuCopy small {
          margin-top: 3px;
          overflow: hidden;
          color: #7890aa;
          font-size: 8px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .iaAccountMenuChevron {
          flex: 0 0 auto;
          color: #69829d;
          font-size: 18px;
          line-height: 1;
          transition:
            transform .18s ease;
        }

        .iaAccountMenuChevron.open {
          transform:
            rotate(-90deg);
        }

        .iaAccountPopover {
          position: absolute;
          right: 0;
          bottom:
            calc(100% + 9px);
          left: 0;
          z-index: 200;
          overflow: hidden;
          padding: 7px;
          border:
            1px solid rgba(148,163,184,.18);
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #0d223c 0%,
              #07182b 100%
            );
          box-shadow:
            0 22px 50px
            rgba(0,0,0,.38);
        }

        .iaAccountPopoverHead {
          display: flex;
          flex-direction: column;
          padding: 10px 10px 9px;
        }

        .iaAccountPopoverHead strong {
          overflow: hidden;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .iaAccountPopoverHead small {
          margin-top: 4px;
          overflow: hidden;
          color: #8198b1;
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .iaAccountMenuItem {
          display: flex;
          width: 100%;
          min-height: 38px;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #dbe7f3;
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
          transition:
            background .16s ease,
            color .16s ease;
        }

        .iaAccountMenuItem:hover {
          background:
            rgba(255,255,255,.06);
          color: #ffffff;
        }

        .iaAccountMenuItem.danger {
          color: #fca5a5;
        }

        .iaAccountMenuItem.danger:hover {
          background:
            rgba(239,68,68,.10);
          color: #fecaca;
        }

        .iaAccountMenuItem:disabled {
          cursor: wait;
          opacity: .55;
        }

        .iaAccountMenuIcon {
          display: grid;
          width: 21px;
          height: 21px;
          flex: 0 0 21px;
          place-items: center;
          border-radius: 6px;
          background:
            rgba(255,255,255,.055);
          font-size: 11px;
        }

        .iaAccountMenuDivider {
          height: 1px;
          margin: 6px 5px;
          background:
            rgba(148,163,184,.13);
        }
      `}</style>
    </div>
  );
}