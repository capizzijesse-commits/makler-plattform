import "server-only";

import type {
  SocialPublishExecutionResult,
  SocialPublishWorkerJob,
} from "@/lib/social-integrations/social-publish-worker.server";

import {
  buildLinkedInTextShareDryRun,
} from "@/lib/social-integrations/linkedin-publish-dry-run.server";

import {
  getSocialConnectionById,
} from "@/lib/social-integrations/social-connection-store.server";

import {
  getSocialOAuthCredential,
} from "@/lib/social-integrations/social-credential-store.server";

import {
  setSocialPublishProviderOperation,
} from "@/lib/social-integrations/social-publish-job-store.server";


export function isLinkedInPublishingEnabled():
  boolean {

  return (
    process.env
      .LINKEDIN_PUBLISHING_ENABLED
      ?.trim() ===
    "1"
  );
}


function linkedInError(
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
    throw linkedInError(
      code,
      "Required LinkedIn value is missing."
    );
  }

  return value.trim();
}


async function providerMessage(
  response:
    Response
):
  Promise<string> {

  const text =
    await response.text();

  if (!text) {
    return "LinkedIn API request failed.";
  }

  try {
    const payload =
      JSON.parse(text) as
        Record<string, unknown>;

    if (
      typeof payload.message === "string" &&
      payload.message.trim()
    ) {
      return payload.message
        .trim()
        .slice(0, 1000);
    }
  }
  catch {
    // Provider-Antwort darf niemals ungefiltert gespeichert werden.
  }

  return "LinkedIn API request failed.";
}


async function createLinkedInTextShare(
  input: {
    accessToken:
      string;

    body:
      unknown;
  }
):
  Promise<string> {

  const response =
    await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method:
          "POST",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,

          "Content-Type":
            "application/json",

          "X-Restli-Protocol-Version":
            "2.0.0",
        },

        body:
          JSON.stringify(input.body),

        signal:
          AbortSignal.timeout(20_000),
      }
    );

  if (
    !response.ok ||
    response.status !== 201
  ) {
    throw linkedInError(
      `LINKEDIN_HTTP_${response.status}`,
      await providerMessage(response)
    );
  }

  return requiredText(
    response.headers.get("x-restli-id"),
    "LINKEDIN_POST_ID_MISSING"
  );
}


