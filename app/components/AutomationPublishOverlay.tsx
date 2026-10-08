"use client";

import { prepareAutopilotImageForUpload } from "@/lib/autopilot-image-compression";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const MAX_IMAGE_COUNT = 20;
const MAX_DOCUMENT_COUNT = 10;
const MAX_FILES =
  MAX_IMAGE_COUNT + MAX_DOCUMENT_COUNT;

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_DOCUMENT_SIZE =
  50 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

function safeFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") ||
    "objektdatei"
  );
}

export default function AutomationPublishOverlay() {
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const [open, setOpen] =
    useState(false);

  const [running, setRunning] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [stage, setStage] =
    useState(
      "Objektunterlagen + Bilder rein. Inserat-AI macht den Rest."
    );

  const [error, setError] =
    useState("");

  const [listingId, setListingId] =
    useState<string | null>(null);

  const [packageFiles, setPackageFiles] =
    useState<File[]>([]);

  useEffect(() => {
    const openOverlay = () => {
      setPackageFiles([]);
      setListingId(null);
      setProgress(0);
      setOpen(true);
      setError("");
    };

    const closeOverlay = () => {
      if (!running) {
        setOpen(false);
      }
    };

    window.addEventListener(
      "inserat-ai:open-automation",
      openOverlay
    );

    window.addEventListener(
      "inserat-ai:close-automation",
      closeOverlay
    );

    return () => {
      window.removeEventListener(
        "inserat-ai:open-automation",
        openOverlay
      );

      window.removeEventListener(
        "inserat-ai:close-automation",
        closeOverlay
      );
    };
  }, [running]);

  async function runAutomation(
    selectedFiles: File[]
  ) {
    if (
      running ||
      selectedFiles.length === 0
    ) {
      return;
    }

    setError("");
    setListingId(null);
    setProgress(0);

    console.info(
      "[AUTOPILOT_FILES_SELECTED]",
      selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }))
    );

    if (
      selectedFiles.length > MAX_FILES
    ) {
      setError(
        "Maximal 1 Exposé-PDF und 10 Bilder pro Objekt."
      );
      return;
    }

    const pdfFiles =
      selectedFiles.filter(
        (file) =>
          file.type === "application/pdf"
      );

    const imageFiles =
      selectedFiles.filter(
        (file) =>
          [
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(file.type)
      );

    if (
      pdfFiles.length >
      MAX_DOCUMENT_COUNT
    ) {
      setError(
        "Bitte maximal 10 PDF-Dokumente hochladen."
      );
      return;
    }

    if (
      imageFiles.length >
        MAX_IMAGE_COUNT
    ) {
      setError(
        "Bitte maximal 20 Bilder hochladen."
      );
      return;
    }

    const invalidFile =
      selectedFiles.find(
        (file) => {
          if (
            !ALLOWED_TYPES.has(file.type) ||
            file.size <= 0
          ) {
            return true;
          }

          const maximumSize =
            file.type ===
            "application/pdf"
              ? MAX_DOCUMENT_SIZE
              : MAX_IMAGE_SIZE;

          return (
            file.size > maximumSize
          );
        }
      );

    if (invalidFile) {
      setError(
        "PDF maximal 50 MB, Bilder maximal 10 MB. Erlaubt: PDF, JPEG, PNG und WebP."
      );
      return;
    }

    try {
      setRunning(true);

      setStage(
        "Objekt wird vorbereitet …"
      );

      const draftResponse =
        await fetch(
          "/api/autopilot/draft",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({}),
          }
        );

      const draft =
        (await draftResponse
          .json()
          .catch(() => ({}))) as {
          success?: boolean;
          listingId?: string;
          error?: string;
        };

      if (
        draftResponse.status === 401
      ) {
        window.location.href =
          "/login";
        return;
      }

      if (
        !draftResponse.ok ||
        !draft.success ||
        !draft.listingId
      ) {
        throw new Error(
          draft.error ||
            "Das Objekt konnte nicht vorbereitet werden."
        );
      }

      const nextListingId =
        draft.listingId;

      setListingId(nextListingId);

      setStage(
        `${selectedFiles.length} Dateien werden parallel hochgeladen …`
      );

      const uploadedRefs =
        await Promise.all(
          selectedFiles.map(
            async (file, index) => {
              const uploadFile =
                file.type === "application/pdf"
                  ? file
                  : await prepareAutopilotImageForUpload(
                      file
                    );

                            const presignResponse =
                await fetch(
                  "/api/autopilot/upload-presign",
                  {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body: JSON.stringify({
                      listingId:
                        nextListingId,
                      fileName:
                        uploadFile.name,
                      contentType:
                        uploadFile.type,
                      size:
                        uploadFile.size,
                    }),
                  }
                );

              const presign =
                (await presignResponse
                  .json()
                  .catch(() => ({}))) as {
                  success?: boolean;
                  error?: string;
                  pathname?: string;
                  uploadUrl?: string;
                };

              if (
                !presignResponse.ok ||
                !presign.success ||
                !presign.pathname ||
                !presign.uploadUrl
              ) {
                throw new Error(
                  presign.error ||
                    "Upload konnte nicht vorbereitet werden."
                );
              }

              const storageResponse =
                await fetch(
                  presign.uploadUrl,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type":
                        uploadFile.type,
                    },
                    body: uploadFile,
                  }
                );

              if (!storageResponse.ok) {
                throw new Error(
                  "Datei konnte nicht in den Speicher hochgeladen werden."
                );
              }

              const completeResponse =
                await fetch(
                  "/api/autopilot/upload-complete",
                  {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body: JSON.stringify({
                      listingId:
                        nextListingId,
                      pathname:
                        presign.pathname,
                      fileName:
                        uploadFile.name,
                      contentType:
                        uploadFile.type,
                    }),
                  }
                );

              const complete =
                (await completeResponse
                  .json()
                  .catch(() => ({}))) as {
                  success?: boolean;
                  error?: string;
                  pathname?: string;
                };

              if (
                !completeResponse.ok ||
                !complete.success ||
                !complete.pathname
              ) {
                throw new Error(
                  complete.error ||
                    "Upload konnte nicht best?tigt werden."
                );
              }

setProgress(
                (current) =>
                  current + 1
              );

              return {
                pathname:
                  complete.pathname,
                fileName: uploadFile.name,
              };
            }
          )
        );

      console.info(
        "[AUTOPILOT_FILES_UPLOADED]",
        uploadedRefs
      );

      setStage(
  "Inserat-AI analysiert Objekt, Bilder und Exposé …"
);
      const runResponse =
        await fetch(
          "/api/autopilot/run",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              listingId:
                nextListingId,
              uploads:
                uploadedRefs,
            }),
          }
        );

      const runData =
        (await runResponse
          .json()
          .catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          autopilot?: {
            stage?:
              | "needs_confirmation"
              | "ready";
            missingFields?: string[];
          };
        };

      if (
        runResponse.status === 401
      ) {
        window.location.href =
          "/login";
        return;
      }

      if (
        !runResponse.ok ||
        !runData.success
      ) {
        throw new Error(
          runData.error ||
            "Die automatische Verarbeitung konnte nicht abgeschlossen werden."
        );
      }

      const missingFields =
        Array.isArray(
          runData.autopilot
            ?.missingFields
        )
          ? runData.autopilot
              ?.missingFields ?? []
          : [];

      if (
        runData.autopilot
          ?.stage === "ready"
      ) {
        setStage(
          "Objekt, Bewertung und Inserate sind vorbereitet."
        );
      } else {
        setStage(
          `Inserat vorbereitet. ${missingFields.length} ${
            missingFields.length === 1
              ? "Angabe muss"
              : "Angaben müssen"
          } noch bestätigt werden.`
        );
      }
    } catch (automationError) {
      console.error(
        "[automation-publish]",
        automationError
      );

      setError(
        automationError instanceof Error
          ? automationError.message
          : "Die Automation konnte nicht abgeschlossen werden."
      );

      setStage(
        "Automation gestoppt."
      );
    } finally {
      setRunning(false);
    }
  }

  function resetSelection() {
    if (running) {
      return;
    }

    setPackageFiles([]);
    setListingId(null);
    setProgress(0);
    setError("");
    setStage(
      "Objektunterlagen + Bilder rein. Inserat-AI macht den Rest."
    );

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(
        event.target.files ?? []
      );

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setPackageFiles((current) => [
      ...current,
      ...files,
    ]);
    setError("");
  }

  function handleDrop(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (running) {
      return;
    }

    const files =
      Array.from(
        event.dataTransfer.files
      );

    if (files.length === 0) {
      return;
    }

    setPackageFiles((current) => [
      ...current,
      ...files,
    ]);
    setError("");
  }

  const packagePdfCount =
    packageFiles.filter(
      (file) =>
        file.type === "application/pdf"
    ).length;

  const packageImageCount =
    packageFiles.filter(
      (file) =>
        [
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type)
    ).length;

  const packageFileCount =
    packageFiles.length;
  if (!open) {
    return null;
  }

  return (
    <div
      className="automationOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Automatisch veröffentlichen"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !running
        ) {
          setOpen(false);
        }
      }}
    >
      <section className="automationDialog">
        <button
          type="button"
          className="automationClose"
          disabled={running}
          onClick={() =>
            setOpen(false)
          }
       aria-label="Schließen"
        >
          ×
        </button>

        <div className="automationEyebrow">
         ⚡ INSERAT-AI AUTOMATION
        </div>

       <h2>Objekt hochladen</h2>

      <p className="automationIntro">
  Unterlagen und Bilder rein. Inserat-AI macht den Rest.
