import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  exchangeLinkedInAuthorizationCode,
  getLinkedInOAuthConfig,
  getLinkedInUserInfo,
  LINKEDIN_REQUIRED_SCOPES,
} from "@/lib/social-integrations/linkedin-oauth.server";

import {
  consumeLinkedInOAuthFlow,
} from "@/lib/social-integrations/linkedin-oauth-flow.server";

import {
  saveSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";

import {
  listSocialConnections,
  saveSocialConnection,
} from "@/lib/social-integrations/social-connection-store.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const FLOW_COOKIE =
  "inserat_ai_linkedin_oauth_flow";


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
        "/api/social-connections/linkedin/oauth",

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
        linkedin:
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
        linkedin:
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
        linkedin:
          "error",

        code:
          "invalid_callback",
      }
    );
  }


  const flow =
    consumeLinkedInOAuthFlow({
      cookieValue,

      userId:
        user.id,

      state,
    });


  if (!flow) {

    return redirectToSocial(
      request,
      {
        linkedin:
          "error",

        code:
          "invalid_flow",
      }
    );
  }


  try {

    const config =
      getLinkedInOAuthConfig({
        requestOrigin:
          request.nextUrl.origin,
      });


    const token =
      await exchangeLinkedInAuthorizationCode({
        config,

        code,

        redirectUri:
          flow.redirectUri,
      });


    const userInfo =
      await getLinkedInUserInfo({
        accessToken:
          token.accessToken,
      });


    const expiresAt =
      new Date(
        Date.now() +
        token.expiresIn *
          1000
      ).toISOString();


    const scopes =
      token.scopes?.length
        ? token.scopes
        : Array.from(
            LINKEDIN_REQUIRED_SCOPES
          );


    const displayName =
      userInfo.name ||
      [
        userInfo.givenName,
        userInfo.familyName,
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        ) ||
      "LinkedIn Mitglied";


    await saveSocialOAuthCredential({
      userId:
        user.id,

      provider:
        "linkedin",

      externalSubjectId:
        userInfo.sub,

      environment:
        config.environment,

      accessToken:
        token.accessToken,

      ...(token.refreshToken
        ? {
            refreshToken:
              token.refreshToken,
          }
        : {}),

      tokenType:
        token.tokenType ||
        "Bearer",

      expiresAt,

      scopes,
    });


    const savedConnection =
      await saveSocialConnection({
        userId:
          user.id,

        provider:
          "linkedin",

        channel:
          "linkedin",

        externalAccountId:
          userInfo.sub,

        environment:
          config.environment,

        displayName,

        status:
          "verified",

        credentialSource:
          "oauth",

        lastVerifiedAt:
          new Date(),
      });


    const verifiedConnections =
      await listSocialConnections({
        userId:
          user.id,

        environment:
          config.environment,
      });


    const verifiedConnection =
      verifiedConnections.find(
        connection =>
          connection.id ===
            savedConnection.id &&
          connection.provider ===
            "linkedin" &&
          connection.channel ===
            "linkedin" &&
          connection.environment ===
            config.environment &&
          connection.status ===
            "verified"
      );


    if (!verifiedConnection) {
      throw new Error(
        "LinkedIn connection was not readable after database write."
      );
    }


    console.info(
      "[linkedin-oauth] connection verified",
      {
        connectionId:
          verifiedConnection.id,

        environment:
          verifiedConnection.environment,

        status:
          verifiedConnection.status,
      }
    );


    return redirectToSocial(
      request,
      {
        linkedin:
          "connected",
      }
    );
  }
  catch (
    error
  ) {

    console.error(
      "[linkedin-oauth] callback failed",
      error instanceof Error
        ? error.message
        : "unknown error"
    );


    return redirectToSocial(
      request,
      {
        linkedin:
          "error",

        code:
          "callback_failed",
      }
    );
  }
}