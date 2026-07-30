import { createHmac } from "node:crypto";

import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

type AppLocale = "de" | "it" | "fr" | "en";

type RoomType =
  | "livingRoom"
  | "bedroom"
  | "office"
  | "diningRoom"
  | "kidsRoom"
  | "bathroom"
  | "kitchen"
  | "hallway"
  | "utilityRoom";

type DetectedRoomType = RoomType | "other";

type DetectRoomBody = {
  listingId?: unknown;
  sourceImageId?: unknown;
};

type DetectionResult = {
  roomType: DetectedRoomType;
  confidence: number;
  fixedUse: boolean;
  source: "analysis" | "vision";
};

type DetectionTokenPayload = {
  userId: string;
  listingId: string;
  sourceImageId: string;
  roomType: DetectedRoomType;
  fixedUse: boolean;
  expiresAt: number;
};

const DETECTION_MESSAGES = {
  de: {
    login: "Bitte zuerst einloggen.",
    pro: "Die automatische Raumerkennung ist im Pro-Plan enthalten.",
    notConfigured: "Die Raumerkennung ist momentan nicht konfiguriert.",
    required: "Objekt und Ausgangsbild sind erforderlich.",
    listingNotFound: "Das Objekt wurde nicht gefunden.",
    imageNotFound: "Das gewählte Ausgangsbild wurde nicht gefunden.",
    failed: "Die tatsächliche Raumart konnte nicht erkannt werden.",
  },
  it: {
    login: "Effettua prima l’accesso.",
    pro: "Il riconoscimento automatico dell’ambiente è incluso nel piano Pro.",
    notConfigured: "Il riconoscimento dell’ambiente non è momentaneamente configurato.",
    required: "Immobile e immagine originale sono obbligatori.",
    listingNotFound: "L’immobile non è stato trovato.",
    imageNotFound: "L’immagine originale selezionata non è stata trovata.",
    failed: "Non è stato possibile riconoscere il tipo di ambiente reale.",
  },
  fr: {
    login: "Veuillez d’abord vous connecter.",
    pro: "La détection automatique de la pièce est incluse dans l’offre Pro.",
    notConfigured: "La détection de la pièce n’est pas configurée actuellement.",
    required: "Le bien et l’image source sont requis.",
    listingNotFound: "Le bien n’a pas été trouvé.",
    imageNotFound: "L’image source sélectionnée n’a pas été trouvée.",
    failed: "Le type de pièce réel n’a pas pu être reconnu.",
  },
  en: {
    login: "Please sign in first.",
    pro: "Automatic room detection is included in the Pro plan.",
    notConfigured: "Room detection is not currently configured.",
    required: "Property and source image are required.",
    listingNotFound: "The property was not found.",
    imageNotFound: "The selected source image was not found.",
    failed: "The actual room type could not be detected.",
  },
} satisfies Record<AppLocale, Record<string, string>>;

const ROOM_TYPES = new Set<DetectedRoomType>([
  "livingRoom",
  "bedroom",
  "office",
  "diningRoom",
  "kidsRoom",
  "bathroom",
  "kitchen",
  "hallway",
  "utilityRoom",
  "other",
]);

const FIXED_USE_ROOM_TYPES = new Set<DetectedRoomType>([
  "bathroom",
  "kitchen",
  "hallway",
  "utilityRoom",
]);

type DetectionCacheEntry = {
  result: DetectionResult;
  expiresAt: number;
};

const DETECTION_CACHE_TTL_MS =
  30 * 60 * 1000;
const DETECTION_CACHE_MAX_ENTRIES = 100;
const detectionCache = new Map<
  string,
  DetectionCacheEntry
>();

function getCachedDetection(
  key: string
): DetectionResult | null {
  const cached = detectionCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    detectionCache.delete(key);
    return null;
  }

  detectionCache.delete(key);
  detectionCache.set(key, cached);

  return cached.result;
}

function cacheDetection(
  key: string,
  result: DetectionResult
): void {
  detectionCache.set(key, {
    result,
    expiresAt:
      Date.now() + DETECTION_CACHE_TTL_MS,
  });

  while (
    detectionCache.size >
    DETECTION_CACHE_MAX_ENTRIES
  ) {
    const oldestKey =
      detectionCache.keys().next().value;

    if (typeof oldestKey !== "string") {
      break;
    }

    detectionCache.delete(oldestKey);
  }
}

