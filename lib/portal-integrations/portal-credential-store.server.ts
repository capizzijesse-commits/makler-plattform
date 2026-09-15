import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  openPortalCredential,
  sealPortalCredential,
} from "@/lib/portal-integrations/portal-credential-crypto.server";


export type PortalCredentialEnvironment =
  | "sandbox"
  | "test"
  | "production";


export type PortalCredentialKey = {
  userId:
    string;

  provider:
    string;

  portal:
    string;

  environment:
    PortalCredentialEnvironment;
};


export type PortalOAuthCredential = {
  accessToken:
    string;

  accessTokenSecret:
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


function normalizeKey(
  input:
    PortalCredentialKey
):
  PortalCredentialKey {

  return {
    userId:
      requiredText(
        input.userId,
        "User ID"
      ),

    provider:
      requiredText(
        input.provider,
        "Provider"
      ),

    portal:
      requiredText(
        input.portal,
        "Portal"
      ),

    environment:
      input.environment,
  };
}


export async function savePortalOAuthCredential(
  input:
    PortalCredentialKey &
    PortalOAuthCredential
):
  Promise<{
    id:
      string;

    provider:
      string;

    portal:
      string;

    environment:
      PortalCredentialEnvironment;

    updatedAt:
      Date;
  }> {

  const key =
    normalizeKey(
      input
    );


  const encryptedPayload =
    sealPortalCredential({
      accessToken:
        input.accessToken,

      accessTokenSecret:
        input.accessTokenSecret,
    });


  const record =
    await prisma.portalCredential.upsert({
      where: {
        userId_portal_environment: {
          userId:
            key.userId,

          portal:
            key.portal,

          environment:
            key.environment,
        },
      },

      create: {
        userId:
          key.userId,

        provider:
          key.provider,

        portal:
          key.portal,

        environment:
          key.environment,

        encryptedPayload,
      },

      update: {
        provider:
          key.provider,

        encryptedPayload,
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

        updatedAt:
          true,
      },
    });


  return {
    id:
      record.id,

    provider:
      record.provider,

    portal:
      record.portal,

    environment:
      record.environment as
        PortalCredentialEnvironment,

    updatedAt:
      record.updatedAt,
  };
}


export async function getPortalOAuthCredential(
  input:
    Pick<
      PortalCredentialKey,
      "userId" |
      "portal" |
      "environment"
    >
):
  Promise<
    PortalOAuthCredential |
    null
  > {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const portal =
    requiredText(
      input.portal,
      "Portal"
    );


  const record =
    await prisma.portalCredential.findUnique({
      where: {
        userId_portal_environment: {
          userId,

          portal,

          environment:
            input.environment,
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


  return openPortalCredential(
    record.encryptedPayload
  );
}


export async function hasPortalOAuthCredential(
  input:
    Pick<
      PortalCredentialKey,
      "userId" |
      "portal" |
      "environment"
    >
):
  Promise<boolean> {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const portal =
    requiredText(
      input.portal,
      "Portal"
    );


  const count =
    await prisma.portalCredential.count({
      where: {
        userId,

        portal,

        environment:
          input.environment,
      },
    });


  return count >
    0;
}


export async function deletePortalOAuthCredential(
  input:
    Pick<
      PortalCredentialKey,
      "userId" |
      "portal" |
      "environment"
    >
):
  Promise<boolean> {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const portal =
    requiredText(
      input.portal,
      "Portal"
    );


  const result =
    await prisma.portalCredential.deleteMany({
      where: {
        userId,

        portal,

        environment:
          input.environment,
      },
    });


  return result.count >
    0;
}