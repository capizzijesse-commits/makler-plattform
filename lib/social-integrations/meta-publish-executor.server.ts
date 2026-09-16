import "server-only";

import type {
  SocialPublishWorkerJob,
  SocialPublishExecutionResult,
} from "@/lib/social-integrations/social-publish-worker.server";

import {
  getSocialConnectionById,
} from "@/lib/social-integrations/social-connection-store.server";

import {
  getSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";

import {
  setSocialPublishProviderOperation,
} from "@/lib/social-integrations/social-publish-job-store.server";


type MetaMediaItem = {
  type:
    "video";

  url:
    string;

  shareToFeed:
    boolean;
};


type MetaGraphRecord =
  Record<
    string,
    unknown
  >;


export function isMetaPublishingEnabled():
  boolean {

  return (
    process.env
      .META_PUBLISHING_ENABLED
      ?.trim() ===
    "1"
  );
}


function metaError(
  code:
    string,
  message:
    string
):
  Error {

  return Object.assign(
    new Error(
      message
    ),
    {
      code,
    }
  );
}


function requiredGraphVersion():
  string {

  const version =
    process.env
      .META_GRAPH_API_VERSION
      ?.trim();


  if (!version) {

    throw metaError(
      "META_GRAPH_VERSION_MISSING",
      "META_GRAPH_API_VERSION is not configured."
    );
  }


  if (
    !/^v\d+\.\d+$/.test(
      version
    )
  ) {

    throw metaError(
      "META_GRAPH_VERSION_INVALID",
      "META_GRAPH_API_VERSION is invalid."
    );
  }


  return version;
}


function isRecord(
  value:
    unknown
):
  value is MetaGraphRecord {

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


function requiredString(
  value:
    unknown,
  code:
    string
):
  string {

  if (
    typeof value !==
      "string"
  ) {

    throw metaError(
      code,
      "Required string value is missing."
    );
  }


  const cleaned =
    value.trim();


  if (!cleaned) {

    throw metaError(
      code,
      "Required string value is empty."
    );
  }


  return cleaned;
}


function parseMediaPayload(
  value:
    unknown
):
  MetaMediaItem {

  if (
    !Array.isArray(
      value
    ) ||
    value.length !==
      1
  ) {

    throw metaError(
      "META_IG_REEL_MEDIA_REQUIRED",
      "Instagram Reel V1 requires exactly one video."
    );
  }


  const item =
    value[0];


  if (
    !isRecord(
      item
    )
  ) {

    throw metaError(
      "META_IG_REEL_MEDIA_INVALID",
      "Instagram Reel media payload is invalid."
    );
  }


  if (
    item.type !==
      "video"
  ) {

    throw metaError(
      "META_IG_REEL_VIDEO_REQUIRED",
      "Instagram Reel V1 requires a video."
    );
  }


  const url =
    requiredString(
      item.url,
      "META_IG_REEL_URL_REQUIRED"
    );


  let parsed:
    URL;


  try {

    parsed =
      new URL(
        url
      );
  }
  catch {

    throw metaError(
      "META_IG_REEL_URL_INVALID",
      "Instagram Reel video URL is invalid."
    );
  }


  /*
   * Meta muss die Datei selbst vom Server
   * herunterladen können.
   */
  if (
    parsed.protocol !==
    "https:"
  ) {

    throw metaError(
      "META_IG_REEL_URL_NOT_PUBLIC",
      "Instagram Reel video URL must use HTTPS."
    );
  }


  return {
    type:
      "video",

    url:
      parsed.toString(),

    shareToFeed:
      item.shareToFeed !==
      false,
  };
}


function providerMessage(
  payload:
    unknown
):
  string {

  if (
    isRecord(
      payload
    ) &&
    isRecord(
      payload.error
    )
  ) {

    const message =
      payload.error
        .message;


    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {

      return message
        .trim()
        .slice(
          0,
          1000
        );
    }
  }


  return "Meta API request failed.";
}


async function readJson(
  response:
    Response
):
  Promise<unknown> {

  const text =
    await response.text();


  if (!text) {
    return {};
  }


  try {

    return JSON.parse(
      text
    ) as unknown;
  }
  catch {

    throw metaError(
      "META_INVALID_RESPONSE",
      "Meta returned a non-JSON response."
    );
  }
}


async function metaRequest(
  input: {
    url:
      URL;

    accessToken:
      string;

    method:
      "GET" |
      "POST";
  }
):
  Promise<MetaGraphRecord> {

  const response =
    await fetch(
      input.url,
      {
        method:
          input.method,

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,
        },

        signal:
          AbortSignal.timeout(
            20_000
          ),
      }
    );


  const payload =
    await readJson(
      response
    );


  if (
    !response.ok
  ) {

    throw metaError(
      `META_HTTP_${response.status}`,
      providerMessage(
        payload
      )
    );
  }


  if (
    !isRecord(
      payload
    )
  ) {

    throw metaError(
      "META_INVALID_RESPONSE",
      "Meta returned an invalid response."
    );
  }


  return payload;
}


function wait(
  milliseconds:
    number
):
  Promise<void> {

  return new Promise(
    (
      resolve
    ) => {

      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


async function createInstagramReelContainer(
  input: {
    graphVersion:
      string;

    instagramAccountId:
      string;

    accessToken:
      string;

    videoUrl:
      string;

    caption:
      string;

    shareToFeed:
      boolean;
  }
):
  Promise<string> {

  const url =
    new URL(
      `https://graph.facebook.com/${input.graphVersion}/${input.instagramAccountId}/media`
    );


  url.searchParams.set(
    "media_type",
    "REELS"
  );

  url.searchParams.set(
    "video_url",
    input.videoUrl
  );

  url.searchParams.set(
    "caption",
    input.caption
  );

  url.searchParams.set(
    "share_to_feed",
    input.shareToFeed
      ? "true"
      : "false"
  );


  const payload =
    await metaRequest({
      url,

      accessToken:
        input.accessToken,

      method:
        "POST",
    });


  return requiredString(
    payload.id,
    "META_IG_CONTAINER_ID_MISSING"
  );
}


async function waitForInstagramContainer(
  input: {
    graphVersion:
      string;

    containerId:
      string;

    accessToken:
      string;
  }
):
  Promise<void> {

  /*
   * Kurze V1-Prüfung.
   *
   * Falls Meta länger braucht, übernimmt
   * später unser Queue-Retry den nächsten
   * Versuch. Worker/Publishing sind aktuell
   * ohnehin noch deaktiviert.
   */
  for (
    let attempt = 0;
    attempt < 12;
    attempt += 1
  ) {

    if (
      attempt >
      0
    ) {

      await wait(
        2_000
      );
    }


    const url =
      new URL(
        `https://graph.facebook.com/${input.graphVersion}/${input.containerId}`
      );


    url.searchParams.set(
      "fields",
      "status_code,status"
    );


    const payload =
      await metaRequest({
        url,

        accessToken:
          input.accessToken,

        method:
          "GET",
      });


    const statusCode =
      typeof payload
        .status_code ===
        "string"
        ? payload
            .status_code
            .trim()
            .toUpperCase()
        : "";


    if (
      statusCode ===
      "FINISHED"
    ) {
      return;
    }


    if (
      statusCode ===
        "ERROR" ||
      statusCode ===
        "EXPIRED"
    ) {

      throw metaError(
        "META_IG_CONTAINER_FAILED",
        "Instagram Reel container processing failed."
      );
    }
  }


  throw metaError(
    "META_IG_CONTAINER_NOT_READY",
    "Instagram Reel container is not ready yet."
  );
}


async function publishInstagramContainer(
  input: {
    graphVersion:
      string;

    instagramAccountId:
      string;

    containerId:
      string;

    accessToken:
      string;
  }
):
  Promise<string> {

  const url =
    new URL(
      `https://graph.facebook.com/${input.graphVersion}/${input.instagramAccountId}/media_publish`
    );


  url.searchParams.set(
    "creation_id",
    input.containerId
  );


  const payload =
    await metaRequest({
      url,

      accessToken:
        input.accessToken,

      method:
        "POST",
    });


  return requiredString(
    payload.id,
    "META_IG_MEDIA_ID_MISSING"
  );
}


export async function executeMetaPublishJob(
  job:
    SocialPublishWorkerJob
):
  Promise<
    SocialPublishExecutionResult
  > {

  /*
   * Drittes Safety Gate:
   *
   * Selbst wenn Queue + Worker irgendwann
   * versehentlich aktiviert würden, darf Meta
   * ohne dieses Flag NICHT angesprochen werden.
   */
  if (
    !isMetaPublishingEnabled()
  ) {

    throw metaError(
      "META_PUBLISHING_DISABLED",
      "Meta publishing is disabled."
    );
  }


  if (
    job.provider !==
    "meta"
  ) {

    throw metaError(
      "META_PROVIDER_MISMATCH",
      "Publish job is not a Meta job."
    );
  }


  if (
    !job.connectionId
  ) {

    throw metaError(
      "META_CONNECTION_MISSING",
      "Meta connection is missing."
    );
  }


  const connection =
    await getSocialConnectionById({
      userId:
        job.userId,

      id:
        job.connectionId,
    });


  if (!connection) {

    throw metaError(
      "META_CONNECTION_NOT_FOUND",
      "Meta connection was not found."
    );
  }


  if (
    connection.status !==
    "verified"
  ) {

    throw metaError(
      "META_CONNECTION_NOT_VERIFIED",
      "Meta connection is not verified."
    );
  }


  if (
    connection.environment !==
    job.environment
  ) {

    throw metaError(
      "META_ENVIRONMENT_MISMATCH",
      "Meta connection environment does not match the job."
    );
  }


  /*
   * Facebook Publishing bauen wir als
   * separaten Schritt.
   *
   * V1 aktiviert bewusst zuerst den von
   * Meta aktuell dokumentierten IG-Reel-Flow.
   */
  if (
    job.channel ===
    "facebook_page"
  ) {

    throw metaError(
      "META_FACEBOOK_PUBLISH_NOT_IMPLEMENTED",
      "Facebook Page publishing is not enabled in Meta Executor V1."
    );
  }


  if (
    job.channel !==
    "instagram_business"
  ) {

    throw metaError(
      "META_CHANNEL_UNSUPPORTED",
      "Unsupported Meta publishing channel."
    );
  }


  if (
    connection.externalAccountId !==
    job.externalAccountId
  ) {

    throw metaError(
      "META_ACCOUNT_MISMATCH",
      "Instagram account does not match the publish job."
    );
  }


  /*
   * Bei unserem Facebook-Login-Flow liegt
   * das Page Access Token unter der Page-ID.
   *
   * Instagram speichert diese Page-ID als
   * externalParentId.
   */
  const pageId =
    connection
      .externalParentId;


  if (!pageId) {

    throw metaError(
      "META_PARENT_PAGE_MISSING",
      "Instagram connection has no parent Facebook Page."
    );
  }


  const credential =
    await getSocialOAuthCredential({
      userId:
        job.userId,

      provider:
        "meta",

      externalSubjectId:
        pageId,

      environment:
        job.environment ===
        "production"
          ? "production"
          : "test",
    });


  if (!credential) {

    throw metaError(
      "META_CREDENTIAL_MISSING",
      "Meta Page credential was not found."
    );
  }


  if (
    credential.expiresAt
  ) {

    const expiresAt =
      new Date(
        credential.expiresAt
      );


    if (
      !Number.isNaN(
        expiresAt.getTime()
      ) &&
      expiresAt.getTime() <=
        Date.now()
    ) {

      throw metaError(
        "META_CREDENTIAL_EXPIRED",
        "Meta credential has expired."
      );
    }
  }


  const media =
    parseMediaPayload(
      job.mediaPayload
    );


  const graphVersion =
    requiredGraphVersion();


  /*
   * Der Executor läuft nur für einen
   * aktuell geclaimten processing-Job.
   * lockedBy ist damit unsere Ownership-ID
   * für alle dauerhaften Provider-Schritte.
   */
  const workerId =
    requiredString(
      job.lockedBy,
      "META_WORKER_LOCK_MISSING"
    );


  const operationType =
    "instagram_reel_container";


  const existingOperationId =
    typeof job.providerOperationId ===
      "string"
      ? job.providerOperationId.trim()
      : "";


  const existingOperationType =
    typeof job.providerOperationType ===
      "string"
      ? job.providerOperationType.trim()
      : "";


  const existingOperationState =
    typeof job.providerOperationState ===
      "string"
      ? job.providerOperationState.trim()
      : "";


  /*
   * Gespeicherten Provider-State zuerst
   * vollständig validieren.
   *
   * Erst danach dürfen Resume-Abkürzungen
   * ausgeführt werden.
   */
  if (
    !existingOperationId &&
    (
      existingOperationType ||
      existingOperationState
    )
  ) {

    throw metaError(
      "META_IG_OPERATION_STATE_INCOMPLETE",
      "Stored Instagram provider operation state is incomplete."
    );
  }


  if (
    existingOperationId &&
    existingOperationType !==
      operationType
  ) {

    throw metaError(
      "META_IG_OPERATION_TYPE_MISMATCH",
      "Stored provider operation does not belong to the Instagram Reel flow."
    );
  }


  if (
    existingOperationId &&
    !existingOperationState
  ) {

    throw metaError(
      "META_IG_OPERATION_STATE_INCOMPLETE",
      "Stored Instagram provider operation has no operation state."
    );
  }


  const knownOperationStates =
    new Set([
      "container_created",
      "container_ready",
      "publish_requested",
      "reconciliation_required",
      "media_published",
    ]);


  if (
    existingOperationId &&
    !knownOperationStates.has(
      existingOperationState
    )
  ) {

    throw metaError(
      "META_IG_OPERATION_STATE_UNKNOWN",
      "Stored Instagram provider operation state is unknown."
    );
  }


  /*
   * Provider-Publish wurde bereits sicher
   * gespeichert, aber der Worker ist vor
   * dem finalen Queue-Update abgestürzt.
   *
   * Kein zweiter Meta-Aufruf.
   */
  if (
    existingOperationState ===
    "media_published"
  ) {

    const existingMediaId =
      requiredString(
        job.externalPostId,
        "META_IG_MEDIA_ID_MISSING_AFTER_PUBLISH"
      );


    return {
      externalPostId:
        existingMediaId,

      externalPostUrl:
        job.externalPostUrl,
    };
  }


  /*
   * Dieser Job wurde bereits als
   * reconciliation_required quarantiniert.
   *
   * Niemals automatisch nochmals publishen.
   */
  if (
    existingOperationState ===
    "reconciliation_required"
  ) {

    throw metaError(
      "META_IG_RECONCILIATION_REQUIRED",
      "Instagram publish result requires reconciliation before another publish attempt."
    );
  }


  /*
   * publish_requested bedeutet:
   *
   * Wir wissen nicht sicher, ob Meta den
   * Publish bereits ausgeführt hat.
   *
   * Deshalb Zustand dauerhaft in
   * reconciliation_required überführen
   * und NICHT erneut media_publish aufrufen.
   */
  if (
    existingOperationState ===
    "publish_requested"
  ) {

    const reconciliationState =
      await setSocialPublishProviderOperation({
        jobId:
          job.id,

        workerId,

        operationId:
          existingOperationId,

        operationType,

        operationState:
          "reconciliation_required",
      });


    if (
      reconciliationState.count !==
      1
    ) {

      throw metaError(
        "WORKER_LOCK_LOST",
        "Worker lost ownership while quarantining an ambiguous Instagram publish."
      );
    }


    throw metaError(
      "META_IG_RECONCILIATION_REQUIRED",
      "Instagram publish result requires reconciliation before another publish attempt."
    );
  }


  let containerId =
    existingOperationId;


  /*
   * Nur wenn noch KEIN dauerhafter
   * Container existiert, erstellen wir
   * einen neuen.
   */
  if (!containerId) {

    containerId =
      await createInstagramReelContainer({
        graphVersion,

        instagramAccountId:
          connection
            .externalAccountId,

        accessToken:
          credential
            .accessToken,

        videoUrl:
          media.url,

        caption:
          job.caption,

        shareToFeed:
          media.shareToFeed,
      });


    const createdState =
      await setSocialPublishProviderOperation({
        jobId:
          job.id,

        workerId,

        operationId:
          containerId,

        operationType,

        operationState:
          "container_created",
      });


    if (
      createdState.count !==
      1
    ) {

      throw metaError(
        "WORKER_LOCK_LOST",
        "Worker lost ownership while saving the Instagram container."
      );
    }
  }


  /*
   * Bei einem Retry mit vorhandener
   * Container-ID landen wir direkt hier.
   */
  await waitForInstagramContainer({
    graphVersion,

    containerId,

    accessToken:
      credential
        .accessToken,
  });


  const readyState =
    await setSocialPublishProviderOperation({
      jobId:
        job.id,

      workerId,

      operationId:
        containerId,

      operationType,

      operationState:
        "container_ready",
    });


  if (
    readyState.count !==
    1
  ) {

    throw metaError(
      "WORKER_LOCK_LOST",
      "Worker lost ownership while saving the ready Instagram container."
    );
  }


  /*
   * Publish-Intent VOR dem externen
   * media_publish Call dauerhaft sichern.
   *
   * Wenn der Prozess danach an einer
   * ungünstigen Stelle stirbt, wird der
   * Retry nicht blind doppelt publizieren.
   */
  const publishIntent =
    await setSocialPublishProviderOperation({
      jobId:
        job.id,

      workerId,

      operationId:
        containerId,

      operationType,

      operationState:
        "publish_requested",
    });


  if (
    publishIntent.count !==
    1
  ) {

    throw metaError(
      "WORKER_LOCK_LOST",
      "Worker lost ownership before Instagram publishing."
    );
  }


  const mediaId =
    await publishInstagramContainer({
      graphVersion,

      instagramAccountId:
        connection
          .externalAccountId,

      containerId,

      accessToken:
        credential
          .accessToken,
    });


  /*
   * Provider-Ergebnis sofort persistieren,
   * bevor der Worker später den gesamten
   * Queue-Job auf published setzt.
   */
  const publishedState =
    await setSocialPublishProviderOperation({
      jobId:
        job.id,

      workerId,

      operationId:
        containerId,

      operationType,

      operationState:
        "media_published",

      externalPostId:
        mediaId,
    });


  if (
    publishedState.count !==
    1
  ) {

    throw metaError(
      "WORKER_LOCK_LOST",
      "Worker lost ownership while saving the Instagram publish result."
    );
  }


  return {
    externalPostId:
      mediaId,

    externalPostUrl:
      null,
  };
}