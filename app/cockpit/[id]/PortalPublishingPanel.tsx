"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";


type PortalId =
  | "immoscout24_de"
  | "immowelt_de"
  | "kleinanzeigen_de"
  | "wg_gesucht_de"
  | "immobilien_de";


type PortalSnapshot = {
  portal: PortalId;
  label: string;
  status: string;
  environment: string | null;
};


type PortalJob = {
  id: string;
  portal: string;
  provider: string;
  environment: string;
  action: string;
  status: string;

  attemptCount: number;
  maxAttempts: number;

  nextAttemptAt?: string | null;
  lastAttemptAt?: string | null;

  providerOperationState?: string | null;
  providerOperationUpdatedAt?: string | null;

  errorCode?: string | null;
  errorMessage?: string | null;

  completedAt?: string | null;
  failedAt?: string | null;

  externalPublicationUrl?: string | null;

  createdAt: string;
  updatedAt: string;
};


type Props = {
  listingId: string;
  countryCode?: string | null;
  unlockStatus: string;
};


const PORTAL_ORDER:
  readonly PortalId[] = [
    "immoscout24_de",
    "immowelt_de",
    "kleinanzeigen_de",
    "wg_gesucht_de",
    "immobilien_de",
  ];


function getStatusLabel(
  status:
    string
):
  string {

  switch (status) {

    case "verified":
      return "Verifiziert";

    case "configured":
      return "Konfiguriert";

    case "queued":
      return "In Warteschlange";

    case "scheduled":
      return "Geplant";

    case "processing":
      return "Wird verarbeitet";

    case "succeeded":
      return "Übertragen";

    case "failed":
      return "Fehler";

    case "cancelled":
      return "Abgebrochen";

    default:
      return "Nicht verbunden";
  }
}


function formatPortalDate(
  value:
    string |
    null |
    undefined
):
  string {

  if (!value) {
    return "–";
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
    return "–";
  }

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",
    }
  ).format(
    date
  );
}


function getProviderStateLabel(
  state:
    string |
    null |
    undefined
):
  string {

  switch (state) {

    case "reconciliation_required":
      return "Manuelle Prüfung erforderlich";

    case "reconciled_succeeded":
      return "Manuell bestätigt";

    case "reconciled_not_applied":
      return "Nicht angewendet bestätigt";

    case "completed":
      return "Provider abgeschlossen";

    case null:
    case undefined:
    case "":
      return "Noch keine Provider-Operation";

    default:
      return state;
  }
}


function requiresManualReview(
  job:
    PortalJob
):
  boolean {

  return (
    job.providerOperationState ===
    "reconciliation_required"
  );
}


function retryScheduled(
  job:
    PortalJob
):
  boolean {

  return (
    job.status ===
      "failed" &&
    typeof job.nextAttemptAt ===
      "string" &&
    job.nextAttemptAt.length >
      0 &&
    !requiresManualReview(
      job
    )
  );
}


function attemptsExhausted(
  job:
    PortalJob
):
  boolean {

  return (
    job.attemptCount >=
      job.maxAttempts &&
    job.status ===
      "failed" &&
    !job.nextAttemptAt
  );
}

