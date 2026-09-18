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
  buildImmoweltDeOpenImmoCandidate,
  IMMOWELT_DE_OPENIMMO_STANDARD_RELEASE,
  IMMOWELT_DE_OPENIMMO_XML_VERSION,
} from "./immowelt-de-openimmo-candidate.server";

import {
  buildImmoweltDeOpenImmoXmlV1,
} from "./immowelt-de-openimmo-xml.server";


export type ImmoweltDeTransportFoundationErrorCode =
  | "IMMOWELT_PORTAL_MISMATCH"
  | "IMMOWELT_ENVIRONMENT_NOT_TEST"
  | "IMMOWELT_ACTION_NOT_SUPPORTED"
  | "IMMOWELT_LISTING_ID_MISSING"
  | "IMMOWELT_PROVIDER_MISSING"
  | "IMMOWELT_OPENIMMO_CANDIDATE_NOT_READY"
  | "IMMOWELT_OPENIMMO_XML_NOT_READY";


export class ImmoweltDeTransportFoundationError
  extends Error {

  readonly code:
    ImmoweltDeTransportFoundationErrorCode;


  constructor(
    code:
      ImmoweltDeTransportFoundationErrorCode,

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "ImmoweltDeTransportFoundationError";

    this.code =
      code;
  }
}


export type ImmoweltDeTransportFoundationJob = {
  id:
    string;

  listingId:
    string | null;

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


export type ImmoweltDeOpenImmoProvider =
  Parameters<
    typeof buildImmoweltDeOpenImmoXmlV1
  >[0]["provider"];


export type ImmoweltDeLocalTransferArtifactV1 = {
  portal:
    "immowelt_de";

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

  standardRelease:
    "1.2.7d";

  xmlVersion:
    "1.2.7";

  fileName:
    string;

  xml:
    string;

  sha256:
    string;
};


function fail(
  code:
    ImmoweltDeTransportFoundationErrorCode,

  message:
    string
):
  never {

  throw new ImmoweltDeTransportFoundationError(
    code,
    message
  );
}


function requiredText(
  value:
    string | null | undefined
):
  string | null {

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


export function buildImmoweltDeLocalTransferArtifactV1(
  input: {
    job:
      ImmoweltDeTransportFoundationJob;

    provider:
      ImmoweltDeOpenImmoProvider;
  }
):
  ImmoweltDeLocalTransferArtifactV1 {

  const job =
    input.job;


  if (
    job.portal !==
    "immowelt_de"
  ) {

    fail(
      "IMMOWELT_PORTAL_MISMATCH",
      "Job ist nicht für Immowelt DE bestimmt."
    );
  }


  /*
   * Foundation V1 bleibt strikt lokal.
   * Kein Production Transport.
   */
  if (
    job.environment !==
    "test"
  ) {

    fail(
      "IMMOWELT_ENVIRONMENT_NOT_TEST",
      "Immowelt Transport Foundation ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "IMMOWELT_ACTION_NOT_SUPPORTED",
      "Immowelt Foundation V1 unterstützt ausschließlich publish."
    );
  }


  const listingId =
    requiredText(
      job.listingId
    );


  if (!listingId) {

    fail(
      "IMMOWELT_LISTING_ID_MISSING",
      "Listing-ID fehlt."
    );
  }


  const providerId =
    requiredText(
      job.provider
    );


  if (!providerId) {

    fail(
      "IMMOWELT_PROVIDER_MISSING",
      "Provider fehlt."
    );
  }


  /*
   * Ausschließlich der persistierte
   * Queue-Snapshot wird verwendet.
   *
   * Das aktuelle Listing wird NICHT
   * erneut aus der DB geladen.
   */
  const decoded =
    decodePortalPublishListingSnapshot({
      payloadSnapshot:
        job.payloadSnapshot,

      expectedPortal:
        "immowelt_de",

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
    buildImmoweltDeOpenImmoCandidate(
      normalized
    );


  if (
    !candidate.ready
  ) {

    fail(
      "IMMOWELT_OPENIMMO_CANDIDATE_NOT_READY",
      (
        "Immowelt OpenImmo-Kandidat ist nicht bereit: " +
        summarizeErrors(
          candidate.errors
        )
      )
    );
  }


  const xmlResult =
    buildImmoweltDeOpenImmoXmlV1({
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
      "IMMOWELT_OPENIMMO_XML_NOT_READY",
      (
        "Immowelt OpenImmo XML ist nicht bereit: " +
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
      "immowelt_de",

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

    standardRelease:
      IMMOWELT_DE_OPENIMMO_STANDARD_RELEASE,

    xmlVersion:
      IMMOWELT_DE_OPENIMMO_XML_VERSION,

    fileName:
      `inserat-ai-immowelt-${safeFileStem(
        listingId
      )}.xml`,

    xml,

    sha256,
  };
}
