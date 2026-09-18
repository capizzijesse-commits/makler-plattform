import "server-only";

import {
  createHash,
} from "node:crypto";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";


export type PortalPublishJobStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";


export type PortalPublishAction =
  | "publish"
  | "update"
  | "unpublish"
  | "sync";


export type CreatePortalPublishJobInput = {
  userId:
    string;

  listingId:
    string;

  connectionId:
    string;

  action?:
    PortalPublishAction;

  externalObjectId?:
    string |
    null;

  payloadSnapshot?:
    Prisma.InputJsonValue |
    null;

  scheduledFor?:
    Date |
    null;

  idempotencyKey?:
    string;

  maxAttempts?:
    number;
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


function canonicalizeJson(
  value:
    unknown
):
  unknown {

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      canonicalizeJson
    );
  }

  const source =
    value as
      Record<
        string,
        unknown
      >;

  const result:
    Record<
      string,
      unknown
    > =
      {};

  for (
    const key of
    Object.keys(source).sort()
  ) {
    result[key] =
      canonicalizeJson(
        source[key]
      );
  }

  return result;
}


function fingerprintPayload(
  value:
    Prisma.InputJsonValue |
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

  const canonical =
    JSON.stringify(
      canonicalizeJson(
        value
      )
    );

  return createHash(
    "sha256"
  )
    .update(
      canonical
    )
    .digest(
      "hex"
    );
}


function buildIdempotencyKey(
  input: {
    userId:
      string;

    listingId:
      string;

    portal:
      string;

    environment:
      string;

    action:
      PortalPublishAction;

    externalObjectId:
      string |
      null;

    payloadFingerprint:
      string |
      null;
  }
):
  string {

  const source = [
    "portal-job-v1",
    input.userId,
    input.listingId,
    input.portal,
    input.environment,
    input.action,
    input.externalObjectId ??
      "",
    input.payloadFingerprint ??
      "",
  ].join("|");

  const digest =
    createHash(
      "sha256"
    )
      .update(source)
      .digest("hex");

  return `portal:v1:${digest}`;
}


function initialStatus(
  scheduledFor:
    Date |
    null
):
  PortalPublishJobStatus {

  if (
    scheduledFor &&
    scheduledFor.getTime() >
      Date.now()
  ) {
    return "scheduled";
  }

  return "queued";
}


function normalizedMaxAttempts(
  value:
    number |
    undefined
):
  number {

  if (
    value === undefined
  ) {
    return 5;
  }

  if (
    !Number.isInteger(value)
  ) {
    throw new Error(
      "maxAttempts must be an integer."
    );
  }

  return Math.max(
    1,
    Math.min(
      value,
      10
    )
  );
}