function normalizeLocale(value: unknown): AppLocale {
  return value === "it" || value === "fr" || value === "en"
    ? value
    : "de";
}

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAnalysisText(value: string): string {
  return value
    .toLocaleLowerCase("de-CH")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectRoomFromAnalysis(
  analysis: string | null
): DetectedRoomType | null {
  if (!analysis) {
    return null;
  }

  const lines = analysis
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const roomLine =
    lines.find((line) =>
      /^(raum oder bereich|room or area|piece ou zone|locale o area)\s*:/i.test(
        line
      )
    ) || lines[0] || analysis.slice(0, 500);

  const text = normalizeAnalysisText(roomLine);

  const rules: Array<{
    roomType: DetectedRoomType;
    patterns: RegExp[];
  }> = [
    {
      roomType: "bathroom",
      patterns: [
        /\bbadezimmer\b/,
        /\bbad\b/,
        /\bbathroom\b/,
        /\bbagno\b/,
        /\bsalle de bain\b/,
        /\bdusche\b/,
        /\bdoccia\b/,
        /\bshower\b/,
        /\bbadewanne\b/,
        /\bvasca\b/,
        /\bbathtub\b/,
        /\btoilette\b/,
        /\btoilet\b/,
        /\bwc\b/,
      ],
    },
    {
      roomType: "kitchen",
      patterns: [
        /\bkuche\b/,
        /\bkitchen\b/,
        /\bcucina\b/,
        /\bcuisine\b/,
        /\bkochbereich\b/,
      ],
    },
    {
      roomType: "hallway",
      patterns: [
        /\bflur\b/,
        /\bkorridor\b/,
        /\beingangsbereich\b/,
        /\bhallway\b/,
        /\bcorridor\b/,
        /\beingang\b/,
        /\bingresso\b/,
        /\bcouloir\b/,
        /\bentree\b/,
      ],
    },
    {
      roomType: "utilityRoom",
      patterns: [
        /\bwaschkuche\b/,
        /\bwaschraum\b/,
        /\bhauswirtschaftsraum\b/,
        /\butility room\b/,
        /\blaundry room\b/,
        /\blavanderia\b/,
        /\bbuanderie\b/,
      ],
    },
    {
      roomType: "bedroom",
      patterns: [
        /\bschlafzimmer\b/,
        /\bbedroom\b/,
        /\bcamera da letto\b/,
        /\bchambre\b/,
      ],
    },
    {
      roomType: "kidsRoom",
      patterns: [
        /\bkinderzimmer\b/,
        /\bchildren'?s room\b/,
        /\bkids room\b/,
        /\bcamera dei bambini\b/,
        /\bchambre d.?enfant\b/,
      ],
    },
    {
      roomType: "office",
      patterns: [
        /\bburo\b/,
        /\barbeitszimmer\b/,
        /\boffice\b/,
        /\bhome office\b/,
        /\bufficio\b/,
        /\bbureau\b/,
      ],
    },
    {
      roomType: "diningRoom",
      patterns: [
        /\besszimmer\b/,
        /\bdining room\b/,
        /\bsala da pranzo\b/,
        /\bsalle a manger\b/,
      ],
    },
    {
      roomType: "livingRoom",
      patterns: [
        /\bwohnzimmer\b/,
        /\bwohnbereich\b/,
        /\bliving room\b/,
        /\bsoggiorno\b/,
        /\bsejour\b/,
        /\bsalon\b/,
      ],
    },
  ];

  for (const rule of rules) {
    if (
      rule.patterns.some((pattern) =>
        pattern.test(text)
      )
    ) {
      return rule.roomType;
    }
  }

  return null;
}

function detectionSecret(): string {
  const secret =
    process.env.HOME_STAGING_DETECTION_SECRET ||
    process.env.OPENAI_API_KEY;

  if (!secret) {
    throw new Error(
      "HOME_STAGING_DETECTION_SECRET fehlt."
    );
  }

  return secret;
}

function createDetectionToken(
  payload: DetectionTokenPayload
): string {
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");

  const signature = createHmac(
    "sha256",
    detectionSecret()
  )
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function normalizeConfidence(value: unknown): number {
  const confidence = Number(value);

  if (!Number.isFinite(confidence)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, confidence));
}

async function detectRoomWithVision(
  imageUrl: string
): Promise<DetectionResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response =
    await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      max_tokens: 80,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You classify one real-estate photo by its actual visible room function. " +
            "Fixed installations have priority. A bathtub, shower, toilet or washbasin means bathroom. " +
            "Kitchen cabinets, a cooker or a kitchen sink mean kitchen. " +
            "Never infer the desired furnishing category. Return JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Return exactly this JSON shape: " +
                '{"roomType":"bathroom","confidence":0.99}. ' +
                "Allowed roomType values: livingRoom, bedroom, office, diningRoom, kidsRoom, bathroom, kitchen, hallway, utilityRoom, other.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

  const content =
    response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(
      "Die AI hat keine Raumerkennung zurückgegeben."
    );
  }

  let parsed: {
    roomType?: unknown;
    confidence?: unknown;
  };

  try {
    parsed = JSON.parse(content) as {
      roomType?: unknown;
      confidence?: unknown;
    };
  } catch {
    throw new Error(
      "Die AI hat eine ungültige Raumerkennung zurückgegeben."
    );
  }

  const roomType =
    typeof parsed.roomType === "string" &&
    ROOM_TYPES.has(
      parsed.roomType as DetectedRoomType
    )
      ? (parsed.roomType as DetectedRoomType)
      : "other";

  return {
    roomType,
    confidence: normalizeConfidence(
      parsed.confidence
    ),
    fixedUse:
      FIXED_USE_ROOM_TYPES.has(roomType),
    source: "vision",
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const locale = normalizeLocale(
    request.nextUrl.searchParams.get("locale")
  );
  const messages = DETECTION_MESSAGES[locale];

  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: messages.login,
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
          error: messages.pro,
        },
        { status: 403 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: messages.notConfigured,
        },
        { status: 500 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as DetectRoomBody | null;

    const listingId = requiredText(
      body?.listingId
    );
    const sourceImageId = requiredText(
      body?.sourceImageId
    );

    if (!listingId || !sourceImageId) {
      return NextResponse.json(
        {
          success: false,
          error: messages.required,
        },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        userId: user.id,
      },
      select: {
        id: true,
        images: {
          where: {
            id: sourceImageId,
          },
          select: {
            id: true,
            url: true,
            analysis: true,
          },
          take: 1,
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error: messages.listingNotFound,
        },
        { status: 404 }
      );
    }

    const sourceImage = listing.images[0];

    if (!sourceImage) {
      return NextResponse.json(
        {
          success: false,
          error: messages.imageNotFound,
        },
        { status: 404 }
      );
    }

    const detectionCacheKey = [
      sourceImage.id,
      sourceImage.url,
      sourceImage.analysis || "",
    ].join(":");

    const cachedDetection =
      getCachedDetection(
        detectionCacheKey
      );

    const analysisRoom =
      cachedDetection
        ? null
        : detectRoomFromAnalysis(
            sourceImage.analysis
          );

    const detection: DetectionResult =
      cachedDetection ||
      (analysisRoom
        ? {
            roomType: analysisRoom,
            confidence: 0.98,
            fixedUse:
              FIXED_USE_ROOM_TYPES.has(
                analysisRoom
              ),
            source: "analysis",
          }
        : await detectRoomWithVision(
            sourceImage.url
          ));

    if (!cachedDetection) {
      cacheDetection(
        detectionCacheKey,
        detection
      );
    }

    const token = createDetectionToken({
      userId: user.id,
      listingId: listing.id,
      sourceImageId: sourceImage.id,
      roomType: detection.roomType,
      fixedUse: detection.fixedUse,
      expiresAt:
        Date.now() + 30 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      ...detection,
      token,
    });
  } catch (error) {
    console.error(
      "HOME-STAGING ROOM DETECTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: messages.failed,
        details:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
