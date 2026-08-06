import { createHash } from "node:crypto";

type UltraSpeedMemoryCacheEntry = {
  expiresAt: number;
  value: unknown;
};

type UltraSpeedGlobal = typeof globalThis & {
  __inseratAiUltraSpeedInFlight?: Map<
    string,
    Promise<unknown>
  >;

  __inseratAiUltraSpeedMemoryCache?: Map<
    string,
    UltraSpeedMemoryCacheEntry
  >;
};

export type UltraSpeedMetric = {
  key: string;
  namespace: string;
  cacheHit: boolean;
  deduplicated: boolean;
  durationMs: number;
};

export type UltraSpeedTaskResult<T> = {
  value: T;
  metric: UltraSpeedMetric;
};

export type UltraSpeedTaskOptions<T> = {
  key: string;
  namespace: string;
  task: () => Promise<T>;
  memoryTtlMs?: number;
  onMetric?: (
    metric: UltraSpeedMetric
  ) => void;
};

const ultraSpeedGlobal =
  globalThis as UltraSpeedGlobal;

const inFlightTasks =
  ultraSpeedGlobal
    .__inseratAiUltraSpeedInFlight ??
  new Map<string, Promise<unknown>>();

const memoryCache =
  ultraSpeedGlobal
    .__inseratAiUltraSpeedMemoryCache ??
  new Map<
    string,
    UltraSpeedMemoryCacheEntry
  >();

ultraSpeedGlobal
  .__inseratAiUltraSpeedInFlight =
  inFlightTasks;

ultraSpeedGlobal
  .__inseratAiUltraSpeedMemoryCache =
  memoryCache;

function normalizeForFingerprint(
  value: unknown
): unknown {
  if (value === null) {
    return null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(
      normalizeForFingerprint
    );
  }

  const record =
    value as Record<string, unknown>;

  const normalized:
    Record<string, unknown> = {};

  for (
    const key of Object.keys(record).sort()
  ) {
    const nextValue =
      normalizeForFingerprint(
        record[key]
      );

    if (nextValue !== undefined) {
      normalized[key] = nextValue;
    }
  }

  return normalized;
}

export function createUltraSpeedContentHash(
  content: string | Uint8Array
): string {
  return createHash("sha256")
    .update(content)
    .digest("hex");
}

export function createUltraSpeedFingerprint(
  input: {
    namespace: string;
    version: string;
    payload: unknown;
  }
): string {
  const normalizedPayload =
    normalizeForFingerprint(
      input.payload
    );

  const serializedPayload =
    JSON.stringify(
      normalizedPayload
    ) ?? "null";

  const hash =
    createUltraSpeedContentHash(
      serializedPayload
    );

  return [
    input.namespace,
    input.version,
    hash,
  ].join(":");
}

function readMemoryCache<T>(
  key: string
):
  | {
      hit: true;
      value: T;
    }
  | {
      hit: false;
    } {
  const entry =
    memoryCache.get(key);

  if (!entry) {
    return {
      hit: false,
    };
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);

    return {
      hit: false,
    };
  }

  return {
    hit: true,
    value: entry.value as T,
  };
}

function emitMetric(
  metric: UltraSpeedMetric,
  onMetric:
    | ((
        metric: UltraSpeedMetric
      ) => void)
    | undefined
) {
  onMetric?.(metric);
}

export async function runUltraSpeedTask<T>(
  options: UltraSpeedTaskOptions<T>
): Promise<UltraSpeedTaskResult<T>> {
  const startedAt = Date.now();

  const cached =
    readMemoryCache<T>(
      options.key
    );

  if (cached.hit) {
    const metric: UltraSpeedMetric = {
      key: options.key,
      namespace:
        options.namespace,
      cacheHit: true,
      deduplicated: false,
      durationMs:
        Date.now() - startedAt,
    };

    emitMetric(
      metric,
      options.onMetric
    );

    return {
      value: cached.value,
      metric,
    };
  }

  const existingTask =
    inFlightTasks.get(
      options.key
    ) as Promise<T> | undefined;

  if (existingTask) {
    const value =
      await existingTask;

    const metric: UltraSpeedMetric = {
      key: options.key,
      namespace:
        options.namespace,
      cacheHit: false,
      deduplicated: true,
      durationMs:
        Date.now() - startedAt,
    };

    emitMetric(
      metric,
      options.onMetric
    );

    return {
      value,
      metric,
    };
  }

  const taskPromise =
    Promise.resolve().then(
      options.task
    );

  inFlightTasks.set(
    options.key,
    taskPromise
  );

  try {
    const value =
      await taskPromise;

    const memoryTtlMs =
      Math.max(
        0,
        options.memoryTtlMs ?? 0
      );

    if (memoryTtlMs > 0) {
      memoryCache.set(
        options.key,
        {
          value,
          expiresAt:
            Date.now() +
            memoryTtlMs,
        }
      );
    }

    const metric: UltraSpeedMetric = {
      key: options.key,
      namespace:
        options.namespace,
      cacheHit: false,
      deduplicated: false,
      durationMs:
        Date.now() - startedAt,
    };

    emitMetric(
      metric,
      options.onMetric
    );

    return {
      value,
      metric,
    };
  } finally {
    if (
      inFlightTasks.get(
        options.key
      ) === taskPromise
    ) {
      inFlightTasks.delete(
        options.key
      );
    }
  }
}

export function invalidateUltraSpeedCache(
  keyPrefix?: string
): number {
  if (!keyPrefix) {
    const deletedCount =
      memoryCache.size;

    memoryCache.clear();

    return deletedCount;
  }

  let deletedCount = 0;

  for (
    const key of memoryCache.keys()
  ) {
    if (
      key.startsWith(keyPrefix)
    ) {
      memoryCache.delete(key);
      deletedCount += 1;
    }
  }

  return deletedCount;
}

export function getUltraSpeedStatus() {
  return {
    inFlightTasks:
      inFlightTasks.size,
    memoryCacheEntries:
      memoryCache.size,
  };
}