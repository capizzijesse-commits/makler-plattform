import "server-only";

import {
  decodePortalPublishListingSnapshot,
} from "./portal-publish-snapshot.server";

import {
  mapPrismaListingToPortal,
} from "./prisma-listing-adapter";

import {
  getWgGesuchtDeAccessSnapshot,
} from "./wg-gesucht-de-access.server";

import {
  buildWgGesuchtDeOpenImmoCandidate,
} from "./wg-gesucht-de-openimmo-candidate.server";

import {
  buildWgGesuchtDeOpenImmoXmlV1,
} from "./wg-gesucht-de-openimmo-xml.server";


export type WgGesuchtDeTransportFoundationErrorCode =
  | "WG_GESUCHT_DE_PORTAL_MISMATCH"
  | "WG_GESUCHT_DE_ENVIRONMENT_NOT_TEST"
  | "WG_GESUCHT_DE_ACTION_NOT_SUPPORTED"
  | "WG_GESUCHT_DE_LISTING_ID_MISSING"
  | "WG_GESUCHT_DE_PROVIDER_MISSING"
  | "WG_GESUCHT_DE_ACCESS_GATE_BROKEN"
  | "WG_GESUCHT_DE_OPENIMMO_CANDIDATE_NOT_READY"
  | "WG_GESUCHT_DE_API_PROFILE_GATE_BROKEN";


export class WgGesuchtDeTransportFoundationError
  extends Error {

  readonly code:
    WgGesuchtDeTransportFoundationErrorCode;


  constructor(
    code:
      WgGesuchtDeTransportFoundationErrorCode,

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "WgGesuchtDeTransportFoundationError";

    this.code =
      code;
  }
}


export type WgGesuchtDeTransportFoundationJob = {
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


export type WgGesuchtDeOpenImmoProvider =
  Parameters<
    typeof buildWgGesuchtDeOpenImmoXmlV1
  >[0]["provider"];


export type WgGesuchtDeTransportPreflightV1 = {
  portal:
    "wg_gesucht_de";

  environment:
    "test";

  action:
    "publish";

  mode:
    "preflight_only";

  importFormat:
    "openimmo";

  transportInterface:
    "openimmo_api";

  accessState:
    "partner_access_required";

  endpointConfigured:
    false;

  authenticationConfigured:
    false;

  transportConfigured:
    false;

  networkTested:
    false;

  networkAttempted:
    false;

  adapterVerified:
    false;

  productionEnabled:
    false;

  listingId:
    string;

  candidateReady:
    true;

  xmlReady:
    false;

  apiProfileVerified:
    false;

  authProfileVerified:
    false;

  providerIdProfileVerified:
    false;

  portalBlocker:
    "WG_GESUCHT_DE_API_PROFILE_UNCONFIRMED";
};


function fail(
  code:
    WgGesuchtDeTransportFoundationErrorCode,

  message:
    string
):
  never {

  throw new WgGesuchtDeTransportFoundationError(
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


export function buildWgGesuchtDeTransportPreflightV1(
  input: {
    job:
      WgGesuchtDeTransportFoundationJob;

    provider:
      WgGesuchtDeOpenImmoProvider;
  }
):
  WgGesuchtDeTransportPreflightV1 {

  const job =
    input.job;


  if (
    job.portal !==
    "wg_gesucht_de"
  ) {

    fail(
      "WG_GESUCHT_DE_PORTAL_MISMATCH",
      "Job ist nicht für WG-Gesucht bestimmt."
    );
  }


  if (
    job.environment !==
    "test"
  ) {

    fail(
      "WG_GESUCHT_DE_ENVIRONMENT_NOT_TEST",
      "WG-Gesucht Transport Foundation ist ausschließlich im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "WG_GESUCHT_DE_ACTION_NOT_SUPPORTED",
      "WG-Gesucht Foundation V1 unterstützt ausschließlich publish."
    );
  }


  const listingId =
    requiredText(
      job.listingId
    );


  if (!listingId) {

    fail(
      "WG_GESUCHT_DE_LISTING_ID_MISSING",
      "Listing-ID fehlt."
    );
  }


  const connectionProvider =
    requiredText(
      job.provider
    );


  if (!connectionProvider) {

    fail(
      "WG_GESUCHT_DE_PROVIDER_MISSING",
      "Provider fehlt."
    );
  }


  const access =
    getWgGesuchtDeAccessSnapshot();


  if (
    access.accessState !==
      "partner_access_required" ||
    access.importFormat !==
      "openimmo" ||
    access.interfaceType !==
      "openimmo_api" ||
    access.endpointConfigured !==
      false ||
    access.authenticationConfigured !==
      false ||
    access.transportConfigured !==
      false ||
    access.networkTested !==
      false ||
    access.adapterVerified !==
      false ||
    access.productionEnabled !==
      false
  ) {

    fail(
      "WG_GESUCHT_DE_ACCESS_GATE_BROKEN",
      "WG-Gesucht Access-Sicherheitsgate verhält sich unerwartet."
    );
  }


  /*
   * Nur persistierter Queue-Snapshot.
   * Kein erneutes DB-Laden.
   */
  const decoded =
    decodePortalPublishListingSnapshot({
      payloadSnapshot:
        job.payloadSnapshot,

      expectedPortal:
        "wg_gesucht_de",

      expectedProvider:
        connectionProvider,

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
    buildWgGesuchtDeOpenImmoCandidate(
      normalized
    );


  if (
    !candidate.ready
  ) {

    fail(
      "WG_GESUCHT_DE_OPENIMMO_CANDIDATE_NOT_READY",
      (
        "WG-Gesucht OpenImmo-Kandidat ist nicht bereit: " +
        summarizeErrors(
          candidate.errors
        )
      )
    );
  }


  /*
   * XML muss aktuell absichtlich
   * blockiert bleiben.
   */
  const xmlResult =
    buildWgGesuchtDeOpenImmoXmlV1({
      candidate,

      updatedAt:
        decoded.listing.updatedAt,

      provider:
        input.provider,
    });


  if (
    xmlResult.portalBlocker !==
      "WG_GESUCHT_DE_API_PROFILE_UNCONFIRMED" ||
    xmlResult.apiProfileVerified !==
      false ||
    xmlResult.authProfileVerified !==
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
      "WG_GESUCHT_DE_API_PROFILE_GATE_BROKEN",
      "WG-Gesucht API-Profil-Sicherheitsgate verhält sich unerwartet."
    );
  }


  return {
    portal:
      "wg_gesucht_de",

    environment:
      "test",

    action:
      "publish",

    mode:
      "preflight_only",

    importFormat:
      "openimmo",

    transportInterface:
      "openimmo_api",

    accessState:
      "partner_access_required",

    endpointConfigured:
      false,

    authenticationConfigured:
      false,

    transportConfigured:
      false,

    networkTested:
      false,

    networkAttempted:
      false,

    adapterVerified:
      false,

    productionEnabled:
      false,

    listingId,

    candidateReady:
      true,

    xmlReady:
      false,

    apiProfileVerified:
      false,

    authProfileVerified:
      false,

    providerIdProfileVerified:
      false,

    portalBlocker:
      "WG_GESUCHT_DE_API_PROFILE_UNCONFIRMED",
  };
}