const fs = require("fs");

const file = "app/api/autopilot/run/route.ts";
let data = fs.readFileSync(file);

function replaceOnce(buffer, search, replacement, label) {
  const needle = Buffer.from(search, "ascii");
  const first = buffer.indexOf(needle);

  if (first < 0) {
    throw new Error(label + ": Marker nicht gefunden.");
  }

  const second = buffer.indexOf(
    needle,
    first + needle.length
  );

  if (second >= 0) {
    throw new Error(label + ": Marker ist nicht eindeutig.");
  }

  return Buffer.concat([
    buffer.subarray(0, first),
    Buffer.from(replacement, "ascii"),
    buffer.subarray(first + needle.length)
  ]);
}

/*
 * 1. VISION vor CORE starten.
 * Noch nicht awaiten.
 */
const coreMarker =
  "   const aiStartedAt = Date.now();";

const parallelStart = [
  "   /*",
  "    * FAST READY V3 - CORE + VISION PARALLEL",
  "    */",
  "   const creativeStartedAt = Date.now();",
  "",
  "   const creativeContent: Array<Record<string, unknown>> = [",
  "     {",
  '       type: "input_text",',
  "       text:",
  '         "Analysiere ausschliesslich die bereitgestellten Immobilienbilder. " +',
  '         "Erfinde keine nicht sichtbaren Fakten. " +',
  '         "Gib fuer jedes Bild imageIndex, Raumtyp, sichtbaren Zustand und maximal fuenf sichtbare Merkmale zurueck. " +',
  '         "imageIndex beginnt bei 1 und entspricht exakt der Reihenfolge der Bilder.",',
  "     },",
  "   ];",
  "",
  "   registeredImages.forEach((image, index) => {",
  "     creativeContent.push({",
  '       type: "input_text",',
  '       text: `Bild ${index + 1}`,',
  "     });",
  "",
  "     creativeContent.push({",
  '       type: "input_image",',
  "       image_url: image.url,",
  '       detail: "low",',
  "     });",
  "   });",
  "",
  "   const visionResponsePromise =",
  "     registeredImages.length > 0",
  "       ? fetch(",
  '           "https://api.openai.com/v1/responses",',
  "           {",
  '             method: "POST",',
  "             headers: {",
  "               Authorization:",
  '                 `Bearer ${process.env.OPENAI_API_KEY}`,',
  '               "Content-Type": "application/json",',
  "             },",
  "             body: JSON.stringify({",
  "               model:",
  "                 process.env.OPENAI_AUTOPILOT_MODEL ||",
  '                 "gpt-4.1-mini",',
  "               store: false,",
  "               max_output_tokens: 900,",
  "               input: [",
  "                 {",
  '                   role: "user",',
  "                   content: creativeContent,",
  "                 },",
  "               ],",
  "               text: {",
  "                 format: {",
  '                   type: "json_schema",',
  '                   name: "inserat_ai_autopilot_vision",',
  "                   strict: true,",
  "                   schema: {",
  '                     type: "object",',
  "                     additionalProperties: false,",
  "                     properties: {",
  "                       imageAnalyses: {",
  '                         type: "array",',
  "                         items: {",
  '                           type: "object",',
  "                           additionalProperties: false,",
  "                           properties: {",
  '                             imageIndex: { type: "integer" },',
  '                             room: { type: "string" },',
  '                             condition: { type: "string" },',
  "                             visibleFacts: {",
  '                               type: "array",',
  '                               items: { type: "string" },',
  "                               maxItems: 5,",
  "                             },",
  "                           },",
  "                           required: [",
  '                             "imageIndex",',
  '                             "room",',
  '                             "condition",',
  '                             "visibleFacts",',
  "                           ],",
  "                         },",
  "                       },",
  "                     },",
  '                     required: ["imageAnalyses"],',
  "                   },",
  "                 },",
  "               },",
  "             }),",
  "           }",
  "         )",
  "       : Promise.resolve(null);",
  "",
  coreMarker
].join("\n");

data = replaceOnce(
  data,
  coreMarker,
  parallelStart,
  "CORE start"
);

/*
 * 2. Alten VISION-only Block ersetzen.
 * Jetzt wird nur noch das bereits laufende Promise abgeholt.
 */
let startToken = Buffer.from(
  "    /*\r\n     * FAST READY V2 - VISION ONLY"
);

if (data.indexOf(startToken) < 0) {
  startToken = Buffer.from(
    "    /*\n     * FAST READY V2 - VISION ONLY"
  );
}

const endToken = Buffer.from(
  "    const postprocessStartedAt"
);

const start = data.indexOf(startToken);
const end = data.indexOf(endToken, start);

if (start < 0 || end < 0 || end <= start) {
  throw new Error(
    "VISION-only Block nicht eindeutig gefunden."
  );
}

const oldVision = data.subarray(start, end);

