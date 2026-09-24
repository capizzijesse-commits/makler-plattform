"use client";

import {
  useEffect,
  useState,
} from "react";

type ActivityItem = {
  id: string;
  kind: string;

  severity?:
    | "info"
    | "success"
    | "warning"
    | "error";

  status?:
    string |
    null;

  listingId: string;
  listingLabel: string;
  location: string;

  title?: string;
  message?: string;
  icon?: string;

  createdAt: string;
  unread: boolean;
  href: string;
};

type ActivityResponse = {
  success?: boolean;

  items?:
    ActivityItem[];

  summary?: {
    views7d?: number;

    uniqueVisitors7d?: number;

    operationalEvents7d?: number;

    actionRequired7d?: number;
  };
};

type Props = {
  listingId: string;
};

function formatTime(
  value: string
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
    "de-CH",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function getSeverityColor(
  severity:
    ActivityItem["severity"]
): string {
  if (
    severity ===
    "success"
  ) {
    return "#86efac";
  }

  if (
    severity ===
    "warning"
  ) {
    return "#fde68a";
  }

  if (
    severity ===
    "error"
  ) {
    return "#fca5a5";
  }

  return "#7dd3fc";
}

export default function ObjectActivityTimeline(
  props: Props
) {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    items,
    setItems,
  ] =
    useState<ActivityItem[]>(
      []
    );

  const [
    actionRequired,
    setActionRequired,
  ] =
    useState(0);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams({
            mode: "all",

            listingId:
              props.listingId,
          });

        const response =
          await fetch(
            `/api/activity-center?${params.toString()}`,
            {
              method: "GET",

              credentials:
                "include",

              cache:
                "no-store",
            }
          );

        const data =
          (
            await response.json()
          ) as
            ActivityResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            "Aktivitäten konnten nicht geladen werden."
          );
        }

        if (cancelled) {
          return;
        }

        setItems(
          Array.isArray(
            data.items
          )
            ? data.items
                .filter(
                  (item) =>
                    item.listingId ===
                    props.listingId
                )
                .slice(
                  0,
                  10
                )
            : []
        );

        setActionRequired(
          Math.max(
            0,
            Number(
              data.summary
                ?.actionRequired7d ??
              0
            )
          )
        );
      }
      catch (loadError) {
        console.warn(
          "OBJECT ACTIVITY LOAD ERROR:",
          loadError
        );

        if (!cancelled) {
          setError(
            "Aktivitäten konnten nicht geladen werden."
          );
        }
      }
      finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    const timer =
      window.setInterval(
        () => {
          void load();
        },
        60 * 1000
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        timer
      );
    };
  }, [
    props.listingId,
  ]);


  return (
    <div
      style={{
        marginTop: "14px",

        paddingTop: "14px",

        borderTop:
          "1px solid rgba(255,255,255,.07)",
      }}
    >
      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",

          gap: "10px",

          marginBottom:
            "10px",
        }}
      >
        <div>
          <div
            style={{
              color: "#fbbf24",

              fontSize: "9px",

              fontWeight: 950,

              letterSpacing:
                ".12em",
            }}
          >
            ACTIVITY CENTER
          </div>

          <strong
            style={{
              display: "block",

              marginTop: "3px",

              color: "#f8fafc",

              fontSize: "13px",
            }}
          >
            Objekt-Aktivitäten
          </strong>
        </div>

        {actionRequired >
          0 && (
          <span
            style={{
              padding:
                "5px 8px",

              border:
                "1px solid rgba(248,113,113,.28)",

              borderRadius:
                "999px",

              background:
                "rgba(127,29,29,.18)",

              color:
                "#fca5a5",

              fontSize:
                "9px",

              fontWeight:
                900,
            }}
          >
            {actionRequired} offen
          </span>
        )}
      </div>


      {loading ? (
        <div
          style={{
            padding:
              "14px 0",

            color:
              "#64748b",

            fontSize:
              "10px",
          }}
        >
          Aktivitäten werden geladen…
        </div>
      ) : error ? (
        <div
          style={{
            padding:
              "12px",

            borderRadius:
              "10px",

            background:
              "rgba(127,29,29,.14)",

            color:
              "#fca5a5",

            fontSize:
              "10px",
          }}
        >
          {error}
        </div>
      ) : items.length ===
        0 ? (
        <div
          style={{
            padding:
              "14px 0",

            color:
              "#64748b",

            fontSize:
              "10px",
          }}
        >
          Noch keine Aktivität für dieses Objekt.
        </div>
      ) : (
        <div
          style={{
            display: "grid",

            gap: "7px",
          }}
        >
          {items.map(
            (item) => {
              const external =
                /^https?:\/\//i.test(
                  item.href
                );

              return (
                <a
                  key={
                    item.id
                  }
                  href={
                    item.href
                  }
                  target={
                    external
                      ? "_blank"
                      : undefined
                  }
                  rel={
                    external
                      ? "noreferrer"
                      : undefined
                  }
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "30px minmax(0,1fr) auto",

                    gap:
                      "9px",

                    alignItems:
                      "center",

                    padding:
                      "9px 10px",

                    border:
                      "1px solid rgba(148,163,184,.10)",

                    borderRadius:
                      "11px",

                    background:
                      item.unread
                        ? "rgba(251,191,36,.05)"
                        : "rgba(15,23,42,.28)",

                    color:
                      "inherit",

                    textDecoration:
                      "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width:
                        "29px",

                      height:
                        "29px",

                      display:
                        "grid",

                      placeItems:
                        "center",

                      borderRadius:
                        "9px",

                      background:
                        "rgba(15,23,42,.65)",

                      fontSize:
                        "14px",
                    }}
                  >
                    {item.icon ??
                      "•"}
                  </span>

                  <span
                    style={{
                      minWidth: 0,

                      display:
                        "grid",

                      gap: "2px",
                    }}
                  >
                    <strong
                      style={{
                        overflow:
                          "hidden",

                        color:
                          getSeverityColor(
                            item.severity
                          ),

                        fontSize:
                          "10px",

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {item.title ??
                        "Objektaktivität"}
                    </strong>

                    <span
                      style={{
                        overflow:
                          "hidden",

                        color:
                          "#94a3b8",

                        fontSize:
                          "9px",

                        textOverflow:
                          "ellipsis",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {item.message ??
                        item.listingLabel}
                    </span>
                  </span>

                  <time
                    dateTime={
                      item.createdAt
                    }
                    style={{
                      color:
                        "#64748b",

                      fontSize:
                        "8px",

                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {formatTime(
                      item.createdAt
                    )}
                  </time>
                </a>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}