import "server-only";

import type {
  PortalId,
} from "./types";

import {
  evaluatePortalPublishSafety,
  type PortalPublishConnectionStatus,
  type PortalPublishEnvironment,
  type PortalPublishSafetyResult,
} from "./portal-publish-safety.server";


export type ChLaunchPortalId =
  | "immoscout24_ch"
  | "homegate_ch"
  | "comparis_ch";


export type ChPortalLaunchReadinessInput = {
  portal: ChLaunchPortalId;

  connectionStatus:
    PortalPublishConnectionStatus;

  environment:
    PortalPublishEnvironment;

  transportConfigured: boolean;

  adapterVerified: boolean;

  feedValid: boolean;

  validationErrorCount: number;

  explicitPublishEnabled: boolean;
};


export type ChPortalLaunchReadinessResult =
  PortalPublishSafetyResult & {
    portal: ChLaunchPortalId;

    provider:
      | "smg"
      | "comparis";

    launchGroup:
      "ch_portal_connect_v1";
  };


const CH_LAUNCH_PORTALS:
  readonly ChLaunchPortalId[] = [
    "immoscout24_ch",
    "homegate_ch",
    "comparis_ch",
  ];


export function isChLaunchPortal(
  portal: PortalId
): portal is ChLaunchPortalId {

  return (
    CH_LAUNCH_PORTALS as
      readonly PortalId[]
  ).includes(portal);
}


function providerForPortal(
  portal: ChLaunchPortalId
):
  | "smg"
  | "comparis" {

  if (
    portal ===
      "immoscout24_ch" ||
    portal ===
      "homegate_ch"
  ) {
    return "smg";
  }

  return "comparis";
}


export function evaluateChPortalLaunchReadiness(
  input: ChPortalLaunchReadinessInput
): ChPortalLaunchReadinessResult {

  const safety =
    evaluatePortalPublishSafety({
      portal:
        input.portal,

      connectionStatus:
        input.connectionStatus,

      environment:
        input.environment,

      transportConfigured:
        input.transportConfigured,

      adapterVerified:
        input.adapterVerified,

      feedValid:
        input.feedValid,

      validationErrorCount:
        input.validationErrorCount,

      explicitPublishEnabled:
        input.explicitPublishEnabled,
    });


  return {
    ...safety,

    portal:
      input.portal,

    provider:
      providerForPortal(
        input.portal
      ),

    launchGroup:
      "ch_portal_connect_v1",
  };
}


export function evaluateChPortalLaunchBatch(
  inputs:
    readonly ChPortalLaunchReadinessInput[]
): ChPortalLaunchReadinessResult[] {

  return inputs.map(
    evaluateChPortalLaunchReadiness
  );
}


export function allChLaunchPortalsProductionReady(
  results:
    readonly ChPortalLaunchReadinessResult[]
): boolean {

  return CH_LAUNCH_PORTALS.every(
    (portal) => {

      const result =
        results.find(
          (item) =>
            item.portal ===
            portal
        );

      return (
        result?.
          canPublishProduction ===
        true
      );
    }
  );
}


export function getChLaunchPortalIds():
  readonly ChLaunchPortalId[] {

  return CH_LAUNCH_PORTALS;
}