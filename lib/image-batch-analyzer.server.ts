import "server-only";

import OpenAI from "openai";

export type ImageBatchInput = {
  name: string;
  mimeType: string;
  bytes: Buffer;
};

export type ImageBatchAnalysis = {
  imageIndex: number;
  analysis: string;
};

type BatchAnalysis = {
  imageIndex: number;
  room?: unknown;
  condition?: unknown;
  visibleFacts?: unknown;
  strengths?: unknown;
  limitations?: unknown;
};

function cleanText(
  value: unknown,
  fallback: string
): string {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : fallback;
}

function cleanList(
  value: unknown,
  maximum: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim().length > 0
    )
    .map((item) => item.trim())
    .slice(0, maximum);
}

function buildAnalysis(
  parsed: BatchAnalysis
): string {
  const room =
    cleanText(
      parsed.room,
      "Nicht eindeutig bestimmbar"
    );

  const condition =
    cleanText(
      parsed.condition,
      "Nur eingeschraenkt beurteilbar"
    );

  const visibleFacts =
    cleanList(
      parsed.visibleFacts,
      5
    );

  const strengths =
    cleanList(
      parsed.strengths,
      2
    );

  const limitations =
    cleanList(
      parsed.limitations,
      2
    );

  return [
    "Raum oder Bereich: " + room,
    "Sichtbare Elemente: " +
      (
        visibleFacts.length > 0
          ? visibleFacts.join(", ")
          : "Keine sicheren Details"
      ),
    "Zustand und Eindruck: " +
      condition,
    "Vermarktungsrelevante Staerken: " +
      (
        strengths.length > 0
          ? strengths.join(", ")
          : "Keine eindeutig belegten Staerken"
      ),
    "Hinweise und Einschraenkungen: " +
      (
        limitations.length > 0
          ? limitations.join(", ")
          : "Keine besonderen Einschraenkungen"
      ),
  ].join("\n\n");
}


export async function analyzeImageBatches(
  images: ImageBatchInput[]
): Promise<ImageBatchAnalysis[]> {
  if (images.length === 0) {
    return [];
  }

  const BATCH_SIZE = 5;

  const batches: ImageBatchInput[][] =
    [];

  for (
    let index = 0;
    index < images.length;
    index += BATCH_SIZE
  ) {
    batches.push(
      images.slice(
        index,
        index + BATCH_SIZE
      )
    );
  }

  const results =
    await Promise.all(
      batches.map(
        async (
          batch,
          batchIndex
        ) => {
          const offset =
            batchIndex *
            BATCH_SIZE;

          const analyses =
            await analyzeImageBatch(
              batch
            );

          return analyses.map(
            (analysis) => ({
              ...analysis,
              imageIndex:
                analysis.imageIndex +
                offset,
            })
          );
        }
      )
    );

  return results.flat();
}

