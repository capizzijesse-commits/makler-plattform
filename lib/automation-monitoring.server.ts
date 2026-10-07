import "server-only";

import { prisma } from "@/lib/prisma";

type MonitoringMetadata =
  Record<string, string | number | boolean | null>;

type StartRunInput = {
  userId?: string | null;
  listingId?: string | null;
  documentCount?: number;
  imageCount?: number;
  metadata?: MonitoringMetadata;
};

type RecordEventInput = {
  runId: string;
  stage: string;
  status:
    | "started"
    | "success"
    | "failed"
    | "skipped";
  durationMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: MonitoringMetadata;
};

type CompleteRunInput = {
  runId: string;
  status:
    | "ready"
    | "failed"
    | "abandoned";
  readyReached?: boolean;
  totalDurationMs?: number | null;
  imageCount?: number;
  detectedFieldCount?: number;
  missingRequiredCount?: number;
  manualCorrectionCount?: number;
  textEdited?: boolean;
  imageOrderChanged?: boolean;
  errorStage?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function normalizeErrorMessage(
  value: unknown
): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Error) {
    return value.message.slice(0, 1000);
  }

  return String(value).slice(0, 1000);
}

function monitoringError(
  operation: string,
  error: unknown
) {
  console.error(
    "[AUTOMATION_MONITORING_ERROR]",
    {
      operation,
      message: normalizeErrorMessage(error),
    }
  );
}

const MONITORING_TIMEOUT_MS = 500;

async function withMonitoringTimeout<T>(
  operation: string,
  promise: Promise<T>
): Promise<T> {
  let timeoutHandle:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeout =
    new Promise<never>((_, reject) => {
      timeoutHandle =
        setTimeout(() => {
          reject(
            new Error(
              `Monitoring timeout: ${operation}`
            )
          );
        }, MONITORING_TIMEOUT_MS);
    });

  try {
    return await Promise.race([
      promise,
      timeout,
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/*
 * Monitoring ist bewusst best-effort.
 *
 * Kein Fehler in diesem Modul darf den
 * eigentlichen Inserat-AI-Autopilot stoppen.
 */

export async function startAutomationMonitoringRun(
  input: StartRunInput
): Promise<string | null> {
  try {
    const run =
      await withMonitoringTimeout(
        "start_run",
        prisma.automationMonitoringRun.create({
          data: {
            userId: input.userId ?? null,
            listingId: input.listingId ?? null,
            documentCount:
              input.documentCount ?? 0,
            imageCount:
              input.imageCount ?? 0,
            metadata:
              input.metadata ?? undefined,
          },
          select: {
            id: true,
          },
        })
      );

    return run.id;
  } catch (error) {
    monitoringError(
      "start_run",
      error
    );

    return null;
  }
}

export async function recordAutomationMonitoringEvent(
  input: RecordEventInput
): Promise<void> {
  try {
    await withMonitoringTimeout(
      "record_event",
      prisma.automationMonitoringEvent.create({
        data: {
          runId: input.runId,
          stage: input.stage,
          status: input.status,
          durationMs:
            input.durationMs ?? null,
          errorCode:
            input.errorCode ?? null,
          errorMessage:
            input.errorMessage
              ? input.errorMessage.slice(0, 1000)
              : null,
          metadata:
            input.metadata ?? undefined,
        },
      })
    );
  } catch (error) {
    monitoringError(
      "record_event",
      error
    );
  }
}

export async function completeAutomationMonitoringRun(
  input: CompleteRunInput
): Promise<void> {
  try {
    await withMonitoringTimeout(
      "complete_run",
      prisma.automationMonitoringRun.update({
        where: {
          id: input.runId,
        },
        data: {
          status: input.status,
          readyReached:
            input.readyReached ??
            input.status === "ready",

          totalDurationMs:
            input.totalDurationMs ?? undefined,

          imageCount:
            input.imageCount ?? undefined,

          detectedFieldCount:
            input.detectedFieldCount ??
            undefined,

          missingRequiredCount:
            input.missingRequiredCount ??
            undefined,

          manualCorrectionCount:
            input.manualCorrectionCount ??
            undefined,

          textEdited:
            input.textEdited ?? undefined,

          imageOrderChanged:
            input.imageOrderChanged ??
            undefined,

          errorStage:
            input.errorStage ?? null,

          errorCode:
            input.errorCode ?? null,

          errorMessage:
            input.errorMessage
              ? input.errorMessage.slice(0, 1000)
              : null,

          completedAt: new Date(),
        },
      })
    );
  } catch (error) {
    monitoringError(
      "complete_run",
      error
    );
  }
}

export function getMonitoringErrorFields(
  error: unknown
): {
  errorCode: string | null;
  errorMessage: string | null;
} {
  if (
    typeof error === "object" &&
    error !== null
  ) {
    const maybeError =
      error as {
        code?: unknown;
        message?: unknown;
      };

    return {
      errorCode:
        typeof maybeError.code === "string"
          ? maybeError.code.slice(0, 200)
          : null,

      errorMessage:
        normalizeErrorMessage(
          maybeError.message ?? error
        ),
    };
  }

  return {
    errorCode: null,
    errorMessage:
      normalizeErrorMessage(error),
  };
}
