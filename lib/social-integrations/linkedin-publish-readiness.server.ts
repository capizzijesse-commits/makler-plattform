import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  isLinkedInOAuthConfigured,
} from "@/lib/social-integrations/linkedin-oauth.server";

import {
  isSocialCredentialEncryptionConfigured,
} from "@/lib/social-integrations/social-credential-crypto.server";

import {
  getSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";

import {
  isLinkedInPublishingEnabled,
} from "@/lib/social-integrations/social-publish-provider-gates.server";


export type LinkedInPublishReadinessIssueCode =
  | "CRON_SECRET_MISSING"
  | "QUEUE_DISABLED"
  | "WORKER_DISABLED"
  | "LINKEDIN_OAUTH_NOT_CONFIGURED"
  | "LINKEDIN_ENVIRONMENT_NOT_PRODUCTION"
  | "SOCIAL_CREDENTIAL_ENCRYPTION_NOT_CONFIGURED"
  | "NO_ELIGIBLE_LINKEDIN_CONNECTION"
  | "LINKEDIN_CREDENTIAL_MISSING"
  | "LINKEDIN_CREDENTIAL_UNREADABLE"
  | "LINKEDIN_CREDENTIAL_EXPIRY_UNKNOWN"
  | "LINKEDIN_CREDENTIAL_EXPIRY_INVALID"
  | "LINKEDIN_CREDENTIAL_EXPIRED"
  | "LINKEDIN_SCOPE_UNKNOWN"
  | "LINKEDIN_SCOPE_MISSING";


function enabled(
  name:
    string
):
  boolean {

  return (
    process.env[
      name
    ]?.trim() ===
    "1"
  );
}


function configured(
  name:
    string
):
  boolean {

  return Boolean(
    process.env[
      name
    ]?.trim()
  );
}


function linkedInEnvironment():
  "test" |
  "production" |
  "invalid" {

  const value =
    process.env
      .LINKEDIN_SOCIAL_ENVIRONMENT
      ?.trim() ||
    "test";

  if (
    value === "test" ||
    value === "production"
  ) {
    return value;
  }

  return "invalid";
}


export async function inspectLinkedInPublishReadiness(
  input?: {
    now?:
      Date;
  }
) {

  const now =
    input?.now ??
    new Date();

  const issues =
    new Set<
      LinkedInPublishReadinessIssueCode
    >();

  const gates = {
    queueEnabled:
      enabled(
        "SOCIAL_PUBLISH_QUEUE_ENABLED"
      ),

    workerEnabled:
      enabled(
        "SOCIAL_PUBLISH_WORKER_ENABLED"
      ),

    linkedInPublishingEnabled:
      isLinkedInPublishingEnabled(),
  };

  const cronSecretConfigured =
    configured(
      "CRON_SECRET"
    );

  const oauthConfigured =
    isLinkedInOAuthConfigured();

  const credentialEncryptionConfigured =
    isSocialCredentialEncryptionConfigured();

  const environment =
    linkedInEnvironment();


  if (!cronSecretConfigured) {
    issues.add(
      "CRON_SECRET_MISSING"
    );
  }

  if (!gates.queueEnabled) {
    issues.add(
      "QUEUE_DISABLED"
    );
  }

  if (!gates.workerEnabled) {
    issues.add(
      "WORKER_DISABLED"
    );
  }

  if (!oauthConfigured) {
    issues.add(
      "LINKEDIN_OAUTH_NOT_CONFIGURED"
    );
  }

  if (
    environment !== "production"
  ) {
    issues.add(
      "LINKEDIN_ENVIRONMENT_NOT_PRODUCTION"
    );
  }

  if (
    !credentialEncryptionConfigured
  ) {
    issues.add(
      "SOCIAL_CREDENTIAL_ENCRYPTION_NOT_CONFIGURED"
    );
  }


  const connections =
    await prisma.socialConnection.findMany({
      where: {
        provider:
          "linkedin",

        channel:
          "linkedin",

        environment:
          "production",

        status:
          "verified",
      },

      select: {
        id:
          true,

        userId:
          true,

        externalAccountId:
          true,

        user: {
          select: {
            plan:
              true,
          },
        },
      },

      orderBy: {
        createdAt:
          "asc",
      },

      take:
        200,
    });


  let eligiblePlanConnections =
    0;

  let credentialReady =
    0;

  let credentialMissing =
    0;

  let credentialUnreadable =
    0;

  let credentialExpiryUnknown =
    0;

  let credentialExpiryInvalid =
    0;

  let credentialExpired =
    0;

  let scopeUnknown =
    0;

  let scopeMissing =
    0;


  for (
    const connection of
    connections
  ) {

    const capabilities =
      getPlanCapabilities(
        connection.user.plan
      );

    if (
      !capabilities
        .canUsePublishingCenter
    ) {
      continue;
    }

    eligiblePlanConnections +=
      1;

    if (
      !credentialEncryptionConfigured
    ) {
      continue;
    }

    try {
      const credential =
        await getSocialOAuthCredential({
          userId:
            connection.userId,

          provider:
            "linkedin",

          externalSubjectId:
            connection.externalAccountId,

          environment:
            "production",
        });

      if (!credential) {
        credentialMissing +=
          1;

        issues.add(
          "LINKEDIN_CREDENTIAL_MISSING"
        );

        continue;
      }

      if (!credential.expiresAt) {
        credentialExpiryUnknown +=
          1;

        issues.add(
          "LINKEDIN_CREDENTIAL_EXPIRY_UNKNOWN"
        );

        continue;
      }

      const expiresAt =
        new Date(
          credential.expiresAt
        );

      if (
        Number.isNaN(
          expiresAt.getTime()
        )
      ) {
        credentialExpiryInvalid +=
          1;

        issues.add(
          "LINKEDIN_CREDENTIAL_EXPIRY_INVALID"
        );

        continue;
      }

      if (
        expiresAt.getTime() <=
          now.getTime()
      ) {
        credentialExpired +=
          1;

        issues.add(
          "LINKEDIN_CREDENTIAL_EXPIRED"
        );

        continue;
      }

      if (!credential.scopes) {
        scopeUnknown +=
          1;

        issues.add(
          "LINKEDIN_SCOPE_UNKNOWN"
        );

        continue;
      }

      if (
        !credential.scopes.includes(
          "w_member_social"
        )
      ) {
        scopeMissing +=
          1;

        issues.add(
          "LINKEDIN_SCOPE_MISSING"
        );

        continue;
      }

      credentialReady +=
        1;
    }
    catch {
      credentialUnreadable +=
        1;

      issues.add(
        "LINKEDIN_CREDENTIAL_UNREADABLE"
      );
    }
  }


  if (
    eligiblePlanConnections ===
    0
  ) {
    issues.add(
      "NO_ELIGIBLE_LINKEDIN_CONNECTION"
    );
  }


  return {
    safeToEnable:
      issues.size === 0,

    currentlyEnabled:
      gates.queueEnabled &&
      gates.workerEnabled &&
      gates.linkedInPublishingEnabled,

    gates,

    config: {
      cronSecretConfigured,

      oauthConfigured,

      credentialEncryptionConfigured,

      linkedInEnvironment:
        environment,
    },

    connections: {
      verifiedProduction:
        connections.length,

      eligiblePlan:
        eligiblePlanConnections,

      credentialReady,

      credentialMissing,

      credentialUnreadable,

      credentialExpiryUnknown,

      credentialExpiryInvalid,

      credentialExpired,

      scopeUnknown,

      scopeMissing,
    },

    issues:
      Array.from(
        issues
      ).sort(),
  };
}
