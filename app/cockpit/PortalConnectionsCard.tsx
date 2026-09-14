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
  | "comparis_ch"
  | "flatfox_ch"
  | "newhome_ch"
  | "immoscout24_de"
  | "immowelt_de"
  | "kleinanzeigen_de"
  | "wg_gesucht_de"
  | "immobilien_de";


type PortalMarket =
  | "CH"
  | "DE";


type PortalConnectionsCardProps = {
  market: PortalMarket;
};


type PortalTheme = {
  accent: string;
  soft: string;
  border: string;
  topBar: string;
};


const PORTAL_THEMES:
  Record<
    PortalId,
    PortalTheme
  > = {

  /*
   * SCHWEIZ
   */
  immoscout24_ch: {
    accent:
      "#F5A623",

    soft:
      "rgba(245, 166, 35, 0.075)",

    border:
      "rgba(245, 166, 35, 0.28)",

    topBar:
      "linear-gradient(90deg, #F5A623, #FFD166)",
  },

  homegate_ch: {
    accent:
      "#FF4D8D",

    soft:
      "rgba(255, 77, 141, 0.055)",

    border:
      "rgba(255, 77, 141, 0.24)",

    /*
     * Aktuelles Homegate Branding:
     * Pink / Purple / Magenta /
     * Blue / Orange.
     */
    topBar:
      "linear-gradient(90deg, #FF4D8D 0%, #8B5CF6 25%, #D946EF 50%, #3B82F6 75%, #F59E0B 100%)",
  },

  comparis_ch: {
    accent:
      "#66CC02",

    soft:
      "rgba(102, 204, 2, 0.055)",

    border:
      "rgba(102, 204, 2, 0.24)",

    topBar:
      "linear-gradient(90deg, #017B4F, #66CC02)",
  },

  flatfox_ch: {
    accent:
      "#8B5CF6",

    soft:
      "rgba(139, 92, 246, 0.055)",

    border:
      "rgba(139, 92, 246, 0.24)",

    topBar:
      "linear-gradient(90deg, #7C3AED, #A78BFA)",
  },

  newhome_ch: {
    accent:
      "#63D5C5",

    soft:
      "rgba(99, 213, 197, 0.06)",

    border:
      "rgba(99, 213, 197, 0.25)",

    topBar:
      "linear-gradient(90deg, #63D5C5, #A7F3D0)",
  },


  /*
   * DEUTSCHLAND
   */
  immoscout24_de: {
    accent:
      "#F5A623",

    soft:
      "rgba(245, 166, 35, 0.075)",

    border:
      "rgba(245, 166, 35, 0.28)",

    topBar:
      "linear-gradient(90deg, #F5A623, #FFD166)",
  },

  immowelt_de: {
    accent:
      "#EC4899",

    soft:
      "rgba(236, 72, 153, 0.055)",

    border:
      "rgba(236, 72, 153, 0.24)",

    topBar:
      "linear-gradient(90deg, #DB2777, #F472B6)",
  },

  kleinanzeigen_de: {
    accent:
      "#B7FF5A",

    soft:
      "rgba(183, 255, 90, 0.055)",

    border:
      "rgba(183, 255, 90, 0.24)",

    topBar:
      "linear-gradient(90deg, #8FE843, #C7FF76)",
  },

  wg_gesucht_de: {
    accent:
      "#34D399",

    soft:
      "rgba(52, 211, 153, 0.05)",

    border:
      "rgba(52, 211, 153, 0.23)",

    topBar:
      "linear-gradient(90deg, #16A34A, #4ADE80)",
  },

  immobilien_de: {
    accent:
      "#60A5FA",

    soft:
      "rgba(96, 165, 250, 0.055)",

    border:
      "rgba(96, 165, 250, 0.24)",

    topBar:
      "linear-gradient(90deg, #2563EB, #60A5FA)",
  },
};


function getPortalTheme(
  portal: PortalId
): PortalTheme {

  return PORTAL_THEMES[
    portal
  ];
}


type PortalAvailability =
  | "available"
  | "coming_soon";


type PortalStatus =
  | "not_configured"
  | "configured"
  | "verified"
  | "error";


type PortalSafetyMode =
  | "blocked"
  | "prepare_only"
  | "test_only"
  | "production_ready";


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

  safetyMode?:
    | PortalSafetyMode
    | null;

  canPrepare?: boolean;
  canRunTransportTest?: boolean;
  canPublishProduction?: boolean;

  safetyReasons?: string[];

  launchProvider?:
    | "smg"
    | "comparis"
    | null;

  launchGroup?:
    | "ch_portal_connect_v1"
    | null;
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
      "Anbindung in Vorbereitung",

    connectSoon:
      "Verbindung wird vorbereitet",

    publishOff:
      "Portal-Schnittstellen werden schrittweise freigeschaltet.",

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
      "Integrazione in preparazione",

    connectSoon:
      "Collegamento in preparazione",

    publishOff:
      "Le integrazioni con i portali vengono attivate gradualmente.",

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
      "Connexion en préparation",

    connectSoon:
      "Connexion en cours de préparation",

    publishOff:
      "Les connexions aux portails sont activées progressivement.",

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
      "Integration in preparation",

    connectSoon:
      "Connection is being prepared",

    publishOff:
      "Portal integrations are being rolled out progressively.",

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


