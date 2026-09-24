"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocale } from "next-intl";

type ActivityItem = {
  id: string;
  kind: string;

  severity?:
    "info" |
    "success" |
    "warning" |
    "error";

  status?:
    string |
    null;

  listingId: string;
  listingLabel: string;
  location: string;

  title?: string;
  message?: string;
  icon?: string;

  count: number;
  uniqueVisitors: number;

  createdAt: string;
  latestAt?: string;

  unread: boolean;
  href: string;
};

type ActivityResponse = {
  success?: boolean;
  unreadCount?: number;
  items?: ActivityItem[];
  summary?: {
    views7d?: number;
    uniqueVisitors7d?: number;
  };
};

const SEEN_STORAGE_KEY =
  "inserat-ai:activity-center-seen-at";

function getCopy(locale: string) {
  const language =
    locale.split("-")[0];

  if (language === "it") {
    return {
      aria: "Notifiche",
      title: "Attività",
      subtitle:
        "Attività recenti dei tuoi annunci",
      readAll: "Segna come lette",
      allRead: "Tutto letto",
      empty:
        "Nessuna nuova attività.",
      views: (count: number) =>
        count === 1
          ? "1 nuova visualizzazione"
          : `${count} nuove visualizzazioni`,
      visitors: (count: number) =>
        count === 1
          ? "1 visitatore"
          : `${count} visitatori`,
      sevenDays: "Ultimi 7 giorni",
    };
  }

  if (language === "fr") {
    return {
      aria: "Notifications",
      title: "Activités",
      subtitle:
        "Activités récentes de vos annonces",
      readAll: "Tout marquer comme lu",
      allRead: "Tout est lu",
      empty:
        "Aucune nouvelle activité.",
      views: (count: number) =>
        count === 1
          ? "1 nouvelle vue"
          : `${count} nouvelles vues`,
      visitors: (count: number) =>
        count === 1
          ? "1 visiteur"
          : `${count} visiteurs`,
      sevenDays: "7 derniers jours",
    };
  }

  if (language === "en") {
    return {
      aria: "Notifications",
      title: "Activity",
      subtitle:
        "Recent activity on your listings",
      readAll: "Mark all as read",
      allRead: "All read",
      empty:
        "No new activity yet.",
      views: (count: number) =>
        count === 1
          ? "1 new view"
          : `${count} new views`,
      visitors: (count: number) =>
        count === 1
          ? "1 visitor"
          : `${count} visitors`,
      sevenDays: "Last 7 days",
    };
  }

  return {
    aria: "Benachrichtigungen",
    title: "Aktivitäten",
    subtitle:
      "Neue Aktivitäten zu deinen Inseraten",
    readAll:
      "Alle als gelesen",
    allRead: "Alles gelesen",
    empty:
      "Noch keine neuen Aktivitäten.",
    views: (count: number) =>
      count === 1
        ? "1 neuer Aufruf"
        : `${count} neue Aufrufe`,
    visitors: (count: number) =>
      count === 1
        ? "1 Besucher"
        : `${count} Besucher`,
    sevenDays: "Letzte 7 Tage",
  };
}