</p>

        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept=".pdf,image/jpeg,image/png,image/webp"
          onChange={handleChange}
        />

        <div
          className={`automationDrop ${
            running ? "running" : ""
          }`}
          onDragOver={(event) =>
            event.preventDefault()
          }
          onDrop={handleDrop}
          onClick={() => {
            if (!running) {
              inputRef.current
                ?.click();
            }
          }}
        >
         <div className="dropIcon">
  {running ? "…" : "+"}
</div>

          <strong>
            {running
              ? stage
              : packageFileCount > 0
                ? `${packageFileCount} Dateien im Objektpaket`
                : "Dateien hier ablegen"}
          </strong>

          <span>
            {running
              ? `${progress}/${Math.max(
                  packageFileCount,
                  1
                )} Uploads verarbeitet`
              : packageFileCount > 0
                ? `${packagePdfCount} PDF · ${packageImageCount} Bilder`
                : "PDF · JPG · PNG · WebP"}
          </span>

          {!running && (
            <button
              type="button"
              className="chooseButton"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current
                  ?.click();
              }}
            >
              Dateien auswählen
            </button>
          )}
        </div>

        {!running && packageFileCount > 0 && (
          <div className="packageReview">
            <div className="packageStatus">
              <strong>Objektpaket geprüft</strong>

              <span
                className={
                  packagePdfCount > 0
                    ? "packageOk"
                    : "packageNeutral"
                }
              >
                {packagePdfCount > 0
                  ? `✓ ${packagePdfCount} PDF-Dokument${
                      packagePdfCount === 1 ? "" : "e"
                    }`
                  : "Keine PDF ausgewählt"}
              </span>

              <span
                className={
                  packageImageCount > 0
                    ? "packageOk"
                    : "packageWarning"
                }
              >
                {packageImageCount > 0
                  ? `✓ ${packageImageCount} Objektbild${
                      packageImageCount === 1 ? "" : "er"
                    } erkannt`
                  : "⚠ Keine Objektbilder erkannt"}
              </span>

              {packageImageCount === 0 && (
                <p className="packageHint">
                  Inserat-AI kann die Unterlagen trotzdem
                  analysieren. Für ein vollständiges
                  Portal-Inserat solltest du Objektbilder
                  hinzufügen.
                </p>
              )}
            </div>

            <div className="packageActions">
              <button
                type="button"
                className="packageSecondary"
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                {packageImageCount === 0
                  ? "Bilder hinzufügen"
                  : "+ Weitere Dateien hinzufügen"}
              </button>

              <button
                type="button"
                className="packagePrimary"
                onClick={() =>
                  void runAutomation(packageFiles)
                }
              >
                {packageImageCount === 0
                  ? "Ohne Bilder fortfahren"
                  : "Objektpaket verarbeiten"}
              </button>
            </div>

            <button
              type="button"
              className="packageReset"
              onClick={resetSelection}
              disabled={running}
            >
              Auswahl zurücksetzen
            </button>
          </div>
        )}
        {running && (
          <div className="progressTrack">
            <div
              className="progressFill"
              style={{
                width:
                  `${Math.min(
                    100,
                    Math.max(
                      8,
                      (progress / Math.max(packageFileCount, 1)) *
                        100
                    )
                  )}%`,
              }}
            />
          </div>
        )}

        {error && (
          <div className="automationError">
            {error}
          </div>
        )}

        {listingId &&
          !running &&
          !error && (
            <div className="automationSuccess">
              <strong>{stage}</strong>

              <a
                href={`/cockpit/${listingId}#portal-publishing`}
              >
                Veröffentlichung öffnen →
              </a>
            </div>
          )}

       <div className="automationFlow">
  <span>Analyse · Bewertung · 3 Inserate · Veröffentlichung</span>
