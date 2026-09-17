import "server-only";

import type {
  SocialPublishExecutionResult,
  SocialPublishWorkerJob,
} from "@/lib/social-integrations/social-publish-worker.server";

import {
  buildXTextPostDryRun,
} from "@/lib/social-integrations/x-publish-dry-run.server";

import {
  getSocialConnectionById,
} from "@/lib/social-integrations/social-connection-store.server";

import {
  getSocialOAuthCredential,
  saveSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";

import {
  setSocialPublishProviderOperation,
} from "@/lib/social-integrations/social-publish-job-store.server";

import {
  createXPost,
  getXOAuthConfig,
  refreshXAccessToken,
  X_REQUIRED_SCOPES,
} from "@/lib/social-integrations/x-oauth.server";


const REFRESH_EARLY_MS =
  5 * 60 * 1000;


export function isXPublishingEnabled():
  boolean {

  return (
    process.env
      .X_PUBLISHING_ENABLED
      ?.trim() ===
    "1"
  );
}


function xError(
  code:
    string,
  message:
    string
):
  Error {

  return Object.assign(
    new Error(message),
    {
      code,
    }
  );
}


function requiredText(
  value:
    unknown,
  code:
    string
):
  string {

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw xError(
      code,
      "Required X value is missing."
    );
  }

  return value.trim();
}


function errorCode(
  error:
    unknown
):
  string {

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return "";
}


