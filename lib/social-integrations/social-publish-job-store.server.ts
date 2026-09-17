import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  enabledSocialPublishTargets,
  isSocialPublishTargetEnabled,
} from "@/lib/social-integrations/social-publish-provider-gates.server";


export type SocialPublishJobStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "processing"
  | "published"
  | "failed"
  | "cancelled";


export type SocialPublishProvider =
  | "meta"
  | "linkedin"
  | "tiktok";


export type SocialPublishChannel =
  | "facebook_page"
  | "instagram_business"
  | "linkedin"
  | "tiktok";


export type SocialPublishEnvironment =
  | "test"
  | "production";


export type CreateSocialPublishJobInput = {
  userId:
    string;

  listingId?:
    string |
    null;

  connectionId:
    string;

  caption:
    string;

  mediaPayload?:
    Prisma.InputJsonValue |
    null;

  scheduledFor?:
    Date |
    null;

  idempotencyKey?:
    string;
};


function requiredText(
  value:
    string,
  label:
    string
):
  string {

  const cleaned =
    value.trim();

  if (!cleaned) {

    throw new Error(
      `${label} must not be empty.`
    );
  }

  return cleaned;
}


function optionalText(
  value:
    string |
    null |
    undefined
):
  string |
  null {

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return value.trim() ||
    null;
}


function normalizeScheduledFor(
  value:
    Date |
    null |
    undefined
):
  Date |
  null {

  if (!value) {
    return null;
  }

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    throw new Error(
      "Scheduled date is invalid."
    );
  }

  return value;
}


function initialStatus(
  scheduledFor:
    Date |
    null
):
  SocialPublishJobStatus {

  if (
    scheduledFor &&
    scheduledFor.getTime() >
      Date.now()
  ) {
    return "scheduled";
  }

  return "queued";
}


export async function createSocialPublishJob(
  input:
    CreateSocialPublishJobInput
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const connectionId =
    requiredText(
      input.connectionId,
      "Connection ID"
    );

  const caption =
    requiredText(
      input.caption,
      "Caption"
    );

  const listingId =
    optionalText(
      input.listingId
    );

  const scheduledFor =
    normalizeScheduledFor(
      input.scheduledFor
    );

  const idempotencyKey =
    optionalText(
      input.idempotencyKey
    ) ??
    randomUUID();


  const connection =
    await prisma.socialConnection.findFirst({
      where: {
        id:
          connectionId,

        userId,
      },

      select: {
        id:
          true,

        provider:
          true,

        channel:
          true,

        environment:
          true,

        externalAccountId:
          true,

        status:
          true,
      },
    });


  if (!connection) {

    throw new Error(
      "Social connection was not found."
    );
  }


  if (
    connection.status !==
      "verified"
  ) {

    throw new Error(
      "Social connection is not verified."
    );
  }


  if (
    !isSocialPublishTargetEnabled(
      connection.provider,
      connection.channel
    )
  ) {

    throw new Error(
      "Social provider publishing is disabled."
    );
  }


  if (listingId) {

    const listing =
      await prisma.listing.findFirst({
        where: {
          id:
            listingId,

          userId,
        },

        select: {
          id:
            true,
        },
      });


    if (!listing) {

      throw new Error(
        "Listing was not found."
      );
    }
  }


  const status =
    initialStatus(
      scheduledFor
    );


  return prisma.socialPublishJob.create({
    data: {
      userId,

      listingId,

      connectionId:
        connection.id,

      provider:
        connection.provider,

      channel:
        connection.channel,

      environment:
        connection.environment,

      externalAccountId:
        connection.externalAccountId,

      caption,

      mediaPayload:
        input.mediaPayload ===
          null ||
        input.mediaPayload ===
          undefined
          ? Prisma.JsonNull
          : input.mediaPayload,

      status,

      scheduledFor,

      idempotencyKey,

      nextAttemptAt:
        status ===
        "queued"
          ? new Date()
          : scheduledFor,
    },

    select: {
      id:
        true,

      listingId:
        true,

      connectionId:
        true,

      provider:
        true,

      channel:
        true,

      environment:
        true,

      externalAccountId:
        true,

      caption:
        true,

      mediaPayload:
        true,

      status:
        true,

      scheduledFor:
        true,

      idempotencyKey:
        true,

      attemptCount:
        true,

      maxAttempts:
        true,

      nextAttemptAt:
        true,

      externalPostId:
        true,

      externalPostUrl:
        true,

      publishedAt:
        true,

      failedAt:
        true,

      errorCode:
        true,

      errorMessage:
        true,

      createdAt:
        true,

      updatedAt:
        true,
    },
  });
}


