"use client";

import {
  useState,
  type ChangeEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";

type FloorPlanAnalysis = {
  summary: string;
  stagingInstructions: string;
  rooms: string[];
};

type FloorPlanAnalyzerProps = {
  listingId: string;
  disabled?: boolean;
  onApply: (instructions: string) => void;
};

export default function FloorPlanAnalyzer({
  listingId,
  disabled = false,
  onApply,
}: FloorPlanAnalyzerProps) {
  const locale = useLocale();
  const t = useTranslations("HomeStaging.floorPlan");
  const [fileName, setFileName] =
    useState("");
  const [analyzing, setAnalyzing] =
    useState(false);
  const [error, setError] =
    useState("");
  const [analysis, setAnalysis] =
    useState<FloorPlanAnalysis | null>(null);
  const [applied, setApplied] =
    useState(false);

  async function handlePdfUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] || null;

    event.target.value = "";

    if (!file || analyzing || disabled) {
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError(
        t("errors.pdfOnly")
      );
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError(
        t("errors.tooLarge")
      );
      return;
    }

    try {
      setAnalyzing(true);
      setError("");
      setAnalysis(null);
      setApplied(false);
      setFileName(file.name);

      const body = new FormData();

      body.append("listingId", listingId);
      body.append("file", file);
      body.append("locale", locale);

      const response = await fetch(
        `/api/home-staging/floor-plan?locale=${encodeURIComponent(locale)}`,
        {
          method: "POST",
          credentials: "include",
          body,
        }
      );

      const data = (await response
        .json()
        .catch(() => ({}))) as {
        success?: boolean;
        analysis?: FloorPlanAnalysis;
        error?: string;
      };

      if (
        !response.ok ||
        !data.success ||
        !data.analysis
      ) {
        throw new Error(
          data.error ||
            t("errors.analyze")
        );
      }

      setAnalysis(data.analysis);
    } catch (uploadError) {
      console.error(
        "Grundrissanalyse fehlgeschlagen:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("errors.analyze")
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function applyInstructions() {
    if (
      !analysis?.stagingInstructions
    ) {
      return;
    }

    onApply(
      analysis.stagingInstructions.slice(
        0,
        500
      )
    );

    setApplied(true);
  }

  return (
    <section className="floorPlanPanel">
      <div className="floorPlanHeading">
        <span className="floorPlanNumber">
          5
        </span>

        <div>
          <small>{t("eyebrow")}</small>
          <h2>{t("title")}</h2>
        </div>
      </div>

      <p className="floorPlanIntro">{t("description")}</p>

      <label
        className={
          analyzing || disabled
            ? "floorPlanUpload floorPlanUploadDisabled"
            : "floorPlanUpload"
        }
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={analyzing || disabled}
          onChange={handlePdfUpload}
        />

        <span
          className="floorPlanIcon"
          aria-hidden="true"
        >{t("pdfLabel")}</span>

        <div>
          <strong>
            {analyzing
              ? t("analyzing")
              : t("upload")}
          </strong>

          <small>{t("uploadHint")}</small>
        </div>
      </label>

      {fileName ? (
        <p className="floorPlanFileName">
          {t("selectedFile")}
          {" "}
          <strong>{fileName}</strong>
        </p>
      ) : null}

      {error ? (
        <div
          className="floorPlanNotice floorPlanError"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {analysis ? (
        <div className="floorPlanResult">
          <div className="floorPlanResultHeader">
            <div>
              <small>{t("resultEyebrow")}</small>
              <h3>{t("resultTitle")}</h3>
            </div>

            <span>✓</span>
          </div>

          <p>{analysis.summary}</p>

          {analysis.rooms.length > 0 ? (
            <div className="floorPlanRooms">
              {analysis.rooms.map((room) => (
                <span key={room}>
                  {room}
                </span>
              ))}
            </div>
          ) : null}

          <div className="floorPlanInstruction">
            <small>{t("suggestionEyebrow")}</small>

            <p>
              {analysis.stagingInstructions}
            </p>
          </div>

          <button
            type="button"
            className="floorPlanApply"
            onClick={applyInstructions}
            disabled={disabled}
          >
            {applied
              ? t("applied")
              : t("apply")}
          </button>
        </div>
      ) : null}

      <style jsx>{`
        .floorPlanPanel {
          padding: 26px;
          border: 1px solid
            rgba(148, 163, 184, 0.18);
          border-radius: 20px;
          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.92),
              rgba(9, 18, 38, 0.92)
            );
        }

        .floorPlanHeading {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .floorPlanNumber {
          display: grid;
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid
            rgba(251, 191, 36, 0.5);
          border-radius: 50%;
          background:
            rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          font-weight: 900;
        }

        .floorPlanHeading small,
        .floorPlanResultHeader small,
        .floorPlanInstruction small {
          color: #93c5fd;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.09em;
        }

        .floorPlanHeading h2,
        .floorPlanResultHeader h3 {
          margin: 5px 0 0;
          color: #ffffff;
        }

        .floorPlanIntro {
          margin: 18px 0;
          color: #94a3b8;
          line-height: 1.6;
        }

        .floorPlanUpload {
          display: flex;
          min-height: 82px;
          align-items: center;
          gap: 15px;
          padding: 15px 17px;
          border: 1px dashed
            rgba(34, 211, 238, 0.5);
          border-radius: 15px;
          background:
            linear-gradient(
              135deg,
              rgba(8, 145, 178, 0.13),
              rgba(79, 70, 229, 0.13)
            );
          cursor: pointer;
        }

        .floorPlanUpload input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .floorPlanUploadDisabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .floorPlanIcon {
          display: grid;
          width: 50px;
          height: 50px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid
            rgba(251, 191, 36, 0.45);
          border-radius: 13px;
          background:
            rgba(245, 158, 11, 0.13);
          color: #fde68a;
          font-size: 12px;
          font-weight: 950;
        }

        .floorPlanUpload div {
          display: grid;
          gap: 5px;
        }

        .floorPlanUpload strong {
          color: #ffffff;
        }

        .floorPlanUpload small {
          color: #94a3b8;
        }

        .floorPlanFileName {
          margin: 11px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .floorPlanFileName strong {
          color: #e2e8f0;
        }

        .floorPlanNotice {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          line-height: 1.5;
        }

        .floorPlanError {
          border: 1px solid
            rgba(248, 113, 113, 0.35);
          background:
            rgba(127, 29, 29, 0.18);
          color: #fecaca;
        }

        .floorPlanResult {
          display: grid;
          gap: 15px;
          margin-top: 18px;
          padding: 18px;
          border: 1px solid
            rgba(34, 211, 238, 0.3);
          border-radius: 16px;
          background:
            rgba(2, 6, 23, 0.55);
        }

        .floorPlanResultHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .floorPlanResultHeader > span {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 50%;
          background:
            rgba(34, 197, 94, 0.15);
          color: #86efac;
          font-weight: 900;
        }

        .floorPlanResult > p,
        .floorPlanInstruction p {
          margin: 0;
          color: #cbd5e1;
          line-height: 1.65;
        }

        .floorPlanRooms {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .floorPlanRooms span {
          padding: 6px 10px;
          border: 1px solid
            rgba(96, 165, 250, 0.26);
          border-radius: 999px;
          background:
            rgba(30, 64, 175, 0.12);
          color: #bfdbfe;
          font-size: 11px;
          font-weight: 800;
        }

        .floorPlanInstruction {
          display: grid;
          gap: 7px;
          padding: 14px;
          border-left: 3px solid #fbbf24;
          border-radius: 10px;
          background:
            rgba(120, 53, 15, 0.13);
        }

        .floorPlanApply {
          min-height: 45px;
          padding: 0 17px;
          border: 1px solid
            rgba(251, 191, 36, 0.55);
          border-radius: 12px;
          background:
            linear-gradient(
              135deg,
              #d97706,
              #f59e0b
            );
          color: #111827;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
        }

        .floorPlanApply:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        @media (max-width: 640px) {
          .floorPlanPanel {
            padding: 19px;
          }

          .floorPlanUpload {
            align-items: flex-start;
          }
        }
      `}</style>
    </section>
  );
}
