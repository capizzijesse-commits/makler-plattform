import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  executePortalPublishJob,
} from "@/lib/portal-integrations/portal-publish-dispatcher.server";

import {
  runPortalPublishTrigger,
} from "@/lib/portal-integrations/portal-publish-trigger.server";


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


function secureEquals(
  left:
    string,
  right:
    string
):
  boolean {

  const leftBuffer =
    Buffer.from(
      left
    );

  const rightBuffer =
    Buffer.from(
      right
    );


  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }


  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}


function authorized(
  request:
    NextRequest
):
  "ok" |
  "secret_missing" |
  "unauthorized" {

  const secret =
    process.env
      .CRON_SECRET
      ?.trim() ||
    "";


  if (!secret) {
    return "secret_missing";
  }


  const expected =
    `Bearer ${secret}`;

  const received =
    request.headers
      .get(
        "authorization"
      )
      ?.trim() ||
    "";


  if (
    !secureEquals(
      received,
      expected
    )
  ) {
    return "unauthorized";
  }


  return "ok";
}


export async function GET(
  request:
    NextRequest
) {

  const auth =
    authorized(
      request
    );


  if (
    auth ===
    "secret_missing"
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "CRON_SECRET_NOT_CONFIGURED",
        },
        {
          status:
            503,
        }
      )
    );
  }


  if (
    auth ===
    "unauthorized"
  ) {

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


  const result =
    await runPortalPublishTrigger({
      execute:
        executePortalPublishJob,

      limit:
        10,
    });


  return noStore(
    NextResponse.json({
      success:
        true,

      ...result,

      externalPublishingTriggered:
        result.enabled &&
        result.claimed >
          0,
    })
  );
}