import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPlanCapabilities } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
type AppLocale = "de" | "it" | "fr" | "en";

const UPLOAD_MESSAGES = {
  de: {
    login: "Bitte zuerst einloggen.",
    pro: "Virtuelles Home Staging ist im Pro-Plan für CHF 79.90 pro Monat enthalten.",
    invalidData: "Ungültige Home-Staging-Daten.",
    incomplete: "Die Angaben zur AI-Visualisierung sind unvollständig.",
    invalidRoom: "Ungültige Raumart.",
    invalidStyle: "Ungültiger Einrichtungsstil.",
    invalidGeneration: "Ungültige AI-Generierungsdaten.",
    listingNotFound: "Das Objekt wurde nicht gefunden.",
    originalNotFound: "Das Originalbild wurde nicht gefunden.",
    invalidPath: "Ungültiger Home-Staging-Speicherpfad.",
    uploadFailed: "Das Home-Staging-Bild konnte nicht hochgeladen werden.",
  },
  it: {
    login: "Effettua prima l’accesso.",
    pro: "L’home staging virtuale è incluso nel piano Pro da CHF 79.90 al mese.",
    invalidData: "Dati di home staging non validi.",
    incomplete: "I dati della visualizzazione AI sono incompleti.",
    invalidRoom: "Tipo di ambiente non valido.",
    invalidStyle: "Stile di arredamento non valido.",
    invalidGeneration: "Dati di generazione AI non validi.",
    listingNotFound: "L’immobile non è stato trovato.",
    originalNotFound: "L’immagine originale non è stata trovata.",
    invalidPath: "Percorso di salvataggio dell’home staging non valido.",
    uploadFailed: "Non è stato possibile caricare l’immagine di home staging.",
  },
  fr: {
    login: "Veuillez d’abord vous connecter.",
    pro: "Le home staging virtuel est inclus dans l’offre Pro à CHF 79.90 par mois.",
    invalidData: "Données de home staging non valides.",
    incomplete: "Les données de la visualisation AI sont incomplètes.",
    invalidRoom: "Type de pièce non valide.",
    invalidStyle: "Style d’aménagement non valide.",
    invalidGeneration: "Données de génération AI non valides.",
    listingNotFound: "Le bien n’a pas été trouvé.",
    originalNotFound: "L’image originale n’a pas été trouvée.",
    invalidPath: "Chemin de stockage du home staging non valide.",
    uploadFailed: "L’image de home staging n’a pas pu être téléchargée.",
  },
  en: {
    login: "Please sign in first.",
    pro: "Virtual home staging is included in the Pro plan at CHF 79.90 per month.",
    invalidData: "Invalid home staging data.",
    incomplete: "The AI visualisation details are incomplete.",
    invalidRoom: "Invalid room type.",
    invalidStyle: "Invalid furnishing style.",
    invalidGeneration: "Invalid AI generation details.",
    listingNotFound: "The property was not found.",
    originalNotFound: "The original image was not found.",
    invalidPath: "Invalid home staging storage path.",
    uploadFailed: "The home staging image could not be uploaded.",
  },
} satisfies Record<AppLocale, Record<string, string>>;

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
  "bathroom",
  "kitchen",
  "hallway",
  "utilityRoom",
]);

const STYLES = new Set([
  "modern",
  "scandinavian",
  "luxurious",
  "minimalist",
]);

type UploadClientPayload = {
  listingId?: unknown;
  sourceImageId?: unknown;
  roomType?: unknown;
  style?: unknown;
  aiModel?: unknown;
  promptVersion?: unknown;
};

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const locale = normalizeLocale(
    request.nextUrl.searchParams.get("locale")
  );
  const messages = UPLOAD_MESSAGES[locale];

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

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload
      ) => {
        const user = await getAuthenticatedUser(request);

        if (!user) {
          throw new Error(messages.login);
        }

        let payload: UploadClientPayload;

        try {
          payload = JSON.parse(
            clientPayload || "{}"
          ) as UploadClientPayload;
        } catch {
          throw new Error(
            messages.invalidData
          );
        }

        const listingId = requiredText(
          payload.listingId
        );
        const sourceImageId = requiredText(
          payload.sourceImageId
        );
        const roomType = requiredText(
          payload.roomType
        );
        const style = requiredText(payload.style);
        const aiModel = requiredText(
          payload.aiModel
        );
        const promptVersion = requiredText(
          payload.promptVersion
        );

        if (
          !listingId ||
          !sourceImageId ||
          !roomType ||
          !style ||
          !aiModel ||
          !promptVersion
        ) {
          throw new Error(
            messages.incomplete
          );
        }

        if (!ROOM_TYPES.has(roomType)) {
          throw new Error(messages.invalidRoom);
        }

        if (!STYLES.has(style)) {
          throw new Error(
            messages.invalidStyle
          );
        }

        if (
          aiModel !== "gpt-image-2" ||
          promptVersion !== "home-staging-v2-variants"
        ) {
          throw new Error(
            messages.invalidGeneration
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
          throw new Error(
            messages.listingNotFound
          );
        }

        if (!listing.images[0]) {
          throw new Error(
            messages.originalNotFound
          );
        }

        const expectedPathPrefix =
          `home-staging/${listing.id}/${sourceImageId}/`;

        if (!pathname.startsWith(expectedPathPrefix)) {
          throw new Error(
            messages.invalidPath
          );
        }

        return {
          allowedContentTypes: ["image/webp"],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            listingId: listing.id,
            sourceImageId,
            roomType,
            style,
            aiModel,
            promptVersion,
            userId: user.id,
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.info(
          "Home-Staging-Ergebnis zu Blob hochgeladen:",
          blob.pathname
        );
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error(
      "HOME-STAGING-UPLOAD-FEHLER:",
      error
    );

    const safeMessages = new Set([
      messages.login,
      messages.invalidData,
      messages.incomplete,
      messages.invalidRoom,
      messages.invalidStyle,
      messages.invalidGeneration,
      messages.listingNotFound,
      messages.originalNotFound,
      messages.invalidPath,
    ]);

    const message =
      error instanceof Error &&
      safeMessages.has(error.message)
        ? error.message
        : messages.uploadFailed;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
