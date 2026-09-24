import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  recoverReadyPublicationRuns,
} from "@/lib/publication-orchestrator/publication-autopilot-recovery.server";


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
      left,
      "utf8"
    );

  const rightBuffer =
    Buffer.from(
      right,
      "utf8"
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


function authorize(
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


  const authorization =
    request.headers
      .get(
        "authorization"
      )
      ?.trim() ||
    "";


  return secureEquals(
    authorization,
    `Bearer ${secret}`
  )
    ? "ok"
    : "unauthorized";
}


export async function GET(
  request:
    NextRequest
) {

  const auth =
    authorize(
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


  try {

    const result =
      await recoverReadyPublicationRuns({
        limit:
          25,
      });


    return noStore(
      NextResponse.json({
        success:
          true,

        ...result,
      })
    );
  }
  catch (
    error
  ) {

    console.error(
      "[publication-autopilot-recovery]",
      error
    );


    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            error instanceof
              Error
              ? error.message
              : "PUBLICATION_AUTOPILOT_RECOVERY_FAILED",
        },
        {
          status:
            500,
        }
      )
    );
  }
}