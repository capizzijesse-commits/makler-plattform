import "server-only";

import {
  decodePortalPublishListingSnapshot,
} from "./portal-publish-snapshot.server";

import {
  mapPrismaListingToPortal,
} from "./prisma-listing-adapter";

import {
  buildImmobilienDeOpenImmoCandidate,
} from "./immobilien-de-openimmo-candidate.server";

import {
  buildImmobilienDeOpenImmoXmlV1,
} from "./immobilien-de-openimmo-xml.server";


export type ImmobilienDeTransportFoundationErrorCode =
  | "IMMOBILIEN_DE_PORTAL_MISMATCH"
  | "IMMOBILIEN_DE_ENVIRONMENT_NOT_TEST"
  | "IMMOBILIEN_DE_ACTION_NOT_SUPPORTED"
  | "IMMOBILIEN_DE_LISTING_ID_MISSING"
  | "IMMOBILIEN_DE_PROVIDER_MISSING"
  | "IMMOBILIEN_DE_OPENIMMO_CANDIDATE_NOT_READY"
  | "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_GATE_BROKEN";


export class ImmobilienDeTransportFoundationError
  extends Error {

  readonly code:
    ImmobilienDeTransportFoundationErrorCode;


  constructor(
    code:
      ImmobilienDeTransportFoundationErrorCode,

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "ImmobilienDeTransportFoundationError";

    this.code =
      code;
  }
}


export type ImmobilienDeTransportFoundationJob = {
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


export type ImmobilienDeOpenImmoProvider =
  Parameters<
    typeof buildImmobilienDeOpenImmoXmlV1
  >[0]["provider"];


export type ImmobilienDeTransportPreflightV1 = {
  portal:
    "immobilien_de";

  environment:
    "test";

  action:
    "publish";

  mode:
    "preflight_only";

  transportProtocol:
    "ftp";

  networkAttempted:
    false;

  productionEnabled:
    false;

  listingId:
    string;

  candidateReady:
    true;

  xmlReady:
    false;

  portalProfileVerified:
    false;

  providerIdProfileVerified:
    false;

  portalBlocker:
    "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_UNCONFIRMED";
};


function fail(
  code:
    ImmobilienDeTransportFoundationErrorCode,

  message:
    string
):
  never {

  throw new ImmobilienDeTransportFoundationError(
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
      (
        error
      ) =>
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


export function buildImmobilienDeTransportPreflightV1(
  input: {
    job:
      ImmobilienDeTransportFoundationJob;

    provider:
      ImmobilienDeOpenImmoProvider;
  }
):
  ImmobilienDeTransportPreflightV1 {

  const job =
    input.job;


  if (
    job.portal !==
    "immobilien_de"
  ) {

    fail(
      "IMMOBILIEN_DE_PORTAL_MISMATCH",
      "Job ist nicht für Immobilien.de bestimmt."
    );
  }


  /*
   * Foundation bleibt strikt
   * im Testmodus.
   */
  if (
    job.environment !==
    "test"
  ) {

    fail(
      "IMMOBILIEN_DE_ENVIRONMENT_NOT_TEST",
      "Immobilien.de Transport Foundation ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "IMMOBILIEN_DE_ACTION_NOT_SUPPORTED",
      "Immobilien.de Foundation V1 unterstützt ausschließlich publish."
    );
  }


  const listingId =
    requiredText(
      job.listingId
    );


  if (!listingId) {

    fail(
      "IMMOBILIEN_DE_LISTING_ID_MISSING",
      "Listing-ID fehlt."
    );
  }


  const providerId =
    requiredText(
      job.provider
    );


  if (!providerId) {

    fail(
      "IMMOBILIEN_DE_PROVIDER_MISSING",
      "Provider fehlt."
    );
  }


  /*
   * Ausschließlich der persistierte
   * Queue-Snapshot wird verwendet.
   */
  const decoded =
    decodePortalPublishListingSnapshot({
      payloadSnapshot:
        job.payloadSnapshot,

      expectedPortal:
        "immobilien_de",

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
    buildImmobilienDeOpenImmoCandidate(
      normalized
    );


  if (
    !candidate.ready
  ) {

    fail(
      "IMMOBILIEN_DE_OPENIMMO_CANDIDATE_NOT_READY",
      (
        "Immobilien.de OpenImmo-Kandidat ist nicht bereit: " +
        summarizeErrors(
          candidate.errors
        )
      )
    );
  }


  /*
   * Der Immobilien.de XML-Wrapper
   * muss aktuell absichtlich blockieren,
   * weil das echte openimmo_anid-Profil
   * noch nicht bestätigt wurde.
   */
  const xmlResult =
    buildImmobilienDeOpenImmoXmlV1({
      candidate,

      updatedAt:
        decoded.listing.updatedAt,

      provider:
        input.provider,
    });


  /*
   * Sicherheitsinvariante:
   *
   * Solange das Profil nicht verifiziert
   * wurde, darf hier niemals plötzlich
   * fertiges XML entstehen.
   */
  if (
    xmlResult.portalBlocker !==
      "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_UNCONFIRMED" ||
    xmlResult.portalProfileVerified !==
      false ||
    xmlResult.providerIdProfileVerified !==
      false ||
    xmlResult.ready ===
      true ||
    Boolean(
      xmlResult.xml
    )
  ) {

    fail(
      "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_GATE_BROKEN",
      "Immobilien.de Provider-ID-Sicherheitsgate verhält sich unerwartet."
    );
  }


  return {
    portal:
      "immobilien_de",

    environment:
      "test",

    action:
      "publish",

    mode:
      "preflight_only",

    transportProtocol:
      "ftp",

    networkAttempted:
      false,

    productionEnabled:
      false,

    listingId,

    candidateReady:
      true,

    xmlReady:
      false,

    portalProfileVerified:
      false,

    providerIdProfileVerified:
      false,

    portalBlocker:
      "IMMOBILIEN_DE_PROVIDER_ID_PROFILE_UNCONFIRMED",
  };
}
