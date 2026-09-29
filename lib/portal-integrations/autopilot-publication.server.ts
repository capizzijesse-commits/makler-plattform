import "server-only";

import {
  getGermanPortalConnectionsForUser,
  getPortalConnectionsForUser,
} from "@/lib/portal-integrations/portal-connection.server";

import {
  buildSmgPublishPlanForUser,
} from "@/lib/portal-integrations/smg-publish-plan.server";

import type {
  SmgPortalId,
} from "@/lib/portal-integrations/types";


export type AutopilotPublicationTarget = {
  portal: string;
  status: string;
  environment: "test" | "production";

  connectionId:
    string | null;

  provider:
    string | null;

  state:
    | "ready"
    | "prepared"
    | "blocked";

  reason:
    string | null;
};


export type AutopilotPublicationPreparation = {
  market: "CH" | "DE" | "unsupported";
  targets: AutopilotPublicationTarget[];
  readyTargetCount: number;
  preparedTargetCount: number;
  blockedTargetCount: number;
};


function normalizeMarket(
  market: string | null | undefined,
  countryCode: string | null | undefined
): "CH" | "DE" | "unsupported" {

  const country =
    countryCode
      ?.trim()
      .toUpperCase();

  const marketValue =
    market
      ?.trim()
      .toUpperCase();

  if (
    country === "CH" ||
    marketValue === "CH"
  ) {
    return "CH";
  }

  if (
    country === "DE" ||
    marketValue === "DE"
  ) {
    return "DE";
  }

  return "unsupported";
}


function connectionEnvironment(
  value: string | null | undefined
): "test" | "production" {

  return value === "production"
    ? "production"
    : "test";
}


function isSmgPortal(
  portal: string
): portal is SmgPortalId {

  return (
    portal === "immoscout24_ch" ||
    portal === "homegate_ch"
  );
}


export async function prepareAutopilotPublicationForUser(
  input: {
    userId: string;
    market?: string | null;
    countryCode?: string | null;
  }
): Promise<AutopilotPublicationPreparation> {

  const market =
    normalizeMarket(
      input.market,
      input.countryCode
    );

  if (market === "unsupported") {
    return {
      market,
      targets: [],
      readyTargetCount: 0,
      preparedTargetCount: 0,
      blockedTargetCount: 0,
    };
  }


  if (market === "DE") {

    const connections =
      await getGermanPortalConnectionsForUser(
        input.userId
      );

    const targets =
      connections
        .filter(
          (connection) =>
            connection.status === "verified"
        )
        .map(
          (connection): AutopilotPublicationTarget => ({
            portal:
              connection.portal,

            status:
              connection.status,

            environment:
              connectionEnvironment(
                connection.environment
              ),

            connectionId:
              connection.connectionId,

            provider:
              connection.provider,

            state:
              "ready",

            reason:
              null,
          })
        );

    return {
      market,
      targets,
      readyTargetCount:
        targets.length,
      preparedTargetCount:
        0,
      blockedTargetCount:
        0,
    };
  }


  const connections =
    await getPortalConnectionsForUser(
      input.userId
    );

  const relevantConnections =
    connections.filter(
      (
        connection
      ): connection is typeof connection & {
        portal: SmgPortalId;
      } =>
        isSmgPortal(
          connection.portal
        )
    );


  const targets:
    AutopilotPublicationTarget[] =
      [];


  for (
    const connection
    of relevantConnections
  ) {

    const environment =
      connectionEnvironment(
        connection.environment
      );

    if (
      connection.status !==
      "verified"
    ) {
      targets.push({
        portal:
          connection.portal,

        status:
          connection.status,

        environment,

        connectionId:
          connection.connectionId,

        provider:
          connection.provider,

        state:
          "blocked",

        reason:
          "Portalverbindung ist noch nicht verifiziert.",
      });

      continue;
    }


    const plan =
      await buildSmgPublishPlanForUser({
        userId:
          input.userId,

        portal:
          connection.portal,

        connectionStatus:
          connection.status,

        environment,
      });


    if (
      plan.safety
        .canPublishProduction
    ) {
      targets.push({
        portal:
          connection.portal,

        status:
          connection.status,

        environment,

        connectionId:
          connection.connectionId,

        provider:
          connection.provider,

        state:
          "ready",

        reason:
          null,
      });

      continue;
    }


    if (
      plan.safety.canPrepare &&
      plan.payloadPrepared
    ) {
      targets.push({
        portal:
          connection.portal,

        status:
          connection.status,

        environment,

        connectionId:
          connection.connectionId,

        provider:
          connection.provider,

        state:
          "prepared",

        reason:
          plan.reasons.length > 0
            ? plan.reasons.join(" ")
            : "Portal-Payload vorbereitet; externer Transport noch nicht freigegeben.",
      });

      continue;
    }


    targets.push({
      portal:
        connection.portal,

      status:
        connection.status,

      environment,

      connectionId:
        connection.connectionId,

      provider:
        connection.provider,

      state:
        "blocked",

      reason:
        plan.reasons.length > 0
          ? plan.reasons.join(" ")
          : "Portal-Publishing ist noch nicht freigegeben.",
    });
  }


  return {
    market,

    targets,

    readyTargetCount:
      targets.filter(
        (target) =>
          target.state === "ready"
      ).length,

    preparedTargetCount:
      targets.filter(
        (target) =>
          target.state === "prepared"
      ).length,

    blockedTargetCount:
      targets.filter(
        (target) =>
          target.state === "blocked"
      ).length,
  };
}