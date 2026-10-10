import "server-only";

import { prisma } from "@/lib/prisma";

import {
  assessImmoScout24DeSandboxImageReadinessV1,
} from "./immoscout24-de-sandbox-image-readiness.server";

import {
  getImmoScout24DeSandboxAccess,
} from "./immoscout24-de-oauth-flow.server";

import {
  executeImmoScout24DeImageLookupV1,
} from "./immoscout24-de-image-lookup-transport.server";

export type ImmoScout24DeProtectedImageLookupResultV1 =
  | {
      status: "candidate";
      externalAttachmentId: string;
      externalId: string;
      checksum: string;
      realEstateId: string;
      authenticated: false;
      retryUploadAllowed: false;
    }
  | {
      status: "blocked";
      reason: string;
      retryUploadAllowed: false;
    };

function blocked(
  reason: string
): ImmoScout24DeProtectedImageLookupResultV1 {
  return {
    status: "blocked",
    reason,
    retryUploadAllowed: false,
  };
}

/**
 * Sandbox-only, read-only image lookup workflow.
 *
 * IMPORTANT:
 * - Must be called only after caller authentication.
 * - Does not accept caller-supplied credentials.
 * - Does not accept caller-supplied HTTP clients.
 * - Uses the stored sandbox OAuth credential.
 * - Never writes to PostgreSQL.
 * - Never returns "verified".
 * - Never authorizes a second upload POST.
 * - Not connected to a public API route or worker.
 */
export async function lookupImmoScout24DeImageProtectedV1(
  input: {
    userId: string;
    connectionId: string;
    objectLinkId: string;
    imageId: string;
  }
): Promise<ImmoScout24DeProtectedImageLookupResultV1> {
  if (
    !input.userId?.trim() ||
    !input.connectionId?.trim() ||
    !input.objectLinkId?.trim() ||
    !input.imageId?.trim()
  ) {
    return blocked("INVALID_LOOKUP_CONTEXT");
  }

  // Only this read-only sandbox lookup accepts configured.
  // Publishing and database confirmation guards are unchanged.
  const connection = await prisma.portalConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      portal: "immoscout24_de",
      environment: "test",
      status: { in: ["configured", "verified"] },
    },
    select: {
      status: true,
      environment: true,
    },
  });

  if (!connection) {
    return blocked("CONNECTION_NOT_CONFIGURED");
  }

  const objectLink =
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
        listingId: true,
        externalObjectId: true,
      },
    });

  if (
    !objectLink ||
    !objectLink.externalObjectId
  ) {
    return blocked("OBJECT_LINK_NOT_READY");
  }

  const listingImage =
    await prisma.listingImage.findFirst({
      where: {
        id: input.imageId,
        listingId: objectLink.listingId,
      },
      select: { id: true },
    });

  if (!listingImage) {
    return blocked("IMAGE_NOT_IN_LISTING");
  }

  const upload =
    await prisma.immoScout24DeImageUpload.findFirst({
      where: {
        objectLinkId: objectLink.id,
        imageId: listingImage.id,
        status: {
          in: ["http_accepted", "uncertain"],
        },
        externalAttachmentId: null,
      },
      select: {
        externalId: true,
        checksum: true,
      },
    });

  if (!upload) {
    return blocked("IMAGE_NOT_ELIGIBLE");
  }

  let access:
    Awaited<ReturnType<
      typeof getImmoScout24DeSandboxAccess
    >>;

  try {
    access = await getImmoScout24DeSandboxAccess(
      input.userId
    );
  } catch {
    return blocked("OAUTH_ACCESS_UNAVAILABLE");
  }

  if (
    !access ||
    access.userId !== input.userId ||
    !access.accessToken ||
    !access.accessTokenSecret
  ) {
    return blocked("OAUTH_ACCESS_UNAVAILABLE");
  }

  // The transport handles the sandbox OAuth request,
  // response size and XML validation.
  // This read-only workflow does NOT authenticate
  // provider evidence for database confirmation.
  let outcome:
    Awaited<ReturnType<
      typeof executeImmoScout24DeImageLookupV1
    >>;

  try {
    outcome = await executeImmoScout24DeImageLookupV1({
      realEstateId: objectLink.externalObjectId,
      externalId: upload.externalId,
      expectedChecksum: upload.checksum,
      accessToken: access.accessToken,
      accessTokenSecret: access.accessTokenSecret,
      httpClient: fetch,
    });
  } catch {
    return blocked("LOOKUP_EXECUTION_FAILED");
  }

  if (outcome.status !== "candidate") {
    return blocked(outcome.reason);
  }

  // The transport has already enforced the sandbox origin,
  // HTTP 200, safe XML and matching attachment identity.
  const readiness = assessImmoScout24DeSandboxImageReadinessV1({
    environment: "sandbox",
    connectionEnvironment: connection.environment,
    connectionStatus: connection.status,
    lookupStatus: outcome.status,
    expectedExternalId: upload.externalId,
    candidateExternalId: outcome.externalId,
    expectedChecksum: upload.checksum,
    candidateChecksum: outcome.checksum,
  });

  if (!readiness.allowed) {
    return blocked(readiness.reason);
  }

  return {
    status: "candidate",
    externalAttachmentId: outcome.attachmentId,
    externalId: outcome.externalId,
    checksum: outcome.checksum,
    realEstateId: objectLink.externalObjectId,
    authenticated: false,
    retryUploadAllowed: false,
  };
}