export async function executeXPublishJob(
  job:
    SocialPublishWorkerJob
):
  Promise<SocialPublishExecutionResult> {

  if (!isXPublishingEnabled()) {
    throw xError(
      "X_PUBLISHING_DISABLED",
      "X publishing is disabled."
    );
  }

  if (
    job.provider !== "x" ||
    job.channel !== "x"
  ) {
    throw xError(
      "X_PROVIDER_MISMATCH",
      "Publish job is not an X job."
    );
  }

  if (!job.connectionId) {
    throw xError(
      "X_CONNECTION_MISSING",
      "X connection is missing."
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
    throw xError(
      "X_CONNECTION_NOT_FOUND",
      "X connection was not found."
    );
  }

  if (
    connection.provider !== "x" ||
    connection.channel !== "x"
  ) {
    throw xError(
      "X_CONNECTION_MISMATCH",
      "Connection is not an X connection."
    );
  }

  if (connection.status !== "verified") {
    throw xError(
      "X_CONNECTION_NOT_VERIFIED",
      "X connection is not verified."
    );
  }

  if (
    connection.environment !==
    job.environment
  ) {
    throw xError(
      "X_ENVIRONMENT_MISMATCH",
      "X connection environment does not match the job."
    );
  }

  if (
    connection.externalAccountId !==
    job.externalAccountId
  ) {
    throw xError(
      "X_ACCOUNT_MISMATCH",
      "X account does not match the publish job."
    );
  }

  if (
    job.mediaPayload !== null &&
    job.mediaPayload !== undefined
  ) {
    throw xError(
      "X_MEDIA_NOT_IMPLEMENTED",
      "X Executor V1 supports text posts only."
    );
  }

  const environment =
    job.environment === "production"
      ? "production"
      : "test";

  let credential =
    await getSocialOAuthCredential({
      userId:
        job.userId,

      provider:
        "x",

      externalSubjectId:
        connection.externalAccountId,

      environment,
    });

  if (!credential) {
    throw xError(
      "X_CREDENTIAL_MISSING",
      "X credential was not found."
    );
  }

  if (
    credential.scopes &&
    !credential.scopes.includes(
      "tweet.write"
    )
  ) {
    throw xError(
      "X_SCOPE_MISSING",
      "X credential has no tweet.write scope."
    );
  }

  let needsRefresh =
    false;

  if (credential.expiresAt) {

    const expiresAt =
      new Date(
        credential.expiresAt
      );

    if (
      Number.isNaN(
        expiresAt.getTime()
      )
    ) {
      throw xError(
        "X_CREDENTIAL_EXPIRY_INVALID",
        "X credential expiry is invalid."
      );
    }

    needsRefresh =
      expiresAt.getTime() <=
      Date.now() +
        REFRESH_EARLY_MS;
  }

  if (needsRefresh) {

    if (!credential.refreshToken) {
      throw xError(
        "X_REFRESH_TOKEN_MISSING",
        "X credential requires refresh but no refresh token exists."
      );
    }

    const config =
      getXOAuthConfig({
        requestOrigin:
          "https://inserat-ai.invalid",
      });

    const refreshed =
      await refreshXAccessToken({
        config,

        refreshToken:
          credential.refreshToken,
      });

    const refreshedExpiresAt =
      new Date(
        Date.now() +
        refreshed.expiresIn *
          1000
      ).toISOString();

    const rotatedRefreshToken =
      refreshed.refreshToken ||
      credential.refreshToken;

    const refreshedScopes =
      refreshed.scopes?.length
        ? refreshed.scopes
        : credential.scopes?.length
          ? credential.scopes
          : Array.from(
              X_REQUIRED_SCOPES
            );

    await saveSocialOAuthCredential({
      userId:
        job.userId,

      provider:
        "x",

      externalSubjectId:
        connection.externalAccountId,

      environment,

      accessToken:
        refreshed.accessToken,

      refreshToken:
        rotatedRefreshToken,

      tokenType:
        refreshed.tokenType ||
        credential.tokenType ||
        "Bearer",

      expiresAt:
        refreshedExpiresAt,

      scopes:
        refreshedScopes,
    });

    credential =
      await getSocialOAuthCredential({
        userId:
          job.userId,

        provider:
          "x",

        externalSubjectId:
          connection.externalAccountId,

        environment,
      });

    if (!credential) {
      throw xError(
        "X_REFRESHED_CREDENTIAL_MISSING",
        "Refreshed X credential could not be loaded."
      );
    }
  }

  const dryRun =
    buildXTextPostDryRun({
      caption:
        job.caption,
    });

  const workerId =
    requiredText(
      job.lockedBy,
      "X_WORKER_LOCK_MISSING"
    );

  const operationId =
    job.id;

  const operationType =
    "x_text_post";

  const storedOperationId =
    typeof job.providerOperationId === "string"
      ? job.providerOperationId.trim()
      : "";

  const storedOperationType =
    typeof job.providerOperationType === "string"
      ? job.providerOperationType.trim()
      : "";

  const state =
    typeof job.providerOperationState === "string"
      ? job.providerOperationState.trim()
      : "";

  if (
    (
      storedOperationId ||
      storedOperationType ||
      state
    ) &&
    (
      !storedOperationId ||
      !storedOperationType ||
      !state
    )
  ) {
    throw xError(
      "X_OPERATION_STATE_INCOMPLETE",
      "Stored X operation state is incomplete."
    );
  }

  if (
    storedOperationId &&
    storedOperationId !== operationId
  ) {
    throw xError(
      "X_OPERATION_ID_MISMATCH",
      "Stored X operation does not belong to this job."
    );
  }

  if (
    storedOperationType &&
    storedOperationType !== operationType
  ) {
    throw xError(
      "X_OPERATION_TYPE_MISMATCH",
      "Stored operation does not belong to X text publishing."
    );
  }

  if (state === "post_published") {

    return {
      externalPostId:
        requiredText(
          job.externalPostId,
          "X_POST_ID_MISSING_AFTER_PUBLISH"
        ),

      externalPostUrl:
        job.externalPostUrl,
    };
  }

  if (
    state === "publish_requested" ||
    state === "reconciliation_required"
  ) {

    if (state === "publish_requested") {

      const quarantined =
        await setSocialPublishProviderOperation({
          jobId:
            job.id,

          workerId,

          operationId,

          operationType,

          operationState:
            "reconciliation_required",
        });

      if (quarantined.count !== 1) {
        throw xError(
          "WORKER_LOCK_LOST",
          "Worker lost ownership while quarantining X publishing."
        );
      }
    }

    throw xError(
      "X_RECONCILIATION_REQUIRED",
      "X publish result requires reconciliation."
    );
  }

  if (
    state &&
    state !== "request_rejected"
  ) {
    throw xError(
      "X_OPERATION_STATE_UNKNOWN",
      "Stored X operation state is unknown."
    );
  }

  const publishIntent =
    await setSocialPublishProviderOperation({
      jobId:
        job.id,

      workerId,

      operationId,

      operationType,

      operationState:
        "publish_requested",
    });

  if (publishIntent.count !== 1) {
    throw xError(
      "WORKER_LOCK_LOST",
      "Worker lost ownership before X publishing."
    );
  }

  let postId:
    string;

  try {

    const result =
      await createXPost({
        accessToken:
          credential.accessToken,

        text:
          dryRun.body.text,
      });

    postId =
      requiredText(
        result.id,
        "X_POST_ID_MISSING"
      );
  }
  catch (error) {

    const code =
      errorCode(error);

    /*
     * Eine echte X-HTTP-Antwort bedeutet:
     * der Provider hat den Request beantwortet.
     * Bei einem abgelehnten Request darf ein
     * späterer Retry erneut senden.
     *
     * Bei Netzwerkabbruch/Timeout bleibt
     * publish_requested bestehen. Dadurch
     * wird ein potentieller Doppelpost nicht
     * automatisch erneut ausgelöst.
     */
    if (
      code.startsWith(
        "X_HTTP_"
      )
    ) {

      const rejected =
        await setSocialPublishProviderOperation({
          jobId:
            job.id,

          workerId,

          operationId,

          operationType,

          operationState:
            "request_rejected",
        });

      if (rejected.count !== 1) {
        throw xError(
          "WORKER_LOCK_LOST",
          "Worker lost ownership while saving a rejected X request."
        );
      }
    }

    throw error;
  }

  const published =
    await setSocialPublishProviderOperation({
      jobId:
        job.id,

      workerId,

      operationId,

      operationType,

      operationState:
        "post_published",

      externalPostId:
        postId,
    });

  if (published.count !== 1) {
    throw xError(
      "WORKER_LOCK_LOST",
      "Worker lost ownership while saving the X result."
    );
  }

  return {
    externalPostId:
      postId,

    externalPostUrl:
      null,
  };
}
