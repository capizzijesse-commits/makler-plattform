import "server-only";

/**
 * Sandbox image lookup readiness V1.
 *
 * Input must come from trusted server-side database
 * checks and the existing HTTP/XML lookup transport.
 *
 * A candidate is NOT an authenticated database
 * confirmation and NEVER enables publishing.
 */
export type ImmoScout24DeSandboxImageEvidenceV1 = {
  environment: string;
  connectionEnvironment: string;
  connectionStatus: string;
  lookupStatus: string;
  expectedExternalId: string;
  candidateExternalId: string | null;
  expectedChecksum: string;
  candidateChecksum: string | null;
};

export type ImmoScout24DeSandboxImageReadinessV1 =
  | {
      allowed: true;
      scope: "sandbox_image_lookup_candidate";
    }
  | {
      allowed: false;
      reason: string;
    };

export function assessImmoScout24DeSandboxImageReadinessV1(
  evidence: ImmoScout24DeSandboxImageEvidenceV1
): ImmoScout24DeSandboxImageReadinessV1 {
  if (
    evidence.environment !== "sandbox" ||
    evidence.connectionEnvironment !== "test"
  ) {
    return { allowed: false, reason: "SANDBOX_ONLY" };
  }

  if (
    evidence.connectionStatus !== "configured" &&
    evidence.connectionStatus !== "verified"
  ) {
    return {
      allowed: false,
      reason: "CONNECTION_NOT_CONFIGURED",
    };
  }

  if (evidence.lookupStatus !== "candidate") {
    return {
      allowed: false,
      reason: "LOOKUP_NOT_CONFIRMED",
    };
  }

  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(
      evidence.expectedExternalId
    ) ||
    evidence.candidateExternalId !==
      evidence.expectedExternalId
  ) {
    return {
      allowed: false,
      reason: "EXTERNAL_ID_MISMATCH",
    };
  }

  if (
    !/^[a-f0-9]{64}$/.test(
      evidence.expectedChecksum
    ) ||
    evidence.candidateChecksum !==
      evidence.expectedChecksum
  ) {
    return {
      allowed: false,
      reason: "CHECKSUM_MISMATCH",
    };
  }

  return {
    allowed: true,
    scope: "sandbox_image_lookup_candidate",
  };
}