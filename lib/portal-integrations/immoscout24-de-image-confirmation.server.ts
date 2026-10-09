import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  checkImmoScout24DeImageConnectionV1,
} from "./immoscout24-de-image-connection-guard.server";

import {
  reconcileImmoScout24DeImageV1,
  type ImmoScout24DeImageObservationV1,
} from "./immoscout24-de-image-reconciliation.server";

export type ImmoScout24DeImageConfirmationResultV1 =
  | {
      status: "verified";
      externalAttachmentId: string;
      retryUploadAllowed: false;
    }
  | {
      status: "blocked";
      reason: string;
      retryUploadAllowed: false;
    };

function blocked(
  reason: string
): ImmoScout24DeImageConfirmationResultV1 {
  return {
    status: "blocked",
    reason,
    retryUploadAllowed: false,
  };
}

/**
 * TEST-ONLY confirmation using normalized observations.
 *
 * The observations are NOT authenticated provider evidence.
 * Do not expose this function to users or publishing workers.
 *
 * No HTTP, no retries, no upload POST.
 * Production execution is forbidden.
 */
export async function confirmImmoScout24DeImageTestV1(
  input: {
    prisma: PrismaClient;
    userId: string;
    connectionId: string;
    objectLinkId: string;
    imageId: string;
    observations: ImmoScout24DeImageObservationV1[];
    allowNormalizedTestObservation: true;
  }
): Promise<ImmoScout24DeImageConfirmationResultV1> {
  if (
    process.env.NODE_ENV === "production" ||
    input.allowNormalizedTestObservation !== true
  ) {
    return blocked("TEST_ONLY_CONFIRMATION");
  }

  if (
    !input.userId?.trim() ||
    !input.connectionId?.trim() ||
    !input.objectLinkId?.trim() ||
    !input.imageId?.trim()
  ) {
    return blocked("INVALID_CONFIRMATION_CONTEXT");
  }

  const connection =
    await checkImmoScout24DeImageConnectionV1({
      prisma: input.prisma,
      userId: input.userId,
      connectionId: input.connectionId,
    });

  if (!connection.allowed) {
    return blocked(connection.reason);
  }

  const link =
    await input.prisma.immoScout24DeObjectLink.findFirst({
      where: {
        id: input.objectLinkId,
        userId: input.userId,
        connectionId: input.connectionId,
        status: "created",
        externalObjectId: { not: null },
      },
      select: { id: true },
    });

  if (!link) {
    return blocked("OBJECT_LINK_NOT_READY");
  }

  const upload =
    await input.prisma.immoScout24DeImageUpload.findFirst({
      where: {
        objectLinkId: link.id,
        imageId: input.imageId,
        status: {
          in: ["http_accepted", "uncertain"],
        },
        externalAttachmentId: null,
      },
      select: {
        id: true,
        externalId: true,
        checksum: true,
      },
    });

  if (!upload) {
    return blocked("IMAGE_NOT_ELIGIBLE");
  }

  const confirmation =
    reconcileImmoScout24DeImageV1({
      expectedExternalId: upload.externalId,
      expectedChecksum: upload.checksum,
      observations: input.observations,
    });

  if (confirmation.status !== "verified") {
    return blocked(confirmation.reason);
  }

  // Compare-and-swap: only the original eligible
  // record with unchanged identity can transition.
  const updated =
    await input.prisma.immoScout24DeImageUpload.updateMany({
      where: {
        id: upload.id,
        objectLinkId: link.id,
        imageId: input.imageId,
        externalId: upload.externalId,
        checksum: upload.checksum,
        externalAttachmentId: null,
        status: {
          in: ["http_accepted", "uncertain"],
        },
      },
      data: {
        status: "verified",
        externalAttachmentId:
          confirmation.externalAttachmentId,
        lastErrorCode: null,
        lastCheckedAt: new Date(),
      },
    });

  if (updated.count !== 1) {
    return blocked("IMAGE_CONFIRMATION_CONFLICT");
  }

  return {
    status: "verified",
    externalAttachmentId:
      confirmation.externalAttachmentId,
    retryUploadAllowed: false,
  };
}