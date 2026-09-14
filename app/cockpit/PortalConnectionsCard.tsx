"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useLocale,
} from "next-intl";


type PortalId =
  | "immoscout24_ch"
  | "homegate_ch"
  | "newhome_ch";


type PortalAvailability =
  | "available"
  | "coming_soon";


type PortalStatus =
  | "not_configured"
  | "configured"
  | "verified"
  | "error";


type PortalItem = {
  portal: PortalId;
  label: string;
  status: PortalStatus;
  databaseConfigured: boolean;
  availability: PortalAvailability;
  feedReady: boolean;
  listingCount: number;
  candidateCount: number;
  waitingForUnlockCount: number;
  validationErrorCount: number;
};


type PortalApiResponse = {
  success?: boolean;

  publishEnabled?: boolean;

  feed?: {
    valid?: boolean;
    listingCount?: number;
    validationErrorCount?: number;
  };

  portals?: PortalItem[];

  error?: string;
};


type ErrorKind =
  | "unauthorized"
  | "generic"
  | null;


type Language =
  | "de"
  | "it"
  | "fr"
  | "en";


const COPY = {
  de: {
    eyebrow:
      "Portal-Anbindung",

    title:
      "Immobilienportale",

    description:
      "Bereite deine Inserate für die direkte Übertragung an Immobilienportale vor.",

    loading:
      "Portalstatus wird geladen …",

    feedReady:
      "Feed bereit",

    objects:
      "Objekte",

    noObjects:
      "Keine übertragbaren Objekte",

    notConnected:
      "Nicht verbunden",

    configured:
      "Konfiguriert",

    verified:
      "Verbunden",

    errorStatus:
      "Verbindungsfehler",

    comingSoon:
      "Demnächst verfügbar",

    connectSoon:
      "Verbinden folgt",

    publishOff:
      "Automatische Veröffentlichung ist noch deaktiviert.",

    unauthorized:
      "Bitte melde dich erneut an.",

    genericError:
      "Der Portalstatus konnte nicht geladen werden.",

    retry:
      "Neu laden",
  },

  it: {
    eyebrow:
      "Collegamento portali",

    title:
      "Portali immobiliari",

    description:
      "Prepara i tuoi annunci per il trasferimento diretto ai portali immobiliari.",

    loading:
      "Caricamento dello stato dei portali …",

    feedReady:
      "Feed pronto",

    objects:
      "immobili",

    noObjects:
      "Nessun immobile trasferibile",

    notConnected:
      "Non collegato",

    configured:
      "Configurato",

    verified:
      "Collegato",

    errorStatus:
      "Errore di connessione",

    comingSoon:
      "Prossimamente",

    connectSoon:
      "Collegamento in arrivo",

    publishOff:
      "La pubblicazione automatica è ancora disattivata.",

    unauthorized:
      "Accedi nuovamente.",

    genericError:
      "Impossibile caricare lo stato dei portali.",

    retry:
      "Ricarica",
  },

  fr: {
    eyebrow:
      "Connexion aux portails",

    title:
      "Portails immobiliers",

    description:
      "Préparez vos annonces pour leur transmission directe aux portails immobiliers.",

    loading:
      "Chargement du statut des portails …",

    feedReady:
      "Flux prêt",

    objects:
      "objets",

    noObjects:
      "Aucun objet transférable",

    notConnected:
      "Non connecté",

    configured:
      "Configuré",

    verified:
      "Connecté",

    errorStatus:
      "Erreur de connexion",

    comingSoon:
      "Bientôt disponible",

    connectSoon:
      "Connexion à venir",

    publishOff:
      "La publication automatique est encore désactivée.",

    unauthorized:
      "Veuillez vous reconnecter.",

    genericError:
      "Le statut des portails n’a pas pu être chargé.",

    retry:
      "Recharger",
  },

  en: {
    eyebrow:
      "Portal connection",

    title:
      "Property portals",

    description:
      "Prepare your listings for direct transfer to property portals.",

    loading:
      "Loading portal status …",

    feedReady:
      "Feed ready",

    objects:
      "listings",

    noObjects:
      "No transferable listings",

    notConnected:
      "Not connected",

    configured:
      "Configured",

    verified:
      "Connected",

    errorStatus:
      "Connection error",

    comingSoon:
      "Coming soon",

    connectSoon:
      "Connection coming soon",

    publishOff:
      "Automatic publishing is still disabled.",

    unauthorized:
      "Please sign in again.",

    genericError:
      "The portal status could not be loaded.",

    retry:
      "Reload",
  },
} as const;


