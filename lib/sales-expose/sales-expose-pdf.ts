import type {
  SalesExposeDocument,
} from "./sales-expose-document";

function safePdfText(value: unknown): string {
  return typeof value === "string"
    ? value
        .replace(/\u00a0/g, " ")
        .replace(/[–—]/g, "-")
        .replace(/…/g, "...")
        .trim()
    : "";
}

async function fileToJpegDataUrl(
  file: File
): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const maxWidth = 1800;
    const scale = Math.min(
      1,
      maxWidth / bitmap.width
    );

    const width = Math.max(
      1,
      Math.round(bitmap.width * scale)
    );

    const height = Math.max(
      1,
      Math.round(bitmap.height * scale)
    );

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Bild konnte nicht vorbereitet werden."
      );
    }

    context.drawImage(
      bitmap,
      0,
      0,
      width,
      height
    );

    return canvas.toDataURL(
      "image/jpeg",
      0.84
    );
  } finally {
    bitmap.close();
  }
}

function addCoverImage(
  pdf: any,
  dataUrl: string,
  pageWidth: number,
  imageTop: number,
  imageHeight: number
) {
  pdf.addImage(
    dataUrl,
    "JPEG",
    0,
    imageTop,
    pageWidth,
    imageHeight,
    undefined,
    "FAST"
  );
}

