"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import WorkspaceFrame from "../components/WorkspaceFrame";
import {
  getInseratAiMarketFromHostname,
  type InseratAiMarket,
} from "@/lib/inserat-ai-market";

type Extracted = {
  projectName: string;
  countryCode: "CH" | "DE" | "AT";
  street: string;
  postalCode: string;
  location: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  highlights: string;
  styleText: string;
  sourceSummary: string;
  missingFields: string[];
};

type Variant = {
  title: string;
  text: string;
  highlights?: string[];
};

type ImageAnalysis = {
  fileName: string;
  analysis: string;
};

type Stage = "receive" | "working" | "edit" | "publish";

const MAX_EXPOSE_BYTES = 25 * 1024 * 1024;
const CONTINUE_TO_PUBLISH_KEY = "inserat-ai:dashboard-save-start";

const EMPTY: Extracted = {
  projectName: "",
  countryCode: "CH",
  street: "",
  postalCode: "",
  location: "",
  propertyType: "",
  rooms: "",
  livingArea: "",
  price: "",
  highlights: "",
  styleText: "",
  sourceSummary: "",
  missingFields: [],
};

function friendlyError(raw: unknown) {
  const text = typeof raw === "string" ? raw : "";

  if (/credits|quota|billing|429|KI-Auswertung ist derzeit nicht verfügbar/i.test(text)) {
    return "Die KI-Auswertung ist momentan nicht verfügbar. Bitte den API-Zugang prüfen und danach denselben Upload erneut starten.";
  }

  if (/413|too large|zu gross|zu groß|payload/i.test(text)) {
    return "Eine Datei ist zu gross. Bitte das Exposé komprimieren oder ein kleineres Bild verwenden.";
  }

  return text || "Inserat-AI konnte diesen Schritt gerade nicht abschliessen.";
}

function safeFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "expose.pdf"
  );
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function isExposeFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(pdf|docx|txt)$/i.test(file.name)
  );
}