export async function listSocialPublishJobs(
  input: {
    userId:
      string;

    status?:
      SocialPublishJobStatus;

    limit?:
      number;
  }
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const limit =
    Math.max(
      1,
      Math.min(
        input.limit ??
          50,
        100
      )
    );


  return prisma.socialPublishJob.findMany({
    where: {
      userId,

      ...(input.status
        ? {
            status:
              input.status,
          }
        : {}),
    },

    orderBy: {
      createdAt:
        "desc",
    },

    take:
      limit,

    select: {
      id:
        true,

      listingId:
        true,

      connectionId:
        true,

      provider:
        true,

      channel:
        true,

      environment:
        true,

      externalAccountId:
        true,

      caption:
        true,

      mediaPayload:
        true,

      status:
        true,

      scheduledFor:
        true,

      attemptCount:
        true,

      maxAttempts:
        true,

      nextAttemptAt:
        true,

      lastAttemptAt:
        true,

      externalPostId:
        true,

      externalPostUrl:
        true,

      publishedAt:
        true,

      failedAt:
        true,

      errorCode:
        true,

      errorMessage:
        true,

      createdAt:
        true,

      updatedAt:
        true,
    },
  });
}


export async function listSocialPublishJobsRequiringReconciliation(
  input: {
    userId:
      string;

    limit?:
      number;
  }
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const limit =
    Math.max(
      1,
      Math.min(
        input.limit ??
          50,
        100
      )
    );


  return prisma.socialPublishJob.findMany({
    where: {
      userId,

      providerOperationState:
        "reconciliation_required",
    },

    orderBy: {
      updatedAt:
        "desc",
    },

    take:
      limit,

    select: {
      id:
        true,

      listingId:
        true,

      connectionId:
        true,

      provider:
        true,

      channel:
        true,

      environment:
        true,

      externalAccountId:
        true,

      caption:
        true,

      status:
        true,

      attemptCount:
        true,

      maxAttempts:
        true,

      externalPostId:
        true,

      externalPostUrl:
        true,

      errorCode:
        true,

      errorMessage:
        true,

      providerOperationId:
        true,

      providerOperationType:
        true,

      providerOperationState:
        true,

      providerOperationUpdatedAt:
        true,

      createdAt:
        true,

      updatedAt:
        true,
    },
  });
}


export type SocialPublishReconciliationResolution =
  | "confirmed_published"
  | "confirmed_not_published";


export async function resolveSocialPublishReconciliation(
  input: {
    userId:
      string;

    jobId:
      string;

    resolution:
      SocialPublishReconciliationResolution;

    resolvedAt?:
      Date;
  }
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const jobId =
    requiredText(
      input.jobId,
      "Job ID"
    );

  const resolution =
    input.resolution;

  if (
    resolution !==
      "confirmed_published" &&
    resolution !==
      "confirmed_not_published"
  ) {

    throw new Error(
      "Invalid reconciliation resolution."
    );
  }


  const resolvedAt =
    input.resolvedAt ??
    new Date();


  if (
    Number.isNaN(
      resolvedAt.getTime()
    )
  ) {

    throw new Error(
      "Resolution date is invalid."
    );
  }


  /*
   * Nur ein tatsächlich quarantinierter,
   * bereits freigegebener Job darf manuell
   * aufgelöst werden.
   *
   * Wichtig:
   * - userId schützt fremde Jobs.
   * - failed schützt gegen Parallelzustände.
   * - reconciliation_required verhindert
   *   doppeltes Auflösen.
   * - nextAttemptAt=null verhindert,
   *   dass ein noch retry-fähiger Job
   *   versehentlich manuell überschrieben wird.
   * - kein Worker-Lock darf aktiv sein.
   */
  const result =
    await prisma.socialPublishJob.updateMany({
      where: {
        id:
          jobId,

        userId,

        status:
          "failed",

        providerOperationState:
          "reconciliation_required",

        nextAttemptAt:
          null,

        lockedAt:
          null,

        lockedBy:
          null,
      },

      data:
        resolution ===
        "confirmed_published"
          ? {
              status:
                "published",

              publishedAt:
                resolvedAt,

              failedAt:
                null,

              errorCode:
                null,

              errorMessage:
                null,

              nextAttemptAt:
                null,

              lockedAt:
                null,

              lockedBy:
                null,

              providerOperationState:
                "reconciled_published",

              providerOperationUpdatedAt:
                resolvedAt,
            }
          : {
              status:
                "failed",

              publishedAt:
                null,

              failedAt:
                resolvedAt,

              errorCode:
                "MANUALLY_RECONCILED_NOT_PUBLISHED",

              errorMessage:
                "User confirmed that the provider operation did not result in a published post.",

              nextAttemptAt:
                null,

              lockedAt:
                null,

              lockedBy:
                null,

              providerOperationState:
                "reconciled_not_published",

              providerOperationUpdatedAt:
                resolvedAt,
            },
    });


  if (
    result.count !==
    1
  ) {

    return null;
  }


  return prisma.socialPublishJob.findFirst({
    where: {
      id:
        jobId,

      userId,
    },

    select: {
      id:
        true,

      provider:
        true,

      channel:
        true,

      environment:
        true,

      status:
        true,

      externalPostId:
        true,

      externalPostUrl:
        true,

      publishedAt:
        true,

      failedAt:
        true,

      errorCode:
        true,

      errorMessage:
        true,

      nextAttemptAt:
        true,

      lockedAt:
        true,

      lockedBy:
        true,

      providerOperationId:
        true,

      providerOperationType:
        true,

      providerOperationState:
        true,

      providerOperationUpdatedAt:
        true,

      updatedAt:
        true,
    },
  });
}


