import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  createPortalPublishJob,
  type PortalPublishAction,
} from "@/lib/portal-integrations/portal-publish-job-store.server";

import type {
  GermanPortalId,
} from "@/lib/portal-integrations/types";


const GERMAN_PORTALS:
  readonly GermanPortalId[] = [
    "immoscout24_de",
    "immowelt_de",
    "kleinanzeigen_de",
    "wg_gesucht_de",
    "immobilien_de",
  ];


export type GermanPortalJobCreationErrorCode =
  | "PORTAL_PUBLISH_QUEUE_DISABLED"
  | "PORTAL_LISTING_NOT_FOUND"
  | "PORTAL_LISTING_WRONG_MARKET"
  | "PORTAL_LISTING_NOT_UNLOCKED"
  | "PORTAL_CONNECTION_NOT_FOUND"
  | "PORTAL_CONNECTION_NOT_VERIFIED"
  | "PORTAL_ENVIRONMENT_NOT_TEST"
  | "PORTAL_ACTION_NOT_SUPPORTED";


export class GermanPortalJobCreationError
  extends Error {

  readonly code:
    GermanPortalJobCreationErrorCode;

  readonly httpStatus:
    number;


  constructor(
    code:
      GermanPortalJobCreationErrorCode,

    httpStatus:
      number,

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "GermanPortalJobCreationError";

    this.code =
      code;

    this.httpStatus =
      httpStatus;
  }
}


export function isGermanPortalId(
  value:
    string
):
  value is GermanPortalId {

  return (
    GERMAN_PORTALS as
      readonly string[]
  ).includes(
    value
  );
}


export function isPortalPublishQueueEnabled():
  boolean {

  return (
    process.env
      .PORTAL_PUBLISH_QUEUE_ENABLED
      ?.trim() ===
    "1"
  );
}


function requiredText(
  value:
    string,
  label:
    string
):
  string {

  const clean =
    value.trim();

  if (!clean) {
    throw new Error(
      `${label} fehlt.`
    );
  }

  return clean;
}


