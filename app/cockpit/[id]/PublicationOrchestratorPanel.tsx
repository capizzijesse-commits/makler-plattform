"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";


type Market =
  | "CH"
  | "DE";


type PortalId =
  | "immoscout24_de"
  | "immowelt_de"
  | "kleinanzeigen_de"
  | "wg_gesucht_de"
  | "immobilien_de";


type PortalExternalReadinessStatus =
  | "READY_FOR_CONTROLLED_TEST"
  | "WAITING_FOR_CREDENTIALS"
  | "WAITING_FOR_PROVIDER_APPROVAL"
  | "BLOCKED";


type PortalExternalReadiness = {
  status:
    PortalExternalReadinessStatus;

  controlledNetworkTestAllowed:
    boolean;

  productionEnabled:
    boolean;

  networkAttempted:
    boolean;

  missingRequirements:
    string[];
};


type PortalSnapshot = {
  portal:
    PortalId;

  label:
    string;

  status:
    string;

  environment:
    string |
    null;

  externalReadiness?:
    PortalExternalReadiness |
    null;
};


type SocialConnection = {
  id:
    string;

  provider:
    string;

  channel:
    string;

  environment:
    string;

  externalAccountId:
    string;

  displayName:
    string |
    null;

  username:
    string |
    null;

  status:
    string;
};


type PublicationTarget = {
  id:
    string;

  targetKey:
    string;

  kind:
    string;

  provider:
    string |
    null;

  destination:
    string;

  connectionId:
    string |
    null;

  externalAccountId:
    string |
    null;

  environment:
    string |
    null;

  status:
    string;

  portalJobId:
    string |
    null;

  socialJobId:
    string |
    null;

  externalId:
    string |
    null;

  externalUrl:
    string |
    null;

  errorCode:
    string |
    null;

  errorMessage:
    string |
    null;

  publishedAt:
    string |
    null;
};


type PublicationRun = {
  id:
    string;

  status:
    string;

  startedAt:
    string |
    null;

  completedAt:
    string |
    null;

  createdAt:
    string;

  targets:
    PublicationTarget[];
};


type PublicationSummary = {
  total:
    number;

  pending:
    number;

  publishing:
    number;

  published:
    number;

  failed:
    number;

  actionRequired:
    number;

  skipped:
    number;
};


type PublicationCapabilities = {
  planEligible:
    boolean;

  orchestratorDispatchEnabled:
    boolean;

  portalQueueEnabled:
    boolean;

  canDispatchPortals:
    boolean;

  socialAutomaticDispatch:
    boolean;
};


type PublicationResponse = {
  success?:
    boolean;

  error?:
    string;

  message?:
    string;

  run?:
    PublicationRun |
    null;

  summary?:
    PublicationSummary;

  capabilities?:
    PublicationCapabilities;

  reconciled?:
    boolean;

  dispatched?:
    boolean;
};


type Props = {
  listingId:
    string;

  market:
    Market;

  onPublicationStateChange?:
    (
      state: {
        startedAt:
          string |
          null;

        publishedAt:
          string |
          null;
      }
    ) =>
      void;
};


const EMPTY_SUMMARY:
  PublicationSummary = {
    total:
      0,

    pending:
      0,

    publishing:
      0,

    published:
      0,

    failed:
      0,

    actionRequired:
      0,

    skipped:
      0,
  };


const DEFAULT_CAPABILITIES:
  PublicationCapabilities = {
    planEligible:
      false,

    orchestratorDispatchEnabled:
      false,

    portalQueueEnabled:
      false,

    canDispatchPortals:
      false,

    socialAutomaticDispatch:
      false,
  };


function portalLabel(
  value:
    string
) {

  switch (
    value
  ) {

    case "immoscout24_de":
      return "ImmoScout24";

    case "immowelt_de":
      return "immowelt";

    case "kleinanzeigen_de":
      return "Kleinanzeigen";

    case "wg_gesucht_de":
      return "WG-Gesucht";

    case "immobilien_de":
      return "Immobilien.de";

    default:
      return value;
  }
}


function isPortalReadyForControlledTest(
  portal:
    PortalSnapshot
): boolean {

  const external =
    portal.externalReadiness;


  return (
    portal.status ===
      "verified" &&
    portal.environment ===
      "test" &&
    external?.status ===
      "READY_FOR_CONTROLLED_TEST" &&
    external
      .controlledNetworkTestAllowed ===
      true &&
    external
      .productionEnabled ===
      false &&
    external
      .networkAttempted ===
      false
  );
}


