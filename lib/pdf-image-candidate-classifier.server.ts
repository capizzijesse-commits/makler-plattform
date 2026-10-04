import OpenAI from "openai";
import sharp from "sharp";

import type {
  PdfImageCandidate,
} from "@/lib/pdf-extract-image-candidates.server";

export type PdfImageCandidateCategory =
  | "property_photo"
  | "floorplan"
  | "document"
  | "map"
  | "other";

export type ClassifiedPdfImageCandidate = {
  candidateIndex: number;
  pageNumber: number;
  imageIndex: number;
  category: PdfImageCandidateCategory;
  confidence: number;
  reason: string;
};

type RawClassification = {
  candidateIndex?: unknown;
  category?: unknown;
  confidence?: unknown;
};

const VALID_CATEGORIES =
  new Set<PdfImageCandidateCategory>([
    "property_photo",
    "floorplan",
    "document",
    "map",
    "other",
  ]);

function parseClassification(
  value: RawClassification,
  candidates: PdfImageCandidate[]
): ClassifiedPdfImageCandidate | null {
  const candidateIndex =
    Number(value.candidateIndex);

  if (
    !Number.isInteger(candidateIndex) ||
    candidateIndex < 0 ||
    candidateIndex >= candidates.length
  ) {
    return null;
  }

  const category =
    String(value.category || "")
      .trim() as PdfImageCandidateCategory;

  if (!VALID_CATEGORIES.has(category)) {
    return null;
  }

  const rawConfidence =
    Number(value.confidence);

  const confidence =
    Number.isFinite(rawConfidence)
      ? Math.max(
          0,
          Math.min(1, rawConfidence)
        )
      : 0;

  const candidate =
    candidates[candidateIndex];

  return {
    candidateIndex,
    pageNumber:
      candidate.pageNumber,
    imageIndex:
      candidate.imageIndex,
    category,
    confidence,
    reason:
      category,
  };
}

async function createContactSheet(
  candidates: PdfImageCandidate[]
): Promise<Buffer> {
  const CELL_WIDTH = 220;
  const CELL_HEIGHT = 190;
  const IMAGE_WIDTH = 200;
  const IMAGE_HEIGHT = 150;
  const LABEL_HEIGHT = 28;
  const COLUMNS = 5;

  const rows =
    Math.ceil(
      candidates.length /
      COLUMNS
    );

  const width =
    COLUMNS * CELL_WIDTH;

  const height =
    rows * CELL_HEIGHT;

  const composites:
    sharp.OverlayOptions[] = [];

  for (
    let candidateIndex = 0;
    candidateIndex < candidates.length;
    candidateIndex++
  ) {
    const candidate =
      candidates[candidateIndex];

    const column =
      candidateIndex % COLUMNS;

    const row =
      Math.floor(
        candidateIndex /
        COLUMNS
      );

    const left =
      column * CELL_WIDTH + 10;

    const top =
      row * CELL_HEIGHT + 30;

    const thumbnail =
      await sharp(
        candidate.buffer
      )
        .resize(
          IMAGE_WIDTH,
          IMAGE_HEIGHT,
          {
            fit: "contain",
            background: {
              r: 245,
              g: 245,
              b: 245,
            },
          }
        )
        .jpeg({
          quality: 65,
        })
        .toBuffer();

    const labelSvg =
      Buffer.from(
        '<svg width="' +
          CELL_WIDTH +
          '" height="' +
          LABEL_HEIGHT +
          '" xmlns="http://www.w3.org/2000/svg">' +
          '<rect width="100%" height="100%" fill="white"/>' +
          '<text x="10" y="20" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="black">' +
          candidateIndex +
          "</text></svg>"
      );

    composites.push({
      input: labelSvg,
      left:
        column * CELL_WIDTH,
      top:
        row * CELL_HEIGHT,
    });

    composites.push({
      input: thumbnail,
      left,
      top,
    });
  }

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: {
        r: 255,
        g: 255,
        b: 255,
      },
    },
  })
    .composite(composites)
    .jpeg({
      quality: 72,
    })
    .toBuffer();
}

/*
 * PDF_IMAGE_BATCH_CLASSIFIER_V2
 *
 * Candidates are combined into one numbered
 * contact sheet before AI classification.
 *
 * This reduces vision inputs while preserving
 * fail-closed classification.
 */
