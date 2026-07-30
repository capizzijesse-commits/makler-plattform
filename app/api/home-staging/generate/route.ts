import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import sharp from "sharp";

import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 180;

const AI_MODEL = "gpt-image-2";
const PROMPT_VERSION = "home-staging-v2-variants";
const MAX_SOURCE_IMAGE_SIZE = 10 * 1024 * 1024;
type AppLocale = "de" | "it" | "fr" | "en";

const GENERATE_MESSAGES = {
  de: {
    login: "Bitte zuerst einloggen.",
    pro: "Virtuelles Home Staging ist im Pro-Plan für CHF 79.90 pro Monat enthalten.",
    notConfigured: "Die Home-Staging-AI ist momentan nicht konfiguriert.",
    required: "Objekt, Ausgangsbild, Raumart und Einrichtungsstil sind erforderlich.",
    invalidRoom: "Die gewählte Raumart ist ungültig.",
    invalidStyle: "Der gewählte Einrichtungsstil ist ungültig.",
    invalidMode: "Der gewählte Generierungsmodus ist ungültig.",
    invalidSize: "Die gewählte Bildgrösse passt nicht zum Generierungsmodus.",
    instructionsTooLong: "Die eigenen Einrichtungswünsche dürfen maximal 500 Zeichen enthalten.",
    listingNotFound: "Das Objekt wurde nicht gefunden.",
    archived: "Für ein archiviertes Objekt kann kein Home Staging erstellt werden.",
    originalNotFound: "Das gewählte Originalbild wurde nicht gefunden.",
    originalTooLarge: "Das Originalbild ist zu gross. Maximal erlaubt sind 10 MB.",
    unsupportedFormat: "Das Bildformat wird für Home Staging nicht unterstützt.",
    moderation: "Dieses Bild oder die gewählte Anfrage konnte nicht verarbeitet werden.",
    generateFailed: "Die AI-Visualisierung konnte nicht erstellt werden.",
    noImage: "Die AI hat kein visualisiertes Bild zurückgegeben.",
    previewCreated: "Die Vorschau wurde erstellt und noch nicht gespeichert.",
    timeout: "Die Bilderstellung hat zu lange gedauert. Bitte erneut versuchen.",
    previewFailed: "Die Home-Staging-Vorschau konnte nicht erstellt werden.",
  },
  it: {
    login: "Effettua prima l’accesso.",
    pro: "L’home staging virtuale è incluso nel piano Pro da CHF 79.90 al mese.",
    notConfigured: "L’AI per l’home staging non è momentaneamente configurata.",
    required: "Immobile, immagine originale, tipo di ambiente e stile sono obbligatori.",
    invalidRoom: "Il tipo di ambiente selezionato non è valido.",
    invalidStyle: "Lo stile selezionato non è valido.",
    invalidMode: "La modalità di generazione selezionata non è valida.",
    invalidSize: "La dimensione dell’immagine non corrisponde alla modalità selezionata.",
    instructionsTooLong: "Le richieste personalizzate possono contenere al massimo 500 caratteri.",
    listingNotFound: "L’immobile non è stato trovato.",
    archived: "Non è possibile creare un home staging per un immobile archiviato.",
    originalNotFound: "L’immagine originale selezionata non è stata trovata.",
    originalTooLarge: "L’immagine originale è troppo grande. Il massimo è 10 MB.",
    unsupportedFormat: "Il formato dell’immagine non è supportato per l’home staging.",
    moderation: "Non è stato possibile elaborare l’immagine o la richiesta selezionata.",
    generateFailed: "Non è stato possibile creare la visualizzazione AI.",
    noImage: "L’AI non ha restituito alcuna immagine visualizzata.",
    previewCreated: "L’anteprima è stata creata e non è ancora salvata.",
    timeout: "La creazione dell’immagine ha richiesto troppo tempo. Riprova.",
    previewFailed: "Non è stato possibile creare l’anteprima di home staging.",
  },
  fr: {
    login: "Veuillez d’abord vous connecter.",
    pro: "Le home staging virtuel est inclus dans l’offre Pro à CHF 79.90 par mois.",
    notConfigured: "L’AI de home staging n’est pas configurée actuellement.",
    required: "Le bien, l’image source, le type de pièce et le style sont requis.",
    invalidRoom: "Le type de pièce sélectionné n’est pas valide.",
    invalidStyle: "Le style sélectionné n’est pas valide.",
    invalidMode: "Le mode de génération sélectionné n’est pas valide.",
    invalidSize: "La taille d’image ne correspond pas au mode sélectionné.",
    instructionsTooLong: "Les souhaits personnalisés sont limités à 500 caractères.",
    listingNotFound: "Le bien n’a pas été trouvé.",
    archived: "Aucun home staging ne peut être créé pour un bien archivé.",
    originalNotFound: "L’image source sélectionnée n’a pas été trouvée.",
    originalTooLarge: "L’image source est trop grande. La limite est de 10 MB.",
    unsupportedFormat: "Le format d’image n’est pas pris en charge pour le home staging.",
    moderation: "L’image ou la demande sélectionnée n’a pas pu être traitée.",
    generateFailed: "La visualisation AI n’a pas pu être créée.",
    noImage: "L’AI n’a renvoyé aucune image visualisée.",
    previewCreated: "L’aperçu a été créé et n’est pas encore enregistré.",
    timeout: "La création de l’image a pris trop de temps. Veuillez réessayer.",
    previewFailed: "L’aperçu de home staging n’a pas pu être créé.",
  },
  en: {
    login: "Please sign in first.",
    pro: "Virtual home staging is included in the Pro plan at CHF 79.90 per month.",
    notConfigured: "The home staging AI is not currently configured.",
    required: "Property, source image, room type and furnishing style are required.",
    invalidRoom: "The selected room type is invalid.",
    invalidStyle: "The selected furnishing style is invalid.",
    invalidMode: "The selected generation mode is invalid.",
    invalidSize: "The selected image size does not match the generation mode.",
    instructionsTooLong: "Custom furnishing instructions may contain up to 500 characters.",
    listingNotFound: "The property was not found.",
    archived: "Home staging cannot be created for an archived property.",
    originalNotFound: "The selected original image was not found.",
    originalTooLarge: "The original image is too large. The maximum size is 10 MB.",
    unsupportedFormat: "The image format is not supported for home staging.",
    moderation: "The selected image or request could not be processed.",
    generateFailed: "The AI visualisation could not be created.",
    noImage: "The AI did not return a visualised image.",
    previewCreated: "The preview was created and has not been saved yet.",
    timeout: "Image creation took too long. Please try again.",
    previewFailed: "The home staging preview could not be created.",
  },
} satisfies Record<AppLocale, Record<string, string>>;

