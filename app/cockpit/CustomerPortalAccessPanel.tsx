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
  portal: string;
  language: Language;
};


type AccessSummary = {
  portal: string;
  configured: boolean;
  credentialSource: string;
};


type AccessListResponse = {
  success: boolean;
  accesses?: AccessSummary[];
};


type SaveResponse = {
  success: boolean;
};


function supportedPortal(
  portal: string
): portal is SupportedPortal {
  return (
    portal === "immoscout24_ch" ||
    portal === "homegate_ch" ||
    portal === "kleinanzeigen_de"
  );
}


function portalLabel(
  portal: SupportedPortal
) {
  if (portal === "immoscout24_ch") {
    return "ImmoScout24";
  }

  if (portal === "homegate_ch") {
    return "Homegate";
  }

  return "Kleinanzeigen";
}


export default function CustomerPortalAccessPanel({
  portal,
  language,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [technicalOpen, setTechnicalOpen] =
    useState(false);

  const [configured, setConfigured] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [environment, setEnvironment] =
    useState<"test" | "production">(
      "production"
    );

  const [fields, setFields] =
    useState<Record<string, string>>({});


  const text =
    language === "it"
      ? {
          title: "Collega un account portale esistente",
          subtitle: "Una sola configurazione. Poi Inserat-AI riutilizza il collegamento.",
          configured: "Accesso tecnico salvato in modo sicuro",
          askTitle: "Hai già ricevuto i dati tecnici?",
          askBody: "Il normale login del portale non basta. Per il trasferimento automatico servono credenziali tecniche separate fornite dal portale.",
          missingTitle: "Non ho ancora questi dati",
          missingBody: "Copia il testo qui sotto e invialo al supporto del portale o al tuo referente.",
          copy: "Copia testo per il supporto",
          copied: "✓ Copiato",
          haveCredentials: "Ho già i dati tecnici",
          formIntro: "Inserisci solo i dati tecnici ufficiali forniti per il trasferimento dati.",
          warning: "Non inserire qui il login Inserat-AI o la normale password del portale.",
          environment: "Ambiente",
          save: "Salva in modo sicuro",
          saving: "Salvataggio ...",
          test: "Test",
          production: "Produzione",
          error: "Impossibile salvare l’accesso.",
        }
      : language === "fr"
        ? {
            title: "Connecter un compte portail existant",
            subtitle: "Une seule configuration. Inserat-AI réutilise ensuite la connexion.",
            configured: "Accès technique enregistré en sécurité",
            askTitle: "Avez-vous déjà reçu les accès techniques ?",
            askBody: "Le login normal du portail ne suffit pas. La transmission automatique nécessite des accès techniques séparés fournis par le portail.",
            missingTitle: "Je n’ai pas encore ces accès",
            missingBody: "Copiez le texte ci-dessous et envoyez-le au support du portail ou à votre interlocuteur.",
            copy: "Copier le texte support",
            copied: "✓ Copié",
            haveCredentials: "J’ai déjà les accès techniques",
            formIntro: "Saisissez uniquement les accès techniques officiels fournis pour le transfert de données.",
            warning: "N’utilisez pas ici votre login Inserat-AI ni le mot de passe normal du portail.",
            environment: "Environnement",
            save: "Enregistrer en sécurité",
            saving: "Enregistrement ...",
            test: "Test",
            production: "Production",
            error: "Impossible d’enregistrer l’accès.",
          }
        : language === "en"
          ? {
              title: "Connect an existing portal account",
              subtitle: "Set it up once. Inserat-AI then reuses the connection.",
              configured: "Technical access stored securely",
              askTitle: "Have you already received the technical credentials?",
              askBody: "Your normal portal login is not enough. Automatic transfer requires separate technical credentials supplied by the portal.",
              missingTitle: "I do not have these credentials yet",
              missingBody: "Copy the text below and send it to portal support or your account contact.",
              copy: "Copy support text",
              copied: "✓ Copied",
              haveCredentials: "I already have the technical credentials",
              formIntro: "Enter only official technical credentials supplied for data transfer.",
              warning: "Do not enter your Inserat-AI login or normal portal password here.",
              environment: "Environment",
              save: "Save securely",
              saving: "Saving ...",
              test: "Test",
              production: "Production",
              error: "The access could not be saved.",
            }
          : {
              title: "Bestehendes Portal-Konto verbinden",
              subtitle: "Einmal einrichten. Danach verwendet Inserat-AI die Verbindung automatisch.",
              configured: "Technischer Zugang sicher gespeichert",
              askTitle: "Hast du die technischen Zugangsdaten bereits erhalten?",
              askBody: "Dein normales Portal-Login reicht für die automatische Übertragung nicht aus. Dafür stellt das Portal separate technische Zugangsdaten bereit.",
              missingTitle: "Ich habe diese Daten noch nicht",
              missingBody: "Kopiere den Text unten und sende ihn an den Portal-Support oder deinen Ansprechpartner.",
              copy: "Support-Text kopieren",
              copied: "✓ Kopiert – jetzt an den Portal-Support senden",
              haveCredentials: "Ich habe die technischen Zugangsdaten bereits",
              formIntro: "Trage nur die offiziellen technischen Zugangsdaten ein, die dir für den Datentransfer bereitgestellt wurden.",
              warning: "Hier niemals dein Inserat-AI-Login oder dein normales Portal-Passwort eintragen.",
              environment: "Umgebung",
              save: "Sicher speichern",
              saving: "Wird gespeichert ...",
              test: "Test",
              production: "Produktion",
              error: "Der Zugang konnte nicht gespeichert werden.",
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
              method: "GET",
              credentials: "include",
              cache: "no-store",
              signal: controller.signal,
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json() as AccessListResponse;

        if (
          data.success !== true ||
          !Array.isArray(data.accesses)
        ) {
          return;
        }

        setConfigured(
          data.accesses.some(
            (access) =>
              access.portal === portal &&
              access.configured === true &&
              access.credentialSource === "customer_vault"
          )
        );
      }
      catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
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
  }, [portal]);


  if (!supportedPortal(portal)) {
    return null;
  }

  const swiss =
    portal === "immoscout24_ch" ||
    portal === "homegate_ch";

  const label =
    portalLabel(portal);

  const supportText =
    swiss
      ? `Guten Tag, wir haben bereits ein ${label}-Konto und möchten unseren Bestand über Inserat-AI automatisiert übertragen. Bitte senden Sie uns die dafür vorgesehenen technischen SwissRETS-Zugangsdaten: API-URL, Client ID, Client Secret, SwissRETS Benutzername, SwissRETS Passwort und Owner ID. Es geht ausdrücklich nicht um unser normales Website-Login. Vielen Dank.`
      : `Guten Tag, wir haben bereits ein ${label}-Konto und möchten unseren Bestand über Inserat-AI automatisiert per OpenImmo übertragen. Bitte senden Sie uns die dafür vorgesehenen technischen Zugangsdaten: FTP-/FTPS-Server, Benutzername, Passwort sowie Anbieter-ID/ANID und bestätigen Sie das vorgesehene Transportprofil. Es geht ausdrücklich nicht um unser normales Website-Login. Vielen Dank.`;

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
        fields[key]?.trim().length > 0
    );

  function updateField(
    key: string,
    value: string
  ) {
    setFields((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function copySupportText() {
    try {
      await navigator.clipboard.writeText(
        supportText
      );
      setCopied(true);
      window.setTimeout(
        () => setCopied(false),
        3500
      );
    }
    catch {
      setCopied(false);
    }
  }

  async function save() {
    if (saving || !complete) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const credentials =
        swiss
          ? {
              baseUrl: fields.baseUrl.trim(),
              clientId: fields.clientId.trim(),
              clientSecret: fields.clientSecret.trim(),
              userName: fields.userName.trim(),
              password: fields.password,
              ownerId: fields.ownerId.trim(),
            }
          : {
              host: fields.host.trim(),
              username: fields.username.trim(),
              password: fields.password,
              providerId: fields.providerId.trim(),
            };

      const response =
        await fetch(
          "/api/portal-connections/customer-access",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              portal,
              kind: swiss
                ? "smg_swissrets"
                : "openimmo_ftp",
              environment,
              credentials,
            }),
          }
        );

      const data =
        await response.json() as SaveResponse;

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(text.error);
      }

      setConfigured(true);
      setFields({});
      setTechnicalOpen(false);
      setOpen(false);
    }
    catch {
      setError(text.error);
    }
    finally {
      setSaving(false);
    }
  }

  const inputClass = [
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

  const labelClass =
    "mt-3 block text-[11px] font-medium text-white/60";

  return (
    <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.025] p-3">
      <button
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="text-xs font-semibold text-white/85">
            {text.title}
          </div>
          <div className="mt-1 text-[10px] leading-relaxed text-white/45">
            {text.subtitle}
          </div>
          {configured ? (
            <div className="mt-1 text-[10px] font-medium text-emerald-300">
              ✓ {text.configured}
            </div>
          ) : null}
        </div>

        <span className="text-sm text-white/45">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="mt-3 border-t border-white/8 pt-3">
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.045] p-3">
            <p className="text-xs font-semibold text-amber-100">
              {text.askTitle}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">
              {text.askBody}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3">
            <p className="text-xs font-semibold text-white/85">
              {text.missingTitle}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
              {text.missingBody}
            </p>

            <div className="mt-3 rounded-lg border border-white/8 bg-black/20 p-3 text-[11px] leading-relaxed text-white/60">
              {supportText}
            </div>

            <button
              type="button"
              onClick={() => {
                void copySupportText();
              }}
              className="mt-3 w-full rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/[0.13]"
            >
              {copied
                ? text.copied
                : text.copy}
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setTechnicalOpen(
                (value) => !value
              )
            }
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/[0.035] px-3 py-3 text-left text-xs font-semibold text-white/80 transition hover:bg-emerald-400/[0.06]"
          >
            <span>{text.haveCredentials}</span>
            <span className="text-white/45">
              {technicalOpen ? "−" : "+"}
            </span>
          </button>

          {technicalOpen ? (
            <form
              autoComplete="off"
              onSubmit={(event) =>
                event.preventDefault()
              }
              className="mt-3 rounded-xl border border-emerald-400/15 bg-black/10 p-3"
            >
              <p className="text-[11px] leading-relaxed text-white/50">
                {text.formIntro}
              </p>

              <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.05] px-3 py-2.5 text-[11px] leading-relaxed text-sky-100">
                <strong>{text.warning}</strong>
              </div>

              <label className={labelClass}>
                {text.environment}
                <select
                  value={environment}
                  onChange={(event) =>
                    setEnvironment(
                      event.target.value === "test"
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
                  <label className={labelClass}>
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

                  <label className={labelClass}>
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

                  <label className={labelClass}>
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

                  <label className={labelClass}>
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

                  <label className={labelClass}>
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

                  <label className={labelClass}>
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
                  <label className={labelClass}>
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

                  <label className={labelClass}>
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

                  <label className={labelClass}>
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

                  <label className={labelClass}>
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
                <p className="mt-3 text-[11px] text-red-300">
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
                className="mt-4 w-full rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.13] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {saving
                  ? text.saving
                  : text.save}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