export async function createPortalPublishJob(
  input:
    CreatePortalPublishJobInput
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const listingId =
    requiredText(
      input.listingId,
      "Listing ID"
    );

  const connectionId =
    requiredText(
      input.connectionId,
      "Connection ID"
    );

  const action =
    input.action ??
    "publish";

  const externalObjectId =
    optionalText(
      input.externalObjectId
    );

  const scheduledFor =
    normalizeScheduledFor(
      input.scheduledFor
    );

  const maxAttempts =
    normalizedMaxAttempts(
      input.maxAttempts
    );


  const connection =
    await prisma.portalConnection.findFirst({
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

        portal:
          true,

        environment:
          true,

        status:
          true,
      },
    });


  if (!connection) {
    throw new Error(
      "Portal connection was not found."
    );
  }


  /*
   * Jobs dürfen erst entstehen,
   * wenn eine Portal-Verbindung
   * tatsächlich verifiziert ist.
   */
  if (
    connection.status !==
    "verified"
  ) {
    throw new Error(
      "Portal connection is not verified."
    );
  }


  const listing =
    await prisma.listing.findFirst({
      where: {
        id:
          listingId,

        userId,

        archivedAt:
          null,
      },

      select: {
        id:
          true,

        updatedAt:
          true,
      },
    });


  if (!listing) {
    throw new Error(
      "Listing was not found."
    );
  }


  const payloadFingerprint =
    fingerprintPayload(
      input.payloadSnapshot
    );


  const idempotencyKey =
    optionalText(
      input.idempotencyKey
    ) ??
    buildIdempotencyKey({
      userId,
      listingId,
      portal:
        connection.portal,
      environment:
        connection.environment,
      action,
      externalObjectId,
      payloadFingerprint,
    });


  /*
   * Schneller Duplicate-Check.
   *
   * Die UNIQUE-Constraint bleibt
   * zusätzlich die endgültige
   * Race-Condition-Sicherung.
   */
  const existing =
    await prisma.portalPublishJob.findUnique({
      where: {
        idempotencyKey,
      },
    });


  if (existing) {

    if (
      existing.userId !==
      userId
    ) {
      throw new Error(
        "Idempotency key already belongs to another user."
      );
    }

    return existing;
  }


  const status =
    initialStatus(
      scheduledFor
    );

  const now =
    new Date();


  try {

    return await prisma.portalPublishJob.create({
      data: {
        userId,

        listingId,

        connectionId:
          connection.id,

        provider:
          connection.provider,

        portal:
          connection.portal,

        environment:
          connection.environment,

        action,

        externalObjectId,

        listingUpdatedAtSnapshot:
          listing.updatedAt,

        payloadFingerprint,

        ...(input.payloadSnapshot ===
          null ||
        input.payloadSnapshot ===
          undefined
          ? {}
          : {
              payloadSnapshot:
                input.payloadSnapshot,
            }),

        status,

        scheduledFor,

        idempotencyKey,

        maxAttempts,

        nextAttemptAt:
          status ===
          "queued"
            ? now
            : scheduledFor,
      },
    });

  }
  catch (error) {

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2002"
    ) {

      const racedExisting =
        await prisma.portalPublishJob.findUnique({
          where: {
            idempotencyKey,
          },
        });

      if (
        racedExisting &&
        racedExisting.userId ===
          userId
      ) {
        return racedExisting;
      }
    }

    throw error;
  }
}