export async function createGermanPortalPublishJobFromListing(
  input: {
    userId:
      string;

    listingId:
      string;

    portal:
      GermanPortalId;

    action?:
      PortalPublishAction;

    scheduledFor?:
      Date |
      null;
  }
) {

  /*
   * HARD GATE:
   *
   * Job-Erzeugung ist standardmässig AUS.
   * Ohne explizites Queue-Gate
   * wird nicht einmal ein Queue-Eintrag
   * erstellt.
   */
  if (
    !isPortalPublishQueueEnabled()
  ) {

    throw new GermanPortalJobCreationError(
      "PORTAL_PUBLISH_QUEUE_DISABLED",
      409,
      "Portal-Publish-Queue ist nicht freigegeben."
    );
  }


  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const listingId =
    requiredText(
      input.listingId,
      "Listing ID"
    );

  const action =
    input.action ??
    "publish";


  /*
   * V1 erlaubt absichtlich
   * nur neue Publish-Jobs.
   *
   * Update / Unpublish / Sync
   * folgen erst mit verifizierten
   * Portal-Transporten.
   */
  if (
    action !==
    "publish"
  ) {

    throw new GermanPortalJobCreationError(
      "PORTAL_ACTION_NOT_SUPPORTED",
      400,
      "Portal-Aktion ist in V1 noch nicht freigegeben."
    );
  }


  /*
   * Listing zuerst prüfen.
   *
   * Keine Payment-/Unlock-Manipulation.
   */
  const listing =
    await prisma.listing.findFirst({
      where: {
        id:
          listingId,

        userId,

        archivedAt:
          null,
      },

      select: {
        id:
          true,

        updatedAt:
          true,

        projectName:
          true,

        street:
          true,

        location:
          true,

        postalCode:
          true,

        countryCode:
          true,

        market:
          true,

        propertyType:
          true,

        rooms:
          true,

        livingArea:
          true,

        price:
          true,

        highlights:
          true,

        style:
          true,

        generatedVariants:
          true,

        unlockStatus:
          true,

        images: {
          orderBy: [
            {
              position:
                "asc",
            },
            {
              createdAt:
                "asc",
            },
          ],

          select: {
            url:
              true,

            position:
              true,

            isPrimary:
              true,

            fileName:
              true,
          },
        },
      },
    });


  if (!listing) {

    throw new GermanPortalJobCreationError(
      "PORTAL_LISTING_NOT_FOUND",
      404,
      "Inserat wurde nicht gefunden."
    );
  }


  if (
    listing.countryCode !==
    "DE"
  ) {

    throw new GermanPortalJobCreationError(
      "PORTAL_LISTING_WRONG_MARKET",
      409,
      "Dieses Inserat ist kein deutsches Portal-Inserat."
    );
  }


  if (
    listing.unlockStatus !==
      "paid" &&
    listing.unlockStatus !==
      "included"
  ) {

    throw new GermanPortalJobCreationError(
      "PORTAL_LISTING_NOT_UNLOCKED",
      409,
      "Inserat ist für Portal-Transfer noch nicht freigeschaltet."
    );
  }


  /*
   * Portal-Verbindung gehört
   * zwingend demselben User.
   */
  const connection =
    await prisma.portalConnection.findUnique({
      where: {
        userId_portal: {
          userId,
          portal:
            input.portal,
        },
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

        status:
          true,
      },
    });


  if (!connection) {

    throw new GermanPortalJobCreationError(
      "PORTAL_CONNECTION_NOT_FOUND",
      409,
      "Portal-Verbindung ist nicht eingerichtet."
    );
  }


  if (
    connection.status !==
    "verified"
  ) {

    throw new GermanPortalJobCreationError(
      "PORTAL_CONNECTION_NOT_VERIFIED",
      409,
      "Portal-Verbindung ist noch nicht verifiziert."
    );
  }


  /*
   * Aktuelle Foundation bleibt
   * strikt im Testmodus.
   *
   * Production-Jobs werden erst
   * nach echter Portal-Freigabe erlaubt.
   */
  if (
    connection.environment !==
    "test"
  ) {

    throw new GermanPortalJobCreationError(
      "PORTAL_ENVIRONMENT_NOT_TEST",
      409,
      "Portal-Job-Erzeugung ist derzeit nur im Testmodus erlaubt."
    );
  }


  /*
   * Secret-freier, deterministischer
   * Listing-Snapshot.
   *
   * Dieser Snapshot wird gleichzeitig
   * für den Payload-Fingerprint und
   * damit für Idempotency verwendet.
   */
  const payloadSnapshot = {
    schemaVersion:
      1,

    market:
      "DE",

    target: {
      portal:
        connection.portal,

      provider:
        connection.provider,

      environment:
        connection.environment,
    },

    listing: {
      id:
        listing.id,

      updatedAt:
        listing.updatedAt.toISOString(),

      projectName:
        listing.projectName,

      street:
        listing.street,

      location:
        listing.location,

      postalCode:
        listing.postalCode,

      countryCode:
        listing.countryCode,

      market:
        listing.market,

      propertyType:
        listing.propertyType,

      rooms:
        listing.rooms,

      livingArea:
        listing.livingArea,

      price:
        listing.price,

      highlights:
        listing.highlights,

      style:
        listing.style,

      generatedVariants:
        listing.generatedVariants,

      images:
        listing.images.map(
          (
            image
          ) => ({
            url:
              image.url,

            position:
              image.position,

            isPrimary:
              image.isPrimary,

            fileName:
              image.fileName,
          })
        ),
    },
  };


  return createPortalPublishJob({
    userId,

    listingId:
      listing.id,

    connectionId:
      connection.id,

    action:
      "publish",

    payloadSnapshot,

    scheduledFor:
      input.scheduledFor ??
      null,
  });
}