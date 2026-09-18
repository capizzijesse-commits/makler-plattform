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
  getSocialConnectionById,
} from "@/lib/social-integrations/social-connection-store.server";

import {
  hasSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";

import {
  isSocialPublishProviderImplemented,
} from "@/lib/social-integrations/social-publish-dispatcher.server";

import {
  isSocialPublishWorkerEnabled,
} from "@/lib/social-integrations/social-publish-worker.server";

import {
  isMetaPublishingEnabled,
} from "@/lib/social-integrations/meta-publish-executor.server";

import {
  isMetaOAuthConfigured,
} from "@/lib/social-integrations/meta-oauth.server";

import {
  buildLinkedInTextShareDryRun,
  type LinkedInTextShareDryRun,
} from "@/lib/social-integrations/linkedin-publish-dry-run.server";


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


function isQueueEnabled():
  boolean {

  return (
    process.env
      .SOCIAL_PUBLISH_QUEUE_ENABLED
      ?.trim() ===
    "1"
  );
}


function inspectInstagramReelMedia(
  value:
    unknown
):
  {
    valid:
      boolean;

    reason:
      string |
      null;

    url:
      string |
      null;
  } {

  if (
    !Array.isArray(
      value
    ) ||
    value.length !==
      1
  ) {

    return {
      valid:
        false,

      reason:
        "EXACTLY_ONE_VIDEO_REQUIRED",

      url:
        null,
    };
  }


  const item =
    value[0];


  if (
    !isRecord(
      item
    )
  ) {

    return {
      valid:
        false,

      reason:
        "MEDIA_ITEM_INVALID",

      url:
        null,
    };
  }


  if (
    item.type !==
      "video"
  ) {

    return {
      valid:
        false,

      reason:
        "VIDEO_REQUIRED",

      url:
        null,
    };
  }


  const rawUrl =
    textValue(
      item.url
    );


  if (!rawUrl) {

    return {
      valid:
        false,

      reason:
        "VIDEO_URL_REQUIRED",

      url:
        null,
    };
  }


  try {

    const url =
      new URL(
        rawUrl
      );


    if (
      url.protocol !==
      "https:"
    ) {

      return {
        valid:
          false,

        reason:
          "HTTPS_REQUIRED",

        url:
          null,
      };
    }


    return {
      valid:
        true,

      reason:
        null,

      url:
        url.toString(),
    };
  }
  catch {

    return {
      valid:
        false,

      reason:
        "VIDEO_URL_INVALID",

      url:
        null,
    };
  }
}


export async function POST(
  request:
    NextRequest
) {

  /*
   * Dry-run muss aus unserem eigenen
   * Frontend kommen.
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
    textValue(
      body.connectionId
    );

  const caption =
    textValue(
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


  const connection =
    await getSocialConnectionById({
      userId:
        user.id,

      id:
        connectionId,
    });


  if (!connection) {

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


  const providerImplemented =
    isSocialPublishProviderImplemented(
      connection.provider
    );


  const environment =
    connection.environment ===
      "test"
      ? "test"
      : connection.environment ===
          "production"
        ? "production"
        : null;


  if (!environment) {

    return noStore(
      NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_CONNECTION_ENVIRONMENT",
        },
        {
          status:
            409,
        }
      )
    );
  }


  const verified =
    connection.status ===
    "verified";


  let credentialPresent =
    false;

  let credentialSubjectId:
    string |
    null =
      null;

  let mediaValid =
    false;

  let mediaReason:
    string |
    null =
      null;

  let channelImplemented =
    false;

  let linkedInDryRun:
    LinkedInTextShareDryRun |
    null =
      null;


  if (
    connection.provider ===
      "meta" &&
    connection.channel ===
      "instagram_business"
  ) {

    channelImplemented =
      true;


    credentialSubjectId =
      connection.externalParentId;


    if (credentialSubjectId) {

      credentialPresent =
        await hasSocialOAuthCredential({
          userId:
            user.id,

          provider:
            "meta",

          externalSubjectId:
            credentialSubjectId,

          environment,
        });
    }


    const media =
      inspectInstagramReelMedia(
        body.mediaPayload
      );


    mediaValid =
      media.valid;

    mediaReason =
      media.reason;
  }
  else if (
    connection.provider ===
      "meta" &&
    connection.channel ===
      "facebook_page"
  ) {

    channelImplemented =
      true;

    credentialSubjectId =
      connection.externalAccountId;

    credentialPresent =
      await hasSocialOAuthCredential({
        userId:
          user.id,

        provider:
          "meta",

        externalSubjectId:
          connection.externalAccountId,

        environment,
      });


    const mediaPayloadPresent =
      body.mediaPayload !==
        undefined &&
      body.mediaPayload !==
        null &&
      (
        !Array.isArray(
          body.mediaPayload
        ) ||
        body.mediaPayload.length >
          0
      );


    if (
      mediaPayloadPresent
    ) {
      mediaValid =
        false;

      mediaReason =
        "FACEBOOK_TEXT_ONLY_V1";
    }
    else {
      mediaValid =
        true;

      mediaReason =
        null;
    }
  }
else if (
    connection.provider ===
      "linkedin" &&
    connection.channel ===
      "linkedin"
  ) {

    /*
     * LinkedIn Dry Run V1:
     * Nur Payload vorbereiten.
     *
     * KEIN fetch().
     * KEIN LinkedIn POST.
     * KEIN DB Write.
     */
    channelImplemented =
      true;


    credentialSubjectId =
      connection.externalAccountId;


    credentialPresent =
      await hasSocialOAuthCredential({
        userId:
          user.id,

        provider:
          "linkedin",

        externalSubjectId:
          connection.externalAccountId,

        environment,
      });


    const mediaPayloadPresent =
      body.mediaPayload !==
        undefined &&
      body.mediaPayload !==
        null &&
      (
        !Array.isArray(
          body.mediaPayload
        ) ||
        body.mediaPayload.length >
          0
      );


    if (
      mediaPayloadPresent
    ) {

      mediaValid =
        false;

      mediaReason =
        "LINKEDIN_TEXT_ONLY_V1";
    }
    else {

      try {

        linkedInDryRun =
          buildLinkedInTextShareDryRun({
            oidcSubject:
              connection.externalAccountId,

            caption,
          });


        mediaValid =
          true;

        mediaReason =
          null;
      }
      catch (
        error
      ) {

        mediaValid =
          false;

        mediaReason =
          error instanceof Error &&
          error.message ===
            "LINKEDIN_CAPTION_TOO_LONG"
            ? "LINKEDIN_CAPTION_TOO_LONG"
            : "LINKEDIN_DRY_RUN_INVALID";
      }
    }
  }
  else {

    channelImplemented =
      false;

    mediaValid =
      false;

    mediaReason =
      "CHANNEL_NOT_IMPLEMENTED";
  }


  const queueEnabled =
    isQueueEnabled();

  const workerEnabled =
    isSocialPublishWorkerEnabled();

  const metaPublishingEnabled =
    isMetaPublishingEnabled();


  /*
   * Dry-run ist nur dann wirklich sicher,
   * wenn alle produktiven Ausführungs-Gates
   * AUS bleiben.
   */
  const externalPublishingBlocked =
    !queueEnabled &&
    !workerEnabled &&
    !metaPublishingEnabled;


  const readyForFutureActivation =
    verified &&
    providerImplemented &&
    channelImplemented &&
    credentialPresent &&
    mediaValid;


  return noStore(
    NextResponse.json({
      success:
        true,

      dryRun:
        true,

      writesPerformed:
        false,

      externalNetworkCalls:
        false,

      connection: {
        id:
          connection.id,

        provider:
          connection.provider,

        channel:
          connection.channel,

        environment:
          connection.environment,

        verified,

        accountIdPresent:
          Boolean(
            connection.externalAccountId
          ),

        parentAccountIdPresent:
          Boolean(
            connection.externalParentId
          ),
      },

      dispatcher: {
        providerImplemented,

        channelImplemented,
      },

      credential: {
        present:
          credentialPresent,

        subjectIdPresent:
          Boolean(
            credentialSubjectId
          ),
      },

      media: {
        valid:
          mediaValid,

        reason:
          mediaReason,
      },

      linkedin:
        linkedInDryRun
          ? {
              endpoint:
                linkedInDryRun.endpoint,

              method:
                linkedInDryRun.method,

              textOnly:
                true,

              captionLength:
                linkedInDryRun.captionLength,

              authorUrnPresent:
                Boolean(
                  linkedInDryRun
                    .body
                    .author
                ),

              authorUrnFormatValid:
                linkedInDryRun
                  .body
                  .author
                  .startsWith(
                    "urn:li:person:"
                  ),

              authorIdentitySource:
                linkedInDryRun
                  .authorIdentitySource,

              payloadPrepared:
                true,

              livePostAttempted:
                false,
            }
          : null,

      meta: {
        oauthConfigured:
          isMetaOAuthConfigured(),
      },

      safety: {
        queueEnabled,

        workerEnabled,

        metaPublishingEnabled,

        externalPublishingBlocked,
      },

      readiness: {
        readyForFutureActivation,
      },
    })
  );
}