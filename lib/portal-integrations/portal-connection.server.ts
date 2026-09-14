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
