"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export type LocationAssistantCategory = {
  key: string;
  label: string;
  status: string;
  text: string;
};

export type LocationAssistantData = {
  version: number;
  source: string;
  country: string;
  postalCode: string;
  location: string;
  canton: string;
  cantonName: string;
  matchedAt: string;
  categories: LocationAssistantCategory[];
};

type LocationAssistantResponse = {
  success?: boolean;
  error?: string;
  match?: {
    zip: string;
    name: string;
    canton: string;
    cantonName: string;
  };
  locationDescription?: string;
  locationData?: LocationAssistantData;
  suggestions?: Array<{
    zip: string;
    name: string;
    canton: string;
  }>;
};

type LocationAssistantPanelProps = {
  postalCode: string;
  location: string;
  locationDescription: string;
  locationData: LocationAssistantData | null;
  onPostalCodeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDataChange: (value: LocationAssistantData | null) => void;
  locale: string;
};

export default function LocationAssistantPanel({
  postalCode,
  location,
  locationDescription,
  locationData,
  onPostalCodeChange,
  onLocationChange,
  onDescriptionChange,
  onDataChange,
  locale,
}: LocationAssistantPanelProps) {
  const t = useTranslations("LocationAssistant");
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const categories = useMemo(
    () =>
      Array.isArray(locationData?.categories)
        ? locationData.categories
        : [],
    [locationData]
  );

  async function analyzeLocation() {
    if (analyzing) {
      return;
    }

    if (!postalCode.trim() && !location.trim()) {
      setMessage(t("messages.enterLocation"));
      setMessageType("error");
      return;
    }

    try {
      setAnalyzing(true);
      setMessage("");
      setMessageType("");

      const response = await fetch("/api/location-assistant", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postalCode,
          location,
          locale,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as
        LocationAssistantResponse;

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok || !data.success) {
        const suggestionText = data.suggestions?.length
          ? t("messages.suggestions", {
              suggestions: data.suggestions
                .slice(0, 3)
                .map(
                  (suggestion) =>
                    `${suggestion.zip} ${suggestion.name}`
                )
                .join(", "),
            })
          : "";

        setMessage(
          `${data.error || t("messages.notRecognized")}${suggestionText}`
        );
        setMessageType("error");
        return;
      }

      if (
        !data.match ||
        !data.locationDescription ||
        !data.locationData
      ) {
        setMessage(t("messages.incomplete"));
        setMessageType("error");
        return;
      }

      onPostalCodeChange(data.match.zip);
      onLocationChange(data.match.name);
      onDescriptionChange(data.locationDescription);
      onDataChange(data.locationData);

      setMessage(
        t("messages.success", {
          postalCode: data.match.zip,
          location: data.match.name,
          canton: data.match.cantonName,
        })
      );
      setMessageType("success");
    } catch {
      setMessage(t("messages.unavailable"));
      setMessageType("error");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="locationAssistant" lang={locale}>
      <div className="locationAssistant__glow" />

      <div className="locationAssistant__header">
        <div>
          <span>{t("header.eyebrow")}</span>
          <h2>{t("header.title")}</h2>
          <p>{t("header.description")}</p>
        </div>

        <button
          type="button"
          className="locationAssistant__button"
          onClick={analyzeLocation}
          disabled={analyzing}
        >
          <span aria-hidden="true">⌖</span>
          {analyzing ? t("button.analyzing") : t("button.analyze")}
        </button>
      </div>

      {locationData && (
        <div className="locationAssistant__match">
          <div>
            <span>{t("match.location")}</span>
            <strong>
              {locationData.postalCode} {locationData.location}
            </strong>
          </div>

          <div>
            <span>{t("match.canton")}</span>
            <strong>
              {locationData.cantonName} ({locationData.canton})
            </strong>
          </div>

          <div>
            <span>{t("match.source")}</span>
            <strong>swisstopo</strong>
          </div>
        </div>
      )}

      <label className="locationAssistant__text">
        <span>{t("description.label")}</span>
        <textarea
          value={locationDescription}
          onChange={(event) =>
            onDescriptionChange(event.target.value)
          }
          placeholder={t("description.placeholder")}
          rows={6}
        />
        <small>{t("description.hint")}</small>
      </label>

      {categories.length > 0 && (
        <div className="locationAssistant__categories">
          {categories.map((category) => (
            <article key={category.key}>
              <span className="locationAssistant__categoryIcon">
                {category.key === "publicTransport"
                  ? t("categoryIcons.publicTransport")
                  : category.key === "schools"
                    ? t("categoryIcons.schools")
                    : category.key === "shopping"
                      ? t("categoryIcons.shopping")
                      : t("categoryIcons.leisure")}
              </span>

              <div>
                <strong>{category.label}</strong>
                <p>{category.text}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {message && (
        <div
          className={`locationAssistant__message locationAssistant__message--${messageType}`}
          role="status"
        >
          {message}
        </div>
      )}

      <style jsx>{`
        .locationAssistant {
          position: relative;
          margin-top: 30px;
          padding: 26px;
          overflow: hidden;
          border: 1px solid rgba(251, 191, 36, 0.24);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(37, 99, 235, 0.18),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              rgba(8, 20, 48, 0.94),
              rgba(15, 23, 42, 0.84)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 18px 42px rgba(2, 6, 23, 0.24);
        }

        .locationAssistant__glow {
          position: absolute;
          right: -110px;
          bottom: -130px;
          width: 260px;
          height: 260px;
          pointer-events: none;
          border-radius: 50%;
          background: rgba(249, 115, 22, 0.18);
          filter: blur(42px);
        }

        .locationAssistant__header,
        .locationAssistant__match,
        .locationAssistant__text,
        .locationAssistant__categories,
        .locationAssistant__message {
          position: relative;
          z-index: 1;
        }

        .locationAssistant__header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
        }

        .locationAssistant__header > div {
          max-width: 650px;
        }

        .locationAssistant__header span,
        .locationAssistant__match span,
        .locationAssistant__text > span {
          color: #fbbf24;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
        }

        .locationAssistant__header h2 {
          margin: 7px 0 8px;
          color: #ffffff;
          font-size: 24px;
          letter-spacing: -0.03em;
        }

        .locationAssistant__header p {
          margin: 0;
          color: rgba(226, 232, 240, 0.74);
          font-size: 14px;
          line-height: 1.6;
        }

        .locationAssistant__button {
          min-height: 52px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 16px;
          color: #07111f;
          background: linear-gradient(
            135deg,
            #f5b914,
            #ffd45f 58%,
            #f7b51a
          );
          box-shadow:
            0 14px 30px rgba(245, 185, 20, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.48);
          cursor: pointer;
          font-weight: 950;
        }

        .locationAssistant__button:disabled {
          cursor: wait;
          opacity: 0.68;
        }

        .locationAssistant__button > span {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          color: #fbbf24;
          background: #07111f;
          border-radius: 9px;
          font-size: 15px;
          letter-spacing: 0;
        }

        .locationAssistant__match {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          overflow: hidden;
          border: 1px solid rgba(96, 165, 250, 0.16);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.58);
        }

        .locationAssistant__match > div {
          min-height: 76px;
          padding: 16px 18px;
          display: grid;
          align-content: center;
          gap: 6px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .locationAssistant__match > div:last-child {
          border-right: 0;
        }

        .locationAssistant__match span {
          color: #7dd3fc;
          font-size: 9px;
        }

        .locationAssistant__match strong {
          color: #f8fafc;
          font-size: 14px;
        }

        .locationAssistant__text {
          margin-top: 22px;
          display: grid;
          gap: 9px;
        }

        .locationAssistant__text textarea {
          width: 100%;
          min-height: 145px;
          padding: 16px 18px;
          resize: vertical;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 16px;
          outline: none;
          color: #f8fafc;
          background: rgba(2, 6, 23, 0.58);
          font: inherit;
          line-height: 1.65;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .locationAssistant__text textarea:focus {
          border-color: rgba(251, 191, 36, 0.58);
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.08);
        }

        .locationAssistant__text small {
          color: rgba(203, 213, 225, 0.66);
          font-size: 12px;
        }

        .locationAssistant__categories {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .locationAssistant__categories article {
          min-height: 104px;
          padding: 15px;
          display: grid;
          grid-template-columns: 38px 1fr;
          gap: 12px;
          align-items: start;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.035);
        }

        .locationAssistant__categoryIcon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(96, 165, 250, 0.22);
          border-radius: 12px;
          color: #7dd3fc;
          background: rgba(37, 99, 235, 0.12);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0;
        }

        .locationAssistant__categories strong {
          color: #ffffff;
          font-size: 14px;
        }

        .locationAssistant__categories p {
          margin: 5px 0 0;
          color: rgba(203, 213, 225, 0.7);
          font-size: 12px;
          line-height: 1.5;
        }

        .locationAssistant__message {
          margin-top: 18px;
          padding: 13px 15px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.5;
        }

        .locationAssistant__message--success {
          border: 1px solid rgba(34, 197, 94, 0.28);
          color: #bbf7d0;
          background: rgba(34, 197, 94, 0.1);
        }

        .locationAssistant__message--error {
          border: 1px solid rgba(248, 113, 113, 0.3);
          color: #fecaca;
          background: rgba(127, 29, 29, 0.22);
        }

        @media (max-width: 760px) {
          .locationAssistant {
            padding: 20px;
          }

          .locationAssistant__header {
            grid-template-columns: 1fr;
          }

          .locationAssistant__button {
            width: 100%;
          }

          .locationAssistant__match,
          .locationAssistant__categories {
            grid-template-columns: 1fr;
          }

          .locationAssistant__match > div {
            border-right: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .locationAssistant__match > div:last-child {
            border-bottom: 0;
          }
        }
      `}</style>
    </section>
  );
}
