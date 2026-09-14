import "server-only";

import type {
  PortalConnectionState,
  SmgPortalId,
  SmgSwissRetsCredentials,
} from "./types";

const PREFIXES: Record<
  SmgPortalId,
  string
> = {
  immoscout24_ch:
    "IMMOSCOUT24_CH",

  homegate_ch:
    "HOMEGATE_CH",
};

function envValue(
  name: string
): string {
  return (
    process.env[name]?.trim() ??
    ""
  );
}

export function getSmgSwissRetsCredentials(
  portal: SmgPortalId
): SmgSwissRetsCredentials | null {
  const prefix =
    PREFIXES[portal];

  const credentials: SmgSwissRetsCredentials =
    {
      baseUrl:
        envValue(
          `${prefix}_API_BASE_URL`
        ),

      clientId:
        envValue(
          `${prefix}_CLIENT_ID`
        ),

      clientSecret:
        envValue(
          `${prefix}_CLIENT_SECRET`
        ),

      userName:
        envValue(
          `${prefix}_USERNAME`
        ),

      password:
        envValue(
          `${prefix}_PASSWORD`
        ),

      ownerId:
        envValue(
          `${prefix}_OWNER_ID`
        ),
    };

  const configured =
    Object.values(
      credentials
    ).every(Boolean);

  return configured
    ? credentials
    : null;
}

export function getSmgPortalConnectionState(
  portal: SmgPortalId
): PortalConnectionState {
  return getSmgSwissRetsCredentials(
    portal
  )
    ? "configured"
    : "not_configured";
}
