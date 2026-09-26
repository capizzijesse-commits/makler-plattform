"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
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

type Stage = "upload" | "working" | "review" | "ready";

const MAX_EXPOSE_BYTES = 25 * 1024 * 1024;

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
    return "Die KI-Auswertung ist momentan nicht verfügbar. Deine Datei wurde nicht dauerhaft gespeichert. Sobald der API-Zugang wieder aktiv ist, kannst du denselben Ablauf erneut starten.";
  }

  if (/413|too large|zu gross|zu groß|payload/i.test(text)) {
    return "Die Datei ist für einen direkten Server-Upload zu gross. Inserat-AI verwendet dafür jetzt den Grossdatei-Upload. Bitte die Seite aktualisieren und erneut versuchen.";
  }

  return text || "Dieser Schritt konnte gerade nicht abgeschlossen werden. Bitte erneut versuchen.";
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

export default function AutomationPage() {
  const router = useRouter();
  const [market, setMarket] = useState<InseratAiMarket>("CH");
  const [stage, setStage] = useState<Stage>("upload");
  const [exposeFile, setExposeFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageAnalyses, setImageAnalyses] = useState<ImageAnalysis[]>([]);
  const [data, setData] = useState<Extracted>(EMPTY);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const detected = getInseratAiMarketFromHostname(window.location.hostname);
    const saved = localStorage.getItem("inseratAiMarket");
    const next = detected || (saved === "DE" ? "DE" : "CH");
    setMarket(next);
    setData((current) => ({ ...current, countryCode: next }));
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

  const coreReady = Boolean(
    data.location.trim() && data.propertyType.trim()
  );

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 10);

    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImages(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setImageAnalyses([]);
    setVariants([]);
    setError("");
    event.target.value = "";
  }

  async function extractExpose(): Promise<Extracted> {
    if (!exposeFile) {
      return { ...data };
    }

    if (exposeFile.size > MAX_EXPOSE_BYTES) {
      throw new Error(
        "Das Exposé ist grösser als 25 MB. Bitte die PDF kurz komprimieren und erneut hochladen."
      );
    }

    setStatusText("Exposé wird sicher hochgeladen …");

    const pathname =
      `automation-exposes/${crypto.randomUUID()}-${safeFileName(exposeFile.name)}`;

    const blob = await upload(pathname, exposeFile, {
      access: "public",
      handleUploadUrl: "/api/automation/expose-upload",
      multipart: exposeFile.size > 8 * 1024 * 1024,
      contentType: exposeFile.type || "application/pdf",
    });

    setStatusText("Exposé wird gelesen und strukturiert …");

    const response = await fetch("/api/automation/extract-expose", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileUrl: blob.url,
        fileName: exposeFile.name,
        fileType: exposeFile.type || "application/pdf",
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

    setData(extracted);
    return extracted;
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

  async function analyzeImages(): Promise<ImageAnalysis[]> {
    if (!images.length) return [];

    setStatusText(`${images.length} Bilder werden automatisch analysiert …`);

    const results = await Promise.all(
      images.map(async (original) => {
        const file = await prepareImage(original);
        const form = new FormData();
        form.append("image", file, file.name);

        const response = await fetch("/api/analyze-image", {
          method: "POST",
          credentials: "include",
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

    setImageAnalyses(results);
    return results;
  }

  async function generateListing(
    facts: Extracted = data,
    analyses: ImageAnalysis[] = imageAnalyses
  ) {
    if (!facts.location.trim() || !facts.propertyType.trim()) {
      setStage("review");
      setStatusText(
        "Fast fertig – bitte nur die gelb markierten Pflichtangaben ergänzen."
      );
      return false;
    }

    setStatusText(
      "Inserat wird aus Exposé, Bildern und Objektdaten erstellt …"
    );

    const response = await fetch("/api/generate", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
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
      ? payload.variants
      : [];

    if (!nextVariants.length) {
      throw new Error("Es wurde noch kein Inserattext erzeugt.");
    }

    setVariants(nextVariants);
    setActiveVariant(0);
    setStage("ready");
    setStatusText(
      "Fertig – bitte kurz kontrollieren und dann zur Veröffentlichung weiter."
    );
    return true;
  }

  async function runAutomation() {
    if (!exposeFile && images.length === 0) {
      setError("Bitte zuerst ein Exposé oder Bilder hinzufügen.");
      return;
    }

    setError("");
    setStatusText("");
    setStage("working");

    try {
      const [facts, analyses] = await Promise.all([
        extractExpose(),
        analyzeImages(),
      ]);

      setStage("review");
      await generateListing(facts, analyses);
    } catch (runError) {
      console.error("AUTOMATION FLOW ERROR:", runError);
      setStage("review");
      setError(
        runError instanceof Error
          ? friendlyError(runError.message)
          : "Die Automation konnte gerade nicht abgeschlossen werden."
      );
    }
  }

  async function uploadImagesForListing(listingId: string) {
    for (let index = 0; index < images.length; index += 1) {
      const original = images[index];
      if (!original) continue;

      setStatusText(
        `Bild ${index + 1} von ${images.length} wird gespeichert …`
      );

      const file = await prepareImage(original);
      const form = new FormData();
      form.append("listingId", listingId);
      form.append("file", file, file.name);

      const uploadResponse = await fetch(
        "/api/listing-images/server-upload",
        {
          method: "POST",
          credentials: "include",
          body: form,
        }
      );

      const uploadData = await uploadResponse.json().catch(() => ({}));

      if (!uploadResponse.ok || uploadData?.success !== true) {
        throw new Error(
          uploadData?.error ||
            `Bild ${index + 1} konnte nicht gespeichert werden.`
        );
      }

      const registerResponse = await fetch("/api/listing-images", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
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

      const registerData = await registerResponse.json().catch(() => ({}));

      if (!registerResponse.ok) {
        throw new Error(
          registerData?.error ||
            `Bild ${index + 1} konnte nicht registriert werden.`
        );
      }
    }
  }

  async function saveAndOpenCockpit() {
    if (!coreReady || !variants.length || saving) return;

    setSaving(true);
    setError("");
    setStatusText(
      "Objekt wird gespeichert und für die Veröffentlichung vorbereitet …"
    );

    try {
      const projectName =
        data.projectName.trim() ||
        [data.propertyType, data.location].filter(Boolean).join(" ") ||
        "Neues Objekt";

      const response = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
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
        typeof payload?.listing?.id === "string"
          ? payload.listing.id
          : "";

      if (!response.ok || !listingId) {
        throw new Error(
          payload?.error || "Das Objekt konnte nicht gespeichert werden."
        );
      }

      if (images.length) {
        await uploadImagesForListing(listingId);
      }

      router.push(`/cockpit/${encodeURIComponent(listingId)}`);
    } catch (saveError) {
      console.error("AUTOMATION SAVE ERROR:", saveError);
      setError(
        saveError instanceof Error
          ? friendlyError(saveError.message)
          : "Das Objekt konnte gerade nicht gespeichert werden."
      );
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    ["1", "Hochladen", stage === "upload"],
    ["2", "Analysieren", stage === "working"],
    ["3", "Prüfen", stage === "review"],
    ["4", "Veröffentlichen", stage === "ready"],
  ] as const;

  return (
    <WorkspaceFrame market={market} active="new" title="Neues Objekt">
      <main className="automationPage">
        <div className="automationShell">
          <header className="automationHero">
            <div className="eyebrow">INSERAT-AI AUTOMATION</div>
            <h1>Objekt rein. Inserat fertig.</h1>
            <p>
              Exposé und Bilder hochladen. Inserat-AI liest die Objektdaten,
              analysiert die Fotos und erstellt daraus den fertigen Inserattext.
            </p>

            <div className="steps">
              {steps.map(([number, label, active]) => (
                <div
                  key={number}
                  className={`step ${active ? "active" : ""}`}
                >
                  <span>{number}</span>
                  <strong>{label}</strong>
                </div>
              ))}
            </div>
          </header>

          <section className="workCard">
            <div className="uploadGrid">
              <label className={`dropCard ${exposeFile ? "hasFile" : ""}`}>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;

                    if (file && file.size > MAX_EXPOSE_BYTES) {
                      setExposeFile(null);
                      setError(
                        "Dieses Exposé ist grösser als 25 MB. Bitte die PDF komprimieren und erneut auswählen."
                      );
                    } else {
                      setExposeFile(file);
                      setVariants([]);
                      setError("");
                      setStage("upload");
                    }

                    event.target.value = "";
                  }}
                />
                <div className="dropIcon">▤</div>
                <div>
                  <strong>
                    {exposeFile ? "Exposé bereit" : "Exposé hochladen"}
                  </strong>
                  <small>
                    {exposeFile
                      ? `${exposeFile.name} · ${(exposeFile.size / 1024 / 1024).toFixed(1)} MB`
                      : "PDF, DOCX oder TXT · bis 25 MB"}
                  </small>
                </div>
              </label>

              <label className={`dropCard ${images.length ? "hasFile" : ""}`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImages}
                />
                <div className="dropIcon">▧</div>
                <div>
                  <strong>
                    {images.length
                      ? `${images.length} Bilder bereit`
                      : "Bilder hinzufügen"}
                  </strong>
                  <small>Bis zu 10 Objektfotos</small>
                </div>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="previewRow">
                {imagePreviews.slice(0, 6).map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Objektfoto ${index + 1}`}
                  />
                ))}
                {imagePreviews.length > 6 && (
                  <div className="morePhotos">
                    +{imagePreviews.length - 6}
                  </div>
                )}
              </div>
            )}

            {stage === "upload" && (
              <button className="primary" onClick={runAutomation}>
                Alles automatisch erstellen
                <span>→</span>
              </button>
            )}

            {(stage === "working" || statusText || error) && (
              <div className={`status ${error ? "error" : ""}`}>
                {stage === "working" && !error && <span className="pulse" />}
                {error || statusText}
              </div>
            )}

            {(stage === "review" || stage === "ready") && (
              <div className="review">
                <div className="reviewHead">
                  <div>
                    <div className="eyebrow">KURZE KONTROLLE</div>
                    <h2>Nur prüfen, was Inserat-AI erkannt hat</h2>
                  </div>
                  {data.sourceSummary && (
                    <div className="confidence">✓ Daten übernommen</div>
                  )}
                </div>

                <div className="factsGrid">
                  <Field
                    label="Objektname"
                    value={data.projectName}
                    onChange={(value) =>
                      setData({ ...data, projectName: value })
                    }
                  />
                  <Field
                    label="Objektart"
                    value={data.propertyType}
                    onChange={(value) =>
                      setData({ ...data, propertyType: value })
                    }
                    required
                  />
                  <Field
                    label="Ort"
                    value={data.location}
                    onChange={(value) =>
                      setData({ ...data, location: value })
                    }
                    required
                  />
                  <Field
                    label="PLZ"
                    value={data.postalCode}
                    onChange={(value) =>
                      setData({ ...data, postalCode: value })
                    }
                  />
                  <Field
                    label="Zimmer"
                    value={data.rooms}
                    onChange={(value) =>
                      setData({ ...data, rooms: value })
                    }
                  />
                  <Field
                    label="Wohnfläche"
                    value={data.livingArea}
                    onChange={(value) =>
                      setData({ ...data, livingArea: value })
                    }
                  />
                  <Field
                    label="Preis"
                    value={data.price}
                    onChange={(value) =>
                      setData({ ...data, price: value })
                    }
                  />
                  <Field
                    label="Highlights"
                    value={data.highlights}
                    onChange={(value) =>
                      setData({ ...data, highlights: value })
                    }
                    wide
                  />
                </div>

                {data.sourceSummary && (
                  <div className="summary">{data.sourceSummary}</div>
                )}

                {stage === "review" && (
                  <button
                    className="primary"
                    disabled={!coreReady}
                    onClick={() =>
                      generateListing().catch((generationError) => {
                        setError(
                          generationError instanceof Error
                            ? friendlyError(generationError.message)
                            : "Der Text konnte nicht erstellt werden."
                        );
                      })
                    }
                  >
                    Inserat automatisch fertigstellen
                    <span>→</span>
                  </button>
                )}
              </div>
            )}

            {stage === "ready" && variants.length > 0 && (
              <div className="result">
                <div className="resultTop">
                  <div>
                    <div className="eyebrow">INSERAT FERTIG</div>
                    <h2>{variants[activeVariant]?.title}</h2>
                  </div>
                  <div className="variantTabs">
                    {variants.map((_, index) => (
                      <button
                        key={index}
                        className={activeVariant === index ? "active" : ""}
                        onClick={() => setActiveVariant(index)}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="listingText">
                  {variants[activeVariant]?.text}
                </p>

                <div className="finalActions">
                  <button
                    className="secondary"
                    onClick={() => setStage("review")}
                  >
                    Angaben bearbeiten
                  </button>
                  <button
                    className="publish"
                    disabled={saving}
                    onClick={saveAndOpenCockpit}
                  >
                    {saving
                      ? "Wird vorbereitet …"
                      : "Weiter zur Veröffentlichung"}
                    {!saving && <span>→</span>}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <style jsx>{`
          .automationPage {
            min-height: calc(100vh - 80px);
            padding: 22px;
            background:
              radial-gradient(circle at 88% 12%, rgba(245, 158, 11, 0.14), transparent 28%),
              radial-gradient(circle at 10% 82%, rgba(37, 99, 235, 0.18), transparent 32%),
              linear-gradient(135deg, #06172c 0%, #0a2342 58%, #102744 100%);
            color: #fff;
          }
          .automationShell {
            max-width: 1180px;
            margin: 0 auto;
          }
          .automationHero {
            padding: 34px;
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 24px;
            background: rgba(8, 29, 55, 0.72);
            box-shadow: 0 24px 70px rgba(2, 6, 23, 0.26);
          }
          .eyebrow {
            color: #fbbf24;
            font-size: 11px;
            letter-spacing: 0.14em;
            font-weight: 950;
          }
          h1 {
            margin: 8px 0 10px;
            font-size: clamp(34px, 5vw, 58px);
            line-height: 1.02;
            letter-spacing: -0.045em;
          }
          .automationHero p {
            max-width: 780px;
            margin: 0;
            color: #cbd5e1;
            line-height: 1.65;
            font-size: 16px;
          }
          .steps {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 26px;
          }
          .step {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.045);
            color: #94a3b8;
            border: 1px solid rgba(255, 255, 255, 0.06);
          }
          .step span {
            display: grid;
            place-items: center;
            width: 25px;
            height: 25px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.08);
            font-size: 11px;
          }
          .step strong {
            font-size: 12px;
          }
          .step.active {
            color: #fff;
            border-color: rgba(251, 191, 36, 0.4);
            background: rgba(245, 158, 11, 0.12);
          }
          .step.active span {
            background: #f59e0b;
            color: #fff;
          }
          .workCard {
            margin-top: 16px;
            padding: 24px;
            border-radius: 24px;
            border: 1px solid rgba(148, 163, 184, 0.18);
            background: rgba(5, 22, 43, 0.82);
            box-shadow: 0 22px 60px rgba(2, 6, 23, 0.24);
          }
          .uploadGrid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }
          .dropCard {
            min-height: 150px;
            padding: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            border: 1px dashed rgba(148, 163, 184, 0.38);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.035);
            cursor: pointer;
            transition: 0.18s ease;
          }
          .dropCard:hover {
            transform: translateY(-2px);
            border-color: rgba(251, 191, 36, 0.58);
            background: rgba(251, 191, 36, 0.06);
          }
          .dropCard.hasFile {
            border-style: solid;
            border-color: rgba(52, 211, 153, 0.42);
            background: rgba(16, 185, 129, 0.07);
          }
          .dropCard input {
            display: none;
          }
          .dropIcon {
            display: grid;
            place-items: center;
            width: 50px;
            height: 50px;
            border-radius: 16px;
            background: rgba(245, 158, 11, 0.14);
            color: #fbbf24;
            font-size: 28px;
          }
          .dropCard strong {
            display: block;
            font-size: 16px;
          }
          .dropCard small {
            display: block;
            margin-top: 5px;
            color: #94a3b8;
          }
          .previewRow {
            display: flex;
            gap: 8px;
            margin-top: 14px;
            overflow-x: auto;
          }
          .previewRow img,
          .morePhotos {
            width: 82px;
            height: 64px;
            flex: 0 0 auto;
            border-radius: 12px;
            object-fit: cover;
            border: 1px solid rgba(255, 255, 255, 0.12);
          }
          .morePhotos {
            display: grid;
            place-items: center;
            background: rgba(255, 255, 255, 0.07);
            color: #cbd5e1;
            font-weight: 900;
          }
          .primary,
          .publish {
            width: 100%;
            min-height: 54px;
            margin-top: 18px;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            border: 0;
            border-radius: 15px;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            color: #fff;
            font-weight: 950;
            font-size: 15px;
            cursor: pointer;
            box-shadow: 0 15px 38px rgba(249, 115, 22, 0.23);
          }
          .primary:disabled,
          .publish:disabled {
            opacity: 0.42;
            cursor: not-allowed;
          }
          .primary span,
          .publish span {
            font-size: 20px;
          }
          .status {
            margin-top: 16px;
            padding: 13px 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-radius: 13px;
            border: 1px solid rgba(96, 165, 250, 0.22);
            background: rgba(37, 99, 235, 0.08);
            color: #bfdbfe;
            font-size: 13px;
            font-weight: 750;
          }
          .status.error {
            border-color: rgba(248, 113, 113, 0.34);
            background: rgba(127, 29, 29, 0.18);
            color: #fecaca;
          }
          .pulse {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #fbbf24;
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.55);
            animation: pulse 1.4s infinite;
          }
          @keyframes pulse {
            70% {
              box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
            }
          }
          .review,
          .result {
            margin-top: 20px;
            padding: 22px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.045);
            border: 1px solid rgba(255, 255, 255, 0.09);
          }
          .reviewHead,
          .resultTop {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }
          .review h2,
          .result h2 {
            margin: 5px 0 0;
            font-size: 22px;
            letter-spacing: -0.02em;
          }
          .confidence {
            padding: 7px 10px;
            border-radius: 999px;
            border: 1px solid rgba(52, 211, 153, 0.28);
            background: rgba(16, 185, 129, 0.08);
            color: #86efac;
            font-size: 11px;
            font-weight: 900;
            white-space: nowrap;
          }
          .factsGrid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-top: 18px;
          }
          .summary {
            margin-top: 14px;
            padding: 13px 14px;
            border-radius: 13px;
            background: rgba(15, 23, 42, 0.46);
            color: #cbd5e1;
            line-height: 1.55;
            font-size: 13px;
          }
          .variantTabs {
            display: flex;
            gap: 6px;
          }
          .variantTabs button {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: #cbd5e1;
            cursor: pointer;
            font-weight: 900;
          }
          .variantTabs button.active {
            background: #f59e0b;
            color: #fff;
            border-color: #f59e0b;
          }
          .listingText {
            margin: 20px 0 0;
            padding: 20px;
            border-radius: 16px;
            background: #fff;
            color: #334155;
            line-height: 1.75;
            white-space: pre-line;
          }
          .finalActions {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px;
            margin-top: 14px;
          }
          .finalActions .publish {
            margin: 0;
          }
          .secondary {
            min-height: 54px;
            padding: 0 18px;
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.13);
            background: rgba(255, 255, 255, 0.055);
            color: #e2e8f0;
            font-weight: 850;
            cursor: pointer;
          }
          @media (max-width: 760px) {
            .automationPage {
              padding: 10px;
            }
            .automationHero,
            .workCard {
              padding: 18px;
              border-radius: 18px;
            }
            .uploadGrid,
            .factsGrid,
            .finalActions {
              grid-template-columns: 1fr;
            }
            .steps {
              grid-template-columns: repeat(2, 1fr);
            }
            .reviewHead,
            .resultTop {
              flex-direction: column;
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
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>
        {label}
        {required && !value.trim() ? " · fehlt" : ""}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <style jsx>{`
        .field {
          display: grid;
          gap: 7px;
        }
        .wide {
          grid-column: 1 / -1;
        }
        span {
          color: ${required && !value.trim() ? "#fbbf24" : "#94a3b8"};
          font-size: 11px;
          font-weight: 850;
        }
        input {
          width: 100%;
          box-sizing: border-box;
          min-height: 46px;
          padding: 0 13px;
          border-radius: 11px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.5);
          color: #fff;
          outline: none;
        }
        input:focus {
          border-color: rgba(251, 191, 36, 0.55);
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.08);
        }
      `}</style>
    </label>
  );
}
