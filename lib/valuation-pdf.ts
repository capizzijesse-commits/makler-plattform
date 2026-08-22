export type ValuationPdfData = {
  address: string;
  propertyType: string;

  livingArea: string;
  landArea?: string | null;
  rooms: string;

  buildingYear: string;
  renovationYear: string;

  condition: string;
  standard: string;

  floor?: string | null;
  lift?: string | null;

  parking: string;
  outdoorArea: string;
  view: string;

  salePrice: number;

  salePriceRange: {
    lower: number;
    upper: number;
  };

  pricePerSqm: number;

  confidence: string;

  locationScore?: number | null;
};

function pdfText(
  value: string
) {
  return value
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u00a0|\u202f/g, " ");
}

function formatPdfCHF(
  value: number
) {
  const rounded =
    Math.round(value);

  const formatted =
    String(rounded).replace(
      /\B(?=(\d{3})+(?!\d))/g,
      "'"
    );

  return `CHF ${formatted}`;
}

function safeFilePart(
  value: string
) {
  const cleaned =
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return (
    cleaned.slice(0, 70) ||
    "Immobilie"
  );
}

export async function
downloadValuationPdf(
  data: ValuationPdfData
) {
  const {
    jsPDF,
  } =
    await import("jspdf");

  const pdf =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
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

  let y = 0;

  const addFooter =
    () => {
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
        "Inserat-AI | www.inserat-ai.ch",
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

  const ensureSpace =
    (needed: number) => {
      if (
        y + needed >
        pageHeight - 22
      ) {
        addFooter();

        pdf.addPage();

        y = 18;
      }
    };

  const sectionTitle =
    (title: string) => {
      ensureSpace(14);

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(13);

      pdf.setTextColor(
        dark.r,
        dark.g,
        dark.b
      );

      pdf.text(
        pdfText(title),
        margin,
        y
      );

      y += 4;

      pdf.setDrawColor(
        amber.r,
        amber.g,
        amber.b
      );

      pdf.setLineWidth(0.8);

      pdf.line(
        margin,
        y,
        margin + 18,
        y
      );

      y += 8;
    };

  const detailRow =
    (
      label: string,
      value: string
    ) => {
      ensureSpace(9);

      pdf.setDrawColor(
        border.r,
        border.g,
        border.b
      );

      pdf.setLineWidth(0.2);

      pdf.line(
        margin,
        y + 6,
        pageWidth - margin,
        y + 6
      );

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
        pdfText(label),
        margin,
        y
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setTextColor(
        dark.r,
        dark.g,
        dark.b
      );

      const valueLines =
        pdf.splitTextToSize(
          pdfText(value),
          98
        );

      pdf.text(
        valueLines,
        pageWidth - margin,
        y,
        {
          align: "right",
        }
      );

      y += Math.max(
        8,
        valueLines.length * 4.5
      );
    };


  /* =======================================================
     HEADER
     ======================================================= */

  pdf.setFillColor(
    navy.r,
    navy.g,
    navy.b
  );

  pdf.rect(
    0,
    0,
    pageWidth,
    50,
    "F"
  );

  pdf.setFillColor(
    amber.r,
    amber.g,
    amber.b
  );

  pdf.rect(
    0,
    48,
    pageWidth,
    2,
    "F"
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(20);

  pdf.setTextColor(
    255,
    255,
    255
  );

  pdf.text(
    "INSERAT-AI",
    margin,
    19
  );

  pdf.setFontSize(10);

  pdf.setTextColor(
    amber.r,
    amber.g,
    amber.b
  );

  pdf.text(
    "IMMOBILIENBEWERTUNG SCHWEIZ",
    margin,
    27
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(9);

  pdf.setTextColor(
    203,
    213,
    225
  );

  pdf.text(
    pdfText(data.address),
    margin,
    36
  );

  const reportDate =
    new Intl.DateTimeFormat(
      "de-CH",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date());

  pdf.text(
    `Bewertung vom ${reportDate}`,
    pageWidth - margin,
    19,
    {
      align: "right",
    }
  );


  /* =======================================================
     MARKTWERT
     ======================================================= */

  y = 64;

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
    "GESCHAETZTER MARKTWERT",
    margin,
    y
  );

  y += 10;

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(27);

  pdf.setTextColor(
    dark.r,
    dark.g,
    dark.b
  );

  pdf.text(
    formatPdfCHF(
      data.salePrice
    ),
    margin,
    y
  );

  y += 9;

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(10);

  pdf.setTextColor(
    muted.r,
    muted.g,
    muted.b
  );

  pdf.text(
    `Marktwertspanne: ${formatPdfCHF(
      data.salePriceRange.lower
    )} - ${formatPdfCHF(
      data.salePriceRange.upper
    )}`,
    margin,
    y
  );

  y += 11;

  const boxGap = 4;

  const boxWidth =
    (contentWidth -
      boxGap * 2) /
    3;

  const boxes = [
    {
      label:
        "RICHTWERT",
      value:
        `${formatPdfCHF(
          data.pricePerSqm
        )} / m2`,
    },
    {
      label:
        "SICHERHEIT",
      value:
        data.confidence,
    },
    {
      label:
        "LAGE-SCORE",
      value:
        typeof data.locationScore ===
          "number"
          ? String(
              data.locationScore
            )
          : "Nicht geliefert",
    },
  ];

  boxes.forEach(
    (
      box,
      index
    ) => {
      const x =
        margin +
        index *
          (boxWidth +
            boxGap);

      pdf.setFillColor(
        248,
        250,
        252
      );

      pdf.setDrawColor(
        border.r,
        border.g,
        border.b
      );

      pdf.roundedRect(
        x,
        y,
        boxWidth,
        24,
        2,
        2,
        "FD"
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(7.5);

      pdf.setTextColor(
        muted.r,
        muted.g,
        muted.b
      );

      pdf.text(
        box.label,
        x + 4,
        y + 7
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(10);

      pdf.setTextColor(
        dark.r,
        dark.g,
        dark.b
      );

      const lines =
        pdf.splitTextToSize(
          pdfText(box.value),
          boxWidth - 8
        );

      pdf.text(
        lines,
        x + 4,
        y + 15
      );
    }
  );

  y += 36;


  /* =======================================================
     OBJEKTDATEN
     ======================================================= */

  sectionTitle(
    "Bewertungsgrundlage"
  );

  detailRow(
    "Adresse",
    data.address
  );

  detailRow(
    "Immobilientyp",
    data.propertyType
  );

  detailRow(
    "Wohnflaeche",
    data.livingArea
  );

  if (data.landArea) {
    detailRow(
      "Grundstueck",
      data.landArea
    );
  }

  detailRow(
    "Zimmer",
    data.rooms
  );

  detailRow(
    "Baujahr",
    data.buildingYear
  );

  detailRow(
    "Letzte Renovation",
    data.renovationYear
  );

  detailRow(
    "Zustand",
    data.condition
  );

  detailRow(
    "Ausbaustandard",
    data.standard
  );

  if (data.floor) {
    detailRow(
      "Etage",
      data.floor
    );
  }

  if (data.lift) {
    detailRow(
      "Lift",
      data.lift
    );
  }

  detailRow(
    "Parkierung",
    data.parking
  );

  detailRow(
    "Aussenbereich",
    data.outdoorArea
  );

  detailRow(
    "Aussicht / Lage",
    data.view
  );


  /* =======================================================
     HINWEIS
     ======================================================= */

  ensureSpace(45);

  y += 6;

  sectionTitle(
    "Hinweis zur Bewertung"
  );

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

  const disclaimer =
    "Die ausgewiesene Marktwertspanne ist eine datenbasierte Markteinschaetzung auf Grundlage der verfuegbaren Objekt- und Marktdaten. Sie stellt keine verbindliche Verkehrswert-, Belehnungs- oder Verkaufspreisgarantie dar. Eine Besichtigung und individuelle Fachbeurteilung kann insbesondere bei aussergewoehnlichen Immobilien erforderlich sein.";

  const disclaimerLines =
    pdf.splitTextToSize(
      disclaimer,
      contentWidth
    );

  pdf.text(
    disclaimerLines,
    margin,
    y
  );

  addFooter();

  const filename =
    `Inserat-AI-Bewertung-${safeFilePart(
      data.address
    )}.pdf`;

  pdf.save(filename);
}