function normalizeLocale(value: unknown): AppLocale {
  return value === "it" || value === "fr" || value === "en"
    ? value
    : "de";
}

type OptimizedSourceCacheEntry = {
  buffer: Buffer;
  expiresAt: number;
};

const OPTIMIZED_SOURCE_CACHE_TTL_MS =
  10 * 60 * 1000;
const OPTIMIZED_SOURCE_CACHE_MAX_ENTRIES = 12;
const optimizedSourceCache = new Map<
  string,
  OptimizedSourceCacheEntry
>();

function getCachedOptimizedSource(
  cacheKey: string
): Buffer | null {
  const cached = optimizedSourceCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    optimizedSourceCache.delete(cacheKey);
    return null;
  }

  optimizedSourceCache.delete(cacheKey);
  optimizedSourceCache.set(cacheKey, cached);

  return cached.buffer;
}

function cacheOptimizedSource(
  cacheKey: string,
  buffer: Buffer
): void {
  optimizedSourceCache.set(cacheKey, {
    buffer,
    expiresAt:
      Date.now() + OPTIMIZED_SOURCE_CACHE_TTL_MS,
  });

  while (
    optimizedSourceCache.size >
    OPTIMIZED_SOURCE_CACHE_MAX_ENTRIES
  ) {
    const oldestKey =
      optimizedSourceCache.keys().next().value;

    if (typeof oldestKey !== "string") {
      break;
    }

    optimizedSourceCache.delete(oldestKey);
  }
}


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

type OpenAIUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type OpenAIImageEditResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  output_format?: string;
  quality?: string;
  size?: string;
  usage?: OpenAIUsage;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

