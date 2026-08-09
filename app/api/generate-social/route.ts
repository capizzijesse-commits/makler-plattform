import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { canUseListingCoreForUser } from "@/lib/listing-access";
import { getAuthenticatedUser } from "@/lib/session";

type SocialVariant = {
  title: string;
  text: string;
};

type SocialResponse = {
  variants: SocialVariant[];
};

function cleanValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function locationTag(location: string) {
  return location.replaceAll(" ", "").replaceAll("-", "");
}

function fallbackPosts(data: {
  location: string;
  propertyType: string;
  rooms: string;
  livingArea: string;
  price: string;
  highlights: string;
  styleText: string;
  imageAnalysis: string;
}): SocialVariant[] {
  const {
    location,
    propertyType,
    rooms,
    livingArea,
    price,
    highlights,
    styleText,
    imageAnalysis,
  } = data;

  const tag = locationTag(location);
  const priceLine = price ? `Der Richtpreis liegt bei CHF ${price}.` : "";
  const highlightLine = highlights
    ? `Besonders hervorzuheben sind ${highlights}.`
    : "Besonders hervorzuheben sind die attraktive Lage, die angenehme Raumwirkung und das stimmige Gesamtbild.";
  const imageLine = imageAnalysis
    ? `Die hochgeladenen Objektbilder wurden bei der Formulierung berücksichtigt.`
    : "";

  return [
    {
      title: "Instagram Variante 1",
      text: `🏡 Stilvoll wohnen in ${location}

Diese ${rooms}-Zimmer-${propertyType} mit ca. ${livingArea} m² Wohnfläche verbindet Wohnkomfort, Lagequalität und eine moderne Präsentation zu einem überzeugenden Gesamtpaket.

${highlightLine}

Der Stil wirkt ${styleText} und schafft bereits auf den ersten Blick eine hochwertige Wohnatmosphäre. ${priceLine}

${imageLine}

Wer ein Zuhause sucht, das nicht nur praktisch ist, sondern auch emotional überzeugt, sollte dieses Objekt genauer ansehen.

📩 Jetzt Kontakt aufnehmen und Besichtigung vereinbaren.

#ImmobilienSchweiz #${tag} #Immobilien #Wohnen #Zuhause #Wohntraum #RealEstate #Immobilienmakler`,
    },
    {
      title: "Instagram Variante 2",
      text: `✨ Neues Zuhause gesucht?

Diese ${propertyType} in ${location} bietet eine starke Kombination aus Raum, Lage und Wohngefühl. Mit ${rooms} Zimmern und ca. ${livingArea} m² Wohnfläche eignet sich das Objekt ideal für Interessenten, die Wert auf Qualität und eine ansprechende Umgebung legen.

${highlightLine}

Der Gesamteindruck ist ${styleText}, wodurch die Immobilie modern, einladend und hochwertig wirkt. ${priceLine}

📲 Interesse geweckt? Jetzt weitere Informationen anfragen oder direkt eine Besichtigung vereinbaren.

#Immobilien #${tag} #SchweizerImmobilien #WohnenInDerSchweiz #Immobilienangebot #ZuhauseFinden #Wohnqualität`,
    },
    {
      title: "Instagram Variante 3",
      text: `🏠 Immobilienvermarktung lebt von Emotionen – und genau diese Immobilie bringt sie mit.

Diese ${rooms}-Zimmer-${propertyType} in ${location} überzeugt mit ca. ${livingArea} m² Wohnfläche, einem ${styleText}en Stil und mehreren Details, die den Wohnalltag besonders angenehm machen.

${highlightLine}

Ob als neues Zuhause oder als spannende Immobilienchance: Dieses Objekt verdient Aufmerksamkeit und eine hochwertige Präsentation.

📩 Jetzt mehr erfahren und Besichtigung anfragen.

#Immobilienmarketing #${tag} #ImmobilienSchweiz #RealEstateSwitzerland #Wohntraum #Immobilienmakler #Property`,
    },

    {
      title: "Facebook Variante 1",
      text: `Diese Immobilie in ${location} bietet eine attraktive Möglichkeit für alle, die Wert auf Wohnqualität, eine gute Lage und ein stimmiges Gesamtbild legen.

Es handelt sich um eine ${rooms}-Zimmer-${propertyType} mit ca. ${livingArea} m² Wohnfläche. Der Stil wirkt ${styleText} und vermittelt bereits beim ersten Eindruck eine angenehme, hochwertige Wohnatmosphäre.

${highlightLine}

${priceLine}

Gerade bei der Immobiliensuche zählen nicht nur Zahlen und Fakten. Entscheidend ist auch das Gefühl: Passt die Raumaufteilung? Wirkt die Lage praktisch? Gibt es Details, die den Alltag einfacher und angenehmer machen?

Diese Immobilie bringt viele dieser Punkte zusammen und eignet sich für Interessenten, die ein Objekt mit Charakter und Qualität suchen.

Gerne stellen wir weitere Informationen zur Verfügung oder vereinbaren eine Besichtigung.

#Immobilien #ImmobilienSchweiz #${tag} #Wohnen #Immobilienangebot #Besichtigung #Zuhause`,
    },
    {
      title: "Facebook Variante 2",
      text: `Ein neues Zuhause sollte mehr sein als nur vier Wände. Es sollte zum Leben passen, sich gut anfühlen und im Alltag überzeugen.

Diese ${propertyType} in ${location} bietet dafür eine starke Grundlage. Mit ${rooms} Zimmern, ca. ${livingArea} m² Wohnfläche und einem ${styleText}en Erscheinungsbild präsentiert sich das Objekt als spannende Möglichkeit für Käuferinnen und Käufer oder Mietinteressenten.

${highlightLine}

${priceLine}

Die Kombination aus Lage, Raumangebot und Präsentation macht dieses Objekt besonders interessant. Wer aktuell in ${location} sucht, sollte hier genauer hinschauen.

Kontaktieren Sie uns gerne für weitere Informationen oder einen persönlichen Besichtigungstermin.

#Immobilienangebot #Immobilienmakler #Schweiz #${tag} #Wohntraum #RealEstate #Immobiliensuche`,
    },
    {
      title: "Facebook Variante 3",
      text: `Immobilie in ${location}: Diese ${rooms}-Zimmer-${propertyType} überzeugt durch eine professionelle Gesamtwirkung, ca. ${livingArea} m² Wohnfläche und mehrere Highlights, die das Objekt besonders machen.

${highlightLine}

Der Stil der Immobilie wirkt ${styleText}. Dadurch entsteht eine moderne, angenehme und einladende Präsentation, die sowohl online als auch bei einer Besichtigung überzeugt.

${priceLine}

Wer eine Immobilie sucht, die praktische Eigenschaften mit emotionaler Wirkung verbindet, sollte dieses Angebot nicht verpassen.

Jetzt Kontakt aufnehmen und weitere Informationen erhalten.

#Immobilien #ImmobilienSchweiz #${tag} #Wohnen #Besichtigung #Immobilienmarketing #Property`,
    },

    {
      title: "LinkedIn Variante 1",
      text: `Professionelle Immobilienvermarktung beginnt mit einer klaren, hochwertigen und zielgruppengerechten Präsentation.

Diese ${rooms}-Zimmer-${propertyType} in ${location} zeigt, wie wichtig eine starke Objektbeschreibung und eine wirkungsvolle Darstellung für die Vermarktung sind. Mit ca. ${livingArea} m² Wohnfläche, einem ${styleText}en Gesamteindruck und relevanten Highlights bietet das Objekt eine überzeugende Grundlage für eine erfolgreiche Positionierung.

${highlightLine}

${priceLine}

Für Immobilienmakler, Eigentümer und Investoren ist entscheidend, dass ein Objekt nicht nur sachlich beschrieben wird, sondern auch emotional greifbar wird. Interessenten möchten schnell verstehen, welchen Mehrwert eine Immobilie bietet und warum sich der nächste Schritt lohnt.

Dieses Objekt verbindet Wohnqualität, Lage und Präsentation zu einem stimmigen Gesamtbild.

#Immobilien #Immobilienmarketing #RealEstate #Schweiz #${tag} #Immobilienmakler #PropertyMarketing`,
    },
    {
      title: "LinkedIn Variante 2",
      text: `In der heutigen Immobilienvermarktung entscheidet oft der erste digitale Eindruck darüber, ob ein Objekt Aufmerksamkeit erhält.

Diese ${propertyType} in ${location} bietet dafür eine starke Basis: ${rooms} Zimmer, ca. ${livingArea} m² Wohnfläche, ein ${styleText}er Stil und mehrere relevante Objektmerkmale, die für Interessenten klar kommuniziert werden können.

${highlightLine}

${priceLine}

Besonders in einem anspruchsvollen Immobilienmarkt ist es wichtig, die Stärken eines Objekts strukturiert, verständlich und hochwertig zu präsentieren. Gute Texte schaffen Vertrauen, wecken Interesse und erhöhen die Wahrscheinlichkeit, dass potenzielle Käufer oder Mieter den nächsten Schritt machen.

#RealEstateSwitzerland #ImmobilienSchweiz #Immobilienvermarktung #${tag} #PropertyMarketing #Makler`,
    },
    {
      title: "LinkedIn Variante 3",
      text: `Immobilien erfolgreich zu vermarkten bedeutet, die richtigen Informationen mit der richtigen Wirkung zu verbinden.

Bei dieser ${rooms}-Zimmer-${propertyType} in ${location} stehen nicht nur die Eckdaten im Vordergrund, sondern auch der Gesamteindruck: ca. ${livingArea} m² Wohnfläche, ein ${styleText}er Stil und Highlights, die das Objekt für Interessenten besonders attraktiv machen.

${highlightLine}

${priceLine}

Eine professionelle Präsentation hilft dabei, die Qualität einer Immobilie schneller sichtbar zu machen. Gerade für Makler, Eigentümer und Investoren ist es entscheidend, dass ein Objekt nicht austauschbar wirkt, sondern klar positioniert wird.

#Immobilien #RealEstate #Immobilienmarketing #Schweiz #${tag} #Property #Immobilienmakler`,
    },

   {
  title: "X Variante 1",
  text: `🏡 ${rooms}-Zimmer-${propertyType} in ${location}: ca. ${livingArea} m², ${styleText} und Highlights wie ${highlights || "attraktive Lage und gute Raumaufteilung"}. Ein Objekt mit Wohnqualität und starkem ersten Eindruck. Jetzt mehr erfahren. #Immobilien #${tag}`,
},
{
  title: "X Variante 2",
  text: `Neue Immobilie in ${location}: ${rooms} Zimmer, ca. ${livingArea} m² und ein hochwertiger Gesamteindruck. Ideal für alle, die Lage, Wohnkomfort und eine ansprechende Präsentation verbinden möchten. Jetzt Besichtigung anfragen. #ImmobilienSchweiz #RealEstate`,
},
{
  title: "X Variante 3",
  text: `✨ Objekt im Fokus: ${propertyType} in ${location} mit ca. ${livingArea} m², ${rooms} Zimmern und starken Highlights. Wer ein Zuhause mit Qualität und Ausstrahlung sucht, sollte dieses Angebot genauer ansehen. #Immobilien #Wohnen #${tag}`,
},
  ];
}

