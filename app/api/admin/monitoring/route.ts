import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Monitoring ist nur für den Inserat-AI Operator freigeschaltet.",
        },
        {
          status: 403,
        }
      );
    }

    const now =
      new Date();

    const onlineCutoff =
      new Date(
        now.getTime() -
          90 * 1000
      );

    const todayStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

    const presence =
      await prisma.userPresence.findMany({
        orderBy: {
          lastSeenAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
              role: true,
            },
          },
        },
      });

    const onlineUsers =
      presence.filter(
        (entry) =>
          entry.lastSeenAt >=
          onlineCutoff
      );

    const activeToday =
      presence.filter(
        (entry) =>
          entry.lastSeenAt >=
          todayStart
      );

    const runs =
      await prisma.automationMonitoringRun.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        include: {
          events: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    const readyRuns =
      runs.filter(
        (run) =>
          run.status === "ready"
      );

    const failedRuns =
      runs.filter(
        (run) =>
          run.status === "failed"
      );

    const durations =
      readyRuns
        .map(
          (run) =>
            run.totalDurationMs
        )
        .filter(
          (
            value
          ): value is number =>
            typeof value ===
            "number"
        );

    const averageDurationMs =
      durations.length > 0
        ? Math.round(
            durations.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
              durations.length
          )
        : null;

    return NextResponse.json({
      success: true,
      summary: {
        totalRuns:
          runs.length,
        readyRuns:
          readyRuns.length,
        failedRuns:
          failedRuns.length,
        averageDurationMs,
        onlineUsers:
          onlineUsers.length,
        activeToday:
          activeToday.length,
      },
      presence: {
        online:
          onlineUsers,
        recent:
          presence.slice(
            0,
            50
          ),
      },
      runs,
    });
  } catch (error) {
    console.error(
      "ADMIN MONITORING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Monitoring-Daten konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}
