"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type JobStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "processing"
  | "published"
  | "failed"
  | "cancelled";

type ChannelFilter =
  | "all"
  | "instagram_business"
  | "facebook_page"
  | "linkedin"
  | "tiktok";

type StatusFilter =
  | "all"
  | JobStatus;

type PublishJob = {
  id: string;
  channel: string;
  environment: string;
  caption: string;
  status: JobStatus;
  scheduledFor: string | null;
  attemptCount: number;
  maxAttempts: number;
  publishedAt: string | null;
  errorCode: string | null;
  externalPostUrl: string | null;
  createdAt: string;
};

type JobsResponse = {
  success: boolean;
  jobs?: PublishJob[];
  capabilities?: {
    planEligible: boolean;
    queueEnabled: boolean;
    canCreate: boolean;
    externalPublishing: boolean;
  };
  error?: string;
};

type SocialConnectionSnapshot = {
  provider: string;
  channel: string;
  environment: string;
  status: string;
};

type ConnectionsResponse = {
  success: boolean;
  connections?: SocialConnectionSnapshot[];
  integrations?: {
    meta?: {
      configured: boolean;
    };
  };
  error?: string;
};

function channelLabel(
  channel: string
) {
  if (
    channel ===
    "instagram_business"
  ) {
    return "Instagram";
  }

  if (
    channel ===
    "facebook_page"
  ) {
    return "Facebook";
  }

  if (
    channel ===
    "linkedin"
  ) {
    return "LinkedIn";
  }

  if (
    channel ===
    "tiktok"
  ) {
    return "TikTok";
  }

  return channel;
}

function statusLabel(
  status: JobStatus
) {
  const labels:
    Record<
      JobStatus,
      string
    > = {
      draft:
        "Entwurf",

      scheduled:
        "Geplant",

      queued:
        "Warteschlange",

      processing:
        "Läuft",

      published:
        "Veröffentlicht",

      failed:
        "Fehlgeschlagen",

      cancelled:
        "Abgebrochen",
    };

  return labels[
    status
  ];
}

