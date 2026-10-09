import "server-only";

import { prisma } from "@/lib/prisma";

import {
  checkImmoScout24DeImageConnectionV1,
} from "./immoscout24-de-image-connection-guard.server";

import {
  lookupImmoScout24DeImageProtectedV1,
} from "./immoscout24-de-image-lookup-workflow.server";

export type ImmoScout24DeSandboxConfirmationResultV1 =
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
): ImmoScout24DeSandboxConfirmationResultV1 {
  return {
    status: "blocked",
    reason,
    retryUploadAllowed: false,
  };
}

/**
 * SANDBOX CONFIRMATION - ISOLATED INTEGRATION STAGE.
 *
 * - Not connected to API routes or publishing workers.
 * - Disabled when NODE_ENV is production.
 * - No injected HTTP client, tokens or observations.
 * - Performs a fresh protected OAuth lookup.
 * - Rechecks connection and object-link ownership.
 * - Uses compare-and-swap for the exact image identity.
 * - Never starts or retries an upload.
 *
 * The calling server must derive userId from its
 * authenticated session, never from untrusted input.
 */
export async function confirmImmoScout24DeImageSandboxV1(
  input: {
    userId: string;
    connectionId: string;
    objectLinkId: string;
    imageId: string;
  }
): Promise<ImmoScout24DeSandboxConfirmationResultV1> {
  if (process.env.NODE_ENV === "production") {
    return blocked("SANDBOX_CONFIRMATION_PRODUCTION_DISABLED");
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
      prisma,
      userId: input.userId,
      connectionId: input.connectionId,
    });

  if (!connection.allowed) {
    return blocked(connection.reason);
  }

  const originalLink =
    await prisma.immoScout24DeObjectLink.findFirst({
      where: {
        id: input.objectLinkId,
        userId: input.userId,
        connectionId: input.connectionId,
        status: "created",
        externalObjectId: { not: null },
      },
      select: {
        id: true,
        externalObjectId: true,
      },
    });

  if (!originalLink?.externalObjectId) {
    return blocked("OBJECT_LINK_NOT_READY");
  }

  const original =
    await prisma.immoScout24DeImageUpload.findFirst({
      where: {
        objectLinkId: input.objectLinkId,
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

  if (!original) {
    return blocked("IMAGE_NOT_ELIGIBLE");
  }

  // The protected lookup rechecks object ownership,
  // listing-image membership and stored OAuth access.
  // It uses the built-in fetch, not caller-supplied HTTP.
  const lookup =
    await lookupImmoScout24DeImageProtectedV1(input);

  if (lookup.status !== "candidate") {
    return blocked(
      lookup.status === "blocked"
        ? lookup.reason
        : "LOOKUP_UNCONFIRMED"
    );
  }

  // Bind the provider lookup to the exact original
  // upload identity and external real-estate object.
  if (
    lookup.externalId !== original.externalId ||
    lookup.checksum !== original.checksum ||
    lookup.realEstateId !== originalLink.externalObjectId
  ) {
    return blocked("LOOKUP_IDENTITY_CHANGED");
  }

  // Avoid using an observation supplied by the caller.
  // The attachment ID came from the fresh protected lookup.
  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(
      lookup.externalAttachmentId
    )
  ) {
    return blocked("ATTACHMENT_ID_INVALID");
  }

  // Recheck the permission boundary after the network call.
  const currentConnection =
    await checkImmoScout24DeImageConnectionV1({
      prisma,
      userId: input.userId,
      connectionId: input.connectionId,
    });

  if (!currentConnection.allowed) {
    return blocked(currentConnection.reason);
  }

  const currentLink =
    await prisma.immoScout24DeObjectLink.findFirst({
      where: {
        id: input.objectLinkId,
        userId: input.userId,
        connectionId: input.connectionId,
        status: "created",
        externalObjectId: { not: null },
      },
      select: {
        id: true,
        externalObjectId: true,
      },
    });

  if (
    !currentLink ||
    currentLink.externalObjectId !== originalLink.externalObjectId
  ) {
    return blocked("OBJECT_LINK_IDENTITY_CHANGED");
  }

  // The identity cannot change between the initial
  // read, the portal lookup and the final update.
  let updated: { count: number };

  try {
    updated =
      await prisma.immoScout24DeImageUpload.updateMany({
        where: {
          id: original.id,
          objectLinkId: input.objectLinkId,
          objectLink: {
            is: {
              id: input.objectLinkId,
              userId: input.userId,
              connectionId: input.connectionId,
              status: "created",
              externalObjectId: originalLink.externalObjectId,
            },
          },
          imageId: input.imageId,
          externalId: original.externalId,
          checksum: original.checksum,
          externalAttachmentId: null,
          status: {
            in: ["http_accepted", "uncertain"],
          },
        },
        data: {
          status: "verified",
          externalAttachmentId:
            lookup.externalAttachmentId,
          lastErrorCode: null,
          lastCheckedAt: new Date(),
        },
      });
  } catch {
    return blocked("IMAGE_CONFIRMATION_WRITE_FAILED");
  }

  if (updated.count !== 1) {
    return blocked("IMAGE_CONFIRMATION_CONFLICT");
  }

  return {
    status: "verified",
    externalAttachmentId:
      lookup.externalAttachmentId,
    retryUploadAllowed: false,
  };
}