export async function cancelSocialPublishJob(
  input: {
    userId:
      string;

    jobId:
      string;
  }
):
  Promise<boolean> {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const jobId =
    requiredText(
      input.jobId,
      "Job ID"
    );


  const result =
    await prisma.socialPublishJob.updateMany({
      where: {
        id:
          jobId,

        userId,

        status: {
          in: [
            "draft",
            "scheduled",
            "queued",
          ],
        },
      },

      data: {
        status:
          "cancelled",

        nextAttemptAt:
          null,

        lockedAt:
          null,

        lockedBy:
          null,
      },
    });


  return result.count >
    0;
}


export async function setSocialPublishProviderOperation(
  input: {
    jobId:
      string;

    workerId:
      string;

    operationId?:
      string |
      null;

    operationType?:
      string |
      null;

    operationState:
      string;

    externalPostId?:
      string |
      null;

    updatedAt?:
      Date;
  }
) {

  const jobId =
    requiredText(
      input.jobId,
      "Job ID"
    );

  const workerId =
    requiredText(
      input.workerId,
      "Worker ID"
    );

  const operationState =
    requiredText(
      input.operationState,
      "Provider operation state"
    );


  return prisma.socialPublishJob.updateMany({
    where: {
      id:
        jobId,

      status:
        "processing",

      lockedBy:
        workerId,
    },

    data: {
      ...(input.operationId !==
      undefined
        ? {
            providerOperationId:
              optionalText(
                input.operationId
              ),
          }
        : {}),

      ...(input.operationType !==
      undefined
        ? {
            providerOperationType:
              optionalText(
                input.operationType
              ),
          }
        : {}),

      ...(input.externalPostId !==
      undefined
        ? {
            externalPostId:
              optionalText(
                input.externalPostId
              ),
          }
        : {}),

      providerOperationState:
        operationState,

      providerOperationUpdatedAt:
        input.updatedAt ??
        new Date(),
    },
  });
}


const SOCIAL_PUBLISH_LOCK_TTL_MS =
  10 * 60_000;