function portalSafetyText(
  mode: PortalSafetyMode,
  language: string
): string {

  const labels = {
    de: {
      blocked:
        "Noch nicht freigegeben",
      prepare_only:
        "Vorbereitung",
      test_only:
        "Testbereit",
      production_ready:
        "Bereit",
    },

    it: {
      blocked:
        "Non ancora abilitato",
      prepare_only:
        "Preparazione",
      test_only:
        "Pronto per il test",
      production_ready:
        "Pronto",
    },

    fr: {
      blocked:
        "Pas encore activé",
      prepare_only:
        "Préparation",
      test_only:
        "Prêt pour le test",
      production_ready:
        "Prêt",
    },

    en: {
      blocked:
        "Not enabled yet",
      prepare_only:
        "Preparation",
      test_only:
        "Ready for testing",
      production_ready:
        "Ready",
    },
  } as const;

  const normalizedLanguage =
    language === "it" ||
    language === "fr" ||
    language === "en"
      ? language
      : "de";

  return labels[
    normalizedLanguage
  ][mode];
}


function portalSafetyBadgeClass(
  mode: PortalSafetyMode
): string {

  switch (mode) {

    case "production_ready":
      return [
        "border-emerald-400/25",
        "bg-emerald-400/[0.08]",
        "text-emerald-300",
      ].join(" ");

    case "test_only":
      return [
        "border-sky-400/25",
        "bg-sky-400/[0.08]",
        "text-sky-300",
      ].join(" ");

    case "prepare_only":
      return [
        "border-amber-400/25",
        "bg-amber-400/[0.08]",
        "text-amber-200",
      ].join(" ");

    default:
      return [
        "border-slate-400/20",
        "bg-slate-400/[0.06]",
        "text-slate-300",
      ].join(" ");
  }
}

