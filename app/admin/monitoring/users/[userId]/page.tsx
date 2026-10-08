"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

type UserActivityEvent = {
  id: number;
  userId: string;
  type: string;
  path: string | null;
  metadata:
    | Record<string, unknown>
    | null;
  createdAt: string;
};

type MonitoringEvent = {
  id: number;
  stage: string;
  status: string;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type MonitoringRun = {
  id: string;
  status: string;
  documentCount: number;
  imageCount: number;
  readyReached: boolean;
  totalDurationMs: number | null;
  errorStage: string | null;
  errorCode: string | null;
  startedAt: string;
  completedAt: string | null;
  events: MonitoringEvent[];
};

type MonitoringUser = {
  userId: string;
  name: string;
  email: string;
  company: string | null;
  role: string;
  currentPath: string;
  sessionStartedAt: string;
  lastSeenAt: string;
  isOnline: boolean;
  runs: MonitoringRun[];
  activityEvents:
    UserActivityEvent[];
};

type MonitoringResponse = {
  success: boolean;
  users?: MonitoringUser[];
  error?: string;
};

function formatDuration(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${(value / 1000).toFixed(2)} s`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "medium",
      timeStyle: "medium",
    }
  ).format(
    new Date(value)
  );
}

function activityLabel(
  event: UserActivityEvent
) {
  if (event.type === "login") {
    return "Login";
  }

  if (event.type === "page_view") {
    return "Seite ge?ffnet";
  }

  if (
    event.type ===
    "automation_started"
  ) {
    return "Automation gestartet";
  }

  if (
    event.type ===
    "automation_ready"
  ) {
    return "Automation READY";
  }

  if (
    event.type ===
    "automation_failed"
  ) {
    return "Automation fehlgeschlagen";
  }

  return event.type;
}

function activityDetail(
  event: UserActivityEvent
) {
  if (
    event.type === "page_view"
  ) {
    return event.path || "?";
  }

  if (
    event.type ===
    "automation_started"
  ) {
    const count =
      event.metadata?.documentCount;

    return typeof count === "number"
      ? `${count} Dokument${count === 1 ? "" : "e"}`
      : "Verarbeitung gestartet";
  }

  if (
    event.type ===
    "automation_ready"
  ) {
    const imageCount =
      event.metadata?.imageCount;

    const durationMs =
      event.metadata?.durationMs;

    const parts = [];

    if (
      typeof imageCount === "number"
    ) {
      parts.push(
        `${imageCount} Bilder`
      );
    }

    if (
      typeof durationMs === "number"
    ) {
      parts.push(
        `${(durationMs / 1000).toFixed(2)} s`
      );
    }

    return (
      parts.join(" ? ") ||
      "Erfolgreich abgeschlossen"
    );
  }

  if (
    event.type ===
    "automation_failed"
  ) {
    const stage =
      event.metadata?.errorStage;

    return typeof stage === "string"
      ? stage
      : "Fehler";
  }

  return event.path || "";
}

function formatLastSeen(
  value: string
) {
  const diff =
    Date.now() -
    new Date(value).getTime();

  const seconds =
    Math.max(
      0,
      Math.floor(
        diff / 1000
      )
    );

  if (seconds < 10) {
    return "gerade eben";
  }

  if (seconds < 60) {
    return `vor ${seconds} Sek.`;
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `vor ${minutes} Min.`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `vor ${hours} Std.`;
  }

  return formatDate(value);
}

export default function MonitoringUserPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const userId =
    String(
      params?.userId ?? ""
    );

  const [
    data,
    setData,
  ] =
    useState<MonitoringResponse | null>(
      null
    );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response =
          await fetch(
            "/api/admin/monitoring",
            {
              cache: "no-store",
            }
          );

        const json =
          (await response.json()) as
            MonitoringResponse;

        if (active) {
          setData(json);
        }
      } catch {
        if (active) {
          setData({
            success: false,
            error:
              "Monitoring konnte nicht geladen werden.",
          });
        }
      }
    }

    void load();

    const timer =
      window.setInterval(
        () => {
          void load();
        },
        5000
      );

    return () => {
      active = false;
      window.clearInterval(
        timer
      );
    };
  }, []);

  const user =
    useMemo(
      () =>
        data?.users?.find(
          (entry) =>
            entry.userId ===
            userId
        ) ?? null,
      [
        data,
        userId,
      ]
    );

  if (!data) {
    return (
      <main className="page">
        <div className="state">
          Benutzer wird geladen …
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (
    !data.success ||
    !user
  ) {
    return (
      <main className="page">
        <button
          className="backButton"
          onClick={() =>
            router.push(
              "/admin/monitoring"
            )
          }
        >
          ← Zurück
        </button>

        <div className="state">
          {data.error ||
            "Benutzer wurde nicht gefunden."}
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell">
        <button
          className="backButton"
          onClick={() =>
            router.push(
              "/admin/monitoring"
            )
          }
        >
          ← Control Center
        </button>

        <section className="profileCard">
          <div>
            <div className="statusRow">
              <span
                className={
                  user.isOnline
                    ? "onlineDot"
                    : "offlineDot"
                }
              />

              <span>
                {user.isOnline
                  ? "ONLINE"
                  : "OFFLINE"}
              </span>
            </div>

            <h1>
              {user.name}
            </h1>

            <p>
              {user.company ||
                "Keine Firma hinterlegt"}
            </p>
          </div>

          <div className="profileMeta">
            <div>
              <span>E-Mail</span>
              <strong>
                {user.email}
              </strong>
            </div>

            <div>
              <span>Aktuelle Seite</span>
              <strong className="path">
                {user.currentPath}
              </strong>
            </div>

            <div>
              <span>Online seit</span>
              <strong>
                {formatDate(
                  user.sessionStartedAt
                )}
              </strong>
            </div>

            <div>
              <span>
                Letzte Aktivität
              </span>
              <strong>
                {formatLastSeen(
                  user.lastSeenAt
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="activityCard">
          <div className="sectionHeader">
            <div>
              <h2>
                Aktivit?tsverlauf
              </h2>

              <p>
                Letzte Seitenaufrufe und
                Automationsereignisse
              </p>
            </div>
          </div>

          <div className="timeline">
            {user.activityEvents.length ===
            0 ? (
              <div className="empty">
                Noch keine Aktivit?ten
                gespeichert.
              </div>
            ) : (
              user.activityEvents
                .slice(0, 100)
                .map(
                  (event) => (
                    <div
                      className="timelineItem"
                      key={event.id}
                    >
                      <div
                        className={`timelineDot timelineDot-${event.type}`}
                      />

                      <div className="timelineTime">
                        {new Intl.DateTimeFormat(
                          "de-CH",
                          {
                            hour:
                              "2-digit",
                            minute:
                              "2-digit",
                            second:
                              "2-digit",
                          }
                        ).format(
                          new Date(
                            event.createdAt
                          )
                        )}
                      </div>

                      <div className="timelineContent">
                        <strong>
                          {activityLabel(
                            event
                          )}
                        </strong>

                        <span>
                          {activityDetail(
                            event
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )
            )}
          </div>
        </section>

        <section className="runsCard">
          <div className="sectionHeader">
            <div>
              <h2>
                Automationen
              </h2>

              <p>
                {user.runs.length} gespeicherte Läufe
              </p>
            </div>
          </div>

          <div className="runList">
            {user.runs.length === 0 ? (
              <div className="empty">
                Noch keine Automationen vorhanden.
              </div>
            ) : (
              user.runs.map(
                (run) => (
                  <details
                    className="runItem"
                    key={run.id}
                  >
                    <summary>
                      <div className="runSummary">
                        <span
                          className={`runStatus runStatus-${run.status}`}
                        >
                          {run.status.toUpperCase()}
                        </span>

                        <span>
                          {formatDate(
                            run.startedAt
                          )}
                        </span>

                        <span>
                          {run.imageCount} Bilder
                        </span>

                        <strong>
                          {formatDuration(
                            run.totalDurationMs
                          )}
                        </strong>
                      </div>
                    </summary>

                    <div className="runDetails">
                      {run.events.length ===
                      0 ? (
                        <div className="empty">
                          Keine Phasendaten vorhanden.
                        </div>
                      ) : (
                        run.events.map(
                          (event) => (
                            <div
                              className="eventRow"
                              key={
                                event.id
                              }
                            >
                              <div>
                                <strong>
                                  {
                                    event.stage
                                  }
                                </strong>

                                <span>
                                  {
                                    event.status
                                  }
                                </span>
                              </div>

                              <div>
                                {formatDuration(
                                  event.durationMs
                                )}
                              </div>
                            </div>
                          )
                        )
                      )}
                    </div>
                  </details>
                )
              )
            )}
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page {
    min-height: 100vh;
    background: #0b0c0f;
    color: #f4f1e9;
    padding: 38px;
  }

  .shell {
    width: min(1320px, 100%);
    margin: 0 auto;
  }

  .backButton {
    border: 0;
    background: transparent;
    color: #caa85e;
    cursor: pointer;
    font-size: 13px;
    margin-bottom: 20px;
  }

  .profileCard,
  .activityCard,
  .runsCard {
    border: 1px solid #24272d;
    background: #101216;
    border-radius: 20px;
  }

  .activityCard {
    margin-bottom: 24px;
  }

  .profileCard {
    display: grid;
    grid-template-columns:
      minmax(280px, 0.8fr)
      minmax(0, 1.2fr);
    gap: 32px;
    padding: 28px;
    margin-bottom: 24px;
  }

  .profileCard h1 {
    margin: 10px 0 6px;
    font-size: 38px;
    letter-spacing: -0.04em;
  }

  .profileCard p {
    color: #7d828b;
    margin: 0;
  }

  .statusRow {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #8f949d;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .onlineDot,
  .offlineDot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .onlineDot {
    background: #4bd27a;
    box-shadow:
      0 0 0 5px
      rgba(75,210,122,.1);
  }

  .offlineDot {
    background: #61666f;
  }

  .profileMeta {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .profileMeta > div {
    border: 1px solid #202329;
    background: #0d0f13;
    border-radius: 14px;
    padding: 16px;
  }

  .profileMeta span,
  .profileMeta strong {
    display: block;
  }

  .profileMeta span {
    color: #747983;
    font-size: 11px;
    margin-bottom: 5px;
  }

  .profileMeta strong {
    color: #e7e8ea;
    font-size: 13px;
  }

  .path {
    color: #caa85e !important;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
  }

  .sectionHeader {
    padding: 22px 24px;
    border-bottom: 1px solid #24272d;
  }

  .sectionHeader h2 {
    margin: 0;
    font-size: 20px;
  }

  .sectionHeader p {
    color: #747983;
    margin: 5px 0 0;
    font-size: 12px;
  }

  .timeline {
    padding: 8px 24px 22px;
  }

  .timelineItem {
    display: grid;
    grid-template-columns:
      12px
      86px
      minmax(0, 1fr);
    align-items: flex-start;
    gap: 12px;
    padding: 13px 0;
    border-bottom:
      1px solid #202329;
  }

  .timelineItem:last-child {
    border-bottom: 0;
  }

  .timelineDot {
    width: 8px;
    height: 8px;
    margin-top: 5px;
    border-radius: 50%;
    background: #6d727c;
  }

  .timelineDot-login {
    background: #5e9df5;
  }

  .timelineDot-page_view {
    background: #818690;
  }

  .timelineDot-automation_started {
    background: #caa85e;
  }

  .timelineDot-automation_ready {
    background: #4bd27a;
    box-shadow:
      0 0 0 4px
      rgba(75,210,122,.08);
  }

  .timelineDot-automation_failed {
    background: #ff7777;
  }

  .timelineTime {
    color: #70757e;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    font-size: 11px;
    padding-top: 2px;
  }

  .timelineContent strong,
  .timelineContent span {
    display: block;
  }

  .timelineContent strong {
    color: #e7e8ea;
    font-size: 13px;
  }

  .timelineContent span {
    color: #777c85;
    font-size: 11px;
    margin-top: 4px;
    word-break: break-word;
  }

  .runList {
    padding: 0 24px 24px;
  }

  .runItem {
    border-bottom: 1px solid #202329;
  }

  .runItem summary {
    cursor: pointer;
    list-style: none;
    padding: 16px 0;
  }

  .runItem summary::-webkit-details-marker {
    display: none;
  }

  .runSummary {
    display: grid;
    grid-template-columns:
      110px
      minmax(180px, 1fr)
      120px
      100px;
    align-items: center;
    gap: 16px;
    font-size: 13px;
  }

  .runStatus {
    width: fit-content;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 10px;
    font-weight: 800;
  }

  .runStatus-ready {
    color: #7fe49d;
    background:
      rgba(64,185,103,.11);
  }

  .runStatus-running {
    color: #d6b566;
    background:
      rgba(202,168,94,.12);
  }

  .runStatus-failed {
    color: #ff8e8e;
    background:
      rgba(255,94,94,.1);
  }

  .runDetails {
    padding:
      0 0 18px 126px;
  }

  .eventRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 9px 12px;
    border: 1px solid #202329;
    border-bottom: 0;
    background: #0c0e11;
  }

  .eventRow:first-child {
    border-radius: 12px 12px 0 0;
  }

  .eventRow:last-child {
    border-bottom: 1px solid #202329;
    border-radius: 0 0 12px 12px;
  }

  .eventRow strong,
  .eventRow span {
    display: block;
  }

  .eventRow strong {
    font-size: 12px;
  }

  .eventRow span {
    color: #717680;
    font-size: 10px;
    margin-top: 2px;
  }

  .empty,
  .state {
    color: #777c85;
    padding: 24px;
  }

  @media (max-width: 800px) {
    .page {
      padding: 20px 14px;
    }

    .profileCard {
      grid-template-columns: 1fr;
    }

    .profileMeta {
      grid-template-columns: 1fr;
    }

    .runSummary {
      grid-template-columns: 1fr;
      gap: 7px;
    }

    .runDetails {
      padding-left: 0;
    }
  }
`;
