import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ImmoScout24DeObjectLinkStatus =
  | "reserved"
  | "creating"
  | "created"
  | "uncertain";

function fail(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

function required(value: string, field: string): string {
  const result = value.trim();

  if (!result) {
    fail(
      "IMMOSCOUT24_DE_LINK_INPUT_INVALID",
      `${field} fehlt.`
    );
  }

  return result;
}

/**
 * Legt eine eindeutige Objektreservierung an.
 *
 * Die Unique-Constraints verhindern, dass zwei
 * parallele Aufträge dieselbe Zuordnung erzeugen.
 *
 * Kein API-Aufruf.
 */
export async function reserveImmoScout24DeObjectV1(input: {
  userId: string;
  listingId: string;
  connectionId: string;
  externalId: string;
}) {
  const userId = required(input.userId, "userId");
  const listingId = required(input.listingId, "listingId");
  const connectionId = required(input.connectionId, "connectionId");
  const externalId = required(input.externalId, "externalId");

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
      "IMMOSCOUT24_DE_CONNECTION_INVALID",
      "Keine gültige ImmoScout24-DE-Testverbindung gefunden."
    );
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      userId,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (!listing) {
    fail(
      "IMMOSCOUT24_DE_LISTING_INVALID",
      "Inserat nicht gefunden oder nicht berechtigt."
    );
  }

  try {
    return await prisma.immoScout24DeObjectLink.create({
      data: {
        userId,
        listingId,
        connectionId,
        externalId,
        status: "reserved",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      fail(
        "IMMOSCOUT24_DE_OBJECT_ALREADY_RESERVED",
        "Für dieses Inserat oder diese externe ID existiert bereits eine Objektzuordnung. Keine erneute Erstellung."
      );
    }

    throw error;
  }
}

/**
 * Atomare Statusänderung: reserved -> creating.
 * Nur der erste Aufrufer erhält die Berechtigung,
 * den Create-Vorgang zu starten.
 */
export async function beginImmoScout24DeCreateV1(input: {
  linkId: string;
  userId: string;
  connectionId: string;
}) {
  const result = await prisma.immoScout24DeObjectLink.updateMany({
    where: {
      id: required(input.linkId, "linkId"),
      userId: required(input.userId, "userId"),
      connectionId: required(input.connectionId, "connectionId"),
      status: "reserved",
      externalObjectId: null,
    },
    data: {
      status: "creating",
      lastErrorCode: null,
    },
  });

  if (result.count !== 1) {
    fail(
      "IMMOSCOUT24_DE_CREATE_NOT_RESERVED",
      "Objekt ist nicht reserviert oder wird bereits verarbeitet."
    );
  }

  return { status: "creating" as const };
}

/**
 * creating -> created
 *
 * Nur nach eindeutiger Bestätigung der externen
 * ImmoScout24-Objekt-ID aufrufen.
 */
export async function completeImmoScout24DeCreateV1(input: {
  linkId: string;
  userId: string;
  connectionId: string;
  externalObjectId: string;
}) {
  const objectId = required(
    input.externalObjectId,
    "externalObjectId"
  );

  if (!/^\d+$/.test(objectId)) {
    fail(
      "IMMOSCOUT24_DE_OBJECT_ID_INVALID",
      "ImmoScout24-Objekt-ID muss numerisch sein."
    );
  }

  const result = await prisma.immoScout24DeObjectLink.updateMany({
    where: {
      id: required(input.linkId, "linkId"),
      userId: required(input.userId, "userId"),
      connectionId: required(input.connectionId, "connectionId"),
      status: "creating",
      externalObjectId: null,
    },
    data: {
      externalObjectId: objectId,
      status: "created",
      lastErrorCode: null,
      lastCheckedAt: new Date(),
    },
  });

  if (result.count !== 1) {
    fail(
      "IMMOSCOUT24_DE_CREATE_COMPLETION_CONFLICT",
      "Erstellung konnte nicht eindeutig abgeschlossen werden. Objektzuordnung prüfen."
    );
  }

  return {
    status: "created" as const,
    externalObjectId: objectId,
  };
}

/**
 * creating -> uncertain
 *
 * Bei Zeitüberschreitung, Transportfehler
 * oder unklarer Provider-Antwort.
 *
 * Ein weiterer POST ist damit blockiert.
 */
export async function markImmoScout24DeCreateUncertainV1(input: {
  linkId: string;
  userId: string;
  connectionId: string;
  errorCode: string;
}) {
  const result = await prisma.immoScout24DeObjectLink.updateMany({
    where: {
      id: required(input.linkId, "linkId"),
      userId: required(input.userId, "userId"),
      connectionId: required(input.connectionId, "connectionId"),
      status: "creating",
      externalObjectId: null,
    },
    data: {
      status: "uncertain",
      lastErrorCode: required(input.errorCode, "errorCode"),
    },
  });

  if (result.count !== 1) {
    fail(
      "IMMOSCOUT24_DE_UNCERTAIN_STATE_CONFLICT",
      "Objektstatus konnte nicht sicher auf uncertain gesetzt werden."
    );
  }

  return { status: "uncertain" as const };
}
