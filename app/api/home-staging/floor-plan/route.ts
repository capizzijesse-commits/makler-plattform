import { NextRequest, NextResponse } from "next/server";

import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

type OpenAIOutputContent = {
  type?: unknown;
  text?: unknown;
};

type OpenAIOutputItem = {
  type?: unknown;
  content?: unknown;
};

type OpenAIResponse = {
  output?: unknown;
  error?: {
    message?: unknown;
  };
};

type FloorPlanResult = {
  summary: string;
  stagingInstructions: string;
  rooms: string[];
};

function requiredText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function extractOutputText(
  response: OpenAIResponse
): string {
  if (!Array.isArray(response.output)) {
    return "";
  }

  const textParts: string[] = [];

  for (const item of response.output) {
    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const outputItem =
      item as OpenAIOutputItem;

    if (!Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentPart of outputItem.content) {
      if (
        !contentPart ||
        typeof contentPart !== "object"
      ) {
        continue;
      }

      const part =
        contentPart as OpenAIOutputContent;

      if (
        part.type === "output_text" &&
        typeof part.text === "string"
      ) {
        textParts.push(part.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function cleanJsonText(value: string): string {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseFloorPlanResult(
  outputText: string
): FloorPlanResult {
  try {
    const parsed = JSON.parse(
      cleanJsonText(outputText)
    ) as {
      summary?: unknown;
      stagingInstructions?: unknown;
      rooms?: unknown;
    };

    const summary = requiredText(
      parsed.summary
    );

    const stagingInstructions = requiredText(
      parsed.stagingInstructions
    ).slice(0, 500);

    const rooms = Array.isArray(parsed.rooms)
      ? parsed.rooms
          .filter(
            (room): room is string =>
              typeof room === "string"
          )
          .map((room) => room.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    if (summary || stagingInstructions) {
      return {
        summary:
          summary ||
          "Der Grundriss wurde analysiert.",
        stagingInstructions:
          stagingInstructions ||
          summary.slice(0, 500),
        rooms,
      };
    }
  } catch {
    // Fallback unterhalb.
  }

  return {
    summary: outputText,
    stagingInstructions:
      outputText.slice(0, 500),
    rooms: [],
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const user =
      await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte melde dich erneut an.",
        },
        { status: 401 }
      );
    }

    const capabilities =
      getPlanCapabilities(user.plan);

    if (!capabilities.canUseHomeStaging) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Grundrissanalyse für Home Staging ist im Pro-Plan für CHF 79.90 pro Monat enthalten.",
        },
        { status: 403 }
      );
    }

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die AI-Verbindung ist nicht konfiguriert.",
        },
        { status: 500 }
      );
    }

    const formData =
      await request.formData();

    const listingId = requiredText(
      formData.get("listingId")
    );

    const fileValue =
      formData.get("file");

    if (!listingId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Objekt-ID fehlt.",
        },
        { status: 400 }
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte wähle einen Grundriss als PDF aus.",
        },
        { status: 400 }
      );
    }

    const isPdf =
      fileValue.type === "application/pdf" ||
      fileValue.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Erlaubt sind ausschliesslich PDF-Dateien.",
        },
        { status: 400 }
      );
    }

    if (
      fileValue.size <= 0 ||
      fileValue.size > MAX_PDF_SIZE_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Grundriss-PDF darf maximal 15 MB gross sein.",
        },
        { status: 400 }
      );
    }

    const listing =
      await prisma.listing.findFirst({
        where: {
          id: listingId,
          userId: user.id,
          archivedAt: null,
        },
        select: {
          id: true,
          propertyType: true,
          rooms: true,
          livingArea: true,
          location: true,
        },
      });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    const fileBuffer = Buffer.from(
      await fileValue.arrayBuffer()
    );

    const fileData =
      `data:application/pdf;base64,${fileBuffer.toString(
        "base64"
      )}`;

    const model =
      process.env.OPENAI_PDF_MODEL ||
      process.env.OPENAI_GUIDE_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-5-mini";

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          max_output_tokens: 1200,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_file",
                  filename:
                    fileValue.name ||
                    "grundriss.pdf",
                  file_data: fileData,
                },
                {
                  type: "input_text",
                  text: [
                    "Analysiere diesen Immobiliengrundriss als Unterstützung für virtuelles Home Staging.",
                    "",
                    "Bekannte Objektdaten:",
                    `Objektart: ${listing.propertyType || "nicht angegeben"}`,
                    `Zimmer: ${listing.rooms || "nicht angegeben"}`,
                    `Wohnfläche: ${listing.livingArea || "nicht angegeben"}`,
                    `Ort: ${listing.location || "nicht angegeben"}`,
                    "",
                    "Erkenne soweit lesbar:",
                    "- vorhandene Räume und ihre ungefähre Nutzung",
                    "- beschriftete Flächen oder Masse",
                    "- Türen, Fenster, Balkone und Durchgänge",
                    "- sinnvolle Möblierungs- und Laufzonen",
                    "- wichtige Einschränkungen für die Möbelplatzierung",
                    "",
                    "Erfinde keine unlesbaren Masse oder baulichen Angaben.",
                    "Kennzeichne Unsicherheiten ausdrücklich.",
                    "",
                    "Antworte ausschliesslich als gültiges JSON ohne Markdown:",
                    "{",
                    '  "summary": "verständliche deutsche Zusammenfassung",',
                    '  "stagingInstructions": "konkrete Einrichtungsanweisung mit maximal 500 Zeichen",',
                    '  "rooms": ["Raum 1", "Raum 2"]',
                    "}",
                  ].join("\n"),
                },
              ],
            },
          ],
        }),
        cache: "no-store",
      }
    );

    const openAIData =
      (await openAIResponse
        .json()
        .catch(() => ({}))) as OpenAIResponse;

    if (!openAIResponse.ok) {
      const openAIError =
        typeof openAIData.error?.message ===
        "string"
          ? openAIData.error.message
          : "";

      console.error(
        "Grundrissanalyse fehlgeschlagen:",
        openAIError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Der Grundriss konnte momentan nicht analysiert werden.",
        },
        {
          status:
            openAIResponse.status >= 400 &&
            openAIResponse.status < 600
              ? openAIResponse.status
              : 500,
        }
      );
    }

    const outputText =
      extractOutputText(openAIData);

    if (!outputText) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die AI hat keine Grundrissauswertung zurückgegeben.",
        },
        { status: 502 }
      );
    }

    const analysis =
      parseFloorPlanResult(outputText);

    return NextResponse.json({
      success: true,
      analysis,
      fileName: fileValue.name,
      model,
    });
  } catch (error) {
    console.error(
      "Fehler bei der Grundrissanalyse:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Grundriss konnte nicht verarbeitet werden.",
      },
      { status: 500 }
    );
  }
}