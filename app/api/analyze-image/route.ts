import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canUseListingCoreForUser } from "@/lib/listing-access";
import { getAuthenticatedUser } from "@/lib/session";
import {
  createUltraSpeedContentHash,
  createUltraSpeedFingerprint,
  runUltraSpeedTask,
} from "@/lib/ultra-speed";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY fehlt. Bitte die Datei .env.local kontrollieren.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const listingIdValue =
      formData.get("listingId");

    const listingId =
      typeof listingIdValue === "string"
        ? listingIdValue.trim()
        : "";

    const hasListingAccess =
      process.env.NODE_ENV ===
        "development" ||
      await canUseListingCoreForUser({
        userId: user.id,
        plan: user.plan,
        listingId,
      });

    if (!hasListingAccess) {
      return NextResponse.json(
        {
          error:
            "Die Bildanalyse ist für dieses Objekt erst nach der Freischaltung verfügbar.",
          code: "LISTING_PAYMENT_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Es wurde kein gültiges Bild übermittelt." },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      return NextResponse.json(
        {
          error:
            "Dieses Bildformat wird nicht unterstützt. Bitte JPG, PNG oder WEBP verwenden.",
        },
        { status: 400 }
      );
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error: "Das Bild ist zu gross. Maximal erlaubt sind 8 MB.",
        },
        { status: 400 }
      );
    }

    const analysisStartedAt =
      Date.now();

    const bytes =
      new Uint8Array(
        await image.arrayBuffer()
      );

    const imageHash =
      createUltraSpeedContentHash(
        bytes
      );

    const ultraSpeedKey =
      createUltraSpeedFingerprint({
        namespace:
          "listing-image-analysis",
        version:
          "listing-image-analysis-v3-compact-json-low",
        payload: {
          userId:
            user.id,
          imageHash,
          imageType:
            image.type,
          model:
            "gpt-4.1-mini",
          detail:
            "low",
        },
      });

    const base64Image =
      Buffer.from(bytes).toString(
        "base64"
      );

    const openai = new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY,
    });

    const ultraSpeedTask =
      await runUltraSpeedTask<string>({
        key:
          ultraSpeedKey,
        namespace:
          "listing-image-analysis",
        memoryTtlMs:
          10 * 60 * 1000,
        task: async () => {
          const response =
            await openai.chat.completions.create({
              model:
                "gpt-4.1-mini",
              temperature:
                0,
              max_tokens:
                260,
              messages: [
                {
                  role:
                    "system",
                  content:
                    "Du bist ein pr\u00e4ziser Schweizer Immobilienfoto-Analyst. " +
                    "Analysiere ausschliesslich das tats\u00e4chlich sichtbare einzelne Foto. " +
                    "Erfinde keine R\u00e4ume, Materialien, Fl\u00e4chen, Ausstattungen oder Aussichten. " +
                    "Gib ausschliesslich ein g\u00fcltiges kompaktes JSON-Objekt aus. " +
                    "Kein Markdown und keine Erkl\u00e4rungen ausserhalb des JSON.",
                },
                {
                  role:
                    "user",
                  content: [
                    {
                      type:
                        "text",
                      text:
                        "Analysiere dieses einzelne Immobilienfoto.\\n\\n" +
                        "Gib genau dieses JSON-Format zur\u00fcck:\\n" +
                        '{"room":"...","condition":"...","visibleFacts":["..."],"strengths":["..."],"limitations":["..."]}\\n\\n' +
                        "Regeln:\\n" +
                        "- room: maximal 5 W\u00f6rter, nur sicher sichtbarer Raum oder Bereich.\\n" +
                        "- condition: maximal 10 W\u00f6rter, vorsichtig und neutral.\\n" +
                        "- visibleFacts: maximal 5 Eintr\u00e4ge mit je maximal 5 W\u00f6rtern.\\n" +
                        "- strengths: maximal 2 eindeutig sichtbare Vorteile.\\n" +
                        "- limitations: maximal 2 unklare oder nicht beurteilbare Punkte.\\n" +
                        "- Keine unbelegten Aussagen wie hochwertig, renoviert oder neuwertig.\\n" +
                        "- Innenr\u00e4ume niemals mit Balkon, Terrasse oder Aussenbereich verwechseln.",
                    },
                    {
                      type:
                        "image_url",
                      image_url: {
                        url:
                          "data:" +
                          image.type +
                          ";base64," +
                          base64Image,
                        detail:
                          "low",
                      },
                    },
                  ],
                },
              ],
            });

          const rawContent =
            response.choices[0]
              ?.message?.content
              ?.trim();

          if (!rawContent) {
            throw new Error(
              "Die AI hat keine Bildanalyse zur\u00fcckgegeben."
            );
          }

          const firstBrace =
            rawContent.indexOf("{");

          const lastBrace =
            rawContent.lastIndexOf("}");

          const jsonContent =
            firstBrace >= 0 &&
            lastBrace > firstBrace
              ? rawContent.slice(
                  firstBrace,
                  lastBrace + 1
                )
              : rawContent;

          let parsed: {
            room?: unknown;
            condition?: unknown;
            visibleFacts?: unknown;
            strengths?: unknown;
            limitations?: unknown;
          };

          try {
            parsed =
              JSON.parse(jsonContent);
          } catch {
            throw new Error(
              "Die AI-Bildanalyse hatte kein g\u00fcltiges JSON-Format."
            );
          }

          function cleanText(
            value: unknown,
            fallback: string
          ) {
            return typeof value ===
              "string" &&
              value.trim()
              ? value.trim()
              : fallback;
          }

          function cleanList(
            value: unknown,
            maximum: number
          ) {
            if (!Array.isArray(value)) {
              return [];
            }

            return value
              .filter(
                (
                  item
                ): item is string =>
                  typeof item ===
                  "string" &&
                  item.trim().length > 0
              )
              .map((item) =>
                item.trim()
              )
              .slice(0, maximum);
          }

          const room =
            cleanText(
              parsed.room,
              "Nicht eindeutig bestimmbar"
            );

          const condition =
            cleanText(
              parsed.condition,
              "Nur eingeschr\u00e4nkt beurteilbar"
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

          const analysis = [
            "Raum oder Bereich: " +
              room,
            "Sichtbare Elemente: " +
              (
                visibleFacts.length > 0
                  ? visibleFacts.join(", ")
                  : "Keine sicheren Details"
              ),
            "Zustand und Eindruck: " +
              condition,
            "Vermarktungsrelevante St\u00e4rken: " +
              (
                strengths.length > 0
                  ? strengths.join(", ")
                  : "Keine eindeutig belegten St\u00e4rken"
              ),
            "Hinweise und Einschr\u00e4nkungen: " +
              (
                limitations.length > 0
                  ? limitations.join(", ")
                  : "Keine besonderen Einschr\u00e4nkungen"
              ),
          ].join("\\n\\n");

          return analysis;
        },
        onMetric: (metric) => {
          console.info(
            "[Inserat-AI Ultra Speed] Bildanalyse",
            {
              cacheHit:
                metric.cacheHit,
              deduplicated:
                metric.deduplicated,
              durationMs:
                metric.durationMs,
              imageHash:
                imageHash.slice(0, 12),
            }
          );
        },
      });

    return NextResponse.json({
      success:
        true,
      analysis:
        ultraSpeedTask.value,
      ultraSpeed: {
        active:
          true,
        cacheHit:
          ultraSpeedTask.metric
            .cacheHit,
        deduplicated:
          ultraSpeedTask.metric
            .deduplicated,
        durationMs:
          ultraSpeedTask.metric
            .durationMs,
        totalDurationMs:
          Date.now() -
          analysisStartedAt,
      },
    });
  } catch (error) {
    console.error("ANALYZE IMAGE API ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler bei der Bildanalyse.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}