function normalizeLanguage(
  locale: string
): Language {

  const language =
    locale
      .slice(0, 2)
      .toLowerCase();

  if (
    language === "it" ||
    language === "fr" ||
    language === "en"
  ) {
    return language;
  }

  return "de";
}


function statusDotClass(
  portal: PortalItem
): string {

  if (
    portal.availability ===
    "coming_soon"
  ) {
    return "bg-slate-400";
  }

  if (
    portal.status ===
    "verified"
  ) {
    return "bg-emerald-400";
  }

  if (
    portal.status ===
    "configured"
  ) {
    return "bg-amber-400";
  }

  if (
    portal.status ===
    "error"
  ) {
    return "bg-red-400";
  }

  return "bg-slate-500";
}


export default function PortalConnectionsCard() {

  const locale =
    useLocale();

  const language =
    normalizeLanguage(
      locale
    );

  const copy =
    COPY[language];

  const candidateCopy =
    language === "it"
      ? {
          swissObjects:
            "immobili svizzeri",
          transferable:
            "abilitati al trasferimento",
          waiting:
            "in attesa di attivazione",
        }
      : language === "fr"
        ? {
            swissObjects:
              "biens suisses",
            transferable:
              "autorisés pour la transmission",
            waiting:
              "en attente d’activation",
          }
        : language === "en"
          ? {
              swissObjects:
                "Swiss listings",
              transferable:
                "approved for transfer",
              waiting:
                "waiting for activation",
            }
          : {
              swissObjects:
                "Schweizer Objekte",
              transferable:
                "für Übertragung freigeschaltet",
              waiting:
                "warten auf Freischaltung",
            };


  const [
    portals,
    setPortals,
  ] =
    useState<PortalItem[]>(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    errorKind,
    setErrorKind,
  ] =
    useState<ErrorKind>(
      null
    );


  const [
    reloadToken,
    setReloadToken,
  ] =
    useState(0);


  useEffect(() => {

    const controller =
      new AbortController();


    async function loadPortals() {

      try {

        setLoading(true);
        setErrorKind(null);


        const response =
          await fetch(
            "/api/portal-connections",
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
          setErrorKind(
            "unauthorized"
          );

          return;
        }


        if (!response.ok) {
          throw new Error(
            `Portal API HTTP ${response.status}`
          );
        }


        const data =
          await response.json() as
            PortalApiResponse;


        if (
          data.success !== true ||
          !Array.isArray(
            data.portals
          )
        ) {
          throw new Error(
            "Ungültige Portal-API-Antwort."
          );
        }


        setPortals(
          data.portals
        );
      }
      catch (error) {

        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Portal status loading failed:",
          error
        );

        setErrorKind(
          "generic"
        );
      }
      finally {

        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }


    void loadPortals();


    return () => {
      controller.abort();
    };
  }, [
    reloadToken,
  ]);


  function portalStatusText(
    portal: PortalItem
  ): string {

    if (
      portal.availability ===
      "coming_soon"
    ) {
      return copy.comingSoon;
    }

    if (
      portal.status ===
      "verified"
    ) {
      return copy.verified;
    }

    if (
      portal.status ===
      "configured"
    ) {
      return copy.configured;
    }

    if (
      portal.status ===
      "error"
    ) {
      return copy.errorStatus;
    }

    return copy.notConnected;
  }


  return (
    <section
      className="
        overflow-hidden
        rounded-[28px]
        border
        border-amber-400/15
        bg-[#101010]
        shadow-[0_24px_70px_rgba(0,0,0,0.24)]
      "
    >
      <div
        className="
          flex
          flex-col
          gap-4
          border-b
          border-white/8
          px-5
          py-5
          sm:px-6
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
      >
        <div>
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.18em]
              text-amber-400
            "
          >
            {copy.eyebrow}
          </p>

          <h2
            className="
              mt-2
              text-xl
              font-semibold
              tracking-tight
              text-white
              sm:text-2xl
            "
          >
            {copy.title}
          </h2>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-white/55
            "
          >
            {copy.description}
          </p>
        </div>

        <div
          className="
            inline-flex
            w-fit
            items-center
            gap-2
            rounded-full
            border
            border-white/10
            bg-white/[0.03]
            px-3
            py-2
            text-xs
            text-white/50
          "
        >
          <span
            className="
              h-2
              w-2
              rounded-full
              bg-amber-400
            "
          />

          {copy.publishOff}
        </div>
      </div>


      <div
        className="
          p-4
          sm:p-5
          lg:p-6
        "
      >
        {loading ? (
          <div
            className="
              rounded-2xl
              border
              border-white/8
              bg-white/[0.025]
              px-4
              py-8
              text-center
              text-sm
              text-white/45
            "
          >
            {copy.loading}
          </div>
        ) : errorKind ? (
          <div
            className="
              flex
              flex-col
              items-center
              justify-center
              gap-3
              rounded-2xl
              border
              border-red-400/15
              bg-red-400/[0.035]
              px-4
              py-7
              text-center
            "
          >
            <p
              className="
                text-sm
                text-white/60
              "
            >
              {errorKind ===
              "unauthorized"
                ? copy.unauthorized
                : copy.genericError}
            </p>

            {errorKind ===
            "generic" ? (
              <button
                type="button"
                onClick={() =>
                  setReloadToken(
                    (value) =>
                      value + 1
                  )
                }
                className="
                  rounded-xl
                  border
                  border-amber-400/30
                  bg-amber-400/10
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-amber-300
                  transition
                  hover:bg-amber-400/15
                "
              >
                {copy.retry}
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-1
              gap-3
              xl:grid-cols-3
            "
          >
            {portals.map(
              (portal) => {

                const comingSoon =
                  portal.availability ===
                  "coming_soon";

                return (
                  <article
                    key={
                      portal.portal
                    }
                    className="
                      flex
                      min-h-[190px]
                      flex-col
                      rounded-2xl
                      border
                      border-white/8
                      bg-white/[0.025]
                      p-4
                      sm:p-5
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-3
                      "
                    >
                      <div>
                        <h3
                          className="
                            text-base
                            font-semibold
                            text-white
                          "
                        >
                          {
                            portal.label
                          }
                        </h3>

                        <div
                          className="
                            mt-2
                            flex
                            items-center
                            gap-2
                            text-xs
                            text-white/50
                          "
                        >
                          <span
                            className={`
                              h-2
                              w-2
                              rounded-full
                              ${statusDotClass(
                                portal
                              )}
                            `}
                          />

                          {
                            portalStatusText(
                              portal
                            )
                          }
                        </div>
                      </div>

                      {!comingSoon &&
                      portal.feedReady ? (
                        <span
                          className="
                            rounded-full
                            border
                            border-emerald-400/20
                            bg-emerald-400/[0.07]
                            px-2.5
                            py-1
                            text-[11px]
                            font-medium
                            text-emerald-300
                          "
                        >
                          {copy.feedReady}
                        </span>
                      ) : null}
                    </div>


                    <div
                      className="
                        mt-5
                        flex-1
                      "
                    >
                      {comingSoon ? (
                        <p
                          className="
                            text-sm
                            leading-6
                            text-white/40
                          "
                        >
                          {copy.comingSoon}
                        </p>
                      ) : portal.candidateCount >
                        0 ? (
                        <div>
                          <p
                            className="
                              text-2xl
                              font-semibold
                              tracking-tight
                              text-white
                            "
                          >
                            {
                              portal.candidateCount
                            }

                            <span
                              className="
                                ml-2
                                text-sm
                                font-normal
                                text-white/40
                              "
                            >
                              {
                                candidateCopy.swissObjects
                              }
                            </span>
                          </p>

                          <p
                            className="
                              mt-2
                              text-xs
                              text-white/50
                            "
                          >
                            <strong
                              className="
                                text-white/75
                              "
                            >
                              {
                                portal.listingCount
                              }
                            </strong>
                            {" "}
                            {
                              candidateCopy.transferable
                            }
                          </p>

                          {portal.waitingForUnlockCount >
                          0 ? (
                            <p
                              className="
                                mt-2
                                text-xs
                                font-medium
                                text-amber-300/80
                              "
                            >
                              {
                                portal.waitingForUnlockCount
                              }
                              {" "}
                              {
                                candidateCopy.waiting
                              }
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p
                          className="
                            text-sm
                            leading-6
                            text-white/40
                          "
                        >
                          {copy.noObjects}
                        </p>
                      )}
                    </div>


                    <button
                      type="button"
                      disabled
                      title={
                        copy.connectSoon
                      }
                      className="
                        mt-5
                        w-full
                        cursor-not-allowed
                        rounded-xl
                        border
                        border-white/8
                        bg-white/[0.035]
                        px-4
                        py-2.5
                        text-sm
                        font-medium
                        text-white/35
                      "
                    >
                      {comingSoon
                        ? copy.comingSoon
                        : copy.connectSoon}
                    </button>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </section>
  );
}
