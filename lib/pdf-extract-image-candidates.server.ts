import sharp from "sharp";

export type PdfImageCandidate = {
  buffer: Buffer;
  width: number;
  height: number;
  pageNumber: number;
  imageIndex: number;
};

type PdfImageObject = {
  width?: number;
  height?: number;
  data?: Uint8Array | Uint8ClampedArray;
};

type PdfPageText = {
  pageNumber: number;
  text: string;
};

function getPdfObject(
  objs: {
    get: (
      id: string,
      callback?: (value: PdfImageObject) => void
    ) => PdfImageObject | undefined;
  },
  id: string
): Promise<PdfImageObject | undefined> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (
      value: PdfImageObject | undefined
    ) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    try {
      const immediate = objs.get(
        id,
        (value) => finish(value)
      );

      if (immediate) {
        finish(immediate);
      }
    } catch {
      finish(undefined);
    }

    setTimeout(
      () => finish(undefined),
      3000
    );
  });
}

function detectExposePageRange(
  pages: PdfPageText[],
  totalPages: number
): number[] | null {
  const matches: Array<{
    physicalPage: number;
    exposePage: number;
    exposeTotal: number;
  }> = [];

  for (const page of pages) {
    const compact =
      page.text
        .toLowerCase()
        .replace(/\s+/g, "");

    const match =
      compact.match(
        /seite(\d+)\|(\d+)/
      );

    if (!match) {
      continue;
    }

    const exposePage =
      Number(match[1]);

    const exposeTotal =
      Number(match[2]);

    if (
      !Number.isInteger(exposePage) ||
      !Number.isInteger(exposeTotal) ||
      exposePage < 1 ||
      exposeTotal < 2 ||
      exposePage > exposeTotal ||
      exposeTotal > totalPages
    ) {
      continue;
    }

    matches.push({
      physicalPage:
        page.pageNumber,
      exposePage,
      exposeTotal,
    });
  }

  /*
   * PDF_IMAGE_PRIORITY_RANGE_V2
   *
   * Require a coherent sequence rather than trusting
   * one isolated "Seite X | Y" occurrence.
   */
  if (matches.length < 3) {
    return null;
  }

  const groups =
    new Map<
      number,
      typeof matches
    >();

  for (const match of matches) {
    const existing =
      groups.get(
        match.exposeTotal
      ) || [];

    existing.push(match);

    groups.set(
      match.exposeTotal,
      existing
    );
  }

  let best:
    typeof matches | null =
    null;

  for (const group of groups.values()) {
    const sorted =
      [...group].sort(
        (a, b) =>
          a.physicalPage -
          b.physicalPage
      );

    let bestRun:
      typeof matches = [];

    let currentRun:
      typeof matches = [];

    for (const item of sorted) {
      const previous =
        currentRun[
          currentRun.length - 1
        ];

      if (
        !previous ||
        (
          item.physicalPage ===
            previous.physicalPage + 1 &&
          item.exposePage ===
            previous.exposePage + 1
        )
      ) {
        currentRun.push(item);
      } else {
        if (
          currentRun.length >
          bestRun.length
        ) {
          bestRun =
            currentRun;
        }

        currentRun = [item];
      }
    }

    if (
      currentRun.length >
      bestRun.length
    ) {
      bestRun =
        currentRun;
    }

    if (
      bestRun.length >= 3 &&
      (
        !best ||
        bestRun.length >
          best.length
      )
    ) {
      best = bestRun;
    }
  }

  if (!best) {
    return null;
  }

  const firstMatch =
    best[0];

  const lastMatch =
    best[best.length - 1];

  /*
   * If the detected run starts at expos? page 2,
   * include the physical page immediately before it.
   * This covers the common unnumbered title page.
   */
  const includePrevious =
    firstMatch.exposePage === 2;

  const firstPhysicalPage =
    Math.max(
      1,
      firstMatch.physicalPage -
        (includePrevious ? 1 : 0)
    );

  /*
   * If we detected a coherent run that reaches the
   * declared final expos? page, we know its end.
   * Otherwise we conservatively extend only by the
   * number of declared expos? pages still missing.
   */
  const missingAfter =
    Math.max(
      0,
      firstMatch.exposeTotal -
        lastMatch.exposePage
    );

  const lastPhysicalPage =
    Math.min(
      totalPages,
      lastMatch.physicalPage +
        missingAfter
    );

  if (
    lastPhysicalPage <
    firstPhysicalPage
  ) {
    return null;
  }

  return Array.from(
    {
      length:
        lastPhysicalPage -
        firstPhysicalPage +
        1,
    },
    (_, index) =>
      firstPhysicalPage + index
  );
}

/*
 * PDF_IMAGE_CANDIDATES_V2
 *
 * Fast path:
 * - cheap full-document text pre-scan
 * - detect a coherent expos? page sequence
 * - run expensive getOperatorList only on that block
 *
 * Safety:
 * - no physical page numbers are hardcoded
 * - if no reliable sequence is detected, scan every page
 * - semantic photo/document classification still happens later
 */
