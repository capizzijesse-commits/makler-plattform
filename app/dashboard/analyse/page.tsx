"use client";

import {
  type ChangeEvent,
  useEffect,
  useState,
} from "react";

import WorkspaceFrame from "../../components/WorkspaceFrame";

import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";


type AnalysisStatus =
  | "idle"
  | "analyzing"
  | "done"
  | "error";


type AnalysisItem = {
  file: File;
  preview: string;
  status: AnalysisStatus;
  analysis: string;
  error: string;
};


type AnalyzeResponse = {
  success?: boolean;
  analysis?: string;
  error?: string;
};


type ParsedAnalysis = {
  room: string;
  condition: string;
  visibleFacts: string[];
  strengths: string[];
  limitations: string[];
};


function parseAnalysis(
  value: string
): ParsedAnalysis | null {
  try {
    const parsed =
      JSON.parse(value) as Record<
        string,
        unknown
      >;

    return {
      room:
        typeof parsed.room === "string"
          ? parsed.room
          : "",
      condition:
        typeof parsed.condition === "string"
          ? parsed.condition
          : "",
      visibleFacts:
        Array.isArray(parsed.visibleFacts)
          ? parsed.visibleFacts.map(String)
          : [],
      strengths:
        Array.isArray(parsed.strengths)
          ? parsed.strengths.map(String)
          : [],
      limitations:
        Array.isArray(parsed.limitations)
          ? parsed.limitations.map(String)
          : [],
    };
  } catch {
    return null;
  }
}


