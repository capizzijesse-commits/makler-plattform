import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  BROKER_MARKETING_APPROVAL_REQUIRED,
  isBrokerMarketingApproved,
} from "@/lib/broker-workflow/marketing-approval-guard.server";

import {
  createGermanPortalPublishJobFromListing,
  isGermanPortalId,
} from "@/lib/portal-integrations/portal-publish-job-factory.server";

import type {
  GermanPortalId,
} from "@/lib/portal-integrations/types";


export const PUBLICATION_ORCHESTRATOR_DISPATCH_DISABLED =
  "PUBLICATION_ORCHESTRATOR_DISPATCH_DISABLED";


export const SOCIAL_ORCHESTRATOR_DISPATCH_NOT_READY =
  "SOCIAL_ORCHESTRATOR_DISPATCH_NOT_READY";


type PublicationTargetStatus =
  | "pending"
  | "publishing"
  | "published"
  | "failed"
  | "action_required"
  | "skipped";


type PublicationRunStatus =
  | "ready"
  | "publishing"
  | "partial"
  | "published"
  | "action_required";


type PortalJobSnapshot = {
  id:
    string;

  status:
    string;

  externalPublicationId?:
    string |
    null;

  externalPublicationUrl?:
    string |
    null;

  completedAt?:
    Date |
    null;

  errorCode?:
    string |
    null;

  errorMessage?:
    string |
    null;
};


type PortalJobCreator =
  (
    input: {
      userId:
        string;

      listingId:
        string;

      portal:
        GermanPortalId;

      scheduledFor?:
        Date |
        null;

      stageOnly?:
        boolean;
    }
  ) =>
    Promise<
      PortalJobSnapshot
    >;


export type PublicationDispatchDependencies = {
  createPortalJob?:
    PortalJobCreator;

  now?:
    () =>
      Date;

  dispatchEnabled?:
    () =>
      boolean;

  /**
   * SAFE_PORTAL_STAGING_V1
   *
   * true =
   * only create/link draft portal jobs.
   */
  stageOnly?:
    boolean;
};


export class PublicationDispatchError
  extends Error {

  readonly code:
    string;

  readonly httpStatus:
    number;


  constructor(
    code:
      string,

    httpStatus:
      number,

    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "PublicationDispatchError";

    this.code =
      code;

    this.httpStatus =
      httpStatus;
  }
}


function requiredText(
  value:
    string,
  label:
    string
) {

  const clean =
    value.trim();


  if (!clean) {

    throw new PublicationDispatchError(
      "PUBLICATION_DISPATCH_INPUT_INVALID",
      400,
      label +
      " fehlt."
    );
  }


  return clean;
}


export function isPublicationOrchestratorDispatchEnabled() {

  return (
    process.env
      .PUBLICATION_ORCHESTRATOR_DISPATCH_ENABLED
      ?.trim() ===
    "1"
  );
}


function readErrorCode(
  error:
    unknown
) {

  if (
    error &&
    typeof error ===
      "object" &&
    "code" in error &&
    typeof (
      error as {
        code?:
          unknown;
      }
    ).code ===
      "string"
  ) {

    return (
      error as {
        code:
          string;
      }
    ).code;
  }


  return null;
}


function errorMessage(
  error:
    unknown
) {

  if (
    error instanceof
      Error &&
    error.message.trim()
  ) {

    return error.message
      .trim()
      .slice(
        0,
        1000
      );
  }


  return "Veröffentlichungsziel konnte nicht vorbereitet werden.";
}


function mapPortalJobStatus(
  status:
    string
):
  PublicationTargetStatus {

  switch (
    status
  ) {

    case "draft":

      return "pending";


    case "queued":
    case "scheduled":
    case "processing":

      return "publishing";


    case "succeeded":

      return "published";


    case "failed":

      return "failed";


    case "cancelled":

      return "action_required";


    default:

      return "action_required";
  }
}


function mapSocialJobStatus(
  status:
    string
):
  PublicationTargetStatus {

  switch (
    status
  ) {

    case "draft":
    case "queued":
    case "scheduled":
    case "processing":

      return "publishing";


    case "published":

      return "published";


    case "failed":

      return "failed";


    case "cancelled":

      return "action_required";


    default:

      return "action_required";
  }
}