</div>
      </section>

      <style jsx>{`
        .automationOverlay {
          position: fixed;
          inset: 0;
          z-index: 12000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 8, 23, 0.68);
          backdrop-filter: blur(12px);
        }

        .automationDialog {
          position: relative;
          width: min(680px, 100%);
          padding: 30px;
          overflow: hidden;
          border: 1px solid rgba(251, 191, 36, 0.32);
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(8, 25, 52, 0.99),
              rgba(3, 13, 32, 0.99)
            );
          color: #ffffff;
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.52),
            0 0 50px rgba(245, 158, 11, 0.10);
        }

        .automationClose {
          position: absolute;
          top: 16px;
          right: 16px;
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          color: white;
          cursor: pointer;
          font-size: 22px;
        }

        .automationEyebrow {
          margin-bottom: 10px;
          color: #fbbf24;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        h2 {
          margin: 0;
          font-size: clamp(27px, 5vw, 42px);
          line-height: 1.02;
          letter-spacing: -0.04em;
        }

        .automationIntro {
          margin: 14px 0 22px;
          color: rgba(255, 255, 255, 0.67);
          font-size: 13px;
        }

        .automationDrop {
          display: grid;
          min-height: 260px;
          place-items: center;
          align-content: center;
          gap: 10px;
          padding: 28px;
          border: 1.5px dashed rgba(251, 191, 36, 0.50);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(251, 191, 36, 0.07),
              rgba(255, 255, 255, 0.025)
            );
          cursor: pointer;
          text-align: center;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .automationDrop:hover {
          transform: translateY(-2px);
          border-color: rgba(251, 191, 36, 0.88);
          background: rgba(251, 191, 36, 0.09);
        }

        .automationDrop.running {
          cursor: wait;
        }

        .packageReview {
          display: grid;
          gap: 14px;
          margin-top: 14px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
        }

        .packageStatus {
          display: grid;
          gap: 7px;
          font-size: 13px;
        }

        .packageStatus > strong {
          color: #ffffff;
        }

        .packageOk {
          color: #86efac;
        }

        .packageWarning {
          color: #fbbf24;
          font-weight: 700;
        }

        .packageNeutral {
          color: rgba(255, 255, 255, 0.65);
        }

        .packageHint {
          margin: 3px 0 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          line-height: 1.5;
        }

        .packageActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .packagePrimary,
        .packageSecondary {
          padding: 10px 15px;
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
        }

        .packagePrimary {
          border: 1px solid #f59e0b;
          background: #f59e0b;
          color: #07111f;
        }

        .packageSecondary {
          border: 1px solid rgba(251, 191, 36, 0.48);
          background: transparent;
          color: #fbbf24;
        }
        .dropIcon {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          border: 1px solid rgba(251, 191, 36, 0.55);
          border-radius: 18px;
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          font-size: 28px;
        }

        .automationDrop strong {
          font-size: 16px;
        }

        .automationDrop span {
          color: rgba(255, 255, 255, 0.57);
          font-size: 11px;
        }

        .chooseButton {
          margin-top: 7px;
          padding: 11px 17px;
          border: 1px solid rgba(251, 191, 36, 0.55);
          border-radius: 999px;
          background:
            linear-gradient(
              135deg,
              #d97706,
              #f59e0b
            );
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }

        .packageReset {
          display: block;
          margin: 14px auto 0;
          padding: 8px 12px;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.68);
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition:
            color 160ms ease,
            opacity 160ms ease;
        }

        .packageReset:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .packageReset:disabled {
          cursor: default;
          opacity: 0.45;
        }

        .progressTrack {
          height: 5px;
          margin-top: 14px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background: #f59e0b;
          transition: width 220ms ease;
        }

        .automationError,
        .automationSuccess {
          margin-top: 14px;
          padding: 13px 15px;
          border-radius: 14px;
          font-size: 12px;
        }

        .automationError {
          border: 1px solid rgba(248, 113, 113, 0.35);
          background: rgba(127, 29, 29, 0.24);
          color: #fecaca;
        }

        .automationSuccess {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid rgba(74, 222, 128, 0.30);
          background: rgba(20, 83, 45, 0.24);
        }

        .automationSuccess a {
          color: #fbbf24;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .automationFlow {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
        }

        .automationFlow span {
          padding: 6px 9px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 9px;
          font-weight: 800;
        }

        @media (max-width: 640px) {
          .automationOverlay {
            align-items: end;
            padding: 8px;
          }

          .automationDialog {
            padding: 24px 16px 18px;
            border-radius: 24px;
          }

          .automationDrop {
            min-height: 230px;
            padding: 20px 12px;
          }

          .automationIntro {
            padding-right: 30px;
          }

          .automationSuccess {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