type OpenAIImageEditStreamEvent = {
  type?: string;
  b64_json?: string;
  partial_image_index?: number;
  usage?: OpenAIUsage;
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
    "Critical room identity and preservation rules:",
    "- First identify the actual visible room from its fixed installations and architectural features.",
    "- The actual visible room function has absolute priority over the selected room category.",
    "- If the selected room category conflicts with the real room, ignore the selected category and preserve the real room.",
    "- A bathroom must remain a bathroom, a kitchen must remain a kitchen and a hallway must remain a hallway.",
    "- Never remove, hide or replace a bathtub, shower, toilet, washbasin, kitchen counter, sink, cooker or another fixed installation.",
    "- For incompatible selections, improve the real room only with suitable movable accessories, textiles, lighting and restrained decoration.",
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
): Promise<Response> {
  const locale = normalizeLocale(
    request.nextUrl.searchParams.get("locale")
  );
  const messages = GENERATE_MESSAGES[locale];

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
          error:
            messages.pro,
        },
        { status: 403 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.notConfigured,
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
            messages.required,
        },
        { status: 400 }
      );
    }

    if (!isRoomType(roomType)) {
      return NextResponse.json(
        {
          success: false,
          error: messages.invalidRoom,
        },
        { status: 400 }
      );
    }

    if (!isStagingStyle(style)) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.invalidStyle,
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
            messages.invalidMode,
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
            messages.invalidSize,
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
            messages.instructionsTooLong,
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
          error: messages.listingNotFound,
        },
        { status: 404 }
      );
    }

    if (listing.archivedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.archived,
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
            messages.originalNotFound,
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
            messages.originalTooLarge,
        },
        { status: 400 }
      );
    }

    const optimizedSourceCacheKey = [
      sourceImage.id,
      sourceImage.url,
      generationMode,
      maxSourceEdge,
      sourceWebpQuality,
    ].join(":");

    let optimizedSourceBuffer =
      getCachedOptimizedSource(
        optimizedSourceCacheKey
      );

    if (!optimizedSourceBuffer) {
      const sourceResponse = await fetch(
        sourceImage.url,
        {
          cache: "force-cache",
          signal: AbortSignal.timeout(30_000),
        }
      );

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
        ALLOWED_IMAGE_TYPES.has(
          sourceImage.mimeType
        )
          ? sourceImage.mimeType
          : responseMimeType;

      if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
        return NextResponse.json(
          {
            success: false,
            error: messages.unsupportedFormat,
          },
          { status: 400 }
        );
      }

      const sourceBytes =
        await sourceResponse.arrayBuffer();

      if (
        sourceBytes.byteLength >
        MAX_SOURCE_IMAGE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,
            error: messages.originalTooLarge,
          },
          { status: 400 }
        );
      }

      optimizedSourceBuffer = await sharp(
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
          effort: isFinalMode ? 2 : 0,
          smartSubsample: true,
        })
        .toBuffer();

      cacheOptimizedSource(
        optimizedSourceCacheKey,
        optimizedSourceBuffer
      );
    }

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

ABSOLUTE ROOM IDENTITY AND ARCHITECTURAL PRESERVATION:
First identify and preserve the actual visible room type.
A bathroom must remain a bathroom.
A kitchen must remain a kitchen.
A hallway must remain a hallway.
If the selected room category is incompatible,
ignore it and preserve the real room function.
Never remove, hide or replace fixed sanitary,
kitchen or utility installations.

Keep the original camera position, perspective,
room dimensions, ceiling height, walls, floor,
windows, doors, radiators, built-in elements,
openings and natural light direction unchanged.

