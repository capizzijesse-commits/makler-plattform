import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  prisma,
} from "@/lib/prisma";


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


function isSocialProviderEnabled(
  provider:
    string
):
  boolean {

  switch (provider) {

    case "meta":

      return enabled(
        "META_PUBLISHING_ENABLED"
      );

    case "linkedin":

      return enabled(
        "LINKEDIN_PUBLISHING_ENABLED"
      );

    default:

      return false;
  }
}


function isSocialTargetEnabled(
  provider:
    string,
  channel:
    string
):
  boolean {

  if (
    provider === "meta" &&
    (
      channel === "instagram_business" ||
      channel === "facebook_page"
    )
  ) {

    return enabled(
      "META_PUBLISHING_ENABLED"
    );
  }


  if (
    provider === "linkedin" &&
    channel === "linkedin"
  ) {

    return enabled(
      "LINKEDIN_PUBLISHING_ENABLED"
    );
  }


  return false;
}

const SOCIAL_PUBLISH_LOCK_TTL_MS =
  10 * 60_000;


export type SocialPublishActivationBlockerCode =
  | "ACTIVATION_AT_MISSING"
  | "ACTIVATION_AT_INVALID"
  | "ACTIVATION_AT_IN_FUTURE"
  | "TOO_MANY_DUE_JOBS"
  | "JOB_PREDATES_ACTIVATION"
  | "PROVIDER_NOT_ENABLED"
  | "CHANNEL_NOT_ENABLED"
  | "NON_PRODUCTION_JOB"
  | "PLAN_NOT_ELIGIBLE"
  | "CONNECTION_MISSING"
  | "CONNECTION_NOT_VERIFIED"
  | "CONNECTION_SNAPSHOT_MISMATCH";


export type SocialPublishActivationBlocker = {
  jobId:
    string |
    null;

  code:
    SocialPublishActivationBlockerCode;
};


function activationAtFromEnvironment():
  Date |
  null |
  "invalid" {

  const raw =
    process.env
      .SOCIAL_PUBLISH_ACTIVATION_AT
      ?.trim() ||
    "";

  if (!raw) {
    return null;
  }


  const parsed =
    new Date(
      raw
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "invalid";
  }


  return parsed;
}


export async function inspectSocialPublishActivationGuard(
  input?: {
    now?:
      Date;

    maxJobs?:
      number;
  }
) {

  const now =
    input?.now ??
    new Date();

  const maxJobs =
    Math.max(
      1,
      Math.min(
        input?.maxJobs ??
          200,
        500
      )
    );


  const activationAt =
    activationAtFromEnvironment();


  if (
    activationAt ===
    null
  ) {

    return {
      ready:
        false,

      activationAt:
        null,

      dueJobs:
        0,

      inspectedJobs:
        0,

      blockers: [
        {
          jobId:
            null,

          code:
            "ACTIVATION_AT_MISSING",
        },
      ] satisfies
        SocialPublishActivationBlocker[],
    };
  }


  if (
    activationAt ===
    "invalid"
  ) {

    return {
      ready:
        false,

      activationAt:
        null,

      dueJobs:
        0,

      inspectedJobs:
        0,

      blockers: [
        {
          jobId:
            null,

          code:
            "ACTIVATION_AT_INVALID",
        },
      ] satisfies
        SocialPublishActivationBlocker[],
    };
  }


  if (
    activationAt.getTime() >
    now.getTime()
  ) {

    return {
      ready:
        false,

      activationAt:
        activationAt.toISOString(),

      dueJobs:
        0,

      inspectedJobs:
        0,

      blockers: [
        {
          jobId:
            null,

          code:
            "ACTIVATION_AT_IN_FUTURE",
        },
      ] satisfies
        SocialPublishActivationBlocker[],
    };
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


  const dueJobs =
    await prisma.socialPublishJob.count({
      where:
        dueWhere,
    });


  if (
    dueJobs >
    maxJobs
  ) {

    return {
      ready:
        false,

      activationAt:
        activationAt.toISOString(),

      dueJobs,

      inspectedJobs:
        0,

      blockers: [
        {
          jobId:
            null,

          code:
            "TOO_MANY_DUE_JOBS",
        },
      ] satisfies
        SocialPublishActivationBlocker[],
    };
  }


  const jobs =
    await prisma.socialPublishJob.findMany({
      where:
        dueWhere,

      orderBy: {
        createdAt:
          "asc",
      },

      take:
        maxJobs,

      select: {
        id:
          true,

        userId:
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

        createdAt:
          true,

        user: {
          select: {
            plan:
              true,
          },
        },

        connection: {
          select: {
            id:
              true,

            userId:
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
        },
      },
    });


  const blockers:
    SocialPublishActivationBlocker[] =
      [];


  for (
    const job of
    jobs
  ) {

    if (
      job.createdAt.getTime() <
      activationAt.getTime()
    ) {

      blockers.push({
        jobId:
          job.id,

        code:
          "JOB_PREDATES_ACTIVATION",
      });
    }


    if (
      !isSocialProviderEnabled(
        job.provider
      )
    ) {

      blockers.push({
        jobId:
          job.id,

        code:
          "PROVIDER_NOT_ENABLED",
      });
    }


    if (
      !isSocialTargetEnabled(
        job.provider,
        job.channel
      )
    ) {

      blockers.push({
        jobId:
          job.id,

        code:
          "CHANNEL_NOT_ENABLED",
      });
    }


    if (
      job.environment !==
      "production"
    ) {

      blockers.push({
        jobId:
          job.id,

        code:
          "NON_PRODUCTION_JOB",
      });
    }


    const capabilities =
      getPlanCapabilities(
        job.user.plan
      );


    if (
      !capabilities
        .canUsePublishingCenter
    ) {

      blockers.push({
        jobId:
          job.id,

        code:
          "PLAN_NOT_ELIGIBLE",
      });
    }


    const connection =
      job.connection;


    if (!connection) {

      blockers.push({
        jobId:
          job.id,

        code:
          "CONNECTION_MISSING",
      });

      continue;
    }


    if (
      connection.status !==
      "verified"
    ) {

      blockers.push({
        jobId:
          job.id,

        code:
          "CONNECTION_NOT_VERIFIED",
      });
    }


    if (
      connection.userId !==
        job.userId ||
      connection.provider !==
        job.provider ||
      connection.channel !==
        job.channel ||
      connection.environment !==
        job.environment ||
      connection.externalAccountId !==
        job.externalAccountId
    ) {

      blockers.push({
        jobId:
          job.id,

        code:
          "CONNECTION_SNAPSHOT_MISMATCH",
      });
    }
  }


  return {
    ready:
      blockers.length ===
      0,

    activationAt:
      activationAt.toISOString(),

    dueJobs,

    inspectedJobs:
      jobs.length,

    blockers,
  };
}