function normalizeVariants(rawVariants: unknown): SocialVariant[] {
  if (!Array.isArray(rawVariants)) return [];

  return rawVariants
    .filter((item) => {
      return (
        item &&
        typeof item === "object" &&
        typeof (item as SocialVariant).title === "string" &&
        typeof (item as SocialVariant).text === "string"
      );
    })
    .map((item) => ({
      title: (item as SocialVariant).title,
      text: (item as SocialVariant).text,
    }));
}

function extractJson(content: string): SocialResponse | null {
  try {
    return JSON.parse(content) as SocialResponse;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) return null;

    try {
      return JSON.parse(match[0]) as SocialResponse;
    } catch {
      return null;
    }
  }
}

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

    const body = await request.json();

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    const hasListingAccess =
      await canUseListingCoreForUser({
        userId: user.id,
        plan: user.plan,
        listingId,
      });

    if (!hasListingAccess) {
      return NextResponse.json(
        {
          error:
            "Social-Media-Texte sind für dieses Objekt erst nach der Freischaltung verfügbar.",
          code: "LISTING_PAYMENT_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    const location = cleanValue(body.location, "Winterthur");
    const propertyType = cleanValue(body.propertyType, "Wohnung");
    const rooms = cleanValue(body.rooms, "4.5");
    const livingArea = cleanValue(body.livingArea, "120");
    const price = cleanValue(body.price, "");
    const highlights = cleanValue(body.highlights, "");
    const styleText = cleanValue(body.styleText, "hochwertig und modern");
    const imageAnalysis = cleanValue(body.imageAnalysis, "");

    const fallbackData = {
      location,
      propertyType,
      rooms,
      livingArea,
      price,
      highlights,
      styleText,
      imageAnalysis,
    };

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        variants: fallbackPosts(fallbackData),
      });
    }


    /*
     * =======================================================
     * INSERAT-AI SOCIAL SPEED + QUALITY V1
     *
     * Statt einem riesigen Request mit 12 langen Posts
     * werden vier unabhängige Plattformen parallel erzeugt.
     * =======================================================
     */

    const generationStartedAt =
      Date.now();

    const platformConfigs = [
      {
        platform:
          "Instagram",

        lengthRule:
          "420 bis 650 Zeichen inklusive Hashtags",

        hashtagRule:
          "4 bis 6 gezielte Hashtags",

        styleRule:
          "Visuell und emotional, aber seriös. Starker erster Satz, kurze Absätze, maximal 2 passende Emojis. Fokus auf Wohngefühl und konkrete Objektmerkmale.",
      },

      {
        platform:
          "Facebook",

        lengthRule:
          "500 bis 750 Zeichen inklusive Hashtags",

        hashtagRule:
          "2 bis 4 gezielte Hashtags",

        styleRule:
          "Nahbar, informativ und lokal verständlich. Mehr Kontext als Instagram, klare Eckdaten und natürlicher Besichtigungs-CTA.",
      },

      {
        platform:
          "LinkedIn",

        lengthRule:
          "550 bis 800 Zeichen inklusive Hashtags",

        hashtagRule:
          "2 bis 4 professionelle Hashtags",

        styleRule:
          "Professionell, präzise und hochwertig. Keine Instagram-Sprache. Fokus auf Objektpositionierung, relevante Merkmale und sachlich überzeugende Vermarktung.",
      },

      {
        platform:
          "X",

        lengthRule:
          "180 bis maximal 270 Zeichen inklusive Hashtags",

        hashtagRule:
          "1 bis 2 relevante Hashtags",

        styleRule:
          "Sehr kompakt. Ein klarer Hook, 1 bis 2 starke belegte Eckdaten und ein kurzer CTA. Keine Füllsätze.",
      },
    ] as const;


    function fallbackForPlatform(
      platform: string
    ) {
      return fallbackPosts(
        fallbackData
      )
        .filter(
          (variant) =>
            variant.title.startsWith(
              platform +
                " Variante"
            )
        )
        .slice(
          0,
          3
        );
    }


    async function generatePlatform(
      config:
        (typeof platformConfigs)[number]
    ) {
      const platformStartedAt =
        Date.now();

      /*
       * Gemeinsame Faktenbasis.
       * Keine weiteren Informationen
       * dürfen erfunden werden.
       */
      const facts = [
        "Ort: " +
          location,

        "Objektart: " +
          propertyType,

        "Zimmer: " +
          rooms,

        "Wohnfläche: " +
          livingArea +
          " m²",

        "Preis: " +
          (
            price
              ? "CHF " +
                price
              : "nicht angegeben"
          ),

        "Highlights: " +
          (
            highlights ||
            "keine zusätzlichen Highlights angegeben"
          ),

        "Stil: " +
          styleText,

        "Verfügbare Bildinformationen: " +
          (
            imageAnalysis ||
            "keine konkrete Bildanalyse vorhanden"
          ),
      ].join("\n");


      const platformPrompt = [
        "Erstelle GENAU 3 unterschiedliche Social-Media-Posts für " +
          config.platform +
          ".",

        "",

        "OBJEKTDATEN:",
        facts,

        "",

        "PLATTFORM:",
        config.styleRule,

        "",

        "LÄNGE:",
        config.lengthRule,

        "",

        "HASHTAGS:",
        config.hashtagRule,

        "",

        "DIE DREI VARIANTEN MÜSSEN KLAR UNTERSCHIEDLICH SEIN:",

        "Variante 1: Einstieg über das stärkste konkrete Objektmerkmal.",

        "Variante 2: Einstieg über Nutzung oder Wohngefühl, aber nur auf Basis belegter Fakten.",

        "Variante 3: Moderner, direkter Vermarktungswinkel mit konkretem Call-to-Action.",

        "",

        "VERBINDLICHE QUALITÄTSREGELN:",

        "- Verwende ausschliesslich die angegebenen Fakten.",

        "- Keine erfundenen Eigenschaften, Distanzen, Schulen, Aussicht, Garten, Balkon, Materialien oder Lagevorteile.",

        "- Bildinformationen dürfen nur verwendet werden, wenn sie oben konkret genannt sind.",

        "- Erwähne niemals die Begriffe Bildanalyse, AI oder künstliche Intelligenz im Post.",

        "- Vermeide leere Maklerfloskeln.",

        "- Verbotene Formulierungen sind insbesondere: Traumhaus, Wohntraum, lässt keine Wünsche offen, alles was Sie brauchen, einzigartiges Juwel, wunderschön, perfekte Lage, Oase.",

        "- Verwende konkrete Objektmerkmale statt Superlativen.",

        "- Keine künstliche Dringlichkeit wie nur heute oder letzte Chance.",

        "- Preis nur erwähnen, wenn tatsächlich ein Preis angegeben wurde.",

        "- Schweizer Standarddeutsch verwenden und kein ß.",

        "- CTA natürlich formulieren, zum Beispiel: Mehr erfahren, Unterlagen anfordern oder Besichtigung anfragen.",

        "- Die drei Varianten dürfen weder denselben Einstieg noch denselben CTA kopieren.",

        "- Hashtags nicht als generische Hashtag-Wand schreiben.",

        "- Jeder Text muss direkt veröffentlichbar wirken.",

        "",

        "Gib ausschliesslich das geforderte JSON zurück.",
      ].join("\n");


      try {
        const openAiResponse =
          await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  "Bearer " +
                  apiKey,

                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  model:
                    "gpt-4o-mini",

                  temperature:
                    0.55,

                  response_format: {
                    type:
                      "json_schema",

                    json_schema: {
                      name:
                        "social_variants",

                      strict:
                        true,

                      schema: {
                        type:
                          "object",

                        properties: {
                          variants: {
                            type:
                              "array",

                            items: {
                              type:
                                "object",

                              properties: {
                                title: {
                                  type:
                                    "string",
                                },

                                text: {
                                  type:
                                    "string",
                                },
                              },

                              required: [
                                "title",
                                "text",
                              ],

                              additionalProperties:
                                false,
                            },
                          },
                        },

                        required: [
                          "variants",
                        ],

                        additionalProperties:
                          false,
                      },
                    },
                  },

                  messages: [
                    {
                      role:
                        "system",

                      content:
                        "Du bist der Social-Media-Redaktor von Inserat-AI für den Schweizer Immobilienmarkt. Schreibe faktenbasiert, professionell, plattformspezifisch und ohne austauschbare Maklerfloskeln.",
                    },

                    {
                      role:
                        "user",

                      content:
                        platformPrompt,
                    },
                  ],
                }),
            }
          );


        if (
          !openAiResponse.ok
        ) {
          throw new Error(
            "OPENAI_SOCIAL_" +
              config.platform.toUpperCase() +
              "_" +
              openAiResponse.status
          );
        }


        const openAiData =
          await openAiResponse.json();

        const content =
          openAiData
            ?.choices?.[0]
            ?.message
            ?.content;


        if (
          typeof content !==
          "string"
        ) {
          throw new Error(
            "OPENAI_SOCIAL_EMPTY_" +
              config.platform.toUpperCase()
          );
        }


        const parsed =
          extractJson(
            content
          );

        const normalized =
          normalizeVariants(
            parsed?.variants
          )
            .slice(
              0,
              3
            )
            .map(
              (
                variant,
                index
              ) => ({
                /*
                 * Titel kontrollieren wir selbst.
                 * Dadurch bleibt die UI stabil.
                 */
                title:
                  config.platform +
                  " Variante " +
                  (
                    index +
                    1
                  ),

                text:
                  variant.text.trim(),
              })
            )
            .filter(
              (variant) =>
                variant.text.length >
                0
            );


        if (
          normalized.length !==
          3
        ) {
          throw new Error(
            "OPENAI_SOCIAL_VARIANT_COUNT_" +
              config.platform.toUpperCase()
          );
        }


        return {
          platform:
            config.platform,

          variants:
            normalized,

          fallback:
            false,

          durationMs:
            Date.now() -
            platformStartedAt,
        };
      }
      catch (error) {
        console.error(
          "[generate-social:" +
            config.platform +
            "]",
          error
        );

        return {
          platform:
            config.platform,

          variants:
            fallbackForPlatform(
              config.platform
            ),

          fallback:
            true,

          durationMs:
            Date.now() -
            platformStartedAt,
        };
      }
    }


    /*
     * Alle vier Plattformen starten gleichzeitig.
     */
    const platformResults =
      await Promise.all(
        platformConfigs.map(
          (
            config
          ) =>
            generatePlatform(
              config
            )
        )
      );


    const variants =
      platformResults.flatMap(
        (
          result
        ) =>
          result.variants
      );


    /*
     * Sicherheitsnetz:
     * Die bestehende UI erwartet 12 Varianten.
     */
    if (
      variants.length !==
      12
    ) {
      console.error(
        "[generate-social] Ungültige Gesamtzahl:",
        variants.length
      );

      return NextResponse.json({
        variants:
          fallbackPosts(
            fallbackData
          ),

        generationMs:
          Date.now() -
          generationStartedAt,

        fallback:
          true,
      });
    }


    const fallbackPlatforms =
      platformResults
        .filter(
          (
            result
          ) =>
            result.fallback
        )
        .map(
          (
            result
          ) =>
            result.platform
        );


    const generationMs =
      Date.now() -
      generationStartedAt;


    console.info(
      "[generate-social]",
      {
        generationMs,

        platforms:
          platformResults.map(
            (
              result
            ) => ({
              platform:
                result.platform,

              durationMs:
                result.durationMs,

              fallback:
                result.fallback,
            })
          ),
      }
    );


    const response =
      NextResponse.json({
        variants,

        generationMs,

        fallbackPlatforms,
      });


    response.headers.set(
      "Server-Timing",
      "social;dur=" +
        generationMs
    );


    return response;

  } catch (error) {
    console.error("generate-social error:", error);

    return NextResponse.json(
      {
        error: "Social-Media-Texte konnten nicht erstellt werden.",
      },
      { status: 500 }
    );
  }
}