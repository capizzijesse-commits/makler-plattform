import "server-only";

import type { PrismaClient } from "@prisma/client";

export type ImmoScout24DeImagePublishReadinessV1 =
  | {
      status: "ready";
      imageCount: number;
      attachmentIds: string[];
    }
  | {
      status: "blocked";
      reason: string;
    };

function blocked(reason: string): ImmoScout24DeImagePublishReadinessV1 {
  return { status: "blocked", reason };
}

/**
 * Sandbox-only, read-only prerequisite for publishing.
 *
 * This function does not upload, confirm or publish anything.
 * It must not be treated as provider approval.
 *
 * A successful check is only a point-in-time database snapshot.
 * The calling publishing executor must enforce the applicable
 * permission and provider gates independently.
 */
export async function assessImmoScout24DeImagePublishReadinessV1(
  input: {
    prisma: PrismaClient;
    userId: string;
    listingId: string;
    connectionId: string;
    externalObjectId: string;
  }
): Promise<ImmoScout24DeImagePublishReadinessV1> {
  if (
    !input.userId?.trim() ||
    !input.listingId?.trim() ||
    !input.connectionId?.trim() ||
    !/^\d+$/.test(input.externalObjectId ?? "")
  ) {
    return blocked("INVALID_PUBLISH_IMAGE_CONTEXT");
  }

  const connection = await input.prisma.portalConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      portal: "immoscout24_de",
      environment: "test",
      status: "verified",
    },
    select: { id: true },
  });

  if (!connection) {
    return blocked("PORTAL_CONNECTION_NOT_READY");
  }

  const listing = await input.prisma.listing.findFirst({
    where: {
      id: input.listingId,
      userId: input.userId,
    },
    select: { id: true },
  });

  if (!listing) {
    return blocked("LISTING_NOT_OWNED");
  }

  const link = await input.prisma.immoScout24DeObjectLink.findFirst({
    where: {
      userId: input.userId,
      listingId: input.listingId,
      connectionId: input.connectionId,
      externalObjectId: input.externalObjectId,
      status: "created",
    },
    select: { id: true },
  });

  if (!link) {
    return blocked("OBJECT_LINK_NOT_READY");
  }

  const images = await input.prisma.listingImage.findMany({
    where: { listingId: input.listingId },
    select: { id: true },
  });

  if (images.length === 0) {
    return blocked("LISTING_HAS_NO_IMAGES");
  }

  const uploads =
    await input.prisma.immoScout24DeImageUpload.findMany({
      where: { objectLinkId: link.id },
      select: {
        imageId: true,
        status: true,
        externalId: true,
        checksum: true,
        externalAttachmentId: true,
      },
    });

  // Exactly one confirmed upload for every current listing image.
  // No orphaned or additional upload records may be ignored.
  if (uploads.length !== images.length) {
    return blocked("IMAGE_UPLOAD_COUNT_MISMATCH");
  }

  const imageIds = new Set(images.map(image => image.id));
  const uploadsByImage = new Map(
    uploads.map(upload => [upload.imageId, upload])
  );

  if (
    imageIds.size !== images.length ||
    uploadsByImage.size !== uploads.length ||
    uploads.some(upload => !imageIds.has(upload.imageId))
  ) {
    return blocked("IMAGE_UPLOAD_MEMBERSHIP_MISMATCH");
  }

  const attachmentIds: string[] = [];
  const externalIds = new Set<string>();

  for (const image of images) {
    const upload = uploadsByImage.get(image.id);

    if (!upload || upload.status !== "verified") {
      return blocked("IMAGE_NOT_VERIFIED");
    }

    const attachmentId = upload.externalAttachmentId;

    if (
      !attachmentId ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(attachmentId) ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(upload.externalId) ||
      !/^[a-f0-9]{64}$/.test(upload.checksum)
    ) {
      return blocked("INVALID_VERIFIED_IMAGE_IDENTITY");
    }

    if (externalIds.has(upload.externalId)) {
      return blocked("DUPLICATE_EXTERNAL_IMAGE_ID");
    }

    externalIds.add(upload.externalId);
    attachmentIds.push(attachmentId);
  }

  if (new Set(attachmentIds).size !== attachmentIds.length) {
    return blocked("DUPLICATE_ATTACHMENT_ID");
  }

  return {
    status: "ready",
    imageCount: images.length,
    attachmentIds,
  };
}