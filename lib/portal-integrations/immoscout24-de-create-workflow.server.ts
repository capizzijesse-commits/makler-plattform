import "server-only";

import {
  prepareImmoScout24DeCreateV1,
} from "./immoscout24-de-create-realestate.server";

import {
  executeImmoScout24DeCreateSandboxV1,
} from "./immoscout24-de-create-transport.server";

import {
  reserveImmoScout24DeObjectV1,
  beginImmoScout24DeCreateV1,
  completeImmoScout24DeCreateV1,
  markImmoScout24DeCreateUncertainV1,
} from "./immoscout24-de-object-link.server";

/**
 * Create Workflow V1
 *
 * Nur Sandbox.
 * Nicht mit Worker oder öffentlicher Route verbunden.
 * Keine automatischen Wiederholungen.
 *
 * Bei unklarer Übertragung wird die Zuordnung
 * gesperrt, bis ein Bestandsabgleich erfolgt.
 */
export async function runImmoScout24DeCreateSandboxV1(input: {
  userId: string;
  listingId: string;
  connectionId: string;
  externalId: string;
  xml: string;
  accessToken: string;
  accessTokenSecret: string;
  allowSandboxWrite: true;
}) {
  if (input.allowSandboxWrite !== true) {
    throw new Error(
      "IMMOSCOUT24_DE_CREATE_NOT_AUTHORIZED"
    );
  }

  // Vor jedem Datenbankzugriff XML und Umgebung prüfen.
  const request = prepareImmoScout24DeCreateV1({
    environment: "sandbox",
    xml: input.xml,
    externalId: input.externalId,
  });

  // Einzigartige Reservierung.
  // Bestehende Reservierungen werden NICHT erneut genutzt.
  const link = await reserveImmoScout24DeObjectV1({
    userId: input.userId,
    listingId: input.listingId,
    connectionId: input.connectionId,
    externalId: request.externalId,
  });

  // Atomarer Übergang: reserved -> creating.
  // Danach ist jeder weitere Create-Versuch blockiert.
  await beginImmoScout24DeCreateV1({
    linkId: link.id,
    userId: input.userId,
    connectionId: input.connectionId,
  });

  try {
    // Genau ein API-Versuch; kein Retry.
    const result = await executeImmoScout24DeCreateSandboxV1({
      request,
      accessToken: input.accessToken,
      accessTokenSecret: input.accessTokenSecret,
      allowSandboxWrite: true,
    });

    // Nur nach eindeutiger Bestätigung speichern.
    const saved = await completeImmoScout24DeCreateV1({
      linkId: link.id,
      userId: input.userId,
      connectionId: input.connectionId,
      externalObjectId: result.externalObjectId,
    });

    return {
      ok: true as const,
      linkId: link.id,
      externalId: request.externalId,
      externalObjectId: saved.externalObjectId,
      status: saved.status,
      published: false as const,
    };
  } catch (error) {
    // Auch bei HTTP-Fehlern konservativ sperren.
    // Ob ein Objekt angelegt wurde, ist zuerst abzugleichen.
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "IMMOSCOUT24_DE_CREATE_RESULT_UNCERTAIN";

    try {
      await markImmoScout24DeCreateUncertainV1({
        linkId: link.id,
        userId: input.userId,
        connectionId: input.connectionId,
        errorCode,
      });
    } catch {
      throw Object.assign(
        new Error(
          "ImmoScout24-Ergebnis und Datenbankstatus müssen überprüft werden. Keinen weiteren POST starten."
        ),
        {
          code: "IMMOSCOUT24_DE_RECONCILIATION_REQUIRED",
        }
      );
    }

    throw error;
  }
}