export async function recoverStaleSocialPublishJobs(
  input?: {
    now?:
      Date;

    lockTtlMs?:
      number;
  }
) {

  const now =
    input?.now ??
    new Date();

  const requestedLockTtlMs =
    input?.lockTtlMs ??
    SOCIAL_PUBLISH_LOCK_TTL_MS;

  const lockTtlMs =
    Math.max(
      60_000,
      Math.min(
        requestedLockTtlMs,
        60 * 60_000
      )
    );

  const staleBefore =
    new Date(
      now.getTime() -
      lockTtlMs
    );


  /*
   * Versuchslimit noch nicht erreicht:
   * abgestürzten Job freigeben und
   * sofort wieder retry-fähig machen.
   */
  const retryable =
    await prisma.socialPublishJob.updateMany({
      where: {
        status:
          "processing",

        attemptCount: {
          lt:
            prisma.socialPublishJob.fields.maxAttempts,
        },

        OR: [
          {
            lockedAt: {
              lte:
                staleBefore,
            },
          },

          {
            lockedAt:
              null,
          },
        ],
      },

      data: {
        status:
          "failed",

        failedAt:
          now,

        errorCode:
          "WORKER_LOCK_STALE",

        errorMessage:
          "Worker lock expired before the publish job completed.",

        nextAttemptAt:
          now,

        lockedAt:
          null,

        lockedBy:
          null,
      },
    });


  /*
   * Versuchslimit bereits erreicht:
   * terminal failed, kein weiterer Retry.
   */
  const exhausted =
    await prisma.socialPublishJob.updateMany({
      where: {
        status:
          "processing",

        attemptCount: {
          gte:
            prisma.socialPublishJob.fields.maxAttempts,
        },

        OR: [
          {
            lockedAt: {
              lte:
                staleBefore,
            },
          },

          {
            lockedAt:
              null,
          },
        ],
      },

      data: {
        status:
          "failed",

        failedAt:
          now,

        errorCode:
          "WORKER_LOCK_STALE",

        errorMessage:
          "Worker lock expired after the maximum publish attempts were reached.",

        nextAttemptAt:
          null,

        lockedAt:
          null,

        lockedBy:
          null,
      },
    });


  return {
    retryable:
      retryable.count,

    exhausted:
      exhausted.count,

    total:
      retryable.count +
      exhausted.count,
  };
}


export async function claimDueSocialPublishJobs(
  input: {
    workerId:
      string;

    limit?:
      number;

    now?:
      Date;
  }
) {

  const workerId =
    requiredText(
      input.workerId,
      "Worker ID"
    );

  const now =
    input.now ??
    new Date();

  const limit =
    Math.max(
      1,
      Math.min(
        input.limit ??
          10,
        25
      )
    );


  const enabledTargets =
    enabledSocialPublishTargets();


  if (
    enabledTargets.length ===
    0
  ) {
    return [];
  }


  const enabledTargetWhere =
    enabledTargets.map(
      target => ({
        provider:
          target.provider,

        channel:
          target.channel,
      })
    );


  /*
   * Vor jedem Claim verwaiste
   * processing-Locks freigeben.
   */
  await recoverStaleSocialPublishJobs({
    now,
  });


  const candidates =
    await prisma.socialPublishJob.findMany({
      where: {
        OR:
          enabledTargetWhere,

        status: {
          in: [
            "scheduled",
            "queued",
            "failed",
          ],
        },

        /*
         * Jeder Job besitzt sein eigenes Retry-Limit.
         * Keine fest verdrahtete 3 mehr.
         */
        attemptCount: {
          lt:
            prisma.socialPublishJob.fields.maxAttempts,
        },

        /*
         * null bedeutet:
         * aktuell kein weiterer Versuch geplant.
         */
        nextAttemptAt: {
          lte:
            now,
        },

        AND: [
          {
            OR: [
              {
                scheduledFor: {
                  lte:
                    now,
                },
              },

              {
                scheduledFor:
                  null,
              },
            ],
          },
        ],

        lockedAt:
          null,
      },

      orderBy: [
        {
          scheduledFor:
            "asc",
        },

        {
          createdAt:
            "asc",
        },
      ],

      take:
        limit,

      select: {
        id:
          true,
      },
    });


  const claimed:
    string[] =
      [];


  for (
    const candidate of
    candidates
  ) {

    const result =
      await prisma.socialPublishJob.updateMany({
        where: {
          id:
            candidate.id,

          OR:
            enabledTargetWhere,

          lockedAt:
            null,

          status: {
            in: [
              "scheduled",
              "queued",
              "failed",
            ],
          },

          /*
           * Zwischen Candidate-Select und Lock
           * nochmals alle kritischen Bedingungen
           * atomar prüfen.
           */
          attemptCount: {
            lt:
              prisma.socialPublishJob.fields.maxAttempts,
          },

          nextAttemptAt: {
            lte:
              now,
          },

          AND: [
            {
              OR: [
                {
                  scheduledFor: {
                    lte:
                      now,
                  },
                },

                {
                  scheduledFor:
                    null,
                },
              ],
            },
          ],
        },

        data: {
          status:
            "processing",

          lockedAt:
            now,

          lockedBy:
            workerId,

          lastAttemptAt:
            now,

          attemptCount: {
            increment:
              1,
          },
        },
      });


    if (
      result.count ===
      1
    ) {
      claimed.push(
        candidate.id
      );
    }
  }


  if (
    claimed.length ===
    0
  ) {
    return [];
  }


  return prisma.socialPublishJob.findMany({
    where: {
      id: {
        in:
          claimed,
      },

      lockedBy:
        workerId,

      status:
        "processing",
    },

    orderBy: {
      createdAt:
        "asc",
    },
  });
}