export async function buildSalesExposePdfBlob(
  document: SalesExposeDocument,
  imageFiles: File[]
): Promise<{
  blob: Blob;
  fileName: string;
}> {
  const { jsPDF } =
    await import("jspdf");

  const pdf =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  const margin = 18;
  const contentWidth =
    pageWidth - margin * 2;

  const navy = {
    r: 5,
    g: 10,
    b: 29,
  };

  const amber = {
    r: 245,
    g: 158,
    b: 11,
  };

  const dark = {
    r: 15,
    g: 23,
    b: 42,
  };

  const muted = {
    r: 100,
    g: 116,
    b: 139,
  };

  const border = {
    r: 226,
    g: 232,
    b: 240,
  };

  const preparedImages =
    await Promise.all(
      imageFiles
        .map(fileToJpegDataUrl)
    );

  const addFooter = () => {
    pdf.setDrawColor(
      border.r,
      border.g,
      border.b
    );

    pdf.line(
      margin,
      pageHeight - 14,
      pageWidth - margin,
      pageHeight - 14
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(8);

    pdf.setTextColor(
      muted.r,
      muted.g,
      muted.b
    );

    pdf.text(
      "Inserat-AI | Immobilienexpose",
      margin,
      pageHeight - 8
    );

    pdf.text(
      `Seite ${pdf.getNumberOfPages()}`,
      pageWidth - margin,
      pageHeight - 8,
      {
        align: "right",
      }
    );
  };

  /*
   * COVER
   */

  pdf.setFillColor(
    navy.r,
    navy.g,
    navy.b
  );

  pdf.rect(
    0,
    0,
    pageWidth,
    pageHeight,
    "F"
  );

  if (preparedImages[0]) {
    addCoverImage(
      pdf,
      preparedImages[0],
      pageWidth,
      0,
      148
    );

    pdf.setFillColor(
      navy.r,
      navy.g,
      navy.b
    );

    pdf.rect(
      0,
      148,
      pageWidth,
      pageHeight - 148,
      "F"
    );
  }

  pdf.setFillColor(
    amber.r,
    amber.g,
    amber.b
  );

  pdf.rect(
    margin,
    164,
    28,
    1.5,
    "F"
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(9);

  pdf.setTextColor(
    amber.r,
    amber.g,
    amber.b
  );

  pdf.text(
    "IMMOBILIENINSERAT",
    margin,
    176
  );

  pdf.setFontSize(25);

  pdf.setTextColor(
    255,
    255,
    255
  );

  const titleLines =
    pdf.splitTextToSize(
      safePdfText(document.title),
      contentWidth
    );

  pdf.text(
    titleLines.slice(0, 3),
    margin,
    191
  );

  const titleHeight =
    Math.min(
      titleLines.length,
      3
    ) * 10;

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(11);

  pdf.setTextColor(
    203,
    213,
    225
  );

  pdf.text(
    safePdfText(document.subtitle),
    margin,
    196 + titleHeight
  );

  /*
   * DETAILS
   */

  pdf.addPage();

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(9);

  pdf.setTextColor(
    amber.r,
    amber.g,
    amber.b
  );

  pdf.text(
    "INSERAT-AI",
    margin,
    20
  );

  pdf.setFontSize(22);

  pdf.setTextColor(
    dark.r,
    dark.g,
    dark.b
  );

  pdf.text(
    "Objekt auf einen Blick",
    margin,
    34
  );

  let y = 50;

  for (
    const item of document.keyFacts
  ) {
    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      muted.r,
      muted.g,
      muted.b
    );

    pdf.text(
      safePdfText(item.label),
      margin,
      y
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(12);

    pdf.setTextColor(
      dark.r,
      dark.g,
      dark.b
    );

    pdf.text(
      safePdfText(item.value),
      margin + 52,
      y
    );

    y += 12;
  }

  if (document.description) {
    y += 8;

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(15);

    pdf.text(
      "Beschreibung",
      margin,
      y
    );

    y += 9;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    const descriptionLines =
      pdf.splitTextToSize(
        safePdfText(
          document.description
        ),
        contentWidth
      );

    for (
      const line of descriptionLines
    ) {
      if (y > pageHeight - 26) {
        addFooter();
        pdf.addPage();
        y = 20;
      }

      pdf.text(
        line,
        margin,
        y
      );

      y += 5;
    }
  }

  if (document.highlights.length) {
    y += 8;

    if (y > pageHeight - 55) {
      addFooter();
      pdf.addPage();
      y = 20;
    }

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(15);

    pdf.text(
      "Highlights",
      margin,
      y
    );

    y += 9;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    for (
      const highlight of
        document.highlights
    ) {
      if (y > pageHeight - 25) {
        addFooter();
        pdf.addPage();
        y = 20;
      }

      pdf.text(
        `- ${safePdfText(highlight)}`,
        margin,
        y
      );

      y += 6;
    }
  }

  addFooter();

  /*
   * PHOTO PAGES V2
   *
   * Cover image is preparedImages[0].
   * Remaining images are presented two per page
   * for a compact premium sales expose.
   */

  const galleryImages =
    preparedImages.slice(1);

  const galleryImageHeight = 104;
  const galleryGap = 12;
  const firstImageY = 32;

  for (
    let galleryIndex = 0;
    galleryIndex < galleryImages.length;
    galleryIndex += 2
  ) {
    pdf.addPage();

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      amber.r,
      amber.g,
      amber.b
    );

    pdf.text(
      "IMMOBILIENIMPRESSIONEN",
      margin,
      18
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(8);

    pdf.setTextColor(
      muted.r,
      muted.g,
      muted.b
    );

    pdf.text(
      safePdfText(document.subtitle),
      pageWidth - margin,
      18,
      {
        align: "right",
      }
    );

    const firstImage =
      galleryImages[galleryIndex];

    const secondImage =
      galleryImages[galleryIndex + 1];

    pdf.addImage(
      firstImage,
      "JPEG",
      margin,
      firstImageY,
      contentWidth,
      galleryImageHeight,
      undefined,
      "FAST"
    );

    if (secondImage) {
      pdf.addImage(
        secondImage,
        "JPEG",
        margin,
        firstImageY +
          galleryImageHeight +
          galleryGap,
        contentWidth,
        galleryImageHeight,
        undefined,
        "FAST"
      );
    }

    addFooter();
  }
  const location =
    safePdfText(
      document.facts.location
    )
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const fileName =
    `Inserat-AI-Expose-${location || "Immobilie"}.pdf`;

  return {
    blob: pdf.output("blob"),
    fileName,
  };
}

export async function downloadSalesExposePdf(
  document: SalesExposeDocument,
  imageFiles: File[]
): Promise<void> {
  const {
    blob,
    fileName,
  } =
    await buildSalesExposePdfBlob(
      document,
      imageFiles
    );

  const url =
    URL.createObjectURL(blob);

  try {
    const anchor =
      window.document.createElement(
        "a"
      );

    anchor.href =
      url;

    anchor.download =
      fileName;

    window.document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      1000
    );
  }
}

