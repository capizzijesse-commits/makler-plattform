import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import sharp from "sharp";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 180;

const AI_MODEL = "gpt-image-2";
const PROMPT_VERSION = "home-staging-v2-variants";
const MAX_SOURCE_IMAGE_SIZE = 10 * 1024 * 1024;

const PREVIEW_SOURCE_EDGE = 1280;
const FINAL_SOURCE_EDGE = 2048;

const PREVIEW_SOURCE_WEBP_QUALITY = 80;
const FINAL_SOURCE_WEBP_QUALITY = 92;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ROOM_TYPES = {
  livingRoom: "living room",
  bedroom: "bedroom",
  office: "home office",
  diningRoom: "dining room",
  kidsRoom: "children's room",
} as const;

const STYLES = {
  modern: `
Contemporary warm-modern interior.
Use a clearly contemporary furniture collection:
a low-profile sofa with clean straight lines,
one sculptural lounge chair, walnut or smoked-oak furniture,
subtle black metal details, warm greige and beige textiles,
one restrained contemporary artwork and refined indirect lighting.
The composition should feel architectural, urban and premium.
Avoid farmhouse, traditional, ornate, rustic or Scandinavian furniture.
`,

  scandinavian: `
Authentic Scandinavian interior with a visibly lighter and softer identity.
Use pale oak, off-white, sand, light grey, natural linen,
soft wool textiles, rounded furniture shapes and simple Nordic lamps.
Create an airy hygge atmosphere with restrained greenery
and practical, welcoming furniture.
Avoid dark luxury materials, marble, brass, heavy velvet,
glossy furniture and strong black accents.
`,

  luxurious: `
Sophisticated luxury interior with an unmistakably premium identity.
Use elegant bouclé or velvet upholstery,
travertine or marble side tables,
dark stained wood, brushed brass details,
layered textiles and sculptural designer lighting.
Add one rich but restrained accent colour such as deep olive,
burgundy, midnight blue or warm cognac.
The result must look exclusive and editorial,
not flashy, kitschy or overcrowded.
Avoid inexpensive flat-pack furniture and plain minimalist styling.
`,

  minimalist: `
Strict high-end minimalist interior with very few furnishings.
Use only essential pieces with simple geometric forms,
a calm monochrome palette, generous negative space,
hidden or visually quiet storage and almost no decoration.
Prefer one sofa or bed, one table and at most one additional chair.
Do not add clutter, decorative collections,
many cushions, several plants or unnecessary accessories.
The room must feel spacious, functional and intentionally reduced.
`,
} as const;

const VARIATION_CONCEPTS = [
  `
Create a centred conversational furniture layout.
Use balanced spacing and a clear focal point.
The main seating should face the most logical focal wall.
  `,
  `
Create an asymmetrical editorial layout.
Use one distinctive lounge chair and an offset side table.
The furniture arrangement must be visibly different from a centred layout.
  `,
  `
Create an open and flowing layout that emphasises walking space.
Keep the middle of the room visually open
and group furniture closer to the functional zones.
  `,
  `
Create a compact, efficient furniture arrangement.
Use smaller-scale furniture and maximise perceived floor area.
The room should look practical but still premium.
  `,
  `
Create a hospitality-inspired layout,
similar to an elegant boutique hotel or premium serviced apartment.
Use layered lighting and a carefully composed seating zone.
  `,
  `
Create a family-friendly layout with practical circulation.
Use durable-looking furniture, comfortable seating
and a clearly usable everyday arrangement.
  `,
  `
Create a design-led layout with one sculptural statement piece.
Keep the remaining furnishings restrained
so the new concept looks clearly different.
  `,
  `
Create a calm, symmetrical layout with matching visual weights.
Use paired elements where appropriate,
but do not duplicate the previous furniture arrangement.
  `,
  `
Create a layout focused on the window and natural light.
Orient the main furniture so the daylight and view remain unobstructed.
  `,
  `
Create a layout focused on maximum spaciousness.
Use fewer and slimmer furniture pieces
and leave larger visible areas of floor.
  `,
  `
Create a richer, layered layout with textiles,
a secondary seating element and carefully placed decoration.
Do not overcrowd the room.
  `,
  `
Create a fresh alternative concept with a different sofa or bed shape,
different table shape, different lamp design
and a noticeably different furniture placement.
  `,
] as const;

const PREVIEW_OUTPUT_SIZES = new Set([
  "720x928",
  "928x720",
  "816x816",
]);

const FINAL_OUTPUT_SIZES = new Set([
  "1024x1536",
  "1536x1024",
  "1024x1024",
]);

type RoomType = keyof typeof ROOM_TYPES;
type StagingStyle = keyof typeof STYLES;
type GenerationMode = "preview" | "final";

type GenerateHomeStagingBody = {
  listingId?: unknown;
  sourceImageId?: unknown;
  roomType?: unknown;
  style?: unknown;
  customInstructions?: unknown;
  outputSize?: unknown;
  mode?: unknown;
  variationIndex?: unknown;
};

type OpenAIImageEditResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  output_format?: string;
  quality?: string;
  size?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRoomType(value: string): value is RoomType {
  return Object.prototype.hasOwnProperty.call(
    ROOM_TYPES,
    value
  );
}

function isStagingStyle(
  value: string
): value is StagingStyle {
  return Object.prototype.hasOwnProperty.call(
    STYLES,
    value
  );
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function createStagingPrompt(
  roomType: RoomType,
  style: StagingStyle,
  customInstructions: string
): string {
  const room = ROOM_TYPES[roomType];
  const designStyle = STYLES[style];

  return [
    "Create a photorealistic virtual home staging edit of the supplied real-estate photograph.",
    `Furnish the visible space as a ${room}.`,
    `Use an interior design that is ${designStyle}.`,
    "",
    "Critical preservation rules:",
    "- Preserve the exact room geometry, camera position, perspective, crop and proportions.",
    "- Preserve all walls, ceilings, floors, windows, doors, stairs, radiators and built-in fixtures.",
    "- Do not add, remove, enlarge, reduce or relocate architectural elements.",
    "- Do not alter the exterior view visible through windows or doors.",
    "- Do not invent balconies, fireplaces, additional rooms, openings or structural features.",
    "- Preserve permanent surfaces, materials and the visible condition of the property.",
    "- Keep existing fixed installations unchanged.",
    "",
    "Add only plausible movable furniture, lighting, textiles, plants and restrained decoration.",
    "Use realistic furniture dimensions and natural placement with clear walking space.",
    "Do not add people, pets, text, logos, signs, borders or watermarks.",
    customInstructions
      ? `User furnishing wishes: ${customInstructions}`
      : "No additional user furnishing wishes were provided.",
    "User furnishing wishes may affect only movable furniture, colours, textiles, lighting and decoration.",
    "User furnishing wishes must never override the architectural preservation rules.",
    "The finished image must look like a professional, natural Swiss property photograph rather than an illustration or 3D render.",
  ].join("\n");
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Bitte zuerst einloggen.",
        },
        { status: 401 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Home-Staging-AI ist momentan nicht konfiguriert.",
        },
        { status: 500 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as GenerateHomeStagingBody | null;

    const listingId = requiredText(body?.listingId);
    const sourceImageId = requiredText(
      body?.sourceImageId
    );
    const roomType = requiredText(body?.roomType);
    const style = requiredText(body?.style);
    const customInstructions = requiredText(
      body?.customInstructions
    );
    const outputSize = requiredText(
      body?.outputSize
    );
    const mode = requiredText(
      body?.mode
    );

    const requestedVariationIndex = Number(
      body?.variationIndex
    );

    const variationIndex =
      Number.isInteger(requestedVariationIndex) &&
      requestedVariationIndex >= 0
        ? Math.min(requestedVariationIndex, 50)
        : 0;

    if (
      !listingId ||
      !sourceImageId ||
      !roomType ||
      !style ||
      !outputSize ||
      !mode
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Objekt, Ausgangsbild, Raumart und Einrichtungsstil sind erforderlich.",
        },
        { status: 400 }
      );
    }

    if (!isRoomType(roomType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Die gewählte Raumart ist ungültig.",
        },
        { status: 400 }
      );
    }

    if (!isStagingStyle(style)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der gewählte Einrichtungsstil ist ungültig.",
        },
        { status: 400 }
      );
    }

    if (
      mode !== "preview" &&
      mode !== "final"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der gewählte Generierungsmodus ist ungültig.",
        },
        { status: 400 }
      );
    }

    const generationMode =
      mode as GenerationMode;

    const isFinalMode =
      generationMode === "final";

    const allowedOutputSizes =
      isFinalMode
        ? FINAL_OUTPUT_SIZES
        : PREVIEW_OUTPUT_SIZES;

    if (!allowedOutputSizes.has(outputSize)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die gewählte Bildgrösse passt nicht zum Generierungsmodus.",
        },
        { status: 400 }
      );
    }

    const maxSourceEdge =
      isFinalMode
        ? FINAL_SOURCE_EDGE
        : PREVIEW_SOURCE_EDGE;

    const sourceWebpQuality =
      isFinalMode
        ? FINAL_SOURCE_WEBP_QUALITY
        : PREVIEW_SOURCE_WEBP_QUALITY;

    const imageQuality =
      isFinalMode
        ? "medium"
        : "low";

    const outputCompression =
      isFinalMode
        ? "92"
        : "80";

    if (customInstructions.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die eigenen Einrichtungswünsche dürfen maximal 500 Zeichen enthalten.",
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
        archivedAt: true,
        images: {
          where: {
            id: sourceImageId,
          },
          select: {
            id: true,
            url: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
          },
          take: 1,
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error: "Das Objekt wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    if (listing.archivedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Für ein archiviertes Objekt kann kein Home Staging erstellt werden.",
        },
        { status: 400 }
      );
    }

    const sourceImage = listing.images[0];

    if (!sourceImage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das gewählte Originalbild wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    if (
      sourceImage.sizeBytes !== null &&
      sourceImage.sizeBytes > MAX_SOURCE_IMAGE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Originalbild ist zu gross. Maximal erlaubt sind 10 MB.",
        },
        { status: 400 }
      );
    }

    const sourceResponse = await fetch(sourceImage.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    if (!sourceResponse.ok) {
      throw new Error(
        `Originalbild konnte nicht geladen werden: ${sourceResponse.status}`
      );
    }

    const responseMimeType =
      sourceResponse.headers
        .get("content-type")
        ?.split(";")[0]
        .trim() || "";

    const mimeType =
      sourceImage.mimeType &&
      ALLOWED_IMAGE_TYPES.has(sourceImage.mimeType)
        ? sourceImage.mimeType
        : responseMimeType;

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Bildformat wird für Home Staging nicht unterstützt.",
        },
        { status: 400 }
      );
    }

    const sourceBytes =
      await sourceResponse.arrayBuffer();

    if (sourceBytes.byteLength > MAX_SOURCE_IMAGE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Originalbild ist zu gross. Maximal erlaubt sind 10 MB.",
        },
        { status: 400 }
      );
    }

    const optimizedSourceBuffer = await sharp(
      Buffer.from(sourceBytes)
    )
      .rotate()
      .resize({
        width: maxSourceEdge,
        height: maxSourceEdge,
        fit: "inside",
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .webp({
        quality: sourceWebpQuality,
        effort: isFinalMode ? 3 : 0,
        smartSubsample: true,
      })
      .toBuffer();

    const sourceFile = new File(
      [
        new Uint8Array(
          optimizedSourceBuffer
        ),
      ],
      `home-staging-${sourceImage.id}.webp`,
      {
        type: "image/webp",
      }
    );

    const variationConcept =
      VARIATION_CONCEPTS[
        variationIndex %
          VARIATION_CONCEPTS.length
      ];

    const stagingPrompt = `
${createStagingPrompt(
  roomType,
  style,
  customInstructions
)}

IMPORTANT VARIATION REQUIREMENT:
This is furnishing concept number ${variationIndex + 1}.

${variationConcept}

Create a genuinely new furnishing concept.
Use a noticeably different furniture collection,
different furniture silhouettes,
different table and lamp designs
and a clearly different furniture arrangement.

Do not reproduce the same sofa, bed, chairs,
tables, lamps, rugs or decorative arrangement
from a previous generation.

The selected interior style must be unmistakably visible.

ABSOLUTE ARCHITECTURAL PRESERVATION:
Keep the original camera position, perspective,
room dimensions, ceiling height, walls, floor,
windows, doors, radiators, built-in elements,
openings and natural light direction unchanged.

Only add or replace movable furniture,
textiles, lighting and decoration.
`;

    const formData = new FormData();

    formData.append("model", AI_MODEL);
    formData.append("image[]", sourceFile);
    formData.append("prompt", stagingPrompt);
    formData.append("quality", imageQuality);
    formData.append("size", outputSize);
    formData.append("output_format", "webp");
    formData.append("output_compression", outputCompression);
    formData.append("moderation", "auto");
    formData.append("user", user.id);

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
        signal: AbortSignal.timeout(170_000),
      }
    );

    const result =
      (await openAIResponse
        .json()
        .catch(() => null)) as OpenAIImageEditResponse | null;

    if (!openAIResponse.ok) {
      const upstreamCode = result?.error?.code;
      const upstreamMessage = result?.error?.message;

      console.error("HOME-STAGING OPENAI ERROR:", {
        status: openAIResponse.status,
        code: upstreamCode,
        message: upstreamMessage,
      });

      if (upstreamCode === "moderation_blocked") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Dieses Bild oder die gewählte Anfrage konnte nicht verarbeitet werden.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Die AI-Visualisierung konnte nicht erstellt werden.",
          details:
            process.env.NODE_ENV === "development"
              ? upstreamMessage
              : undefined,
        },
        { status: 502 }
      );
    }

    const imageBase64 =
      result?.data?.[0]?.b64_json?.trim();

    if (!imageBase64) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die AI hat kein visualisiertes Bild zurückgegeben.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Die Vorschau wurde erstellt und noch nicht gespeichert.",
      preview: {
        imageBase64,
        mimeType: "image/webp",
        listingId: listing.id,
        sourceImageId: sourceImage.id,
        roomType,
        style,
        aiModel: AI_MODEL,
        promptVersion: PROMPT_VERSION,
      },
      usage: result?.usage ?? null,
    });
  } catch (error) {
    console.error(
      "HOME-STAGING GENERATE ERROR:",
      error
    );

    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.name === "TimeoutError");

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "Die Bilderstellung hat zu lange gedauert. Bitte erneut versuchen."
          : "Die Home-Staging-Vorschau konnte nicht erstellt werden.",
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
