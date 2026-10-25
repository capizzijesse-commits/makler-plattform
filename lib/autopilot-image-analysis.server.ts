import { createHash } from "node:crypto";
import { AUTOPILOT_IMAGE_CATEGORIES, validateAutopilotImageAnalyses, validateRequestedImageIds } from "./autopilot-image-quality";
import { ROOM_INDEPENDENT_VISIBLE_FACTS } from "./image-expose-consistency";
function extractOutputText(
  payload: unknown
): string {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return "";
  }

  const root =
    payload as {
      output?: unknown;
    };

  if (
    !Array.isArray(
      root.output
    )
  ) {
    return "";
  }

  for (
    const outputItem
    of root.output
  ) {
    if (
      typeof outputItem !==
        "object" ||
      outputItem === null
    ) {
      continue;
    }

    const content =
      (
        outputItem as {
          content?: unknown;
        }
      ).content;

    if (
      !Array.isArray(
        content
      )
    ) {
      continue;
    }

    for (
      const contentItem
      of content
    ) {
      if (
        typeof contentItem !==
          "object" ||
        contentItem === null
      ) {
        continue;
      }

      const candidate =
        contentItem as {
          type?: unknown;
          text?: unknown;
        };

      if (
        candidate.type ===
          "output_text" &&
        typeof candidate.text ===
          "string"
      ) {
        return candidate.text;
      }
    }
  }

  return "";
}
export async function requestAutopilotImageAnalyses(imageUrls: string[], imageIds?: readonly string[]) {
   if (imageUrls.some(url => typeof url !== "string" || !url.trim())) throw new Error("AUTOPILOT_IMAGE_INPUT_INVALID");
   // Persisted callers supply their image IDs. Byte/data-URL callers receive stable
   // opaque content identities; occurrences keep identical uploads distinct.
   const occurrences = new Map<string, number>();
   const requestedIds = imageIds ? [...imageIds] : imageUrls.map(url => {
     const contentId = createHash("sha256").update(url).digest("hex").slice(0, 32);
     const occurrence = (occurrences.get(contentId) ?? 0) + 1;
     occurrences.set(contentId, occurrence);
     return "image_" + contentId + "_" + occurrence;
   });
   validateRequestedImageIds(requestedIds, imageUrls.length);
   const creativeContent: Array<Record<string, unknown>> = [
     {
       type: "input_text",
       text:
         "Analysiere ausschliesslich die bereitgestellten Immobilienbilder. " +
         "Erfinde keine nicht sichtbaren Fakten. " +
         "Gib fuer jede angeforderte imageId genau eine Analyse mit unveraenderter imageId und imageIndex zurueck. " +
         "Erwartete Bild-IDs: " + JSON.stringify(requestedIds) + ". " +
         "Kein Bild ueberspringen, zusammenfassen oder neu nummerieren: auch Duplikate, dunkle, unscharfe, gedrehte Bilder und unklare Details einzeln analysieren. " +
         "Bei Unsicherheit room leer und roomConfidence 0 angeben, niemals eine Analyse weglassen oder Fakten erfinden. " +
         "Gib Raumtyp, sichtbaren Zustand und maximal zwei sehr kurze sichtbare Merkmale zurueck. " +
         "roomConfidence von 0 bis 1; bei unklarer Raumnutzung 0. roomIndependentFacts nur unabhängig sichtbare Merkmale als {fact,confidence}: " + ROOM_INDEPENDENT_VISIBLE_FACTS.join(", ") + ". Keine Raumnutzung aus Möbeln ableiten. " +
         "Bewerte ausserdem category, qualityScore von 0 bis 100, titleScore von 0 bis 100 und suitable. " +
         "titleScore bewertet ausschliesslich die Eignung als verkaufsstarkes Titelbild. " +
         "Bevorzuge helle, klare, attraktive Wohnraeume oder eine starke Aussenansicht. " +
         "Grundrisse, Logos, Dokumentseiten, unscharfe, dunkle oder offensichtlich ungeeignete Bilder erhalten einen niedrigen titleScore. " +
         "imageIndex beginnt bei 1 und entspricht exakt der Reihenfolge der Bilder. " +
         "category muss einer dieser Werte sein: " + AUTOPILOT_IMAGE_CATEGORIES.join(", ") + ". " +
         "Unterscheide Wohnzimmer, Küche, Schlafzimmer, Bad und Außenbereiche nur anhand sichtbarer Belege; bei unklarer Nutzung room leer und roomConfidence 0. " +
         "sharpnessScore und exposureScore von 0 bis 100 bewerten tatsächliche Schärfe und Belichtung. " +
         "suitabilityConfidence von 0 bis 1 bewertet die Sicherheit der Eignungsentscheidung; suitabilityReason begründet sie knapp. " +
         "Bei unsicherer Eignung keine positive Sicherheit vortäuschen. Logos, Dokumente und Grundrisse sind keine Immobilienfotos. " +
         "Keine rechtlichen, technischen oder nicht sichtbaren Eigenschaften aus Bildern ableiten.",
     },
   ];


   imageUrls.forEach((url, index) => {
     creativeContent.push({ type: "input_text", text: "Bild " + (index + 1) + "; imageId=" + requestedIds[index] });
     creativeContent.push({ type: "input_image", image_url: url, detail: "low" });
   });
   const visionResponsePromise =
     imageUrls.length > 0
       ? fetch(
           "https://api.openai.com/v1/responses",
           {
             method: "POST",
             headers: {
               Authorization:
                 `Bearer ${process.env.OPENAI_API_KEY}`,
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               model:
                 process.env.OPENAI_AUTOPILOT_MODEL ||
                 "gpt-4.1-mini",
               store: false,
               max_output_tokens: Math.min(16000, imageUrls.length * 500 + 300),
               input: [
                 {
                   role: "user",
                   content: creativeContent,
                 },
               ],
               text: {
                 format: {
                   type: "json_schema",
                   name: "inserat_ai_autopilot_vision",
                   strict: true,
                   schema: {
                     type: "object",
                     additionalProperties: false,
                     properties: {
                       imageAnalyses: {
                         type: "array",
                         minItems: imageUrls.length,
                         maxItems: imageUrls.length,
                         items: {
                           type: "object",
                           additionalProperties: false,
                           properties: {
                             imageId: { type: "string", enum: requestedIds },
                             imageIndex: { type: "integer", minimum: 1, maximum: imageUrls.length },
                             room: { type: "string" },
                             roomConfidence: { type: "number", minimum: 0, maximum: 1 },
                             roomIndependentFacts: { type: "array", maxItems: 5, items: {
                               type: "object", additionalProperties: false,
                               properties: { fact: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 } },
                               required: ["fact", "confidence"]
                             } },
                             condition: { type: "string" },
                             visibleFacts: {
                               type: "array",
                               items: { type: "string" },
                               maxItems: 2,
                             },
                             category: {
                               type: "string",
                               enum: [...AUTOPILOT_IMAGE_CATEGORIES],
                             },
                             sharpnessScore: { type: "integer", minimum: 0, maximum: 100 },
                             exposureScore: { type: "integer", minimum: 0, maximum: 100 },
                             suitabilityConfidence: { type: "number", minimum: 0, maximum: 1 },
                             suitabilityReason: { type: "string" },
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
                             "imageId",
                             "imageIndex",
                             "room",
                             "roomConfidence",
                             "roomIndependentFacts",
                             "condition",
                             "visibleFacts",
                             "category",
                             "qualityScore",
                             "titleScore",
                             "suitable",
                             "sharpnessScore",
                             "exposureScore",
                             "suitabilityConfidence",
                             "suitabilityReason",
                           ],
                         },
                       },
                     },
                     required: ["imageAnalyses"],
                   },
                 },
               },
             }),
           }
         )
       : Promise.resolve(null);

    let visionImageAnalyses: unknown = [];

    const creativeResponse =
      await visionResponsePromise;

    if (creativeResponse) {
      const creativeRawText =
        await creativeResponse.text();

      let creativePayload: unknown = null;

      try {
        creativePayload =
          creativeRawText
            ? JSON.parse(creativeRawText)
            : null;
      } catch {
        creativePayload = creativeRawText;
      }

      if (!creativeResponse.ok) {
        console.error(
          "[autopilot/run] VISION_OPENAI_DIAGNOSTIC " +
            JSON.stringify({
              status: creativeResponse.status,
              requestId:
                creativeResponse.headers.get(
                  "x-request-id"
                ),
              payload: creativePayload,
            })
        );

        throw new Error(
          "Inserat-AI konnte die Bilder nicht analysieren."
        );
      }

      const creativeOutputText =
        extractOutputText(creativePayload);

      if (!creativeOutputText) {
        throw new Error(
          "Inserat-AI hat kein Vision-Ergebnis zurueckgegeben."
        );
      }

      let creativeParsed: {
        imageAnalyses: unknown[];
      };

      try {
        creativeParsed = JSON.parse(
          creativeOutputText
        ) as {
          imageAnalyses: unknown[];
        };
      } catch (visionParseError) {
        console.error(
          "[AUTOPILOT_VISION_JSON_PARSE_FAILED] " +
            JSON.stringify({
              error:
                visionParseError instanceof Error
                  ? visionParseError.message
                  : String(visionParseError),
              outputLength: creativeOutputText.length,
              outputPreview: creativeOutputText.slice(0, 4000),
            })
        );
        throw new Error(
          "Das Vision-Ergebnis hatte kein gueltiges JSON-Format."
        );
      }

      visionImageAnalyses =
        Array.isArray(creativeParsed.imageAnalyses)
          ? creativeParsed.imageAnalyses
          : [];
    }


return validateAutopilotImageAnalyses(visionImageAnalyses, imageUrls.length, requestedIds);
}
