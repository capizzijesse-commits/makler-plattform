import "server-only";

import {
  createHash,
} from "node:crypto";

import {
  decodePortalPublishListingSnapshot,
} from "./portal-publish-snapshot.server";

import {
  mapPrismaListingToPortal,
} from "./prisma-listing-adapter";

import {
  buildKleinanzeigenDeOpenImmoCandidate,
  KLEINANZEIGEN_DE_OPENIMMO_MINIMUM_VERSION,
} from "./kleinanzeigen-de-openimmo-candidate.server";

import {
  buildKleinanzeigenDeOpenImmoXmlV1,
} from "./kleinanzeigen-de-openimmo-xml.server";


export type KleinanzeigenDeTransportFoundationErrorCode =
  | "KLEINANZEIGEN_PORTAL_MISMATCH"
  | "KLEINANZEIGEN_ENVIRONMENT_NOT_TEST"
  | "KLEINANZEIGEN_ACTION_NOT_SUPPORTED"
  | "KLEINANZEIGEN_LISTING_ID_MISSING"
  | "KLEINANZEIGEN_PROVIDER_MISSING"
  | "KLEINANZEIGEN_OPENIMMO_CANDIDATE_NOT_READY"
  | "KLEINANZEIGEN_OPENIMMO_XML_NOT_READY";


export class KleinanzeigenDeTransportFoundationError
  extends Error {

  readonly code:
    KleinanzeigenDeTransportFoundationErrorCode;


  constructor(
    code:
      KleinanzeigenDeTransportFoundationErrorCode,
    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "KleinanzeigenDeTransportFoundationError";

    this.code =
      code;
  }
}


export type KleinanzeigenDeTransportFoundationJob = {
  id:
    string;

  listingId:
    string |
    null;

  provider:
    string;

  portal:
    string;

  environment:
    string;

  action:
    string;

  payloadSnapshot:
    unknown;
};


export type KleinanzeigenDeOpenImmoProvider =
  Parameters<
    typeof buildKleinanzeigenDeOpenImmoXmlV1
  >[0]["provider"];


export type KleinanzeigenDeLocalTransferArtifactV1 = {
  portal:
    "kleinanzeigen_de";

  environment:
    "test";

  action:
    "publish";

  mode:
    "local_artifact_only";

  networkAttempted:
    false;

  productionEnabled:
    false;

  listingId:
    string;

  standard:
    "OpenImmo";

  minimumOpenImmoVersion:
    "1.2.5";

  fileName:
    string;

  xml:
    string;

  sha256:
    string;
};


function fail(
  code:
    KleinanzeigenDeTransportFoundationErrorCode,
  message:
    string
):
  never {

  throw new KleinanzeigenDeTransportFoundationError(
    code,
    message
  );
}


function requiredText(
  value:
    string |
    null |
    undefined
):
  string |
  null {

  const cleaned =
    value?.trim();

  return cleaned ||
    null;
}


function safeFileStem(
  value:
    string
):
  string {

  const cleaned =
    value
      .trim()
      .replace(
        /[^A-Za-z0-9._-]+/g,
        "-"
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        ""
      )
      .slice(
        0,
        100
      );

  if (cleaned) {
    return cleaned;
  }

  return createHash(
    "sha256"
  )
    .update(
      value
    )
    .digest(
      "hex"
    )
    .slice(
      0,
      20
    );
}


function summarizeErrors(
  errors:
    Array<{
      field:
        string;

      code:
        string;
    }>
):
  string {

  return errors
    .map(
      (error) =>
        `${error.field}:${error.code}`
    )
    .join(
      ", "
    )
    .slice(
      0,
      1000
    );
}


export function buildKleinanzeigenDeLocalTransferArtifactV1(
  input: {
    job:
      KleinanzeigenDeTransportFoundationJob;

    provider:
      KleinanzeigenDeOpenImmoProvider;
  }
):
  KleinanzeigenDeLocalTransferArtifactV1 {

  const job =
    input.job;


  if (
    job.portal !==
    "kleinanzeigen_de"
  ) {
    fail(
      "KLEINANZEIGEN_PORTAL_MISMATCH",
      "Job ist nicht für Kleinanzeigen DE bestimmt."
    );
  }


  /*
   * Foundation V1 bleibt strikt
   * im lokalen Testmodus.
   *
   * Kein Production-Transport.
   */
  if (
    job.environment !==
    "test"
  ) {
    fail(
      "KLEINANZEIGEN_ENVIRONMENT_NOT_TEST",
      "Kleinanzeigen Transport Foundation ist nur im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {
    fail(
      "KLEINANZEIGEN_ACTION_NOT_SUPPORTED",
      "Kleinanzeigen Foundation V1 unterstützt nur publish."
    );
  }


  const listingId =
    requiredText(
      job.listingId
    );

  if (!listingId) {
    fail(
      "KLEINANZEIGEN_LISTING_ID_MISSING",
      "Listing-ID fehlt."
    );
  }


  const providerId =
    requiredText(
      job.provider
    );

  if (!providerId) {
    fail(
      "KLEINANZEIGEN_PROVIDER_MISSING",
      "Provider fehlt."
    );
  }


  /*
   * WICHTIG:
   * Ausschließlich der persistierte
   * Job-Snapshot wird verwendet.
   *
   * Kein erneutes Laden des Listings.
   */
  const decoded =
    decodePortalPublishListingSnapshot({
      payloadSnapshot:
        job.payloadSnapshot,

      expectedPortal:
        "kleinanzeigen_de",

      expectedProvider:
        providerId,

      expectedListingId:
        listingId,

      expectedEnvironment:
        "test",

      expectedMarket:
        "DE",
    });


  const normalized =
    mapPrismaListingToPortal(
      decoded.listing,
      "de"
    );


  const candidate =
    buildKleinanzeigenDeOpenImmoCandidate(
      normalized
    );


  if (
    !candidate.ready
  ) {
    fail(
      "KLEINANZEIGEN_OPENIMMO_CANDIDATE_NOT_READY",
      (
        "Kleinanzeigen OpenImmo-Kandidat ist nicht bereit: " +
        summarizeErrors(
          candidate.errors
        )
      )
    );
  }


  const xmlResult =
    buildKleinanzeigenDeOpenImmoXmlV1({
      candidate,

      updatedAt:
        decoded.listing.updatedAt,

      provider:
        input.provider,
    });


  if (
    !xmlResult.ready ||
    !xmlResult.xml
  ) {
    fail(
      "KLEINANZEIGEN_OPENIMMO_XML_NOT_READY",
      (
        "Kleinanzeigen OpenImmo XML ist nicht bereit: " +
        summarizeErrors(
          xmlResult.errors
        )
      )
    );
  }


  const xml =
    xmlResult.xml;


  const sha256 =
    createHash(
      "sha256"
    )
      .update(
        xml,
        "utf8"
      )
      .digest(
        "hex"
      );


  return {
    portal:
      "kleinanzeigen_de",

    environment:
      "test",

    action:
      "publish",

    mode:
      "local_artifact_only",

    networkAttempted:
      false,

    productionEnabled:
      false,

    listingId,

    standard:
      "OpenImmo",

    minimumOpenImmoVersion:
      KLEINANZEIGEN_DE_OPENIMMO_MINIMUM_VERSION,

    fileName:
      `inserat-ai-${safeFileStem(
        listingId
      )}.xml`,

    xml,

    sha256,
  };
}
