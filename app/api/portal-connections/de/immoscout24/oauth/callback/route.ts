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
  consumeImmoScout24DeOAuthFlow,
  setImmoScout24DeSandboxAccess,
} from "@/lib/portal-integrations/immoscout24-de-oauth-flow.server";


import {
  savePortalOAuthCredential,
} from "@/lib/portal-integrations/portal-credential-store.server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const FLOW_COOKIE =
  "inserat_ai_is24_de_oauth_flow";


function exchangeAccessToken(
  input: {
    requestToken:
      string;

    requestTokenSecret:
      string;

    verifier:
      string;
  }
):
  Promise<{
    accessToken:
      string;

    accessTokenSecret:
      string;
  }> {

  const client =
    createImmoScout24DeOAuthClient();

  return new Promise(
    (
      resolve,
      reject
    ) => {

      client.getOAuthAccessToken(
        input.requestToken,
        input.requestTokenSecret,
        input.verifier,
        (
          error,
          accessToken,
          accessTokenSecret
        ) => {

          if (error) {
            reject(
              error
            );

            return;
          }

          if (
            !accessToken ||
            !accessTokenSecret
          ) {

            reject(
              new Error(
                "ImmoScout24 returned an incomplete access token."
              )
            );

            return;
          }

          resolve({
            accessToken,
            accessTokenSecret,
          });
        }
      );
    }
  );
}


function clearFlowCookie(
  response: NextResponse
):
  NextResponse {

  response.cookies.set(
    FLOW_COOKIE,
    "",
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
        0,
    }
  );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}


function failure(
  error:
    string,
  status:
    number
):
  NextResponse {

  return clearFlowCookie(
    NextResponse.json(
      {
        success:
          false,

        error,

        publishEnabled:
          false,
      },
      {
        status,
      }
    )
  );
}


export async function GET(
  request: NextRequest
) {

  /*
   * Callback kommt als Top-Level-Browser-
   * Navigation von ImmoScout24.
   *
   * Deshalb hier bewusst KEIN
   * Same-Origin-Check.
   */
  const user =
    await getAuthenticatedUser(
      request
    );

  if (!user) {
    return failure(
      "UNAUTHORIZED",
      401
    );
  }


  try {

    const config =
      getImmoScout24DeOAuthConfig();

    /*
     * Auch der Callback bleibt
     * strikt Sandbox-only.
     */
    if (
      config.environment !==
      "sandbox"
    ) {
      return failure(
        "SANDBOX_ONLY",
        409
      );
    }


    const oauthToken =
      request.nextUrl
        .searchParams
        .get(
          "oauth_token"
        )
        ?.trim() ??
      "";

    const verifier =
      request.nextUrl
        .searchParams
        .get(
          "oauth_verifier"
        )
        ?.trim() ??
      "";

    const flowId =
      request.cookies
        .get(
          FLOW_COOKIE
        )
        ?.value
        ?.trim() ??
      "";


    if (
      !oauthToken ||
      !verifier ||
      !flowId
    ) {
      return failure(
        "INVALID_OAUTH_CALLBACK",
        400
      );
    }


    const flow =
      consumeImmoScout24DeOAuthFlow({
        id:
          flowId,

        userId:
          user.id,

        requestToken:
          oauthToken,
      });


    if (!flow) {
      return failure(
        "INVALID_OR_EXPIRED_OAUTH_FLOW",
        400
      );
    }


    const access =
      await exchangeAccessToken({
        requestToken:
          flow.requestToken,

        requestTokenSecret:
          flow.requestTokenSecret,

        verifier,
      });


    /*
     * V2 Sandbox:
     *
     * OAuth Access wird AES-256-GCM
     * verschluesselt persistent gespeichert.
     *
     * RAM bleibt nur kurzfristiger Cache.
     * Kein Browser-Token.
     * Kein Publishing.
     */
    await savePortalOAuthCredential({
      userId:
        user.id,

      provider:
        "immoscout24",

      portal:
        "immoscout24_de",

      environment:
        "sandbox",

      accessToken:
        access.accessToken,

      accessTokenSecret:
        access.accessTokenSecret,
    });


    setImmoScout24DeSandboxAccess({
      userId:
        user.id,

      accessToken:
        access.accessToken,

      accessTokenSecret:
        access.accessTokenSecret,
    });


    return clearFlowCookie(
      NextResponse.json({
        success:
          true,

        environment:
          "sandbox",

        oauthHandshake:
          "completed",

        persistentAccessStored:
          true,

        credentialStorage:
          "encrypted_database",
        temporaryAccessStored:
          true,

        temporaryAccessTtlMinutes:
          30,

        productionEnabled:
          false,

        publishEnabled:
          false,
      })
    );
  }
  catch (error) {

    console.error(
      "[immoscout24-de-oauth] callback exchange failed",
      error
    );

    return failure(
      "IMMOSCOUT24_OAUTH_CALLBACK_FAILED",
      502
    );
  }
}