export type SwissPortalId =
  | "immoscout24_ch"
  | "homegate_ch"
  | "newhome_ch";

export type SmgPortalId =
  | "immoscout24_ch"
  | "homegate_ch";

export type SmgSwissRetsCredentials = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  userName: string;
  password: string;
  ownerId: string;
};

export type SmgMetaResponse = {
  acceptsSwissRetsMajorVersions?:
    | number[]
    | null;

  isInMaintenanceMode?: boolean;

  supportsLocalAssets?: boolean;

  uploadSupportedMimeTypes?:
    | string[]
    | null;
};

export type SmgAuthorizationResponse = {
  accessToken?: string | null;
  expiresInSecs?: number;
  isError?: boolean;
  errorDescription?: string | null;
};

export type SmgUserInfoResponse = {
  name?: string | null;
  id?: number | null;
};

export type PortalConnectionState =
  | "configured"
  | "not_configured";
