import "server-only";

import {
  buildSwissRetsFeedForUser,
} from "./swissrets-feed.server";

import {
  getSmgPublishAccessSnapshot,
  type SmgPublishTransport,
} from "./smg-publish-access.server";

import {
  evaluatePortalPublishSafety,
  type PortalPublishConnectionStatus,
  type PortalPublishEnvironment,
  type PortalPublishSafetyResult,
} from "./portal-publish-safety.server";

import type {
  SmgPortalId,
} from "./types";


export type SmgPublishPayloadFormat =
  | "swissrets_json";


export type SmgPublishPlanInput = {
  userId: string;

  portal: SmgPortalId;

  connectionStatus:
    PortalPublishConnectionStatus;

  environment:
    PortalPublishEnvironment;
};


export type SmgPublishPlan = {
  portal: SmgPortalId;

  transport:
    | SmgPublishTransport
    | null;

  accessState:
    | "access_required"
    | "access_confirmed"
    | "adapter_verified";

  payloadFormat:
    | SmgPublishPayloadFormat
    | null;

  payloadPrepared: boolean;

  payload:
    | string
    | null;

  listingCount: number;

  validationErrorCount: number;

  safety: PortalPublishSafetyResult;

  reasons: string[];
};


function requireUserId(
  userId: string
): string {

  const clean =
    userId.trim();

  if (!clean) {
    throw new Error(
      "SMG Publish Plan benötigt eine User-ID."
    );
  }

  return clean;
}


function transportPayloadReady(
  transport:
    | SmgPublishTransport
    | null
): boolean {

  /*
   * Aktuell haben wir einen validierten
   * SwissRETS-JSON Builder.
   *
   * Ein IDX-Serializer wird erst gebaut,
   * sobald uns der tatsächliche SMG-
   * Transport bestätigt wurde.
   */
  return (
    transport ===
    "swissrets_rest"
  );
}


export async function buildSmgPublishPlanForUser(
  input: SmgPublishPlanInput
): Promise<SmgPublishPlan> {

  const userId =
    requireUserId(
      input.userId
    );

  const access =
    getSmgPublishAccessSnapshot();

  const feed =
    await buildSwissRetsFeedForUser(
      userId
    );

  const payloadAdapterReady =
    transportPayloadReady(
      access.transport
    );

  const adapterVerified =
    access.adapterVerified &&
    payloadAdapterReady;

  const safety =
    evaluatePortalPublishSafety({
      portal:
        input.portal,

      connectionStatus:
        input.connectionStatus,

      environment:
        input.environment,

      transportConfigured:
        access.accessConfirmed &&
        access.transport !== null,

      adapterVerified,

      feedValid:
        feed.valid,

      validationErrorCount:
        feed.validationErrors.length,

      explicitPublishEnabled:
        access.productionEnabled,
    });


  const reasons =
    [...safety.reasons];

  if (
    access.state ===
    "access_required"
  ) {
    reasons.push(
      access.reason
    );
  }


  if (
    access.transport ===
    "idx_ftp"
  ) {
    reasons.push(
      "IDX-FTP ist ausgewählt, aber der IDX-Serializer ist noch nicht implementiert und bleibt deshalb gesperrt."
    );
  }


  const payloadPrepared =
    feed.valid &&
    access.transport ===
      "swissrets_rest";


  return {
    portal:
      input.portal,

    transport:
      access.transport,

    accessState:
      access.state,

    payloadFormat:
      payloadPrepared
        ? "swissrets_json"
        : null,

    payloadPrepared,

    payload:
      payloadPrepared
        ? feed.json
        : null,

    listingCount:
      feed.listingCount,

    validationErrorCount:
      feed.validationErrors.length,

    safety,

    reasons,
  };
}