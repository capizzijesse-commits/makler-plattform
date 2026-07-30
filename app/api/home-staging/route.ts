import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const AI_MODEL = "gpt-image-2";
const PROMPT_VERSION = "home-staging-v1";
type AppLocale = "de" | "it" | "fr" | "en";

const SAVE_MESSAGES: Record<
  AppLocale,
  {
    login: string;
    pro: string;
    incomplete: string;
    invalidRoom: string;
    invalidStyle: string;
    invalidGeneration: string;
    webp: string;
    imageSize: string;
    path: string;
    blobUrl: string;
    listing: string;
    original: string;
    alreadySaved: string;
    saved: string;
    saveFailed: string;
  }
> = {
  de: {
    login: "Bitte zuerst einloggen.",
    pro: "Virtuelles Home Staging ist im Pro-Plan für CHF 79.90 pro Monat enthalten.",
    incomplete: "Die Angaben zur AI-Visualisierung sind unvollständig.",
    invalidRoom: "Die gewählte Raumart ist ungültig.",
    invalidStyle: "Der gewählte Einrichtungsstil ist ungültig.",
    invalidGeneration: "Die AI-Generierungsdaten sind ungültig.",
    webp: "Das Home-Staging-Ergebnis muss im WebP-Format vorliegen.",
    imageSize: "Die Bildgrösse ist ungültig. Maximal erlaubt sind 10 MB.",
    path: "Der Speicherpfad gehört nicht zu diesem Objektbild.",
    blobUrl: "Die übermittelte Blob-URL ist ungültig.",
    listing: "Das Objekt wurde nicht gefunden oder ist archiviert.",
    original: "Das zugehörige Originalbild wurde nicht gefunden.",
    alreadySaved: "Die AI-Visualisierung war bereits gespeichert.",
    saved: "Die AI-Visualisierung wurde dauerhaft gespeichert.",
    saveFailed: "Die AI-Visualisierung konnte nicht gespeichert werden.",
  },
  it: {
    login: "Effettua prima l’accesso.",
    pro: "L’home staging virtuale è incluso nel piano Pro da CHF 79.90 al mese.",
    incomplete: "I dati della visualizzazione AI sono incompleti.",
    invalidRoom: "Il tipo di ambiente selezionato non è valido.",
    invalidStyle: "Lo stile di arredamento selezionato non è valido.",
    invalidGeneration: "I dati di generazione AI non sono validi.",
    webp: "Il risultato dell’home staging deve essere in formato WebP.",
    imageSize: "La dimensione dell’immagine non è valida. Il massimo consentito è 10 MB.",
    path: "Il percorso di salvataggio non appartiene a questa immagine.",
    blobUrl: "L’URL Blob trasmesso non è valido.",
    listing: "L’immobile non è stato trovato o è archiviato.",
    original: "L’immagine originale associata non è stata trovata.",
    alreadySaved: "La visualizzazione AI era già stata salvata.",
    saved: "La visualizzazione AI è stata salvata definitivamente.",
    saveFailed: "Non è stato possibile salvare la visualizzazione AI.",
  },
  fr: {
    login: "Veuillez d’abord vous connecter.",
    pro: "Le home staging virtuel est inclus dans l’offre Pro à CHF 79.90 par mois.",
    incomplete: "Les données de la visualisation AI sont incomplètes.",
    invalidRoom: "Le type de pièce sélectionné n’est pas valide.",
    invalidStyle: "Le style d’aménagement sélectionné n’est pas valide.",
    invalidGeneration: "Les données de génération AI ne sont pas valides.",
    webp: "Le résultat du home staging doit être au format WebP.",
    imageSize: "La taille de l’image n’est pas valide. La limite est de 10 MB.",
    path: "Le chemin de stockage n’appartient pas à cette image.",
    blobUrl: "L’URL Blob transmise n’est pas valide.",
    listing: "Le bien n’a pas été trouvé ou est archivé.",
    original: "L’image originale correspondante n’a pas été trouvée.",
    alreadySaved: "La visualisation AI était déjà enregistrée.",
    saved: "La visualisation AI a été enregistrée durablement.",
    saveFailed: "La visualisation AI n’a pas pu être enregistrée.",
  },
  en: {
    login: "Please sign in first.",
    pro: "Virtual home staging is included in the Pro plan at CHF 79.90 per month.",
    incomplete: "The AI visualisation details are incomplete.",
    invalidRoom: "The selected room type is invalid.",
    invalidStyle: "The selected furnishing style is invalid.",
    invalidGeneration: "The AI generation details are invalid.",
    webp: "The home staging result must be provided in WebP format.",
    imageSize: "The image size is invalid. The maximum allowed size is 10 MB.",
    path: "The storage path does not belong to this property image.",
    blobUrl: "The submitted Blob URL is invalid.",
    listing: "The property was not found or is archived.",
    original: "The associated original image was not found.",
    alreadySaved: "The AI visualisation had already been saved.",
    saved: "The AI visualisation was saved permanently.",
    saveFailed: "The AI visualisation could not be saved.",
  },
};

