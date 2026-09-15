import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "@/lib/portal-integrations/immoscout24-de-oauth.server";

import {
  getImmoScout24DeSandboxAccess,
} from "@/lib/portal-integrations/immoscout24-de-oauth-flow.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const SANDBOX_BASE_URL =
  "https://rest.sandbox-immobilienscout24.de";

const EXPECTED_EXTERNAL_ID =
  "sbx-cmtsovrsh0003w5mo4va9ca9a-mu2vqbkh";

const EXPECTED_REAL_ESTATE_ID =
  "325452819";

const PUBLISH_CHANNEL_ID =
  "10000";

const CONFIRMATION =
  "PUBLISH_IMMOSCOUT24_SANDBOX_OBJECT_325452819_TO_10000";


type OAuthResult = {
  ok:
    boolean;

  statusCode:
    number;

  raw:
    string;
};


function sameOrigin(
  request:
    NextRequest
):
  boolean {

  const origin =
    request.headers
      .get(
        "origin"
      )
      ?.trim();

  if (!origin) {
    return false;
  }

  try {

    return (
      new URL(origin).origin ===
      request.nextUrl.origin
    );
  }
  catch {

    return false;
  }
}


function extractTag(
  xml:
    string,
  tag:
    string
):
  string | null {

  const pattern =
    new RegExp(
      `<(?:[A-Za-z0-9_-]+:)?${tag}>` +
      `([\\s\\S]*?)` +
      `</(?:[A-Za-z0-9_-]+:)?${tag}>`,
      "i"
    );

  return (
    xml.match(pattern)?.[1]
      ?.trim() ??
    null
  );
}


