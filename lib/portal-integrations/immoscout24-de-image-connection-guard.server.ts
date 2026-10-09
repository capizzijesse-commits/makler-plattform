import "server-only";

import type { PrismaClient } from "@prisma/client";

type GuardInput = {
  prisma: PrismaClient;
  userId: string;
  connectionId: string;
};

export type ImmoScout24DeImageConnectionGuardResultV1 =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "INVALID_CONNECTION_CONTEXT"
        | "CONNECTION_NOT_VERIFIED";
    };

/**
 * Sandbox-only permission check.
 *
 * This is NOT the provider's publishing approval.
 * No HTTP calls and no database writes.
 */
export async function checkImmoScout24DeImageConnectionV1(
  input: GuardInput
): Promise<ImmoScout24DeImageConnectionGuardResultV1> {
  if (
    !input.userId?.trim() ||
    !input.connectionId?.trim()
  ) {
    return {
      allowed: false,
      reason: "INVALID_CONNECTION_CONTEXT",
    };
  }

  const connection =
    await input.prisma.portalConnection.findFirst({
      where: {
        id: input.connectionId,
        userId: input.userId,
        portal: "immoscout24_de",
        environment: "test",
        status: "verified",
      },
      select: {
        id: true,
      },
    });

  if (!connection) {
    return {
      allowed: false,
      reason: "CONNECTION_NOT_VERIFIED",
    };
  }

  return { allowed: true };
}