import "server-only";

import type {
  PortalConnection,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  getSmgPortalConnectionState,
} from "./config.server";

import {
  buildSwissRetsFeedForUser,
} from "./swissrets-feed.server";

import type {
  GermanPortalId,
  PortalConnectionState,
  PortalId,
  SmgPortalId,
  SwissPortalId,
} from "./types";


export type EffectivePortalConnectionStatus =
  | "not_configured"
  | "configured"
  | "verified"
  | "error";


export type PortalConnectionSnapshot<
  TPortal extends PortalId = PortalId,
> = {
  portal: TPortal;

  provider: string | null;
  environment: string | null;

  status: EffectivePortalConnectionStatus;

  databaseConfigured: boolean;

  transportCredentialState: PortalConnectionState;
  transportCredentialSource: "env" | null;

  externalOwnerId: string | null;
  externalUserId: string | null;

  credentialSource: string | null;
  lastVerifiedAt: Date | null;

  createdAt: Date | null;
  updatedAt: Date | null;
};


const SWISS_PORTALS: readonly SwissPortalId[] = [
  "immoscout24_ch",
  "homegate_ch",
  "comparis_ch",
  "flatfox_ch",
  "newhome_ch",
];


const GERMAN_PORTALS: readonly GermanPortalId[] = [
  "immoscout24_de",
  "immowelt_de",
  "kleinanzeigen_de",
  "wg_gesucht_de",
  "immobilien_de",
];


const SUPPORTED_PORTALS: readonly PortalId[] = [
  ...SWISS_PORTALS,
  ...GERMAN_PORTALS,
];


const SMG_PORTALS: readonly SmgPortalId[] = [
  "immoscout24_ch",
  "homegate_ch",
];


export type SwissLaunchPortalConnectionId =
  | "immoscout24_ch"
  | "homegate_ch"
  | "comparis_ch";


export type PortalConnectionEnvironment =
  | "test"
  | "production";


export type ConfigureSwissLaunchPortalConnectionInput = {
  userId: string;

  portal:
    SwissLaunchPortalConnectionId;

  environment:
    PortalConnectionEnvironment;

  externalOwnerId?:
    | string
    | null;

  externalUserId?:
    | string
    | null;
};


export type GermanLaunchPortalConnectionId =
  | "immoscout24_de"
  | "immowelt_de";


export type ConfigureGermanLaunchPortalConnectionInput = {
  userId:
    string;

  portal:
    GermanLaunchPortalConnectionId;

  environment:
    PortalConnectionEnvironment;
};


function requireGermanLaunchPortal(
  portal:
    GermanLaunchPortalConnectionId
): GermanLaunchPortalConnectionId {

  if (
    portal !==
      "immoscout24_de" &&
    portal !==
      "immowelt_de"
  ) {
    throw new Error(
      `Nicht unterstütztes DE-Launch-Portal: ${portal}`
    );
  }

  return portal;
}


function getGermanLaunchProvider(
  portal:
    GermanLaunchPortalConnectionId
): "immoscout24" | "immowelt" {

  return (
    portal ===
      "immowelt_de"
      ? "immowelt"
      : "immoscout24"
  );
}

function requireSwissLaunchPortal(
  portal:
    SwissLaunchPortalConnectionId
): SwissLaunchPortalConnectionId {

  if (
    portal !== "immoscout24_ch" &&
    portal !== "homegate_ch" &&
    portal !== "comparis_ch"
  ) {
    throw new Error(
      `Nicht unterstütztes CH-Launch-Portal: ${portal}`
    );
  }

  return portal;
}


function requirePortalEnvironment(
  environment:
    PortalConnectionEnvironment
): PortalConnectionEnvironment {

  if (
    environment !== "test" &&
    environment !== "production"
  ) {
    throw new Error(
      `Ungültige Portal-Umgebung: ${environment}`
    );
  }

  return environment;
}


function getSwissLaunchProvider(
  portal:
    SwissLaunchPortalConnectionId
): "smg" | "comparis" {

  return (
    portal === "comparis_ch"
      ? "comparis"
      : "smg"
  );
}


function normalizeOptionalExternalId(
  value:
    | string
    | null
    | undefined,
  fieldName: string
):
  | string
  | null
  | undefined {

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  if (clean.length > 255) {
    throw new Error(
      `${fieldName} ist zu lang.`
    );
  }

  return clean;
}


