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


type ProtectedResourceResult = {
  ok:
    boolean;

  statusCode:
    number;

  contentType:
    string | null;

  byteLength:
    number;
};


function getProtectedResource(
  input: {
    url:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;
  }
):
  Promise<ProtectedResourceResult> {

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

          if (error) {

            const statusCode =
              typeof error.statusCode ===
              "number"
                ? error.statusCode
                : 502;

            resolve({
              ok:
                false,

              statusCode,

              contentType:
                null,

              byteLength:
                typeof error.data ===
                "string"
                  ? Buffer.byteLength(
                      error.data,
                      "utf8"
                    )
                  : 0,
            });

            return;
          }


          const raw =
            typeof data ===
            "string"
              ? data
              : "";

          resolve({
            ok:
              true,

            statusCode:
              response?.statusCode ??
              200,

            contentType:
              typeof response?.headers[
                "content-type"
              ] ===
              "string"
                ? response.headers[
                    "content-type"
                  ]
                : null,

            byteLength:
              Buffer.byteLength(
                raw,
                "utf8"
              ),
          });
        }
      );
    }
  );
}


export async function GET(
  request: NextRequest
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
     * Harte Sandbox-Sperre.
     */
    if (
      config.environment !==
      "sandbox"
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_ONLY",

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
      getImmoScout24DeSandboxAccess(
        user.id
      );


    if (!access) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "TEMPORARY_OAUTH_ACCESS_REQUIRED",

          environment:
            "sandbox",

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    const resourceUrl =
      `${config.baseUrl}/restapi/api/offer/v1.0/user/me/realestate/`;


    const result =
      await getProtectedResource({
        url:
          resourceUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    /*
     * Keine Objektdaten werden an den
     * Browser zurückgegeben.
     *
     * Wir prüfen nur, ob OAuth +
     * API-Berechtigung funktionieren.
     */
    if (
      result.statusCode ===
      403
    ) {

      return NextResponse.json(
        {
          success:
            true,

          environment:
            "sandbox",

          oauthAccess:
            "valid_or_reached_resource",

          resourceAccess:
            "permission_required",

          upstreamStatus:
            403,

          productionEnabled:
            false,

          publishEnabled:
            false,
        }
      );
    }


    if (
      result.statusCode ===
      401
    ) {

      return NextResponse.json(
        {
          success:
            false,

          environment:
            "sandbox",

          oauthAccess:
            "rejected",

          resourceAccess:
            "unauthorized",

          upstreamStatus:
            401,

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


    if (!result.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "IMMOSCOUT24_RESOURCE_TEST_FAILED",

          upstreamStatus:
            result.statusCode,

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


    return NextResponse.json({
      success:
        true,

      environment:
        "sandbox",

      oauthAccess:
        "valid",

      resourceAccess:
        "granted",

      upstreamStatus:
        result.statusCode,

      contentType:
        result.contentType,

      responseBytes:
        result.byteLength,

      /*
       * Kein Listing-Inhalt wird
       * zurückgegeben.
       */
      listingDataReturned:
        false,

      productionEnabled:
        false,

      publishEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "[immoscout24-de] protected resource test failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOSCOUT24_RESOURCE_TEST_FAILED",

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
}