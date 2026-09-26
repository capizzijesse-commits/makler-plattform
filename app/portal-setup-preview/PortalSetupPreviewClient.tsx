"use client";

import { useMemo, useState } from "react";

import WorkspaceFrame from "../components/WorkspaceFrame";

type PortalId = "immoscout24_de" | "immowelt_de" | "kleinanzeigen_de";

type Portal = {
  id: PortalId;
  name: string;
  status: "connected" | "setup" | "waiting";
  description: string;
};

const portals: Portal[] = [
  {
    id: "immoscout24_de",
    name: "ImmoScout24",
    status: "waiting",
    description: "Portalzugang angefragt · Freischaltung durch den Anbieter steht noch aus.",
  },
  {
    id: "immowelt_de",
    name: "Immowelt",
    status: "setup",
    description: "Für OpenImmo fehlen noch die technischen Zugangsdaten.",
  },
  {
    id: "kleinanzeigen_de",
    name: "Kleinanzeigen",
    status: "setup",
    description: "OpenImmo-/FTP-Zugang kann einmalig hinterlegt werden.",
  },
];

const supportText =
  "Guten Tag, wir möchten unseren Immobilienbestand über eine externe Software per OpenImmo übertragen. Bitte senden Sie uns die dafür benötigten technischen Zugangsdaten (FTP/FTPS, Benutzername, Passwort) sowie unsere Anbieter-ID/ANID und bestätigen Sie das vorgesehene Transportprofil. Vielen Dank.";