export default function PortalPublishingPanel({
  listingId,
  countryCode,
  unlockStatus,
}: Props) {

  const [
    portals,
    setPortals,
  ] =
    useState<PortalSnapshot[]>([]);

  const [
    jobs,
    setJobs,
  ] =
    useState<PortalJob[]>([]);

  const [
    queueEnabled,
    setQueueEnabled,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busyPortal,
    setBusyPortal,
  ] =
    useState<PortalId | null>(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState("");


  const isGermanListing =
    countryCode
      ?.trim()
      .toUpperCase() ===
    "DE";


  const unlocked =
    unlockStatus ===
      "paid" ||
    unlockStatus ===
      "included";


  const load =
    useCallback(
      async () => {

        if (
          !isGermanListing
        ) {

          setLoading(
            false
          );

          return;
        }


        try {

          setLoading(
            true
          );

          setMessage(
            ""
          );


          const [
            portalResponse,
            jobsResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/portal-connections/de",
                {
                  method:
                    "GET",

                  credentials:
                    "include",

                  cache:
                    "no-store",
                }
              ),

              fetch(
                `/api/portal-publish-jobs?listingId=${encodeURIComponent(
                  listingId
                )}`,
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
            portalResponse.status ===
              401 ||
            jobsResponse.status ===
              401
          ) {

            window.location.href =
              "/login";

            return;
          }


          const portalData =
            await portalResponse
              .json();

          const jobsData =
            await jobsResponse
              .json();


          if (
            !portalResponse.ok ||
            !portalData?.success
          ) {

            throw new Error(
              portalData?.error ||
              "Portalstatus konnte nicht geladen werden."
            );
          }


          if (
            !jobsResponse.ok ||
            !jobsData?.success
          ) {

            throw new Error(
              jobsData?.error ||
              "Portal-Jobs konnten nicht geladen werden."
            );
          }


          setPortals(
            Array.isArray(
              portalData.portals
            )
              ? portalData.portals
              : []
          );


          setJobs(
            Array.isArray(
              jobsData.jobs
            )
              ? jobsData.jobs
              : []
          );


          setQueueEnabled(
            jobsData.queueEnabled ===
              true
          );
        }
        catch (
          error
        ) {

          console.error(
            "Portal-Publishing konnte nicht geladen werden:",
            error
          );

          setMessage(
            error instanceof Error
              ? error.message
              : "Portalstatus konnte nicht geladen werden."
          );
        }
        finally {

          setLoading(
            false
          );
        }
      },
      [
        isGermanListing,
        listingId,
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


  const latestJobByPortal =
    useMemo(
      () => {

        const result =
          new Map<
            string,
            PortalJob
          >();


        for (
          const job of jobs
        ) {

          if (
            !result.has(
              job.portal
            )
          ) {

            result.set(
              job.portal,
              job
            );
          }
        }


        return result;
      },
      [
        jobs,
      ]
    );


  async function preparePortalJob(
    portal:
      PortalId
  ) {

    if (
      !unlocked ||
      !queueEnabled
    ) {
      return;
    }


    try {

      setBusyPortal(
        portal
      );

      setMessage(
        ""
      );


      const response =
        await fetch(
          "/api/portal-publish-jobs",
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
                listingId,
                portal,
              }),
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => null
          );


      if (
        !response.ok ||
        !data?.success
      ) {

        throw new Error(
          data?.message ||
          data?.error ||
          "Portal-Job konnte nicht vorbereitet werden."
        );
      }


      setMessage(
        "Portal-Job wurde vorbereitet."
      );

      await load();
    }
    catch (
      error
    ) {

      console.error(
        "Portal-Job konnte nicht vorbereitet werden:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Portal-Job konnte nicht vorbereitet werden."
      );
    }
    finally {

      setBusyPortal(
        null
      );
    }
  }


  if (
    !isGermanListing
  ) {
    return null;
  }


  return (
    <section
      style={{
        marginTop:
          "12px",

        padding:
          "14px",

        border:
          "1px solid rgba(251,191,36,.34)",

        borderRadius:
          "14px",

        background:
          "linear-gradient(135deg,rgba(15,23,42,.96),rgba(120,53,15,.22))",
      }}
    >
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "10px",

          marginBottom:
            "12px",
        }}
      >
        <div>
          <small
            style={{
              display:
                "block",

              color:
                "#fbbf24",

              fontWeight:
                900,

              letterSpacing:
                ".08em",
            }}
          >
            PORTAL-AUTOMATION
          </small>

          <strong
            style={{
              display:
                "block",

              marginTop:
                "4px",

              color:
                "#ffffff",
            }}
          >
            Auf Portale übertragen
          </strong>
        </div>

        <span
          title={
            queueEnabled
              ? "Queue aktiv"
              : "Queue deaktiviert"
          }
          style={{
            width:
              "10px",

            height:
              "10px",

            borderRadius:
              "999px",

            background:
              queueEnabled
                ? "#22c55e"
                : "#f59e0b",
          }}
        />
      </div>


      {!unlocked && (
        <div
          style={{
            marginBottom:
              "10px",

            padding:
              "10px",

            borderRadius:
              "9px",

            background:
              "rgba(245,158,11,.12)",

            color:
              "#fcd34d",

            fontSize:
              "12px",

            fontWeight:
              800,
          }}
        >
          Objekt noch nicht für Portal-Transfer freigeschaltet.
        </div>
      )}


      {!queueEnabled && (
        <div
          style={{
            marginBottom:
              "10px",

            padding:
              "10px",

            borderRadius:
              "9px",

            background:
              "rgba(59,130,246,.10)",

            color:
              "#bfdbfe",

            fontSize:
              "12px",

            lineHeight:
              1.45,
          }}
        >
          Automation vorbereitet – Queue derzeit deaktiviert.
        </div>
      )}


      {loading ? (
        <span
          style={{
            color:
              "#cbd5e1",

            fontSize:
              "12px",
          }}
        >
          Portalstatus wird geladen …
        </span>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              "8px",
          }}
        >
          {PORTAL_ORDER.map(
            (
              portalId
            ) => {

              const portal =
                portals.find(
                  (
                    item
                  ) =>
                    item.portal ===
                    portalId
                );


              if (!portal) {
                return null;
              }


              const job =
                latestJobByPortal.get(
                  portalId
                );


              const connectionReady =
                portal.status ===
                "verified";


              const canPrepare =
                unlocked &&
                queueEnabled &&
                connectionReady;


              return (
                <div
                  key={
                    portalId
                  }
                  style={{
                    padding:
                      "10px",

                    border:
                      "1px solid rgba(148,163,184,.16)",

                    borderRadius:
                      "10px",

                    background:
                      "rgba(2,6,23,.32)",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      gap:
                        "8px",
                    }}
                  >
                    <strong
                      style={{
                        color:
                          "#ffffff",

                        fontSize:
                          "13px",
                      }}
                    >
                      {portal.label}
                    </strong>

                    <span
                      style={{
                        color:
                          connectionReady
                            ? "#86efac"
                            : "#94a3b8",

                        fontSize:
                          "11px",

                        fontWeight:
                          800,
                      }}
                    >
                      {getStatusLabel(
                        portal.status
                      )}
                    </span>
                  </div>


                  {job && (
                    <div
                      style={{
                        marginTop:
                          "8px",

                        display:
                          "grid",

                        gap:
                          "6px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "space-between",

                          gap:
                            "8px",
                        }}
                      >
                        <span
                          style={{
                            color:
                              job.status ===
                                "failed"
                                ? "#fca5a5"
                                : job.status ===
                                    "succeeded"
                                  ? "#86efac"
                                  : "#fbbf24",

                            fontSize:
                              "11px",

                            fontWeight:
                              900,
                          }}
                        >
                          Job:{" "}
                          {getStatusLabel(
                            job.status
                          )}
                        </span>

                        <span
                          style={{
                            color:
                              "#cbd5e1",

                            fontSize:
                              "10px",

                            fontWeight:
                              800,
                          }}
                        >
                          Versuch{" "}
                          {Math.min(
                            job.attemptCount,
                            job.maxAttempts
                          )}
                          /
                          {job.maxAttempts}
                        </span>
                      </div>


                      {requiresManualReview(
                        job
                      ) && (
                        <div
                          style={{
                            padding:
                              "8px 9px",

                            border:
                              "1px solid rgba(248,113,113,.45)",

                            borderRadius:
                              "8px",

                            background:
                              "rgba(127,29,29,.18)",

                            color:
                              "#fecaca",

                            fontSize:
                              "11px",

                            fontWeight:
                              900,

                            lineHeight:
                              1.4,
                          }}
                        >
                          ⚠ Manuelle Prüfung erforderlich
                        </div>
                      )}


                      {retryScheduled(
                        job
                      ) && (
                        <div
                          style={{
                            padding:
                              "7px 9px",

                            borderRadius:
                              "8px",

                            background:
                              "rgba(59,130,246,.10)",

                            color:
                              "#bfdbfe",

                            fontSize:
                              "10px",

                            fontWeight:
                              800,
                          }}
                        >
                          ↻ Automatischer Retry:{" "}
                          {formatPortalDate(
                            job.nextAttemptAt
                          )}
                        </div>
                      )}


                      {attemptsExhausted(
                        job
                      ) && (
                        <div
                          style={{
                            padding:
                              "7px 9px",

                            borderRadius:
                              "8px",

                            background:
                              "rgba(127,29,29,.16)",

                            color:
                              "#fca5a5",

                            fontSize:
                              "10px",

                            fontWeight:
                              800,
                          }}
                        >
                          Maximale Anzahl Versuche erreicht
                        </div>
                      )}


                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "1fr 1fr",

                          gap:
                            "5px 8px",

                          color:
                            "#94a3b8",

                          fontSize:
                            "10px",

                          lineHeight:
                            1.35,
                        }}
                      >
                        <span>
                          Letzter Versuch
                        </span>

                        <strong
                          style={{
                            color:
                              "#cbd5e1",

                            textAlign:
                              "right",
                          }}
                        >
                          {formatPortalDate(
                            job.lastAttemptAt
                          )}
                        </strong>

                        <span>
                          Provider
                        </span>

                        <strong
                          style={{
                            color:
                              requiresManualReview(
                                job
                              )
                                ? "#fca5a5"
                                : "#cbd5e1",

                            textAlign:
                              "right",
                          }}
                        >
                          {getProviderStateLabel(
                            job.providerOperationState
                          )}
                        </strong>
                      </div>


                      {job.errorCode && (
                        <div
                          style={{
                            padding:
                              "7px 8px",

                            borderRadius:
                              "8px",

                            background:
                              "rgba(127,29,29,.12)",

                            color:
                              "#fecaca",

                            fontSize:
                              "10px",

                            lineHeight:
                              1.4,
                          }}
                        >
                          <strong>
                            {job.errorCode}
                          </strong>

                          {job.errorMessage && (
                            <>
                              <br />
                              {job.errorMessage}
                            </>
                          )}
                        </div>
                      )}


                      {job.status ===
                        "succeeded" &&
                        job.completedAt && (
                          <div
                            style={{
                              color:
                                "#86efac",

                              fontSize:
                                "10px",

                              fontWeight:
                                800,
                            }}
                          >
                            ✓ Erfolgreich abgeschlossen:{" "}
                            {formatPortalDate(
                              job.completedAt
                            )}
                          </div>
                        )}


                      {job.externalPublicationUrl && (
                        <a
                          href={
                            job.externalPublicationUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color:
                              "#fbbf24",

                            fontSize:
                              "10px",

                            fontWeight:
                              900,

                            textDecoration:
                              "none",
                          }}
                        >
                          Portal-Inserat öffnen ↗
                        </a>
                      )}
                    </div>
                  )}


                  <button
                    type="button"
                    disabled={
                      !canPrepare ||
                      busyPortal ===
                        portalId
                    }
                    onClick={() =>
                      void preparePortalJob(
                        portalId
                      )
                    }
                    style={{
                      width:
                        "100%",

                      minHeight:
                        "34px",

                      marginTop:
                        "8px",

                      border:
                        "1px solid rgba(251,191,36,.35)",

                      borderRadius:
                        "9px",

                      background:
                        canPrepare
                          ? "linear-gradient(135deg,#f59e0b,#f97316)"
                          : "rgba(51,65,85,.55)",

                      color:
                        canPrepare
                          ? "#ffffff"
                          : "#94a3b8",

                      cursor:
                        canPrepare
                          ? "pointer"
                          : "not-allowed",

                      fontWeight:
                        900,
                    }}
                  >
                    {busyPortal ===
                    portalId
                      ? "Wird vorbereitet …"
                      : job
                        ? "Erneut prüfen"
                        : "Übertragung vorbereiten"}
                  </button>
                </div>
              );
            }
          )}
        </div>
      )}


      {message && (
        <div
          role="status"
          style={{
            marginTop:
              "10px",

            color:
              "#fde68a",

            fontSize:
              "12px",
          }}
        >
          {message}
        </div>
      )}
    </section>
  );
}