import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  prepareImmoScout24DeImagePackageV1,
  readImmoScout24DeImageV1,
} from "./immoscout24-de-image-package.server";

import {
  buildImmoScout24DeImageMultipartV1,
} from "./immoscout24-de-image-multipart.server";

import {
  executeImmoScout24DeImageUploadV1,
} from "./immoscout24-de-image-upload-transport.server";

type HttpClient = (
  url: string,
  init: RequestInit
) => Promise<Pick<Response, "status">>;

export type ImmoScout24DeImageWorkflowResultV1 =
  | {
      status: "blocked";
      reason: string;
    }
  | {
      status: "http_accepted" | "uncertain";
      httpStatus: number | null;
      requiresVerification: true;
    };

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

/**
 * ImmoScout24 DE - Image Upload Workflow V1
 *
 * Isoliert vom Publishing-Worker.
 * Nur Sandbox, kein automatischer Retry.
 *
 * Ein bereits reserviertes Bild wird niemals
 * automatisch erneut hochgeladen.
 */
export async function runImmoScout24DeImageUploadWorkflowV1(
  input: {
    prisma: PrismaClient;
    userId: string;
    connectionId: string;
    objectLinkId: string;
    imageId: string;
    accessToken: string;
    accessTokenSecret: string;
    allowSandboxWrite: true;
    httpClient: HttpClient;
  }
): Promise<ImmoScout24DeImageWorkflowResultV1> {
  if (
    input.allowSandboxWrite !== true ||
    !input.userId?.trim() ||
    !input.connectionId?.trim() ||
    !input.objectLinkId?.trim() ||
    !input.imageId?.trim()
  ) {
    fail("IMMOSCOUT24_DE_IMAGE_WORKFLOW_INPUT_INVALID");
  }

  // Eigentuemerkontext und Objektstatus pruefen.
  const objectLink =
    await input.prisma.immoScout24DeObjectLink.findFirst({
      where: {
        id: input.objectLinkId,
        userId: input.userId,
        connectionId: input.connectionId,
        status: "created",
        externalObjectId: { not: null },
      },
    });

  if (!objectLink?.externalObjectId) {
    return {
      status: "blocked",
      reason: "OBJECT_LINK_NOT_READY",
    };
  }

  // Bild muss wirklich zum zugeordneten Inserat gehoeren.
  const images = await input.prisma.listingImage.findMany({
    where: {
      listingId: objectLink.listingId,
    },
  });

  const image = images.find(
    (item) => item.id === input.imageId
  );

  if (!image) {
    return {
      status: "blocked",
      reason: "IMAGE_NOT_IN_LISTING",
    };
  }

  // Noch kein HTTP-Upload und noch kein Reservierungs-Write.
  const packageItems =
    prepareImmoScout24DeImagePackageV1(images);

  const selected = packageItems.find(
    (item) => item.id === image.id
  );

  if (!selected) {
    fail("IMMOSCOUT24_DE_IMAGE_PACKAGE_SELECTION_FAILED");
  }

  const loaded =
    await readImmoScout24DeImageV1({
      ...selected,
      isTitleImage: image.isPrimary,
    });

  const multipart =
    buildImmoScout24DeImageMultipartV1(loaded);

  // Einmalige Reservierung, abgesichert durch
  // die PostgreSQL-Unique-Indizes.
  let reservation: { id: string };

  try {
    reservation =
      await input.prisma.immoScout24DeImageUpload.create({
        data: {
          objectLinkId: objectLink.id,
          imageId: image.id,
          externalId: multipart.externalId,
          checksum: multipart.checksum,
          status: "reserved",
        },
        select: { id: true },
      });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        status: "blocked",
        reason: "IMAGE_ALREADY_RESERVED",
      };
    }

    throw error;
  }

  // Compare-and-swap: nur ein Prozess darf starten.
  const claimed =
    await input.prisma.immoScout24DeImageUpload.updateMany({
      where: {
        id: reservation.id,
        status: "reserved",
      },
      data: {
        status: "uploading",
      },
    });

  if (claimed.count !== 1) {
    return {
      status: "blocked",
      reason: "IMAGE_UPLOAD_ALREADY_CLAIMED",
    };
  }

  // Ab hier ist jeder Fehler konservativ:
  // Ein erneuter POST ist ohne Bestandsabgleich verboten.
  let outcome:
    | {
        status: "http_accepted";
        httpStatus: number;
      }
    | {
        status: "rejected";
        httpStatus: number;
      }
    | {
        status: "uncertain";
        httpStatus: number | null;
      };

  try {
    outcome = await executeImmoScout24DeImageUploadV1({
      realEstateId: objectLink.externalObjectId,
      accessToken: input.accessToken,
      accessTokenSecret: input.accessTokenSecret,
      formData: multipart.formData,
      allowSandboxWrite: true,
      httpClient: input.httpClient,
    });
  } catch {
    outcome = {
      status: "uncertain",
      httpStatus: null,
    };
  }

  // Auch eine klare Ablehnung wird vorerst gesperrt.
  // Freigabe einer erneuten Uebertragung erst nach
  // ausdruecklichem, separat implementiertem Abgleich.
  const nextStatus =
    outcome.status === "http_accepted"
      ? "http_accepted"
      : "uncertain";

  const persisted =
    await input.prisma.immoScout24DeImageUpload.updateMany({
      where: {
        id: reservation.id,
        status: "uploading",
      },
      data: {
        status: nextStatus,
        lastErrorCode:
          outcome.status === "rejected"
            ? `HTTP_REJECTED_${outcome.httpStatus}`
            : outcome.status === "uncertain"
              ? "UPLOAD_RESULT_UNCONFIRMED"
              : null,
      },
    });

  if (persisted.count !== 1) {
    fail("IMMOSCOUT24_DE_IMAGE_STATUS_PERSIST_FAILED");
  }

  return {
    status: nextStatus,
    httpStatus: outcome.httpStatus,
    requiresVerification: true,
  };
}