Only add or replace movable furniture,
textiles, lighting and decoration that are
compatible with the actual visible room.
`;

    const formData = new FormData();

    formData.append("model", AI_MODEL);
    formData.append("image[]", sourceFile);
    formData.append("prompt", stagingPrompt);
    formData.append("quality", imageQuality);
    formData.append("size", outputSize);
    formData.append("output_format", "webp");
    formData.append(
      "output_compression",
      outputCompression
    );
    formData.append("moderation", "auto");
    formData.append("user", user.id);
    formData.append("stream", "true");
    formData.append("partial_images", "1");

    const generationStartedAt = Date.now();

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

    if (!openAIResponse.ok) {
      const result =
        (await openAIResponse
          .json()
          .catch(() => null)) as OpenAIImageEditResponse | null;
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
            error: messages.moderation,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: messages.generateFailed,
          details:
            process.env.NODE_ENV === "development"
              ? upstreamMessage
              : undefined,
        },
        { status: 502 }
      );
    }

    const contentType =
      openAIResponse.headers.get("content-type") || "";

    const createPreview = (imageBase64: string) => ({
      imageBase64,
      mimeType: "image/webp",
      listingId: listing.id,
      sourceImageId: sourceImage.id,
      roomType,
      style,
      aiModel: AI_MODEL,
      promptVersion: PROMPT_VERSION,
    });

    if (!contentType.includes("text/event-stream")) {
      const result =
        (await openAIResponse
          .json()
          .catch(() => null)) as OpenAIImageEditResponse | null;
      const imageBase64 =
        result?.data?.[0]?.b64_json?.trim();

      if (!imageBase64) {
        return NextResponse.json(
          {
            success: false,
            error: messages.noImage,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        phase: "completed",
        message: messages.previewCreated,
        preview: createPreview(imageBase64),
        elapsedMs: Date.now() - generationStartedAt,
        usage: result?.usage ?? null,
      });
    }

    if (!openAIResponse.body) {
      return NextResponse.json(
        {
          success: false,
          error: messages.noImage,
        },
        { status: 502 }
      );
    }

    const upstreamReader =
      openAIResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamBuffer = "";
        let completed = false;

        const sendEvent = (
          event: "partial" | "completed" | "error",
          payload: Record<string, unknown>
        ) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(
                payload
              )}\n\n`
            )
          );
        };

        const processEventBlock = (block: string) => {
          const lines = block.split(/\r?\n/);
          const eventName =
            lines
              .find((line) =>
                line.startsWith("event:")
              )
              ?.slice(6)
              .trim() || "";
          const dataText = lines
            .filter((line) =>
              line.startsWith("data:")
            )
            .map((line) =>
              line.slice(5).trimStart()
            )
            .join("\n");

          if (!dataText || dataText === "[DONE]") {
            return;
          }

          let eventData: OpenAIImageEditStreamEvent;

          try {
            eventData = JSON.parse(
              dataText
            ) as OpenAIImageEditStreamEvent;
          } catch {
            return;
          }

          const eventType =
            eventData.type || eventName;

          if (
            eventType ===
            "image_edit.partial_image"
          ) {
            const imageBase64 =
              eventData.b64_json?.trim();

            if (!imageBase64) {
              return;
            }

            sendEvent("partial", {
              success: true,
              phase: "partial",
              preview: createPreview(imageBase64),
              elapsedMs:
                Date.now() - generationStartedAt,
              partialImageIndex:
                eventData.partial_image_index ?? 0,
            });
            return;
          }

          if (
            eventType === "image_edit.completed"
          ) {
            const imageBase64 =
              eventData.b64_json?.trim();

            if (!imageBase64) {
              return;
            }

            completed = true;
            sendEvent("completed", {
              success: true,
              phase: "completed",
              message: messages.previewCreated,
              preview: createPreview(imageBase64),
              elapsedMs:
                Date.now() - generationStartedAt,
              usage: eventData.usage ?? null,
            });
            return;
          }

          if (
            eventType === "error" ||
            eventData.error
          ) {
            sendEvent("error", {
              success: false,
              phase: "error",
              error: messages.generateFailed,
              details:
                process.env.NODE_ENV === "development"
                  ? eventData.error?.message
                  : undefined,
            });
          }
        };

        try {
          while (true) {
            const { done, value } =
              await upstreamReader.read();

            if (done) {
              break;
            }

            streamBuffer += decoder.decode(value, {
              stream: true,
            });

            const eventBlocks = streamBuffer.split(
              /\r?\n\r?\n/
            );

            streamBuffer = eventBlocks.pop() || "";

            for (const eventBlock of eventBlocks) {
              processEventBlock(eventBlock);
            }
          }

          if (streamBuffer.trim()) {
            processEventBlock(streamBuffer);
          }

          if (!completed) {
            sendEvent("error", {
              success: false,
              phase: "error",
              error: messages.noImage,
            });
          }
        } catch (streamError) {
          console.error(
            "HOME-STAGING STREAM ERROR:",
            streamError
          );

          sendEvent("error", {
            success: false,
            phase: "error",
            error: messages.previewFailed,
          });
        } finally {
          controller.close();
          upstreamReader.releaseLock();
        }
      },
      async cancel() {
        await upstreamReader.cancel();
      },
    });

    return new Response(responseStream, {
      status: 200,
      headers: {
        "Content-Type":
          "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
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
          ? messages.timeout
          : messages.previewFailed,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
