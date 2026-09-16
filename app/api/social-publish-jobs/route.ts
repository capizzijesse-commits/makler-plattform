import {
  createHash,
} from "node:crypto";

import {
  Prisma,
} from "@prisma/client";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  createSocialPublishJob,
  getSocialPublishJobByIdempotencyKey,
  listSocialPublishJobs,
  type SocialPublishJobStatus,
} from "@/lib/social-integrations/social-publish-job-store.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const VALID_STATUSES =
  new Set<SocialPublishJobStatus>([
    "draft",
    "scheduled",
    "queued",
    "processing",
    "published",
    "failed",
    "cancelled",
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


function isQueueEnabled():
  boolean {

  return (
    process.env
      .SOCIAL_PUBLISH_QUEUE_ENABLED
      ?.trim() ===
    "1"
  );
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


function stringValue(
  value:
    unknown
):
  string {

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}


function parseScheduledFor(
  value:
    unknown
):
  Date |
  null {

  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }


  if (
    typeof value !==
      "string"
  ) {
    throw new Error(
      "INVALID_SCHEDULED_FOR"
    );
  }


  const parsed =
    new Date(
      value
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "INVALID_SCHEDULED_FOR"
    );
  }


  return parsed;
}


function validateMediaPayload(
  value:
    unknown
):
  Prisma.InputJsonValue |
  null {

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }


  let serialized:
    string;


  try {

    serialized =
      JSON.stringify(
        value
      );
  }
  catch {

    throw new Error(
      "INVALID_MEDIA_PAYLOAD"
    );
  }


  if (
    serialized.length >
    1_000_000
  ) {
    throw new Error(
      "MEDIA_PAYLOAD_TOO_LARGE"
    );
  }


  return value as
    Prisma.InputJsonValue;
}


function scopedIdempotencyKey(
  request:
    NextRequest,
  userId:
    string
):
  string |
  undefined {

  const raw =
    request.headers
      .get(
        "idempotency-key"
      )
      ?.trim();


  if (!raw) {
    return undefined;
  }


  if (
    raw.length >
    200
  ) {
    throw new Error(
      "IDEMPOTENCY_KEY_TOO_LONG"
    );
  }


  return createHash(
    "sha256"
  )
    .update(
      `${userId}\0${raw}`
    )
    .digest(
      "hex"
    );
}


