import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  openPortalCredential,
  sealPortalCredential,
} from "@/lib/portal-integrations/portal-credential-crypto.server";


const CUSTOMER_CREDENTIAL_ENVIRONMENT =
  "customer";

const CUSTOMER_ACCESS_MARKER =
  "CUSTOMER_PORTAL_ACCESS_V1";


export type CustomerPortalAccessSummary = {
  portal:
    string;

  kind:
    | "smg_swissrets"
    | "openimmo_ftp";

  environment:
    "test" |
    "production";

  configured:
    true;

  credentialSource:
    "customer_vault";
};


type SmgSwissRetsAccess = {
  kind:
    "smg_swissrets";

  portal:
    | "immoscout24_ch"
    | "homegate_ch";

  environment:
    "test" |
    "production";

  credentials: {
    baseUrl:
      string;

    clientId:
      string;

    clientSecret:
      string;

    userName:
      string;

    password:
      string;

    ownerId:
      string;
  };
};


type OpenImmoFtpAccess = {
  kind:
    "openimmo_ftp";

  portal:
    "kleinanzeigen_de";

  environment:
    "test" |
    "production";

  credentials: {
    host:
      string;

    username:
      string;

    password:
      string;

    providerId:
      string;
  };
};


export type CustomerPortalAccess =
  | SmgSwissRetsAccess
  | OpenImmoFtpAccess;


function isRecord(
  value:
    unknown
): value is Record<string, unknown> {

  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


function requiredText(
  value:
    unknown,
  label:
    string
): string {

  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `${label} fehlt.`
    );
  }

  const clean =
    value.trim();

  if (!clean) {
    throw new Error(
      `${label} fehlt.`
    );
  }

  if (
    clean.length >
    2000
  ) {
    throw new Error(
      `${label} ist zu lang.`
    );
  }

  return clean;
}


function parseEnvironment(
  value:
    unknown
):
  | "test"
  | "production" {

  if (
    value ===
      "test" ||
    value ===
      "production"
  ) {
    return value;
  }

  throw new Error(
    "Ungültige Portal-Umgebung."
  );
}


function parseCustomerPortalAccess(
  value:
    unknown
): CustomerPortalAccess {

  if (!isRecord(value)) {
    throw new Error(
      "Ungültige Zugangsdaten."
    );
  }

  const portal =
    requiredText(
      value.portal,
      "Portal"
    );

  const kind =
    requiredText(
      value.kind,
      "Zugangsart"
    );

  const environment =
    parseEnvironment(
      value.environment
    );

  const credentials =
    value.credentials;

  if (!isRecord(credentials)) {
    throw new Error(
      "Portal-Zugangsdaten fehlen."
    );
  }


  if (
    (
      portal ===
        "immoscout24_ch" ||
      portal ===
        "homegate_ch"
    ) &&
    kind ===
      "smg_swissrets"
  ) {

    return {
      kind:
        "smg_swissrets",

      portal,

      environment,

      credentials: {
        baseUrl:
          requiredText(
            credentials.baseUrl,
            "SwissRETS API URL"
          ),

        clientId:
          requiredText(
            credentials.clientId,
            "Client ID"
          ),

        clientSecret:
          requiredText(
            credentials.clientSecret,
            "Client Secret"
          ),

        userName:
          requiredText(
            credentials.userName,
            "Benutzername"
          ),

        password:
          requiredText(
            credentials.password,
            "Passwort"
          ),

        ownerId:
          requiredText(
            credentials.ownerId,
            "Owner ID"
          ),
      },
    };
  }


  if (
    portal ===
      "kleinanzeigen_de" &&
    kind ===
      "openimmo_ftp"
  ) {

    return {
      kind:
        "openimmo_ftp",

      portal:
        "kleinanzeigen_de",

      environment,

      credentials: {
        host:
          requiredText(
            credentials.host,
            "FTP Host"
          ),

        username:
          requiredText(
            credentials.username,
            "FTP Benutzername"
          ),

        password:
          requiredText(
            credentials.password,
            "FTP Passwort"
          ),

        providerId:
          requiredText(
            credentials.providerId,
            "OpenImmo Anbieter-ID"
          ),
      },
    };
  }


  throw new Error(
    "Diese Portal-/Zugangsart wird noch nicht unterstützt."
  );
}


function providerForAccess(
  access:
    CustomerPortalAccess
): string {

  if (
    access.kind ===
      "smg_swissrets"
  ) {
    return "smg";
  }

  return "kleinanzeigen";
}


