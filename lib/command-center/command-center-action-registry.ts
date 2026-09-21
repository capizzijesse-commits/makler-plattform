/*
 * COMMAND_CENTER_ACTION_REGISTRY_V1
 *
 * Zentrale, explizite Zuordnung zwischen
 * Command-Center-Problemen und erlaubten
 * Benutzeraktionen.
 *
 * Sicherheitsprinzipien:
 *
 * - Kein direkter Portal-Publish.
 * - Kein eigener Retry-Mechanismus.
 * - Auto-Retry bleibt beim Portal-Worker.
 * - Reconcile benutzt ausschließlich die
 *   bestehende Publication-Run-Route.
 * - Prepare führt den Makler zunächst in
 *   den bestehenden Publishing-Workflow.
 */

export type CommandCenterProblemMode =
  | "auto_retry"
  | "reconcile"
  | "user_action"
  | "provider_action"
  | "exhausted";


export type CommandCenterActionId =
  | "OPEN_LISTING"
  | "CHECK_PORTAL_CONNECTION"
  | "OPEN_PROVIDER_SETUP"
  | "PREPARE_PUBLICATION"
  | "RECONCILE_PUBLICATION"
  | "INSPECT_PORTAL_JOB";


export type CommandCenterNavigationActionId =
  Exclude<
    CommandCenterActionId,
    "RECONCILE_PUBLICATION"
  >;


export type CommandCenterExecutionAction =
  | {
      id:
        CommandCenterNavigationActionId;

      mode:
        "navigate";

      listingId:
        string;

      href:
        string;
    }
  | {
      id:
        "RECONCILE_PUBLICATION";

      mode:
        "reconcile";

      listingId:
        string;

      runId:
        string;

      href:
        string;
    };


export function createCommandCenterNavigationAction(
  input: {
    id:
      CommandCenterNavigationActionId;

    listingId:
      string;

    href:
      string;
  }
):
  CommandCenterExecutionAction {

  return {
    id:
      input.id,

    mode:
      "navigate",

    listingId:
      input.listingId,

    href:
      input.href,
  };
}


const CONNECTION_ERROR_CODES =
  new Set([
    "PORTAL_CONNECTION_NOT_FOUND",
    "PORTAL_CONNECTION_NOT_VERIFIED",
    "PORTAL_CONNECTION_NOT_READY",
    "OAUTH_ACCESS_REQUIRED",
    "TEMPORARY_OAUTH_ACCESS_REQUIRED",
    "INVALID_OAUTH_CALLBACK",
    "INVALID_OR_EXPIRED_OAUTH_FLOW",
    "PORTAL_LISTING_NOT_UNLOCKED",
    "INVALID_PORTAL_CONFIGURATION",
  ]);


export function resolveCommandCenterAction(
  input: {
    mode:
      CommandCenterProblemMode;

    listingId:
      string;

    errorCode?:
      string |
      null;

    runId?:
      string |
      null;

    label?:
      string |
      null;
  }
):
  CommandCenterExecutionAction {

  const listingId =
    input.listingId;

  const errorCode =
    input.errorCode
      ?.trim()
      .toUpperCase() ??
    "";

  const label =
    input.label
      ?.trim()
      .toLowerCase() ??
    "";

  const publicationHref =
    `/cockpit/${listingId}#portal-publishing`;


  /*
   * Nur wenn wir eine eindeutige Run-ID haben,
   * darf der Command Center Statusabgleich
   * direkt ausgeführt werden.
   *
   * Ohne Run-ID: fail closed -> nur öffnen.
   */
  if (
    input.mode ===
      "reconcile" &&
    input.runId
  ) {
    return {
      id:
        "RECONCILE_PUBLICATION",

      mode:
        "reconcile",

      listingId,

      runId:
        input.runId,

      href:
        publicationHref,
    };
  }


  if (
    input.mode ===
    "provider_action"
  ) {
    return createCommandCenterNavigationAction({
      id:
        "OPEN_PROVIDER_SETUP",

      listingId,

      href:
        "/cockpit#portale",
    });
  }


  if (
    CONNECTION_ERROR_CODES.has(
      errorCode
    ) ||
    label.includes(
      "verbindung"
    )
  ) {
    return createCommandCenterNavigationAction({
      id:
        "CHECK_PORTAL_CONNECTION",

      listingId,

      href:
        "/cockpit#portale",
    });
  }


  if (
    label.includes(
      "objektdaten"
    )
  ) {
    return createCommandCenterNavigationAction({
      id:
        "OPEN_LISTING",

      listingId,

      href:
        `/cockpit/${listingId}/edit`,
    });
  }


  /*
   * Auto-Retry wird NICHT ausgelöst.
   * Der bestehende Worker besitzt diesen Job.
   *
   * Sollte ein Auto-Retry-Eintrag diese Funktion
   * wider Erwarten erreichen, darf der Nutzer
   * lediglich den Zustand ansehen.
   */
  if (
    input.mode ===
      "auto_retry" ||
    input.mode ===
      "exhausted" ||
    label.includes(
      "retry"
    ) ||
    label.includes(
      "transport"
    ) ||
    input.mode ===
      "reconcile"
  ) {
    return createCommandCenterNavigationAction({
      id:
        "INSPECT_PORTAL_JOB",

      listingId,

      href:
        publicationHref,
    });
  }


  return createCommandCenterNavigationAction({
    id:
      "INSPECT_PORTAL_JOB",

    listingId,

    href:
      publicationHref,
  });
}