function portalReadinessLabel(
  portal:
    PortalSnapshot
): string {

  switch (
    portal
      .externalReadiness
      ?.status
  ) {

    case "WAITING_FOR_CREDENTIALS":

      return "Zugangsdaten fehlen";

    case "WAITING_FOR_PROVIDER_APPROVAL":

      return "Portal-Freigabe ausstehend";

    case "BLOCKED":

      return "Blockiert";

    case "READY_FOR_CONTROLLED_TEST":

      return isPortalReadyForControlledTest(
        portal
      )
        ? "Bereit für Test"
        : "Verbindung prüfen";

    default:

      return "Nicht bereit";
  }
}


function portalReadinessDetails(
  portal:
    PortalSnapshot
): string | undefined {

  const requirements =
    portal
      .externalReadiness
      ?.missingRequirements;


  if (
    !requirements ||
    requirements.length ===
      0
  ) {

    return undefined;
  }


  return requirements.join(
    " · "
  );
}


function socialLabel(
  connection:
    SocialConnection
) {

  const account =
    connection.displayName ||
    connection.username ||
    connection.externalAccountId;


  switch (
    connection.channel
  ) {

    case "instagram_business":

      return (
        "Instagram · " +
        account
      );


    case "facebook_page":

      return (
        "Facebook · " +
        account
      );


    case "linkedin":

      return (
        "LinkedIn · " +
        account
      );


    case "tiktok":

      return (
        "TikTok · " +
        account
      );


    default:

      return (
        connection.channel +
        " · " +
        account
      );
  }
}


function destinationLabel(
  target:
    PublicationTarget
) {

  if (
    target.kind ===
    "portal"
  ) {

    return portalLabel(
      target.destination
    );
  }


  switch (
    target.destination
  ) {

    case "instagram_business":
      return "Instagram";

    case "facebook_page":
      return "Facebook";

    case "linkedin":
      return "LinkedIn";

    case "tiktok":
      return "TikTok";

    default:
      return target.destination;
  }
}


function statusLabel(
  status:
    string
) {

  switch (
    status
  ) {

    case "ready":
      return "Bereit";

    case "pending":
      return "Wartet";

    case "publishing":
      return "Wird veröffentlicht";

    case "published":
      return "Veröffentlicht";

    case "failed":
      return "Fehler";

    case "action_required":
      return "Aktion erforderlich";

    case "partial":
      return "Teilweise";

    case "skipped":
      return "Übersprungen";

    case "cancelled":
      return "Abgebrochen";

    default:
      return status;
  }
}


function statusClass(
  status:
    string
) {

  if (
    status ===
    "published"
  ) {

    return "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200";
  }


  if (
    status ===
      "failed" ||
    status ===
      "action_required"
  ) {

    return "border-rose-300/25 bg-rose-300/[0.07] text-rose-100";
  }


  if (
    status ===
      "publishing" ||
    status ===
      "partial"
  ) {

    return "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100";
  }


  return "border-white/10 bg-white/[0.035] text-slate-300";
}