function externalOwnerIdForAccess(
  access:
    CustomerPortalAccess
): string {

  return access.kind ===
    "smg_swissrets"
      ? access.credentials
          .ownerId
      : access.credentials
          .providerId;
}


function encodeAccess(
  access:
    CustomerPortalAccess
): string {

  return sealPortalCredential({
    accessToken:
      CUSTOMER_ACCESS_MARKER,

    accessTokenSecret:
      JSON.stringify(
        access
      ),
  });
}


function decodeAccess(
  encryptedPayload:
    string
): CustomerPortalAccess | null {

  try {

    const opened =
      openPortalCredential(
        encryptedPayload
      );

    if (
      opened.accessToken !==
      CUSTOMER_ACCESS_MARKER
    ) {
      return null;
    }

    return parseCustomerPortalAccess(
      JSON.parse(
        opened.accessTokenSecret
      )
    );
  }
  catch {
    return null;
  }
}


export async function saveCustomerPortalAccessForUser(
  userId:
    string,
  raw:
    unknown
): Promise<CustomerPortalAccessSummary> {

  const cleanUserId =
    requiredText(
      userId,
      "User ID"
    );

  const access =
    parseCustomerPortalAccess(
      raw
    );

  const provider =
    providerForAccess(
      access
    );

  const externalOwnerId =
    externalOwnerIdForAccess(
      access
    );

  const encryptedPayload =
    encodeAccess(
      access
    );


  await prisma.$transaction([

    prisma.portalCredential.upsert({
      where: {
        userId_portal_environment: {
          userId:
            cleanUserId,

          portal:
            access.portal,

          environment:
            CUSTOMER_CREDENTIAL_ENVIRONMENT,
        },
      },

      create: {
        userId:
          cleanUserId,

        provider,

        portal:
          access.portal,

        environment:
          CUSTOMER_CREDENTIAL_ENVIRONMENT,

        encryptedPayload,
      },

      update: {
        provider,

        encryptedPayload,
      },
    }),


    prisma.portalConnection.upsert({
      where: {
        userId_portal: {
          userId:
            cleanUserId,

          portal:
            access.portal,
        },
      },

      create: {
        userId:
          cleanUserId,

        provider,

        portal:
          access.portal,

        environment:
          access.environment,

        externalOwnerId,

        status:
          "configured",

        credentialSource:
          "customer_vault",
      },

      update: {
        provider,

        environment:
          access.environment,

        externalOwnerId,

        status:
          "configured",

        credentialSource:
          "customer_vault",

        lastVerifiedAt:
          null,
      },
    }),
  ]);


  return {
    portal:
      access.portal,

    kind:
      access.kind,

    environment:
      access.environment,

    configured:
      true,

    credentialSource:
      "customer_vault",
  };
}


export async function getCustomerPortalAccessForUser(
  userId:
    string,
  portal:
    string
): Promise<CustomerPortalAccess | null> {

  const cleanUserId =
    requiredText(
      userId,
      "User ID"
    );

  const cleanPortal =
    requiredText(
      portal,
      "Portal"
    );


  const credential =
    await prisma
      .portalCredential
      .findUnique({
        where: {
          userId_portal_environment: {
            userId:
              cleanUserId,

            portal:
              cleanPortal,

            environment:
              CUSTOMER_CREDENTIAL_ENVIRONMENT,
          },
        },

        select: {
          encryptedPayload:
            true,
        },
      });


  if (!credential) {
    return null;
  }


  return decodeAccess(
    credential.encryptedPayload
  );
}


export async function getCustomerPortalAccessSummaries(
  userId:
    string
): Promise<CustomerPortalAccessSummary[]> {

  const cleanUserId =
    requiredText(
      userId,
      "User ID"
    );


  const credentials =
    await prisma
      .portalCredential
      .findMany({
        where: {
          userId:
            cleanUserId,

          environment:
            CUSTOMER_CREDENTIAL_ENVIRONMENT,
        },

        select: {
          encryptedPayload:
            true,
        },
      });


  const summaries:
    CustomerPortalAccessSummary[] =
    [];


  for (
    const credential of
    credentials
  ) {

    const access =
      decodeAccess(
        credential
          .encryptedPayload
      );

    if (!access) {
      continue;
    }

    summaries.push({
      portal:
        access.portal,

      kind:
        access.kind,

      environment:
        access.environment,

      configured:
        true,

      credentialSource:
        "customer_vault",
    });
  }


  return summaries;
}