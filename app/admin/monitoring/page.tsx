"use client";

import {
  useEffect,
  useState,
} from "react";

type MonitoringEvent = {
  id: number;
  stage: string;
  status: string;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  metadata: unknown;
};

type MonitoringRun = {
  id: string;
  userId: string | null;
  listingId: string | null;
  status: string;
  documentCount: number;
  imageCount: number;
  detectedFieldCount: number;
  missingRequiredCount: number;
  manualCorrectionCount: number;
  textEdited: boolean;
  imageOrderChanged: boolean;
  readyReached: boolean;
  totalDurationMs: number | null;
  errorStage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  events: MonitoringEvent[];
};

type PresenceEntry = {
  userId: string;
  currentPath: string;
  sessionStartedAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    role: string;
  };
};

type MonitoringResponse = {
  success: boolean;
  error?: string;
  summary?: {
    totalRuns: number;
    readyRuns: number;
    failedRuns: number;
    averageDurationMs: number | null;
    onlineUsers: number;
    activeToday: number;
  };
  presence?: {
    online: PresenceEntry[];
    recent: PresenceEntry[];
  };
  runs?: MonitoringRun[];
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
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function formatLastSeen(
  value: string
) {
  const diffMs =
    Date.now() -
    new Date(value).getTime();

  const seconds =
    Math.max(
      0,
      Math.floor(
        diffMs / 1000
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

function statusLabel(
  status: string
) {
  if (status === "ready") {
    return "READY";
  }

  if (status === "failed") {
    return "FEHLER";
  }

  if (status === "running") {
    return "LÄUFT";
  }

  if (status === "abandoned") {
    return "ABGEBROCHEN";
  }

  return status.toUpperCase();
}

export default function AdminMonitoringPage() {
  const [data, setData] =
    useState<MonitoringResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [lastRefresh, setLastRefresh] =
    useState<Date | null>(null);

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

        if (!active) {
          return;
        }

        setData(json);
        setLastRefresh(
          new Date()
        );
      } catch {
        if (!active) {
          return;
        }

        setData({
          success: false,
          error:
            "Monitoring konnte nicht geladen werden.",
        });
      } finally {
        if (active) {
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
        5000
      );

    return () => {
      active = false;
      window.clearInterval(
        timer
      );
    };
  }, []);

  if (loading) {
    return (
      <main className="monitoringPage">
        <div className="centerState">
          Control Center wird geladen …
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (
    !data ||
    !data.success
  ) {
    return (
      <main className="monitoringPage">
        <div className="accessCard">
          <div className="accessEyebrow">
            Inserat-AI Control Center
          </div>

          <h1>
            Kein Zugriff
          </h1>

          <p>
            {data?.error ??
              "Diese Seite ist nur intern verfügbar."}
          </p>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  const summary =
    data.summary;

  const runs =
    data.runs ?? [];

  const onlineUsers =
    data.presence?.online ?? [];

  const recentUsers =
    data.presence?.recent ?? [];

  return (
    <main className="monitoringPage">
      <div className="monitoringShell">
        <header className="monitoringHeader">
          <div>
            <div className="eyebrow">
              Inserat-AI
            </div>

            <h1>
              Control Center
            </h1>

            <p>
              Interne Qualitäts- und
              Performance-Überwachung
            </p>
          </div>

          <div className="liveBlock">
            <span className="liveDot" />

            <div>
              <strong>
                LIVE
              </strong>

              <small>
                Aktualisierung alle
                5 Sekunden
              </small>
            </div>
          </div>
        </header>

        <section className="metricGrid">
          <article className="metricCard">
            <span>
              Läufe
            </span>

            <strong>
              {summary?.totalRuns ?? 0}
            </strong>

            <small>
              letzte 50 Runs
            </small>
          </article>

          <article className="metricCard">
            <span>
              READY
            </span>

            <strong>
              {summary?.readyRuns ?? 0}
            </strong>

            <small>
              erfolgreich
            </small>
          </article>

          <article className="metricCard">
            <span>
              Fehler
            </span>

            <strong>
              {summary?.failedRuns ?? 0}
            </strong>

            <small>
              fehlgeschlagen
            </small>
          </article>

          <article className="metricCard">
            <span>
              Ø Exposé
            </span>

            <strong>
              {formatDuration(
                summary?.averageDurationMs ??
                  null
              )}
            </strong>

            <small>
              erfolgreiche Läufe
            </small>
          </article>
        </section>

        <section className="presenceSection">
          <div className="sectionHeader">
            <div>
              <div className="presenceTitleRow">
                <span className="liveDot" />

                <h2>
                  Live Benutzer
                </h2>
              </div>

              <p>
                Aktuelle und letzte Aktivit?t
                in Inserat-AI
              </p>
            </div>

            <div className="presenceSummary">
              <div>
                <strong>
                  {summary?.onlineUsers ?? 0}
                </strong>

                <span>
                  online jetzt
                </span>
              </div>

              <div>
                <strong>
                  {summary?.activeToday ?? 0}
                </strong>

                <span>
                  heute aktiv
                </span>
              </div>
            </div>
          </div>

          <div className="presenceContent">
            <div className="presenceColumn">
              <div className="presenceColumnTitle">
                Online jetzt
              </div>

              {onlineUsers.length === 0 ? (
                <div className="presenceEmpty">
                  Aktuell ist niemand online.
                </div>
              ) : (
                onlineUsers.map(
                  (entry) => (
                    <div
                      className="presenceUser"
                      key={entry.userId}
                    >
                      <div className="presenceIdentity">
                        <span className="onlineIndicator" />

                        <div>
                          <strong>
                            {entry.user.name}
                          </strong>

                          <span>
                            {entry.user.company ||
                              entry.user.email}
                          </span>
                        </div>
                      </div>

                      <div className="presencePath">
                        {entry.currentPath}
                      </div>

                      <div className="presenceSeen">
                        {formatLastSeen(
                          entry.lastSeenAt
                        )}
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <div className="presenceColumn">
              <div className="presenceColumnTitle">
                Zuletzt aktiv
              </div>

              {recentUsers
                .slice(0, 8)
                .map(
                  (entry) => (
                    <div
                      className="presenceUser"
                      key={
                        `recent-${entry.userId}`
                      }
                    >
                      <div className="presenceIdentity">
                        <div className="recentIndicator" />

                        <div>
                          <strong>
                            {entry.user.name}
                          </strong>

                          <span>
                            {entry.user.company ||
                              entry.user.email}
                          </span>
                        </div>
                      </div>

                      <div className="presencePath">
                        {entry.currentPath}
                      </div>

                      <div className="presenceSeen">
                        {formatLastSeen(
                          entry.lastSeenAt
                        )}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        </section>

        <section className="runsSection">
          <div className="sectionHeader">
            <div>
              <h2>
                Automationsläufe
              </h2>

              <p>
                Technischer Verlauf der
                letzten Verarbeitungen
              </p>
            </div>

            <div className="refreshText">
              {lastRefresh
                ? `Stand ${lastRefresh.toLocaleTimeString(
                    "de-CH"
                  )}`
                : ""}
            </div>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Zeitpunkt</th>
                  <th>Dok.</th>
                  <th>Bilder</th>
                  <th>Dauer</th>
                  <th>Benutzer</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                {runs.map(
                  (run) => (
                    <tr key={run.id}>
                      <td>
                        <span
                          className={`status status-${run.status}`}
                        >
                          {statusLabel(
                            run.status
                          )}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          run.startedAt
                        )}
                      </td>

                      <td>
                        {run.documentCount}
                      </td>

                      <td>
                        {run.imageCount}
                      </td>

                      <td>
                        {formatDuration(
                          run.totalDurationMs
                        )}
                      </td>

                      <td>
                        <code>
                          {run.userId
                            ? run.userId.slice(
                                0,
                                10
                              )
                            : "—"}
                        </code>
                      </td>

                      <td>
                        <details>
                          <summary>
                            {run.events.length}{" "}
                            Phasen
                          </summary>

                          <div className="eventList">
                            {run.events.length ===
                            0 ? (
                              <div className="emptyEvent">
                                Keine
                                Phasendaten
                              </div>
                            ) : (
                              run.events.map(
                                (
                                  event
                                ) => (
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

                                    <b>
                                      {formatDuration(
                                        event.durationMs
                                      )}
                                    </b>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .monitoringPage {
    min-height: 100vh;
    background:
      radial-gradient(
        circle at top right,
        rgba(198, 160, 86, 0.12),
        transparent 34%
      ),
      #0b0c0f;
    color: #f7f4ee;
    padding: 40px;
    font-family:
      Inter,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .monitoringShell {
    width: min(1500px, 100%);
    margin: 0 auto;
  }

  .monitoringHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 30px;
  }

  .eyebrow,
  .accessEyebrow {
    color: #caa85e;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  h1 {
    margin: 0;
    font-size: clamp(
      30px,
      4vw,
      52px
    );
    letter-spacing: -0.04em;
  }

  .monitoringHeader p {
    color: #8e929b;
    margin: 8px 0 0;
  }

  .liveBlock {
    display: flex;
    align-items: center;
    gap: 11px;
    border: 1px solid #282b31;
    background: #121419;
    border-radius: 16px;
    padding: 13px 16px;
  }

  .liveBlock strong,
  .liveBlock small {
    display: block;
  }

  .liveBlock strong {
    font-size: 12px;
    letter-spacing: 0.14em;
  }

  .liveBlock small {
    color: #7f848d;
    margin-top: 2px;
  }

  .liveDot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #4bd27a;
    box-shadow:
      0 0 0 5px
      rgba(75, 210, 122, 0.12);
  }

  .metricGrid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 26px;
  }

  .metricCard {
    border: 1px solid #24272d;
    background:
      linear-gradient(
        145deg,
        #14161b,
        #101216
      );
    border-radius: 18px;
    padding: 22px;
  }

  .metricCard span,
  .metricCard small {
    display: block;
  }

  .metricCard span {
    color: #969aa3;
    font-size: 13px;
  }

  .metricCard strong {
    display: block;
    font-size: 34px;
    margin: 8px 0 4px;
    letter-spacing: -0.04em;
  }

  .metricCard small {
    color: #666b74;
  }

  .presenceSection {
    border: 1px solid #24272d;
    background: #101216;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 26px;
  }

  .presenceTitleRow {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .presenceTitleRow h2 {
    margin: 0;
  }

  .presenceSummary {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .presenceSummary > div {
    text-align: right;
  }

  .presenceSummary strong,
  .presenceSummary span {
    display: block;
  }

  .presenceSummary strong {
    font-size: 22px;
    color: #f4f1e9;
  }

  .presenceSummary span {
    color: #70757e;
    font-size: 11px;
    margin-top: 2px;
  }

  .presenceContent {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .presenceColumn {
    padding: 20px 24px;
  }

  .presenceColumn + .presenceColumn {
    border-left:
      1px solid #24272d;
  }

  .presenceColumnTitle {
    color: #777c85;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .presenceUser {
    display: grid;
    grid-template-columns:
      minmax(180px, 1fr)
      minmax(150px, 0.8fr)
      auto;
    align-items: center;
    gap: 18px;
    padding: 13px 0;
    border-bottom:
      1px solid #1e2126;
  }

  .presenceUser:last-child {
    border-bottom: 0;
  }

  .presenceIdentity {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .presenceIdentity strong,
  .presenceIdentity span {
    display: block;
  }

  .presenceIdentity strong {
    color: #e8e9eb;
    font-size: 13px;
  }

  .presenceIdentity span {
    color: #727780;
    font-size: 11px;
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .onlineIndicator,
  .recentIndicator {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .onlineIndicator {
    background: #4bd27a;
    box-shadow:
      0 0 0 4px
      rgba(75, 210, 122, 0.11);
  }

  .recentIndicator {
    background: #636872;
  }

  .presencePath {
    color: #caa85e;
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .presenceSeen {
    color: #7e838c;
    font-size: 11px;
    white-space: nowrap;
  }

  .presenceEmpty {
    color: #666b74;
    font-size: 12px;
    padding: 18px 0;
  }

  .runsSection {
    border: 1px solid #24272d;
    background: #101216;
    border-radius: 20px;
    overflow: hidden;
  }

  .sectionHeader {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    padding: 22px 24px;
    border-bottom: 1px solid #24272d;
  }

  .sectionHeader h2 {
    margin: 0;
    font-size: 19px;
  }

  .sectionHeader p {
    color: #757a83;
    margin: 5px 0 0;
    font-size: 13px;
  }

  .refreshText {
    color: #737780;
    font-size: 12px;
  }

  .tableWrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 980px;
  }

  th,
  td {
    text-align: left;
    padding: 15px 18px;
    border-bottom:
      1px solid #1e2126;
  }

  th {
    color: #777c85;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  td {
    color: #d5d7db;
    font-size: 13px;
    vertical-align: top;
  }

  tbody tr:hover {
    background: #14171c;
  }

  code {
    color: #a9adb5;
    font-size: 11px;
  }

  .status {
    display: inline-flex;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .status-ready {
    color: #7fe49d;
    background:
      rgba(64, 185, 103, 0.11);
  }

  .status-running {
    color: #d6b566;
    background:
      rgba(202, 168, 94, 0.12);
  }

  .status-failed {
    color: #ff8e8e;
    background:
      rgba(255, 94, 94, 0.1);
  }

  .status-abandoned {
    color: #a4a8b0;
    background:
      rgba(150, 154, 163, 0.1);
  }

  details {
    min-width: 220px;
  }

  summary {
    color: #caa85e;
    cursor: pointer;
    user-select: none;
  }

  .eventList {
    margin-top: 12px;
    border: 1px solid #282b31;
    border-radius: 12px;
    overflow: hidden;
    background: #0c0e11;
  }

  .eventRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 10px 12px;
    border-bottom:
      1px solid #1f2227;
  }

  .eventRow:last-child {
    border-bottom: 0;
  }

  .eventRow strong,
  .eventRow span {
    display: block;
  }

  .eventRow strong {
    font-size: 11px;
    color: #e0e1e3;
  }

  .eventRow span {
    color: #6f747d;
    font-size: 10px;
    margin-top: 2px;
  }

  .eventRow b {
    font-size: 11px;
    white-space: nowrap;
  }

  .emptyEvent {
    color: #6f747d;
    padding: 12px;
    font-size: 11px;
  }

  .centerState {
    width: fit-content;
    margin: 20vh auto;
    color: #8c9199;
  }

  .accessCard {
    width: min(
      520px,
      calc(100% - 32px)
    );
    margin: 14vh auto;
    border: 1px solid #272a30;
    background: #121419;
    border-radius: 20px;
    padding: 30px;
  }

  .accessCard h1 {
    font-size: 32px;
  }

  .accessCard p {
    color: #969aa3;
    line-height: 1.6;
  }

  @media (
    max-width: 900px
  ) {
    .monitoringPage {
      padding: 22px 14px;
    }

    .monitoringHeader {
      flex-direction: column;
    }

    .metricGrid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .presenceContent {
      grid-template-columns: 1fr;
    }

    .presenceColumn + .presenceColumn {
      border-left: 0;
      border-top:
        1px solid #24272d;
    }

    .presenceUser {
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .presenceSummary {
      gap: 14px;
    }
  }

  @media (
    max-width: 520px
  ) {
    .metricGrid {
      grid-template-columns: 1fr;
    }
  }
`;
