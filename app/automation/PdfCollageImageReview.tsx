"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

export type PdfCollageDecision =
  | "photo"
  | "floorplan"
  | "exclude";

export type PdfCollageDecisions =
  Record<number, PdfCollageDecision>;

type Props = {
  images: File[];
  imagePreviews: string[];
  decisions: PdfCollageDecisions;
  setDecisions: Dispatch<SetStateAction<PdfCollageDecisions>>;
  approved: boolean;
  setApproved: Dispatch<SetStateAction<boolean>>;
  clearError: () => void;
};

export default function PdfCollageImageReview({
  images,
  imagePreviews,
  decisions,
  setDecisions,
  approved,
  setApproved,
  clearError,
}: Props) {
  // PDF_IMAGE_QUALITY_T203
  const [dimensions, setDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const reviewIndices = images.flatMap((file, index) =>
    file.name.startsWith("review-collage-") ? [index] : []
  );

  if (reviewIndices.length === 0) {
    return null;
  }

  const allReviewed = reviewIndices.every(
    (index) => decisions[index] !== undefined
  );

  const hasPhoto = reviewIndices.some(
    (index) => decisions[index] === "photo"
  );

  return (
    <div
      role="group"
      aria-label="PDF-Bilder prüfen"
      style={{
        padding: 16,
        marginBottom: 16,
        border: "1px solid #d97706",
        borderRadius: 8,
      }}
    >
      <strong>Bildprüfung erforderlich</strong>

      <p>
        Bitte jedes erkannte Bild prüfen. Ungeeignete oder
        beschriftete Bilder ausschliessen.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        {reviewIndices.map((index) => (
          <div
            key={index}
            style={{
              padding: 8,
              border: "1px solid #777",
              borderRadius: 8,
            }}
          >
            {imagePreviews[index] && (
              <img
                src={imagePreviews[index]}
                alt={"Bild " + (index + 1)}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  const key = imagePreviews[index];

                  if (!key) return;

                  const width = image.naturalWidth;
                  const height = image.naturalHeight;

                  setDimensions((previous) => {
                    const existing = previous[key];

                    if (
                      existing?.width === width &&
                      existing?.height === height
                    ) return previous;

                    return {
                      ...previous,
                      [key]: { width, height },
                    };
                  });
                }}
                style={{
                  width: "100%",
                  height: 130,
                  objectFit: "contain",
                }}
              />
            )}

            {dimensions[imagePreviews[index]] &&
              (() => {
                const { width, height } =
                  dimensions[imagePreviews[index]];

                const tooSmall =
                  Math.max(width, height) < 800 ||
                  Math.min(width, height) < 500;

                return (
                  <p
                    role={tooSmall ? "status" : undefined}
                    style={{
                      fontSize: 13,
                      color: tooSmall ? "#92400e" : "inherit",
                    }}
                  >
                    {width} × {height} Pixel
                    {tooSmall
                      ? " – Niedrige Auflösung. Bitte möglichst ein Originalbild hochladen."
                      : ""}
                  </p>
                );
              })()}

            <label>
              Bild {index + 1}

              <select
                value={decisions[index] ?? ""}
                disabled={approved}
                aria-label={
                  "Bild " + (index + 1) + " klassifizieren"
                }
                onChange={(event) => {
                  const value = event.target.value;

                  if (
                    value !== "photo" &&
                    value !== "floorplan" &&
                    value !== "exclude"
                  ) {
                    return;
                  }

                  setDecisions((old) => ({
                    ...old,
                    [index]: value,
                  }));

                  setApproved(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                }}
              >
                <option value="">Bitte auswählen</option>
                <option value="photo">Immobilienfoto</option>
                <option value="floorplan">Grundriss</option>
                <option value="exclude">
                  Nicht übernehmen
                </option>
              </select>
            </label>
          </div>
        ))}
      </div>

      <p>
        {approved
          ? "Bildauswahl bestätigt."
          : "Bildauswahl noch offen."}
      </p>

      {approved ? (
        <button
          type="button"
          onClick={() => setApproved(false)}
        >
          Auswahl ändern
        </button>
      ) : (
        <button
          type="button"
          disabled={!allReviewed || !hasPhoto}
          onClick={() => {
            setApproved(true);
            clearError();
          }}
        >
          Bildauswahl bestätigen
        </button>
      )}
    </div>
  );
}