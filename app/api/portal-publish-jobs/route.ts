import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  BROKER_MARKETING_APPROVAL_REQUIRED,
  isBrokerMarketingApproved,
} from "@/lib/broker-workflow/marketing-approval-guard.server";

import {
  createGermanPortalPublishJobFromListing,
  GermanPortalJobCreationError,
  isGermanPortalId,
  isPortalPublishQueueEnabled,
} from "@/lib/portal-integrations/portal-publish-job-factory.server";

import {
  listPortalPublishJobs,
} from "@/lib/portal-integrations/portal-publish-job-store.server";


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


function isSameOriginMutation(
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


export async function GET(
  request:
    NextRequest
) {

  try {

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


    const listingId =
      request.nextUrl.searchParams
        .get(
          "listingId"
        )
        ?.trim() ||
      undefined;

    const portal =
      request.nextUrl.searchParams
        .get(
          "portal"
        )
        ?.trim() ||
      undefined;


    if (
      portal &&
      !isGermanPortalId(
        portal
      )
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_PORTAL",
          },
          {
            status:
              400,
          }
        )
      );
    }


    const jobs =
      await listPortalPublishJobs({
        userId:
          user.id,

        listingId,

        portal,

        limit:
          50,
      });


    return noStore(
      NextResponse.json({
        success:
          true,

        queueEnabled:
          isPortalPublishQueueEnabled(),

        jobs,
      })
    );
  }
  catch (error) {

    console.error(
      "Portal publish jobs GET failed:",
      error instanceof Error
        ? error.message
        : "Unknown error."
    );

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "PORTAL_PUBLISH_JOBS_READ_FAILED",
        },
        {
          status:
            500,
        }
      )
    );
  }
}


export async function POST(
  request:
    NextRequest
) {

  /*
   * Browser-Mutation nur vom
   * gleichen Origin.
   */
  if (
    !isSameOriginMutation(
      request
    )
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "FORBIDDEN_ORIGIN",
        },
        {
          status:
            403,
        }
      )
    );
  }


  try {

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


    const rawBody:
      unknown =
      await request.json();


    if (
      !rawBody ||
      typeof rawBody !==
        "object" ||
      Array.isArray(
        rawBody
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


    const body =
      rawBody as
        Record<
          string,
          unknown
        >;


    const listingId =
      typeof body.listingId ===
        "string"
        ? body.listingId.trim()
        : "";


    const portal =
      typeof body.portal ===
        "string"
        ? body.portal.trim()
        : "";


    if (!listingId) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "LISTING_ID_REQUIRED",
          },
          {
            status:
              400,
          }
        )
      );
    }


    if (
      !portal ||
      !isGermanPortalId(
        portal
      )
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_PORTAL",
          },
          {
            status:
              400,
          }
        )
      );
    }


    let scheduledFor:
      Date |
      null =
      null;


    if (
      typeof body.scheduledFor ===
        "string" &&
      body.scheduledFor.trim()
    ) {

      scheduledFor =
        new Date(
          body.scheduledFor
        );

      if (
        Number.isNaN(
          scheduledFor.getTime()
        )
      ) {

        return noStore(
          NextResponse.json(
            {
              success:
                false,

              error:
                "INVALID_SCHEDULED_FOR",
            },
            {
              status:
                400,
            }
          )
        );
      }
    }


    /*
     * BROKER MARKETING APPROVAL GATE V1
     *
     * Ohne ausdrueckliche Freigabe darf
     * nicht einmal ein Portal-Publish-Job
     * erzeugt werden.
     */
    const marketingApproved =
      await isBrokerMarketingApproved({
        userId:
          user.id,

        listingId,
      });


    if (!marketingApproved) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              BROKER_MARKETING_APPROVAL_REQUIRED,

            message:
              "Die Vermarktung muss vor der Portalveroeffentlichung vom Makler freigegeben werden.",
          },
          {
            status:
              409,
          }
        )
      );
    }


    const job =
      await createGermanPortalPublishJobFromListing({
        userId:
          user.id,

        listingId,

        portal,

        scheduledFor,
      });


    return noStore(
      NextResponse.json(
        {
          success:
            true,

          job: {
            id:
              job.id,

            listingId:
              job.listingId,

            portal:
              job.portal,

            provider:
              job.provider,

            environment:
              job.environment,

            action:
              job.action,

            status:
              job.status,

            scheduledFor:
              job.scheduledFor,

            idempotencyKey:
              job.idempotencyKey,

            createdAt:
              job.createdAt,
          },
        },
        {
          status:
            201,
        }
      )
    );
  }
  catch (error) {

    if (
      error instanceof
      GermanPortalJobCreationError
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              error.code,

            message:
              error.message,
          },
          {
            status:
              error.httpStatus,
          }
        )
      );
    }


    console.error(
      "Portal publish jobs POST failed:",
      error instanceof Error
        ? error.message
        : "Unknown error."
    );


    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "PORTAL_PUBLISH_JOB_CREATE_FAILED",
        },
        {
          status:
            500,
        }
      )
    );
  }
}