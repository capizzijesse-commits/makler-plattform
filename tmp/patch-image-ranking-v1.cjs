const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let s = fs.readFileSync(file, "utf8");

const CRLF = s.includes("\r\n");
let n = s.replace(/\r\n/g, "\n");

function replaceOnce(oldText, newText, label) {
  const count = n.split(oldText).length - 1;

  if (count !== 1) {
    throw new Error(
      label + ": erwartet 1 Anker, gefunden " + count
    );
  }

  n = n.replace(oldText, newText);
  console.log("OK:", label);
}

/* 1. ImageAnalysis erweitern */
replaceOnce(
`type ImageAnalysis = {
  imageIndex: number;
  room: string;
  condition: string;
  visibleFacts: string[];
};`,
`type ImageAnalysis = {
  imageIndex: number;
  room: string;
  condition: string;
  visibleFacts: string[];
  category: string;
  qualityScore: number;
  titleScore: number;
  suitable: boolean;
};`,
"ImageAnalysis type"
);

/* 2. Vision-Prompt erweitern */
replaceOnce(
`         "Gib fuer jedes Bild imageIndex, Raumtyp, sichtbaren Zustand und maximal fuenf sichtbare Merkmale zurueck. " +
         "imageIndex beginnt bei 1 und entspricht exakt der Reihenfolge der Bilder.",`,
`         "Gib fuer jedes Bild imageIndex, Raumtyp, sichtbaren Zustand und maximal fuenf sichtbare Merkmale zurueck. " +
         "Bewerte ausserdem category, qualityScore von 0 bis 100, titleScore von 0 bis 100 und suitable. " +
         "titleScore bewertet ausschliesslich die Eignung als verkaufsstarkes Titelbild. " +
         "Bevorzuge helle, klare, attraktive Wohnraeume oder eine starke Aussenansicht. " +
         "Grundrisse, Logos, Dokumentseiten, unscharfe, dunkle oder offensichtlich ungeeignete Bilder erhalten einen niedrigen titleScore. " +
         "imageIndex beginnt bei 1 und entspricht exakt der Reihenfolge der Bilder.",`,
"Vision prompt"
);

/* 3. Vision-Schema erweitern */
replaceOnce(
`                             visibleFacts: {
                               type: "array",
                               items: { type: "string" },
                               maxItems: 5,
                             },
                           },
                           required: [
                             "imageIndex",
                             "room",
                             "condition",
                             "visibleFacts",
                           ],`,
`                             visibleFacts: {
                               type: "array",
                               items: { type: "string" },
                               maxItems: 5,
                             },
                             category: {
                               type: "string",
                             },
                             qualityScore: {
                               type: "integer",
                               minimum: 0,
                               maximum: 100,
                             },
                             titleScore: {
                               type: "integer",
                               minimum: 0,
                               maximum: 100,
                             },
                             suitable: {
                               type: "boolean",
                             },
                           },
                           required: [
                             "imageIndex",
                             "room",
                             "condition",
                             "visibleFacts",
                             "category",
                             "qualityScore",
                             "titleScore",
                             "suitable",
                           ],`,
"Vision schema"
);

/* 4. Drei lokale Varianten wirklich unterschiedlich */
replaceOnce(
`    parsed.variants = [
      { title: fastTitle, text: fastText },
      { title: fastTitle, text: fastText },
      { title: fastTitle, text: fastText },
    ];`,
`    const variantHighlights =
      Array.isArray(parsed.highlights)
        ? parsed.highlights
            .map((item) => safeString(item, 300))
            .filter(Boolean)
        : [];

    const locationLabel =
      safeString(parsed.location, 80);

    const propertyLabel =
      safeString(parsed.propertyType, 80) ||
      "Immobilie";

    const summaryText =
      safeString(parsed.summary, 4000) ||
      fastText;

    const highlightsSentence =
      variantHighlights.length > 0
        ? variantHighlights.join(" ? ")
        : "";

    const factualText =
      [
        summaryText,
        highlightsSentence,
      ]
        .filter(Boolean)
        .join("\\n\\n");

    const benefitText =
      [
        locationLabel
          ? propertyLabel +
            " in " +
            locationLabel +
            ": " +
            summaryText
          : summaryText,
        highlightsSentence
          ? "Besonders hervorzuheben: " +
            highlightsSentence
          : "",
      ]
        .filter(Boolean)
        .join("\\n\\n");

    const compactText =
      [
        propertyLabel +
          (locationLabel
            ? " | " + locationLabel
            : ""),
        highlightsSentence || summaryText,
        highlightsSentence
          ? summaryText
          : "",
      ]
        .filter(Boolean)
        .join("\\n\\n");

    parsed.variants = [
      {
        title: fastTitle,
        text: factualText || fastText,
      },
      {
        title:
          locationLabel
            ? propertyLabel +
              " mit Charakter in " +
              locationLabel
            : propertyLabel +
              " mit Charakter",
        text: benefitText || fastText,
      },
      {
        title:
          locationLabel
            ? "Entdecken: " +
              propertyLabel +
              " in " +
              locationLabel
            : "Entdecken: " +
              propertyLabel,
        text: compactText || fastText,
      },
    ];`,
"3 distinct variants"
);

