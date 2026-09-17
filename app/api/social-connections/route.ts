import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  listSocialConnections,
  type SocialEnvironment,
} from "@/lib/social-integrations/social-connection-store.server";

import {
  isMetaOAuthConfigured,
} from "@/lib/social-integrations/meta-oauth.server";

import {
  isLinkedInOAuthConfigured,
} from "@/lib/social-integrations/linkedin-oauth.server";
import {
  isXOAuthConfigured,
} from "@/lib/social-integrations/x-oauth.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


function noStore(
  response:
    NextResponse
):
  NextResponse {

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

    return noStore(
      NextResponse.json(
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
      )
    );
  }


  const requestedEnvironment =
    request.nextUrl.searchParams
      .get(
        "environment"
      )
      ?.trim();


  let environment:
    SocialEnvironment |
    undefined;


  if (requestedEnvironment) {

    if (
      requestedEnvironment !== "test" &&
      requestedEnvironment !== "production"
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_ENVIRONMENT",
          },
          {
            status:
              400,
          }
        )
      );
    }

    environment =
      requestedEnvironment;
  }


  const connections =
    await listSocialConnections({
      userId:
        user.id,

      environment,
    });


  return noStore(
    NextResponse.json({
      success:
        true,

      connections,

      capabilities: {
        oauth:
          isMetaOAuthConfigured(),

        scheduling:
          false,

        publishing:
          false,
      },

      integrations: {
        meta: {
          configured:
            isMetaOAuthConfigured(),
        },

        linkedin: {
          configured:
            isLinkedInOAuthConfigured(),
        },
        x: {
          configured:
            isXOAuthConfigured(),
        },
      },
    })
  );
}