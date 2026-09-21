import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVITY_WINDOW_DAYS = 7;

const ACTIVITY_WINDOW_MS =
  ACTIVITY_WINDOW_DAYS *
  24 *
  60 *
  60 *
  1000;

const MAX_RECENT_EVENTS = 500;
const MAX_ACTIVITY_ITEMS = 32;

type ActivitySeverity =
  | "info"
  | "success"
  | "warning"
  | "error";

type ActivityItem = {
  id: string;
  kind: string;
  severity: ActivitySeverity;
  status: string | null;

  listingId: string;
  listingLabel: string;
  location: string;

  title: string;
  message: string;
  icon: string;

  count: number;
  uniqueVisitors: number;

  createdAt: string;
  latestAt: string;

  unread: boolean;
  href: string;

  metadata:
    Record<string, unknown>;
};

function parseSeenAt(
  value: string | null
): Date {
  if (!value) {
    return new Date(0);
  }

  const timestamp =
    Date.parse(value);

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return new Date(0);
  }

  return new Date(
    Math.min(
      timestamp,
      Date.now()
    )
  );
}

function getListingLabel(
  listing: {
    projectName:
      string |
      null;

    location:
      string;

    propertyType:
      string;
  }
): string {
  return (
    listing.projectName?.trim() ||
    listing.location?.trim() ||
    listing.propertyType?.trim() ||
    "Objekt"
  );
}

function isUnread(
  timestamp: Date,
  unreadFrom: Date
): boolean {
  return (
    timestamp.getTime() >
    unreadFrom.getTime()
  );
}

function getPublicationPresentation(
  status: string,
  counts: {
    total: number;
    published: number;
    failed: number;
    actionRequired: number;
  }
): {
  kind: string;
  severity: ActivitySeverity;
  title: string;
  message: string;
  icon: string;
} | null {
  if (status === "ready") {
    return {
      kind:
        "publication.ready",

      severity:
        "info",

      title:
        "Veröffentlichung vorbereitet",

      message:
        counts.total === 1
          ? "1 Veröffentlichungsziel ist vorbereitet."
          : `${counts.total} Veröffentlichungsziele sind vorbereitet.`,

      icon:
        "\u{1F7E1}",
    };
  }

  if (
    status ===
    "publishing"
  ) {
    return {
      kind:
        "publication.started",

      severity:
        "info",

      title:
        "Veröffentlichung läuft",

      message:
        counts.total > 0
          ? `${counts.published} von ${counts.total} Zielen abgeschlossen.`
          : "Inserat-AI verarbeitet die Veröffentlichung.",

      icon:
        "\u{1F535}",
    };
  }

  if (
    status ===
    "partial"
  ) {
    const attention =
      counts.failed +
      counts.actionRequired;

    return {
      kind:
        "publication.partial",

      severity:
        "warning",

      title:
        "Teilweise veröffentlicht",

      message:
        attention > 0
          ? `${counts.published} von ${counts.total} veröffentlicht · ${attention} benötigen Aufmerksamkeit.`
          : `${counts.published} von ${counts.total} Zielen veröffentlicht.`,

      icon:
        "\u{26A0}\u{FE0F}",
    };
  }

  if (
    status ===
    "published"
  ) {
    return {
      kind:
        "publication.published",

      severity:
        "success",

      title:
        "Veröffentlichung abgeschlossen",

      message:
        counts.total > 0
          ? `Alle ${counts.total} ausgewählten Ziele wurden abgeschlossen.`
          : "Die Veröffentlichung wurde abgeschlossen.",

      icon:
        "\u{2705}",
    };
  }

  if (
    status ===
    "action_required"
  ) {
    const attention =
      counts.failed +
      counts.actionRequired;

    return {
      kind:
        "publication.action_required",

      severity:
        "error",

      title:
        "Aktion erforderlich",

      message:
        attention === 1
          ? "1 Veröffentlichungsziel benötigt Aufmerksamkeit."
          : attention > 1
            ? `${attention} Veröffentlichungsziele benötigen Aufmerksamkeit.`
            : "Die Veröffentlichung benötigt deine Aufmerksamkeit.",

      icon:
        "\u{1F534}",
    };
  }

  return null;
}

