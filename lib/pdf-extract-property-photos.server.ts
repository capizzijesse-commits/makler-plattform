import {
  extractPdfImageCandidates,
  type PdfImageCandidate,
} from "@/lib/pdf-extract-image-candidates.server";

import {
  classifyPdfImageCandidates,
  type ClassifiedPdfImageCandidate,
} from "@/lib/pdf-image-candidate-classifier.server";

export type ExtractedPdfPropertyPhoto = {
  buffer: Buffer;
  width: number;
  height: number;
  pageNumber: number;
  imageIndex: number;
  candidateIndex: number;
  confidence: number;
  reason: string;
};

export type ExtractPdfPropertyPhotosResult = {
  candidateCount: number;
  propertyPhotoCount: number;
  photos: ExtractedPdfPropertyPhoto[];
};

type ExtractPdfPropertyPhotosOptions = {
  maximumPhotos?: number;
  minimumConfidence?: number;
  renderPages?: boolean;
};

/*
 * PDF_PROPERTY_PHOTOS_V1
 *
 * Complete PDF -> image candidates -> semantic classification
 * -> usable real-estate photographs.
 *
 * Important:
 * - property photos are included
 * - floorplans are included
 * - maps / site plans are included
 * - documents are excluded
 * - uncertain candidates fail closed
 * - the original PDF candidate order is preserved
 *
 * Detailed room analysis and sales ordering remain separate.
 */
export async function extractPropertyPhotosFromPdf(
  pdfBuffer: Buffer,
  options: ExtractPdfPropertyPhotosOptions = {}
): Promise<ExtractPdfPropertyPhotosResult> {
  const maximumPhotos =
    options.maximumPhotos == null
      ? Number.POSITIVE_INFINITY
      : Math.max(
          1,
          Math.floor(
            options.maximumPhotos
          )
        );

  const minimumConfidence =
    Math.max(
      0,
      Math.min(
        1,
        options.minimumConfidence ?? 0.7
      )
    );

  // PDF_PROPERTY_PHOTOS_PROFILE_V1
  const totalStartedAt =
    performance.now();

  const candidateStartedAt =
    performance.now();

  const candidates =
    await extractPdfImageCandidates(
      pdfBuffer,
      {
        renderPages:
          options.renderPages === true,
      }
    );

  console.log("[PDF PHOTO SPEED] candidates", {
    durationMs: Math.round(
      performance.now() - candidateStartedAt
    ),
    count: candidates.length,
  });

  if (!candidates.length) {
    return {
      candidateCount: 0,
      propertyPhotoCount: 0,
      photos: [],
    };
  }

  const classificationStartedAt =
    performance.now();

  const classifications =
    await classifyPdfImageCandidates(
      candidates
    );

  console.log("[PDF PHOTO SPEED] classification", {
    durationMs: Math.round(
      performance.now() - classificationStartedAt
    ),
    count: classifications.length,
  });

  const photos =
    classifications
      .filter(
        (
          classification
        ): classification is ClassifiedPdfImageCandidate =>
          (
            classification.category ===
              "property_photo" ||
            classification.category ===
              "floorplan" ||
            classification.category ===
              "map"
          ) &&
          classification.confidence >=
            minimumConfidence
      )
      .map((classification) => {
        const candidate:
          PdfImageCandidate | undefined =
            candidates[
              classification.candidateIndex
            ];

        if (!candidate) {
          return null;
        }

        return {
          buffer:
            candidate.buffer,
          width:
            candidate.width,
          height:
            candidate.height,
          pageNumber:
            candidate.pageNumber,
          imageIndex:
            candidate.imageIndex,
          candidateIndex:
            classification.candidateIndex,
          confidence:
            classification.confidence,
          reason:
            classification.reason,
        };
      })
      .filter(
        (
          photo
        ): photo is ExtractedPdfPropertyPhoto =>
          photo !== null
      );

  console.log("[PDF PHOTO SPEED] total", {
    durationMs: Math.round(
      performance.now() - totalStartedAt
    ),
    candidateCount: candidates.length,
    propertyPhotoCount: photos.length,
    returnedPhotos: Math.min(
      photos.length,
      maximumPhotos
    ),
  });

  return {
    candidateCount:
      candidates.length,

    /*
     * Count before the maximumPhotos limit so diagnostics
     * still show how many usable photos existed in the PDF.
     */
    propertyPhotoCount:
      photos.length,

    photos:
      photos.slice(
        0,
        maximumPhotos
      ),
  };
}