export async function extractPdfImageCandidates(
  pdfBuffer: Buffer
): Promise<PdfImageCandidate[]> {
  await import(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );

  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const loadingTask =
    pdfjs.getDocument({
      data:
        new Uint8Array(pdfBuffer),
      useSystemFonts:
        false,
    });

  const pdf =
    await loadingTask.promise;

  const results:
    PdfImageCandidate[] = [];

  const fingerprints =
    new Set<string>();

  let prescanMs = 0;
  let pageLoadMs = 0;
  let operatorListMs = 0;
  let objectLookupMs = 0;
  let sharpMs = 0;
  let objectLookups = 0;
  let sharpConversions = 0;

  try {
    /*
     * Phase 1:
     * cheap text pre-scan.
     */
    const prescanStartedAt =
      performance.now();

    const pageTexts:
      PdfPageText[] = [];

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page =
        await pdf.getPage(
          pageNumber
        );

      try {
        const textContent =
          await page.getTextContent();

        const text =
          textContent.items
            .map((item) =>
              "str" in item
                ? item.str
                : ""
            )
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        pageTexts.push({
          pageNumber,
          text,
        });
      } catch {
        /*
         * Text extraction is only an optimization.
         * Failure here must never block image extraction.
         */
        pageTexts.push({
          pageNumber,
          text: "",
        });
      } finally {
        page.cleanup();
      }
    }

    prescanMs =
      performance.now() -
      prescanStartedAt;

    const priorityPages =
      detectExposePageRange(
        pageTexts,
        pdf.numPages
      );

    const pagesToScan =
      priorityPages ||
      Array.from(
        {
          length:
            pdf.numPages,
        },
        (_, index) =>
          index + 1
      );

    console.log(
      "[PDF PRIORITY V2]",
      {
        mode:
          priorityPages
            ? "expose-range"
            : "full-fallback",
        prescanMs:
          Math.round(
            prescanMs
          ),
        totalPages:
          pdf.numPages,
        scanPages:
          pagesToScan.length,
        firstPage:
          pagesToScan[0],
        lastPage:
          pagesToScan[
            pagesToScan.length - 1
          ],
      }
    );

    /*
     * Phase 2:
     * expensive image extraction only for
     * the selected pages.
     */
    for (
      const pageNumber
      of pagesToScan
    ) {
      const pageStartedAt =
        performance.now();

      const page =
        await pdf.getPage(
          pageNumber
        );

      pageLoadMs +=
        performance.now() -
        pageStartedAt;

      const operatorStartedAt =
        performance.now();

      const operatorList =
        await page.getOperatorList();

      const pageOperatorMs =
        performance.now() -
        operatorStartedAt;

      operatorListMs +=
        pageOperatorMs;

      console.log(
        "[PDF OPERATOR PAGE]",
        {
          pageNumber,
          durationMs:
            Math.round(
              pageOperatorMs
            ),
        }
      );

      let pageImageIndex = 0;

      for (
        let index = 0;
        index <
        operatorList.fnArray.length;
        index += 1
      ) {
        if (
          operatorList.fnArray[index] !==
          pdfjs.OPS.paintImageXObject
        ) {
          continue;
        }

        pageImageIndex += 1;

        const args =
          operatorList.argsArray[index];

        const objectId =
          Array.isArray(args) &&
          typeof args[0] === "string"
            ? args[0]
            : null;

        if (!objectId) {
          continue;
        }

        const objectStartedAt =
          performance.now();

        const image =
          await getPdfObject(
            page.objs as Parameters<
              typeof getPdfObject
            >[0],
            objectId
          );

        objectLookupMs +=
          performance.now() -
          objectStartedAt;

        objectLookups += 1;

        const width =
          Number(
            image?.width || 0
          );

        const height =
          Number(
            image?.height || 0
          );

        if (
          !image?.data ||
          width < 400 ||
          height < 300 ||
          width * height <
            240000
        ) {
          continue;
        }

        const data =
          Buffer.from(
            image.data.buffer,
            image.data.byteOffset,
            image.data.byteLength
          );

        const pixels =
          width * height;

        const channels =
          data.length ===
          pixels * 4
            ? 4
            : data.length ===
                pixels * 3
              ? 3
              : data.length ===
                  pixels
                ? 1
                : 0;

        if (!channels) {
          continue;
        }

        let pipeline =
          sharp(
            data,
            {
              raw: {
                width,
                height,
                channels,
              },
            }
          );

        if (channels === 4) {
          pipeline =
            pipeline.flatten({
              background:
                "#ffffff",
            });
        }

        const sharpStartedAt =
          performance.now();

        const output =
          await pipeline
            .rotate()
            .resize({
              width: 1024,
              height: 1024,
              fit: "inside",
              withoutEnlargement:
                true,
            })
            .jpeg({
              quality: 72,
            })
            .toBuffer();

        sharpMs +=
          performance.now() -
          sharpStartedAt;

        sharpConversions += 1;

        const fingerprint =
          width +
          "x" +
          height +
          ":" +
          output.length;

        if (
          fingerprints.has(
            fingerprint
          )
        ) {
          continue;
        }

        fingerprints.add(
          fingerprint
        );

        results.push({
          buffer:
            output,
          width,
          height,
          pageNumber,
          imageIndex:
            pageImageIndex,
        });
      }

      page.cleanup();
    }

    console.log(
      "[PDF CANDIDATE PAGES]",
      results.map(
        (
          candidate,
          candidateIndex
        ) => ({
          candidateIndex,
          pageNumber:
            candidate.pageNumber,
          imageIndex:
            candidate.imageIndex,
          width:
            candidate.width,
          height:
            candidate.height,
          bytes:
            candidate.buffer.length,
        })
      )
    );

    console.log(
      "[PDF CANDIDATE PROFILE]",
      {
        mode:
          priorityPages
            ? "expose-range"
            : "full-fallback",
        pages:
          pdf.numPages,
        scannedPages:
          pagesToScan.length,
        candidates:
          results.length,
        objectLookups,
        sharpConversions,
        prescanMs:
          Math.round(
            prescanMs
          ),
        pageLoadMs:
          Math.round(
            pageLoadMs
          ),
        operatorListMs:
          Math.round(
            operatorListMs
          ),
        objectLookupMs:
          Math.round(
            objectLookupMs
          ),
        sharpMs:
          Math.round(
            sharpMs
          ),
      }
    );

    return results;
  } finally {
    await loadingTask.destroy();
  }
}
