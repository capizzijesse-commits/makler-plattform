import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  inspectSocialPublishActivationGuard,
} from "@/lib/social-integrations/social-publish-activation-guard.server";

import {
  isMetaOAuthConfigured,
} from "@/lib/social-integrations/meta-oauth.server";

import {
  isSocialCredentialEncryptionConfigured,
} from "@/lib/social-integrations/social-credential-crypto.server";

import {
  getSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";


const SOCIAL_PUBLISH_LOCK_TTL_MS =
  10 * 60_000;


export type SocialPublishReadinessIssueCode =
  | "CRON_SECRET_MISSING"
  | "META_OAUTH_NOT_CONFIGURED"
  | "SOCIAL_CREDENTIAL_ENCRYPTION_NOT_CONFIGURED"
  | "META_ENVIRONMENT_NOT_PRODUCTION"
  | "ACTIVATION_GUARD_BLOCKED"
  | "RECONCILIATION_REQUIRED"
  | "NON_PRODUCTION_DUE_JOBS"
  | "UNSUPPORTED_DUE_JOBS"
  | "DUE_BACKLOG_TOO_LARGE"
  | "NO_ELIGIBLE_PRODUCTION_CONNECTION"
  | "CONNECTION_PARENT_PAGE_MISSING"
  | "META_CREDENTIAL_MISSING"
  | "META_CREDENTIAL_UNREADABLE"
  | "META_CREDENTIAL_EXPIRY_UNKNOWN"
  | "META_CREDENTIAL_EXPIRY_INVALID"
  | "META_CREDENTIAL_EXPIRED"
  | "META_CREDENTIAL_SCOPES_UNKNOWN"
  | "META_FACEBOOK_SCOPE_MISSING"
  | "META_INSTAGRAM_SCOPE_MISSING";


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


function metaEnvironment():
  "test" |
  "production" |
  "invalid" {

  const value =
    process.env
      .META_SOCIAL_ENVIRONMENT
      ?.trim() ||
    "test";


  if (
    value ===
    "test" ||
    value ===
    "production"
  ) {
    return value;
  }


  return "invalid";
}


export async function inspectSocialPublishReadiness(
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
      SocialPublishReadinessIssueCode
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

    metaPublishingEnabled:
      enabled(
        "META_PUBLISHING_ENABLED"
      ),
  };


  const cronSecretConfigured =
    configured(
      "CRON_SECRET"
    );

  const metaOAuthConfigured =
    isMetaOAuthConfigured();

  const credentialEncryptionConfigured =
    isSocialCredentialEncryptionConfigured();

  const environment =
    metaEnvironment();


  if (
    !cronSecretConfigured
  ) {
    issues.add(
      "CRON_SECRET_MISSING"
    );
  }


  if (
    !metaOAuthConfigured
  ) {
    issues.add(
      "META_OAUTH_NOT_CONFIGURED"
    );
  }


  if (
    !credentialEncryptionConfigured
  ) {
    issues.add(
      "SOCIAL_CREDENTIAL_ENCRYPTION_NOT_CONFIGURED"
    );
  }


  if (
    environment !==
    "production"
  ) {
    issues.add(
      "META_ENVIRONMENT_NOT_PRODUCTION"
    );
  }


  const activationGuard =
    await inspectSocialPublishActivationGuard({
      now,
    });


  if (
    !activationGuard.ready
  ) {
    issues.add(
      "ACTIVATION_GUARD_BLOCKED"
    );
  }


  const staleBefore =
    new Date(
      now.getTime() -
      SOCIAL_PUBLISH_LOCK_TTL_MS
    );


  const dueWhere =
    {
      OR: [
        {
          status: {
            in: [
              "queued",
              "scheduled",
              "failed",
            ],
          },

          nextAttemptAt: {
            lte:
              now,
          },
        },

        {
          status:
            "processing",

          lockedAt: {
            lte:
              staleBefore,
          },
        },
      ],
    } satisfies
      Prisma.SocialPublishJobWhereInput;


  const [
    dueJobs,
    reconciliationRequired,
    nonProductionDueJobs,
    unsupportedDueJobs,
    productionConnections,
  ] =
    await Promise.all([
      prisma.socialPublishJob.count({
        where:
          dueWhere,
      }),

      prisma.socialPublishJob.count({
        where: {
          providerOperationState:
            "reconciliation_required",
        },
      }),

      prisma.socialPublishJob.count({
        where: {
          AND: [
            dueWhere,

            {
              environment: {
                not:
                  "production",
              },
            },
          ],
        },
      }),

      prisma.socialPublishJob.count({
        where: {
          AND: [
            dueWhere,

            {
              OR: [
                {
                  provider: {
                    not:
                      "meta",
                  },
                },

                {
                  channel: {
                    notIn: [
                      "instagram_business",
                      "facebook_page",
                    ],
                  },
                },
              ],
            },
          ],
        },
      }),

      prisma.socialConnection.findMany({
        where: {
          provider:
            "meta",

          channel: {
            in: [
              "instagram_business",
              "facebook_page",
            ],
          },

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

          channel:
            true,

          externalAccountId:
            true,

          externalParentId:
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
      }),
    ]);


  if (
    reconciliationRequired >
    0
  ) {
    issues.add(
      "RECONCILIATION_REQUIRED"
    );
  }


  if (
    nonProductionDueJobs >
    0
  ) {
    issues.add(
      "NON_PRODUCTION_DUE_JOBS"
    );
  }


  if (
    unsupportedDueJobs >
    0
  ) {
    issues.add(
      "UNSUPPORTED_DUE_JOBS"
    );
  }


  if (
    dueJobs >
    200
  ) {
    issues.add(
      "DUE_BACKLOG_TOO_LARGE"
    );
  }


  let eligiblePlanConnections =
    0;

  let parentPageMissing =
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

  let credentialScopesUnknown =
    0;

  let facebookScopeMissing =
    0;

  let instagramScopeMissing =
    0;


  for (
    const connection of
    productionConnections
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


    const parentPageId =
      connection.channel ===
      "facebook_page"
        ? connection
            .externalAccountId
            ?.trim() ||
          ""
        : connection
            .externalParentId
            ?.trim() ||
          "";


    if (
      !parentPageId
    ) {

      parentPageMissing +=
        1;

      issues.add(
        "CONNECTION_PARENT_PAGE_MISSING"
      );

      continue;
    }


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
            "meta",

          externalSubjectId:
            parentPageId,

          environment:
            "production",
        });


      if (
        !credential
      ) {

        credentialMissing +=
          1;

        issues.add(
          "META_CREDENTIAL_MISSING"
        );

        continue;
      }


      if (
        !credential.expiresAt
      ) {

        credentialExpiryUnknown +=
          1;

        issues.add(
          "META_CREDENTIAL_EXPIRY_UNKNOWN"
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
          "META_CREDENTIAL_EXPIRY_INVALID"
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
          "META_CREDENTIAL_EXPIRED"
        );

        continue;
      }


      const scopes =
        new Set(
          (
            credential.scopes ??
            []
          )
            .map(
              scope =>
                scope.trim()
            )
            .filter(
              Boolean
            )
        );


      if (
        scopes.size ===
        0
      ) {

        credentialScopesUnknown +=
          1;

        issues.add(
          "META_CREDENTIAL_SCOPES_UNKNOWN"
        );

        continue;
      }


      if (
        connection.channel ===
          "facebook_page" &&
        !scopes.has(
          "pages_manage_posts"
        )
      ) {

        facebookScopeMissing +=
          1;

        issues.add(
          "META_FACEBOOK_SCOPE_MISSING"
        );

        continue;
      }


      if (
        connection.channel ===
          "instagram_business" &&
        !scopes.has(
          "instagram_content_publish"
        )
      ) {

        instagramScopeMissing +=
          1;

        issues.add(
          "META_INSTAGRAM_SCOPE_MISSING"
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
        "META_CREDENTIAL_UNREADABLE"
      );
    }
  }


  if (
    eligiblePlanConnections ===
    0
  ) {
    issues.add(
      "NO_ELIGIBLE_PRODUCTION_CONNECTION"
    );
  }


  const activationBlockerCodes =
    Array.from(
      new Set(
        activationGuard
          .blockers
          .map(
            blocker =>
              blocker.code
          )
      )
    );


  return {
    safeToActivate:
      issues.size ===
      0,

    currentlyEnabled:
      gates.queueEnabled &&
      gates.workerEnabled &&
      gates.metaPublishingEnabled,

    gates,

    config: {
      cronSecretConfigured,

      metaOAuthConfigured,

      credentialEncryptionConfigured,

      metaEnvironment:
        environment,

      activationAt:
        activationGuard
          .activationAt,
    },

    activationGuard: {
      ready:
        activationGuard.ready,

      blockerCodes:
        activationBlockerCodes,
    },

    backlog: {
      dueJobs,

      reconciliationRequired,

      nonProductionDueJobs,

      unsupportedDueJobs,
    },

    connections: {
      verifiedProductionInstagram:
        productionConnections.filter(
          connection =>
            connection.channel ===
            "instagram_business"
        ).length,

      verifiedProductionFacebook:
        productionConnections.filter(
          connection =>
            connection.channel ===
            "facebook_page"
        ).length,

      eligiblePlan:
        eligiblePlanConnections,

      parentPageMissing,

      credentialReady,

      credentialMissing,

      credentialUnreadable,

      credentialExpiryUnknown,

      credentialExpiryInvalid,

      credentialExpired,

      credentialScopesUnknown,

      facebookScopeMissing,

      instagramScopeMissing,
    },

    issues:
      Array.from(
        issues
      ).sort(),
  };
}