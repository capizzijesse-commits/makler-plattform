import "server-only";

export type ImmoScout24DeImageObservationV1 = {
  externalId: string;
  checksum: string;
  attachmentId: string;
};

export type ImmoScout24DeImageReconciliationResultV1 =
  | {
      status: "verified";
      externalAttachmentId: string;
      retryUploadAllowed: false;
    }
  | {
      status: "unconfirmed";
      reason: string;
      retryUploadAllowed: false;
    };

function unconfirmed(
  reason: string
): ImmoScout24DeImageReconciliationResultV1 {
  return {
    status: "unconfirmed",
    reason,
    retryUploadAllowed: false,
  };
}

/**
 * Pure identity evaluator for NORMALIZED provider data.
 *
 * No HTTP, no database writes, no retries.
 * Caller must independently authenticate and validate
 * the provider response before constructing observations.
 *
 * A missing image never authorizes another POST.
 */
export function reconcileImmoScout24DeImageV1(input: {
  expectedExternalId: string;
  expectedChecksum: string;
  observations: ImmoScout24DeImageObservationV1[];
}): ImmoScout24DeImageReconciliationResultV1 {
  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(input.expectedExternalId) ||
    !/^[a-f0-9]{64}$/.test(input.expectedChecksum)
  ) {
    return unconfirmed("INVALID_EXPECTED_IDENTITY");
  }

  if (
    !Array.isArray(input.observations) ||
    input.observations.length > 100
  ) {
    return unconfirmed("INVALID_PROVIDER_OBSERVATIONS");
  }

  for (const item of input.observations) {
    if (
      !item ||
      typeof item.externalId !== "string" ||
      typeof item.checksum !== "string" ||
      typeof item.attachmentId !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(item.externalId) ||
      !/^[a-f0-9]{64}$/.test(item.checksum) ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(item.attachmentId)
    ) {
      return unconfirmed("INVALID_PROVIDER_OBSERVATIONS");
    }
  }

  const matchingId = input.observations.filter(
    (item) => item.externalId === input.expectedExternalId
  );

  if (matchingId.length === 0) {
    return unconfirmed("IMAGE_NOT_OBSERVED");
  }

  if (matchingId.length !== 1) {
    return unconfirmed("DUPLICATE_EXTERNAL_IMAGE_ID");
  }

  const image = matchingId[0];

  if (image.checksum !== input.expectedChecksum) {
    return unconfirmed("IMAGE_CHECKSUM_MISMATCH");
  }

  if (
    input.observations.some(
      (item) =>
        item.attachmentId === image.attachmentId &&
        item.externalId !== image.externalId
    )
  ) {
    return unconfirmed("ATTACHMENT_ID_NOT_UNIQUE");
  }

  return {
    status: "verified",
    externalAttachmentId: image.attachmentId,
    retryUploadAllowed: false,
  };
}