export default function PublicationOrchestratorPanel({
  listingId,
  market,
  onPublicationStateChange,
}: Props) {

  const [
    portals,
    setPortals,
  ] =
    useState<
      PortalSnapshot[]
    >([]);


  const [
    socialConnections,
    setSocialConnections,
  ] =
    useState<
      SocialConnection[]
    >([]);


  const [
    selectedPortals,
    setSelectedPortals,
  ] =
    useState<
      Set<PortalId>
    >(
      new Set()
    );


  const [
    run,
    setRun,
  ] =
    useState<
      PublicationRun |
      null
    >(
      null
    );


  const [
    summary,
    setSummary,
  ] =
    useState<
      PublicationSummary
    >(
      EMPTY_SUMMARY
    );


  const [
    capabilities,
    setCapabilities,
  ] =
    useState<
      PublicationCapabilities
    >(
      DEFAULT_CAPABILITIES
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    busy,
    setBusy,
  ] =
    useState<
      "prepare" |
      "dispatch" |
      "reconcile" |
      null
    >(
      null
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );


  const applyPublicationResponse =
    useCallback(
      (
        data:
          PublicationResponse
      ) => {

        if (
          data.run !==
          undefined
        ) {

          const nextRun =
            data.run ??
            null;


          setRun(
            nextRun
          );


          if (
            nextRun &&
            onPublicationStateChange
          ) {

            onPublicationStateChange({
              startedAt:
                nextRun.startedAt,

              publishedAt:
                nextRun.status ===
                  "published"
                  ? nextRun.completedAt
                  : null,
            });
          }
        }


        if (
          data.summary
        ) {

          setSummary(
            data.summary
          );
        }


        if (
          data.capabilities
        ) {

          setCapabilities(
            data.capabilities
          );
        }
      },
      [
        onPublicationStateChange,
      ]
    );


  const load =
    useCallback(
      async () => {

        try {

          setLoading(
            true
          );

          setError(
            ""
          );


          const [
            runResponse,
            portalResponse,
            socialResponse,
          ] =
            await Promise.all([
              fetch(
                `/api/listings/${encodeURIComponent(
                  listingId
                )}/publication-run`,
                {
                  method:
                    "GET",

                  credentials:
                    "include",

                  cache:
                    "no-store",
                }
              ),

              market ===
                "DE"
                ? fetch(
                    "/api/portal-connections/de",
                    {
                      method:
                        "GET",

                      credentials:
                        "include",

                      cache:
                        "no-store",
                    }
                  )
                : Promise.resolve(
                    null
                  ),

              fetch(
                "/api/social-connections",
                {
                  method:
                    "GET",

                  credentials:
                    "include",

                  cache:
                    "no-store",
                }
              ),
            ]);


          if (
            runResponse.status ===
              401 ||
            portalResponse?.status ===
              401 ||
            socialResponse.status ===
              401
          ) {

            window.location.href =
              "/login";

            return;
          }


          const runData =
            (
              await runResponse.json()
            ) as PublicationResponse;


          if (
            !runResponse.ok ||
            !runData.success
          ) {

            throw new Error(
              runData.message ||
              runData.error ||
              "Veröffentlichungsstatus konnte nicht geladen werden."
            );
          }


          applyPublicationResponse(
            runData
          );


          if (
            portalResponse
          ) {

            const portalData =
              await portalResponse
                .json();


            if (
              !portalResponse.ok ||
              !portalData?.success
            ) {

              throw new Error(
                portalData?.error ||
                "Portalverbindungen konnten nicht geladen werden."
              );
            }


            const nextPortals:
              PortalSnapshot[] =
                Array.isArray(
                  portalData.portals
                )
                  ? portalData.portals
                  : [];


            setPortals(
              nextPortals
            );


            if (
              !runData.run
            ) {

              setSelectedPortals(
                new Set(
                  nextPortals
                    .filter(
                      (
                        portal
                      ) =>
                        isPortalReadyForControlledTest(
                          portal
                        )
                    )
                    .map(
                      (
                        portal
                      ) =>
                        portal.portal
                    )
                )
              );
            }
          }


          const socialData =
            await socialResponse
              .json()
              .catch(
                () =>
                  null
              );


          if (
            socialResponse.ok &&
            socialData?.success &&
            Array.isArray(
              socialData.connections
            )
          ) {

            setSocialConnections(
              socialData.connections
            );
          }
          else {

            /*
             * Social ist noch nicht Teil des
             * automatischen V1-Dispatchers.
             * Ein Fehler dort darf die
             * Portalsteuerung nicht blockieren.
             */
            setSocialConnections(
              []
            );
          }

        }
        catch (
          loadError
        ) {

          console.error(
            "Publication Orchestrator konnte nicht geladen werden:",
            loadError
          );


          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Veröffentlichungsstatus konnte nicht geladen werden."
          );
        }
        finally {

          setLoading(
            false
          );
        }
      },
      [
        listingId,
        market,
        applyPublicationResponse,
      ]
    );


  useEffect(
    () => {

      void load();
    },
    [
      load,
    ]
  );


  const reconcileByRunId =
    useCallback(
      async (
        runId:
          string,
        silent =
          false
      ) => {

        try {

          if (!silent) {

            setBusy(
              "reconcile"
            );

            setError(
              ""
            );

            setMessage(
              ""
            );
          }


          const response =
            await fetch(
              `/api/listings/${encodeURIComponent(
                listingId
              )}/publication-run`,
              {
                method:
                  "POST",

                credentials:
                  "include",

                cache:
                  "no-store",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    action:
                      "reconcile",

                    runId,
                  }),
              }
            );


          const data =
            (
              await response
                .json()
                .catch(
                  () =>
                    null
                )
            ) as
              PublicationResponse |
              null;


          if (
            response.status ===
            401
          ) {

            window.location.href =
              "/login";

            return;
          }


          if (
            !response.ok ||
            !data?.success
          ) {

            throw new Error(
              data?.message ||
              data?.error ||
              "Status konnte nicht synchronisiert werden."
            );
          }


          applyPublicationResponse(
            data
          );


          if (!silent) {

            setMessage(
              "Veröffentlichungsstatus wurde aktualisiert."
            );
          }

        }
        catch (
          reconcileError
        ) {

          if (!silent) {

            setError(
              reconcileError instanceof
                Error
                ? reconcileError.message
                : "Status konnte nicht synchronisiert werden."
            );
          }
        }
        finally {

          if (!silent) {

            setBusy(
              null
            );
          }
        }
      },
      [
        listingId,
        applyPublicationResponse,
      ]
    );


  const hasLinkedJob =
    Boolean(
      run?.targets.some(
        (
          target
        ) =>
          target.portalJobId ||
          target.socialJobId
      )
    );


  useEffect(
    () => {

      if (
        !run ||
        !hasLinkedJob ||
        run.status ===
          "published" ||
        run.status ===
          "cancelled"
      ) {

        return;
      }


      const timer =
        window.setInterval(
          () => {

            void reconcileByRunId(
              run.id,
              true
            );
          },
          5000
        );


      return () => {

        window.clearInterval(
          timer
        );
      };
    },
    [
      run,
      hasLinkedJob,
      reconcileByRunId,
    ]
  );


  const readyPortals =
    useMemo(
      () =>
        portals.filter(
          (
            portal
          ) =>
            isPortalReadyForControlledTest(
              portal
            )
        ),
      [
        portals,
      ]
    );


  const verifiedSocialConnections =
    useMemo(
      () =>
        socialConnections.filter(
          (
            connection
          ) =>
            connection.status ===
            "verified"
        ),
      [
        socialConnections,
      ]
    );


  function togglePortal(
    portal:
      PortalId
  ) {

    const snapshot =
      portals.find(
        (
          candidate
        ) =>
          candidate.portal ===
          portal
      );


    if (
      !snapshot ||
      !isPortalReadyForControlledTest(
        snapshot
      )
    ) {

      return;
    }


    setSelectedPortals(
      (
        current
      ) => {

        const next =
          new Set(
            current
          );


        if (
          next.has(
            portal
          )
        ) {

          next.delete(
            portal
          );
        }
        else {

          next.add(
            portal
          );
        }


        return next;
      }
    );
  }


  async function prepareRun() {

    if (
      busy ||
      selectedPortals.size ===
        0
    ) {

      return;
    }


    try {

      setBusy(
        "prepare"
      );

      setError(
        ""
      );

      setMessage(
        ""
      );


      const response =
        await fetch(
          `/api/listings/${encodeURIComponent(
            listingId
          )}/publication-run`,
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "prepare",

                targets:
                  Array.from(
                    selectedPortals
                  ).map(
                    (
                      portal
                    ) => ({
                      kind:
                        "portal",

                      portal,
                    })
                  ),
              }),
          }
        );


      const data =
        (
          await response
            .json()
            .catch(
              () =>
                null
            )
        ) as
          PublicationResponse |
          null;


      if (
        response.status ===
        401
      ) {

        window.location.href =
          "/login";

        return;
      }


      if (
        !response.ok ||
        !data?.success
      ) {

        throw new Error(
          data?.message ||
          data?.error ||
          "Veröffentlichungslauf konnte nicht vorbereitet werden."
        );
      }


      applyPublicationResponse(
        data
      );


      setMessage(
        "Ziele vorbereitet. Es wurde noch nichts extern veröffentlicht."
      );

    }
    catch (
      prepareError
    ) {

      setError(
        prepareError instanceof
          Error
          ? prepareError.message
          : "Veröffentlichungslauf konnte nicht vorbereitet werden."
      );
    }
    finally {

      setBusy(
        null
      );
    }
  }


  async function dispatchRun() {

    if (
      !run ||
      busy ||
      !capabilities
        .canDispatchPortals
    ) {

      return;
    }


    try {

      setBusy(
        "dispatch"
      );

      setError(
        ""
      );

      setMessage(
        ""
      );


      const response =
        await fetch(
          `/api/listings/${encodeURIComponent(
            listingId
          )}/publication-run`,
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "dispatch",

                runId:
                  run.id,
              }),
          }
        );


      const data =
        (
          await response
            .json()
            .catch(
              () =>
                null
            )
        ) as
          PublicationResponse |
          null;


      if (
        response.status ===
        401
      ) {

        window.location.href =
          "/login";

        return;
      }


      if (
        !response.ok ||
        !data?.success
      ) {

        throw new Error(
          data?.message ||
          data?.error ||
          "Veröffentlichung konnte nicht gestartet werden."
        );
      }


      applyPublicationResponse(
        data
      );


      setMessage(
        "Veröffentlichungsjobs wurden vorbereitet. Der Status wird automatisch synchronisiert."
      );

    }
    catch (
      dispatchError
    ) {

      setError(
        dispatchError instanceof
          Error
          ? dispatchError.message
          : "Veröffentlichung konnte nicht gestartet werden."
      );
    }
    finally {

      setBusy(
        null
      );
    }
  }


  const progress =
    summary.total > 0
      ? Math.round(
          (
            summary.published /
            summary.total
          ) *
          100
        )
      : 0;


  if (
    loading
  ) {

    return (
      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3 text-[11px] font-bold text-slate-400">
        Veröffentlichungscenter wird geladen ...
      </div>
    );
  }


  return (
    <div className="mt-4 grid gap-3">

      <div className="rounded-xl border border-violet-300/20 bg-violet-300/[0.05] p-3">

        <div className="flex items-start justify-between gap-3">

          <div>

            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
              Publishing Center
            </p>

            <p className="mt-1 text-xs font-black text-white">
              {run
                ? statusLabel(
                    run.status
                  )
                : "Ziele auswählen"}
            </p>

          </div>

          {run ? (
            <span
              className={
                "rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] " +
                statusClass(
                  run.status
                )
              }
            >
              {summary.published}/{summary.total}
            </span>
          ) : null}

        </div>


        {run ? (

          <div className="mt-3">

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">

              <span>
                Veröffentlicht
              </span>

              <span className="text-violet-100">
                {summary.published}/{summary.total}
              </span>

            </div>

            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">

              <div
                className="h-full rounded-full bg-violet-300 transition-all"
                style={{
                  width:
                    progress +
                    "%",
                }}
              />

            </div>

          </div>

        ) : null}

      </div>


      {error ? (

        <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-[10px] font-bold leading-4 text-rose-100">
          {error}
        </div>

      ) : null}


      {message ? (

        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 text-[10px] font-bold leading-4 text-emerald-100">
          {message}
        </div>

      ) : null}


      {!run ? (

        <>

          {market ===
          "DE" ? (

            <div className="grid gap-2">

              <p className="text-[10px] font-black text-slate-300">
                Immobilienportale
              </p>

              {portals.length ===
              0 ? (

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] font-bold text-slate-500">
                  Noch keine deutschen Portalverbindungen gefunden.
                </div>

              ) : (

                portals.map(
                  (
                    portal
                  ) => {

                    const ready =
                      isPortalReadyForControlledTest(
                        portal
                      );

                    const readinessLabel =
                      portalReadinessLabel(
                        portal
                      );

                    const readinessDetails =
                      portalReadinessDetails(
                        portal
                      );


                    const selected =
                      selectedPortals.has(
                        portal.portal
                      );


                    return (
                      <label
                        key={
                          portal.portal
                        }
                        className={
                          "flex items-center gap-2 rounded-xl border px-3 py-2 " +
                          (
                            ready
                              ? "cursor-pointer border-white/[0.08] bg-white/[0.025]"
                              : "cursor-not-allowed border-white/[0.05] bg-white/[0.015] opacity-55"
                          )
                        }
                      >

                        <input
                          type="checkbox"
                          checked={
                            selected
                          }
                          disabled={
                            !ready
                          }
                          onChange={() =>
                            togglePortal(
                              portal.portal
                            )
                          }
                          className="h-4 w-4"
                        />

                        <span className="min-w-0 flex-1 text-[10px] font-black text-white">
                          {portal.label}
                        </span>

                        <span
                          title={
                            readinessDetails
                          }
                          className={
                            ready
                              ? "text-[9px] font-black text-emerald-300"
                              : portal.externalReadiness?.status ===
                                  "BLOCKED"
                                ? "text-[9px] font-black text-rose-300"
                                : "text-[9px] font-black text-amber-200"
                          }
                        >
                          {readinessLabel}
                        </span>

                      </label>
                    );
                  }
                )

              )}

            </div>

          ) : (

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] font-bold leading-4 text-slate-500">
              Der Publication-Orchestrator V1 ist aktuell für die deutschen Immobilienportale vorbereitet.
            </div>

          )}


          <div className="grid gap-2">

            <div className="flex items-center justify-between gap-2">

              <p className="text-[10px] font-black text-slate-300">
                Social Media
              </p>

              <span className="text-[9px] font-black text-amber-200">
                folgt im nächsten Automationsblock
              </span>

            </div>


            {verifiedSocialConnections.length >
            0 ? (

              verifiedSocialConnections.map(
                (
                  connection
                ) => (

                  <div
                    key={
                      connection.id
                    }
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 opacity-65"
                  >

                    <span className="min-w-0 truncate text-[10px] font-bold text-slate-300">
                      {socialLabel(
                        connection
                      )}
                    </span>

                    <span className="text-[9px] font-black text-amber-200">
                      verbunden
                    </span>

                  </div>

                )
              )

            ) : (

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] font-bold text-slate-500">
                Keine verifizierte Social-Verbindung gefunden.
              </div>

            )}

          </div>


          <button
            type="button"
            disabled={
              busy !==
                null ||
              selectedPortals.size ===
                0
            }
            onClick={() =>
              void prepareRun()
            }
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ===
            "prepare"
              ? "Ziele werden vorbereitet ..."
              : "Veröffentlichung vorbereiten"}
          </button>


          <p className="text-[9px] font-semibold leading-4 text-slate-500">
            Dieser Schritt speichert nur die Zielauswahl. Es wird noch nichts an ein Portal oder Social Network übertragen.
          </p>

        </>

      ) : (

        <>

          <div className="grid gap-2">

            {run.targets.map(
              (
                target
              ) => (

                <div
                  key={
                    target.id
                  }
                  className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2"
                >

                  <div className="flex items-center justify-between gap-2">

                    <span className="min-w-0 truncate text-[10px] font-black text-white">
                      {destinationLabel(
                        target
                      )}
                    </span>

                    <span
                      className={
                        "rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.06em] " +
                        statusClass(
                          target.status
                        )
                      }
                    >
                      {statusLabel(
                        target.status
                      )}
                    </span>

                  </div>


                  {target.errorMessage ? (

                    <p className="mt-2 text-[9px] font-semibold leading-4 text-rose-200">
                      {target.errorMessage}
                    </p>

                  ) : null}


                  {target.externalUrl ? (

                    <a
                      href={
                        target.externalUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-[9px] font-black text-cyan-200 no-underline hover:underline"
                    >
                      Veröffentlichung öffnen
                    </a>

                  ) : null}

                </div>

              )
            )}

          </div>


          {run.status !==
          "published" ? (

            <button
              type="button"
              disabled={
                busy !==
                  null ||
                !capabilities
                  .canDispatchPortals
              }
              onClick={() =>
                void dispatchRun()
              }
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-300 to-cyan-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ===
              "dispatch"
                ? "Veröffentlichung wird gestartet ..."
                : "Alles veröffentlichen"}
            </button>

          ) : (

            <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/[0.07] px-3 py-3 text-center text-[11px] font-black text-emerald-100">
              Alle ausgewählten Ziele sind veröffentlicht.
            </div>

          )}


          {!capabilities
            .canDispatchPortals &&
          run.status !==
            "published" ? (

            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-3 py-2 text-[9px] font-semibold leading-4 text-amber-100">
              Sicherheitsmodus aktiv: Dispatcher oder Portal-Queue ist noch nicht freigegeben. „Alles veröffentlichen“ bleibt deshalb gesperrt.
            </div>

          ) : null}


          {hasLinkedJob &&
          run.status !==
            "published" ? (

            <button
              type="button"
              disabled={
                busy !==
                null
              }
              onClick={() =>
                void reconcileByRunId(
                  run.id
                )
              }
              className="inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-black text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-45"
            >
              {busy ===
              "reconcile"
                ? "Status wird aktualisiert ..."
                : "Status jetzt aktualisieren"}
            </button>

          ) : null}

        </>

      )}


      <div className="grid grid-cols-2 gap-2">

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">

          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
            Portale bereit
          </p>

          <p className="mt-1 text-sm font-black text-white">
            {readyPortals.length}
          </p>

        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">

          <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
            Social verbunden
          </p>

          <p className="mt-1 text-sm font-black text-white">
            {verifiedSocialConnections.length}
          </p>

        </div>

      </div>

    </div>
  );
}
