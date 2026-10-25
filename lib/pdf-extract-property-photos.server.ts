import { getSafeImageRoomEvidence, type SafeImageRoomEvidence } from "@/lib/image-expose-consistency";
import {
  extractPdfImageCandidates,
  type PdfImageCandidate,
} from "@/lib/pdf-extract-image-candidates.server";

import {
  analyzeImageBatch,
} from "@/lib/image-batch-analyzer.server";


export type ExtractedPdfPropertyPhoto = {
  room?: string | null;
  roomConfidence?: number | null;
  roomIndependentFacts?: { fact: string; confidence: number }[];

  buffer: Buffer;
  width: number;
  height: number;
  pageNumber: number;
  imageIndex: number;
  candidateIndex: number;
  confidence: number;
  reason: string;
  analysis?: string;
  roofShape?: "flat" | "pitched" | "unknown";
  roofConfidence?: number;
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

  // PDF_PROPERTY_PHOTOS_PROFILE_V1
  const totalStartedAt =
    performance.now();

  const candidateStartedAt =
    performance.now();

  /*
   * PDF_IMAGE_ANALYSIS_STREAM_V1
   *
   * Start semantic image analysis in 5-image batches
   * while later PDF pages are still being extracted.
   */
  type StreamedAnalysis = {
    candidateIndex: number;
    analysis: string;
  };

  const roomEvidenceByCandidateIndex = new Map<number, SafeImageRoomEvidence>();

  // PDF_ROOF_METADATA_T209C3
  const roofEvidenceByCandidateIndex = new Map<
    number,
    {
      roofShape: "flat" | "pitched" | "unknown";
      roofConfidence: number;
    }
  >();

  const analysisPromises:
    Promise<StreamedAnalysis[]>[] = [];

  let pendingBatch: Array<{
    candidate:
      PdfImageCandidate;
    candidateIndex:
      number;
  }> = [];

  let streamedCandidateCount = 0;

  const launchPendingBatch = () => {
    if (
      pendingBatch.length === 0
    ) {
      return;
    }

    const batch =
      pendingBatch;

    pendingBatch = [];

    const promise =
      analyzeImageBatch(
        batch.map(
          (
            item,
            batchIndex
          ) => ({
            name:
              `pdf-candidate-${String(
                item.candidateIndex + 1
              ).padStart(2, "0")}.jpg`,
            mimeType:
              "image/jpeg",
            bytes:
              item.candidate.buffer,
          })
        )
      )
        .then(
          (batchAnalyses) =>
            batchAnalyses
              .map(
                (analysis) => {
                  const source =
                    batch[
                      analysis.imageIndex
                    ];

                  if (!source) {
                    return null;
                  }

                   roomEvidenceByCandidateIndex.set(source.candidateIndex, getSafeImageRoomEvidence(analysis));
                   const shape = analysis.roofShape;
                   const confidence = analysis.roofConfidence;

                   if (
                     (shape === "flat" || shape === "pitched") &&
                     typeof confidence === "number" &&
                     Number.isFinite(confidence) &&
                     confidence >= 0 &&
                     confidence <= 1
                   ) {
                     roofEvidenceByCandidateIndex.set(
                       source.candidateIndex,
                       {
                         roofShape: shape,
                         roofConfidence: confidence,
                       }
                     );
                   }


                  return {
                    candidateIndex:
                      source.candidateIndex,
                    analysis:
                      analysis.analysis,
                  };
                }
              )
              .filter(
                (
                  item
                ): item is StreamedAnalysis =>
                  item !== null
              )
        )
        .catch(
          (error) => {
            console.warn(
              "[PDF IMAGE STREAM] batch failed",
              {
                message:
                  error instanceof Error
                    ? error.message
                    : String(error),
              }
            );

            return [];
          }
        );

    analysisPromises.push(
      promise
    );
  };

  const candidates = await extractPdfImageCandidates(
      pdfBuffer,
      {
        renderPages:
          false,

        onCandidate:
          (candidate) => {
            const candidateIndex =
              streamedCandidateCount;

            streamedCandidateCount += 1;

            pendingBatch.push({
              candidate,
              candidateIndex,
            });

            if (
              pendingBatch.length >= 5
            ) {
              launchPendingBatch();
            }
          },
      }
    );
  // Document page renders are not property photographs. No page-render fallback.

  /*
   * The final batch may contain fewer than 5 images.
   */
  launchPendingBatch();

  const streamedAnalyses =
    (
      await Promise.all(
        analysisPromises
      )
    ).flat();

  const analysisByCandidateIndex =
    new Map(
      streamedAnalyses.map(
        (item) => [
          item.candidateIndex,
          item.analysis,
        ]
      )
    );

  console.log(
    "[PDF IMAGE STREAM] completed",
    {
      candidates:
        candidates.length,
      analyses:
        streamedAnalyses.length,
      batches:
        analysisPromises.length,
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

  /*
   * PDF_PROPERTY_PHOTOS_DEFER_CLASSIFICATION_V1
   *
   * Do not classify candidates with a separate AI call here.
   * The main /api/analyze-images batch step already performs
   * semantic image analysis afterwards.
   *
   * Preserve candidate order and defer semantic filtering to
   * that existing batch analysis.
   */
  const segmentationEnabled =
    process.env.IA_PDF_COLLAGE_SPLIT_V1 === "enabled-local-test";

  const photoSources: Array<{
    candidate: PdfImageCandidate;
    originalIndex: number;
    segmented: boolean;
  }> = candidates.map((candidate, originalIndex) => ({
    candidate,
    originalIndex,
    segmented: false,
  }));

  if (segmentationEnabled && candidates.length === 1) {
    const { segmentEmbeddedPdfPage } = await import(
      "@/lib/pdf-segment-embedded-page.server"
    );

    const segments = await segmentEmbeddedPdfPage(
      candidates[0].buffer
    );

    if (segments && segments.length > 1) {
      photoSources.splice(
        0,
        photoSources.length,
        ...segments.map((segment) => ({
          candidate: {
            ...candidates[0],
            buffer: segment.buffer,
            width: segment.width,
            height: segment.height,
          },
          originalIndex: 0,
          segmented: true,
        }))
      );

      console.log("[PDF COLLAGE SEGMENTATION]", {
        originalCandidates: candidates.length,
        segmentedImages: segments.length,
        reviewRequired: true,
      });
    }
  }

  const photos: ExtractedPdfPropertyPhoto[] =
    photoSources.map((entry, candidateIndex) => ({
      buffer: entry.candidate.buffer,
      width: entry.candidate.width,
      height: entry.candidate.height,
      pageNumber: entry.candidate.pageNumber,
      imageIndex: entry.candidate.imageIndex,
      candidateIndex,
      confidence: entry.segmented ? 0 : 1,
      reason: entry.segmented
        ? "collage_segment_requires_review"
        : "deferred_to_batch_image_analysis",
      analysis: entry.segmented
        ? undefined
        : analysisByCandidateIndex.get(entry.originalIndex),
      ...getSafeImageRoomEvidence(entry.segmented ? null : roomEvidenceByCandidateIndex.get(entry.originalIndex)),
      roofShape: entry.segmented
        ? undefined
        : roofEvidenceByCandidateIndex.get(entry.originalIndex)?.roofShape,
      roofConfidence: entry.segmented
        ? undefined
        : roofEvidenceByCandidateIndex.get(entry.originalIndex)?.roofConfidence,
    }));

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