function formatActivityTime(
  value: string,
  locale: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

export default function ActivityBell() {
  const locale = useLocale();
  const copy = getCopy(locale);

  const rootRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [items, setItems] =
    useState<ActivityItem[]>([]);

  const [
    views7d,
    setViews7d,
  ] = useState(0);

  const [
    uniqueVisitors7d,
    setUniqueVisitors7d,
  ] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        const seenAt =
          localStorage.getItem(
            SEEN_STORAGE_KEY
          );

        const query =
          seenAt
            ? `?mode=all&since=${encodeURIComponent(
                seenAt
              )}`
            : "?mode=all";

        const response =
          await fetch(
            `/api/activity-center${query}`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          if (!cancelled) {
            setLoading(false);
          }

          return;
        }

        const data =
          (await response.json()) as
            ActivityResponse;

        if (
          cancelled ||
          !data.success
        ) {
          return;
        }

        setUnreadCount(
          Math.max(
            0,
            Number(
              data.unreadCount ?? 0
            )
          )
        );

        setItems(
          Array.isArray(data.items)
            ? data.items
            : []
        );

        setViews7d(
          Math.max(
            0,
            Number(
              data.summary
                ?.views7d ?? 0
            )
          )
        );

        setUniqueVisitors7d(
          Math.max(
            0,
            Number(
              data.summary
                ?.uniqueVisitors7d ??
                0
            )
          )
        );
      } catch (error) {
        console.warn(
          "ACTIVITY CENTER LOAD ERROR:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadActivity();

    const timer =
      window.setInterval(
        () => {
          void loadActivity();
        },
        60 * 1000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        timer
      );
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(
      event: PointerEvent
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
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  function markAllRead() {
    localStorage.setItem(
      SEEN_STORAGE_KEY,
      new Date().toISOString()
    );

    setUnreadCount(0);

    setItems((current) =>
      current.map((item) => ({
        ...item,
        unread: false,
      }))
    );
  }

  const badgeLabel =
    unreadCount > 99
      ? "99+"
      : String(unreadCount);

  return (
    <div
      ref={rootRef}
      className="iaActivityRoot"
    >
      <button
        type="button"
        className="iaActivityBell"
        aria-label={copy.aria}
        aria-expanded={open}
        aria-controls="ia-activity-panel"
        title={copy.aria}
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 21h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        {unreadCount > 0 && (
          <span
            className="iaActivityBadge"
            aria-label={`${unreadCount}`}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <section
          id="ia-activity-panel"
          className="iaActivityPanel"
          aria-label={copy.title}
        >
          <header className="iaActivityHeader">
            <div>
              <span className="iaActivityEyebrow">
                INSERAT-AI
              </span>

              <h2>
                {copy.title}
              </h2>

              <p>
                {copy.subtitle}
              </p>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                className="iaActivityReadButton"
                onClick={markAllRead}
              >
                {copy.readAll}
              </button>
            ) : (
              <span className="iaActivityReadState">
                {copy.allRead}
              </span>
            )}
          </header>

          <div className="iaActivitySummary">
            <div>
              <span>
                {copy.sevenDays}
              </span>

              <strong>
                {views7d}
              </strong>

              <small>
                {copy.views(
                  views7d
                )}
              </small>
            </div>

            <div>
              <span>
                Besucher
              </span>

              <strong>
                {uniqueVisitors7d}
              </strong>

              <small>
                {copy.visitors(
                  uniqueVisitors7d
                )}
              </small>
            </div>
          </div>

          <div className="iaActivityList">
            {loading ? (
              <div className="iaActivityEmpty">
                …
              </div>
            ) : items.length === 0 ? (
              <div className="iaActivityEmpty">
                {copy.empty}
              </div>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`iaActivityItem ${
                    item.unread
                      ? "iaActivityItemUnread"
                      : ""
                  }`}
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  <span
                    className="iaActivityIcon"
                    aria-hidden="true"
                  >
                    {item.icon ?? "\u2022"}
                  </span>

                  <span className="iaActivityText">
                    <strong>
                      {item.kind === "views"
                        ? copy.views(
                            item.count
                          )
                        : item.title ??
                          "Aktivität"}
                    </strong>

                    <span>
                      {item.kind === "views"
                        ? item.listingLabel
                        : item.message ??
                          item.listingLabel}
                    </span>

                    <small>
                      {item.kind === "views"
                        ? copy.visitors(
                            item.uniqueVisitors
                          )
                        : item.listingLabel}

                      {item.location
                        ? ` · ${item.location}`
                        : ""}
                    </small>
                  </span>

                  <time
                    dateTime={
                      item.createdAt
                    }
                  >
                    {formatActivityTime(
                      item.createdAt,
                      locale
                    )}
                  </time>
                </Link>
              ))
            )}
          </div>

          <footer className="iaActivityFooter">
            <span>
              Aufrufe
            </span>

            <span>
              Veröffentlichungen
            </span>

            <span>
              Fehler & Status
            </span>
          </footer>
        </section>
      )}

      <style jsx>{`
        .iaActivityRoot {
          position: relative;
          flex: 0 0 auto;
        }

        .iaActivityBell {
          position: relative;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          padding: 0;
          border:
            1px solid
            rgba(251, 191, 36, 0.25);
          border-radius: 13px;
          background:
            rgba(15, 23, 42, 0.62);
          color: #f8fafc;
          cursor: pointer;
          box-shadow:
            0 8px 24px
            rgba(0, 0, 0, 0.14);
        }

        .iaActivityBell:hover {
          border-color:
            rgba(251, 191, 36, 0.55);
          background:
            rgba(30, 41, 59, 0.88);
        }

        .iaActivityBadge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          display: grid;
          place-items: center;
          border:
            2px solid #071126;
          border-radius: 999px;
          background: #f59e0b;
          color: #071126;
          font-size: 9px;
          font-weight: 950;
          line-height: 1;
        }

        .iaActivityPanel {
          position: absolute;
          z-index: 500;
          top: calc(100% + 12px);
          right: 0;
          width:
            min(
              390px,
              calc(100vw - 24px)
            );
          overflow: hidden;
          border:
            1px solid
            rgba(148, 163, 184, 0.18);
          border-radius: 20px;
          background:
            linear-gradient(
              155deg,
              rgba(
                8,
                18,
                40,
                0.99
              ),
              rgba(
                3,
                10,
                26,
                0.99
              )
            );
          box-shadow:
            0 28px 80px
            rgba(0, 0, 0, 0.5);
          color: #f8fafc;
        }

        .iaActivityHeader {
          display: flex;
          align-items: flex-start;
          justify-content:
            space-between;
          gap: 16px;
          padding: 18px;
          border-bottom:
            1px solid
            rgba(148, 163, 184, 0.12);
        }

        .iaActivityEyebrow {
          display: block;
          color: #fbbf24;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.14em;
        }

        .iaActivityHeader h2 {
          margin: 4px 0 2px;
          color: #fff;
          font-size: 19px;
          line-height: 1.1;
        }

        .iaActivityHeader p {
          margin: 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.4;
        }

        .iaActivityReadButton {
          flex: 0 0 auto;
          padding: 7px 9px;
          border:
            1px solid
            rgba(251, 191, 36, 0.26);
          border-radius: 9px;
          background:
            rgba(251, 191, 36, 0.08);
          color: #fcd34d;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .iaActivityReadState {
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
        }

        .iaActivitySummary {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 12px 14px;
        }

        .iaActivitySummary > div {
          padding: 11px;
          display: grid;
          gap: 2px;
          border:
            1px solid
            rgba(148, 163, 184, 0.12);
          border-radius: 12px;
          background:
            rgba(15, 23, 42, 0.55);
        }

        .iaActivitySummary span,
        .iaActivitySummary small {
          color: #94a3b8;
          font-size: 9px;
        }

        .iaActivitySummary strong {
          color: #fff;
          font-size: 19px;
          line-height: 1.1;
        }

        .iaActivityList {
          max-height: 360px;
          overflow-y: auto;
          padding: 0 10px 10px;
        }

        .iaActivityItem {
          position: relative;
          display: grid;
          grid-template-columns:
            34px
            minmax(0, 1fr)
            auto;
          gap: 9px;
          align-items: center;
          padding: 11px 9px;
          border-radius: 12px;
          color: inherit;
          text-decoration: none;
        }

        .iaActivityItem:hover {
          background:
            rgba(148, 163, 184, 0.08);
        }

        .iaActivityItemUnread {
          background:
            rgba(251, 191, 36, 0.07);
        }

        .iaActivityItemUnread::before {
          content: "";
          position: absolute;
          left: 1px;
          width: 4px;
          height: 24px;
          border-radius: 999px;
          background: #fbbf24;
        }

        .iaActivityIcon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background:
            rgba(56, 189, 248, 0.1);
          font-size: 15px;
        }

        .iaActivityText {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .iaActivityText strong {
          color: #f8fafc;
          font-size: 11px;
        }

        .iaActivityText > span {
          overflow: hidden;
          color: #cbd5e1;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .iaActivityText small {
          overflow: hidden;
          color: #64748b;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .iaActivityItem time {
          color: #64748b;
          font-size: 8px;
          white-space: nowrap;
        }

        .iaActivityEmpty {
          padding: 28px 16px;
          color: #94a3b8;
          font-size: 11px;
          text-align: center;
        }

        .iaActivityFooter {
          display: flex;
          gap: 12px;
          padding: 11px 16px;
          border-top:
            1px solid
            rgba(148, 163, 184, 0.1);
          color: #64748b;
          font-size: 8px;
          font-weight: 800;
        }

        @media (
          max-width: 700px
        ) {
          .iaActivityPanel {
            position: fixed;
            top: 72px;
            right: 10px;
            left: 10px;
            width: auto;
            max-height:
              calc(100vh - 150px);
          }

          .iaActivityList {
            max-height:
              calc(100vh - 390px);
          }
        }
      `}</style>
    </div>
  );
}
