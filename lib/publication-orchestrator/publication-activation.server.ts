import "server-only";

import {
  getPlanCapabilities,
} from "@/lib/plans";

import {
  prisma,
} from "@/lib/prisma";

import {
  isDevelopmentE2EListing,
} from "@/lib/development-e2e-access";

import {
  isPortalPublishQueueEnabled,
} from "@/lib/portal-integrations/portal-publish-job-factory.server";


export class PublicationActivationError
  extends Error {

  code:
    string;

  httpStatus:
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
      "PublicationActivationError";

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

  const normalized =
    value.trim();


  if (!normalized) {

    throw new PublicationActivationError(
      "PUBLICATION_ACTIVATION_INPUT_INVALID",
      400,
      `${label} fehlt.`
    );
  }


  return normalized;
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
 * PORTAL_DRAFT_ACTIVATION_V1
 *
 * Aktiviert ausschliesslich bereits
 * persistierte Portal-Draft-Jobs.
 *
 * KEIN Worker-Aufruf.
 * KEIN Provider-Aufruf.
 * KEIN Netzwerktransport.
 *
 * Production bleibt V1 fail-closed.
 */
export async function activatePublicationRunPortalDrafts(
  input: {
    userId:
      string;

    listingId:
      string;

    runId:
      string;
  }
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


  if (
    !isPortalPublishQueueEnabled()
  ) {

    throw new PublicationActivationError(
      "PORTAL_PUBLISH_QUEUE_DISABLED",
      409,
      "Die Portal-Publish-Queue ist nicht freigeschaltet."
    );
  }


  const [
    user,
    listing,
    run,
  ] =
    await Promise.all([

      prisma.user.findUnique({
        where: {
          id:
            userId,
        },

        select: {
          id:
            true,

          plan:
            true,
        },
      }),


      prisma.listing.findFirst({
        where: {
          id:
            listingId,

          userId,

          archivedAt:
            null,
        },

        select: {
          id:
            true,

          projectName:
            true,
        },
      }),


      prisma.publicationRun.findFirst({
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
      }),
    ]);


  if (
    !user ||
    !listing
  ) {

    throw new PublicationActivationError(
      "PUBLICATION_LISTING_NOT_FOUND",
      404,
      "Das Inserat wurde nicht gefunden."
    );
  }


  if (!run) {

    throw new PublicationActivationError(
      "PUBLICATION_RUN_NOT_FOUND",
      404,
      "Der Veröffentlichungslauf wurde nicht gefunden."
    );
  }


  const developmentE2E =
    isDevelopmentE2EListing(
      listing.projectName
    );


  const planEligible =
    getPlanCapabilities(
      user.plan
    )
      .canUsePublishingCenter ||
    developmentE2E;


  if (!planEligible) {

    throw new PublicationActivationError(
      "PRO_REQUIRED",
      403,
      "Die automatische Portalveröffentlichung benötigt Publishing-Center-Zugriff."
    );
  }


  if (
    run.status !==
      "ready" &&
    run.status !==
      "publishing"
  ) {

    throw new PublicationActivationError(
      "PUBLICATION_RUN_NOT_ACTIVATABLE",
      409,
      `Publication Run ist im Status "${run.status}" nicht aktivierbar.`
    );
  }


  const portalTargets =
    run.targets.filter(
      (target) =>
        target.kind ===
          "portal" &&
        Boolean(
          target.portalJobId
        )
    );


  if (
    portalTargets.length ===
    0
  ) {

    throw new PublicationActivationError(
      "PORTAL_DRAFT_JOBS_MISSING",
      409,
      "Für diesen Lauf wurden keine Portal-Draft-Jobs gefunden."
    );
  }


  const jobIds =
    Array.from(
      new Set(
        portalTargets
          .map(
            (target) =>
              target.portalJobId
          )
          .filter(
            (
              jobId
            ): jobId is string =>
              Boolean(
                jobId
              )
          )
      )
    );


  const jobs =
    await prisma.portalPublishJob.findMany({
      where: {
        id: {
          in:
            jobIds,
        },

        userId,

        listingId,
      },

      select: {
        id:
          true,

        userId:
          true,

        listingId:
          true,

        connectionId:
          true,

        provider:
          true,

        portal:
          true,

        environment:
          true,

        action:
          true,

        status:
          true,

        scheduledFor:
          true,

        nextAttemptAt:
          true,

        lockedAt:
          true,

        lockedBy:
          true,

        connection: {
          select: {
            id:
              true,

            userId:
              true,

            provider:
              true,

            portal:
              true,

            environment:
              true,

            status:
              true,
          },
        },
      },
    });


  if (
    jobs.length !==
    jobIds.length
  ) {

    throw new PublicationActivationError(
      "PORTAL_JOB_LINK_MISMATCH",
      409,
      "Mindestens ein verknüpfter Portaljob fehlt oder gehört nicht zu diesem Benutzer/Inserat."
    );
  }


  const jobById =
    new Map(
      jobs.map(
        (job) => [
          job.id,
          job,
        ]
      )
    );


  for (
    const target of
    portalTargets
  ) {

    const jobId =
      target.portalJobId;


    if (!jobId) {
      continue;
    }


    const job =
      jobById.get(
        jobId
      );


    if (!job) {

      throw new PublicationActivationError(
        "PORTAL_JOB_LINK_MISMATCH",
        409,
        "Ein Portal-Target verweist auf einen unbekannten Job."
      );
    }


    if (
      target.destination !==
        job.portal ||
      target.provider !==
        job.provider ||
      target.connectionId !==
        job.connectionId ||
      target.environment !==
        job.environment
    ) {

      throw new PublicationActivationError(
        "PORTAL_TARGET_SNAPSHOT_MISMATCH",
        409,
        `Portal-Snapshot stimmt für Job ${job.id} nicht mit dem Target überein.`
      );
    }


    if (
      job.action !==
      "publish"
    ) {

      throw new PublicationActivationError(
        "PORTAL_JOB_ACTION_NOT_ACTIVATABLE",
        409,
        `Portaljob ${job.id} ist kein Publish-Job.`
      );
    }


    /*
     * Production V1 bleibt bewusst geschlossen.
     */
    if (
      job.environment !==
      "test"
    ) {

      throw new PublicationActivationError(
        "PORTAL_PRODUCTION_ACTIVATION_NOT_ENABLED",
        409,
        "Production-Portaljobs dürfen über Activation V1 noch nicht freigeschaltet werden."
      );
    }


    if (
      job.scheduledFor !==
      null
    ) {

      throw new PublicationActivationError(
        "PORTAL_DRAFT_SCHEDULE_MISMATCH",
        409,
        `Draft-Job ${job.id} enthält unerwartet einen Zeitplan.`
      );
    }


    if (
      job.lockedAt !==
        null ||
      job.lockedBy !==
        null
    ) {

      throw new PublicationActivationError(
        "PORTAL_JOB_LOCKED",
        409,
        `Portaljob ${job.id} besitzt unerwartet einen Worker-Lock.`
      );
    }


    if (
      job.status !==
        "draft" &&
      job.status !==
        "queued"
    ) {

      throw new PublicationActivationError(
        "PORTAL_JOB_NOT_ACTIVATABLE",
        409,
        `Portaljob ${job.id} ist im Status "${job.status}" nicht aktivierbar.`
      );
    }


    if (
      job.status ===
        "draft" &&
      job.nextAttemptAt !==
        null
    ) {

      throw new PublicationActivationError(
        "PORTAL_DRAFT_NEXT_ATTEMPT_MISMATCH",
        409,
        `Draft-Job ${job.id} besitzt unerwartet nextAttemptAt.`
      );
    }


    if (
      job.status ===
        "queued" &&
      job.nextAttemptAt ===
        null
    ) {

      throw new PublicationActivationError(
        "PORTAL_QUEUED_NEXT_ATTEMPT_MISSING",
        409,
        `Queued-Job ${job.id} besitzt kein nextAttemptAt.`
      );
    }


    const connection =
      job.connection;


    if (
      !connection ||
      connection.id !==
        job.connectionId ||
      connection.userId !==
        userId ||
      connection.provider !==
        job.provider ||
      connection.portal !==
        job.portal ||
      connection.environment !==
        job.environment
    ) {

      throw new PublicationActivationError(
        "PORTAL_CONNECTION_SNAPSHOT_MISMATCH",
        409,
        `Portal-Verbindung für Job ${job.id} stimmt nicht mehr mit dem Job-Snapshot überein.`
      );
    }


    const developmentE2EConnection =
      developmentE2E &&
      job.portal ===
        "immoscout24_de" &&
      job.environment ===
        "test" &&
      connection.status ===
        "configured";


    if (
      connection.status !==
        "verified" &&
      !developmentE2EConnection
    ) {

      throw new PublicationActivationError(
        "PORTAL_CONNECTION_NOT_READY",
        409,
        `Portal-Verbindung für ${job.portal} ist nicht verifiziert.`
      );
    }
  }


  const draftJobIds =
    jobs
      .filter(
        (job) =>
          job.status ===
          "draft"
      )
      .map(
        (job) =>
          job.id
      );


  const alreadyQueuedJobIds =
    jobs
      .filter(
        (job) =>
          job.status ===
          "queued"
      )
      .map(
        (job) =>
          job.id
      );


  const activatedAt =
    new Date();


  const refreshedRun =
    await prisma.$transaction(
      async (
        tx
      ) => {

        /*
         * Approval wird unmittelbar vor
         * der eigentlichen Statusmutation
         * nochmals innerhalb der Transaction
         * geprüft.
         */
        const workflow =
          await tx.brokerWorkflow.findUnique({
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
          !workflow
            ?.marketingApprovedAt
        ) {

          throw new PublicationActivationError(
            "BROKER_MARKETING_APPROVAL_REQUIRED",
            409,
            "Die Vermarktungsfreigabe wurde vor der Portal-Aktivierung zurückgenommen."
          );
        }


        const currentRun =
          await tx.publicationRun.findFirst({
            where: {
              id:
                runId,

              userId,

              listingId,
            },

            select: {
              id:
                true,

              status:
                true,

              startedAt:
                true,
            },
          });


        if (!currentRun) {

          throw new PublicationActivationError(
            "PUBLICATION_RUN_NOT_FOUND",
            404,
            "Der Veröffentlichungslauf wurde während der Aktivierung nicht gefunden."
          );
        }


        if (
          currentRun.status !==
            "ready" &&
          currentRun.status !==
            "publishing"
        ) {

          throw new PublicationActivationError(
            "PUBLICATION_RUN_ACTIVATION_RACE",
            409,
            "Der Publication Run wurde parallel verändert."
          );
        }


        if (
          draftJobIds.length >
          0
        ) {

          const activated =
            await tx.portalPublishJob.updateMany({
              where: {
                id: {
                  in:
                    draftJobIds,
                },

                userId,

                listingId,

                status:
                  "draft",

                scheduledFor:
                  null,

                nextAttemptAt:
                  null,

                lockedAt:
                  null,

                lockedBy:
                  null,
              },

              data: {
                status:
                  "queued",

                nextAttemptAt:
                  activatedAt,

                errorCode:
                  null,

                errorMessage:
                  null,
              },
            });


          if (
            activated.count !==
            draftJobIds.length
          ) {

            throw new PublicationActivationError(
              "PORTAL_DRAFT_ACTIVATION_RACE",
              409,
              "Mindestens ein Portal-Draft wurde parallel verändert."
            );
          }
        }


        await tx.publicationTarget.updateMany({
          where: {
            runId,

            kind:
              "portal",

            portalJobId: {
              in:
                jobIds,
            },
          },

          data: {
            status:
              "publishing",

            errorCode:
              null,

            errorMessage:
              null,
          },
        });


        if (
          currentRun.status ===
          "ready"
        ) {

          await tx.publicationRun.update({
            where: {
              id:
                runId,
            },

            data: {
              status:
                "publishing",

              startedAt:
                currentRun.startedAt ??
                activatedAt,

              completedAt:
                null,
            },
          });
        }


        await tx.brokerWorkflow.update({
          where: {
            listingId,
          },

          data: {
            currentStage:
              "publication",

            publicationStartedAt:
              workflow
                .publicationStartedAt ??
              activatedAt,
          },
        });


        return tx.publicationRun.findUnique({
          where: {
            id:
              runId,
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
      }
    );


  if (!refreshedRun) {

    throw new PublicationActivationError(
      "PUBLICATION_RUN_NOT_FOUND",
      404,
      "Der Publication Run konnte nach der Aktivierung nicht erneut geladen werden."
    );
  }


  return {
    run:
      refreshedRun,

    summary:
      summarizeTargets(
        refreshedRun.targets
      ),

    activatedJobs:
      draftJobIds.length,

    alreadyQueuedJobs:
      alreadyQueuedJobIds.length,

    externalCalls:
      0,

    workerTriggered:
      false,
  };
}