"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

type BrokerWorkflowPanelProps = {
  listingId: string;

  market:
    | "CH"
    | "DE";

  coreDataReady: boolean;
  imagesReady: boolean;
  listingTextReady: boolean;
};

type StepState =
  | "done"
  | "active"
  | "ready"
  | "pending";

type WorkflowData = {
  listingId: string;

  currentStage:
    string;

  valuationId:
    string | null;

  valuationCompletedAt:
    string | null;

  mandateConfirmedAt:
    string | null;

  packagePreparedAt:
    string | null;

  marketingApprovedAt:
    string | null;

  publicationStartedAt:
    string | null;

  publishedAt:
    string | null;
};

type WorkflowResponse = {
  success?: boolean;

  error?: string;

  workflow?:
    WorkflowData;
};

function StateBadge({
  state,
}: {
  state: StepState;
}) {
  const config = {
    done: {
      label:
        "Erledigt",

      className:
        "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200",
    },

    active: {
      label:
        "Jetzt",

      className:
        "border-cyan-300/30 bg-cyan-300/[0.09] text-cyan-100",
    },

    ready: {
      label:
        "Bereit",

      className:
        "border-amber-300/30 bg-amber-300/[0.08] text-amber-100",
    },

    pending: {
      label:
        "Danach",

      className:
        "border-white/10 bg-white/[0.035] text-slate-400",
    },
  } as const;

  const item =
    config[state];

  return (
    <span
      className={
        "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] " +
        item.className
      }
    >
      {item.label}
    </span>
  );
}

