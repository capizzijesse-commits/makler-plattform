import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      location,
      rooms,
      livingArea,
      price,
      propertyType,
      highlights,
      styleText,
      imageAnalysis,
    } = await req.json();
    
const prompt = `
Du bist ein professioneller Schweizer Immobilien-Texter.

Erstelle 3 verschiedene hochwertige Inserat-Varianten für eine Immobilie in der Schweiz.

WICHTIG:
- Schreibe auf professionellem Makler-Niveau.
- Die Texte sollen verkaufsstark, konkret und hochwertig wirken.
- Jede Variante soll deutlich unterschiedlich formuliert sein.
- Der Beschreibungstext soll ausführlich sein, ca. 120 bis 180 Wörter.
- Keine Wiederholung von "Highlights" im Fliesstext.
- Die Highlights müssen separat zurückgegeben werden.
- Schreibe keine Platzhalter.
- Schreibe natürliches, hochwertiges Deutsch wie in echten Immobilieninseraten in der Schweiz.
- Erstelle für Instagram, LinkedIn und Facebook jeweils passende Hashtags.
- Gib die Hashtags separat in den Feldern instagramHashtags, linkedinHashtags und facebookHashtags zurück.
- Keine Hashtags im normalen Beschreibungstext.

Objektdaten:
- Ort/Lage: ${location}
- Objektart: ${propertyType}
- Zimmer: ${rooms}
- Wohnfläche: ${livingArea} m²
- Preis: ${price} CHF
- Stil: ${styleText}
- Highlights: ${highlights}
- Zusätzliche Bildanalyse: ${imageAnalysis || "Keine Bildanalyse vorhanden."}
Gib nur valides JSON zurück, ohne Einleitung, ohne Erklärung, ohne Markdown.

Format:
{
  "variants": [
    {
      "title": "Kurzer hochwertiger Titel",
      "text": "Ausführlicher Fliesstext ohne Überschrift Highlights und ohne Social-Media-Texte",
      "highlights": ["Punkt 1", "Punkt 2", "Punkt 3"],
      "cta": "Kurzer Call to Action",
      "instagramPost": "Kurzer emotionaler Instagram-Post",
      "linkedinPost": "Etwas professioneller LinkedIn-Post",
      "facebookPost": "Etwas ausführlicher Facebook-Post"
      "instagramHashtags": "#Immobilien #Zürich #Wohnung #Wohntraum",
      "linkedinHashtags": "#Immobilien #RealEstate #Zürich #Wohnen",
      "facebookHashtags": "#Immobilien #Zürich #Familienwohnung #Wohnung"
    },
   {
"title": "Titel 2",
"text": "Text 2",
"highlights": ["...", "...", "..."],
"cta": "CTA 2",
"instagramPost": "Instagram 2",
"instagramHashtags": "#Immobilien #Zürich #Wohnung",
"linkedinPost": "LinkedIn 2",
"linkedinHashtags": "#RealEstate #Zürich #Immobilien",
"facebookPost": "Facebook 2",
"facebookHashtags": "#Immobilien #Familienwohnung #Zürich"
}
    {
"title": "Titel 3",
"text": "Text 3",
"highlights": ["...", "...", "..."],
"cta": "CTA 3",
"instagramPost": "Instagram 3",
"instagramHashtags": "#Immobilien #Zürich #Wohnung",
"linkedinPost": "LinkedIn 3",
"linkedinHashtags": "#RealEstate #Zürich #Immobilien",
"facebookPost": "Facebook 3",
"facebookHashtags": "#Immobilien #Familienwohnung #Zürich"
}
  ]
}
   
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "Return only valid JSON. No markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || "";

    let json: any;

    try {
      json = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");

      if (start >= 0 && end > start) {
        json = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("Model returned non-JSON.");
      }
    }

    const normalized = {
  variants: (json?.variants ?? []).map((v: any) => ({
    title: v.title ?? "",
    objectType: v.objectType ?? propertyType ?? "",
    price: v.price ?? price ?? "",
   text: (v.body ?? v.text ?? "")
  .split(/Instagram|LinkedIn|Facebook|Highlights/i)[0]
  .trim(),

body: (v.body ?? v.text ?? "")
  .split(/Instagram|LinkedIn|Facebook|Highlights/i)[0]
  .trim(),
    highlights: v.bullets ?? v.highlights ?? [],
    bullets: v.bullets ?? v.highlights ?? [],
    cta: v.cta ?? "",
    instagramPost: v.instagramPost ?? "",
    linkedinPost: v.linkedinPost ?? "",
    facebookPost: v.facebookPost ?? "",
  })),
};

    return Response.json(normalized);
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}