export async function listPortalPublishJobs(
  input: {
    userId:
      string;

    status?:
      PortalPublishJobStatus;

    listingId?:
      string;

    portal?:
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


  return prisma.portalPublishJob.findMany({
    where: {
      userId,

      ...(input.status
        ? {
            status:
              input.status,
          }
        : {}),

      ...(input.listingId
        ? {
            listingId:
              input.listingId,
          }
        : {}),

      ...(input.portal
        ? {
            portal:
              input.portal,
          }
        : {}),
    },

    orderBy: {
      createdAt:
        "desc",
    },

    take:
      limit,
  });
}


export async function getPortalPublishJobByIdempotencyKey(
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


  return prisma.portalPublishJob.findFirst({
    where: {
      userId,
      idempotencyKey,
    },
  });
}


export async function cancelPortalPublishJob(
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
    await prisma.portalPublishJob.updateMany({
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


export async function setPortalPublishProviderOperation(
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

    externalPublicationId?:
      string |
      null;

    externalObjectId?:
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


  return prisma.portalPublishJob.updateMany({
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

      ...(input.externalPublicationId !==
      undefined
        ? {
            externalPublicationId:
              optionalText(
                input.externalPublicationId
              ),
          }
        : {}),

      ...(input.externalObjectId !==
      undefined
        ? {
            externalObjectId:
              optionalText(
                input.externalObjectId
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


const PORTAL_PUBLISH_LOCK_TTL_MS =
  10 * 60_000;


export async function recoverStalePortalPublishJobs(
  input?: {
    now?:
      Date;

    lockTtlMs?:
      number;

    environment?:
      string;
  }
) {

  const now =
    input?.now ??
    new Date();

  const environment =
    optionalText(
      input?.environment
    );

  const requestedLockTtlMs =
    input?.lockTtlMs ??
    PORTAL_PUBLISH_LOCK_TTL_MS;

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
   * Sobald bereits eine Provider-
   * Operation gespeichert wurde,
   * wird NICHT blind erneut publiziert.
   *
   * Der Job geht stattdessen in
   * Reconciliation-Quarantäne.
   */
  const ambiguous =
    await prisma.portalPublishJob.updateMany({
      where: {
        status:
          "processing",

        ...(environment
          ? {
              environment,
            }
          : {}),

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

        AND: [
          {
            OR: [
              {
                providerOperationId: {
                  not:
                    null,
                },
              },
              {
                providerOperationState: {
                  not:
                    null,
                },
              },
            ],
          },
        ],
      },

      data: {
        status:
          "failed",

        failedAt:
          now,

        errorCode:
          "PORTAL_OPERATION_AMBIGUOUS",

        errorMessage:
          "Worker lock expired after a portal operation had already started.",

        nextAttemptAt:
          null,

        lockedAt:
          null,

        lockedBy:
          null,

        providerOperationState:
          "reconciliation_required",

        providerOperationUpdatedAt:
          now,
      },
    });


  const retryable =
    await prisma.portalPublishJob.updateMany({
      where: {
        status:
          "processing",

        ...(environment
          ? {
              environment,
            }
          : {}),

        providerOperationId:
          null,

        providerOperationState:
          null,

        attemptCount: {
          lt:
            prisma.portalPublishJob.fields.maxAttempts,
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
          "Worker lock expired before the portal operation started.",

        nextAttemptAt:
          now,

        lockedAt:
          null,

        lockedBy:
          null,
      },
    });


  const exhausted =
    await prisma.portalPublishJob.updateMany({
      where: {
        status:
          "processing",

        ...(environment
          ? {
              environment,
            }
          : {}),

        providerOperationId:
          null,

        providerOperationState:
          null,

        attemptCount: {
          gte:
            prisma.portalPublishJob.fields.maxAttempts,
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
          "Worker lock expired after the maximum portal attempts were reached.",

        nextAttemptAt:
          null,

        lockedAt:
          null,

        lockedBy:
          null,
      },
    });


  return {
    ambiguous:
      ambiguous.count,

    retryable:
      retryable.count,

    exhausted:
      exhausted.count,

    total:
      ambiguous.count +
      retryable.count +
      exhausted.count,
  };
}


export async function claimDuePortalPublishJobs(
  input: {
    workerId:
      string;

    limit?:
      number;

    now?:
      Date;

    environment?:
      string;
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

  const environment =
    optionalText(
      input.environment
    );

  const limit =
    Math.max(
      1,
      Math.min(
        input.limit ??
          10,
        25
      )
    );


  await recoverStalePortalPublishJobs({
    now,

    environment:
      environment ??
      undefined,
  });


  const candidates =
    await prisma.portalPublishJob.findMany({
      where: {
        ...(environment
          ? {
              environment,
            }
          : {}),

        status: {
          in: [
            "scheduled",
            "queued",
            "failed",
          ],
        },

        attemptCount: {
          lt:
            prisma.portalPublishJob.fields.maxAttempts,
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
      await prisma.portalPublishJob.updateMany({
        where: {
          id:
            candidate.id,

          lockedAt:
            null,

          status: {
            in: [
              "scheduled",
              "queued",
              "failed",
            ],
          },

          attemptCount: {
            lt:
              prisma.portalPublishJob.fields.maxAttempts,
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


  return prisma.portalPublishJob.findMany({
    where: {
      ...(environment
        ? {
            environment,
          }
        : {}),

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


function defaultRetryAt(
  attemptCount:
    number,
  now:
    Date
):
  Date {

  const delays = [
    60_000,
    5 * 60_000,
    15 * 60_000,
    60 * 60_000,
    3 * 60 * 60_000,
  ];

  const index =
    Math.max(
      0,
      Math.min(
        attemptCount - 1,
        delays.length - 1
      )
    );

  return new Date(
    now.getTime() +
    delays[index]
  );
}


export async function markPortalPublishJobSucceeded(
  input: {
    jobId:
      string;

    workerId:
      string;

    externalObjectId?:
      string |
      null;

    externalPublicationId?:
      string |
      null;

    externalPublicationUrl?:
      string |
      null;

    resultSnapshot?:
      Prisma.InputJsonValue |
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

  const now =
    new Date();


  return prisma.portalPublishJob.updateMany({
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
        "succeeded",

      ...(input.externalObjectId !==
      undefined
        ? {
            externalObjectId:
              optionalText(
                input.externalObjectId
              ),
          }
        : {}),

      ...(input.externalPublicationId !==
      undefined
        ? {
            externalPublicationId:
              optionalText(
                input.externalPublicationId
              ),
          }
        : {}),

      ...(input.externalPublicationUrl !==
      undefined
        ? {
            externalPublicationUrl:
              optionalText(
                input.externalPublicationUrl
              ),
          }
        : {}),

      ...(input.resultSnapshot ===
        null ||
      input.resultSnapshot ===
        undefined
        ? {}
        : {
            resultSnapshot:
              input.resultSnapshot,
          }),

      completedAt:
        now,

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
        "completed",

      providerOperationUpdatedAt:
        now,
    },
  });
}


export async function markPortalPublishJobFailed(
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

    requiresReconciliation?:
      boolean;
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
    await prisma.portalPublishJob.findFirst({
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


  const now =
    new Date();

  const exhausted =
    job.attemptCount >=
    job.maxAttempts;

  const requiresReconciliation =
    input.requiresReconciliation ===
    true;


  let nextAttemptAt:
    Date |
    null;


  if (
    exhausted ||
    requiresReconciliation
  ) {
    nextAttemptAt =
      null;
  }
  else if (
    input.retryAt ===
    null
  ) {
    nextAttemptAt =
      null;
  }
  else if (
    input.retryAt instanceof
    Date
  ) {

    if (
      Number.isNaN(
        input.retryAt.getTime()
      )
    ) {
      throw new Error(
        "Retry date is invalid."
      );
    }

    nextAttemptAt =
      input.retryAt;
  }
  else {
    nextAttemptAt =
      defaultRetryAt(
        job.attemptCount,
        now
      );
  }


  return prisma.portalPublishJob.updateMany({
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
        now,

      errorCode,

      errorMessage,

      nextAttemptAt,

      lockedAt:
        null,

      lockedBy:
        null,

      ...(requiresReconciliation
        ? {
            providerOperationState:
              "reconciliation_required",

            providerOperationUpdatedAt:
              now,
          }
        : {}),
    },
  });
}


export async function listPortalPublishJobsRequiringReconciliation(
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


  return prisma.portalPublishJob.findMany({
    where: {
      userId,

      status:
        "failed",

      providerOperationState:
        "reconciliation_required",
    },

    orderBy: {
      updatedAt:
        "desc",
    },

    take:
      limit,
  });
}


export type PortalPublishReconciliationResolution =
  | "confirmed_succeeded"
  | "confirmed_not_applied";


export async function resolvePortalPublishReconciliation(
  input: {
    userId:
      string;

    jobId:
      string;

    resolution:
      PortalPublishReconciliationResolution;

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


  const resolution =
    input.resolution;


  if (
    resolution !==
      "confirmed_succeeded" &&
    resolution !==
      "confirmed_not_applied"
  ) {
    throw new Error(
      "Invalid reconciliation resolution."
    );
  }


  const result =
    await prisma.portalPublishJob.updateMany({
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
        "confirmed_succeeded"
          ? {
              status:
                "succeeded",

              completedAt:
                resolvedAt,

              failedAt:
                null,

              errorCode:
                null,

              errorMessage:
                null,

              providerOperationState:
                "reconciled_succeeded",

              providerOperationUpdatedAt:
                resolvedAt,
            }
          : {
              status:
                "failed",

              completedAt:
                null,

              failedAt:
                resolvedAt,

              errorCode:
                "MANUALLY_RECONCILED_NOT_APPLIED",

              errorMessage:
                "The portal operation was confirmed as not applied.",

              providerOperationState:
                "reconciled_not_applied",

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


  return prisma.portalPublishJob.findFirst({
    where: {
      id:
        jobId,

      userId,
    },
  });
}