"use client";

export type AnalyticsEventParameters =
  Record<string, unknown>;

type QueuedAnalyticsEvent = {
  eventName: string;
  parameters: AnalyticsEventParameters;
};

const CONSENT_STORAGE_KEY =
  "inserat_ai_analytics_consent_v1";

const QUEUE_STORAGE_KEY =
  "inserat_ai_ga4_queue_v1";
export function isAnalyticsAllowedHost(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname =
    window.location.hostname
      .trim()
      .toLowerCase();

  return (
    hostname === "inserat-ai.ch" ||
    hostname === "www.inserat-ai.ch"
  );
}
function hasAnalyticsConsent(): boolean {
  if (
    typeof window === "undefined" ||
    !isAnalyticsAllowedHost()
  ) {
    return false;
  }

  return (
    window.localStorage.getItem(
      CONSENT_STORAGE_KEY
    ) === "accepted"
  );
}

function readQueue(): QueuedAnalyticsEvent[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        QUEUE_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: QueuedAnalyticsEvent[]
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    if (queue.length === 0) {
      window.sessionStorage.removeItem(
        QUEUE_STORAGE_KEY
      );

      return;
    }

    window.sessionStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify(queue)
    );
  } catch {
    // Analytics darf die App niemals blockieren.
  }
}

function queueAnalyticsEvent(
  eventName: string,
  parameters: AnalyticsEventParameters
): void {
  const queue =
    readQueue();

  queue.push({
    eventName,
    parameters,
  });

  writeQueue(queue);
}

export function trackAnalyticsEvent(
  eventName: string,
  parameters:
    AnalyticsEventParameters = {}
): boolean {
  if (
    typeof window === "undefined"
  ) {
    return false;
  }

  if (!hasAnalyticsConsent()) {
    return false;
  }

  if (
    typeof window.gtag !==
      "function"
  ) {
    queueAnalyticsEvent(
      eventName,
      parameters
    );

    if (
      process.env.NODE_ENV ===
        "development"
    ) {
      console.info(
        "[GA4] Event vorgemerkt",
        {
          eventName,
          parameters,
        }
      );
    }

    return true;
  }

  window.gtag(
    "event",
    eventName,
    parameters
  );

  if (
    process.env.NODE_ENV ===
      "development"
  ) {
    console.info(
      "[GA4] Event gesendet",
      {
        eventName,
        parameters,
      }
    );
  }

  return true;
}

export function flushAnalyticsQueue(): void {
  if (
    typeof window === "undefined" ||
    !hasAnalyticsConsent() ||
    typeof window.gtag !==
      "function"
  ) {
    return;
  }

  const queue =
    readQueue();

  if (queue.length === 0) {
    return;
  }

  /*
   * Erst entfernen, danach senden.
   * So entstehen bei einem erneuten Flush
   * keine Doppelereignisse.
   */
  writeQueue([]);

  for (const event of queue) {
    window.gtag(
      "event",
      event.eventName,
      event.parameters
    );
  }

  if (
    process.env.NODE_ENV ===
      "development"
  ) {
    console.info(
      "[GA4] Warteschlange gesendet",
      {
        count: queue.length,
      }
    );
  }
}
