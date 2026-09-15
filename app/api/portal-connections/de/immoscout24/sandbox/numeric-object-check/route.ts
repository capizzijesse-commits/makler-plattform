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

const EXPECTED_REAL_ESTATE_ID =
  "325452819";


type OAuthResult = {
  ok:
    boolean;

  statusCode:
    number;

  raw:
    string;
};


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
    createImmoScout24DeOAuthClient({
      accept:
        "application/xml",
    });

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
            typeof data === "string"
              ? data
              : "";

          if (error) {

            resolve({
              ok:
                false,

              statusCode:
                typeof error.statusCode === "number"
                  ? error.statusCode
                  : 502,

              raw:
                typeof error.data === "string"
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


export async function GET(
  request:
    NextRequest
) {

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


    if (
      config.environment !== "sandbox" ||
      config.baseUrl !== SANDBOX_BASE_URL
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


    const directUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/user/me/realestate/` +
      EXPECTED_REAL_ESTATE_ID;


    const direct =
      await oauthGet({
        url:
          directUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    const listUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/user/me/realestate` +
      `?pagesize=100&pagenumber=1`;


    const list =
      await oauthGet({
        url:
          listUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    const directId =
      direct.ok
        ? extractRealEstateId(
            direct.raw
          )
        : null;


    const directState =
      direct.ok
        ? extractTag(
            direct.raw,
            "realEstateState"
          )
        : null;


    const directTitle =
      direct.ok
        ? extractTag(
            direct.raw,
            "title"
          )
        : null;


    const listContainsNumericId =
      list.ok &&
      new RegExp(
        `\\bid="${EXPECTED_REAL_ESTATE_ID}"`,
        "i"
      ).test(
        list.raw
      );


    const directErrorCode =
      !direct.ok
        ? extractTag(
            direct.raw,
            "messageCode"
          )
        : null;


    const listErrorCode =
      !list.ok
        ? extractTag(
            list.raw,
            "messageCode"
          )
        : null;


    return NextResponse.json({
      success:
        direct.ok,

      environment:
        "sandbox",

      expectedRealEstateId:
        EXPECTED_REAL_ESTATE_ID,

      directNumericGet: {
        ok:
          direct.ok,

        upstreamStatus:
          direct.statusCode,

        realEstateId:
          directId,

        idMatches:
          directId ===
          EXPECTED_REAL_ESTATE_ID,

        realEstateState:
          directState,

        title:
          directTitle,

        errorCode:
          directErrorCode,
      },

      collectionGet: {
        ok:
          list.ok,

        upstreamStatus:
          list.statusCode,

        containsNumericId:
          listContainsNumericId,

        errorCode:
          listErrorCode,
      },

      requestMethods:
        [
          "GET",
          "GET",
        ],

      databaseModified:
        false,

      objectModified:
        false,

      publishRequestSent:
        false,

      rawResponseReturned:
        false,

      productionEnabled:
        false,

      publishEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "[immoscout24-de] numeric object check failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "NUMERIC_OBJECT_CHECK_FAILED",

        databaseModified:
          false,

        objectModified:
          false,

        publishRequestSent:
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