const requiredVisionMarkers = [
  "const creativeStartedAt",
  "const creativeContent",
  "const creativeResponse",
  "inserat_ai_autopilot_vision",
  "parsed.imageAnalyses",
  "parsed.variants",
  "AUTOPILOT_VISION_TIMING"
];

for (const marker of requiredVisionMarkers) {
  if (!oldVision.includes(Buffer.from(marker))) {
    throw new Error(
      "VISION Marker fehlt: " + marker
    );
  }
}

const nl = oldVision.includes(Buffer.from("\r\n"))
  ? "\r\n"
  : "\n";

const collector = [
  "    /*",
  "     * FAST READY V3 - collect parallel VISION",
  "     */",
  "    let visionImageAnalyses: ImageAnalysis[] = [];",
  "",
  "    const creativeResponse =",
  "      await visionResponsePromise;",
  "",
  "    if (creativeResponse) {",
  "      const creativeRawText =",
  "        await creativeResponse.text();",
  "",
  "      let creativePayload: unknown = null;",
  "",
  "      try {",
  "        creativePayload =",
  "          creativeRawText",
  "            ? JSON.parse(creativeRawText)",
  "            : null;",
  "      } catch {",
  "        creativePayload = creativeRawText;",
  "      }",
  "",
  "      if (!creativeResponse.ok) {",
  "        console.error(",
  '          "[autopilot/run] VISION_OPENAI_DIAGNOSTIC " +',
  "            JSON.stringify({",
  "              status: creativeResponse.status,",
  "              requestId:",
  "                creativeResponse.headers.get(",
  '                  "x-request-id"',
  "                ),",
  "              payload: creativePayload,",
  "            })",
  "        );",
  "",
  "        throw new Error(",
  '          "Inserat-AI konnte die Bilder nicht analysieren."',
  "        );",
  "      }",
  "",
  "      const creativeOutputText =",
  "        extractOutputText(creativePayload);",
  "",
  "      if (!creativeOutputText) {",
  "        throw new Error(",
  '          "Inserat-AI hat kein Vision-Ergebnis zurueckgegeben."',
  "        );",
  "      }",
  "",
  "      let creativeParsed: {",
  "        imageAnalyses: ImageAnalysis[];",
  "      };",
  "",
  "      try {",
  "        creativeParsed = JSON.parse(",
  "          creativeOutputText",
  "        ) as {",
  "          imageAnalyses: ImageAnalysis[];",
  "        };",
  "      } catch {",
  "        throw new Error(",
  '          "Das Vision-Ergebnis hatte kein gueltiges JSON-Format."',
  "        );",
  "      }",
  "",
  "      visionImageAnalyses =",
  "        Array.isArray(creativeParsed.imageAnalyses)",
  "          ? creativeParsed.imageAnalyses",
  "          : [];",
  "    }",
  "",
  "    parsed.imageAnalyses = visionImageAnalyses;",
  "",
  "    const fastTitleParts = [",
  "      safeString(parsed.propertyType, 80),",
  "      safeString(parsed.location, 80),",
  "    ].filter(Boolean);",
  "",
  "    const fastTitle =",
  '      fastTitleParts.join(" in ") ||',
  '      "Immobilienangebot";',
  "",
  "    const fastTextParts = [",
  "      safeString(parsed.summary, 4000),",
  "      Array.isArray(parsed.highlights)",
  "        ? parsed.highlights",
  "            .map((item) => safeString(item, 300))",
  "            .filter(Boolean)",
  '            .join(" ")',
  '        : "",',
  "    ].filter(Boolean);",
  "",
  "    const fastText =",
  '      fastTextParts.join("\\n\\n") || fastTitle;',
  "",
  "    parsed.variants = [",
  "      { title: fastTitle, text: fastText },",
  "      { title: fastTitle, text: fastText },",
  "      { title: fastTitle, text: fastText },",
  "    ];",
  "",
  "    const creativeDurationMs =",
  "      Date.now() - creativeStartedAt;",
  "",
  "    console.info(",
  '      "[AUTOPILOT_VISION_TIMING]",',
  "      {",
  "        listingId: listing.id,",
  "        imageCount: registeredImages.length,",
  "        durationMs: creativeDurationMs,",
  "        durationSeconds:",
  "          Number(",
  "            (creativeDurationMs / 1000).toFixed(2)",
  "          ),",
  "      }",
  "    );",
  "",
  ""
].join(nl);

data = Buffer.concat([
  data.subarray(0, start),
  Buffer.from(collector, "ascii"),
  data.subarray(end)
]);

fs.writeFileSync(file, data);

console.log("CORE + VISION Parallel-Patch eingesetzt.");
console.log("Alter VISION Block:", oldVision.length, "Bytes");
console.log(
  "Neuer Collector:",
  Buffer.byteLength(collector, "ascii"),
  "Bytes"
);
