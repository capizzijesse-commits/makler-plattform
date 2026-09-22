import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  exchangeMetaAuthorizationCode,
  exchangeMetaLongLivedUserAccessToken,
  getMetaGrantedScopes,
  getMetaManagedPages,
  getMetaOAuthConfig,
} from "@/lib/social-integrations/meta-oauth.server";

import {
  consumeMetaOAuthFlow,
} from "@/lib/social-integrations/meta-oauth-flow.server";

import {
  saveSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";

import {
  saveSocialConnection,
} from "@/lib/social-integrations/social-connection-store.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const FLOW_COOKIE =
  "inserat_ai_meta_oauth_flow";


function redirectToSocial(
  request:
    NextRequest,
  params:
    Record<
      string,
      string
    >
):
  NextResponse {

  const url =
    new URL(
      "/dashboard/social-media",
      request.nextUrl.origin
    );


  for (
    const [
      key,
      value,
    ] of
    Object.entries(
      params
    )
  ) {
    url.searchParams.set(
      key,
      value
    );
  }


  const response =
    NextResponse.redirect(
      url
    );


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
        "/api/social-connections/meta/oauth",

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


export async function GET(
  request:
    NextRequest
) {

  const user =
    await getAuthenticatedUser(
      request
    );


  if (!user) {

    return redirectToSocial(
      request,
      {
        meta:
          "error",

        code:
          "unauthorized",
      }
    );
  }


  const providerError =
    request.nextUrl
      .searchParams
      .get(
        "error"
      );


  if (providerError) {

    return redirectToSocial(
      request,
      {
        meta:
          "cancelled",
      }
    );
  }


  const code =
    request.nextUrl
      .searchParams
      .get(
        "code"
      )
      ?.trim() ??
    "";


  const state =
    request.nextUrl
      .searchParams
      .get(
        "state"
      )
      ?.trim() ??
    "";


  const cookieValue =
    request.cookies
      .get(
        FLOW_COOKIE
      )
      ?.value
      ?.trim() ??
    "";


  if (
    !code ||
    !state ||
    !cookieValue
  ) {

    return redirectToSocial(
      request,
      {
        meta:
          "error",

        code:
          "invalid_callback",
      }
    );
  }


  const flow =
    consumeMetaOAuthFlow({
      cookieValue,

      userId:
        user.id,

      state,
    });


  if (!flow) {

    return redirectToSocial(
      request,
      {
        meta:
          "error",

        code:
          "invalid_flow",
      }
    );
  }


  try {

    const config =
      getMetaOAuthConfig({
        requestOrigin:
          request.nextUrl.origin,
      });


    const shortLivedToken =
      await exchangeMetaAuthorizationCode({
        config,

        code,

        redirectUri:
          flow.redirectUri,
      });


    const token =
      await exchangeMetaLongLivedUserAccessToken({
        config,

        shortLivedAccessToken:
          shortLivedToken.accessToken,
      });


    const grantedScopes =
      await getMetaGrantedScopes({
        config,

        userAccessToken:
          token.accessToken,
      });


    const expiresAt =
      typeof token.expiresIn ===
        "number" &&
      Number.isFinite(
        token.expiresIn
      ) &&
      token.expiresIn >
        0
        ? new Date(
            Date.now() +
            token.expiresIn *
              1000
          ).toISOString()
        : undefined;


    const pages =
      await getMetaManagedPages({
        config,

        userAccessToken:
          token.accessToken,
      });


    let facebookCount =
      0;

    let instagramCount =
      0;


    for (
      const page of
      pages
    ) {

      await saveSocialOAuthCredential({
        userId:
          user.id,

        provider:
          "meta",

        externalSubjectId:
          page.id,

        environment:
          config.environment,

        accessToken:
          page.accessToken,

        tokenType:
          token.tokenType ||
          "Bearer",

        expiresAt,

        scopes:
          grantedScopes,
      });


      await saveSocialConnection({
        userId:
          user.id,

        provider:
          "meta",

        channel:
          "facebook_page",

        externalAccountId:
          page.id,

        environment:
          config.environment,

        displayName:
          page.name,

        status:
          "verified",

        credentialSource:
          "oauth",

        lastVerifiedAt:
          new Date(),
      });


      facebookCount +=
        1;


      if (
        page.instagramBusinessAccountId
      ) {

        await saveSocialConnection({
          userId:
            user.id,

          provider:
            "meta",

          channel:
            "instagram_business",

          externalAccountId:
            page.instagramBusinessAccountId,

          externalParentId:
            page.id,

          environment:
            config.environment,

          displayName:
            page.name,

          status:
            "verified",

          credentialSource:
            "oauth",

          lastVerifiedAt:
            new Date(),
        });


        instagramCount +=
          1;
      }
    }


    return redirectToSocial(
      request,
      {
        meta:
          "connected",

        facebook:
          String(
            facebookCount
          ),

        instagram:
          String(
            instagramCount
          ),
      }
    );
  }
  catch (
    error
  ) {

    console.error(
      "[meta-oauth] callback failed",
      error instanceof Error
        ? error.message
        : "unknown error"
    );


    return redirectToSocial(
      request,
      {
        meta:
          "error",

        code:
          "callback_failed",
      }
    );
  }
}