function requireUserId(
  userId: string
): string {

  const clean =
    userId.trim();

  if (!clean) {
    throw new Error(
      "PortalConnection benötigt eine User-ID."
    );
  }

  return clean;
}


function requirePortal<
  TPortal extends PortalId,
>(
  portal: TPortal
): TPortal {

  if (
    !SUPPORTED_PORTALS.includes(
      portal
    )
  ) {
    throw new Error(
      `Nicht unterstütztes Portal: ${portal}`
    );
  }

  return portal;
}


function isSmgPortal(
  portal: PortalId
): portal is SmgPortalId {

  return (
    portal === "immoscout24_ch" ||
    portal === "homegate_ch"
  );
}


function normalizeDatabaseStatus(
  status:
    | string
    | null
    | undefined
): EffectivePortalConnectionStatus {

  switch (status) {

    case "configured":
      return "configured";

    case "verified":
      return "verified";

    case "error":
      return "error";

    default:
      return "not_configured";
  }
}


function getTransportCredentialState(
  portal: PortalId
): PortalConnectionState {

  if (!isSmgPortal(portal)) {
    return "not_configured";
  }

  return getSmgPortalConnectionState(
    portal
  );
}


function buildSnapshot<
  TPortal extends PortalId,
>(
  portal: TPortal,
  connection: PortalConnection | null
): PortalConnectionSnapshot<TPortal> {

  const transportCredentialState =
    getTransportCredentialState(
      portal
    );

  return {
    portal,

    provider:
      connection?.provider ??
      (
        isSmgPortal(portal)
          ? "smg"
          : null
      ),

    environment:
      connection?.environment ??
      null,

    /*
     * Wichtig:
     *
     * Der Kundenstatus wird NICHT
     * automatisch auf "configured"
     * gesetzt, nur weil unser interner
     * SMG-Testzugang via ENV existiert.
     *
     * Kundenverbindung und interne
     * Transport-Credentials bleiben
     * bewusst getrennt.
     */
    status:
      normalizeDatabaseStatus(
        connection?.status
      ),

    databaseConfigured:
      connection !== null,

    transportCredentialState,

    transportCredentialSource:
      transportCredentialState ===
      "configured"
        ? "env"
        : null,

    externalOwnerId:
      connection?.externalOwnerId ??
      null,

    externalUserId:
      connection?.externalUserId ??
      null,

    credentialSource:
      connection?.credentialSource ??
      null,

    lastVerifiedAt:
      connection?.lastVerifiedAt ??
      null,

    createdAt:
      connection?.createdAt ??
      null,

    updatedAt:
      connection?.updatedAt ??
      null,
  };
}


export async function configureSwissLaunchPortalConnection(
  input:
    ConfigureSwissLaunchPortalConnectionInput
): Promise<
  PortalConnectionSnapshot<SwissLaunchPortalConnectionId>
> {

  const userId =
    requireUserId(
      input.userId
    );


  const portal =
    requireSwissLaunchPortal(
      input.portal
    );


  const environment =
    requirePortalEnvironment(
      input.environment
    );


  const provider =
    getSwissLaunchProvider(
      portal
    );


  const externalOwnerId =
    normalizeOptionalExternalId(
      input.externalOwnerId,
      "externalOwnerId"
    );


  const externalUserId =
    normalizeOptionalExternalId(
      input.externalUserId,
      "externalUserId"
    );


  /*
   * Dieser Pfad speichert ausschliesslich
   * nicht geheime Verbindungs-Metadaten.
   *
   * Keine Passwörter, Client Secrets,
   * Access Tokens oder API Keys.
   *
   * Browser-/Setup-Konfiguration darf
   * niemals "verified" setzen.
   *
   * Jede Änderung setzt den Status bewusst
   * auf "configured" und verwirft eine
   * frühere Verifikation.
   */
  const connection =
    await prisma.portalConnection.upsert({
      where: {
        userId_portal: {
          userId,
          portal,
        },
      },

      create: {
        userId,
        provider,
        portal,
        environment,

        status:
          "configured",

        externalOwnerId:
          externalOwnerId ??
          null,

        externalUserId:
          externalUserId ??
          null,
      },

      update: {
        provider,
        environment,

        status:
          "configured",

        lastVerifiedAt:
          null,

        ...(
          externalOwnerId !== undefined
            ? {
                externalOwnerId,
              }
            : {}
        ),

        ...(
          externalUserId !== undefined
            ? {
                externalUserId,
              }
            : {}
        ),
      },
    });


  return buildSnapshot(
    portal,
    connection
  );
}


