export type SwissPortalId =
  | "immoscout24_ch"
  | "homegate_ch"
  | "comparis_ch"
  | "flatfox_ch"
  | "newhome_ch";

export type GermanPortalId =
  | "immoscout24_de"
  | "immowelt_de"
  | "kleinanzeigen_de"
  | "wg_gesucht_de"
  | "immobilien_de";

export type PortalId =
  | SwissPortalId
  | GermanPortalId;

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