function StatusBadge({ status }: { status: Portal["status"] }) {
  const label =
    status === "connected"
      ? "Verbunden"
      : status === "waiting"
        ? "Wartet auf Freischaltung"
        : "Einrichtung offen";

  const classes =
    status === "connected"
      ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200"
      : status === "waiting"
        ? "border-sky-400/25 bg-sky-400/[0.08] text-sky-200"
        : "border-amber-400/25 bg-amber-400/[0.08] text-amber-100";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${classes}`}>
      {label}
    </span>
  );
}

export default function PortalSetupPreviewClient() {
  const [selectedPortal, setSelectedPortal] = useState<PortalId>("immowelt_de");
  const [showIdHelp, setShowIdHelp] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => portals.find((portal) => portal.id === selectedPortal) ?? portals[1],
    [selectedPortal]
  );

  const complete =
    providerId.trim().length > 0 &&
    host.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length > 0;

  async function copySupportText() {
    try {
      await navigator.clipboard.writeText(supportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <WorkspaceFrame market="DE" active="objects" title="Portale verbinden">
      <main className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-[#06172c] via-[#0a2342] to-[#102744] px-4 py-6 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-[26px] border border-amber-400/15 bg-[#0b1830]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,.26)] sm:p-7">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">Portal-Einrichtung</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Einmal verbinden. Danach automatisch veröffentlichen.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              Inserat-AI führt durch die Einrichtung. Technische Begriffe werden nur gezeigt, wenn sie wirklich gebraucht werden.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {[
                ["1", "Portal wählen"],
                ["2", "Zugang verbinden"],
                ["3", "Fertig"],
              ].map(([number, label], index) => (
                <div
                  key={number}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                    index === 1
                      ? "border-amber-400/35 bg-amber-400/[0.09]"
                      : "border-white/8 bg-white/[0.025]"
                  }`}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/8 text-xs font-black">{number}</span>
                  <span className="text-sm font-bold">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.4fr]">
            <div className="rounded-[22px] border border-white/10 bg-[#0b1830]/85 p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-white/45">Deine Portale</div>
              <div className="space-y-2">
                {portals.map((portal) => (
                  <button
                    key={portal.id}
                    type="button"
                    onClick={() => {
                      setSelectedPortal(portal.id);
                      setShowIdHelp(portal.id === "immowelt_de" || portal.id === "kleinanzeigen_de");
                      setShowAdvanced(false);
                      setShowSupport(false);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedPortal === portal.id
                        ? "border-amber-400/35 bg-amber-400/[0.07]"
                        : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black">{portal.name}</div>
                        <div className="mt-1 text-xs leading-5 text-white/48">{portal.description}</div>
                      </div>
                      <StatusBadge status={portal.status} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[#0b1830]/85 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">{selected.name}</p>
                  <h2 className="mt-1 text-2xl font-black">Mit meinem Portalzugang verbinden</h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Diese Einrichtung machst du nur einmal. Danach merkt sich Inserat-AI die Verbindung sicher und zeigt im Alltag nur noch den Status „Verbunden“.
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {selected.id === "immoscout24_de" ? (
                <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-4">
                  <div className="font-bold text-sky-100">Freischaltung läuft</div>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    Hier muss der Makler nichts Technisches eintragen. Sobald der Portalzugang freigegeben ist, zeigt Inserat-AI automatisch den nächsten Schritt.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5 rounded-2xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label htmlFor="provider-id" className="text-sm font-black">OpenImmo Anbieter-ID</label>
                      <button
                        type="button"
                        onClick={() => setShowIdHelp((value) => !value)}
                        className="text-left text-xs font-bold text-amber-300 hover:text-amber-200"
                      >
                        ⓘ Wo finde ich meine ID?
                      </button>
                    </div>

                    <input
                      id="provider-id"
                      value={providerId}
                      onChange={(event) => setProviderId(event.target.value)}
                      placeholder="z. B. die vom Portal bereitgestellte ANID"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-amber-400/45"
                    />

                    {showIdHelp ? (
                      <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-white/62">
                        <strong className="text-amber-200">So findest du sie:</strong>{" "}
                        Die Anbieter-ID gehört zu deinem technischen OpenImmo-/FTP-Zugang. Wenn sie nicht in deinen Portal-Unterlagen steht, frage den Portal-Support nach deiner <strong>Anbieter-ID / ANID</strong> für den OpenImmo-Export.
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSupport((value) => !value)}
                    className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-bold text-white/80 transition hover:bg-white/[0.05]"
                  >
                    {showSupport ? "−" : "+"} Ich habe diese Daten nicht
                  </button>

                  {showSupport ? (
                    <div className="mt-2 rounded-2xl border border-white/8 bg-black/10 p-4">
                      <p className="text-sm font-black">Kein Problem – diesen Text an den Portal-Support senden:</p>
                      <p className="mt-2 whitespace-pre-line rounded-xl border border-white/8 bg-black/20 p-3 text-xs leading-5 text-white/60">{supportText}</p>
                      <button
                        type="button"
                        onClick={() => void copySupportText()}
                        className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-2 text-xs font-black text-amber-200"
                      >
                        {copied ? "✓ Text kopiert" : "Support-Text kopieren"}
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((value) => !value)}
                    className="mt-3 w-full rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-xs font-bold text-white/55"
                  >
                    {showAdvanced ? "−" : "+"} Erweiterte technische Zugangsdaten
                  </button>

                  {showAdvanced ? (
                    <div className="mt-2 grid gap-3 rounded-2xl border border-white/8 bg-black/10 p-4 sm:grid-cols-2">
                      <label className="text-xs font-bold text-white/65">
                        FTP / FTPS Host
                        <input
                          value={host}
                          onChange={(event) => setHost(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/45"
                        />
                      </label>
                      <label className="text-xs font-bold text-white/65">
                        Benutzername
                        <input
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/45"
                        />
                      </label>
                      <label className="text-xs font-bold text-white/65 sm:col-span-2">
                        Passwort
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/45"
                        />
                      </label>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!complete}
                    className="mt-4 w-full rounded-xl border border-amber-300/25 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(245,158,11,.18)] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Portal sicher verbinden →
                  </button>

                  <p className="mt-2 text-center text-[10px] leading-4 text-white/35">
                    Technische Zugangsdaten werden im echten Produkt verschlüsselt gespeichert. Das normale Portal-Passwort für die Website gehört hier nicht hinein.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </WorkspaceFrame>
  );
}
