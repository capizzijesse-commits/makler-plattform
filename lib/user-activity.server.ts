import "server-only";

import type {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

const ACTIVITY_TIMEOUT_MS =
  500;

type RecordActivityInput = {
  userId: string;
  type:
    | "login"
    | "page_view"
    | "automation_started"
    | "automation_ready"
    | "automation_failed";
  path?: string | null;
  metadata?:
    Prisma.InputJsonValue;
};

async function withTimeout<T>(
  promise: Promise<T>
): Promise<T> {
  let timeout:
    ReturnType<typeof setTimeout>;

  const timeoutPromise =
    new Promise<never>(
      (_, reject) => {
        timeout =
          setTimeout(
            () => {
              reject(
                new Error(
                  "User activity timeout"
                )
              );
            },
            ACTIVITY_TIMEOUT_MS
          );
      }
    );

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeout!);
  }
}

export async function recordUserActivityEvent(
  input: RecordActivityInput
): Promise<void> {
  try {
    await withTimeout(
      prisma.userActivityEvent.create({
        data: {
          userId:
            input.userId,
          type:
            input.type,
          path:
            input.path ?? null,
          metadata:
            input.metadata,
        },
      })
    );
  } catch (error) {
    /*
     * Aktivitäts-Tracking darf
     * niemals Login, Navigation
     * oder Automation blockieren.
     */
    console.error(
      "[USER ACTIVITY ERROR]",
      {
        userId:
          input.userId,
        type:
          input.type,
        error,
      }
    );
  }
}
