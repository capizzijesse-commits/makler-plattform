"use client";

import {
  useEffect,
  useState,
} from "react";


type SupportedPortal =
  | "immoscout24_ch"
  | "homegate_ch"
  | "kleinanzeigen_de";


type Language =
  | "de"
  | "it"
  | "fr"
  | "en";


type Props = {
  portal:
    string;

  language:
    Language;
};


type AccessSummary = {
  portal:
    string;

  configured:
    boolean;

  credentialSource:
    string;
};


type AccessListResponse = {
  success:
    boolean;

  accesses?:
    AccessSummary[];
};


type SaveResponse = {
  success:
    boolean;
};


function supportedPortal(
  portal:
    string
): portal is SupportedPortal {

  return (
    portal ===
      "immoscout24_ch" ||
    portal ===
      "homegate_ch" ||
    portal ===
      "kleinanzeigen_de"
  );
}


export default function CustomerPortalAccessPanel({
  portal,
  language,
}: Props) {

  const [open, setOpen] =
    useState(false);

  const [configured, setConfigured] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [environment, setEnvironment] =
    useState<
      "test" |
      "production"
    >(
      "production"
    );

  const [fields, setFields] =
    useState<
      Record<string, string>
    >({});


  const text =
    language === "it"
      ? {
          title:
            "Usa il tuo accesso tecnico al portale",
          intro:
            "Inserisci i dati API, feed o FTP ufficiali forniti dal portale. Non usare la normale password del sito web.",
          configured:
            "Accesso tecnico salvato in modo sicuro",
          save:
            "Salva in modo sicuro",
          saving:
            "Salvataggio ...",
          test:
            "Test",
          production:
            "Produzione",
          error:
            "Impossibile salvare l’accesso.",
          warning:
            "Non inserire qui il login di Inserat-AI o il normale login del portale. Usa solo le credenziali tecniche fornite per il trasferimento dati.",
        }
      : language === "fr"
        ? {
            title:
              "Utiliser votre propre accès technique au portail",
            intro:
              "Saisissez uniquement les identifiants API, feed ou FTP officiels fournis par le portail. N’utilisez pas votre mot de passe normal du site.",
            configured:
              "Accès technique enregistré en sécurité",
            save:
              "Enregistrer en sécurité",
            saving:
              "Enregistrement ...",
            test:
              "Test",
            production:
              "Production",
            error:
              "Impossible d’enregistrer l’accès.",
            warning:
              "N’utilisez pas ici votre connexion Inserat-AI ni votre connexion normale au portail. Utilisez uniquement les accès techniques fournis pour le transfert de données.",
          }
        : language === "en"
          ? {
              title:
                "Use your own technical portal access",
              intro:
                "Enter only official API, feed or FTP credentials supplied by the portal. Do not use your normal website login password.",
              configured:
                "Technical access stored securely",
              save:
                "Save securely",
              saving:
                "Saving ...",
              test:
                "Test",
              production:
                "Production",
              error:
                "The access could not be saved.",
              warning:
                "Do not enter your Inserat-AI login or normal portal login here. Use only the technical credentials supplied for data transfer.",
            }
          : {
              title:
                "Eigenen technischen Portalzugang verwenden",
              intro:
                "Nur offizielle API-, Feed- oder FTP-Zugangsdaten verwenden, die das Portal für den Datentransfer bereitstellt. Nicht das normale Website-Login-Passwort eingeben.",
              configured:
                "Technischer Zugang sicher gespeichert",
              save:
                "Sicher speichern",
              saving:
                "Wird gespeichert ...",
              test:
                "Test",
              production:
                "Produktion",
              error:
                "Der Zugang konnte nicht gespeichert werden.",
              warning:
                "Hier niemals dein Inserat-AI-Login oder dein normales Portal-Login eintragen. Verwende nur die technischen Zugangsdaten, die dir für den Datentransfer bereitgestellt wurden.",
            };


  useEffect(() => {

    if (!supportedPortal(portal)) {
      return;
    }

    const controller =
      new AbortController();


    async function load() {

      try {

        setLoading(true);

        const response =
          await fetch(
            "/api/portal-connections/customer-access",
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


        if (!response.ok) {
          return;
        }


        const data =
          await response.json() as
            AccessListResponse;


        if (
          data.success !==
            true ||
          !Array.isArray(
            data.accesses
          )
        ) {
          return;
        }


        setConfigured(
          data.accesses.some(
            (access) =>
              access.portal ===
                portal &&
              access.configured ===
                true &&
              access.credentialSource ===
                "customer_vault"
          )
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
      }
      finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }


    void load();


    return () => {
      controller.abort();
    };
  }, [
    portal,
  ]);


  if (!supportedPortal(portal)) {
    return null;
  }


  function updateField(
    key:
      string,
    value:
      string
  ) {

    setFields(
      (current) => ({
        ...current,

        [key]:
          value,
      })
    );
  }


  const swiss =
    portal ===
      "immoscout24_ch" ||
    portal ===
      "homegate_ch";


  const requiredKeys =
    swiss
      ? [
          "baseUrl",
          "clientId",
          "clientSecret",
          "userName",
          "password",
          "ownerId",
        ]
      : [
          "host",
          "username",
          "password",
          "providerId",
        ];


  const complete =
    requiredKeys.every(
      (key) =>
        fields[key]
          ?.trim()
          .length >
        0
    );


  async function save() {

    if (
      saving ||
      !complete
    ) {
      return;
    }


    try {

      setSaving(true);
      setError(null);


      const credentials =
        swiss
          ? {
              baseUrl:
                fields.baseUrl.trim(),

              clientId:
                fields.clientId.trim(),

              clientSecret:
                fields.clientSecret.trim(),

              userName:
                fields.userName.trim(),

              password:
                fields.password,

              ownerId:
                fields.ownerId.trim(),
            }
          : {
              host:
                fields.host.trim(),

              username:
                fields.username.trim(),

              password:
                fields.password,

              providerId:
                fields.providerId.trim(),
            };


      const response =
        await fetch(
          "/api/portal-connections/customer-access",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                portal,

                kind:
                  swiss
                    ? "smg_swissrets"
                    : "openimmo_ftp",

                environment,

                credentials,
              }),
          }
        );


      const data =
        await response.json() as
          SaveResponse;


      if (
        !response.ok ||
        data.success !==
          true
      ) {
        throw new Error(
          text.error
        );
      }


      setConfigured(true);

      /*
       * Secrets nach erfolgreichem
       * Speichern sofort aus dem
       * Browser-State entfernen.
       */
      setFields({});

      setOpen(false);
    }
    catch {

      setError(
        text.error
      );
    }
    finally {

      setSaving(false);
    }
  }


  const inputClass =
    [
      "mt-1",
      "w-full",
      "rounded-lg",
      "border",
      "border-white/10",
      "bg-black/20",
      "px-3",
      "py-2",
      "text-sm",
      "text-white",
      "outline-none",
      "transition",
      "placeholder:text-white/25",
      "focus:border-amber-400/40",
    ].join(" ");


  return (
    <div
      className="
        mt-3
        rounded-xl
        border
        border-emerald-400/15
        bg-emerald-400/[0.025]
        p-3
      "
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) =>
              !value
          )
        }
        className="
          flex
          w-full
          items-center
          justify-between
          gap-3
          text-left
        "
      >
        <div>
          <div
            className="
              text-xs
              font-semibold
              text-white/85
            "
          >
            {text.title}
          </div>

          {configured ? (
            <div
              className="
                mt-1
                text-[10px]
                font-medium
                text-emerald-300
              "
            >
              ✓ {text.configured}
            </div>
          ) : null}
        </div>

        <span
          className="
            text-sm
            text-white/45
          "
        >
          {open
            ? "−"
            : "+"}
        </span>
      </button>


      {open ? (
        <form
          autoComplete="off"
          onSubmit={(event) => event.preventDefault()}
          className="
            mt-3
            border-t
            border-white/8
            pt-3
          "
        >
          <p
            className="
              text-[11px]
              leading-relaxed
              text-white/45
            "
          >
            {text.intro}
          </p>

          <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.05] px-3 py-2.5 text-[11px] leading-relaxed text-sky-100">
            <strong>{text.warning}</strong>
          </div>


          <label
            className="
              mt-3
              block
              text-[11px]
              font-medium
              text-white/60
            "
          >
            Umgebung

            <select
              value={
                environment
              }
              onChange={(event) =>
                setEnvironment(
                  event.target.value ===
                    "test"
                    ? "test"
                    : "production"
                )
              }
              className={inputClass}
            >
              <option value="production">
                {text.production}
              </option>

              <option value="test">
                {text.test}
              </option>
            </select>
          </label>


          {swiss ? (
            <>
              <label className="mt-3 block text-[11px] font-medium text-white/60">
                SwissRETS API URL – vom Portal erhalten
                <input
                  type="url"
                  name="portal-swissrets-url"
                  value={fields.baseUrl ?? ""}
                  onChange={(event) => updateField("baseUrl", event.target.value)}
                  className={inputClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                Client ID – vom Portal erhalten
                <input
                  type="text"
                  name="portal-client-identifier"
                  value={fields.clientId ?? ""}
                  onChange={(event) => updateField("clientId", event.target.value)}
                  className={inputClass}
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  spellCheck={false}
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                Client Secret – vom Portal erhalten
                <input
                  type="password"
                  name="portal-client-secret"
                  value={fields.clientSecret ?? ""}
                  onChange={(event) => updateField("clientSecret", event.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                SwissRETS Benutzername – vom Portal erhalten
                <input
                  type="text"
                  name="portal-swissrets-account"
                  value={fields.userName ?? ""}
                  onChange={(event) => updateField("userName", event.target.value)}
                  className={inputClass}
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  spellCheck={false}
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                SwissRETS Passwort – vom Portal erhalten
                <input
                  type="password"
                  name="portal-swissrets-secret"
                  value={fields.password ?? ""}
                  onChange={(event) => updateField("password", event.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                Owner ID – vom Portal erhalten
                <input
                  type="text"
                  name="portal-owner-identifier"
                  value={fields.ownerId ?? ""}
                  onChange={(event) => updateField("ownerId", event.target.value)}
                  className={inputClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </>
          ) : (
            <>
              <label className="mt-3 block text-[11px] font-medium text-white/60">
                FTP-/FTPS-Server – vom Portal erhalten
                <input
                  type="text"
                  name="portal-transfer-server"
                  value={fields.host ?? ""}
                  onChange={(event) => updateField("host", event.target.value)}
                  className={inputClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                FTP-Benutzername – vom Portal erhalten
                <input
                  type="text"
                  name="portal-transfer-account"
                  value={fields.username ?? ""}
                  onChange={(event) => updateField("username", event.target.value)}
                  className={inputClass}
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  spellCheck={false}
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                FTP-Passwort – vom Portal erhalten
                <input
                  type="password"
                  name="portal-transfer-secret"
                  value={fields.password ?? ""}
                  onChange={(event) => updateField("password", event.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                />
              </label>

              <label className="mt-3 block text-[11px] font-medium text-white/60">
                OpenImmo Anbieter-ID / ANID – vom Portal erhalten
                <input
                  type="text"
                  name="portal-provider-identifier"
                  value={fields.providerId ?? ""}
                  onChange={(event) => updateField("providerId", event.target.value)}
                  className={inputClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </>
          )}


          {error ? (
            <p
              className="
                mt-3
                text-[11px]
                text-red-300
              "
            >
              {error}
            </p>
          ) : null}


          <button
            type="button"
            disabled={
              !complete ||
              saving ||
              loading
            }
            onClick={() => {
              void save();
            }}
            className="
              mt-4
              w-full
              rounded-xl
              border
              border-emerald-400/25
              bg-emerald-400/[0.08]
              px-4
              py-2.5
              text-sm
              font-semibold
              text-emerald-200
              transition
              hover:bg-emerald-400/[0.13]
              disabled:cursor-not-allowed
              disabled:opacity-35
            "
          >
            {saving
              ? text.saving
              : text.save}
          </button>
        </form>
      ) : null}
    </div>
  );
}