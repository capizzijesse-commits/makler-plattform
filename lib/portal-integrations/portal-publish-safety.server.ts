import "server-only";

import type {
  PortalId,
} from "./types";


export type PortalPublishConnectionStatus =
  | "not_configured"
  | "configured"
  | "verified"
  | "error";


export type PortalPublishEnvironment =
  | "test"
  | "production";


export type PortalPublishSafetyInput = {
  portal: PortalId;

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


export type PortalPublishSafetyResult = {
  portal: PortalId;

  canPrepare: boolean;

  canRunTransportTest: boolean;

  canPublishProduction: boolean;

  mode:
    | "blocked"
    | "prepare_only"
    | "test_only"
    | "production_ready";

  reasons: string[];
};


export function evaluatePortalPublishSafety(
  input: PortalPublishSafetyInput
): PortalPublishSafetyResult {

  const reasons: string[] = [];

  const feedSafe =
    input.feedValid &&
    input.validationErrorCount === 0;

  const connectionConfigured =
    input.connectionStatus ===
      "configured" ||
    input.connectionStatus ===
      "verified";

  const connectionVerified =
    input.connectionStatus ===
    "verified";


  const canPrepare =
    feedSafe;


  const canRunTransportTest =
    feedSafe &&
    connectionConfigured &&
    input.transportConfigured &&
    input.adapterVerified &&
    input.environment ===
      "test";


  const canPublishProduction =
    feedSafe &&
    connectionVerified &&
    input.transportConfigured &&
    input.adapterVerified &&
    input.environment ===
      "production" &&
    input.explicitPublishEnabled;


  if (!input.feedValid) {
    reasons.push(
      "Portal-Feed ist nicht valide."
    );
  }

  if (
    input.validationErrorCount >
    0
  ) {
    reasons.push(
      "Portal-Feed enthält Validierungsfehler."
    );
  }

  if (
    input.connectionStatus ===
    "not_configured"
  ) {
    reasons.push(
      "Portal-Verbindung ist nicht konfiguriert."
    );
  }

  if (
    input.connectionStatus ===
    "error"
  ) {
    reasons.push(
      "Portal-Verbindung befindet sich im Fehlerstatus."
    );
  }

  if (!input.transportConfigured) {
    reasons.push(
      "Transport-Zugang ist nicht konfiguriert."
    );
  }

  if (!input.adapterVerified) {
    reasons.push(
      "Portal-Adapter ist noch nicht verifiziert."
    );
  }

  if (
    input.environment ===
      "production" &&
    !connectionVerified
  ) {
    reasons.push(
      "Produktionsverbindung ist noch nicht verifiziert."
    );
  }

  if (
    input.environment ===
      "production" &&
    !input.explicitPublishEnabled
  ) {
    reasons.push(
      "Produktions-Publishing wurde nicht ausdrücklich freigegeben."
    );
  }


  let mode:
    PortalPublishSafetyResult["mode"];

  if (canPublishProduction) {
    mode =
      "production_ready";
  }
  else if (canRunTransportTest) {
    mode =
      "test_only";
  }
  else if (canPrepare) {
    mode =
      "prepare_only";
  }
  else {
    mode =
      "blocked";
  }


  return {
    portal:
      input.portal,

    canPrepare,

    canRunTransportTest,

    canPublishProduction,

    mode,

    reasons,
  };
}


export function assertProductionPublishAllowed(
  input: PortalPublishSafetyInput
): PortalPublishSafetyResult {

  const result =
    evaluatePortalPublishSafety(
      input
    );

  if (
    !result.canPublishProduction
  ) {
    throw new Error(
      [
        `PORTAL_PUBLISH_BLOCKED:${input.portal}`,
        ...result.reasons,
      ].join(" ")
    );
  }

  return result;
}