export async function classifyPdfImageCandidates(
  candidates: PdfImageCandidate[]
): Promise<ClassifiedPdfImageCandidate[]> {
  if (!candidates.length) {
    return [];
  }

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY fehlt."
    );
  }

  const sheetStartedAt =
    performance.now();

  const contactSheet =
    await createContactSheet(
      candidates
    );

  console.log(
    "[PDF CLASSIFIER V2] contact-sheet",
    {
      candidates:
        candidates.length,
      bytes:
        contactSheet.length,
      durationMs:
        Math.round(
          performance.now() -
          sheetStartedAt
        ),
    }
  );

  const openai =
    new OpenAI({
      apiKey,
    });

  const classificationStartedAt =
    performance.now();

  const response =
    await openai.chat.completions.create({
      model:
        "gpt-4.1-mini",
      temperature:
        0,
      max_tokens:
        1400,
      messages: [
        {
          role:
            "system",
          content:
            "Du klassifizierst nummerierte Bildkandidaten aus Immobilien-Exposes. " +
            "property_photo ist ausschliesslich ein echtes Foto der Immobilie oder ihres direkten Aussenbereichs. " +
            "floorplan umfasst Grundrisse, Bauplaene, technische Zeichnungen und Schemata. " +
            "document umfasst Dokumentseiten, Formulare, Vertraege, Grundbuch, Versicherungen, Tabellen und textdominierte Seiten. " +
            "map umfasst Karten und Lageplaene. " +
            "other umfasst Logos, Icons und sonstige ungeeignete Grafiken. " +
            "Dokumentseiten und Grundrisse duerfen niemals property_photo sein. " +
            "Bei Unsicherheit nicht property_photo waehlen. " +
            "Antworte ausschliesslich mit gueltigem JSON.",
        },
        {
          role:
            "user",
          content: [
            {
              type:
                "text",
              text:
                "Das Kontaktblatt enthaelt " +
                candidates.length +
                " nummerierte Kandidaten von 0 bis " +
                (candidates.length - 1) +
                ". Klassifiziere jeden Kandidaten genau einmal. " +
                'Format: {"items":[{"candidateIndex":0,"category":"document","confidence":0.99}]}. ' +
                "Erlaubte Kategorien: property_photo, floorplan, document, map, other. " +
                "Keine reason-Texte ausgeben.",
            },
            {
              type:
                "image_url",
              image_url: {
                url:
                  "data:image/jpeg;base64," +
                  contactSheet.toString(
                    "base64"
                  ),
                detail:
                  "high",
              },
            },
          ],
        },
      ],
    });

  console.log(
    "[PDF CLASSIFIER V2] ai",
    {
      durationMs:
        Math.round(
          performance.now() -
          classificationStartedAt
        ),
    }
  );

  const raw =
    response.choices[0]
      ?.message?.content
      ?.trim();

  if (!raw) {
    throw new Error(
      "PDF-Bildklassifizierung lieferte keine Antwort."
    );
  }

  const firstBrace =
    raw.indexOf("{");

  const lastBrace =
    raw.lastIndexOf("}");

  const jsonText =
    firstBrace >= 0 &&
    lastBrace > firstBrace
      ? raw.slice(
          firstBrace,
          lastBrace + 1
        )
      : raw;

  let parsed: {
    items?: RawClassification[];
  };

  try {
    parsed =
      JSON.parse(jsonText);
  } catch {
    throw new Error(
      "PDF-Bildklassifizierung lieferte ungueltiges JSON."
    );
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error(
      "PDF-Bildklassifizierung enthaelt keine items."
    );
  }

  const classified =
    parsed.items
      .map((item) =>
        parseClassification(
          item,
          candidates
        )
      )
      .filter(
        (
          item
        ): item is ClassifiedPdfImageCandidate =>
          item !== null
      );

  const byIndex =
    new Map(
      classified.map((item) => [
        item.candidateIndex,
        item,
      ])
    );

  /*
   * Fail closed:
   * omitted or invalid candidates are never
   * treated as property photographs.
   */
  return candidates.map(
    (candidate, candidateIndex) =>
      byIndex.get(candidateIndex) || {
        candidateIndex,
        pageNumber:
          candidate.pageNumber,
        imageIndex:
          candidate.imageIndex,
        category:
          "other",
        confidence:
          0,
        reason:
          "Keine sichere Klassifizierung",
      }
  );
}
