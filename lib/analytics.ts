"use client";

export type AnalyticsEventParameters =
  Record<string, unknown>;

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

  const analyticsWindow =
    window as Window & {
      gtag?: (
        ...args: unknown[]
      ) => void;
    };

  if (
    typeof analyticsWindow.gtag !==
      "function"
  ) {
    if (
      process.env.NODE_ENV ===
        "development"
    ) {
      console.info(
        "[GA4] Event nicht gesendet",
        {
          eventName,
          reason:
            "gtag noch nicht verfügbar",
          parameters,
        }
      );
    }

    return false;
  }

  analyticsWindow.gtag(
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
