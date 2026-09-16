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
};


type ConnectionsResponse = {
  success:
    boolean;

  connections?:
    SocialConnection[];

  integrations?: {
    linkedin?: {
      configured:
        boolean;
    };
  };

  error?:
    string;
};


type CallbackState =
  | "connected"
  | "cancelled"
  | "error"
  | null;


export default function LinkedInConnectionCard() {

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
    configured,
    setConfigured,
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
      CallbackState
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


          if (
            response.status ===
            401
          ) {

            window.location.href =
              "/login";

            return;
          }


          const payload =
            await response.json() as
              ConnectionsResponse;


          if (
            !response.ok ||
            !payload.success
          ) {

            throw new Error(
              payload.error ||
              "LINKEDIN_STATUS_FAILED"
            );
          }


          setConnections(
            payload.connections ??
            []
          );


          setConfigured(
            Boolean(
              payload.integrations
                ?.linkedin
                ?.configured
            )
          );
        }
        catch (
          loadError
        ) {

          console.error(
            "LINKEDIN STATUS ERROR:",
            loadError
          );


          setError(
            "LinkedIn-Status konnte nicht geladen werden."
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


      const state =
        params.get(
          "linkedin"
        );


      if (
        state === "connected" ||
        state === "cancelled" ||
        state === "error"
      ) {

        setCallbackState(
          state
        );
      }
    },
    [
      loadConnections,
    ]
  );


  const linkedInConnections =
    useMemo(
      () =>
        connections.filter(
          connection =>
            connection.provider ===
              "linkedin" &&
            connection.channel ===
              "linkedin"
        ),
      [
        connections,
      ]
    );


  const isConnected =
    linkedInConnections.length >
    0;


  const displayName =
    linkedInConnections[0]
      ?.displayName ||
    linkedInConnections[0]
      ?.username ||
    null;


  async function connectLinkedIn() {

    if (
      !configured ||
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
          "/api/social-connections/linkedin/oauth/start",
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
          "LINKEDIN_OAUTH_START_FAILED"
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
        "LINKEDIN CONNECT ERROR:",
        connectError
      );


      setError(
        "LinkedIn-Verbindung konnte nicht gestartet werden."
      );


      setConnecting(
        false
      );
    }
  }


  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950/40 shadow-2xl">

      <div className="border-b border-white/10 px-5 py-5 sm:px-7">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
              LinkedIn
            </p>

            <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
              LinkedIn verbinden
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Verbinde dein LinkedIn-Konto mit Inserat-AI.
              Automatisches Publishing bleibt bis zum
              separaten Publishing-Test deaktiviert.
            </p>

          </div>


          <div
            className={[
              "inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-black",
              isConnected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : configured
                  ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                  : "border-white/10 bg-white/[0.05] text-slate-400",
            ].join(
              " "
            )}
          >

            <span>
              {
                isConnected
                  ? "✓"
                  : configured
                    ? "●"
                    : "○"
              }
            </span>

            {
              isConnected
                ? "Verbunden"
                : configured
                  ? "Bereit zum Verbinden"
                  : "Noch nicht konfiguriert"
            }

          </div>

        </div>

      </div>


      <div className="p-5 sm:p-7">

        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-5">

          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">
            LinkedIn-Konto
          </p>

          <p className="mt-2 text-lg font-black text-white">
            {
              loading
                ? "Status wird geprüft..."
                : isConnected
                  ? displayName ||
                    "LinkedIn verbunden"
                  : "Noch nicht verbunden"
            }
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {
              isConnected
                ? `${linkedInConnections.length} Verbindung erkannt`
                : "Social-Texte können bereits manuell auf LinkedIn veröffentlicht werden."
            }
          </p>

        </div>


        {
          callbackState ===
            "connected" && (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
              LinkedIn wurde erfolgreich verbunden.
            </div>
          )
        }


        {
          callbackState ===
            "cancelled" && (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-300">
              LinkedIn-Verbindung wurde abgebrochen.
            </div>
          )
        }


        {
          callbackState ===
            "error" && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300">
              LinkedIn-Verbindung konnte nicht abgeschlossen werden.
            </div>
          )
        }


        {
          error && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300">
              {error}
            </div>
          )
        }


        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="font-black text-white">
              {
                isConnected
                  ? "LinkedIn-Verbindung aktiv"
                  : configured
                    ? "LinkedIn OAuth ist bereit"
                    : "LinkedIn OAuth noch nicht konfiguriert"
              }
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Publishing bleibt aktuell im manuellen Modus.
            </p>

          </div>


          <div className="flex w-full gap-2 sm:w-auto">

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
              {
                loading
                  ? "Prüfe..."
                  : "Status aktualisieren"
              }
            </button>


            {
              !isConnected && (
                <button
                  type="button"
                  onClick={
                    () =>
                      void connectLinkedIn()
                  }
                  disabled={
                    !configured ||
                    connecting
                  }
                  className="flex-1 rounded-xl border border-sky-300/30 bg-gradient-to-r from-sky-700 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                >
                  {
                    connecting
                      ? "LinkedIn wird geöffnet..."
                      : "Mit LinkedIn verbinden"
                  }
                </button>
              )
            }

          </div>

        </div>


        <div className="mt-5 grid gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:grid-cols-3">

          <span>
            ✓ OAuth vorbereitet
          </span>

          <span>
            ✓ Tokens verschlüsselt
          </span>

          <span>
            ○ Publishing deaktiviert
          </span>

        </div>

      </div>

    </section>
  );
}