export async function configureGermanLaunchPortalConnection(
  input:
    ConfigureGermanLaunchPortalConnectionInput
): Promise<
  PortalConnectionSnapshot<GermanLaunchPortalConnectionId>
> {

  const userId =
    requireUserId(
      input.userId
    );


  const portal =
    requireGermanLaunchPortal(
      input.portal
    );


  const environment =
    requirePortalEnvironment(
      input.environment
    );
  const provider =
    getGermanLaunchProvider(
      portal
    );


  /*
   * DE Setup V1 speichert ausschliesslich
   * nicht geheime Verbindungs-Metadaten.
   *
   * Keine Consumer Secrets,
   * OAuth Tokens, Passwörter oder API Keys.
   *
   * Dieser Setup-Pfad kann niemals
   * "verified" setzen.
   */
  const connection =
    await prisma.portalConnection.upsert({
      where: {
        userId_portal: {
          userId,
          portal,
        },
      },

      create: {
        userId,

        provider,

        portal,

        environment,

        status:
          "configured",
      },

      update: {
        provider,

        environment,

        status:
          "configured",

        lastVerifiedAt:
          null,
      },
    });


  return buildSnapshot(
    portal,
    connection
  );
}


export async function getPortalConnection(
  userId: string,
  portal: PortalId
): Promise<PortalConnection | null> {

  const cleanUserId =
    requireUserId(
      userId
    );

  const cleanPortal =
    requirePortal(
      portal
    );

  return prisma.portalConnection.findUnique({
    where: {
      userId_portal: {
        userId: cleanUserId,
        portal: cleanPortal,
      },
    },
  });
}


export async function getPortalConnectionSnapshot<
  TPortal extends PortalId,
>(
  userId: string,
  portal: TPortal
): Promise<PortalConnectionSnapshot<TPortal>> {

  const cleanPortal =
    requirePortal(
      portal
    );

  const connection =
    await getPortalConnection(
      userId,
      cleanPortal
    );

  return buildSnapshot(
    cleanPortal,
    connection
  );
}


export async function getPortalConnectionsForUser(
  userId: string
): Promise<
  PortalConnectionSnapshot<SwissPortalId>[]
> {

  const cleanUserId =
    requireUserId(
      userId
    );

  const connections =
    await prisma.portalConnection.findMany({
      where: {
        userId: cleanUserId,
      },
    });


  const byPortal =
    new Map<
      string,
      PortalConnection
    >(
      connections.map(
        (connection) => [
          connection.portal,
          connection,
        ]
      )
    );


  return SWISS_PORTALS.map(
    (portal) =>
      buildSnapshot(
        portal,
        byPortal.get(portal) ??
        null
      )
  );
}


export async function getGermanPortalConnectionsForUser(
  userId: string
): Promise<
  PortalConnectionSnapshot<GermanPortalId>[]
> {

  const cleanUserId =
    requireUserId(
      userId
    );

  const connections =
    await prisma.portalConnection.findMany({
      where: {
        userId: cleanUserId,
      },
    });


  const byPortal =
    new Map<
      string,
      PortalConnection
    >(
      connections.map(
        (connection) => [
          connection.portal,
          connection,
        ]
      )
    );


  return GERMAN_PORTALS.map(
    (portal) =>
      buildSnapshot(
        portal,
        byPortal.get(portal) ??
        null
      )
  );
}

export async function buildPortalFeedPreview(
  userId: string,
  portal: SwissPortalId
) {

  const cleanUserId =
    requireUserId(
      userId
    );

  const cleanPortal =
    requirePortal(
      portal
    );


  const [
    connection,
    feed,
  ] =
    await Promise.all([
      getPortalConnectionSnapshot(
        cleanUserId,
        cleanPortal
      ),

      buildSwissRetsFeedForUser(
        cleanUserId
      ),
    ]);


  return {
    portal:
      cleanPortal,

    connection,

    feed: {
      valid:
        feed.valid,

      listingCount:
        feed.listingCount,

      validationErrors:
        feed.validationErrors,

      inventory:
        feed.inventory,

      json:
        feed.json,
    },

    /*
     * Expliziter Sicherheitsmarker.
     *
     * V1 ist ausschließlich Preview/
     * Diagnose und führt KEINEN
     * Portal-Import aus.
     */
    publishEnabled:
      false as const,
  };
}
