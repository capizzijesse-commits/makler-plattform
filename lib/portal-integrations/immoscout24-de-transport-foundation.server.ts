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
  buildImmoScout24DeApartmentBuyDryRun,
} from "./immoscout24-de-payload.server";


export type ImmoScout24DeTransportFoundationErrorCode =
  | "IMMOSCOUT24_DE_PORTAL_MISMATCH"
  | "IMMOSCOUT24_DE_ENVIRONMENT_NOT_TEST"
  | "IMMOSCOUT24_DE_ACTION_NOT_SUPPORTED"
  | "IMMOSCOUT24_DE_LISTING_ID_MISSING"
  | "IMMOSCOUT24_DE_PROVIDER_MISSING"
  | "IMMOSCOUT24_DE_PAYLOAD_NOT_READY"
  | "IMMOSCOUT24_DE_PAYLOAD_GATE_BROKEN";


export class ImmoScout24DeTransportFoundationError
  extends Error {

  readonly code:
    ImmoScout24DeTransportFoundationErrorCode;


  constructor(
    code:
      ImmoScout24DeTransportFoundationErrorCode,

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "ImmoScout24DeTransportFoundationError";

    this.code =
      code;
  }
}


export type ImmoScout24DeTransportFoundationJob = {
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


export type ImmoScout24DeTransportPreflightV1 = {
  portal:
    "immoscout24_de";

  environment:
    "test";

  action:
    "publish";

  mode:
    "payload_preflight_only";

  listingId:
    string;

  realEstateType:
    "apartmentBuy";

  payloadReady:
    true;

  xmlReady:
    true;

  payloadBytes:
    number;

  sha256:
    string;

  networkAttempted:
    false;

  productionEnabled:
    false;
};


function fail(
  code:
    ImmoScout24DeTransportFoundationErrorCode,

  message:
    string
):
  never {

  throw new ImmoScout24DeTransportFoundationError(
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


export function buildImmoScout24DeTransportPreflightV1(
  input: {
    job:
      ImmoScout24DeTransportFoundationJob;
  }
):
  ImmoScout24DeTransportPreflightV1 {

  const job =
    input.job;


  if (
    job.portal !==
    "immoscout24_de"
  ) {

    fail(
      "IMMOSCOUT24_DE_PORTAL_MISMATCH",
      "Job ist nicht für ImmoScout24 DE bestimmt."
    );
  }


  if (
    job.environment !==
    "test"
  ) {

    fail(
      "IMMOSCOUT24_DE_ENVIRONMENT_NOT_TEST",
      "ImmoScout24 DE Foundation ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "IMMOSCOUT24_DE_ACTION_NOT_SUPPORTED",
      "ImmoScout24 DE Foundation V1 unterstützt ausschließlich publish."
    );
  }


  const listingId =
    requiredText(
      job.listingId
    );


  if (!listingId) {

    fail(
      "IMMOSCOUT24_DE_LISTING_ID_MISSING",
      "Listing-ID fehlt."
    );
  }


  const provider =
    requiredText(
      job.provider
    );


  if (!provider) {

    fail(
      "IMMOSCOUT24_DE_PROVIDER_MISSING",
      "Provider fehlt."
    );
  }


  const decoded =
    decodePortalPublishListingSnapshot({
      payloadSnapshot:
        job.payloadSnapshot,

      expectedPortal:
        "immoscout24_de",

      expectedProvider:
        provider,

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


  const payload =
    buildImmoScout24DeApartmentBuyDryRun({
      listing:
        normalized,

      commissionRate:
        decoded.listing.finance
          ?.commissionRate ??
        null,
    });


  if (
    !payload.ready
  ) {

    fail(
      "IMMOSCOUT24_DE_PAYLOAD_NOT_READY",
      (
        "ImmoScout24 DE Payload ist nicht bereit: " +
        summarizeErrors(
          payload.errors
        )
      )
    );
  }


  if (
    payload.realEstateType !==
      "apartmentBuy" ||
    typeof payload.xml !==
      "string" ||
    !payload.xml.trim()
  ) {

    fail(
      "IMMOSCOUT24_DE_PAYLOAD_GATE_BROKEN",
      "ImmoScout24 DE Payload-Sicherheitsgate verhält sich unerwartet."
    );
  }


  const xml =
    payload.xml;

  const payloadBytes =
    Buffer.byteLength(
      xml,
      "utf8"
    );

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
      "immoscout24_de",

    environment:
      "test",

    action:
      "publish",

    mode:
      "payload_preflight_only",

    listingId,

    realEstateType:
      "apartmentBuy",

    payloadReady:
      true,

    xmlReady:
      true,

    payloadBytes,

    sha256,

    networkAttempted:
      false,

    productionEnabled:
      false,
  };
}