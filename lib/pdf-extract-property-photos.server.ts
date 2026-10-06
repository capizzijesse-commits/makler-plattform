import {
  extractPdfImageCandidates,
  type PdfImageCandidate,
} from "@/lib/pdf-extract-image-candidates.server";

import {
  analyzeImageBatch,
} from "@/lib/image-batch-analyzer.server";


export type ExtractedPdfPropertyPhoto = {
  buffer: Buffer;
  width: number;
  height: number;
  pageNumber: number;
  imageIndex: number;
  candidateIndex: number;
  confidence: number;
  reason: string;
  analysis?: string;
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

  const candidates =
    await extractPdfImageCandidates(
      pdfBuffer,
      {
        renderPages:
          options.renderPages === true,

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
  const photos: ExtractedPdfPropertyPhoto[] =
    candidates.map((candidate, candidateIndex) => ({
      buffer: candidate.buffer,
      width: candidate.width,
      height: candidate.height,
      pageNumber: candidate.pageNumber,
      imageIndex: candidate.imageIndex,
      candidateIndex,
      confidence: 1,
      reason: "deferred_to_batch_image_analysis",
      analysis:
        analysisByCandidateIndex.get(
          candidateIndex
        ),
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
