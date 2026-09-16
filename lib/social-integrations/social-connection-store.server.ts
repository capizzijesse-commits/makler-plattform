import "server-only";

import {
  prisma,
} from "@/lib/prisma";


export type SocialProvider =
  | "meta"
  | "linkedin"
  | "tiktok";


export type SocialChannel =
  | "facebook_page"
  | "instagram_business"
  | "linkedin"
  | "tiktok";


export type SocialEnvironment =
  | "test"
  | "production";


export type SocialConnectionStatus =
  | "configured"
  | "verified"
  | "expired"
  | "revoked"
  | "error";


export type SocialConnectionKey = {
  userId:
    string;

  provider:
    SocialProvider;

  channel:
    SocialChannel;

  externalAccountId:
    string;

  environment:
    SocialEnvironment;
};


export type SaveSocialConnectionInput =
  SocialConnectionKey & {
    externalParentId?:
      string |
      null;

    displayName?:
      string |
      null;

    username?:
      string |
      null;

    status?:
      SocialConnectionStatus;

    credentialSource?:
      string |
      null;

    lastVerifiedAt?:
      Date |
      null;
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

  const cleaned =
    value.trim();

  return cleaned ||
    null;
}


function assertProviderChannel(
  provider:
    SocialProvider,
  channel:
    SocialChannel
):
  void {

  const valid =
    (
      provider === "meta" &&
      (
        channel === "facebook_page" ||
        channel === "instagram_business"
      )
    ) ||
    (
      provider === "linkedin" &&
      channel === "linkedin"
    ) ||
    (
      provider === "tiktok" &&
      channel === "tiktok"
    );

  if (!valid) {
    throw new Error(
      `Invalid social provider/channel combination: ${provider}/${channel}`
    );
  }
}


function normalizeKey(
  input:
    SocialConnectionKey
):
  SocialConnectionKey {

  assertProviderChannel(
    input.provider,
    input.channel
  );

  return {
    userId:
      requiredText(
        input.userId,
        "User ID"
      ),

    provider:
      input.provider,

    channel:
      input.channel,

    externalAccountId:
      requiredText(
        input.externalAccountId,
        "External account ID"
      ),

    environment:
      input.environment,
  };
}


export async function saveSocialConnection(
  input:
    SaveSocialConnectionInput
) {

  const key =
    normalizeKey(
      input
    );

  const status =
    input.status ??
    "configured";


  return prisma.socialConnection.upsert({
    where: {
      userId_provider_channel_externalAccountId_environment: {
        userId:
          key.userId,

        provider:
          key.provider,

        channel:
          key.channel,

        externalAccountId:
          key.externalAccountId,

        environment:
          key.environment,
      },
    },

    create: {
      userId:
        key.userId,

      provider:
        key.provider,

      channel:
        key.channel,

      environment:
        key.environment,

      externalAccountId:
        key.externalAccountId,

      externalParentId:
        optionalText(
          input.externalParentId
        ),

      displayName:
        optionalText(
          input.displayName
        ),

      username:
        optionalText(
          input.username
        ),

      status,

      credentialSource:
        optionalText(
          input.credentialSource
        ),

      lastVerifiedAt:
        input.lastVerifiedAt ??
        null,
    },

    update: {
      externalParentId:
        optionalText(
          input.externalParentId
        ),

      displayName:
        optionalText(
          input.displayName
        ),

      username:
        optionalText(
          input.username
        ),

      status,

      credentialSource:
        optionalText(
          input.credentialSource
        ),

      lastVerifiedAt:
        input.lastVerifiedAt ??
        undefined,
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

      externalParentId:
        true,

      displayName:
        true,

      username:
        true,

      status:
        true,

      credentialSource:
        true,

      lastVerifiedAt:
        true,

      lastPublishedAt:
        true,

      createdAt:
        true,

      updatedAt:
        true,
    },
  });
}


export async function listSocialConnections(
  input: {
    userId:
      string;

    environment?:
      SocialEnvironment;
  }
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );


  return prisma.socialConnection.findMany({
    where: {
      userId,

      ...(input.environment
        ? {
            environment:
              input.environment,
          }
        : {}),
    },

    orderBy: [
      {
        provider:
          "asc",
      },

      {
        channel:
          "asc",
      },

      {
        displayName:
          "asc",
      },
    ],

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

      externalParentId:
        true,

      displayName:
        true,

      username:
        true,

      status:
        true,

      credentialSource:
        true,

      lastVerifiedAt:
        true,

      lastPublishedAt:
        true,

      createdAt:
        true,

      updatedAt:
        true,
    },
  });
}


export async function getSocialConnectionById(
  input: {
    userId:
      string;

    id:
      string;
  }
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const id =
    requiredText(
      input.id,
      "Connection ID"
    );


  return prisma.socialConnection.findFirst({
    where: {
      id,
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

      externalParentId:
        true,

      displayName:
        true,

      username:
        true,

      status:
        true,

      credentialSource:
        true,

      lastVerifiedAt:
        true,

      lastPublishedAt:
        true,

      createdAt:
        true,

      updatedAt:
        true,
    },
  });
}


export async function markSocialConnectionVerified(
  input: {
    userId:
      string;

    id:
      string;
  }
) {

  const connection =
    await getSocialConnectionById(
      input
    );

  if (!connection) {
    return null;
  }


  return prisma.socialConnection.update({
    where: {
      id:
        connection.id,
    },

    data: {
      status:
        "verified",

      lastVerifiedAt:
        new Date(),
    },

    select: {
      id:
        true,

      status:
        true,

      lastVerifiedAt:
        true,
    },
  });
}


export async function markSocialConnectionPublished(
  input: {
    userId:
      string;

    id:
      string;
  }
) {

  const connection =
    await getSocialConnectionById(
      input
    );

  if (!connection) {
    return null;
  }


  return prisma.socialConnection.update({
    where: {
      id:
        connection.id,
    },

    data: {
      lastPublishedAt:
        new Date(),
    },

    select: {
      id:
        true,

      lastPublishedAt:
        true,
    },
  });
}


export async function deleteSocialConnection(
  input: {
    userId:
      string;

    id:
      string;
  }
):
  Promise<boolean> {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const id =
    requiredText(
      input.id,
      "Connection ID"
    );


  const result =
    await prisma.socialConnection.deleteMany({
      where: {
        id,
        userId,
      },
    });


  return result.count >
    0;
}