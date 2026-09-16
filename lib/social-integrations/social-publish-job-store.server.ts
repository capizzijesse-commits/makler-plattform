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


  const candidates =
    await prisma.socialPublishJob.findMany({
      where: {
        status: {
          in: [
            "scheduled",
            "queued",
            "failed",
          ],
        },

        attemptCount: {
          lt:
            3,
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

          {
            OR: [
              {
                nextAttemptAt: {
                  lte:
                    now,
                },
              },

              {
                nextAttemptAt:
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

          lockedAt:
            null,

          status: {
            in: [
              "scheduled",
              "queued",
              "failed",
            ],
          },
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
    return null;
  }


  const exhausted =
    job.attemptCount >=
    job.maxAttempts;


  return prisma.socialPublishJob.update({
    where: {
      id:
        job.id,
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
