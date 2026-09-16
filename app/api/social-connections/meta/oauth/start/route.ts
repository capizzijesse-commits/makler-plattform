import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  buildMetaAuthorizeUrl,
  getMetaOAuthConfig,
  META_REQUIRED_SCOPES,
} from "@/lib/social-integrations/meta-oauth.server";

import {
  createMetaOAuthFlow,
} from "@/lib/social-integrations/meta-oauth-flow.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const FLOW_COOKIE =
  "inserat_ai_meta_oauth_flow";


function sameOrigin(
  request:
    NextRequest
):
  boolean {

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


export async function POST(
  request:
    NextRequest
) {

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
      getMetaOAuthConfig({
        requestOrigin:
          request.nextUrl.origin,
      });


    const flow =
      createMetaOAuthFlow({
        userId:
          user.id,

        redirectUri:
          config.redirectUri,
      });


    const authorizeUrl =
      buildMetaAuthorizeUrl({
        config,

        state:
          flow.state,
      });


    const response =
      NextResponse.json({
        success:
          true,

        authorizeUrl,

        scopes:
          META_REQUIRED_SCOPES,

        environment:
          config.environment,
      });


    response.cookies.set(
      FLOW_COOKIE,
      flow.cookieValue,
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
          "/api/social-connections/meta/oauth",

        maxAge:
          flow.maxAge,
      }
    );


    response.headers.set(
      "Cache-Control",
      "no-store"
    );


    return response;
  }
  catch (
    error
  ) {

    console.error(
      "[meta-oauth] start failed",
      error instanceof Error
        ? error.message
        : "unknown error"
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "META_OAUTH_NOT_CONFIGURED",
      },
      {
        status:
          503,
      }
    );
  }
}