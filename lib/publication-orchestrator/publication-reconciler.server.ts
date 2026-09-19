import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  calculatePublicationRunStatus,
} from "@/lib/publication-orchestrator/publication-dispatcher.server";


type PublicationTargetStatus =
  | "pending"
  | "publishing"
  | "published"
  | "failed"
  | "action_required"
  | "skipped";


type PortalJobSnapshot = {
  id:
    string;

  status:
    string;

  externalPublicationId:
    string |
    null;

  externalPublicationUrl:
    string |
    null;

  completedAt:
    Date |
    null;

  errorCode:
    string |
    null;

  errorMessage:
    string |
    null;
};


type SocialJobSnapshot = {
  id:
    string;

  status:
    string;

  externalPostId:
    string |
    null;

  externalPostUrl:
    string |
    null;

  publishedAt:
    Date |
    null;

  errorCode:
    string |
    null;

  errorMessage:
    string |
    null;
};


export type PublicationReconcileDependencies = {
  loadPortalJob?:
    (
      input: {
        jobId:
          string;

        userId:
          string;

        listingId:
          string;
      }
    ) =>
      Promise<
        PortalJobSnapshot |
        null
      >;

  loadSocialJob?:
    (
      input: {
        jobId:
          string;

        userId:
          string;

        listingId:
          string;
      }
    ) =>
      Promise<
        SocialJobSnapshot |
        null
      >;

  now?:
    () =>
      Date;
};


export class PublicationReconcileError
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
      "PublicationReconcileError";

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

    throw new PublicationReconcileError(
      "PUBLICATION_RECONCILE_INPUT_INVALID",
      400,
      label +
      " fehlt."
    );
  }


  return clean;
}


