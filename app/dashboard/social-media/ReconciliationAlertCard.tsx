"use client";

import {
  useEffect,
  useState,
} from "react";


type ReconciliationJob = {
  id:
    string;

  provider:
    string;

  channel:
    string;

  environment:
    string;

  caption:
    string;

  errorCode:
    string |
    null;

  providerOperationState:
    string |
    null;

  providerOperationUpdatedAt:
    string |
    null;

  updatedAt:
    string;
};


type ReconciliationResponse = {
  success:
    boolean;

  count?:
    number;

  jobs?:
    ReconciliationJob[];

  error?:
    string;
};


function channelLabel(
  channel:
    string
):
  string {

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


function formatDate(
  value:
    string |
    null
):
  string {

  if (!value) {
    return "Zeitpunkt unbekannt";
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
    return "Zeitpunkt unbekannt";
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


export default function ReconciliationAlertCard() {

  const [
    jobs,
    setJobs,
  ] =
    useState<
      ReconciliationJob[]
    >(
      []
    );


  const [
    loadFailed,
    setLoadFailed,
  ] =
    useState(
      false
    );


  useEffect(
    () => {

      const controller =
        new AbortController();


      async function loadReconciliationJobs() {

        try {

          const response =
            await fetch(
              "/api/social-publish-jobs/reconciliation?limit=10",
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",

                signal:
                  controller.signal,
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


          /*
           * Publishing Center ist Pro+.
           * Für nicht berechtigte Pläne
           * wird die Box einfach nicht gezeigt.
           */
          if (
            response.status ===
            403
          ) {

            setJobs(
              []
            );

            return;
          }


          const data =
            (
              await response.json()
            ) as
              ReconciliationResponse;


          if (
            !response.ok ||
            !data.success
          ) {

            throw new Error(
              data.error ||
              "RECONCILIATION_STATUS_FAILED"
            );
          }


          setJobs(
            Array.isArray(
              data.jobs
            )
              ? data.jobs
              : []
          );

          setLoadFailed(
            false
          );
        }
        catch (
          error
        ) {

          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }


          console.error(
            "SOCIAL RECONCILIATION STATUS:",
            error
          );


          setLoadFailed(
            true
          );
        }
      }


      void loadReconciliationJobs();


      return () => {

        controller.abort();
      };
    },
    []
  );


  if (
    jobs.length ===
      0 &&
    !loadFailed
  ) {

    return null;
  }


  if (loadFailed) {

    return (
      <section className="mb-6 rounded-[20px] border border-slate-500/30 bg-slate-900/70 p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-slate-500/30 bg-white/5 text-lg">
            ⚠
          </div>

          <div>
            <div className="text-sm font-black text-white">
              Publishing-Status konnte nicht geprüft werden
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-300">
              Die Statusanzeige ist momentan nicht verfügbar.
              Es wurde dadurch keine Veröffentlichung ausgelöst.
            </p>
          </div>
        </div>
      </section>
    );
  }


  return (
    <section className="mb-6 rounded-[20px] border border-amber-400/40 bg-amber-500/10 p-5 shadow-[0_16px_45px_rgba(245,158,11,0.10)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-amber-300/30 bg-amber-400/10 text-xl">
            ⚠
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Publishing-Sicherheit
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Manuelle Prüfung erforderlich
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Inserat-AI konnte bei einer Veröffentlichung nicht eindeutig
              bestätigen, ob der Social-Post bereits veröffentlicht wurde.
              Deshalb wurde der automatische Wiederholungsversuch gestoppt.
            </p>
          </div>
        </div>

        <div className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-200">
          {jobs.length === 1
            ? "1 Prüfung offen"
            : `${jobs.length} Prüfungen offen`}
        </div>
      </div>


      <div className="mt-5 grid gap-3">
        {jobs.map(
          (
            job
          ) => {

            const timestamp =
              job.providerOperationUpdatedAt ||
              job.updatedAt;


            return (
              <article
                key={job.id}
                className="rounded-2xl border border-white/10 bg-[#071a2f]/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-black text-white">
                      {channelLabel(
                        job.channel
                      )}
                    </span>

                    <span className="text-xs font-bold text-slate-400">
                      {formatDate(
                        timestamp
                      )}
                    </span>
                  </div>

                  <span className="rounded-lg border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs font-black text-amber-200">
                    Automatischer Retry blockiert
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-200">
                  {job.caption}
                </p>

                <div className="mt-3 text-xs text-slate-400">
                  Status:{" "}
                  <span className="font-bold text-amber-200">
                    reconciliation_required
                  </span>
                </div>
              </article>
            );
          }
        )}
      </div>


      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-slate-300">
        Bitte diesen Post nicht erneut senden, bis der Status sicher geprüft
        wurde. Inserat-AI veröffentlicht ihn nicht automatisch ein zweites Mal.
      </div>
    </section>
  );
}