export default function AnalysisStudioPage() {
  const [market, setMarket] =
    useState<InseratAiMarket>("CH");

  const [items, setItems] =
    useState<AnalysisItem[]>([]);

  const [running, setRunning] =
    useState(false);

  const [message, setMessage] =
    useState("");


  useEffect(() => {
    const domainMarket =
      getInseratAiMarketFromHostname(
        window.location.hostname
      );

    if (domainMarket) {
      setMarket(domainMarket);
      return;
    }

    const storedMarket =
      window.localStorage.getItem(
        "inseratAiMarket"
      );

    if (
      storedMarket === "CH" ||
      storedMarket === "DE"
    ) {
      setMarket(storedMarket);
    }
  }, []);


  function handleSelectImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      Array.from(
        event.target.files ?? []
      ).slice(0, 10);

    items.forEach((item) => {
      URL.revokeObjectURL(
        item.preview
      );
    });

    setItems(
      selected.map((file) => ({
        file,
        preview:
          URL.createObjectURL(file),
        status: "idle",
        analysis: "",
        error: "",
      }))
    );

    setMessage("");
  }


  function removeImage(index: number) {
    if (running) {
      return;
    }

    setItems((current) => {
      const target =
        current[index];

      if (target) {
        URL.revokeObjectURL(
          target.preview
        );
      }

      return current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );
    });

    setMessage("");
  }


  async function analyzeAll() {
    if (
      running ||
      items.length === 0
    ) {
      return;
    }

    setRunning(true);
    setMessage("");

    const working: AnalysisItem[] =
      items.map((item) => ({
        ...item,
        status: "analyzing",
        analysis: "",
        error: "",
      }));

    setItems([
      ...working,
    ]);

    let nextIndex = 0;

    async function analyzeOne(
      index: number
    ) {
      try {
        const formData =
          new FormData();

        formData.append(
          "image",
          working[index].file
        );

        const response =
          await fetch(
            "/api/analyze-image",
            {
              method: "POST",
              credentials: "include",
              body: formData,
            }
          );

        let data: AnalyzeResponse =
          {};

        try {
          data =
            (await response.json()) as
              AnalyzeResponse;
        } catch {
          data = {};
        }

        if (
          response.status === 401
        ) {
          window.location.href =
            "/login";

          throw new Error(
            "Bitte zuerst einloggen."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Die Bildanalyse konnte nicht durchgeführt werden."
          );
        }

        const analysis =
          data.analysis?.trim();

        if (!analysis) {
          throw new Error(
            "Die Analyse hat kein Ergebnis geliefert."
          );
        }

        working[index] = {
          ...working[index],
          status: "done",
          analysis,
          error: "",
        };
      } catch (error) {
        working[index] = {
          ...working[index],
          status: "error",
          analysis: "",
          error:
            error instanceof Error
              ? error.message
              : "Unbekannter Fehler bei der Bildanalyse.",
        };
      } finally {
        setItems([
          ...working,
        ]);
      }
    }


    async function worker() {
      while (true) {
        const index =
          nextIndex;

        if (
          index >= working.length
        ) {
          return;
        }

        nextIndex += 1;

        await analyzeOne(
          index
        );
      }
    }


    try {
      const workerCount =
        Math.min(
          4,
          working.length
        );

      await Promise.all(
        Array.from(
          {
            length:
              workerCount,
          },
          () => worker()
        )
      );

      const successCount =
        working.filter(
          (item) =>
            item.status === "done"
        ).length;

      const errorCount =
        working.filter(
          (item) =>
            item.status === "error"
        ).length;

      if (
        successCount ===
        working.length
      ) {
        setMessage(
          `${successCount} Bilder erfolgreich analysiert.`
        );
      } else if (
        successCount > 0
      ) {
        setMessage(
          `${successCount} Bilder analysiert, ${errorCount} mit Fehler.`
        );
      } else {
        setMessage(
          "Die Bilder konnten nicht analysiert werden."
        );
      }
    } finally {
      setRunning(false);
    }
  }


  async function copyAllResults() {
    const text =
      items
        .map(
          (
            item,
            index
          ) => {
            if (
              item.status !==
                "done" ||
              !item.analysis
            ) {
              return "";
            }

            return (
              `Bild ${index + 1} – ${item.file.name}\n` +
              item.analysis
            );
          }
        )
        .filter(Boolean)
        .join("\n\n");

    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(
      text
    );

    setMessage(
      "Alle Analyse-Ergebnisse wurden kopiert."
    );
  }


  const finishedCount =
    items.filter(
      (item) =>
        item.status === "done"
    ).length;


  return (
    <WorkspaceFrame
      market={market}
      active="images"
      title="Bilder analysieren"
    >
      <main className="min-h-[calc(100vh-84px)] bg-[#071a2f] px-5 py-6 text-white">
        <div className="mx-auto max-w-[1400px]">

          <section className="relative overflow-hidden rounded-[22px] border border-cyan-300/15 bg-[radial-gradient(circle_at_88%_20%,rgba(34,211,238,0.20),transparent_30%),linear-gradient(120deg,#07182f_0%,#08364b_58%,#087f8c_100%)] px-8 py-8 shadow-2xl">
            <div className="max-w-3xl">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                Inserat-AI Analyse
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                AI-Bildanalyse
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                Immobilienfotos separat analysieren, sichtbare Merkmale erkennen
                und strukturierte Ergebnisse für deine weitere Vermarktung erhalten.
              </p>
            </div>
          </section>


          <div className="mt-5 grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">

            <section className="rounded-[20px] border border-cyan-300/15 bg-[#0b213b] p-6 shadow-2xl">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Eingabe
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Immobilienfotos
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Bis zu 10 JPG-, PNG- oder WEBP-Bilder auswählen.
                Inserat-AI analysiert maximal vier Bilder gleichzeitig.
              </p>


              <label className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed border-cyan-300/30 bg-cyan-300/[0.05] px-6 py-8 text-center transition hover:border-cyan-300/60 hover:bg-cyan-300/[0.08]">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={running}
                  onChange={
                    handleSelectImages
                  }
                />

                <div className="text-3xl">
                  📷
                </div>

                <div className="mt-3 text-lg font-black">
                  Fotos auswählen
                </div>

                <div className="mt-2 text-sm text-slate-400">
                  Maximal 10 Bilder
                </div>
              </label>


              {items.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {items.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.preview
                        }
                        className="relative overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.05]"
                      >
                        <button
                          type="button"
                          disabled={running}
                          onClick={() =>
                            removeImage(
                              index
                            )
                          }
                          className="absolute right-2 top-2 z-10 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs font-black text-white disabled:opacity-40"
                        >
                          ✕
                        </button>

                        <img
                          src={
                            item.preview
                          }
                          alt={
                            item.file.name
                          }
                          className="h-36 w-full object-cover"
                        />

                        <div className="p-3">
                          <div className="truncate text-xs font-bold text-slate-300">
                            {
                              item.file
                                .name
                            }
                          </div>

                          <div className="mt-1 text-xs text-cyan-300">
                            {item.status ===
                            "done"
                              ? "✓ Analysiert"
                              : item.status ===
                                  "error"
                                ? "Fehler"
                                : item.status ===
                                    "analyzing"
                                  ? "Wird analysiert …"
                                  : "Bereit"}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}


              <button
                type="button"
                disabled={
                  running ||
                  items.length === 0
                }
                onClick={
                  analyzeAll
                }
                className="mt-6 w-full rounded-[14px] border border-cyan-200/30 bg-gradient-to-r from-cyan-400 to-teal-400 px-6 py-4 text-base font-black text-slate-950 shadow-[0_14px_30px_rgba(34,211,238,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running
                  ? "🔎 Bilder werden analysiert …"
                  : "🔎 Bildanalyse starten"}
              </button>


              {message && (
                <div className="mt-4 rounded-[14px] border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-3 text-sm font-bold text-cyan-100">
                  {message}
                </div>
              )}
            </section>


            <section className="min-h-[620px] rounded-[20px] border border-cyan-300/15 bg-[#071329] p-6 shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                    Ergebnisse
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    Analyse-Ergebnisse
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Sichtbare Merkmale werden pro Bild getrennt ausgewertet.
                  </p>
                </div>

                <div className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2 text-sm font-black text-cyan-200">
                  {finishedCount} / {items.length}
                </div>
              </div>


              {items.length === 0 ? (
                <div className="mt-8 flex min-h-[440px] items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.025] p-8 text-center">
                  <div>
                    <div className="text-4xl">
                      ◫
                    </div>

                    <div className="mt-4 text-xl font-black text-slate-200">
                      Noch keine Bilder ausgewählt
                    </div>

                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      Wähle links Immobilienfotos aus und starte anschließend die Analyse.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {items.map(
                    (
                      item,
                      index
                    ) => {
                      const parsed =
                        parseAnalysis(
                          item.analysis
                        );

                      return (
                        <article
                          key={
                            `${item.preview}-result`
                          }
                          className="rounded-[18px] border border-white/10 bg-white/[0.04] p-5"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={
                                item.preview
                              }
                              alt=""
                              className="h-16 w-20 rounded-xl object-cover"
                            />

                            <div className="min-w-0">
                              <div className="text-xs font-black uppercase tracking-wide text-cyan-300">
                                Bild {index + 1}
                              </div>

                              <div className="truncate font-black text-white">
                                {
                                  item.file
                                    .name
                                }
                              </div>
                            </div>
                          </div>


                          {item.status ===
                            "analyzing" && (
                            <div className="mt-4 text-sm font-bold text-cyan-200">
                              Analyse läuft …
                            </div>
                          )}


                          {item.status ===
                            "error" && (
                            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                              {
                                item.error
                              }
                            </div>
                          )}


                          {item.status ===
                            "done" &&
                            parsed && (
                              <div className="mt-5 grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl bg-white/[0.04] p-4">
                                  <div className="text-xs font-black uppercase text-cyan-300">
                                    Raum / Bereich
                                  </div>
                                  <div className="mt-1 text-sm text-slate-200">
                                    {
                                      parsed.room ||
                                      "Nicht eindeutig"
                                    }
                                  </div>
                                </div>

                                <div className="rounded-xl bg-white/[0.04] p-4">
                                  <div className="text-xs font-black uppercase text-cyan-300">
                                    Zustand
                                  </div>
                                  <div className="mt-1 text-sm text-slate-200">
                                    {
                                      parsed.condition ||
                                      "Nicht eindeutig"
                                    }
                                  </div>
                                </div>

                                <div className="rounded-xl bg-white/[0.04] p-4 md:col-span-2">
                                  <div className="text-xs font-black uppercase text-cyan-300">
                                    Sichtbare Merkmale
                                  </div>
                                  <div className="mt-2 text-sm leading-6 text-slate-200">
                                    {
                                      parsed.visibleFacts.length
                                        ? parsed.visibleFacts.join(
                                            " · "
                                          )
                                        : "Keine sicheren Merkmale erkannt."
                                    }
                                  </div>
                                </div>

                                {parsed.strengths.length >
                                  0 && (
                                  <div className="rounded-xl bg-emerald-400/[0.06] p-4">
                                    <div className="text-xs font-black uppercase text-emerald-300">
                                      Stärken
                                    </div>
                                    <div className="mt-2 text-sm leading-6 text-slate-200">
                                      {
                                        parsed.strengths.join(
                                          " · "
                                        )
                                      }
                                    </div>
                                  </div>
                                )}

                                {parsed.limitations.length >
                                  0 && (
                                  <div className="rounded-xl bg-amber-400/[0.05] p-4">
                                    <div className="text-xs font-black uppercase text-amber-300">
                                      Nicht sicher beurteilbar
                                    </div>
                                    <div className="mt-2 text-sm leading-6 text-slate-200">
                                      {
                                        parsed.limitations.join(
                                          " · "
                                        )
                                      }
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}


                          {item.status ===
                            "done" &&
                            !parsed && (
                              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-sm leading-6 text-slate-200">
                                {
                                  item.analysis
                                }
                              </pre>
                            )}
                        </article>
                      );
                    }
                  )}
                </div>
              )}


              {finishedCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    copyAllResults
                  }
                  className="mt-5 rounded-[14px] border border-cyan-300/25 bg-cyan-300/[0.07] px-5 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-300/[0.12]"
                >
                  Ergebnisse kopieren
                </button>
              )}
            </section>

          </div>
        </div>
      </main>
    </WorkspaceFrame>
  );
}