export async function analyzeImageBatch(
  images: ImageBatchInput[]
): Promise<ImageBatchAnalysis[]> {
  if (images.length === 0) {
    return [];
  }

  if (images.length > 5) {
    throw new Error(
      "Pro Batch sind maximal 5 Bilder erlaubt."
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY fehlt."
    );
  }

  const startedAt =
    performance.now();

  const content: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "image_url";
        image_url: {
          url: string;
          detail: "low";
        };
      }
  > = [
    {
      type: "text",
      text:
        "Analysiere jedes bereitgestellte Immobilienbild separat. " +
        "Erfinde keine nicht sichtbaren Fakten. " +
        "Gib ausschliesslich JSON zurueck. " +
        "imageIndex beginnt bei 0 und muss exakt der angegebenen Bildnummer entsprechen.\n\n" +
        'Format: {"analyses":[{"imageIndex":0,"room":"...","condition":"...","visibleFacts":["..."],"strengths":["..."],"limitations":["..."]}]}\n\n' +
        "Regeln: room maximal 5 Woerter; condition maximal 10 Woerter; " +
        "visibleFacts maximal 5 kurze Eintraege; strengths maximal 2; limitations maximal 2.",
    },
  ];

  for (
    let index = 0;
    index < images.length;
    index += 1
  ) {
    const image =
      images[index];

    content.push({
      type: "text",
      text:
        `Bild ${index}, Dateiname: ${image.name}`,
    });

    content.push({
      type: "image_url",
      image_url: {
        url:
          `data:${image.mimeType};base64,` +
          image.bytes.toString("base64"),
        detail: "low",
      },
    });
  }

  console.info(
    "[IMAGE BATCH SPEED] openai-start",
    {
      imageCount:
        images.length,
      imageNames:
        images.map(
          (image) => image.name
        ),
      imageBytes:
        images.map(
          (image) =>
            image.bytes.byteLength
        ),
    }
  );

  const openai =
    new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY,
    });

  const response =
    await openai.chat.completions.create({
      model:
        "gpt-4.1-mini",
      temperature:
        0,
      max_tokens:
        1200,
      response_format: {
        type:
          "json_object",
      },
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

  const raw =
    response.choices[0]
      ?.message?.content
      ?.trim();

  if (!raw) {
    throw new Error(
      "Keine Batch-Bildanalyse erhalten."
    );
  }

  const parsed =
    JSON.parse(raw) as {
      analyses?: BatchAnalysis[];
    };

  const analyses =
    Array.isArray(
      parsed.analyses
    )
      ? parsed.analyses
          .filter(
            (
              item
            ): item is BatchAnalysis =>
              typeof item ===
                "object" &&
              item !== null &&
              Number.isInteger(
                item.imageIndex
              )
          )
          .sort(
            (a, b) =>
              a.imageIndex -
              b.imageIndex
          )
          .map((item) => ({
            imageIndex:
              item.imageIndex,
            analysis:
              buildAnalysis(
                item
              ),
          }))
      : [];

  if (
    analyses.length !==
    images.length
  ) {
    /*
     * IMAGE_BATCH_RECOVERY_V2
     *
     * Behalte bereits erfolgreiche Analysen.
     * Nur tats?chlich fehlende Bilder werden
     * einzeln nachanalysiert.
     */
    if (images.length === 1) {
      throw new Error(
        `Bildanalyse unvollstaendig: erwartet 1, erhalten ${analyses.length}.`
      );
    }

    const existingByIndex =
      new Map(
        analyses.map(
          (analysis) => [
            analysis.imageIndex,
            analysis,
          ]
        )
      );

    const missingIndexes =
      images
        .map(
          (_, imageIndex) =>
            imageIndex
        )
        .filter(
          (imageIndex) =>
            !existingByIndex.has(
              imageIndex
            )
        );

    console.warn(
      "[IMAGE BATCH RECOVERY] incomplete batch",
      {
        expected:
          images.length,
        received:
          analyses.length,
        missing:
          missingIndexes.length,
        missingIndexes,
      }
    );

    const recoveredMissing =
      await Promise.all(
        missingIndexes.map(
          async (
            imageIndex
          ) => {
            const single =
              await analyzeImageBatch(
                [
                  images[
                    imageIndex
                  ],
                ]
              );

            if (
              single.length !== 1
            ) {
              throw new Error(
                `Einzelbildanalyse unvollstaendig fuer Bild ${imageIndex}.`
              );
            }

            return {
              imageIndex,
              analysis:
                single[0].analysis,
            };
          }
        )
      );

    const recovered =
      [
        ...analyses,
        ...recoveredMissing,
      ].sort(
        (a, b) =>
          a.imageIndex -
          b.imageIndex
      );

    if (
      recovered.length !==
      images.length
    ) {
      throw new Error(
        `Batch-Recovery unvollstaendig: erwartet ${images.length}, erhalten ${recovered.length}.`
      );
    }

    console.info(
      "[IMAGE BATCH RECOVERY] finished",
      {
        imageCount:
          recovered.length,
        retried:
          missingIndexes.length,
      }
    );

    return recovered;
  }

  const durationMs =
    Math.round(
      performance.now() -
        startedAt
    );

  console.info(
    "[IMAGE BATCH SPEED] finished",
    {
      imageCount:
        images.length,
      imageNames:
        images.map(
          (image) => image.name
        ),
      imageBytes:
        images.map(
          (image) =>
            image.bytes.byteLength
        ),
      durationMs,
    }
  );

  return analyses;
}
