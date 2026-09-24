import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runPortalPublishSelftestV1,
} from "@/lib/portal-integrations/portal-publish-selftest.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const CONFIRMATION =
  "RUN_PORTAL_PUBLISH_SELFTEST_V1";


function isLocalHost(
  hostname:
    string
):
  boolean {

  return (
    hostname ===
      "localhost" ||
    hostname ===
      "127.0.0.1" ||
    hostname ===
      "::1"
  );
}


export async function POST(
  request:
    NextRequest
) {

  /*
   * Nie in Production ausführbar.
   */
  if (
    process.env.NODE_ENV ===
    "production"
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "SELFTEST_PRODUCTION_BLOCKED",
      },
      {
        status:
          404,
      }
    );
  }


  if (
    !isLocalHost(
      request.nextUrl.hostname
    )
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "SELFTEST_LOCALHOST_ONLY",
      },
      {
        status:
          403,
      }
    );
  }


  let body:
    unknown;


  try {

    body =
      await request.json();
  }
  catch {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INVALID_JSON",
      },
      {
        status:
          400,
      }
    );
  }


  const confirmation =
    body &&
    typeof body ===
      "object" &&
    "confirmation" in body &&
    typeof (
      body as {
        confirmation?:
          unknown;
      }
    ).confirmation ===
      "string"
      ? (
          body as {
            confirmation:
              string;
          }
        ).confirmation
      : "";


  if (
    confirmation !==
    CONFIRMATION
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "CONFIRMATION_REQUIRED",
      },
      {
        status:
          400,
      }
    );
  }


  try {

    const result =
      await runPortalPublishSelftestV1();


    return NextResponse.json({
      ...result,

      route:
        "localhost_only",

      databaseWrites:
        "temporary_selftest_rows_with_cleanup",
    });
  }
  catch (
    error
  ) {

    console.error(
      "[portal-publish-selftest] failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof
            Error
            ? error.message
            : "PORTAL_SELFTEST_FAILED",

        externalPortalCalled:
          false,

        productionTransportUsed:
          false,
      },
      {
        status:
          500,
      }
    );
  }
}