function storeErrorResponse(
  error:
    unknown
):
  NextResponse {

  const message =
    error instanceof Error
      ? error.message
      : "";


  if (
    message ===
    "Social connection was not found."
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "SOCIAL_CONNECTION_NOT_FOUND",
        },
        {
          status:
            404,
        }
      )
    );
  }


  if (
    message ===
    "Social connection is not verified."
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "SOCIAL_CONNECTION_NOT_VERIFIED",
        },
        {
          status:
            409,
        }
      )
    );
  }


  if (
    message ===
    "Listing was not found."
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "LISTING_NOT_FOUND",
        },
        {
          status:
            404,
        }
      )
    );
  }


  return noStore(
    NextResponse.json(
      {
        success:
          false,

        error:
          "SOCIAL_PUBLISH_JOB_FAILED",
      },
      {
        status:
          500,
      }
    )
  );
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


  const requestedStatus =
    request.nextUrl
      .searchParams
      .get(
        "status"
      )
      ?.trim();


  let status:
    SocialPublishJobStatus |
    undefined;


  if (requestedStatus) {

    if (
      !VALID_STATUSES.has(
        requestedStatus as
          SocialPublishJobStatus
      )
    ) {

      return noStore(
        NextResponse.json(
          {
            success:
              false,

            error:
              "INVALID_STATUS",
          },
          {
            status:
              400,
          }
        )
      );
    }


    status =
      requestedStatus as
        SocialPublishJobStatus;
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

    const parsed =
      Number.parseInt(
        rawLimit,
        10
      );


    if (
      !Number.isFinite(
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
    await listSocialPublishJobs({
      userId:
        user.id,

      status,

      limit,
    });


  const capabilities =
    getPlanCapabilities(
      user.plan
    );


  return noStore(
    NextResponse.json({
      success:
        true,

      jobs,

      capabilities: {
        planEligible:
          capabilities
            .canUsePublishingCenter,

        queueEnabled:
          isQueueEnabled(),

        canCreate:
          capabilities
            .canUsePublishingCenter &&
          isQueueEnabled(),

        externalPublishing:
          false,
      },
    })
  );
}


export async function POST(
  request:
    NextRequest
) {

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


  const capabilities =
    getPlanCapabilities(
      user.plan
    );


  if (
    !capabilities
      .canUsePublishingCenter
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "PRO_REQUIRED",
        },
        {
          status:
            403,
        }
      )
    );
  }


  /*
   * Solange noch kein Worker aktiv ist,
   * dürfen keine Jobs versehentlich
   * in einer dauerhaft wartenden Queue landen.
   */
  if (
    !isQueueEnabled()
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "SOCIAL_PUBLISH_QUEUE_DISABLED",
        },
        {
          status:
            503,
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


  const connectionId =
    stringValue(
      body.connectionId
    );

  const listingId =
    stringValue(
      body.listingId
    ) ||
    null;

  const caption =
    stringValue(
      body.caption
    );


  if (!connectionId) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "CONNECTION_ID_REQUIRED",
        },
        {
          status:
            400,
        }
      )
    );
  }


  if (!caption) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "CAPTION_REQUIRED",
        },
        {
          status:
            400,
        }
      )
    );
  }


  if (
    caption.length >
    10_000
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "CAPTION_TOO_LONG",
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
    null;

  let mediaPayload:
    Prisma.InputJsonValue |
    null;

  let idempotencyKey:
    string |
    undefined;


  try {

    scheduledFor =
      parseScheduledFor(
        body.scheduledFor
      );

    mediaPayload =
      validateMediaPayload(
        body.mediaPayload
      );

    idempotencyKey =
      scopedIdempotencyKey(
        request,
        user.id
      );
  }
  catch (
    error
  ) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            error instanceof Error
              ? error.message
              : "INVALID_REQUEST",
        },
        {
          status:
            400,
        }
      )
    );
  }


  /*
   * Wiederholte Browser-/Netzwerk-Anfragen mit
   * demselben Idempotency-Key dürfen keinen
   * zweiten Social-Post erzeugen.
   */
  if (idempotencyKey) {

    const existing =
      await getSocialPublishJobByIdempotencyKey({
        userId:
          user.id,

        idempotencyKey,
      });


    if (existing) {

      return noStore(
        NextResponse.json({
          success:
            true,

          replayed:
            true,

          job:
            existing,
        })
      );
    }
  }


  try {

    const job =
      await createSocialPublishJob({
        userId:
          user.id,

        listingId,

        connectionId,

        caption,

        mediaPayload,

        scheduledFor,

        idempotencyKey,
      });


    const {
      idempotencyKey:
        _internalIdempotencyKey,
      ...publicJob
    } =
      job;


    return noStore(
      NextResponse.json(
        {
          success:
            true,

          replayed:
            false,

          job:
            publicJob,
        },
        {
          status:
            202,
        }
      )
    );
  }
  catch (
    error
  ) {

    /*
     * Falls zwei identische Requests exakt
     * gleichzeitig eintreffen, schützt auch
     * der Unique Index in PostgreSQL.
     */
    if (
      idempotencyKey &&
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2002"
    ) {

      const existing =
        await getSocialPublishJobByIdempotencyKey({
          userId:
            user.id,

          idempotencyKey,
        });


      if (existing) {

        return noStore(
          NextResponse.json({
            success:
              true,

            replayed:
              true,

            job:
              existing,
          })
        );
      }
    }


    console.error(
      "[social-publish-jobs] create failed",
      error instanceof Error
        ? error.message
        : "unknown error"
    );


    return storeErrorResponse(
      error
    );
  }
}