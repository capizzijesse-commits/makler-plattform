import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

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

    const prompt = `
Du bist ein professioneller Social-Media-Texter für Schweizer Immobilienmakler.

Erstelle GENAU 12 hochwertige Social-Media-Texte für die Vermarktung einer Immobilie.

Es sollen exakt erstellt werden:
- 3 Varianten für Instagram
- 3 Varianten für Facebook
- 3 Varianten für LinkedIn
- 3 Varianten für X / Twitter

Verwende AUSSCHLIESSLICH diese Angaben:
- Ort: ${location}
- Objektart: ${propertyType}
- Zimmer: ${rooms}
- Wohnfläche: ${livingArea} m²
- Preis: CHF ${price || "-"}
- Highlights: ${highlights || "keine"}
- Stil: ${styleText}
- Bildanalyse: ${imageAnalysis || "keine"}
Bildanalyse:
${imageAnalysis || "Keine Bildanalyse vorhanden"}

Verwende nur Merkmale, die in der Bildanalyse tatsächlich genannt werden.
Erfinde keine zusätzlichen Eigenschaften.
Nutze passende Bildmerkmale in den Beiträgen für Instagram, Facebook, LinkedIn und X.
Qualitätsanforderungen:
- Schreibe hochwertig, verkaufsstark, professionell und natürlich.
- Die Texte dürfen nicht zu kurz sein.
- Keine leeren Floskeln.
- Keine erfundenen Fakten.
- Keine falschen Versprechen.
- Verwende passende Emojis sparsam.
- Jeder Text braucht am Ende passende Hashtags.
- Verwende 5 bis 9 Hashtags pro Variante.
- Hashtags sollen zum Schweizer Immobilienmarkt, zum Standort und zur Objektart passen.
- Schreibe auf Deutsch.
- Jede Variante muss anders formuliert sein.
- Gib NUR gültiges JSON zurück, ohne Markdown und ohne Erklärung.
- X / Twitter darf kompakt sein, soll aber nicht zu kurz wirken. Schreibe X-Posts mit 220 bis maximal 280 Zeichen, mit klarem Nutzen, Call-to-Action und 2 bis 4 Hashtags.
Textlängen:
- Instagram: 700 bis 1'000 Zeichen
- Facebook: 800 bis 1'200 Zeichen
- LinkedIn: 900 bis 1'400 Zeichen
- X / Twitter: 220 bis maximal 280 Zeichen

Format:
{
  "variants": [
    { "title": "Instagram Variante 1", "text": "Text" },
    { "title": "Instagram Variante 2", "text": "Text" },
    { "title": "Instagram Variante 3", "text": "Text" },
    { "title": "Facebook Variante 1", "text": "Text" },
    { "title": "Facebook Variante 2", "text": "Text" },
    { "title": "Facebook Variante 3", "text": "Text" },
    { "title": "LinkedIn Variante 1", "text": "Text" },
    { "title": "LinkedIn Variante 2", "text": "Text" },
    { "title": "LinkedIn Variante 3", "text": "Text" },
    { "title": "X Variante 1", "text": "Text" },
    { "title": "X Variante 2", "text": "Text" },
    { "title": "X Variante 3", "text": "Text" }
  ]
}
`;

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.85,
          messages: [
            {
              role: "system",
              content:
                "Du schreibst hochwertige, seriöse und verkaufsstarke Social-Media-Texte für Schweizer Immobilienmakler.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!openAiResponse.ok) {
      return NextResponse.json({
        variants: fallbackPosts(fallbackData),
      });
    }

    const openAiData = await openAiResponse.json();
    const content = openAiData?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return NextResponse.json({
        variants: fallbackPosts(fallbackData),
      });
    }

    const parsed = extractJson(content);
    const variants = normalizeVariants(parsed?.variants);

    if (variants.length < 12) {
      return NextResponse.json({
        variants: fallbackPosts(fallbackData),
      });
    }

    return NextResponse.json({
      variants,
    });
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