export function calculatePublicationRunStatus(
  targets:
    Array<{
      status:
        string;
    }>
):
  PublicationRunStatus {

  if (
    targets.length ===
    0
  ) {

    return "ready";
  }


  const statuses =
    targets.map(
      (target) =>
        target.status
    );


  const hasPublished =
    statuses.includes(
      "published"
    );


  const allCompleted =
    hasPublished &&
    statuses.every(
      (status) =>
        status ===
          "published" ||
        status ===
          "skipped"
    );


  if (
    allCompleted
  ) {

    return "published";
  }


  const hasActive =
    statuses.some(
      (status) =>
        status ===
          "pending" ||
        status ===
          "publishing"
    );


  const hasIssue =
    statuses.some(
      (status) =>
        status ===
          "failed" ||
        status ===
          "action_required"
    );


  if (
    hasIssue &&
    (
      hasActive ||
      hasPublished
    )
  ) {

    return "partial";
  }


  if (
    hasIssue
  ) {

    return "action_required";
  }


  if (
    hasActive
  ) {

    return "publishing";
  }


  return "ready";
}


function summarizeTargets(
  targets:
    Array<{
      status:
        string;
    }>
) {

  const count =
    (
      status:
        string
    ) =>
      targets.filter(
        (target) =>
          target.status ===
          status
      ).length;


  return {
    total:
      targets.length,

    pending:
      count(
        "pending"
      ),

    publishing:
      count(
        "publishing"
      ),

    published:
      count(
        "published"
      ),

    failed:
      count(
        "failed"
      ),

    actionRequired:
      count(
        "action_required"
      ),

    skipped:
      count(
        "skipped"
      ),
  };
}


/*
 * PUBLICATION DISPATCHER V1
 *
 * Aufgabe:
 * - vorbereiteten PublicationRun übernehmen
 * - Maklerfreigabe erneut prüfen
 * - Portaljobs idempotent verknüpfen
 * - bestehende Jobzustände spiegeln
 * - Social-Ziele bewusst auf action_required
 *   setzen, solange der Social-Orchestrator
 *   noch keinen sicheren Content-Snapshot
 *   erzeugt
 *
 * WICHTIG:
 * Diese Funktion startet KEINEN Worker.
 * Sie führt KEINEN Provider-Netzwerkaufruf aus.
 */