function normalizeLocale(value: unknown): AppLocale {
  return value === "it" || value === "fr" || value === "en"
    ? value
    : "de";
}


const ROOM_TYPES = new Set([
  "livingRoom",
  "bedroom",
  "office",
  "diningRoom",
  "kidsRoom",
]);

const STYLES = new Set([
  "modern",
  "scandinavian",
  "luxurious",
  "minimalist",
]);

type SaveHomeStagingBody = {
  listingId?: unknown;
  sourceImageId?: unknown;
  url?: unknown;
  storageKey?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  roomType?: unknown;
  style?: unknown;
  aiModel?: unknown;
  promptVersion?: unknown;
};

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const text = requiredText(value);
  return text || null;
}

function isValidBlobUrl(
  urlText: string,
  storageKey: string
): boolean {
  try {
    const url = new URL(urlText);

    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(
        ".blob.vercel-storage.com"
      )
    ) {
      return false;
    }

    const pathname = decodeURIComponent(
      url.pathname.replace(/^\/+/, "")
    );

    return pathname === storageKey;
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const locale = normalizeLocale(
    request.nextUrl.searchParams.get("locale")
  );
  const messages = SAVE_MESSAGES[locale];

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

    const body = (await request
      .json()
      .catch(() => null)) as SaveHomeStagingBody | null;

    const listingId = requiredText(body?.listingId);
    const sourceImageId = requiredText(
      body?.sourceImageId
    );
    const url = requiredText(body?.url);
    const storageKey = requiredText(
      body?.storageKey
    );
    const roomType = requiredText(body?.roomType);
    const style = requiredText(body?.style);
    const aiModel = requiredText(body?.aiModel);
    const promptVersion = requiredText(
      body?.promptVersion
    );
    const mimeType = requiredText(body?.mimeType);

    const rawSizeBytes = Number(body?.sizeBytes);

    const sizeBytes =
      Number.isInteger(rawSizeBytes) &&
      rawSizeBytes > 0
        ? rawSizeBytes
        : null;

    if (
      !listingId ||
      !sourceImageId ||
      !url ||
      !storageKey ||
      !roomType ||
      !style ||
      !aiModel ||
      !promptVersion
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.incomplete,
        },
        { status: 400 }
      );
    }

    if (!ROOM_TYPES.has(roomType)) {
      return NextResponse.json(
        {
          success: false,
          error: messages.invalidRoom,
        },
        { status: 400 }
      );
    }

    if (!STYLES.has(style)) {
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
      aiModel !== AI_MODEL ||
      promptVersion !== PROMPT_VERSION
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.invalidGeneration,
        },
        { status: 400 }
      );
    }

    if (mimeType !== "image/webp") {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.webp,
        },
        { status: 400 }
      );
    }

    if (
      sizeBytes === null ||
      sizeBytes > MAX_IMAGE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.imageSize,
        },
        { status: 400 }
      );
    }

    const expectedPathPrefix =
      `home-staging/${listingId}/${sourceImageId}/`;

    if (!storageKey.startsWith(expectedPathPrefix)) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.path,
        },
        { status: 400 }
      );
    }

    if (!isValidBlobUrl(url, storageKey)) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.blobUrl,
        },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        userId: user.id,
        archivedAt: null,
      },
      select: {
        id: true,
        images: {
          where: {
            id: sourceImageId,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.listing,
        },
        { status: 404 }
      );
    }

    if (!listing.images[0]) {
      return NextResponse.json(
        {
          success: false,
          error:
            messages.original,
        },
        { status: 404 }
      );
    }

    const existingImage =
      await prisma.homeStagingImage.findUnique({
        where: {
          storageKey,
        },
      });

    if (existingImage) {
      return NextResponse.json({
        success: true,
        message:
          messages.alreadySaved,
        image: existingImage,
      });
    }

    const image =
      await prisma.homeStagingImage.create({
        data: {
          listingId: listing.id,
          sourceImageId: listing.images[0].id,
          url,
          storageKey,
          fileName: optionalText(body?.fileName),
          mimeType,
          sizeBytes,
          roomType,
          style,
          aiModel,
          promptVersion,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          messages.saved,
        image,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "HOME-STAGING-SPEICHERFEHLER:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          messages.saveFailed,
      },
      { status: 500 }
    );
  }
}
