import "server-only";

import { prisma } from "@/lib/prisma";

const MIN_STALE_AGE_MS = 30 * 60 * 1000;

function required(value: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("IMMOSCOUT24_DE_STALE_INVALID_INPUT");
  }
  return value.trim();
}

/**
 * Markiert einen alten, möglicherweise unterbrochenen
 * Create-Vorgang für den Bestandsabgleich.
 *
 * Nur Sandbox; kein API-Aufruf; kein erneuter POST.
 * Nicht an einen Cron oder Worker angeschlossen.
 */
export async function quarantineStaleImmoScout24DeCreateV1(input: {
  linkId: string;
  userId: string;
  connectionId: string;
}) {
  const linkId = required(input.linkId);
  const userId = required(input.userId);
  const connectionId = required(input.connectionId);

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
    throw new Error(
      "IMMOSCOUT24_DE_STALE_CONNECTION_INVALID"
    );
  }

  const cutoff = new Date(Date.now() - MIN_STALE_AGE_MS);

  // Das UPDATE ist atomar; der Zeitfilter wird direkt
  // in der Datenbank ausgewertet.
  const result = await prisma.immoScout24DeObjectLink.updateMany({
    where: {
      id: linkId,
      userId,
      connectionId,
      status: "creating",
      externalObjectId: null,
      updatedAt: { lte: cutoff },
    },
    data: {
      status: "uncertain",
      lastErrorCode: "IMMOSCOUT24_DE_STALE_CREATE_RECONCILIATION_REQUIRED",
    },
  });

  return {
    quarantined: result.count === 1,
    retryCreateAllowed: false as const,
  };
}