export async function dispatchPublicationRun(
  input: {
    userId:
      string;

    listingId:
      string;

    runId:
      string;
  },

  dependencies:
    PublicationDispatchDependencies =
      {}
) {

  const userId =
    requiredText(
      input.userId,
      "User ID"
    );

  const listingId =
    requiredText(
      input.listingId,
      "Listing ID"
    );

  const runId =
    requiredText(
      input.runId,
      "Publication Run ID"
    );


  const dispatchEnabled =
    dependencies
      .dispatchEnabled ??
    isPublicationOrchestratorDispatchEnabled;


  const stageOnly =
    dependencies
      .stageOnly ===
    true;


  if (
    !stageOnly &&
    !dispatchEnabled()
  ) {

    throw new PublicationDispatchError(
      PUBLICATION_ORCHESTRATOR_DISPATCH_DISABLED,
      409,
      "Der Publication-Orchestrator-Dispatcher ist noch nicht freigegeben."
    );
  }


  const marketingApproved =
    await isBrokerMarketingApproved({
      userId,
      listingId,
    });


  if (
    !marketingApproved
  ) {

    throw new PublicationDispatchError(
      BROKER_MARKETING_APPROVAL_REQUIRED,
      409,
      "Die Vermarktung muss vor dem Dispatcher-Lauf freigegeben sein."
    );
  }


  const run =
    await prisma.publicationRun.findFirst({
      where: {
        id:
          runId,

        userId,

        listingId,
      },

      include: {
        targets: {
          orderBy: {
            createdAt:
              "asc",
          },
        },
      },
    });


  if (!run) {

    throw new PublicationDispatchError(
      "PUBLICATION_RUN_NOT_FOUND",
      404,
      "Der Veröffentlichungslauf wurde nicht gefunden."
    );
  }


  if (
    run.status ===
    "cancelled"
  ) {

    throw new PublicationDispatchError(
      "PUBLICATION_RUN_NOT_DISPATCHABLE",
      409,
      "Ein abgebrochener Veröffentlichungslauf kann nicht gestartet werden."
    );
  }


  if (
    run.targets.length ===
    0
  ) {

    throw new PublicationDispatchError(
      "PUBLICATION_TARGETS_REQUIRED",
      409,
      "Der Veröffentlichungslauf enthält keine Ziele."
    );
  }


  /*
   * Bereits vollständig abgeschlossene Runs
   * sind idempotent.
   */
  if (
    run.status ===
    "published"
  ) {

    return {
      run,

      summary:
        summarizeTargets(
          run.targets
        ),

      portalJobsLinked:
        run.targets.filter(
          (target) =>
            Boolean(
              target.portalJobId
            )
        ).length,

      socialJobsLinked:
        run.targets.filter(
          (target) =>
            Boolean(
              target.socialJobId
            )
        ).length,

      externalCalls:
        0,

      workerTriggered:
        false,
    };
  }


  const createPortalJob =
    dependencies
      .createPortalJob ??
    createGermanPortalPublishJobFromListing;


  const now =
    dependencies
      .now ??
    (() =>
      new Date()
    );


  let portalJobsLinked =
    0;

  let socialJobsLinked =
    0;


  for (
    const target of
    run.targets
  ) {

    if (
      target.status ===
        "published" ||
      target.status ===
        "skipped"
    ) {

      continue;
    }


    if (
      target.kind ===
      "social"
    ) {

      /*
       * SAFE staging betrifft V1
       * ausschließlich Immobilienportale.
       *
       * Social bleibt unverändert pending.
       */
      if (
        stageOnly
      ) {

        continue;
      }


      /*
       * Falls später bereits ein Socialjob
       * verknüpft ist, spiegeln wir dessen
       * Zustand schon heute korrekt.
       */
      if (
        target.socialJobId
      ) {

        const job =
          await prisma
            .socialPublishJob
            .findFirst({
              where: {
                id:
                  target.socialJobId,

                userId,

                listingId,
              },

              select: {
                id:
                  true,

                status:
                  true,

                externalPostId:
                  true,

                externalPostUrl:
                  true,

                publishedAt:
                  true,

                errorCode:
                  true,

                errorMessage:
                  true,
              },
            });


        if (job) {

          const status =
            mapSocialJobStatus(
              job.status
            );


          await prisma
            .publicationTarget
            .update({
              where: {
                id:
                  target.id,
              },

              data: {
                status,

                externalId:
                  job.externalPostId,

                externalUrl:
                  job.externalPostUrl,

                publishedAt:
                  status ===
                    "published"
                    ? job.publishedAt ??
                      now()
                    : null,

                errorCode:
                  job.errorCode,

                errorMessage:
                  job.errorMessage,
              },
            });


          socialJobsLinked +=
            1;

          continue;
        }


        await prisma
          .publicationTarget
          .update({
            where: {
              id:
                target.id,
            },

            data: {
              status:
                "action_required",

              errorCode:
                "SOCIAL_JOB_LINK_MISSING",

              errorMessage:
                "Der gespeicherte Social-Publish-Job wurde nicht gefunden.",
            },
          });


        continue;
      }


      /*
       * Kein blindes Erzeugen eines
       * Socialjobs:
       *
       * Meta V1 erwartet derzeit einen
       * vorbereiteten Reel-Video-Payload.
       * Dieser Content-Snapshot folgt
       * separat.
       */
      await prisma
        .publicationTarget
        .update({
          where: {
            id:
              target.id,
          },

          data: {
            status:
              "action_required",

            errorCode:
              SOCIAL_ORCHESTRATOR_DISPATCH_NOT_READY,

            errorMessage:
              "Social-Ziel ist vorbereitet. Der automatische Social-Content-Dispatcher ist noch nicht freigegeben.",
          },
        });


      continue;
    }


    if (
      target.kind !==
      "portal"
    ) {

      await prisma
        .publicationTarget
        .update({
          where: {
            id:
              target.id,
          },

          data: {
            status:
              "action_required",

            errorCode:
              "PUBLICATION_TARGET_KIND_UNSUPPORTED",

            errorMessage:
              "Dieser Zieltyp wird vom Dispatcher nicht unterstützt.",
          },
        });


      continue;
    }


    /*
     * Bereits verknüpften Portaljob
     * nur spiegeln, niemals duplizieren.
     */
    if (
      target.portalJobId
    ) {

      const job =
        await prisma
          .portalPublishJob
          .findFirst({
            where: {
              id:
                target.portalJobId,

              userId,

              listingId,
            },

            select: {
              id:
                true,

              status:
                true,

              externalPublicationId:
                true,

              externalPublicationUrl:
                true,

              completedAt:
                true,

              errorCode:
                true,

              errorMessage:
                true,
            },
          });


      if (job) {

        const status =
          mapPortalJobStatus(
            job.status
          );


        await prisma
          .publicationTarget
          .update({
            where: {
              id:
                target.id,
            },

            data: {
              status,

              externalId:
                job.externalPublicationId,

              externalUrl:
                job.externalPublicationUrl,

              publishedAt:
                status ===
                  "published"
                  ? job.completedAt ??
                    now()
                  : null,

              errorCode:
                job.errorCode,

              errorMessage:
                job.errorMessage,
            },
          });


        portalJobsLinked +=
          1;

        continue;
      }


      await prisma
        .publicationTarget
        .update({
          where: {
            id:
              target.id,
          },

          data: {
            status:
              "action_required",

            errorCode:
              "PORTAL_JOB_LINK_MISSING",

            errorMessage:
              "Der gespeicherte Portal-Publish-Job wurde nicht gefunden.",
          },
        });


      continue;
    }


    if (
      !isGermanPortalId(
        target.destination
      )
    ) {

      await prisma
        .publicationTarget
        .update({
          where: {
            id:
              target.id,
          },

          data: {
            status:
              "action_required",

            errorCode:
              "PORTAL_TARGET_NOT_SUPPORTED",

            errorMessage:
              "Dieses Portal wird vom deutschen Dispatcher V1 noch nicht unterstützt.",
          },
        });


      continue;
    }


    /*
     * Zweite Maklerfreigabe-Prüfung direkt
     * vor der Job-Erzeugung.
     *
     * Danach prüft der Worker später nochmals
     * direkt vor dem Provider-Executor.
     */
    const stillApproved =
      await isBrokerMarketingApproved({
        userId,
        listingId,
      });


    if (
      !stillApproved
    ) {

      throw new PublicationDispatchError(
        BROKER_MARKETING_APPROVAL_REQUIRED,
        409,
        "Die Vermarktungsfreigabe wurde vor der Job-Erzeugung zurückgenommen."
      );
    }


    try {

      const job =
        await createPortalJob({
          userId,

          listingId,

          portal:
            target.destination,

          stageOnly,
        });


      const status =
        mapPortalJobStatus(
          job.status
        );


      await prisma
        .publicationTarget
        .update({
          where: {
            id:
              target.id,
          },

          data: {
            portalJobId:
              job.id,

            status,

            externalId:
              job.externalPublicationId ??
              null,

            externalUrl:
              job.externalPublicationUrl ??
              null,

            publishedAt:
              status ===
                "published"
                ? job.completedAt ??
                  now()
                : null,

            errorCode:
              job.errorCode ??
              null,

            errorMessage:
              job.errorMessage ??
              null,
          },
        });


      portalJobsLinked +=
        1;
    }
    catch (
      error
    ) {

      await prisma
        .publicationTarget
        .update({
          where: {
            id:
              target.id,
          },

          data: {
            status:
              "action_required",

            errorCode:
              readErrorCode(
                error
              ) ??
              "PORTAL_JOB_CREATION_FAILED",

            errorMessage:
              errorMessage(
                error
              ),
          },
        });
    }
  }


  const refreshed =
    await prisma.publicationRun.findUnique({
      where: {
        id:
          run.id,
      },

      include: {
        targets: {
          orderBy: {
            createdAt:
              "asc",
          },
        },
      },
    });


  if (!refreshed) {

    throw new PublicationDispatchError(
      "PUBLICATION_RUN_NOT_FOUND",
      404,
      "Der Veröffentlichungslauf ist während des Dispatchers verschwunden."
    );
  }


  const status =
    stageOnly
      ? "ready"
      : calculatePublicationRunStatus(
          refreshed.targets
        );


  const hasLinkedJob =
    refreshed.targets.some(
      (target) =>
        Boolean(
          target.portalJobId ||
          target.socialJobId
        )
    );


  const timestamp =
    now();


  const updatedRun =
    await prisma.publicationRun.update({
      where: {
        id:
          refreshed.id,
      },

      data: {
        status,

        startedAt:
          stageOnly
            ? refreshed.startedAt
            : hasLinkedJob
              ? refreshed.startedAt ??
                timestamp
              : refreshed.startedAt,

        completedAt:
          status ===
            "published"
            ? refreshed.completedAt ??
              timestamp
            : null,
      },

      include: {
        targets: {
          orderBy: {
            createdAt:
              "asc",
          },
        },
      },
    });


  /*
   * publicationStartedAt wird nur gesetzt,
   * wenn wirklich mindestens ein Job
   * an einen Target gebunden wurde.
   *
   * publishedAt wird hier ABSICHTLICH
   * NICHT gesetzt.
   */
  if (
    hasLinkedJob &&
    !stageOnly
  ) {

    const workflow =
      await prisma
        .brokerWorkflow
        .findUnique({
          where: {
            listingId,
          },

          select: {
            marketingApprovedAt:
              true,

            publicationStartedAt:
              true,
          },
        });


    if (
      workflow
        ?.marketingApprovedAt
    ) {

      await prisma
        .brokerWorkflow
        .update({
          where: {
            listingId,
          },

          data: {
            currentStage:
              "publication",

            publicationStartedAt:
              workflow
                .publicationStartedAt ??
              timestamp,
          },
        });
    }
  }


  return {
    run:
      updatedRun,

    summary:
      summarizeTargets(
        updatedRun.targets
      ),

    portalJobsLinked,

    socialJobsLinked,

    externalCalls:
      0,

    stagedOnly:
      stageOnly,

    workerTriggered:
      false,
  };
}