function mapPortalStatus(
  status:
    string
):
  PublicationTargetStatus {

  switch (
    status
  ) {

    case "draft":

      return "pending";


    case "scheduled":
    case "queued":
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


function mapSocialStatus(
  status:
    string
):
  PublicationTargetStatus {

  switch (
    status
  ) {

    case "draft":

      return "pending";


    case "scheduled":
    case "queued":
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


async function defaultLoadPortalJob(
  input: {
    jobId:
      string;

    userId:
      string;

    listingId:
      string;
  }
):
  Promise<
    PortalJobSnapshot |
    null
  > {

  return prisma.portalPublishJob.findFirst({
    where: {
      id:
        input.jobId,

      userId:
        input.userId,

      listingId:
        input.listingId,
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
}


async function defaultLoadSocialJob(
  input: {
    jobId:
      string;

    userId:
      string;

    listingId:
      string;
  }
):
  Promise<
    SocialJobSnapshot |
    null
  > {

  return prisma.socialPublishJob.findFirst({
    where: {
      id:
        input.jobId,

      userId:
        input.userId,

      listingId:
        input.listingId,
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
}


/*
 * PUBLICATION RECONCILER V1
 *
 * Liest ausschliesslich bereits vorhandene
 * Publish-Job-Zustaende und spiegelt sie
 * in PublicationTarget / PublicationRun.
 *
 * KEIN Worker wird gestartet.
 * KEIN Publish-Job wird erzeugt.
 * KEIN Provider wird aufgerufen.
 */
export async function reconcilePublicationRun(
  input: {
    userId:
      string;

    listingId:
      string;

    runId:
      string;
  },

  dependencies:
    PublicationReconcileDependencies =
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


  const loadPortalJob =
    dependencies
      .loadPortalJob ??
    defaultLoadPortalJob;


  const loadSocialJob =
    dependencies
      .loadSocialJob ??
    defaultLoadSocialJob;


  const now =
    dependencies
      .now ??
    (() =>
      new Date()
    );


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

    throw new PublicationReconcileError(
      "PUBLICATION_RUN_NOT_FOUND",
      404,
      "Der Veröffentlichungslauf wurde nicht gefunden."
    );
  }


  if (
    run.targets.length ===
    0
  ) {

    throw new PublicationReconcileError(
      "PUBLICATION_TARGETS_REQUIRED",
      409,
      "Der Veröffentlichungslauf enthält keine Ziele."
    );
  }


  let portalJobsRead =
    0;

  let socialJobsRead =
    0;


  for (
    const target of
    run.targets
  ) {

    if (
      target.kind ===
      "portal"
    ) {

      if (
        !target.portalJobId
      ) {

        /*
         * Noch nicht dispatched oder bewusst
         * ohne Job. Nicht künstlich fehlschlagen.
         */
        continue;
      }


      const job =
        await loadPortalJob({
          jobId:
            target.portalJobId,

          userId,

          listingId,
        });


      portalJobsRead +=
        1;


      if (!job) {

        await prisma.publicationTarget.update({
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
              "Der verknüpfte Portal-Publish-Job wurde nicht gefunden.",
          },
        });


        continue;
      }


      const status =
        mapPortalStatus(
          job.status
        );


      await prisma.publicationTarget.update({
        where: {
          id:
            target.id,
        },

        data: {
          status,

          externalId:
            job.externalPublicationId ??
            target.externalId,

          externalUrl:
            job.externalPublicationUrl ??
            target.externalUrl,

          publishedAt:
            status ===
              "published"
              ? job.completedAt ??
                target.publishedAt ??
                now()
              : null,

          errorCode:
            status ===
              "published"
              ? null
              : job.errorCode,

          errorMessage:
            status ===
              "published"
              ? null
              : job.errorMessage,
        },
      });


      continue;
    }


    if (
      target.kind ===
      "social"
    ) {

      if (
        !target.socialJobId
      ) {

        /*
         * Social-Orchestrator ist aktuell noch
         * bewusst separat. Unverknüpfte Targets
         * bleiben wie sie sind.
         */
        continue;
      }


      const job =
        await loadSocialJob({
          jobId:
            target.socialJobId,

          userId,

          listingId,
        });


      socialJobsRead +=
        1;


      if (!job) {

        await prisma.publicationTarget.update({
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
              "Der verknüpfte Social-Publish-Job wurde nicht gefunden.",
          },
        });


        continue;
      }


      const status =
        mapSocialStatus(
          job.status
        );


      await prisma.publicationTarget.update({
        where: {
          id:
            target.id,
        },

        data: {
          status,

          externalId:
            job.externalPostId ??
            target.externalId,

          externalUrl:
            job.externalPostUrl ??
            target.externalUrl,

          publishedAt:
            status ===
              "published"
              ? job.publishedAt ??
                target.publishedAt ??
                now()
              : null,

          errorCode:
            status ===
              "published"
              ? null
              : job.errorCode,

          errorMessage:
            status ===
              "published"
              ? null
              : job.errorMessage,
        },
      });


      continue;
    }


    await prisma.publicationTarget.update({
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
          "Dieser Veröffentlichungstyp wird vom Reconciler nicht unterstützt.",
      },
    });
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

    throw new PublicationReconcileError(
      "PUBLICATION_RUN_NOT_FOUND",
      404,
      "Der Veröffentlichungslauf ist während der Synchronisierung verschwunden."
    );
  }


  const status =
    calculatePublicationRunStatus(
      refreshed.targets
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

        /*
         * completedAt wird ausschliesslich
         * beim vollständigen Abschluss gesetzt.
         *
         * Bereits gesetzte historische Werte
         * werden nicht blind gelöscht.
         */
        ...(status ===
          "published"
          ? {
              completedAt:
                refreshed.completedAt ??
                timestamp,
            }
          : {}),
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
   * Erst jetzt darf der Makler-Workflow
   * auf published gesetzt werden:
   *
   * - Run aggregiert vollständig
   * - alle nicht übersprungenen Ziele fertig
   * - mindestens ein Ziel published
   *
   * calculatePublicationRunStatus()
   * erzwingt diese Semantik.
   */
  if (
    status ===
    "published"
  ) {

    const workflow =
      await prisma.brokerWorkflow.findUnique({
        where: {
          listingId,
        },

        select: {
          publicationStartedAt:
            true,

          publishedAt:
            true,
        },
      });


    if (workflow) {

      await prisma.brokerWorkflow.update({
        where: {
          listingId,
        },

        data: {
          currentStage:
            "published",

          publicationStartedAt:
            workflow
              .publicationStartedAt ??
            updatedRun.startedAt ??
            timestamp,

          publishedAt:
            workflow
              .publishedAt ??
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

    portalJobsRead,

    socialJobsRead,

    externalCalls:
      0,

    jobsCreated:
      0,

    workerTriggered:
      false,
  };
}
