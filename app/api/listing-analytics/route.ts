import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

const DAY_MS =
  24 * 60 * 60 * 1000;

function dayKey(
  date: Date
): string {
  return date
    .toISOString()
    .slice(0, 10);
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
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

    const listings =
      await prisma.listing.findMany({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
          projectName: true,
          propertyType: true,
          location: true,
        },
      });

    const listingIds =
      listings.map(
        (listing) =>
          listing.id
      );

    if (
      listingIds.length === 0
    ) {
      return NextResponse.json({
        success: true,
        analytics: {
          totalViews30d: 0,
          uniqueVisitors30d: 0,
          views7d: 0,
          viewsToday: 0,
          daily7d: [],
          topListings: [],
          sources: [],
        },
      });
    }

    const now =
      new Date();

    const thirtyDaysAgo =
      new Date(
        now.getTime() -
          30 * DAY_MS
      );

    const sevenDaysAgo =
      new Date(
        now.getTime() -
          7 * DAY_MS
      );

    const todayStart =
      new Date(now);

    todayStart.setHours(
      0,
      0,
      0,
      0
    );

    const events =
      await prisma.listingViewEvent.findMany({
        where: {
          listingId: {
            in: listingIds,
          },
          createdAt: {
            gte:
              thirtyDaysAgo,
          },
        },
        select: {
          listingId: true,
          visitorHash: true,
          source: true,
          deviceType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const uniqueVisitors =
      new Set<string>();

    const listingViews =
      new Map<
        string,
        number
      >();

    const sourceViews =
      new Map<
        string,
        number
      >();

    let views7d = 0;
    let viewsToday = 0;

    for (
      const event of events
    ) {
      uniqueVisitors.add(
        event.visitorHash
      );

      listingViews.set(
        event.listingId,
        (
          listingViews.get(
            event.listingId
          ) ?? 0
        ) + 1
      );

      const source =
        event.source ||
        "direct";

      sourceViews.set(
        source,
        (
          sourceViews.get(
            source
          ) ?? 0
        ) + 1
      );

      if (
        event.createdAt >=
        sevenDaysAgo
      ) {
        views7d += 1;
      }

      if (
        event.createdAt >=
        todayStart
      ) {
        viewsToday += 1;
      }
    }

    const daily7d: Array<{
      date: string;
      views: number;
    }> = [];

    for (
      let index = 6;
      index >= 0;
      index -= 1
    ) {
      const date =
        new Date(
          now.getTime() -
            index *
              DAY_MS
        );

      const key =
        dayKey(date);

      const views =
        events.filter(
          (event) =>
            dayKey(
              event.createdAt
            ) === key
        ).length;

      daily7d.push({
        date: key,
        views,
      });
    }

    const topListings =
      listings
        .map(
          (listing) => ({
            id:
              listing.id,
            title:
              listing.projectName?.trim() ||
              `${listing.propertyType} in ${listing.location}`,
            views:
              listingViews.get(
                listing.id
              ) ?? 0,
          })
        )
        .filter(
          (listing) =>
            listing.views > 0
        )
        .sort(
          (first, second) =>
            second.views -
            first.views
        )
        .slice(
          0,
          5
        );

    const sources =
      Array.from(
        sourceViews.entries()
      )
        .map(
          ([
            source,
            views,
          ]) => ({
            source,
            views,
          })
        )
        .sort(
          (first, second) =>
            second.views -
            first.views
        );

    return NextResponse.json({
      success: true,
      analytics: {
        totalViews30d:
          events.length,
        uniqueVisitors30d:
          uniqueVisitors.size,
        views7d,
        viewsToday,
        daily7d,
        topListings,
        sources,
      },
    });
  } catch (error) {
    console.error(
      "LISTING ANALYTICS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Objekt-Statistiken konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}