function getDestinationLabel(
  destination:
    string |
    null |
    undefined,
  provider?:
    string |
    null
): string {
  const raw =
    (
      destination ||
      provider ||
      "Portal"
    ).trim();

  const normalized =
    raw.toLowerCase();

  if (
    normalized.includes(
      "immoscout"
    )
  ) {
    return "ImmoScout24";
  }

  if (
    normalized.includes(
      "immowelt"
    )
  ) {
    return "Immowelt";
  }

  if (
    normalized.includes(
      "kleinanzeigen"
    )
  ) {
    return "Kleinanzeigen";
  }

  if (
    normalized.includes(
      "immobilien_de"
    ) ||
    normalized.includes(
      "immobilien.de"
    )
  ) {
    return "Immobilien.de";
  }

  if (
    normalized.includes("wg") &&
    normalized.includes("gesucht")
  ) {
    return "WG-Gesucht";
  }

  return raw
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getTargetPresentation(
  status: string,
  destination: string,
  errorMessage:
    string |
    null
): {
  kind: string;
  severity: ActivitySeverity;
  title: string;
  message: string;
  icon: string;
} | null {
  if (
    status ===
    "publishing"
  ) {
    return {
      kind:
        "target.publishing",

      severity:
        "info",

      title:
        `${destination} veröffentlicht`,

      message:
        "Das Veröffentlichungsziel wird gerade verarbeitet.",

      icon:
        "\u{1F535}",
    };
  }

  if (
    status ===
    "published"
  ) {
    return {
      kind:
        "target.published",

      severity:
        "success",

      title:
        `${destination} erfolgreich`,

      message:
        "Das Objekt wurde auf diesem Ziel erfolgreich veröffentlicht.",

      icon:
        "\u{2705}",
    };
  }

  if (
    status ===
    "failed"
  ) {
    return {
      kind:
        "target.failed",

      severity:
        "error",

      title:
        `${destination} fehlgeschlagen`,

      message:
        errorMessage?.trim() ||
        "Die Veröffentlichung auf diesem Ziel ist fehlgeschlagen.",

      icon:
        "\u{1F534}",
    };
  }

  if (
    status ===
    "action_required"
  ) {
    return {
      kind:
        "target.action_required",

      severity:
        "error",

      title:
        `${destination}: Aktion erforderlich`,

      message:
        errorMessage?.trim() ||
        "Dieses Veröffentlichungsziel benötigt deine Aufmerksamkeit.",

      icon:
        "\u{26A0}\u{FE0F}",
    };
  }

  if (
    status ===
    "skipped"
  ) {
    return {
      kind:
        "target.skipped",

      severity:
        "warning",

      title:
        `${destination} übersprungen`,

      message:
        "Dieses Veröffentlichungsziel wurde übersprungen.",

      icon:
        "\u{23ED}\u{FE0F}",
    };
  }

  return null;
}

function getPortalJobPresentation(
  input: {
    portal: string;
    provider: string;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    nextAttemptAt:
      Date |
      null;
    errorMessage:
      string |
      null;
  }
): {
  kind: string;
  severity: ActivitySeverity;
  title: string;
  message: string;
  icon: string;
} | null {
  const portal =
    getDestinationLabel(
      input.portal,
      input.provider
    );

  if (
    input.status ===
    "draft"
  ) {
    return {
      kind:
        "portal.draft",

      severity:
        "info",

      title:
        `${portal} vorbereitet`,

      message:
        "Der Publish-Job liegt sicher als Entwurf bereit.",

      icon:
        "\u{1F4DD}",
    };
  }

  if (
    input.status ===
    "scheduled"
  ) {
    return {
      kind:
        "portal.scheduled",

      severity:
        "info",

      title:
        `${portal} geplant`,

      message:
        "Die Veröffentlichung ist eingeplant.",

      icon:
        "\u{23F1}\u{FE0F}",
    };
  }

  if (
    input.status ===
    "queued"
  ) {
    const retry =
      input.attemptCount >
      0;

    return {
      kind:
        retry
          ? "portal.retry_queued"
          : "portal.queued",

      severity:
        retry
          ? "warning"
          : "info",

      title:
        retry
          ? `${portal}: Retry wartet`
          : `${portal} wartet`,

      message:
        retry
          ? `Neuer Versuch nach ${input.attemptCount} bisherigen Versuch${
              input.attemptCount === 1
                ? ""
                : "en"
            }.`
          : "Der Publish-Job wartet auf Verarbeitung.",

      icon:
        retry
          ? "\u{1F501}"
          : "\u{23F3}",
    };
  }

  if (
    input.status ===
    "processing"
  ) {
    const retry =
      input.attemptCount >
      1;

    return {
      kind:
        retry
          ? "portal.retry_processing"
          : "portal.processing",

      severity:
        retry
          ? "warning"
          : "info",

      title:
        retry
          ? `${portal}: Retry läuft`
          : `${portal} wird veröffentlicht`,

      message:
        input.attemptCount > 0
          ? `Versuch ${input.attemptCount} von maximal ${input.maxAttempts}.`
          : "Inserat-AI überträgt das Objekt an das Portal.",

      icon:
        retry
          ? "\u{1F501}"
          : "\u{1F535}",
    };
  }

  if (
    input.status ===
    "succeeded"
  ) {
    return {
      kind:
        "portal.succeeded",

      severity:
        "success",

      title:
        `${portal} veröffentlicht`,

      message:
        "Der Portal-Publish-Job wurde erfolgreich abgeschlossen.",

      icon:
        "\u{2705}",
    };
  }

  if (
    input.status ===
    "failed"
  ) {
    const retryPending =
      Boolean(
        input.nextAttemptAt
      ) &&
      input.attemptCount <
        input.maxAttempts;

    return {
      kind:
        retryPending
          ? "portal.retry_scheduled"
          : "portal.failed",

      severity:
        retryPending
          ? "warning"
          : "error",

      title:
        retryPending
          ? `${portal}: Neuer Versuch geplant`
          : `${portal} fehlgeschlagen`,

      message:
        input.errorMessage?.trim() ||
        (
          retryPending
            ? "Inserat-AI wird die Veröffentlichung erneut versuchen."
            : "Der Portal-Publish-Job ist fehlgeschlagen."
        ),

      icon:
        retryPending
          ? "\u{1F501}"
          : "\u{1F534}",
    };
  }

  if (
    input.status ===
    "cancelled"
  ) {
    return {
      kind:
        "portal.cancelled",

      severity:
        "warning",

      title:
        `${portal} abgebrochen`,

      message:
        "Der Publish-Job wurde abgebrochen.",

      icon:
        "\u{26D4}",
    };
  }

  return null;
}
export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Keine aktive Sitzung gefunden.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Abwärtskompatibilität:
     *
     * Standard = bisherige Views.
     * mode=all = Activity Center V2.
     *
     * CockpitOverview kann dadurch
     * unverändert bleiben.
     */
    const requestedListingId =
      request.nextUrl
        .searchParams
        .get("listingId")
        ?.trim() ||
      null;

    const includeOperational =
      request.nextUrl
        .searchParams
        .get("mode") ===
      "all";

    const listings =
      await prisma.listing.findMany({
        where: {
          userId:
            user.id,

          ...(requestedListingId
            ? {
                id:
                  requestedListingId,
              }
            : {}),
        },

        select: {
          id:
            true,

          projectName:
            true,

          location:
            true,

          propertyType:
            true,
        },
      });

    if (
      listings.length ===
      0
    ) {
      return NextResponse.json({
        success:
          true,

        unreadCount:
          0,

        items:
          [],

        summary: {
          views7d:
            0,

          uniqueVisitors7d:
            0,

          operationalEvents7d:
            0,

          actionRequired7d:
            0,
        },
      });
    }

    const listingIds =
      listings.map(
        (listing) =>
          listing.id
      );

    const listingById =
      new Map(
        listings.map(
          (listing) => [
            listing.id,
            listing,
          ]
        )
      );

    const windowStart =
      new Date(
        Date.now() -
          ACTIVITY_WINDOW_MS
      );

    const seenAt =
      parseSeenAt(
        request.nextUrl
          .searchParams
          .get("since")
      );

    const unreadFrom =
      seenAt >
      windowStart
        ? seenAt
        : windowStart;

    const [
      recentViews,
      totalViews7d,
      uniqueVisitorRows,
      legacyUnreadCount,
    ] =
      await Promise.all([
        prisma.listingViewEvent.findMany(
          {
            where: {
              listingId: {
                in:
                  listingIds,
              },

              createdAt: {
                gte:
                  windowStart,
              },
            },

            orderBy: {
              createdAt:
                "desc",
            },

            take:
              MAX_RECENT_EVENTS,

            select: {
              id:
                true,

              listingId:
                true,

              visitorHash:
                true,

              source:
                true,

              deviceType:
                true,

              createdAt:
                true,
            },
          }
        ),

        prisma.listingViewEvent.count({
          where: {
            listingId: {
              in:
                listingIds,
            },

            createdAt: {
              gte:
                windowStart,
            },
          },
        }),

        prisma.listingViewEvent.findMany(
          {
            where: {
              listingId: {
                in:
                  listingIds,
              },

              createdAt: {
                gte:
                  windowStart,
              },
            },

            distinct: [
              "visitorHash",
            ],

            select: {
              visitorHash:
                true,
            },
          }
        ),

        prisma.listingViewEvent.count({
          where: {
            listingId: {
              in:
                listingIds,
            },

            createdAt: {
              gt:
                unreadFrom,
            },
          },
        }),
      ]);

    type ActivityGroup = {
      listingId:
        string;

      listingLabel:
        string;

      location:
        string;

      count:
        number;

      latestAt:
        Date;

      uniqueVisitors:
        Set<string>;

      unread:
        boolean;
    };

    const groups =
      new Map<
        string,
        ActivityGroup
      >();

    for (
      const view
      of recentViews
    ) {
      const listing =
        listingById.get(
          view.listingId
        );

      if (!listing) {
        continue;
      }

      const day =
        view.createdAt
          .toISOString()
          .slice(
            0,
            10
          );

      const groupKey =
        `${view.listingId}:${day}`;

      const unread =
        isUnread(
          view.createdAt,
          unreadFrom
        );

      const existing =
        groups.get(
          groupKey
        );

      if (existing) {
        existing.count +=
          1;

        existing.uniqueVisitors.add(
          view.visitorHash
        );

        if (
          view.createdAt >
          existing.latestAt
        ) {
          existing.latestAt =
            view.createdAt;
        }

        if (unread) {
          existing.unread =
            true;
        }

        continue;
      }

      groups.set(
        groupKey,
        {
          listingId:
            view.listingId,

          listingLabel:
            getListingLabel(
              listing
            ),

          location:
            listing.location,

          count:
            1,

          latestAt:
            view.createdAt,

          uniqueVisitors:
            new Set([
              view.visitorHash,
            ]),

          unread,
        }
      );
    }

    const viewItems:
      ActivityItem[] =
      Array.from(
        groups.values()
      )
        .sort(
          (a, b) =>
            b.latestAt.getTime() -
            a.latestAt.getTime()
        )
        .map(
          (group) => {
            const timestamp =
              group.latestAt
                .toISOString();

            return {
              id:
                `views:${group.listingId}:` +
                timestamp.slice(
                  0,
                  10
                ),

              kind:
                "views",

              severity:
                "info",

              status:
                null,

              listingId:
                group.listingId,

              listingLabel:
                group.listingLabel,

              location:
                group.location,

              title:
                group.count === 1
                  ? "1 neuer Aufruf"
                  : `${group.count} neue Aufrufe`,

              message:
                group.uniqueVisitors.size ===
                1
                  ? "1 Besucher"
                  : `${group.uniqueVisitors.size} Besucher`,

              icon:
                "\u{1F441}",

              count:
                group.count,

              uniqueVisitors:
                group.uniqueVisitors
                  .size,

              createdAt:
                timestamp,

              latestAt:
                timestamp,

              unread:
                group.unread,

              href:
                `/cockpit/${group.listingId}`,

              metadata: {
                eventType:
                  "listing.views",
              },
            };
          }
        );

    /*
     * Legacy-Modus für bestehende
     * Cockpit-Aufrufer.
     */
    if (
      !includeOperational
    ) {
      return NextResponse.json({
        success:
          true,

        unreadCount:
          legacyUnreadCount,

        items:
          viewItems
            .slice(
              0,
              12
            )
            .map(
              (item) => ({
                id:
                  item.id,

                kind:
                  "views",

                listingId:
                  item.listingId,

                listingLabel:
                  item.listingLabel,

                location:
                  item.location,

                count:
                  item.count,

                uniqueVisitors:
                  item.uniqueVisitors,

                createdAt:
                  item.createdAt,

                latestAt:
                  item.latestAt,

                unread:
                  item.unread,

                href:
                  item.href,
              })
            ),

        summary: {
          views7d:
            totalViews7d,

          uniqueVisitors7d:
            uniqueVisitorRows.length,
        },
      });
    }


    const [
      publicationRuns,
      workflows,
      portalJobs,
    ] =
      await Promise.all([
        prisma.publicationRun.findMany({
          where: {
            userId:
              user.id,

            listingId: {
              in:
                listingIds,
            },

            updatedAt: {
              gte:
                windowStart,
            },
          },

          orderBy: {
            updatedAt:
              "desc",
          },

          take:
            100,

          select: {
            id:
              true,

            listingId:
              true,

            status:
              true,

            startedAt:
              true,

            completedAt:
              true,

            createdAt:
              true,

            updatedAt:
              true,

            targets: {
              select: {
                id:
                  true,

                targetKey:
                  true,

                kind:
                  true,

                provider:
                  true,

                destination:
                  true,

                status:
                  true,

                errorCode:
                  true,

                errorMessage:
                  true,

                externalUrl:
                  true,

                publishedAt:
                  true,

                updatedAt:
                  true,

                portalJobId:
                  true,

                socialJobId:
                  true,
              },
            },
          },
        }),

        prisma.brokerWorkflow.findMany({
          where: {
            listingId: {
              in:
                listingIds,
            },

            updatedAt: {
              gte:
                windowStart,
            },
          },

          select: {
            id:
              true,

            listingId:
              true,

            currentStage:
              true,

            valuationCompletedAt:
              true,

            mandateConfirmedAt:
              true,

            packagePreparedAt:
              true,

            marketingApprovedAt:
              true,

            publicationStartedAt:
              true,

            publishedAt:
              true,

            updatedAt:
              true,
          },
        }),

        prisma.portalPublishJob.findMany({
          where: {
            userId:
              user.id,

            listingId: {
              in:
                listingIds,
            },

            updatedAt: {
              gte:
                windowStart,
            },
          },

          orderBy: {
            updatedAt:
              "desc",
          },

          take:
            150,

          select: {
            id:
              true,

            listingId:
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

            attemptCount:
              true,

            maxAttempts:
              true,

            nextAttemptAt:
              true,

            lastAttemptAt:
              true,

            externalPublicationId:
              true,

            externalPublicationUrl:
              true,

            completedAt:
              true,

            failedAt:
              true,

            errorCode:
              true,

            errorMessage:
              true,

            createdAt:
              true,

            updatedAt:
              true,
          },
        }),
      ]);


    const publicationItems:
      ActivityItem[] =
      [];

    for (
      const run
      of publicationRuns
    ) {
      const listing =
        listingById.get(
          run.listingId
        );

      if (!listing) {
        continue;
      }

      const counts = {
        total:
          run.targets.length,

        published:
          run.targets.filter(
            (target) =>
              target.status ===
              "published"
          ).length,

        failed:
          run.targets.filter(
            (target) =>
              target.status ===
              "failed"
          ).length,

        actionRequired:
          run.targets.filter(
            (target) =>
              target.status ===
              "action_required"
          ).length,
      };

      const presentation =
        getPublicationPresentation(
          run.status,
          counts
        );

      if (!presentation) {
        continue;
      }

      const eventAt =
        run.status ===
        "published"
          ? run.completedAt ??
            run.updatedAt

          : run.status ===
            "publishing"
            ? run.startedAt ??
              run.updatedAt

            : run.updatedAt;

      if (
        eventAt <
        windowStart
      ) {
        continue;
      }

      const timestamp =
        eventAt.toISOString();

      publicationItems.push({
        id:
          `publication:${run.id}:${run.status}`,

        kind:
          presentation.kind,

        severity:
          presentation.severity,

        status:
          run.status,

        listingId:
          run.listingId,

        listingLabel:
          getListingLabel(
            listing
          ),

        location:
          listing.location,

        title:
          presentation.title,

        message:
          presentation.message,

        icon:
          presentation.icon,

        count:
          1,

        uniqueVisitors:
          0,

        createdAt:
          timestamp,

        latestAt:
          timestamp,

        unread:
          isUnread(
            eventAt,
            unreadFrom
          ),

        href:
          `/cockpit/${run.listingId}#portal-publishing`,

        metadata: {
          eventType:
            presentation.kind,

          runId:
            run.id,

          runStatus:
            run.status,

          targetCount:
            counts.total,

          publishedCount:
            counts.published,

          failedCount:
            counts.failed,

          actionRequiredCount:
            counts.actionRequired,
        },
      });
    }


    const targetItems:
      ActivityItem[] =
      [];

    for (
      const run
      of publicationRuns
    ) {
      const listing =
        listingById.get(
          run.listingId
        );

      if (!listing) {
        continue;
      }

      for (
        const target
        of run.targets
      ) {
        /*
         * Portal-Targets mit eigenem Job
         * werden weiter unten aus dem
         * reichhaltigeren PortalPublishJob
         * dargestellt.
         *
         * Social-Targets und Targets ohne
         * PortalJob bleiben hier sichtbar.
         */
        if (
          target.kind ===
            "portal" &&
          target.portalJobId
        ) {
          continue;
        }

        const destination =
          getDestinationLabel(
            target.destination,
            target.provider
          );

        const presentation =
          getTargetPresentation(
            target.status,
            destination,
            target.errorMessage
          );

        if (!presentation) {
          continue;
        }

        const eventAt =
          target.status ===
            "published"
            ? target.publishedAt ??
              target.updatedAt
            : target.updatedAt;

        if (
          eventAt <
          windowStart
        ) {
          continue;
        }

        const timestamp =
          eventAt.toISOString();

        targetItems.push({
          id:
            `target:${target.id}:${target.status}`,

          kind:
            presentation.kind,

          severity:
            presentation.severity,

          status:
            target.status,

          listingId:
            run.listingId,

          listingLabel:
            getListingLabel(
              listing
            ),

          location:
            listing.location,

          title:
            presentation.title,

          message:
            presentation.message,

          icon:
            presentation.icon,

          count:
            1,

          uniqueVisitors:
            0,

          createdAt:
            timestamp,

          latestAt:
            timestamp,

          unread:
            isUnread(
              eventAt,
              unreadFrom
            ),

          href:
            target.externalUrl ||
            `/cockpit/${run.listingId}#portal-publishing`,

          metadata: {
            eventType:
              presentation.kind,

            runId:
              run.id,

            targetId:
              target.id,

            targetKey:
              target.targetKey,

            targetKind:
              target.kind,

            provider:
              target.provider,

            destination:
              target.destination,

            portalJobId:
              target.portalJobId,

            socialJobId:
              target.socialJobId,

            errorCode:
              target.errorCode,

            externalUrl:
              target.externalUrl,
          },
        });
      }
    }


    /*
     * COMMAND_CENTER_PORTAL_RUN_ID_V1
     *
     * PortalPublishJob kennt selbst keine
     * PublicationRun-ID.
     *
     * PublicationTarget.portalJobId liefert
     * jedoch die eindeutige Verbindung.
     *
     * Damit kann ein Reconcile-Hinweis aus
     * einem konkreten Portal-Job sicher auf
     * exakt den zugehörigen Run zeigen.
     */
    const publicationRunIdByPortalJobId =
      new Map<
        string,
        string
      >();


    for (
      const run
      of publicationRuns
    ) {
      for (
        const target
        of run.targets
      ) {
        if (
          !target.portalJobId
        ) {
          continue;
        }

        publicationRunIdByPortalJobId.set(
          target.portalJobId,
          run.id
        );
      }
    }


    const portalJobItems:
      ActivityItem[] =
      [];

    for (
      const job
      of portalJobs
    ) {
      if (!job.listingId) {
        continue;
      }

      const listing =
        listingById.get(
          job.listingId
        );

      if (!listing) {
        continue;
      }

      const presentation =
        getPortalJobPresentation({
          portal:
            job.portal,

          provider:
            job.provider,

          status:
            job.status,

          attemptCount:
            job.attemptCount,

          maxAttempts:
            job.maxAttempts,

          nextAttemptAt:
            job.nextAttemptAt,

          errorMessage:
            job.errorMessage,
        });

      if (!presentation) {
        continue;
      }

      const eventAt =
        job.status ===
          "succeeded"
          ? job.completedAt ??
            job.updatedAt

          : job.status ===
            "failed"
            ? job.failedAt ??
              job.updatedAt

            : job.status ===
              "processing"
              ? job.lastAttemptAt ??
                job.updatedAt

              : job.updatedAt;

      if (
        eventAt <
        windowStart
      ) {
        continue;
      }

      const timestamp =
        eventAt.toISOString();

      const portalLabel =
        getDestinationLabel(
          job.portal,
          job.provider
        );

      portalJobItems.push({
        id:
          `portal-job:${job.id}:${job.status}:${job.attemptCount}`,

        kind:
          presentation.kind,

        severity:
          presentation.severity,

        status:
          job.status,

        listingId:
          job.listingId,

        listingLabel:
          getListingLabel(
            listing
          ),

        location:
          listing.location,

        title:
          presentation.title,

        message:
          presentation.message,

        icon:
          presentation.icon,

        count:
          1,

        uniqueVisitors:
          0,

        createdAt:
          timestamp,

        latestAt:
          timestamp,

        unread:
          isUnread(
            eventAt,
            unreadFrom
          ),

        href:
          job.externalPublicationUrl ||
          `/cockpit/${job.listingId}#portal-publishing`,

        metadata: {
          eventType:
            presentation.kind,

          jobId:
            job.id,

          runId:
            publicationRunIdByPortalJobId.get(
              job.id
            ) ??
            null,

          provider:
            job.provider,

          portal:
            job.portal,

          portalLabel,

          environment:
            job.environment,

          action:
            job.action,

          attemptCount:
            job.attemptCount,

          maxAttempts:
            job.maxAttempts,

          nextAttemptAt:
            job.nextAttemptAt
              ?.toISOString() ??
            null,

          errorCode:
            job.errorCode,

          externalPublicationId:
            job.externalPublicationId,

          externalPublicationUrl:
            job.externalPublicationUrl,
        },
      });
    }

    const workflowItems:
      ActivityItem[] =
      [];

    function addWorkflowEvent(
      input: {
        id:
          string;

        listingId:
          string;

        timestamp:
          Date |
          null;

        kind:
          string;

        title:
          string;

        message:
          string;

        icon:
          string;

        href?:
          string;
      }
    ) {
      if (
        !input.timestamp ||
        input.timestamp <
          windowStart
      ) {
        return;
      }

      const listing =
        listingById.get(
          input.listingId
        );

      if (!listing) {
        return;
      }

      const timestamp =
        input.timestamp
          .toISOString();

      workflowItems.push({
        id:
          input.id,

        kind:
          input.kind,

        severity:
          "success",

        status:
          "completed",

        listingId:
          input.listingId,

        listingLabel:
          getListingLabel(
            listing
          ),

        location:
          listing.location,

        title:
          input.title,

        message:
          input.message,

        icon:
          input.icon,

        count:
          1,

        uniqueVisitors:
          0,

        createdAt:
          timestamp,

        latestAt:
          timestamp,

        unread:
          isUnread(
            input.timestamp,
            unreadFrom
          ),

        href:
          input.href ??
          `/cockpit/${input.listingId}`,

        metadata: {
          eventType:
            input.kind,
        },
      });
    }


    for (
      const workflow
      of workflows
    ) {
      addWorkflowEvent({
        id:
          `workflow:${workflow.id}:valuation`,

        listingId:
          workflow.listingId,

        timestamp:
          workflow.valuationCompletedAt,

        kind:
          "valuation.completed",

        title:
          "Bewertung abgeschlossen",

        message:
          "Die Objektbewertung wurde abgeschlossen.",

        icon:
          "\u{1F3E0}",
      });


      addWorkflowEvent({
        id:
          `workflow:${workflow.id}:mandate`,

        listingId:
          workflow.listingId,

        timestamp:
          workflow.mandateConfirmedAt,

        kind:
          "workflow.mandate_confirmed",

        title:
          "Mandat bestätigt",

        message:
          "Das Objektmandat wurde bestätigt.",

        icon:
          "\u{1F4DD}",
      });


      addWorkflowEvent({
        id:
          `workflow:${workflow.id}:package`,

        listingId:
          workflow.listingId,

        timestamp:
          workflow.packagePreparedAt,

        kind:
          "workflow.package_ready",

        title:
          "Objektpaket bereit",

        message:
          "Das Vermarktungspaket ist für die Freigabe vorbereitet.",

        icon:
          "\u{1F4E6}",
      });


      addWorkflowEvent({
        id:
          `workflow:${workflow.id}:approval`,

        listingId:
          workflow.listingId,

        timestamp:
          workflow.marketingApprovedAt,

        kind:
          "workflow.approved",

        title:
          "Veröffentlichung freigegeben",

        message:
          "Die Maklerfreigabe wurde erteilt.",

        icon:
          "\u{2705}",

        href:
          `/cockpit/${workflow.listingId}#portal-publishing`,
      });
    }


    const operationalItems =
      [
        ...publicationItems,
        ...targetItems,
        ...portalJobItems,
        ...workflowItems,
      ];

    const allItems =
      [
        ...viewItems,
        ...operationalItems,
      ]
        .sort(
          (a, b) =>
            Date.parse(
              b.createdAt
            ) -
            Date.parse(
              a.createdAt
            )
        )
        .slice(
          0,
          MAX_ACTIVITY_ITEMS
        );

    const unreadCount =
      allItems.filter(
        (item) =>
          item.unread
      ).length;

    const actionRequired7d =
      operationalItems.filter(
        (item) =>
          item.severity ===
            "error" ||
          item.severity ===
            "warning"
      ).length;

    return NextResponse.json({
      success:
        true,

      unreadCount,

      items:
        allItems,

      summary: {
        views7d:
          totalViews7d,

        uniqueVisitors7d:
          uniqueVisitorRows.length,

        operationalEvents7d:
          operationalItems.length,

        actionRequired7d,
      },
    });
  }
  catch (error) {
    console.error(
      "ACTIVITY CENTER GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Die Aktivitäten konnten nicht geladen werden.",
      },
      {
        status:
          500,
      }
    );
  }
}