export default function PortalConnectionsCard({
  market,
}: PortalConnectionsCardProps) {

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
          objects:
            market === "DE"
              ? "immobili tedeschi"
              : "immobili svizzeri",
          kpiObjects:
            "Oggetti",
          kpiTransferable:
            "Abilitati",
          kpiWaiting:
            "In attesa",
          transferable:
            "abilitati al trasferimento",
          waiting:
            "in attesa di attivazione",
        }
      : language === "fr"
        ? {
            objects:
              market === "DE"
                ? "biens allemands"
                : "biens suisses",
            kpiObjects:
              "Objets",
            kpiTransferable:
              "Autorisés",
            kpiWaiting:
              "En attente",
            transferable:
              "autorisés pour la transmission",
            waiting:
              "en attente d’activation",
          }
        : language === "en"
          ? {
              objects:
                market === "DE"
                  ? "German listings"
                  : "Swiss listings",
              kpiObjects:
                "Listings",
              kpiTransferable:
                "Approved",
              kpiWaiting:
                "Waiting",
              transferable:
                "approved for transfer",
              waiting:
                "waiting for activation",
            }
          : {
              objects:
                market === "DE"
                  ? "Deutsche Objekte"
                  : "Schweizer Objekte",
              kpiObjects:
                "Objekte",
              kpiTransferable:
                "Freigegeben",
              kpiWaiting:
                "Wartend",
              transferable:
                "für Übertragung freigeschaltet",
              waiting:
                "warten auf Freischaltung",
            };


  const apiEndpoint =
    market === "DE"
      ? "/api/portal-connections/de"
      : "/api/portal-connections";


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


  const [
    portalPage,
    setPortalPage,
  ] =
    useState(0);


  const portalsPerPage =
    3;

  const portalPageCount =
    Math.max(
      1,
      Math.ceil(
        portals.length /
          portalsPerPage
      )
    );

  const safePortalPage =
    Math.min(
      portalPage,
      portalPageCount - 1
    );

  const visiblePortals =
    portals.slice(
      safePortalPage *
        portalsPerPage,
      (
        safePortalPage +
        1
      ) *
        portalsPerPage
    );



  useEffect(() => {

    const controller =
      new AbortController();


    async function loadPortals() {

      try {

        setLoading(true);
        setErrorKind(null);


        const response =
          await fetch(
            apiEndpoint,
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

        setPortalPage(
          0
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
    apiEndpoint,
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
          <>
            {portalPageCount > 1 ? (
              <div
                className="
                  mb-4
                  flex
                  items-center
                  justify-end
                  gap-2
                "
              >
                <button
                  type="button"
                  aria-label="Vorherige Portale"
                  disabled={
                    safePortalPage === 0
                  }
                  onClick={() =>
                    setPortalPage(
                      (value) =>
                        Math.max(
                          0,
                          value - 1
                        )
                    )
                  }
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/10
                    bg-white/[0.035]
                    text-lg
                    text-white
                    transition
                    hover:border-amber-400/40
                    hover:bg-amber-400/10
                    disabled:cursor-not-allowed
                    disabled:opacity-30
                  "
                >
                  ←
                </button>

                <span
                  className="
                    min-w-[46px]
                    text-center
                    text-xs
                    font-medium
                    text-white/45
                  "
                >
                  {safePortalPage + 1}
                  {" / "}
                  {portalPageCount}
                </span>

                <button
                  type="button"
                  aria-label="Weitere Portale"
                  disabled={
                    safePortalPage >=
                    portalPageCount - 1
                  }
                  onClick={() =>
                    setPortalPage(
                      (value) =>
                        Math.min(
                          portalPageCount - 1,
                          value + 1
                        )
                    )
                  }
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/10
                    bg-white/[0.035]
                    text-lg
                    text-white
                    transition
                    hover:border-amber-400/40
                    hover:bg-amber-400/10
                    disabled:cursor-not-allowed
                    disabled:opacity-30
                  "
                >
                  →
                </button>
              </div>
            ) : null}

            <div
              className="
                grid
                grid-cols-1
                gap-3
                xl:grid-cols-3
              "
            >
            {visiblePortals.map(
              (portal) => {

                const comingSoon =
                  portal.availability ===
                  "coming_soon";

                const theme =
                  getPortalTheme(
                    portal.portal
                  );

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
                      bg-white/[0.025]
                      p-4
                      sm:p-5
                    "
                    style={{
                      borderColor:
                        theme.border,

                      backgroundColor:
                        "rgba(255,255,255,0.025)",

                      backgroundImage: `
                        ${theme.topBar},
                        linear-gradient(
                          180deg,
                          ${theme.soft} 0%,
                          rgba(255,255,255,0) 46%
                        )
                      `,

                      backgroundSize:
                        "100% 3px, 100% 100%",

                      backgroundRepeat:
                        "no-repeat",

                      boxShadow: `
                        inset 0 1px 0 rgba(255,255,255,0.035),
                        0 12px 32px rgba(0,0,0,0.10)
                      `,
                    }}
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
                          "
                          style={{
                            color:
                              theme.accent,
                          }}
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
                      {portal.launchGroup ===
                        "ch_portal_connect_v1" &&
                      portal.safetyMode ? (
                        <span
                          className={`
                            rounded-full
                            border
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            ${portalSafetyBadgeClass(
                              portal.safetyMode
                            )}
                          `}
                          title={
                            portal.safetyReasons?.
                              join(" ") ||
                            undefined
                          }
                        >
                          {portalSafetyText(
                            portal.safetyMode,
                            language
                          )}
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
                        <div
                          className="
                            min-h-[56px]
                          "
                        />
                      ) : (
                        <div
                          className="
                            grid
                            grid-cols-3
                            gap-2
                          "
                        >
                          <div
                            className="
                              rounded-xl
                              border
                              px-3
                              py-4
                            "
                            style={{
                              borderColor:
                                theme.border,

                              backgroundColor:
                                theme.soft,
                            }}
                          >
                            <div
                              className="
                                text-2xl
                                font-bold
                                leading-none
                                tracking-tight
                              "
                              style={{
                                color:
                                  theme.accent,
                              }}
                            >
                              {
                                portal.candidateCount ??
                                0
                              }
                            </div>

                            <div
                              className="
                                mt-2
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-[0.08em]
                                text-white/45
                              "
                            >
                              {
                                candidateCopy.kpiObjects
                              }
                            </div>
                          </div>


                          <div
                            className="
                              rounded-xl
                              border
                              border-emerald-400/15
                              bg-emerald-400/[0.035]
                              px-3
                              py-4
                            "
                          >
                            <div
                              className="
                                text-2xl
                                font-bold
                                leading-none
                                tracking-tight
                                text-emerald-300
                              "
                            >
                              {
                                portal.listingCount ??
                                0
                              }
                            </div>

                            <div
                              className="
                                mt-2
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-[0.08em]
                                text-emerald-200/55
                              "
                            >
                              {
                                candidateCopy.kpiTransferable
                              }
                            </div>
                          </div>


                          <div
                            className="
                              rounded-xl
                              border
                              border-amber-400/25
                              bg-amber-400/[0.055]
                              px-3
                              py-4
                            "
                          >
                            <div
                              className="
                                text-2xl
                                font-bold
                                leading-none
                                tracking-tight
                                text-amber-300
                              "
                            >
                              {
                                portal.waitingForUnlockCount ??
                                0
                              }
                            </div>

                            <div
                              className="
                                mt-2
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-[0.08em]
                                text-amber-200/65
                              "
                            >
                              {
                                candidateCopy.kpiWaiting
                              }
                            </div>
                          </div>
                        </div>
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
          </>
        )}
      </div>
    </section>
  );
}
