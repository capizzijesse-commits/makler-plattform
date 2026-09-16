"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";


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

  externalParentId:
    string |
    null;

  displayName:
    string |
    null;

  username:
    string |
    null;

  status:
    string;

  lastVerifiedAt:
    string |
    null;

  lastPublishedAt:
    string |
    null;
};


type SocialConnectionsResponse = {
  success:
    boolean;

  connections?:
    SocialConnection[];

  capabilities?: {
    oauth:
      boolean;

    scheduling:
      boolean;

    publishing:
      boolean;
  };

  integrations?: {
    meta?: {
      configured:
        boolean;
    };
  };

  error?:
    string;
};


type MetaCallbackState =
  | "connected"
  | "cancelled"
  | "error"
  | null;


export default function MetaConnectionCard() {

  const [
    connections,
    setConnections,
  ] =
    useState<
      SocialConnection[]
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
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    connecting,
    setConnecting,
  ] =
    useState(
      false
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
    callbackState,
    setCallbackState,
  ] =
    useState<
      MetaCallbackState
    >(
      null
    );


  const loadConnections =
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
              "/api/social-connections?environment=test",
              {
                method:
                  "GET",

                credentials:
                  "same-origin",

                cache:
                  "no-store",
              }
            );


          const payload =
            await response.json() as
              SocialConnectionsResponse;


          if (
            !response.ok ||
            !payload.success
          ) {
            throw new Error(
              payload.error ||
              "Social-Verbindungen konnten nicht geladen werden."
            );
          }


          setConnections(
            payload.connections ??
            []
          );


          setMetaConfigured(
            Boolean(
              payload.integrations
                ?.meta
                ?.configured
            )
          );
        }
        catch (
          loadError
        ) {

          console.error(
            "SOCIAL CONNECTION LOAD ERROR:",
            loadError
          );


          setError(
            "Verbindungsstatus konnte nicht geladen werden."
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


  useEffect(
    () => {

      void loadConnections();


      const params =
        new URLSearchParams(
          window.location.search
        );


      const meta =
        params.get(
          "meta"
        );


      if (
        meta === "connected" ||
        meta === "cancelled" ||
        meta === "error"
      ) {

        setCallbackState(
          meta
        );
      }
    },
    [
      loadConnections,
    ]
  );


  const metaConnections =
    useMemo(
      () =>
        connections.filter(
          (
            connection
          ) =>
            connection.provider ===
            "meta"
        ),
      [
        connections,
      ]
    );


  const facebookConnections =
    useMemo(
      () =>
        metaConnections.filter(
          (
            connection
          ) =>
            connection.channel ===
            "facebook_page"
        ),
      [
        metaConnections,
      ]
    );


  const instagramConnections =
    useMemo(
      () =>
        metaConnections.filter(
          (
            connection
          ) =>
            connection.channel ===
            "instagram_business"
        ),
      [
        metaConnections,
      ]
    );


  const isConnected =
    metaConnections.length >
    0;


  async function connectMeta() {

    if (
      !metaConfigured ||
      connecting
    ) {
      return;
    }


    setConnecting(
      true
    );

    setError(
      null
    );


    try {

      const response =
        await fetch(
          "/api/social-connections/meta/oauth/start",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );


      const payload =
        await response.json() as {
          success?:
            boolean;

          authorizeUrl?:
            string;

          error?:
            string;
        };


      if (
        !response.ok ||
        !payload.success ||
        !payload.authorizeUrl
      ) {
        throw new Error(
          payload.error ||
          "Meta OAuth konnte nicht gestartet werden."
        );
      }


      window.location.assign(
        payload.authorizeUrl
      );
    }
    catch (
      connectError
    ) {

      console.error(
        "META CONNECT ERROR:",
        connectError
      );


      setError(
        "Meta-Verbindung konnte nicht gestartet werden."
      );


      setConnecting(
        false
      );
    }
  }


  function connectionLabel(
    connection:
      SocialConnection
  ):
    string {

    return (
      connection.displayName ||
      connection.username ||
      connection.externalAccountId
    );
  }


  return (
    <section
      className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 shadow-2xl"
    >
      <div
        className="border-b border-white/10 bg-white/[0.03] px-5 py-5 sm:px-7"
      >
        <div
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div
              className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300"
            >
              <span>
                ●
              </span>

              Automatisierung
            </div>

            <h2
              className="text-xl font-black text-white sm:text-2xl"
            >
              Facebook + Instagram verbinden
            </h2>

            <p
              className="mt-2 max-w-2xl text-sm leading-6 text-slate-400"
            >
              Verbinde deine Meta-Konten für direktes
              Veröffentlichen und spätere Zeitplanung.
              Die bisherige manuelle Veröffentlichung
              bleibt weiterhin verfügbar.
            </p>
          </div>


          <div
            className={[
              "inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-black",
              isConnected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : metaConfigured
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border-white/10 bg-white/[0.05] text-slate-400",
            ].join(
              " "
            )}
          >
            <span>
              {isConnected
                ? "✓"
                : metaConfigured
                  ? "●"
                  : "○"}
            </span>

            {isConnected
              ? "Verbunden"
              : metaConfigured
                ? "Bereit zum Verbinden"
                : "Noch nicht konfiguriert"}
          </div>
        </div>
      </div>


      <div
        className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7"
      >
        <div
          className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] p-5"
        >
          <div
            className="flex items-center justify-between gap-4"
          >
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.16em] text-blue-300"
              >
                Facebook
              </p>

              <p
                className="mt-1 text-lg font-black text-white"
              >
                {facebookConnections.length > 0
                  ? connectionLabel(
                      facebookConnections[0]
                    )
                  : "Keine Seite verbunden"}
              </p>
            </div>

            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 text-xl font-black text-white"
            >
              f
            </div>
          </div>

          <p
            className="mt-3 text-sm text-slate-400"
          >
            {facebookConnections.length > 0
              ? `${facebookConnections.length} Facebook-Seite(n) erkannt`
              : "Später automatisch Beiträge auf verbundenen Facebook-Seiten veröffentlichen."}
          </p>
        </div>


        <div
          className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/[0.06] p-5"
        >
          <div
            className="flex items-center justify-between gap-4"
          >
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-300"
              >
                Instagram
              </p>

              <p
                className="mt-1 text-lg font-black text-white"
              >
                {instagramConnections.length > 0
                  ? connectionLabel(
                      instagramConnections[0]
                    )
                  : "Kein Business-Konto verbunden"}
              </p>
            </div>

            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-lg font-black text-white"
            >
              ◎
            </div>
          </div>

          <p
            className="mt-3 text-sm text-slate-400"
          >
            {instagramConnections.length > 0
              ? `${instagramConnections.length} Instagram-Business-Konto/Konten erkannt`
              : "Später Posts und Reels über den verbundenen Instagram-Business-Account veröffentlichen."}
          </p>
        </div>
      </div>


      <div
        className="border-t border-white/10 px-5 py-5 sm:px-7 lg:pr-24"
      >
        {callbackState ===
          "connected" && (
          <div
            className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300"
          >
            Meta wurde erfolgreich verbunden.
          </div>
        )}


        {callbackState ===
          "cancelled" && (
          <div
            className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-300"
          >
            Meta-Verbindung wurde abgebrochen.
          </div>
        )}


        {callbackState ===
          "error" && (
          <div
            className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300"
          >
            Die Meta-Verbindung konnte nicht abgeschlossen werden.
          </div>
        )}


        {error && (
          <div
            className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300"
          >
            {error}
          </div>
        )}


        {!metaConfigured ? (
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p
                className="font-black text-white"
              >
                Meta-Verbindung noch nicht konfiguriert
              </p>

              <p
                className="mt-1 text-sm text-slate-400"
              >
                Die technische Integration ist vorbereitet.
                Sobald Meta den Developer-Zugang freigibt,
                hinterlegen wir App-ID und App-Secret.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-slate-500 sm:w-auto"
            >
              Mit Meta verbinden
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p
                className="font-black text-white"
              >
                {isConnected
                  ? "Meta-Verbindung aktiv"
                  : "Meta ist bereit"}
              </p>

              <p
                className="mt-1 text-sm text-slate-400"
              >
                Automatisches Publishing bleibt bis
                zum separaten Publishing-Test deaktiviert.
              </p>
            </div>

            <div
              className="flex w-full gap-2 sm:w-auto"
            >
              <button
                type="button"
                onClick={
                  () =>
                    void loadConnections()
                }
                disabled={
                  loading
                }
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50 sm:flex-none"
              >
                {loading
                  ? "Prüfe..."
                  : "Status aktualisieren"}
              </button>

              {!isConnected && (
                <button
                  type="button"
                  onClick={
                    () =>
                      void connectMeta()
                  }
                  disabled={
                    connecting
                  }
                  className="flex-1 rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {connecting
                    ? "Meta wird geöffnet..."
                    : "Mit Meta verbinden"}
                </button>
              )}
            </div>
          </div>
        )}


        <div
          className="mt-5 grid gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:grid-cols-3"
        >
          <span>
            ✓ OAuth vorbereitet
          </span>

          <span>
            ✓ Tokens verschlüsselt
          </span>

          <span>
            ○ Publishing noch deaktiviert
          </span>
        </div>
      </div>
    </section>
  );
}