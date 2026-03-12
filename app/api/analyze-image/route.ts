import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return Response.json({ error: "Kein Bild gefunden." }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Du analysierst Immobilienfotos für Immobilienmakler. Beschreibe kurz und professionell, was auf dem Bild zu sehen ist, welche Merkmale erkennbar sind und welche verkaufsstarken Punkte sich daraus für ein Inserat ableiten lassen. Antworte auf Deutsch in 3 bis 5 klaren Sätzen.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analysiere dieses Immobilienfoto für ein Verkaufsinserat.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    const analysis = response.choices[0]?.message?.content || "";

    return Response.json({ analysis });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Fehler bei der Bildanalyse." },
      { status: 500 }
    );
  }
}