function statusClass(
  status: JobStatus
) {
  if (
    status ===
    "published"
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (
    status ===
    "failed"
  ) {
    return "border-red-400/30 bg-red-400/10 text-red-200";
  }

  if (
    status ===
    "processing"
  ) {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  }

  if (
    status ===
      "queued" ||
    status ===
      "scheduled"
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  return "border-white/10 bg-white/[0.05] text-slate-300";
}

function formatDate(
  value:
    string |
    null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    date
  );
}

export default function PublishingCenterStatusCard() {

  const [
    jobs,
    setJobs,
  ] =
    useState<
      PublishJob[]
    >(
      []
    );

  const [
    capabilities,
    setCapabilities,
  ] =
    useState<
      JobsResponse[
        "capabilities"
      ]
    >();

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    channelFilter,
    setChannelFilter,
  ] =
    useState<ChannelFilter>(
      "all"
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all"
    );

  const [
    connections,
    setConnections,
  ] =
    useState<
      SocialConnectionSnapshot[]
    >(
      []
    );

  const [
    metaConfigured,
    setMetaConfigured,
  ] =
    useState(
      false
    );

  const [
    connectionsLoaded,
    setConnectionsLoaded,
  ] =
    useState(
      false
    );

  const loadJobs =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setError(
          null
        );

        try {

          const response =
            await fetch(
              "/api/social-publish-jobs?limit=10",
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",
              }
            );

          if (
            response.status ===
            401
          ) {

            window.location.href =
              "/login";

            return;
          }

          const data =
            (
              await response.json()
            ) as
              JobsResponse;

          if (
            !response.ok ||
            !data.success
          ) {

            throw new Error(
              data.error ||
              "PUBLISHING_CENTER_LOAD_FAILED"
            );
          }

          setJobs(
            data.jobs ??
            []
          );

          setCapabilities(
            data.capabilities
          );
        }
        catch (
          loadError
        ) {

          console.error(
            "PUBLISHING CENTER:",
            loadError
          );

          setError(
            "Publishing-Status konnte nicht geladen werden."
          );
        }
        finally {

          setLoading(
            false
          );
        }
      },
      []
    );

  const loadConnections =
    useCallback(
      async () => {

        setConnectionsLoaded(
          false
        );

        try {

          const response =
            await fetch(
              "/api/social-connections?environment=test",
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",
              }
            );

          if (
            response.status ===
            401
          ) {

            window.location.href =
              "/login";

            return;
          }

          const data =
            (
              await response.json()
            ) as
              ConnectionsResponse;

          if (
            !response.ok ||
            !data.success
          ) {

            throw new Error(
              data.error ||
              "SOCIAL_CONNECTION_STATUS_FAILED"
            );
          }

          setConnections(
            data.connections ??
            []
          );

          setMetaConfigured(
            Boolean(
              data.integrations
                ?.meta
                ?.configured
            )
          );
        }
        catch (
          readinessError
        ) {

          console.error(
            "PUBLISHING READINESS:",
            readinessError
          );

          setConnections(
            []
          );

          setMetaConfigured(
            false
          );
        }
        finally {

          setConnectionsLoaded(
            true
          );
        }
      },
      []
    );


  useEffect(
    () => {

      void loadJobs();
      void loadConnections();
    },
    [
      loadJobs,
      loadConnections,
    ]
  );

  const counts =
    useMemo(
      () => ({
        scheduled:
          jobs.filter(
            job =>
              job.status ===
              "scheduled"
          ).length,

        active:
          jobs.filter(
            job =>
              job.status ===
                "queued" ||
              job.status ===
                "processing"
          ).length,

        published:
          jobs.filter(
            job =>
              job.status ===
              "published"
          ).length,

        failed:
          jobs.filter(
            job =>
              job.status ===
              "failed"
          ).length,
      }),
      [
        jobs,
      ]
    );

  const filteredJobs =
    useMemo(
      () =>
        jobs.filter(
          job =>
            (
              channelFilter ===
                "all" ||
              job.channel ===
                channelFilter
            ) &&
            (
              statusFilter ===
                "all" ||
              job.status ===
                statusFilter
            )
        ),
      [
        jobs,
        channelFilter,
        statusFilter,
      ]
    );

  const facebookConnectionCount =
    useMemo(
      () =>
        connections.filter(
          connection =>
            connection.provider ===
              "meta" &&
            connection.channel ===
              "facebook_page"
        ).length,
      [
        connections,
      ]
    );

  const instagramConnectionCount =
    useMemo(
      () =>
        connections.filter(
          connection =>
            connection.provider ===
              "meta" &&
            connection.channel ===
              "instagram_business"
        ).length,
      [
        connections,
      ]
    );

  const automationActive =
    Boolean(
      capabilities
        ?.queueEnabled &&
      capabilities
        ?.externalPublishing
    );

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#071a2f] via-slate-950 to-slate-900 shadow-2xl">

      <div className="border-b border-white/10 p-5 sm:p-7">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Publishing Center
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Veröffentlichungsstatus
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Geplante, laufende und abgeschlossene Social-Media-Jobs.
              Diese Ansicht ist aktuell rein lesend.
            </p>
          </div>

          <div
            className={
              automationActive
                ? "w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200"
                : "w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-200"
            }
          >
            {automationActive
              ? "● Automatisierung aktiv"
              : "○ Automatisierung sicher aus"}
          </div>

        </div>

      </div>


      <div className="border-b border-white/10 p-5 sm:p-7">

        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Betriebsmodus & Bereitschaft
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Modus
            </p>

            <p className="mt-2 text-lg font-black text-white">
              {
                automationActive
                  ? "Automatisiert"
                  : "Manuell"
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {
                automationActive
                  ? "Queue und externes Publishing aktiv"
                  : "Keine automatische Veröffentlichung"
              }
            </p>
          </div>


          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Meta OAuth
            </p>

            <p className="mt-2 text-lg font-black text-white">
              {
                !connectionsLoaded
                  ? "Prüfe..."
                  : metaConfigured
                    ? "Bereit"
                    : "Nicht konfiguriert"
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Facebook + Instagram
            </p>
          </div>


          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.05] p-4">
            <p className="text-xs font-black uppercase text-blue-300">
              Facebook
            </p>

            <p className="mt-2 text-lg font-black text-white">
              {
                !connectionsLoaded
                  ? "Prüfe..."
                  : facebookConnectionCount > 0
                    ? facebookConnectionCount + " verbunden"
                    : "Nicht verbunden"
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Test-Verbindungen
            </p>
          </div>


          <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/[0.05] p-4">
            <p className="text-xs font-black uppercase text-fuchsia-300">
              Instagram
            </p>

            <p className="mt-2 text-lg font-black text-white">
              {
                !connectionsLoaded
                  ? "Prüfe..."
                  : instagramConnectionCount > 0
                    ? instagramConnectionCount + " verbunden"
                    : "Nicht verbunden"
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Business-Konten
            </p>
          </div>

        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs text-slate-500">
          LinkedIn und TikTok bleiben aktuell im manuellen Veröffentlichungsmodus.
        </div>

      </div>


      <div className="grid gap-3 border-b border-white/10 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-4">

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase text-slate-400">
            Geplant
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {counts.scheduled}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
          <p className="text-xs font-black uppercase text-cyan-300">
            Wartend / Laufend
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {counts.active}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
          <p className="text-xs font-black uppercase text-emerald-300">
            Veröffentlicht
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {counts.published}
          </p>
        </div>

        <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-4">
          <p className="text-xs font-black uppercase text-red-300">
            Fehlgeschlagen
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {counts.failed}
          </p>
        </div>

      </div>


      <div className="p-5 sm:p-7">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>
            <p className="font-black text-white">
              Letzte Publishing-Jobs
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Maximal 10 Einträge
            </p>
          </div>

          <button
            type="button"
            onClick={
              () => {
                void loadJobs();
                void loadConnections();
              }
            }
            disabled={
              loading
            }
            className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading
              ? "Prüfe..."
              : "Status aktualisieren"}
          </button>

        </div>


        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Plattform
            </span>

            <select
              value={
                channelFilter
              }
              onChange={
                event =>
                  setChannelFilter(
                    event.target.value as ChannelFilter
                  )
              }
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-amber-400/50"
            >
              <option value="all">
                Alle Plattformen
              </option>

              <option value="instagram_business">
                Instagram
              </option>

              <option value="facebook_page">
                Facebook
              </option>

              <option value="linkedin">
                LinkedIn
              </option>

              <option value="tiktok">
                TikTok
              </option>
            </select>
          </label>


          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Status
            </span>

            <select
              value={
                statusFilter
              }
              onChange={
                event =>
                  setStatusFilter(
                    event.target.value as StatusFilter
                  )
              }
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-amber-400/50"
            >
              <option value="all">
                Alle Status
              </option>

              <option value="draft">
                Entwurf
              </option>

              <option value="scheduled">
                Geplant
              </option>

              <option value="queued">
                Warteschlange
              </option>

              <option value="processing">
                Läuft
              </option>

              <option value="published">
                Veröffentlicht
              </option>

              <option value="failed">
                Fehlgeschlagen
              </option>

              <option value="cancelled">
                Abgebrochen
              </option>
            </select>
          </label>

        </div>


        {error && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </div>
        )}


        {!loading &&
        !error &&
        jobs.length ===
          0 && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">

            <p className="font-black text-white">
              Noch keine Publishing-Jobs
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Das ist im aktuellen sicheren Zustand erwartet.
              Die Publishing-Automatisierung bleibt deaktiviert.
            </p>

          </div>
        )}


        {!loading &&
        !error &&
        jobs.length >
          0 &&
        filteredJobs.length ===
          0 && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">

            <p className="font-black text-white">
              Keine Treffer für diesen Filter
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Ändere Plattform oder Status, um andere Publishing-Jobs anzuzeigen.
            </p>

          </div>
        )}


        {filteredJobs.length >
          0 && (
          <div className="mt-5 grid gap-3">

            {filteredJobs.map(
              job => (
                <article
                  key={
                    job.id
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                >

                  <div className="flex flex-wrap items-center justify-between gap-3">

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-black text-white">
                        {
                          channelLabel(
                            job.channel
                          )
                        }
                      </span>

                      <span
                        className={`rounded-lg border px-2.5 py-1 text-xs font-black ${statusClass(
                          job.status
                        )}`}
                      >
                        {
                          statusLabel(
                            job.status
                          )
                        }
                      </span>

                    </div>

                    <span className="text-xs font-bold text-slate-500">
                      {
                        formatDate(
                          job.createdAt
                        )
                      }
                    </span>

                  </div>


                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-200">
                    {job.caption}
                  </p>


                  <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">

                    <span>
                      Geplant:{" "}
                      <strong className="text-slate-300">
                        {
                          formatDate(
                            job.scheduledFor
                          )
                        }
                      </strong>
                    </span>

                    <span>
                      Versuche:{" "}
                      <strong className="text-slate-300">
                        {job.attemptCount}/{job.maxAttempts}
                      </strong>
                    </span>

                    <span>
                      Veröffentlicht:{" "}
                      <strong className="text-slate-300">
                        {
                          formatDate(
                            job.publishedAt
                          )
                        }
                      </strong>
                    </span>

                  </div>


                  {job.errorCode && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs font-bold text-red-200">
                      Fehler: {job.errorCode}
                    </div>
                  )}


                  {job.externalPostUrl && (
                    <a
                      href={
                        job.externalPostUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs font-black text-cyan-300 hover:text-cyan-200"
                    >
                      Veröffentlichten Post öffnen →
                    </a>
                  )}

                </article>
              )
            )}

          </div>
        )}


        <div className="mt-5 grid gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:grid-cols-3">

          <span>
            Plan berechtigt:{" "}
            {capabilities?.planEligible
              ? "Ja"
              : "Nein"}
          </span>

          <span>
            Queue aktiv:{" "}
            {capabilities?.queueEnabled
              ? "Ja"
              : "Nein"}
          </span>

          <span>
            Externes Publishing:{" "}
            {capabilities?.externalPublishing
              ? "Ja"
              : "Nein"}
          </span>

        </div>

      </div>

    </section>
  );
}