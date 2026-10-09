import "server-only";

import { prisma } from "@/lib/prisma";

import {
  lookupImmoScout24DeSandboxV1,
} from "./immoscout24-de-reconciliation-transport.server";

function fail(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

function required(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    fail("IMMOSCOUT24_DE_RECOVERY_INPUT_INVALID", field);
  }

  return value.trim();
}

/**
 * Read-only provider reconciliation, followed by
 * a conditional database update.
 *
 * Sandbox only. Never creates or publishes.
 * Only an existing 'uncertain' link is eligible.
 */
export async function reconcileImmoScout24DeObjectV1(input: {
  linkId: string;
  userId: string;
  connectionId: string;
  accessToken: string;
  accessTokenSecret: string;
}) {
  const linkId = required(input.linkId, "linkId");
  const userId = required(input.userId, "userId");
  const connectionId = required(
    input.connectionId,
    "connectionId"
  );

  const connection = await prisma.portalConnection.findFirst({
    where: {
      id: connectionId,
      userId,
      portal: "immoscout24_de",
      environment: "test",
    },
    select: { id: true },
  });

  if (!connection) {
    fail(
      "IMMOSCOUT24_DE_RECOVERY_CONNECTION_INVALID",
      "ImmoScout24-Testverbindung nicht gefunden."
    );
  }

  const link = await prisma.immoScout24DeObjectLink.findFirst({
    where: {
      id: linkId,
      userId,
      connectionId,
      status: "uncertain",
      externalObjectId: null,
    },
    select: {
      id: true,
      externalId: true,
    },
  });

  if (!link) {
    fail(
      "IMMOSCOUT24_DE_RECOVERY_NOT_ELIGIBLE",
      "Keine passende gesperrte Objektzuordnung vorhanden."
    );
  }

  // One GET, no create POST.
  // Any transport/parser error leaves the link untouched.
  const lookup = await lookupImmoScout24DeSandboxV1({
    externalId: link.externalId,
    accessToken: input.accessToken,
    accessTokenSecret: input.accessTokenSecret,
  });

  if (lookup.status === "not_found") {
    // 404 never authorizes another POST.
    return {
      status: "uncertain" as const,
      found: false as const,
      retryCreateAllowed: false as const,
    };
  }

  if (
    lookup.externalId !== link.externalId ||
    !/^\d+$/.test(lookup.externalObjectId)
  ) {
    fail(
      "IMMOSCOUT24_DE_RECOVERY_IDENTITY_UNCONFIRMED",
      "Externe Objektidentität nicht bestätigt."
    );
  }

  // Compare-and-swap: only the original uncertain
  // link can be completed. Concurrent calls cannot
  // overwrite a completed or changed assignment.
  const updated = await prisma.immoScout24DeObjectLink.updateMany({
    where: {
      id: link.id,
      userId,
      connectionId,
      externalId: link.externalId,
      status: "uncertain",
      externalObjectId: null,
    },
    data: {
      externalObjectId: lookup.externalObjectId,
      status: "created",
      lastErrorCode: null,
      lastCheckedAt: new Date(),
    },
  });

  if (updated.count !== 1) {
    fail(
      "IMMOSCOUT24_DE_RECOVERY_CONFLICT",
      "Objektzuordnung hat sich verändert. Erneut prüfen."
    );
  }

  return {
    status: "created" as const,
    found: true as const,
    externalObjectId: lookup.externalObjectId,
    retryCreateAllowed: false as const,
  };
}