export async function markSocialPublishJobPublished(
  input: {
    jobId:
      string;

    workerId:
      string;

    externalPostId?:
      string |
      null;

    externalPostUrl?:
      string |
      null;
  }
) {

  const jobId =
    requiredText(
      input.jobId,
      "Job ID"
    );

  const workerId =
    requiredText(
      input.workerId,
      "Worker ID"
    );


  return prisma.socialPublishJob.updateMany({
    where: {
      id:
        jobId,

      status:
        "processing",

      lockedBy:
        workerId,
    },

    data: {
      status:
        "published",

      externalPostId:
        optionalText(
          input.externalPostId
        ),

      externalPostUrl:
        optionalText(
          input.externalPostUrl
        ),

      publishedAt:
        new Date(),

      failedAt:
        null,

      errorCode:
        null,

      errorMessage:
        null,

      nextAttemptAt:
        null,

      lockedAt:
        null,

      lockedBy:
        null,
    },
  });
}


export async function markSocialPublishJobFailed(
  input: {
    jobId:
      string;

    workerId:
      string;

    errorCode:
      string;

    errorMessage:
      string;

    retryAt?:
      Date |
      null;
  }
) {

  const jobId =
    requiredText(
      input.jobId,
      "Job ID"
    );

  const workerId =
    requiredText(
      input.workerId,
      "Worker ID"
    );

  const errorCode =
    requiredText(
      input.errorCode,
      "Error code"
    );

  const errorMessage =
    requiredText(
      input.errorMessage,
      "Error message"
    );


  const job =
    await prisma.socialPublishJob.findFirst({
      where: {
        id:
          jobId,

        status:
          "processing",

        lockedBy:
          workerId,
      },

      select: {
        id:
          true,

        attemptCount:
          true,

        maxAttempts:
          true,
      },
    });


  if (!job) {
    return {
      count:
        0,
    };
  }


  const exhausted =
    job.attemptCount >=
    job.maxAttempts;


  /*
   * Ownership auch beim finalen Update
   * nochmals atomar prüfen.
   *
   * Falls zwischen Read und Write bereits
   * eine Stale-Lock-Recovery stattgefunden
   * hat, darf der alte Worker den Job nicht
   * mehr verändern.
   */
  return prisma.socialPublishJob.updateMany({
    where: {
      id:
        job.id,

      status:
        "processing",

      lockedBy:
        workerId,

      attemptCount:
        job.attemptCount,

      maxAttempts:
        job.maxAttempts,
    },

    data: {
      status:
        "failed",

      failedAt:
        new Date(),

      errorCode,

      errorMessage,

      nextAttemptAt:
        exhausted
          ? null
          : input.retryAt ??
            null,

      lockedAt:
        null,

      lockedBy:
        null,
    },
  });
}


export async function getSocialPublishJobByIdempotencyKey(
  input: {
    userId:
      string;

    idempotencyKey:
      string;
  }
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const idempotencyKey =
    requiredText(
      input.idempotencyKey,
      "Idempotency key"
    );


  return prisma.socialPublishJob.findFirst({
    where: {
      userId,
      idempotencyKey,
    },

    select: {
      id:
        true,

      listingId:
        true,

      connectionId:
        true,

      provider:
        true,

      channel:
        true,

      environment:
        true,

      externalAccountId:
        true,

      caption:
        true,

      mediaPayload:
        true,

      status:
        true,

      scheduledFor:
        true,

      attemptCount:
        true,

      maxAttempts:
        true,

      nextAttemptAt:
        true,

      lastAttemptAt:
        true,

      externalPostId:
        true,

      externalPostUrl:
        true,

      publishedAt:
        true,

      failedAt:
        true,

      errorCode:
        true,

      errorMessage:
        true,

      createdAt:
        true,

      updatedAt:
        true,
    },
  });
}
