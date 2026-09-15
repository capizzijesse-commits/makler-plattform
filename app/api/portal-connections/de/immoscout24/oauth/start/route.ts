import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  buildImmoScout24DeAuthorizeUrl,
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "@/lib/portal-integrations/immoscout24-de-oauth.server";

import {
  createImmoScout24DeOAuthFlow,
} from "@/lib/portal-integrations/immoscout24-de-oauth-flow.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const FLOW_COOKIE =
  "inserat_ai_is24_de_oauth_flow";


function isSameOrigin(
  request: NextRequest
): boolean {

  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return false;
  }

  try {

    return (
      new URL(
        origin
      ).origin ===
      request.nextUrl.origin
    );
  }
  catch {
    return false;
  }
}


function requestToken():
  Promise<{
    token:
      string;

    secret:
      string;
  }> {

  const client =
    createImmoScout24DeOAuthClient();

  return new Promise(
    (
      resolve,
      reject
    ) => {

      client.getOAuthRequestToken(
        (
          error,
          token,
          secret
        ) => {

          if (error) {
            reject(
              error
            );

            return;
          }

          if (
            !token ||
            !secret
          ) {
            reject(
              new Error(
                "ImmoScout24 returned an incomplete request token."
              )
            );

            return;
          }

          resolve({
            token,
            secret,
          });
        }
      );
    }
  );
}


export async function POST(
  request: NextRequest
) {

  /*
   * Dieser Endpoint initiiert einen
   * externen OAuth-Vorgang und wird
   * deshalb nur Same-Origin akzeptiert.
   */
  if (
    !isSameOrigin(
      request
    )
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INVALID_REQUEST_ORIGIN",
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
     * Diese Route darf aktuell niemals
     * gegen Produktion laufen.
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
        },
        {
          status:
            409,
        }
      );
    }


    const temporary =
      await requestToken();


    const flow =
      createImmoScout24DeOAuthFlow({
        userId:
          user.id,

        requestToken:
          temporary.token,

        requestTokenSecret:
          temporary.secret,
      });


    const authorizeUrl =
      buildImmoScout24DeAuthorizeUrl(
        temporary.token
      );


    const response =
      NextResponse.json(
        {
          success:
            true,

          authorizeUrl,

          environment:
            "sandbox",

          /*
           * OAuth-Handshake ist niemals
           * gleichbedeutend mit Publishing.
           */
          publishEnabled:
            false,
        }
      );


    response.cookies.set(
      FLOW_COOKIE,
      flow.id,
      {
        httpOnly:
          true,

        secure:
          process.env
            .NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/api/portal-connections/de/immoscout24/oauth",

        maxAge:
          10 * 60,
      }
    );


    response.headers.set(
      "Cache-Control",
      "no-store"
    );


    return response;
  }
  catch (error) {

    console.error(
      "[immoscout24-de-oauth] request token failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOSCOUT24_OAUTH_START_FAILED",

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