/* 5. Analyse speichern + automatische Reihenfolge/Titelbild */
replaceOnce(
`    /*
     * Einzelanalysen an den Bildern speichern.
     */
    await Promise.all(
      registeredImages.map(
        async (
          image,
          index
        ) => {
          const analysis =
            imageAnalyses.find(
              (item) =>
                item.imageIndex ===
                  index + 1
            );

          const analysisText =
            analysis
              ? JSON.stringify({
                  room:
                    safeString(
                      analysis.room,
                      120
                    ),

                  condition:
                    safeString(
                      analysis.condition,
                      300
                    ),

                  visibleFacts:
                    safeStringArray(
                      analysis.visibleFacts,
                      5
                    ),
                })
              : summary;

          await prisma
            .listingImage
            .update({
              where: {
                id:
                  image.id,
              },

              data: {
                analysis:
                  analysisText,

                analysisStatus:
                  "analyzed",

                analyzedAt:
                  new Date(),
              },
            });
        }
      )
    );`,
`    /*
     * Einzelanalysen speichern und Bilder automatisch
     * in eine verkaufsorientierte Reihenfolge bringen.
     */
    const categoryPriority = (
      category: string
    ) => {
      const value =
        category.toLowerCase();

      if (
        value.includes("living") ||
        value.includes("wohn")
      ) return 100;

      if (
        value.includes("exterior") ||
        value.includes("aussen") ||
        value.includes("fassade")
      ) return 95;

      if (
        value.includes("kitchen") ||
        value.includes("kueche") ||
        value.includes("k?che")
      ) return 90;

      if (
        value.includes("terrace") ||
        value.includes("balcony") ||
        value.includes("garten") ||
        value.includes("balkon") ||
        value.includes("terrasse")
      ) return 85;

      if (
        value.includes("bed") ||
        value.includes("schlaf")
      ) return 75;

      if (
        value.includes("bath") ||
        value.includes("bad")
      ) return 65;

      if (
        value.includes("floorplan") ||
        value.includes("grundriss") ||
        value.includes("document") ||
        value.includes("logo")
      ) return 10;

      return 50;
    };

    const rankedImages =
      registeredImages
        .map((image, index) => {
          const analysis =
            imageAnalyses.find(
              (item) =>
                item.imageIndex ===
                  index + 1
            );

          const qualityScore =
            typeof analysis?.qualityScore === "number"
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    analysis.qualityScore
                  )
                )
              : 50;

          const titleScore =
            typeof analysis?.titleScore === "number"
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    analysis.titleScore
                  )
                )
              : qualityScore;

          const suitable =
            typeof analysis?.suitable === "boolean"
              ? analysis.suitable
              : true;

          const category =
            safeString(
              analysis?.category,
              80
            );

          const rankingScore =
            (suitable ? 1000 : 0) +
            titleScore * 10 +
            qualityScore +
            categoryPriority(category);

          return {
            image,
            originalIndex: index,
            analysis,
            rankingScore,
          };
        })
        .sort(
          (a, b) =>
            b.rankingScore -
              a.rankingScore ||
            a.originalIndex -
              b.originalIndex
        );

    await Promise.all(
      rankedImages.map(
        async (
          ranked,
          position
        ) => {
          const analysis =
            ranked.analysis;

          const analysisText =
            analysis
              ? JSON.stringify({
                  room:
                    safeString(
                      analysis.room,
                      120
                    ),
                  condition:
                    safeString(
                      analysis.condition,
                      300
                    ),
                  visibleFacts:
                    safeStringArray(
                      analysis.visibleFacts,
                      5
                    ),
                  category:
                    safeString(
                      analysis.category,
                      80
                    ),
                  qualityScore:
                    typeof analysis.qualityScore ===
                    "number"
                      ? analysis.qualityScore
                      : 0,
                  titleScore:
                    typeof analysis.titleScore ===
                    "number"
                      ? analysis.titleScore
                      : 0,
                  suitable:
                    typeof analysis.suitable ===
                    "boolean"
                      ? analysis.suitable
                      : true,
                })
              : summary;

          await prisma
            .listingImage
            .update({
              where: {
                id:
                  ranked.image.id,
              },

              data: {
                position,
                isPrimary:
                  position === 0,

                analysis:
                  analysisText,

                analysisStatus:
                  "analyzed",

                analyzedAt:
                  new Date(),
              },
            });
        }
      )
    );

    console.info(
      "[AUTOPILOT_IMAGE_RANKING]",
      {
        listingId: listing.id,
        imageCount:
          rankedImages.length,
        primaryImageId:
          rankedImages[0]?.image.id ??
          null,
      }
    );`,
"image ranking"
);

fs.writeFileSync(
  file,
  CRLF
    ? n.replace(/\n/g, "\r\n")
    : n,
  "utf8"
);

console.log("");
console.log("IMAGE RANKING V1 EINGEBAUT");
