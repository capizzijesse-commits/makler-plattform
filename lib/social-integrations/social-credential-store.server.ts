import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  openSocialCredential,
  sealSocialCredential,
  type SocialCredentialSecret,
} from "@/lib/social-integrations/social-credential-crypto.server";


export type SocialCredentialProvider =
  | "meta"
  | "linkedin"
  | "tiktok";


export type SocialCredentialEnvironment =
  | "test"
  | "production";


export type SocialCredentialKey = {
  userId:
    string;

  provider:
    SocialCredentialProvider;

  externalSubjectId:
    string;

  environment:
    SocialCredentialEnvironment;
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


function normalizeKey(
  input:
    SocialCredentialKey
):
  SocialCredentialKey {

  return {
    userId:
      requiredText(
        input.userId,
        "User ID"
      ),

    provider:
      input.provider,

    externalSubjectId:
      requiredText(
        input.externalSubjectId,
        "External subject ID"
      ),

    environment:
      input.environment,
  };
}


export async function saveSocialOAuthCredential(
  input:
    SocialCredentialKey &
    SocialCredentialSecret
):
  Promise<{
    id:
      string;

    provider:
      SocialCredentialProvider;

    externalSubjectId:
      string;

    environment:
      SocialCredentialEnvironment;

    updatedAt:
      Date;
  }> {

  const key =
    normalizeKey(
      input
    );


  const encryptedPayload =
    sealSocialCredential({
      accessToken:
        input.accessToken,

      refreshToken:
        input.refreshToken,

      tokenType:
        input.tokenType,

      expiresAt:
        input.expiresAt,

      scopes:
        input.scopes,
    });


  const record =
    await prisma.socialCredential.upsert({
      where: {
        userId_provider_externalSubjectId_environment: {
          userId:
            key.userId,

          provider:
            key.provider,

          externalSubjectId:
            key.externalSubjectId,

          environment:
            key.environment,
        },
      },

      create: {
        userId:
          key.userId,

        provider:
          key.provider,

        externalSubjectId:
          key.externalSubjectId,

        environment:
          key.environment,

        encryptedPayload,
      },

      update: {
        encryptedPayload,
      },

      select: {
        id:
          true,

        provider:
          true,

        externalSubjectId:
          true,

        environment:
          true,

        updatedAt:
          true,
      },
    });


  return {
    id:
      record.id,

    provider:
      record.provider as
        SocialCredentialProvider,

    externalSubjectId:
      record.externalSubjectId,

    environment:
      record.environment as
        SocialCredentialEnvironment,

    updatedAt:
      record.updatedAt,
  };
}


export async function getSocialOAuthCredential(
  input:
    SocialCredentialKey
):
  Promise<
    SocialCredentialSecret |
    null
  > {

  const key =
    normalizeKey(
      input
    );


  const record =
    await prisma.socialCredential.findUnique({
      where: {
        userId_provider_externalSubjectId_environment: {
          userId:
            key.userId,

          provider:
            key.provider,

          externalSubjectId:
            key.externalSubjectId,

          environment:
            key.environment,
        },
      },

      select: {
        encryptedPayload:
          true,
      },
    });


  if (!record) {
    return null;
  }


  return openSocialCredential(
    record.encryptedPayload
  );
}


export async function hasSocialOAuthCredential(
  input:
    SocialCredentialKey
):
  Promise<boolean> {

  const key =
    normalizeKey(
      input
    );


  const count =
    await prisma.socialCredential.count({
      where: {
        userId:
          key.userId,

        provider:
          key.provider,

        externalSubjectId:
          key.externalSubjectId,

        environment:
          key.environment,
      },
    });


  return count >
    0;
}


export async function deleteSocialOAuthCredential(
  input:
    SocialCredentialKey
):
  Promise<boolean> {

  const key =
    normalizeKey(
      input
    );


  const result =
    await prisma.socialCredential.deleteMany({
      where: {
        userId:
          key.userId,

        provider:
          key.provider,

        externalSubjectId:
          key.externalSubjectId,

        environment:
          key.environment,
      },
    });


  return result.count >
    0;
}