export async function executeLinkedInPublishJob(
  job:
    SocialPublishWorkerJob
):
  Promise<SocialPublishExecutionResult> {

  if (!isLinkedInPublishingEnabled()) {
    throw linkedInError(
      "LINKEDIN_PUBLISHING_DISABLED",
      "LinkedIn publishing is disabled."
    );
  }

  if (
    job.provider !== "linkedin" ||
    job.channel !== "linkedin"
  ) {
    throw linkedInError(
      "LINKEDIN_PROVIDER_MISMATCH",
      "Publish job is not a LinkedIn job."
    );
  }

  if (!job.connectionId) {
    throw linkedInError(
      "LINKEDIN_CONNECTION_MISSING",
      "LinkedIn connection is missing."
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
    throw linkedInError(
      "LINKEDIN_CONNECTION_NOT_FOUND",
      "LinkedIn connection was not found."
    );
  }

  if (
    connection.provider !== "linkedin" ||
    connection.channel !== "linkedin"
  ) {
    throw linkedInError(
      "LINKEDIN_CONNECTION_MISMATCH",
      "Connection is not a LinkedIn connection."
    );
  }

  if (connection.status !== "verified") {
    throw linkedInError(
      "LINKEDIN_CONNECTION_NOT_VERIFIED",
      "LinkedIn connection is not verified."
    );
  }

  if (connection.environment !== job.environment) {
    throw linkedInError(
      "LINKEDIN_ENVIRONMENT_MISMATCH",
      "LinkedIn connection environment does not match the job."
    );
  }

  if (
    connection.externalAccountId !==
    job.externalAccountId
  ) {
    throw linkedInError(
      "LINKEDIN_ACCOUNT_MISMATCH",
      "LinkedIn account does not match the publish job."
    );
  }

  if (
    job.mediaPayload !== null &&
    job.mediaPayload !== undefined
  ) {
    throw linkedInError(
      "LINKEDIN_MEDIA_NOT_IMPLEMENTED",
      "LinkedIn Executor V1 supports text posts only."
    );
  }

  const credential =
    await getSocialOAuthCredential({
      userId:
        job.userId,

      provider:
        "linkedin",

      externalSubjectId:
        connection.externalAccountId,

      environment:
        job.environment === "production"
          ? "production"
          : "test",
    });

  if (!credential) {
    throw linkedInError(
      "LINKEDIN_CREDENTIAL_MISSING",
      "LinkedIn credential was not found."
    );
  }

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
      throw linkedInError(
        "LINKEDIN_CREDENTIAL_EXPIRY_INVALID",
        "LinkedIn credential expiry is invalid."
      );
    }

    if (
      expiresAt.getTime() <=
        Date.now()
    ) {
      throw linkedInError(
        "LINKEDIN_CREDENTIAL_EXPIRED",
        "LinkedIn credential has expired."
      );
    }
  }

  if (
    credential.scopes &&
    !credential.scopes.includes("w_member_social")
  ) {
    throw linkedInError(
      "LINKEDIN_SCOPE_MISSING",
      "LinkedIn credential has no w_member_social scope."
    );
  }

  const dryRun =
    buildLinkedInTextShareDryRun({
      oidcSubject:
        connection.externalAccountId,

      caption:
        job.caption,
    });

  const workerId =
    requiredText(
      job.lockedBy,
      "LINKEDIN_WORKER_LOCK_MISSING"
    );

  const operationId =
    job.id;

  const operationType =
    "linkedin_text_share";

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
    throw linkedInError(
      "LINKEDIN_OPERATION_STATE_INCOMPLETE",
      "Stored LinkedIn operation state is incomplete."
    );
  }

  if (
    storedOperationId &&
    storedOperationId !== operationId
  ) {
    throw linkedInError(
      "LINKEDIN_OPERATION_ID_MISMATCH",
      "Stored LinkedIn operation does not belong to this job."
    );
  }

  if (
    storedOperationType &&
    storedOperationType !== operationType
  ) {
    throw linkedInError(
      "LINKEDIN_OPERATION_TYPE_MISMATCH",
      "Stored operation does not belong to LinkedIn text publishing."
    );
  }

  if (state === "post_published") {
    return {
      externalPostId:
        requiredText(
          job.externalPostId,
          "LINKEDIN_POST_ID_MISSING_AFTER_PUBLISH"
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
        throw linkedInError(
          "WORKER_LOCK_LOST",
          "Worker lost ownership while quarantining LinkedIn publishing."
        );
      }
    }

    throw linkedInError(
      "LINKEDIN_RECONCILIATION_REQUIRED",
      "LinkedIn publish result requires reconciliation."
    );
  }

  if (
    state &&
    state !== "request_rejected"
  ) {
    throw linkedInError(
      "LINKEDIN_OPERATION_STATE_UNKNOWN",
      "Stored LinkedIn operation state is unknown."
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
    throw linkedInError(
      "WORKER_LOCK_LOST",
      "Worker lost ownership before LinkedIn publishing."
    );
  }

  let postId:
    string;

  try {
    postId =
      await createLinkedInTextShare({
        accessToken:
          credential.accessToken,

        body:
          dryRun.body,
      });
  }
  catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    /*
     * Eine echte HTTP-Fehlerantwort bedeutet:
     * LinkedIn hat den Request sicher abgelehnt.
     * Ein späterer Retry darf deshalb erneut senden.
     *
     * Bei Timeout oder Netzwerkabbruch bleibt dagegen
     * publish_requested bestehen und der Job wird zur
     * manuellen Reconciliation quarantiniert.
     */
    if (code.startsWith("LINKEDIN_HTTP_")) {
      const rejectedState =
        await setSocialPublishProviderOperation({
          jobId:
            job.id,

          workerId,

          operationId,

          operationType,

          operationState:
            "request_rejected",
        });

      if (rejectedState.count !== 1) {
        throw linkedInError(
          "WORKER_LOCK_LOST",
          "Worker lost ownership while saving a rejected LinkedIn request."
        );
      }
    }

    throw error;
  }

  const publishedState =
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

  if (publishedState.count !== 1) {
    throw linkedInError(
      "WORKER_LOCK_LOST",
      "Worker lost ownership while saving the LinkedIn result."
    );
  }

  return {
    externalPostId:
      postId,

    externalPostUrl:
      null,
  };
}
