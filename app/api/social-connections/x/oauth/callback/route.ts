import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  exchangeXAuthorizationCode,
  getXOAuthConfig,
  getXUserInfo,
  X_REQUIRED_SCOPES,
} from "@/lib/social-integrations/x-oauth.server";

import {
  consumeXOAuthFlow,
} from "@/lib/social-integrations/x-oauth-flow.server";

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
  "inserat_ai_x_oauth_flow";

function redirectToSocial(
  request: NextRequest,
  params:
    Record<string, string>
): NextResponse {

  const url =
    new URL(
      "/dashboard/social-media",
      request.nextUrl.origin
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(params)
  ) {
    url.searchParams.set(
      key,
      value
    );
  }

  const response =
    NextResponse.redirect(url);

  response.cookies.set(
    FLOW_COOKIE,
    "",
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path:
        "/api/social-connections/x/oauth",

      maxAge: 0,
    }
  );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}

export async function GET(
  request: NextRequest
) {

  const user =
    await getAuthenticatedUser(
      request
    );

  if (!user) {
    return redirectToSocial(
      request,
      {
        x: "error",
        code: "unauthorized",
      }
    );
  }

  if (
    request.nextUrl.searchParams
      .get("error")
  ) {
    return redirectToSocial(
      request,
      {
        x: "cancelled",
      }
    );
  }

  const code =
    request.nextUrl.searchParams
      .get("code")
      ?.trim() || "";

  const state =
    request.nextUrl.searchParams
      .get("state")
      ?.trim() || "";

  const cookieValue =
    request.cookies
      .get(FLOW_COOKIE)
      ?.value
      ?.trim() || "";

  if (
    !code ||
    !state ||
    !cookieValue
  ) {
    return redirectToSocial(
      request,
      {
        x: "error",
        code:
          "invalid_callback",
      }
    );
  }

  const flow =
    consumeXOAuthFlow({
      cookieValue,

      userId:
        user.id,

      state,
    });

  if (!flow) {
    return redirectToSocial(
      request,
      {
        x: "error",
        code: "invalid_flow",
      }
    );
  }

  try {

    const config =
      getXOAuthConfig({
        requestOrigin:
          request.nextUrl.origin,
      });

    const token =
      await exchangeXAuthorizationCode({
        config,
        code,

        redirectUri:
          flow.redirectUri,

        codeVerifier:
          flow.codeVerifier,
      });

    const userInfo =
      await getXUserInfo({
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
            X_REQUIRED_SCOPES
          );

    await saveSocialOAuthCredential({
      userId:
        user.id,

      provider:
        "x",

      externalSubjectId:
        userInfo.id,

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

    await saveSocialConnection({
      userId:
        user.id,

      provider:
        "x",

      channel:
        "x",

      externalAccountId:
        userInfo.id,

      environment:
        config.environment,

      displayName:
        userInfo.name,

      username:
        userInfo.username,

      status:
        "verified",

      credentialSource:
        "oauth",

      lastVerifiedAt:
        new Date(),
    });

    return redirectToSocial(
      request,
      {
        x: "connected",
      }
    );
  }
  catch (error) {

    console.error(
      "[x-oauth] callback failed",
      error instanceof Error
        ? error.message
        : "unknown error"
    );

    return redirectToSocial(
      request,
      {
        x: "error",
        code:
          "callback_failed",
      }
    );
  }
}