export default function BrokerWorkflowPanel({
  listingId,
  market,
  coreDataReady,
  imagesReady,
  listingTextReady,
}: BrokerWorkflowPanelProps) {
  const [
    workflow,
    setWorkflow,
  ] =
    useState<WorkflowData | null>(
      null
    );

  const [
    workflowLoading,
    setWorkflowLoading,
  ] =
    useState(true);

  const [
    workflowBusy,
    setWorkflowBusy,
  ] =
    useState(false);

  const [
    workflowError,
    setWorkflowError,
  ] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    const loadWorkflow =
      async () => {
        setWorkflowLoading(
          true
        );

        setWorkflowError(
          ""
        );

        try {
          const response =
            await fetch(
              `/api/listings/${encodeURIComponent(
                listingId
              )}/workflow`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as
              WorkflowResponse;

          if (
            !response.ok ||
            !data.success ||
            !data.workflow
          ) {
            throw new Error(
              data.error ||
                "Workflow konnte nicht geladen werden."
            );
          }

          if (!cancelled) {
            setWorkflow(
              data.workflow
            );
          }
        } catch (error) {
          if (!cancelled) {
            setWorkflowError(
              error instanceof
                Error
                ? error.message
                : "Workflow konnte nicht geladen werden."
            );
          }
        } finally {
          if (!cancelled) {
            setWorkflowLoading(
              false
            );
          }
        }
      };

    void loadWorkflow();

    return () => {
      cancelled =
        true;
    };
  }, [listingId]);

  const updateWorkflow =
    async (
      action:
        | "mandate_confirmed"
        | "mandate_revoked"
    ) => {
      if (workflowBusy) {
        return;
      }

      setWorkflowBusy(true);
      setWorkflowError("");

      try {
        const response =
          await fetch(
            `/api/listings/${encodeURIComponent(
              listingId
            )}/workflow`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  action,
                }),
            }
          );

        const data =
          (await response.json()) as
            WorkflowResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.workflow
        ) {
          throw new Error(
            data.error ||
              "Workflow konnte nicht aktualisiert werden."
          );
        }

        setWorkflow(
          data.workflow
        );
      } catch (error) {
        setWorkflowError(
          error instanceof Error
            ? error.message
            : "Workflow konnte nicht aktualisiert werden."
        );
      } finally {
        setWorkflowBusy(false);
      }
    };

  const objectPackageReady =
    coreDataReady &&
    imagesReady &&
    listingTextReady;

  const valuationDone =
    Boolean(
      workflow
        ?.valuationCompletedAt
    );

  const mandateDone =
    Boolean(
      workflow
        ?.mandateConfirmedAt
    );

  const packageDone =
    Boolean(
      workflow
        ?.packagePreparedAt
    );

  const approvalDone =
    Boolean(
      workflow
        ?.marketingApprovedAt
    );

  const publicationStarted =
    Boolean(
      workflow
        ?.publicationStartedAt
    );

  const published =
    Boolean(
      workflow
        ?.publishedAt
    );

  const valuationState:
    StepState =
      valuationDone
        ? "done"
        : market ===
            "CH"
          ? "active"
          : "pending";

  const mandateState:
    StepState =
      mandateDone
        ? "done"
        : valuationDone
          ? "active"
          : "pending";

  const packageState:
    StepState =
      packageDone
        ? "done"
        : mandateDone
          ? "active"
          : objectPackageReady
            ? "ready"
            : "pending";

  const approvalState:
    StepState =
      approvalDone
        ? "done"
        : packageDone
          ? "active"
          : "pending";

  const publicationState:
    StepState =
      published
        ? "done"
        : approvalDone ||
            publicationStarted
          ? "active"
          : "pending";

  const packageChecks = [
    {
      label:
        "Objektdaten",

      ready:
        coreDataReady,
    },

    {
      label:
        "Bilder",

      ready:
        imagesReady,
    },

    {
      label:
        "Inserattext",

      ready:
        listingTextReady,
    },
  ];

  const readyCount =
    packageChecks.filter(
      (item) =>
        item.ready
    ).length;

  return (
    <section className="mb-6 overflow-hidden rounded-[26px] border border-cyan-300/20 bg-gradient-to-br from-[#111f3f] via-[#0b1730] to-[#071126] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.3)] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Inserat-AI Makler-Workflow
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Vom Kundentermin bis online
          </h2>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300">
            Ein Objekt, ein Datenpaket.
            Bewertung, Auftrag,
            Vermarktung und
            Ver&ouml;ffentlichung bauen
            direkt aufeinander auf.
          </p>

          {workflowLoading ? (
            <p className="mt-3 text-xs font-bold text-slate-400">
              Workflow wird geladen ...
            </p>
          ) : null}

          {workflowError ? (
            <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-bold text-rose-100">
              {workflowError}
            </div>
          ) : null}
        </div>

        <div className="min-w-[210px] rounded-2xl border border-white/[0.08] bg-slate-950/35 p-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-xs font-black text-slate-300">
              Objektpaket
            </span>

            <strong className="text-xl font-black text-cyan-200">
              {readyCount}/3
            </strong>
          </div>

          <div className="mt-3 grid gap-2">
            {packageChecks.map(
              (item) => (
                <div
                  key={
                    item.label
                  }
                  className="flex items-center justify-between gap-3 text-[11px] font-bold"
                >
                  <span className="text-slate-400">
                    {item.label}
                  </span>

                  <span
                    className={
                      item.ready
                        ? "text-emerald-300"
                        : "text-amber-200"
                    }
                  >
                    {item.ready
                      ? "OK"
                      : "Offen"}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] text-sm font-black text-emerald-200">
              1
            </div>

            <StateBadge
              state="done"
            />
          </div>

          <h3 className="mt-4 text-sm font-black text-white">
            Akquise
          </h3>

          <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
            Kunde gewonnen und Objekt
            im Cockpit angelegt.
          </p>
        </div>

        <div
          className={
            valuationDone
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4"
              : "rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.055] p-4 shadow-[0_10px_30px_rgba(34,211,238,0.08)]"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-300/[0.1] text-sm font-black text-cyan-100">
              2
            </div>

            <StateBadge
              state={
                valuationState
              }
            />
          </div>

          <h3 className="mt-4 text-sm font-black text-white">
            Bewertung
          </h3>

          <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
            {valuationDone
              ? "Marktwert wurde ermittelt und dem Objekt-Workflow zugeordnet."
              : "Unterlagen und Objektdaten analysieren und Marktwert vorbereiten."}
          </p>

          {market === "CH" ? (
            <Link
              href={
                "/bewertung?listingId=" +
                listingId
              }
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/[0.09] px-3 py-2 text-xs font-black text-cyan-100 no-underline transition hover:bg-cyan-300/[0.14]"
            >
              {valuationDone
                ? "Bewertung \u00f6ffnen"
                : "Bewertung starten"}
            </Link>
          ) : (
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-center text-[11px] font-bold text-slate-400">
              Bewertung aktuell CH
            </div>
          )}
        </div>

        <div
          className={
            mandateDone
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4"
              : valuationDone
                ? "rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.055] p-4"
                : "rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-300">
              3
            </div>

            <StateBadge
              state={
                mandateState
              }
            />
          </div>

          <h3 className="mt-4 text-sm font-black text-white">
            Auftrag
          </h3>

          <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
            {mandateDone
              ? "Vermarktungsauftrag wurde best\u00e4tigt und dauerhaft gespeichert."
              : "Eigent&uuml;mer gibt den Vermarktungsauftrag frei. Danach wird dasselbe Datenpaket weiterverwendet."}
          </p>

          {mandateDone ? (
            <button
              type="button"
              disabled={
                workflowBusy
              }
              onClick={() =>
                void updateWorkflow(
                  "mandate_revoked"
                )
              }
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {workflowBusy
                ? "Wird gespeichert ..."
                : "Auftrag zur\u00fccknehmen"}
            </button>
          ) : valuationDone ? (
            <button
              type="button"
              disabled={
                workflowBusy
              }
              onClick={() =>
                void updateWorkflow(
                  "mandate_confirmed"
                )
              }
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/[0.1] px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {workflowBusy
                ? "Wird gespeichert ..."
                : "Auftrag erhalten"}
            </button>
          ) : (
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-center text-[11px] font-bold text-slate-500">
              Nach abgeschlossener Bewertung
            </div>
          )}
        </div>

        <div
          className={
            packageDone
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4"
              : mandateDone
                ? "rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.055] p-4"
                : objectPackageReady
                  ? "rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4"
                  : "rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200">
              4
            </div>

            <StateBadge
              state={
                packageState
              }
            />
          </div>

          <h3 className="mt-4 text-sm font-black text-white">
            Objektpaket
          </h3>

          <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
            Inserat, Bilder, Expos&eacute; und
            Social-Inhalte werden aus
            denselben Objektdaten
            erzeugt.
          </p>

          {mandateDone ? (
            <Link
              href={
                "/cockpit/" +
                listingId +
                "/edit"
              }
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/[0.09] px-3 py-2 text-xs font-black text-cyan-100 no-underline transition hover:bg-cyan-300/[0.14]"
            >
              Vermarktung vorbereiten
            </Link>
          ) : (
            <Link
              href={
                "/cockpit/" +
                listingId +
                "/edit"
              }
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2 text-xs font-black text-amber-100 no-underline transition hover:bg-amber-300/[0.11]"
            >
              Objektpaket pr&uuml;fen
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-300">
              5
            </div>

            <StateBadge
              state={
                approvalState
              }
            />
          </div>

          <h3 className="mt-4 text-sm font-black text-white">
            Freigabe
          </h3>

          <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
            Makler kontrolliert nur
            noch das fertige Paket und
            gibt die Vermarktung frei.
          </p>
        </div>

        <div className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-violet-300/20 bg-violet-300/[0.07] text-sm font-black text-violet-200">
              6
            </div>

            <StateBadge
              state={
                publicationState
              }
            />
          </div>

          <h3 className="mt-4 text-sm font-black text-white">
            Ver&ouml;ffentlichung
          </h3>

          <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
            Immobilienportale und
            Social Media aus einem
            Vorgang steuern.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href="#portal-publishing"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-2 py-2 text-[11px] font-black text-emerald-100 no-underline"
            >
              Portale
            </a>

            <Link
              href={
                "/dashboard/social-media?listingId=" +
                listingId
              }
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/[0.06] px-2 py-2 text-[11px] font-black text-violet-100 no-underline"
            >
              Social Media
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] px-4 py-3">
        <p className="text-xs font-semibold leading-5 text-slate-300">
          Ziel: Beim Kunden aufnehmen,
          bewerten, Auftrag erhalten,
          Paket automatisch erstellen,
          freigeben und noch aus dem
          Auto ver&ouml;ffentlichen.
        </p>
      </div>
    </section>
  );
}
