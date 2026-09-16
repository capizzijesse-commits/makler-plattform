import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  listSocialPublishJobsRequiringReconciliation,
} from "@/lib/social-integrations/social-publish-job-store.server";


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


  const rawLimit =
    request.nextUrl
      .searchParams
      .get(
        "limit"
      );

  let limit =
    50;


  if (rawLimit) {

    if (
      !/^\d+$/.test(
        rawLimit
      )
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_LIMIT",
          },
          {
            status:
              400,
          }
        )
      );
    }


    const parsed =
      Number(
        rawLimit
      );


    if (
      !Number.isSafeInteger(
        parsed
      ) ||
      parsed < 1
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_LIMIT",
          },
          {
            status:
              400,
          }
        )
      );
    }


    limit =
      Math.min(
        parsed,
        100
      );
  }


  const jobs =
    await listSocialPublishJobsRequiringReconciliation({
      userId:
        user.id,

      limit,
    });


  return noStore(
    NextResponse.json({
      success:
        true,

      count:
        jobs.length,

      jobs,

      readOnly:
        true,

      externalNetworkCalls:
        false,

      writesPerformed:
        false,
    })
  );
}