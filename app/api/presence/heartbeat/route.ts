import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { recordUserActivityEvent } from "@/lib/user-activity.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HeartbeatBody = {
  currentPath?: unknown;
  pageView?: unknown;
};

function normalizePath(
  value: unknown
): string {
  if (
    typeof value !== "string"
  ) {
    return "/";
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return "/";
  }

  return trimmed.slice(
    0,
    500
  );
}

export async function POST(
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
            "Nicht angemeldet.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as
        HeartbeatBody;

    const currentPath =
      normalizePath(
        body.currentPath
      );

    const isPageView =
      body.pageView === true;

    const now =
      new Date();

    const presence =
      await prisma.userPresence.upsert({
        where: {
          userId:
            user.id,
        },
        create: {
          userId:
            user.id,
          currentPath,
          sessionStartedAt:
            now,
          lastSeenAt:
            now,
        },
        update: {
          currentPath,
          lastSeenAt:
            now,
        },
        select: {
          userId: true,
          currentPath: true,
          sessionStartedAt: true,
          lastSeenAt: true,
        },
      });

    if (isPageView) {
      await recordUserActivityEvent({
        userId:
          user.id,
        type:
          "page_view",
        path:
          currentPath,
      });
    }

    return NextResponse.json({
      success: true,
      presence,
    });
  } catch (error) {
    console.error(
      "PRESENCE HEARTBEAT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Presence konnte nicht aktualisiert werden.",
      },
      {
        status: 500,
      }
    );
  }
}