export default function AutomationFlowV2() {
  const router = useRouter();
  const [market, setMarket] = useState<InseratAiMarket>("CH");
  const [stage, setStage] = useState<Stage>("receive");
  const [exposeFile, setExposeFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageAnalyses, setImageAnalyses] = useState<ImageAnalysis[]>([]);
  const [data, setData] = useState<Extracted>(EMPTY);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  // AUTOMATION_ABORT_V1
  const automationAbortRef = useRef<AbortController | null>(null);
  // MOBILE_AUTOMATION_FACTS_TOGGLE_V1
  const [showMobileFacts, setShowMobileFacts] = useState(false);

  useEffect(() => {
    const detected = getInseratAiMarketFromHostname(window.location.hostname);
    const saved = localStorage.getItem("inseratAiMarket");
    const next = detected || (saved === "DE" ? "DE" : "CH");
    setMarket(next);
    setData((current) => ({ ...current, countryCode: next }));
  }, []);

  // AUTOMATION_ABORT_CLEANUP_FIX_V1
  useEffect(() => {
    return () => {
      automationAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const imageAnalysisText = useMemo(
    () =>
      imageAnalyses
        .map(
          (item, index) =>
            `Bild ${index + 1} (${item.fileName}):\n${item.analysis}`
        )
        .join("\n\n"),
    [imageAnalyses]
  );

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!data.location.trim()) missing.push("Ort");
    if (!data.propertyType.trim()) missing.push("Objektart");
    return missing;
  }, [data.location, data.propertyType]);

  const readyToPublish =
    requiredMissing.length === 0 && variants.length > 0;

  function setPreviewFiles(nextImages: File[]) {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews(nextImages.map((file) => URL.createObjectURL(file)));
  }

  async function prepareImage(file: File): Promise<File> {
    if (
      file.size <= 2_500_000 ||
      typeof createImageBitmap !== "function"
    ) {
      return file;
    }

    const bitmap = await createImageBitmap(file, {
      resizeWidth: 1600,
      resizeQuality: "high",
    });

    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext("2d");
      if (!context) return file;

      context.drawImage(bitmap, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82)
      );

      if (!blob) return file;

      return new File(
        [blob],
        file.name.replace(/\.[^.]+$/, "") + ".jpg",
        {
          type: "image/jpeg",
          lastModified: file.lastModified,
        }
      );
    } finally {
      bitmap.close();
    }
  }

  async function extractExpose(file: File | null, signal: AbortSignal): Promise<Extracted> {
    if (!file) {
      return { ...data };
    }

    if (file.size > MAX_EXPOSE_BYTES) {
      throw new Error("Das Exposé ist grösser als 25 MB.");
    }

    setStatusText("Exposé wird gelesen …");

    // AUTOMATION_EXPOSE_CLIENT_PROFILE_V1
    const exposeClientStartedAt = performance.now();

    console.log("[AUTOMATION CLIENT] expose-upload-start", {
      name: file.name,
      bytes: file.size,
      type: file.type,
    });

    const blob = await upload(
      `automation-exposes/${crypto.randomUUID()}-${safeFileName(file.name)}`,
      file,
      {
        access: "public",
        handleUploadUrl: "/api/automation/expose-upload",
        multipart: file.size > 8 * 1024 * 1024,
        contentType: file.type || "application/pdf",
        abortSignal: signal,
      }
    );

    console.log("[AUTOMATION CLIENT] expose-upload-done", {
      durationMs: Math.round(
        performance.now() - exposeClientStartedAt
      ),
      url: blob.url,
    });

    console.log("[AUTOMATION CLIENT] expose-extract-fetch-start");

    const response = await fetch("/api/automation/extract-expose", {
      method: "POST",
      credentials: "include",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl: blob.url,
        fileName: file.name,
        fileType: file.type || "application/pdf",
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success !== true) {
      throw new Error(friendlyError(payload?.error));
    }

    const extracted = {
      ...EMPTY,
      ...(payload.extracted || {}),
    } as Extracted;

    const fallbackName = [
      extracted.rooms ? `${extracted.rooms}-Zimmer` : "",
      extracted.propertyType,
      extracted.location ? `in ${extracted.location}` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!extracted.projectName && fallbackName) {
      extracted.projectName = fallbackName;
    }

    return extracted;
  }

  async function analyzeImages(files: File[], signal: AbortSignal): Promise<ImageAnalysis[]> {
    if (!files.length) return [];

    setStatusText(`${files.length} Bilder werden gleichzeitig analysiert …`);

    return Promise.all(
      files.map(async (original) => {
        // AUTOMATION_CLIENT_STEP_PROFILE_V1
        const imageClientStartedAt = performance.now();

        console.log("[AUTOMATION CLIENT] image-prepare-start", {
          name: original.name,
          bytes: original.size,
          type: original.type,
        });

        const file = await prepareImage(original);

        console.log("[AUTOMATION CLIENT] image-prepare-done", {
          durationMs: Math.round(
            performance.now() - imageClientStartedAt
          ),
          bytes: file.size,
          type: file.type,
        });
        const form = new FormData();
        form.append("image", file, file.name);

        console.log("[AUTOMATION CLIENT] image-fetch-start");

        const response = await fetch("/api/analyze-image", {
          method: "POST",
          credentials: "include",
          signal,
          body: form,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload?.analysis !== "string") {
          throw new Error(friendlyError(payload?.error));
        }

        return {
          fileName: original.name,
          analysis: payload.analysis.trim(),
        };
      })
    );
  }

  async function generateListing(
    facts: Extracted,
    analyses: ImageAnalysis[],
    signal: AbortSignal
  ): Promise<Variant[]> {
    if (!facts.location.trim() || !facts.propertyType.trim()) {
      return [];
    }

    setStatusText("Inserat wird automatisch fertiggestellt …");

    const response = await fetch("/api/generate", {
      method: "POST",
      credentials: "include",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "de",
        market: facts.countryCode === "DE" ? "DE" : "CH",
        countryCode: facts.countryCode,
        location: facts.location,
        rooms: facts.rooms,
        livingArea: facts.livingArea,
        price: facts.price,
        propertyType: facts.propertyType,
        highlights: facts.highlights,
        styleText: facts.styleText,
        imageAnalysis: analyses
          .map(
            (item, index) =>
              `Bild ${index + 1} (${item.fileName}):\n${item.analysis}`
          )
          .join("\n\n"),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(friendlyError(payload?.error));
    }

    const nextVariants = Array.isArray(payload?.variants)
      ? (payload.variants as Variant[])
      : [];

    if (!nextVariants.length) {
      throw new Error("Es wurde kein Inserattext erzeugt.");
    }

    return nextVariants;
  }

  async function processFiles(nextExpose: File | null, nextImages: File[]) {
    if (!nextExpose && nextImages.length === 0) return;

    // AUTOMATION_ABORT_SIGNAL_V1
    automationAbortRef.current?.abort();

    const controller = new AbortController();
    automationAbortRef.current = controller;

    setError("");
    setVariants([]);
    setActiveVariant(0);
    setStage("working");
    setStatusText("Inserat-AI übernimmt. Du musst nichts tun …");

    try {
      // AUTOMATION_PARTIAL_RESULTS_V1
      // AUTOMATION_BRANCH_PROFILE_V1
      const automationBranchStartedAt = performance.now();

      console.log("[AUTOMATION SPEED] branches-start", {
        expose: Boolean(nextExpose),
        images: nextImages.length,
      });

      const factsPromise = extractExpose(
        nextExpose,
        controller.signal
      ).then((facts) => {
        if (
          !controller.signal.aborted &&
          automationAbortRef.current === controller
        ) {
          setData(facts);
        }

        console.log("[AUTOMATION SPEED] expose-done", {
          durationMs: Math.round(
            performance.now() - automationBranchStartedAt
          ),
        });

        return facts;
      });

      const analysesPromise = analyzeImages(
        nextImages,
        controller.signal
      ).then((analyses) => {
        if (
          !controller.signal.aborted &&
          automationAbortRef.current === controller
        ) {
          setImageAnalyses(analyses);
        }

        console.log("[AUTOMATION SPEED] images-done", {
          durationMs: Math.round(
            performance.now() - automationBranchStartedAt
          ),
          images: analyses.length,
        });

        return analyses;
      });

      console.log("[AUTOMATION SPEED] waiting-for-both", {
        durationMs: Math.round(
          performance.now() - automationBranchStartedAt
        ),
      });

      const [facts, analyses] = await Promise.all([
        factsPromise,
        analysesPromise,
      ]);

      if (
        controller.signal.aborted ||
        automationAbortRef.current !== controller
      ) {
        return;
      }

      if (!facts.location.trim() || !facts.propertyType.trim()) {
        setStage("edit");
        setStatusText("Fast fertig. Es fehlen nur einzelne Pflichtangaben.");
        return;
      }

      const nextVariants = await generateListing(facts, analyses, controller.signal);
      setVariants(nextVariants);
      setStage("publish");
      setStatusText("Bereit zur Veröffentlichung.");
    } catch (runError) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("AUTOMATION V2 ERROR:", runError);
      setStage("edit");
      setError(
        runError instanceof Error
          ? friendlyError(runError.message)
          : "Die Automation konnte gerade nicht abgeschlossen werden."
      );
    }
  }

  // MOBILE_AUTOMATION_STOP_V1
  function stopAutomation() {
    automationAbortRef.current?.abort();
    automationAbortRef.current = null;

    setError("");
    setStage("receive");
    setStatusText("Verarbeitung gestoppt. Deine Dateien bleiben ausgew?hlt.");
  }

  function improveManually() {
    automationAbortRef.current?.abort();
    automationAbortRef.current = null;

    setError("");
    setStage("edit");
    setStatusText("Du kannst die erkannten Angaben jetzt selbst verbessern.");
  }

  // AUTOMATION_RESTART_V1
  async function restartAutomation() {
    if (!exposeFile && images.length === 0) return;

    await processFiles(exposeFile, images);
  }

  async function handleIncomingFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    if (!incoming.length) return;

    const nextExpose = incoming.find(isExposeFile) || exposeFile;
    const newImages = incoming.filter(isImageFile);
    const nextImages = (newImages.length ? newImages : images).slice(0, 10);

    setExposeFile(nextExpose || null);
    setImages(nextImages);
    setPreviewFiles(nextImages);

    await processFiles(nextExpose || null, nextImages);
  }

  async function finishAfterManualEdit() {
    if (requiredMissing.length > 0) return;

    setError("");
    setStage("working");

    try {
      automationAbortRef.current?.abort();

      const controller = new AbortController();
      automationAbortRef.current = controller;

      const nextVariants = await generateListing(
        data,
        imageAnalyses,
        controller.signal
      );
      setVariants(nextVariants);
      setStage("publish");
      setStatusText("Bereit zur Veröffentlichung.");
    } catch (generationError) {
      // MANUAL_AUTOMATION_ABORT_V1
      if (automationAbortRef.current?.signal.aborted) {
        return;
      }

      setStage("edit");
      setError(
        generationError instanceof Error
          ? friendlyError(generationError.message)
          : "Das Inserat konnte nicht fertiggestellt werden."
      );
    }
  }

  async function uploadImagesForListing(listingId: string) {
    await Promise.all(
      images.map(async (original, index) => {
        const file = await prepareImage(original);
        const form = new FormData();
        form.append("listingId", listingId);
        form.append("file", file, file.name);

        const uploadResponse = await fetch("/api/listing-images/server-upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });

        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || uploadData?.success !== true) {
          throw new Error(`Bild ${index + 1} konnte nicht gespeichert werden.`);
        }

        const registerResponse = await fetch("/api/listing-images", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId,
            url: uploadData.blob.url,
            storageKey: uploadData.blob.pathname,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            position: index,
            analysis: imageAnalyses[index]?.analysis
              ? JSON.stringify({
                  version: "listing-image-analysis-cache-v1",
                  listingText: imageAnalyses[index].analysis,
                  homeStaging: null,
                })
              : null,
          }),
        });

        if (!registerResponse.ok) {
          throw new Error(`Bild ${index + 1} konnte nicht registriert werden.`);
        }
      })
    );
  }

  async function publish() {
    if (!readyToPublish || publishing) return;

    setPublishing(true);
    setError("");
    setStatusText("Objekt wird gespeichert. Danach kommt nur noch Veröffentlichen …");

    try {
      const projectName =
        data.projectName.trim() ||
        [data.propertyType, data.location].filter(Boolean).join(" ") ||
        "Neues Objekt";

      const response = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          market: data.countryCode === "DE" ? "DE" : "CH",
          countryCode: data.countryCode,
          street: data.street,
          location: data.location,
          postalCode: data.postalCode,
          propertyType: data.propertyType,
          rooms: data.rooms,
          livingArea: data.livingArea,
          price: data.price,
          highlights: data.highlights,
          style: data.styleText,
          generatedVariants: variants,
          imageAnalysis: imageAnalysisText,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const listingId =
        typeof payload?.listing?.id === "string" ? payload.listing.id : "";

      if (!response.ok || !listingId) {
        throw new Error(payload?.error || "Das Objekt konnte nicht gespeichert werden.");
      }

      if (images.length) {
        await uploadImagesForListing(listingId);
      }

      window.sessionStorage.setItem(CONTINUE_TO_PUBLISH_KEY, "1");
      router.push(`/cockpit/${encodeURIComponent(listingId)}`);
    } catch (publishError) {
      console.error("AUTOMATION V2 SAVE ERROR:", publishError);
      setError(
        publishError instanceof Error
          ? friendlyError(publishError.message)
          : "Das Objekt konnte nicht zur Veröffentlichung übergeben werden."
      );
    } finally {
      setPublishing(false);
    }
  }

  function updateVariant(field: "title" | "text", value: string) {
    setVariants((current) =>
      current.map((variant, index) =>
        index === activeVariant ? { ...variant, [field]: value } : variant
      )
    );
  }

  const step = stage === "receive" || stage === "working" ? 1 : stage === "edit" ? 2 : 3;

  return (
    <WorkspaceFrame market={market} active="new" title="Automation">
      <main className="page">
        <div className="shell">
          <header className="hero">
            <div className="eyebrow">INSERAT-AI AUTOPILOT</div>
            <h1>Exposé rein. Veröffentlichen. Fertig.</h1>
            <p>
              Inserat-AI liest Exposé und Bilder, übernimmt die Objektdaten und erstellt das komplette Inserat automatisch. Du greifst nur ein, wenn du etwas ändern willst.
            </p>

            <div className="steps">
              {["Empfangen", "Bearbeiten", "Veröffentlichen"].map((label, index) => {
                const number = index + 1;
                return (
                  <div key={label} className={`step ${step === number ? "active" : step > number ? "done" : ""}`}>
                    <span>{step > number ? "✓" : number}</span>
                    <strong>{label}</strong>
                  </div>
                );
              })}
            </div>
          </header>

          <section className="card">
            {(stage === "receive" || stage === "working") && (
              <>
                <label className="drop">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    disabled={stage === "working"}
                    onChange={handleIncomingFiles}
                  />
                  <div className="dropIcon">＋</div>
                  <div>
                    <h2>{stage === "working" ? "Inserat-AI arbeitet …" : "Exposé + Bilder hier ablegen"}</h2>
                    <p>
                      {stage === "working"
                        ? "Adresse, Daten, Masse, Bilder und Inserattext werden automatisch verarbeitet."
                        : "Einmal auswählen oder hineinziehen. Danach musst du nichts mehr eingeben."}
                    </p>
                  </div>
                </label>

                {stage === "working" && (
                  <div className="workingActions">
                    <button
                      type="button"
                      className="workingStop"
                      onClick={stopAutomation}
                    >
                      Verarbeitung stoppen
                    </button>

                    <button
                      type="button"
                      className="workingImprove"
                      onClick={improveManually}
                    >
                      Angaben selbst verbessern
                    </button>
                  </div>
                )}

                {(exposeFile || images.length > 0) && (
                  <div className="received">
                    <span>{exposeFile ? `✓ ${exposeFile.name}` : "Kein Exposé"}</span>
                    <span>✓ {images.length} Bilder</span>
                  </div>
                )}

                {stage === "receive" &&
                  statusText.startsWith("Verarbeitung gestoppt") &&
                  (exposeFile || images.length > 0) && (
                    <button
                      type="button"
                      className="restartAutomation"
                      onClick={restartAutomation}
                    >
                      Mit diesen Dateien erneut starten
                    </button>
                  )}
              </>
            )}

            {stage === "receive" && (
              <div className="mobileAutomationNext">
                {/* MOBILE_AUTOMATION_NEXT_V1 */}
                <div className="mobileAutomationNextTitle">
                  <span className="mobileAutomationSpark" />
                  <div>
                    <strong>Danach &uuml;bernimmt Inserat-AI</strong>
                    <small>Alles l&auml;uft automatisch im Hintergrund.</small>
                  </div>
                </div>

                <div className="mobileAutomationTasks">
                  <span>Expos&eacute; lesen</span>
                  <span>Objektdaten erkennen</span>
                  <span>Bilder analysieren &amp; sortieren</span>
                  <span>Inserat erstellen</span>
                  <span>F&uuml;r Portale vorbereiten</span>
                </div>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div className="previews">
                {imagePreviews.slice(0, 8).map((src, index) => (
                  <img key={src} src={src} alt={`Objektbild ${index + 1}`} />
                ))}
              </div>
            )}

            {(statusText || error) && (
              <div className={`status ${error ? "error" : ""}`}>
                {stage === "working" && !error ? <span className="pulse" /> : null}
                {error || statusText}
              </div>
            )}

            {(stage === "edit" || stage === "publish") && (
              <div className="review">
                <div className="reviewTop">
                  <div>
                    <div className="eyebrow">AUTOMATISCH ERKANNT</div>
                    <h2>{stage === "publish" ? "Alles ist bereit" : "Nur fehlende Angaben ergänzen"}</h2>
                  </div>
                  <span className="badge">{requiredMissing.length ? `${requiredMissing.length} offen` : "✓ vollständig"}</span>
                </div>

                {stage === "publish" && (
                  <div className="mobileFactsSummary">
                    <div>
                      <strong>{data.propertyType || "Immobilie"}</strong>
                      <span>
                        {[data.rooms ? `${data.rooms} Zimmer` : "", data.livingArea, data.location]
                          .filter(Boolean)
                          .join(" ? ")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMobileFacts((current) => !current)}
                    >
                      {showMobileFacts ? "Angaben schliessen" : "Angaben bearbeiten"}
                    </button>
                  </div>
                )}

                <div
                  className={`facts ${
                    stage === "publish" && !showMobileFacts
                      ? "mobileFactsCollapsed"
                      : ""
                  }`}
                >
                  <Field label="Objektname" value={data.projectName} onChange={(value) => setData({ ...data, projectName: value })} />
                  <Field label="Objektart" value={data.propertyType} required onChange={(value) => setData({ ...data, propertyType: value })} />
                  <Field label="Strasse" value={data.street} onChange={(value) => setData({ ...data, street: value })} />
                  <Field label="PLZ" value={data.postalCode} onChange={(value) => setData({ ...data, postalCode: value })} />
                  <Field label="Ort" value={data.location} required onChange={(value) => setData({ ...data, location: value })} />
                  <Field label="Zimmer" value={data.rooms} onChange={(value) => setData({ ...data, rooms: value })} />
                  <Field label="Wohnfläche" value={data.livingArea} onChange={(value) => setData({ ...data, livingArea: value })} />
                  <Field label="Preis" value={data.price} onChange={(value) => setData({ ...data, price: value })} />
                  <Field label="Highlights" value={data.highlights} wide onChange={(value) => setData({ ...data, highlights: value })} />
                </div>

                {stage === "edit" && (
                  <button className="primary" disabled={requiredMissing.length > 0} onClick={finishAfterManualEdit}>
                    Fehlende Angaben übernehmen →
                  </button>
                )}
              </div>
            )}

            {stage === "publish" && variants.length > 0 && (
              <div className="result">
                <div className="resultTop">
                  <div>
                    <div className="eyebrow">FERTIGES INSERAT</div>
                    <h2>Kontrollieren ist optional</h2>
                  </div>
                  <div className="tabs">
                    {variants.map((_, index) => (
                      <button key={index} className={activeVariant === index ? "active" : ""} onClick={() => setActiveVariant(index)}>
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  className="titleEdit"
                  rows={2}
                  value={variants[activeVariant]?.title || ""}
                  onChange={(event) => updateVariant("title", event.target.value)}
                />
                <textarea
                  className="textEdit"
                  value={variants[activeVariant]?.text || ""}
                  onChange={(event) => updateVariant("text", event.target.value)}
                />

                <button className="publish" disabled={publishing} onClick={publish}>
                  {publishing ? "Wird vorbereitet …" : "VERÖFFENTLICHEN"}
                  {!publishing ? <span>→</span> : null}
                </button>
                <p className="publishHint">Danach wählst du nur noch deine bereits verbundenen Portale. Keine erneute Dateneingabe.</p>
              </div>
            )}
          </section>
        </div>

        <style jsx>{`
          .page { min-height: calc(100vh - 80px); padding: 22px; background: radial-gradient(circle at 88% 12%, rgba(245,158,11,.14), transparent 28%), radial-gradient(circle at 10% 82%, rgba(37,99,235,.18), transparent 32%), linear-gradient(135deg,#06172c 0%,#0a2342 58%,#102744 100%); color:#fff; }
          .shell { max-width: 1120px; margin: 0 auto; }
          .hero,.card { border:1px solid rgba(148,163,184,.18); border-radius:24px; background:rgba(5,22,43,.84); box-shadow:0 22px 60px rgba(2,6,23,.24); }
          .hero { padding:32px; }
          .card { margin-top:16px; padding:24px; }
          .eyebrow { color:#fbbf24; font-size:11px; letter-spacing:.14em; font-weight:950; }
          h1 { margin:8px 0 10px; font-size:clamp(34px,5vw,58px); line-height:1.02; letter-spacing:-.045em; }
          .hero > p { max-width:820px; margin:0; color:#cbd5e1; line-height:1.65; }
          .steps { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:24px; }
          .step { display:flex; align-items:center; gap:9px; padding:11px 12px; border-radius:13px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.035); color:#94a3b8; }
          .step span { display:grid; place-items:center; width:27px; height:27px; border-radius:999px; background:rgba(255,255,255,.08); font-size:11px; font-weight:950; }
          .step strong { font-size:12px; }
          .step.active { color:#fff; border-color:rgba(251,191,36,.42); background:rgba(245,158,11,.12); }
          .step.active span { background:#f59e0b; color:#fff; }
          .step.done { color:#86efac; border-color:rgba(52,211,153,.22); }
          .drop { min-height:220px; padding:30px; display:flex; align-items:center; justify-content:center; gap:20px; text-align:left; border:2px dashed rgba(251,191,36,.36); border-radius:22px; background:rgba(255,255,255,.035); cursor:pointer; }
          .drop input { display:none; }
          .dropIcon { display:grid; place-items:center; width:62px; height:62px; flex:0 0 62px; border-radius:18px; background:linear-gradient(135deg,#f59e0b,#f97316); font-size:34px; font-weight:300; }
          .drop h2 { margin:0; font-size:24px; }
          .drop p { margin:8px 0 0; color:#aebbd0; line-height:1.55; }
          .received { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
          .mobileAutomationNext { display:none; }

        .restartAutomation {
          width: 100%;
          min-height: 44px;
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(251,191,36,.32);
          border-radius: 11px;
          background: rgba(245,158,11,.1);
          color: #fbbf24;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .workingActions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .workingActions button {
          min-height: 42px;
          padding: 9px 12px;
          border-radius: 11px;
          font: inherit;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }

        .workingStop {
          border: 1px solid rgba(248,113,113,.28);
          background: rgba(239,68,68,.08);
          color: #fca5a5;
        }

        .workingImprove {
          border: 1px solid rgba(251,191,36,.28);
          background: rgba(245,158,11,.08);
          color: #fbbf24;
        }
          .mobileFactsSummary { display:none; }
          .received span,.badge { padding:7px 10px; border-radius:999px; border:1px solid rgba(52,211,153,.24); background:rgba(16,185,129,.08); color:#86efac; font-size:11px; font-weight:900; }
          .previews { display:flex; gap:8px; margin-top:14px; overflow-x:auto; }
          .previews img { width:92px; height:68px; flex:0 0 auto; object-fit:cover; border-radius:12px; border:1px solid rgba(255,255,255,.12); }
          .status { margin-top:15px; padding:13px 15px; display:flex; align-items:center; gap:10px; border-radius:13px; border:1px solid rgba(96,165,250,.22); background:rgba(37,99,235,.08); color:#bfdbfe; font-size:13px; font-weight:750; }
          .status.error { border-color:rgba(248,113,113,.34); background:rgba(127,29,29,.18); color:#fecaca; }
          .pulse { width:9px; height:9px; border-radius:50%; background:#fbbf24; animation:pulse 1.2s infinite; }
          @keyframes pulse { 50% { opacity:.3; transform:scale(.75); } }
          .review,.result { margin-top:18px; padding:22px; border-radius:20px; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.045); }
          .reviewTop,.resultTop { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
          .review h2,.result h2 { margin:5px 0 0; font-size:23px; }
          .facts { display:grid; grid-template-columns:repeat(2,1fr); gap:11px; margin-top:18px; }
          .primary,.publish { width:100%; min-height:56px; margin-top:18px; border:0; border-radius:15px; background:linear-gradient(135deg,#f59e0b,#f97316); color:#fff; font-weight:950; font-size:15px; cursor:pointer; }
          .primary:disabled,.publish:disabled { opacity:.42; cursor:not-allowed; }
          .tabs { display:flex; gap:6px; }
          .tabs button { width:34px; height:34px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.05); color:#cbd5e1; font-weight:900; cursor:pointer; }
          .tabs button.active { background:#f59e0b; border-color:#f59e0b; color:#fff; }
          .titleEdit,.textEdit { width:100%; box-sizing:border-box; border:1px solid rgba(148,163,184,.2); background:#fff; color:#243247; outline:none; }
          .titleEdit { margin-top:18px; min-height:48px; padding:0 14px; border-radius:12px; font-size:17px; font-weight:850; }
          .textEdit { margin-top:9px; min-height:260px; padding:16px; border-radius:14px; resize:vertical; line-height:1.7; font:inherit; }
          .publish { font-size:17px; box-shadow:0 16px 38px rgba(249,115,22,.25); }
          .publish span { margin-left:10px; font-size:22px; }
          .publishHint { margin:10px 0 0; text-align:center; color:#94a3b8; font-size:12px; }
          @media (max-width:760px) {
            .page {
              padding: 8px;
            }

            .hero,
            .card {
              border-radius: 16px;
            }

            .hero {
              padding: 16px;
            }

            .card {
              margin-top: 10px;
              padding: 14px;
            }

            h1 {
              margin: 6px 0 8px;
              font-size: 30px;
              line-height: 1.02;
            }

            .hero > p {
              font-size: 13px;
              line-height: 1.5;
            }

            .steps {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 5px;
              margin-top: 14px;
            }

            .step {
              min-width: 0;
              gap: 5px;
              padding: 8px 5px;
              justify-content: center;
            }

            .step span {
              width: 22px;
              height: 22px;
              flex: 0 0 22px;
              font-size: 10px;
            }

            .step strong {
              min-width: 0;
              font-size: 9px;
              white-space: nowrap;
            }

            .drop {
              min-height: 164px;
              padding: 16px;
              gap: 14px;
              align-items: center;
            }

            .dropIcon {
              width: 50px;
              height: 50px;
              flex-basis: 50px;
              border-radius: 14px;
              font-size: 28px;
            }

            .drop h2 {
              font-size: 19px;
              line-height: 1.25;
            }

            .drop p {
              margin-top: 5px;
              font-size: 12px;
              line-height: 1.45;
            }

            .mobileAutomationNext {
              display: block;
              margin-top: 10px;
              padding: 15px;
              border: 1px solid rgba(96,165,250,.18);
              border-radius: 16px;
              background: rgba(37,99,235,.07);
            }

            .mobileAutomationNextTitle {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .mobileAutomationNextTitle > span {
              display: grid;
              width: 34px;
              height: 34px;
              place-items: center;
              flex: 0 0 34px;
              border-radius: 10px;
              background: rgba(251,191,36,.12);
              color: #fbbf24;
              font-size: 17px;
            }

            .mobileAutomationNextTitle strong,
            .mobileAutomationNextTitle small {
              display: block;
            }

            .mobileAutomationNextTitle strong {
              color: #fff;
              font-size: 13px;
            }

            .mobileAutomationNextTitle small {
              margin-top: 2px;
              color: #94a3b8;
              font-size: 10px;
            }

            .mobileAutomationTasks {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 7px;
              margin-top: 12px;
            }

            .mobileAutomationSpark::before {
              content: "*";
              color: #fbbf24;
              font-weight: 900;
            }

            .mobileAutomationTasks span {
              min-width: 0;
              padding: 8px 9px;
              border-radius: 10px;
              background: rgba(255,255,255,.035);
              color: #cbd5e1;
              font-size: 10px;
              font-weight: 750;
              line-height: 1.3;
            }

            .mobileAutomationTasks span::before {
              content: "";
              display: inline-block;
              width: 6px;
              height: 3px;
              margin-right: 6px;
              border-left: 2px solid #86efac;
              border-bottom: 2px solid #86efac;
              transform: translateY(-1px) rotate(-45deg);
            }

            .facts {
              grid-template-columns: 1fr;
            }

            .mobileFactsSummary {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              margin-top: 12px;
              padding: 11px 12px;
              border: 1px solid rgba(52,211,153,.18);
              border-radius: 12px;
              background: rgba(16,185,129,.06);
            }

            .mobileFactsSummary > div {
              min-width: 0;
            }

            .mobileFactsSummary strong,
            .mobileFactsSummary span {
              display: block;
            }

            .mobileFactsSummary strong {
              color: #fff;
              font-size: 12px;
            }

            .mobileFactsSummary span {
              margin-top: 3px;
              color: #94a3b8;
              font-size: 10px;
              line-height: 1.35;
            }

            .mobileFactsSummary button {
              flex: 0 0 auto;
              padding: 7px 9px;
              border: 1px solid rgba(251,191,36,.3);
              border-radius: 9px;
              background: rgba(245,158,11,.1);
              color: #fbbf24;
              font-size: 9px;
              font-weight: 900;
              cursor: pointer;
            }

            .facts.mobileFactsCollapsed {
              display: none;
            }

            .reviewTop,
            .resultTop {
              flex-direction: column;
            }

            /* MOBILE_AUTOMATION_PUBLISH_V1 */
            .review,
            .result {
              margin-top: 10px;
              padding: 14px;
              border-radius: 16px;
            }

            .review h2,
            .result h2 {
              margin-top: 3px;
              font-size: 19px;
              line-height: 1.2;
            }

            .reviewTop,
            .resultTop {
              gap: 9px;
            }

            .facts {
              gap: 8px;
              margin-top: 12px;
            }

            .result .tabs {
              width: 100%;
            }

            .result .tabs button {
              flex: 1;
              height: 38px;
            }

            .titleEdit {
              margin-top: 12px;
              min-height: 58px;
              padding: 9px 11px;
              font-size: 14px;
              line-height: 1.35;
              resize: none;
              overflow: hidden;
              font-family: inherit;
            }

            .textEdit {
              min-height: 180px;
              max-height: 260px;
              padding: 13px;
              font-size: 13px;
              line-height: 1.55;
            }

            .publish {
              min-height: 54px;
              margin-top: 12px;
              font-size: 16px;
            }

            .publishHint {
              margin-top: 8px;
              font-size: 10px;
              line-height: 1.4;
            }
          }
        `}</style>
      </main>
    </WorkspaceFrame>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  wide?: boolean;
}) {
  const missing = required && !value.trim();

  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}{missing ? " · fehlt" : ""}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
      <style jsx>{`
        .field { display:grid; gap:7px; }
        .wide { grid-column:1 / -1; }
        span { color:${missing ? "#fbbf24" : "#94a3b8"}; font-size:11px; font-weight:850; }
        input { width:100%; box-sizing:border-box; min-height:46px; padding:0 13px; border-radius:11px; border:1px solid rgba(148,163,184,.18); background:rgba(15,23,42,.5); color:#fff; outline:none; }
        input:focus { border-color:rgba(251,191,36,.55); box-shadow:0 0 0 3px rgba(251,191,36,.08); }
      `}</style>
    </label>
  );
}
