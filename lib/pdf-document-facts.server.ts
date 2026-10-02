export type PdfDocumentFacts = {
  rooms: number | null;
  evidence: string | null;
};

function normalizeFractionRooms(
  whole: string,
  fraction?: string
): number | null {
  const base = Number(whole);

  if (!Number.isFinite(base) || base <= 0 || base > 30) {
    return null;
  }

  if (!fraction) {
    return base;
  }

  const normalized =
    fraction
      .replace(/\s+/g, "")
      .replace(",", ".");

  if (
    normalized === "½" ||
    normalized === "1/2"
  ) {
    return base + 0.5;
  }

  return null;
}

export async function extractPdfDocumentFacts(
  pdfBuffer: Buffer
): Promise<PdfDocumentFacts> {
  await import(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );

  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const loadingTask =
    pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: false,
    });

  const pdf =
    await loadingTask.promise;

  try {
    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page =
        await pdf.getPage(pageNumber);

      try {
        const content =
          await page.getTextContent();

        const text =
          content.items
            .map((item) =>
              "str" in item
                ? item.str
                : ""
            )
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        /*
         * Strong evidence only:
         *
         *   5 1/2 Zimmer Einfamilienhaus
         *   5 ½ Zimmer Einfamilienhaus
         *   4.5 Zimmer Wohnung
         *
         * Deliberately DOES NOT match:
         *
         *   Zimmer 16.1
         *
         * because that is commonly a room area.
         */
        let rooms: number | null = null;
let evidence: string | null = null;

const strongMatch =
  text.match(
    /\b(\d{1,2})(?:\s*(½|1\s*\/\s*2)|[.,](5))?\s*[- ]?\s*Zimmer\s+(Einfamilienhaus|Mehrfamilienhaus|Reihenhaus|Doppelhaushälfte|Haus|Wohnung|Eigentumswohnung|Apartment)\b/i
  );

if (strongMatch) {
  if (strongMatch[3] === "5") {
    rooms =
      Number(strongMatch[1]) + 0.5;
  } else {
    rooms =
      normalizeFractionRooms(
        strongMatch[1],
        strongMatch[2]
      );
  }

  evidence = strongMatch[0];
}

if (rooms == null) {
  const fallbackMatch =
    text.match(
      /\b(\d{1,2}(?:[.,]\d)?)\s*(?:[- ]?Zimmer|Zi\.)\b/i
    );

  if (fallbackMatch) {
    const value =
      Number(
        fallbackMatch[1]
          .replace(",", ".")
      );

    if (
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 30
    ) {
      rooms = value;
      evidence = fallbackMatch[0];
    }
  }
}

if (rooms == null) {
  continue;
}

        if (rooms == null) {
          continue;
        }

        return {
          rooms,
          evidence,
        };
      } finally {
        page.cleanup();
      }
    }

    return {
      rooms: null,
      evidence: null,
    };
  } finally {
    await loadingTask.destroy();
  }
}