function extractRealEstateId(
  xml:
    string
):
  string | null {

  const match =
    xml.match(
      /<realestates:[A-Za-z0-9_-]+\b[^>]*\bid="([^"]+)"/i
    );

  return (
    match?.[1]
      ?.trim() ??
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
):
  Promise<OAuthResult> {

  const client =
    createImmoScout24DeOAuthClient();

  return new Promise(
    (
      resolve
    ) => {

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

            resolve({
              ok:
                false,

              statusCode:
                typeof error.statusCode ===
                "number"
                  ? error.statusCode
                  : 502,

              raw:
                typeof error.data ===
                "string"
                  ? error.data
                  : raw,
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
):
  Promise<OAuthResult> {

  const client =
    createImmoScout24DeOAuthClient();

  return new Promise(
    (
      resolve
    ) => {

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

            resolve({
              ok:
                false,

              statusCode:
                typeof error.statusCode ===
                "number"
                  ? error.statusCode
                  : 502,

              raw:
                typeof error.data ===
                "string"
                  ? error.data
                  : raw,
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
          });
        }
      );
    }
  );
}


export async function POST(
  request:
    NextRequest
) {

  /*
   * Mutation:
   * Same-Origin zwingend.
   */
  if (
    !sameOrigin(
      request
    )
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "SAME_ORIGIN_REQUIRED",

        productionEnabled:
          false,

        publishEnabled:
          false,
      },
      {
        status:
          403,
      }
    );
  }


  const user =
    await getAuthenticatedUser(
      request
    );


  if (!user) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "UNAUTHORIZED",

        productionEnabled:
          false,

        publishEnabled:
          false,
      },
      {
        status:
          401,
      }
    );
  }


  try {

    const config =
      getImmoScout24DeOAuthConfig();


    /*
     * Hard sandbox gate.
     */
    if (
      config.environment !==
        "sandbox" ||
      config.baseUrl !==
        SANDBOX_BASE_URL
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_ONLY",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    let body:
      unknown;

    try {

      body =
        await request.json();
    }
    catch {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_JSON",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(body)
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_BODY",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    const candidate =
      body as
        Record<
          string,
          unknown
        >;


    if (
      candidate.confirmation !==
      CONFIRMATION
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "EXPLICIT_CONFIRMATION_REQUIRED",

          expectedConfirmation:
            CONFIRMATION,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    const access =
      await getImmoScout24DeSandboxAccess(
        user.id
      );


    if (!access) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "OAUTH_ACCESS_REQUIRED",

          environment:
            "sandbox",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    /*
     * Vor Publish:
     * das exakte Testobjekt nochmals lesen.
     */
    const realEstateUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/user/me/realestate/` +
      `ext-${encodeURIComponent(
        EXPECTED_EXTERNAL_ID
      )}`;


    const before =
      await oauthGet({
        url:
          realEstateUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    if (!before.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_OBJECT_READ_FAILED",

          upstreamStatus:
            before.statusCode,

          publishRequestSent:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            502,
        }
      );
    }


    const beforeExternalId =
      extractTag(
        before.raw,
        "externalId"
      );

    const beforeRealEstateId =
      extractRealEstateId(
        before.raw
      );

    const beforeState =
      extractTag(
        before.raw,
        "realEstateState"
      );


    /*
     * Exakt unser einziges Testobjekt.
     */
    if (
      beforeExternalId !==
        EXPECTED_EXTERNAL_ID ||
      beforeRealEstateId !==
        EXPECTED_REAL_ESTATE_ID
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_OBJECT_IDENTITY_MISMATCH",

          publishRequestSent:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    /*
     * Nur ein bislang inaktives
     * Sandbox-Objekt darf publiziert werden.
     */
    if (
      beforeState !==
      "INACTIVE"
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_OBJECT_NOT_INACTIVE",

          realEstateState:
            beforeState,

          publishRequestSent:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    /*
     * Berechtigten Channel nochmals live prüfen.
     */
    const channelUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/user/me/publishchannel`;


    const channels =
      await oauthGet({
        url:
          channelUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    if (!channels.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "PUBLISH_CHANNEL_READ_FAILED",

          upstreamStatus:
            channels.statusCode,

          publishRequestSent:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            502,
        }
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

      return NextResponse.json(
        {
          success:
            false,

          error:
            "IMMOSCOUT24_CHANNEL_10000_NOT_AVAILABLE",

          publishChannel:
            PUBLISH_CHANNEL_ID,

          publishRequestSent:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    /*
     * Offizielles Publish-Payload:
     * exakt ein Objekt,
     * exakt Channel 10000.
     */
    const publishXml =
      '<common:publishObject ' +
      'xmlns:common="http://rest.immobilienscout24.de/schema/common/1.0" ' +
      'xmlns:xlink="http://www.w3.org/1999/xlink">' +
      `<realEstate id="${EXPECTED_REAL_ESTATE_ID}"/>` +
      `<publishChannel id="${PUBLISH_CHANNEL_ID}"/>` +
      '</common:publishObject>';


    const publishUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/publish`;


    const publish =
      await oauthPost({
        url:
          publishUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,

        xml:
          publishXml,
      });


    if (!publish.ok) {

      /*
       * Nur strukturierte, nicht geheime
       * ImmoScout24-Fehlerdaten zurückgeben.
       *
       * Niemals Raw XML, OAuth Tokens
       * oder Secrets an den Browser senden.
       */
      const upstreamMessageCode =
        extractTag(
          publish.raw,
          "messageCode"
        );

      const upstreamMessage =
        extractTag(
          publish.raw,
          "message"
        );

      const sanitizedUpstreamMessage =
        upstreamMessage
          ?.replace(
            /\s+/g,
            " "
          )
          .trim()
          .slice(
            0,
            300
          ) ??
        null;


      return NextResponse.json(
        {
          success:
            false,

          error:
            "IMMOSCOUT24_SANDBOX_PUBLISH_FAILED",

          upstreamStatus:
            publish.statusCode,

          upstreamMessageCode,

          upstreamMessage:
            sanitizedUpstreamMessage,

          publishRequestSent:
            true,

          objectCreated:
            false,

          databaseModified:
            false,

          rawResponseReturned:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            502,
        }
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

      return NextResponse.json(
        {
          success:
            false,

          error:
            "UNEXPECTED_PUBLISH_RESPONSE",

          upstreamStatus:
            publish.statusCode,

          upstreamMessageCode:
            messageCode,

          publishRequestSent:
            true,

          databaseModified:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            502,
        }
      );
    }


    /*
     * Read-back der Publish-Zuordnung.
     */
    const verifyUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/publish` +
      `?realestate=${encodeURIComponent(
        EXPECTED_REAL_ESTATE_ID
      )}` +
      `&publishchannel=${encodeURIComponent(
        PUBLISH_CHANNEL_ID
      )}`;


    const verified =
      await oauthGet({
        url:
          verifyUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    if (!verified.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "PUBLISH_READBACK_FAILED",

          upstreamStatus:
            verified.statusCode,

          publishRequestSent:
            true,

          published:
            true,

          readBackVerified:
            false,

          databaseModified:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            502,
        }
      );
    }


    const expectedPublishId =
      `${EXPECTED_REAL_ESTATE_ID}_${PUBLISH_CHANNEL_ID}`;


    const publishMappingFound =
      verified.raw.includes(
        expectedPublishId
      ) &&
      new RegExp(
        `\\bid="${PUBLISH_CHANNEL_ID}"`,
        "i"
      ).test(
        verified.raw
      );


    return NextResponse.json({
      success:
        publishMappingFound,

      environment:
        "sandbox",

      realEstateId:
        EXPECTED_REAL_ESTATE_ID,

      externalId:
        EXPECTED_EXTERNAL_ID,

      publishChannel:
        PUBLISH_CHANNEL_ID,

      publishId:
        expectedPublishId,

      previousRealEstateState:
        beforeState,

      publishRequestSent:
        true,

      published:
        true,

      readBackVerified:
        publishMappingFound,

      upstreamStatus:
        publish.statusCode,

      upstreamMessageCode:
        messageCode,

      secondObjectCreated:
        false,

      databaseModified:
        false,

      responseBodyReturned:
        false,

      productionEnabled:
        false,

      publishEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "[immoscout24-de] sandbox publish test failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOSCOUT24_SANDBOX_PUBLISH_TEST_FAILED",

        publishRequestSent:
          false,

        databaseModified:
          false,

        productionEnabled:
          false,

        publishEnabled:
          false,
      },
      {
        status:
          500,
      }
    );
  }
}