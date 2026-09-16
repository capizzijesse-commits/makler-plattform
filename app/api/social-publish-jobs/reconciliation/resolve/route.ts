import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  resolveSocialPublishReconciliation,
  type SocialPublishReconciliationResolution,
} from "@/lib/social-integrations/social-publish-job-store.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const VALID_RESOLUTIONS =
  new Set<
    SocialPublishReconciliationResolution
  >([
    "confirmed_published",
    "confirmed_not_published",
  ]);


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


function isRecord(
  value:
    unknown
):
  value is Record<
    string,
    unknown
  > {

  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


function textValue(
  value:
    unknown
):
  string {

  return typeof value ===
    "string"
      ? value.trim()
      : "";
}


export async function POST(
  request:
    NextRequest
) {

  /*
   * Mutierende Sicherheitsaktion:
   * ausschließlich same-origin.
   */
  if (
    !sameOrigin(
      request
    )
  ) {

    return noStore(
      NextResponse.json(
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
      )
    );
  }


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


  let body:
    unknown;


  try {

    body =
      await request.json();
  }
  catch {

    return noStore(
      NextResponse.json(
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
      )
    );
  }


  if (
    !isRecord(
      body
    )
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_BODY",
        },
        {
          status:
            400,
        }
      )
    );
  }


  const jobId =
    textValue(
      body.jobId
    );

  const resolution =
    textValue(
      body.resolution
    );

  const confirmed =
    body.confirmed ===
    true;


  if (!jobId) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "JOB_ID_REQUIRED",
        },
        {
          status:
            400,
        }
      )
    );
  }


  if (
    !VALID_RESOLUTIONS.has(
      resolution as
        SocialPublishReconciliationResolution
    )
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_RESOLUTION",
        },
        {
          status:
            400,
        }
      )
    );
  }


  /*
   * Ein Resolution-POST muss vom UI
   * ausdrücklich bestätigt werden.
   */
  if (!confirmed) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "EXPLICIT_CONFIRMATION_REQUIRED",
        },
        {
          status:
            400,
        }
      )
    );
  }


  const job =
    await resolveSocialPublishReconciliation({
      userId:
        user.id,

      jobId,

      resolution:
        resolution as
          SocialPublishReconciliationResolution,
    });


  if (!job) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "RECONCILIATION_NOT_AVAILABLE",
        },
        {
          status:
            409,
        }
      )
    );
  }


  return noStore(
    NextResponse.json({
      success:
        true,

      resolution,

      job,

      writesPerformed:
        true,

      externalNetworkCalls:
        false,

      automaticRetryScheduled:
        false,

      externalPublishingTriggered:
        false,
    })
  );
}