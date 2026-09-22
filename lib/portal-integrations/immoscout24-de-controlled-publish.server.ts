import "server-only";

import type {
  PortalPublishExecutionResult,
  PortalPublishWorkerJob,
} from "@/lib/portal-integrations/portal-publish-worker.server";

import {
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "@/lib/portal-integrations/immoscout24-de-oauth.server";

import {
  getImmoScout24DeSandboxAccess,
} from "@/lib/portal-integrations/immoscout24-de-oauth-flow.server";


const PUBLISH_CHANNEL_ID =
  "10000";

const PROVIDER_APPROVAL_FLAG =
  "IMMOSCOUT24_DE_PROVIDER_PUBLISH_APPROVED";

const CONTROLLED_PUBLISH_FLAG =
  "IMMOSCOUT24_DE_CONTROLLED_PUBLISH_ENABLED";

const CONTROLLED_OBJECT_ID =
  "IMMOSCOUT24_DE_CONTROLLED_OBJECT_ID";


type OAuthResult = {
  ok:
    boolean;

  statusCode:
    number;

  raw:
    string;

  transportError:
    boolean;
};


function fail(
  code:
    string,
  message:
    string
): never {

  throw Object.assign(
    new Error(message),
    {
      code,
    }
  );
}


function enabled(
  name:
    string
): boolean {

  return (
    process.env[name]
      ?.trim() ===
    "1"
  );
}


function clean(
  value:
    string |
    null |
    undefined
): string {

  return value?.trim() ?? "";
}


function extractTag(
  input:
    string,
  tag:
    string
): string | null {

  const escaped =
    tag.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const match =
    input.match(
      new RegExp(
        `<(?:[A-Za-z0-9_-]+:)?${escaped}>` +
        `([^<]*)` +
        `</(?:[A-Za-z0-9_-]+:)?${escaped}>`,
        "i"
      )
    );

  return (
    match?.[1]?.trim() ??
    null
  );
}


function oauthGet(
  input: {
    url:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;
  }
): Promise<OAuthResult> {

  const client =
    createImmoScout24DeOAuthClient({
      accept:
        "application/xml",
    });


  return new Promise(
    (resolve) => {

      client.get(
        input.url,
        input.accessToken,
        input.accessTokenSecret,
        (
          error,
          data,
          response
        ) => {

          const raw =
            typeof data ===
            "string"
              ? data
              : "";


          if (error) {

            const hasHttpStatus =
              typeof error.statusCode ===
              "number";


            resolve({
              ok:
                false,

              statusCode:
                hasHttpStatus
                  ? error.statusCode
                  : 502,

              raw:
                typeof error.data ===
                "string"
                  ? error.data
                  : raw,

              transportError:
                !hasHttpStatus,
            });

            return;
          }


          resolve({
            ok:
              true,

            statusCode:
              response?.statusCode ??
              200,

            raw,

            transportError:
              false,
          });
        }
      );
    }
  );
}


function oauthPost(
  input: {
    url:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;

    xml:
      string;
  }
): Promise<OAuthResult> {

  const client =
    createImmoScout24DeOAuthClient({
      accept:
        "application/xml",
    });


  return new Promise(
    (resolve) => {

      client.post(
        input.url,
        input.accessToken,
        input.accessTokenSecret,
        input.xml,
        "application/xml",
        (
          error,
          data,
          response
        ) => {

          const raw =
            typeof data ===
            "string"
              ? data
              : "";


          if (error) {

            const hasHttpStatus =
              typeof error.statusCode ===
              "number";


            resolve({
              ok:
                false,

              statusCode:
                hasHttpStatus
                  ? error.statusCode
                  : 502,

              raw:
                typeof error.data ===
                "string"
                  ? error.data
                  : raw,

              transportError:
                !hasHttpStatus,
            });

            return;
          }


          resolve({
            ok:
              true,

            statusCode:
              response?.statusCode ??
              200,

            raw,

            transportError:
              false,
          });
        }
      );
    }
  );
}


/*
 * IMMOSCOUT24_DE_CONTROLLED_PUBLISH_V1
 *
 * Fail-closed:
 *
 * - nur immoscout24_de
 * - nur Test/Sandbox
 * - nur publish
 * - Provider-Freigabe erforderlich
 * - Controlled-Test explizit erforderlich
 * - exakt eine freigegebene Objekt-ID
 * - OAuth erforderlich
 * - Objekt muss INACTIVE sein
 * - Channel 10000 muss live existieren
 *
 * Production bleibt gesperrt.
 */
export async function executeImmoScout24DeControlledPublishV1(
  job:
    PortalPublishWorkerJob
): Promise<PortalPublishExecutionResult> {

  if (
    job.portal !==
    "immoscout24_de"
  ) {

    fail(
      "IMMOSCOUT24_DE_PORTAL_MISMATCH",
      "Controlled Publish wurde für das falsche Portal aufgerufen."
    );
  }


  if (
    job.environment !==
    "test"
  ) {

    fail(
      "PORTAL_PRODUCTION_NOT_ENABLED",
      "ImmoScout24 Controlled Publish ist nur im Testmodus erlaubt."
    );
  }


  if (
    job.action !==
    "publish"
  ) {

    fail(
      "IMMOSCOUT24_DE_ACTION_NOT_SUPPORTED",
      "Controlled Publish V1 unterstützt nur publish."
    );
  }


  /*
   * GATE 1:
   * Muss erst nach echter Freigabe
   * von ImmoScout24 auf 1 gesetzt werden.
   */
  if (
    !enabled(
      PROVIDER_APPROVAL_FLAG
    )
  ) {

    fail(
      "IMMOSCOUT24_DE_PROVIDER_APPROVAL_REQUIRED",
      "ImmoScout24 Import/Export/Publish-Freigabe fehlt."
    );
  }


  /*
   * GATE 2:
   * Separate manuelle Armierung.
   */
  if (
    !enabled(
      CONTROLLED_PUBLISH_FLAG
    )
  ) {

    fail(
      "IMMOSCOUT24_DE_CONTROLLED_PUBLISH_DISABLED",
      "ImmoScout24 Controlled Publish ist nicht aktiviert."
    );
  }


  const objectId =
    clean(
      job.externalObjectId
    );


  if (
    !/^\d+$/.test(
      objectId
    )
  ) {

    fail(
      "IMMOSCOUT24_DE_OBJECT_ID_REQUIRED",
      "Numerische ImmoScout24-Objekt-ID fehlt."
    );
  }


  /*
   * GATE 3:
   * Der erste E2E-Test darf ausschließlich
   * das ausdrücklich freigegebene Objekt
   * verwenden.
   */
  const armedObjectId =
    clean(
      process.env[
        CONTROLLED_OBJECT_ID
      ]
    );


  if (
    !armedObjectId ||
    armedObjectId !==
      objectId
  ) {

    fail(
      "IMMOSCOUT24_DE_CONTROLLED_OBJECT_MISMATCH",
      "Portaljob und freigegebene Controlled-Test-ID stimmen nicht überein."
    );
  }


  const config =
    getImmoScout24DeOAuthConfig();


  if (
    config.environment !==
    "sandbox"
  ) {

    fail(
      "PORTAL_PRODUCTION_NOT_ENABLED",
      "Controlled Publish V1 darf nur gegen die Sandbox laufen."
    );
  }


  const access =
    await getImmoScout24DeSandboxAccess(
      job.userId
    );


  if (!access) {

    fail(
      "IMMOSCOUT24_DE_OAUTH_ACCESS_REQUIRED",
      "ImmoScout24 Sandbox-OAuth fehlt."
    );
  }


  /*
   * READ-BEFORE-WRITE.
   */
  const objectUrl =
    `${config.baseUrl}` +
    `/restapi/api/offer/v1.0/user/me/realestate/` +
    encodeURIComponent(
      objectId
    );


  const before =
    await oauthGet({
      url:
        objectUrl,

      accessToken:
        access.accessToken,

      accessTokenSecret:
        access.accessTokenSecret,
    });


  if (!before.ok) {

    fail(
      "IMMOSCOUT24_DE_OBJECT_READ_FAILED",
      `ImmoScout24 Objektprüfung fehlgeschlagen (HTTP ${before.statusCode}).`
    );
  }


  const identityMatches =
    new RegExp(
      `\\bid="${objectId}"`,
      "i"
    ).test(
      before.raw
    );


  if (!identityMatches) {

    fail(
      "IMMOSCOUT24_DE_OBJECT_IDENTITY_MISMATCH",
      "ImmoScout24 Antwort gehört nicht zum erwarteten Objekt."
    );
  }


  const state =
    extractTag(
      before.raw,
      "realEstateState"
    );


  /*
   * Bereits ACTIVE / unbekannter Zustand:
   * niemals blind nochmals POST senden.
   */
  if (
    state !==
    "INACTIVE"
  ) {

    fail(
      "PORTAL_RECONCILIATION_REQUIRED",
      "ImmoScout24 Objekt ist nicht eindeutig INACTIVE."
    );
  }


  /*
   * Publish-Channel unmittelbar
   * vor dem Write erneut prüfen.
   */
  const channels =
    await oauthGet({
      url:
        `${config.baseUrl}` +
        `/restapi/api/offer/v1.0/user/me/publishchannel`,

      accessToken:
        access.accessToken,

      accessTokenSecret:
        access.accessTokenSecret,
    });


  if (!channels.ok) {

    fail(
      "IMMOSCOUT24_DE_CHANNEL_READ_FAILED",
      `Publish-Channel-Prüfung fehlgeschlagen (HTTP ${channels.statusCode}).`
    );
  }


  const channelAvailable =
    new RegExp(
      `\\bid="${PUBLISH_CHANNEL_ID}"`,
      "i"
    ).test(
      channels.raw
    );


  if (!channelAvailable) {

    fail(
      "IMMOSCOUT24_DE_CHANNEL_NOT_AVAILABLE",
      "ImmoScout24 Channel 10000 ist nicht verfügbar."
    );
  }


  /*
   * WRITE:
   * exakt ein Objekt,
   * exakt Channel 10000.
   */
  const publishXml =
    '<common:publishObject ' +
    'xmlns:common="http://rest.immobilienscout24.de/schema/common/1.0" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink">' +
    `<realEstate id="${objectId}"/>` +
    `<publishChannel id="${PUBLISH_CHANNEL_ID}"/>` +
    '</common:publishObject>';


  const publish =
    await oauthPost({
      url:
        `${config.baseUrl}` +
        `/restapi/api/offer/v1.0/publish`,

      accessToken:
        access.accessToken,

      accessTokenSecret:
        access.accessTokenSecret,

      xml:
        publishXml,
    });


  /*
   * POST wurde möglicherweise ausgeführt:
   * Timeout / 5xx / 408 / 429 darf
   * NICHT automatisch wiederholt werden.
   */
  if (!publish.ok) {

    if (
      publish.transportError ||
      publish.statusCode >= 500 ||
      publish.statusCode === 408 ||
      publish.statusCode === 429
    ) {

      fail(
        "PORTAL_RECONCILIATION_REQUIRED",
        "ImmoScout24 Publish-Ergebnis ist technisch nicht eindeutig."
      );
    }


    fail(
      "IMMOSCOUT24_DE_PUBLISH_REJECTED",
      `ImmoScout24 hat Publish mit HTTP ${publish.statusCode} abgelehnt.`
    );
  }


  const messageCode =
    extractTag(
      publish.raw,
      "messageCode"
    );


  if (
    messageCode !==
    "MESSAGE_RESOURCE_CREATED"
  ) {

    fail(
      "PORTAL_RECONCILIATION_REQUIRED",
      "ImmoScout24 hat den Publish nicht eindeutig bestätigt."
    );
  }


  return {
    externalObjectId:
      objectId,

    resultSnapshot: {
      portal:
        "immoscout24_de",

      environment:
        "test",

      mode:
        "controlled_sandbox_publish_v1",

      publishChannel:
        PUBLISH_CHANNEL_ID,

      upstreamStatus:
        publish.statusCode,

      upstreamMessageCode:
        messageCode,

      networkAttempted:
        true,

      productionEnabled:
        false,
    },
  };
}