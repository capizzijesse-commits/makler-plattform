"use client";

import Script from "next/script";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {usePathname} from "next/navigation";
import {
  flushAnalyticsQueue,
  trackAnalyticsEvent,
} from "@/lib/analytics";

type ConsentChoice =
  | "accepted"
  | "rejected";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY =
  "inserat_ai_analytics_consent_v1";

const CONSENT_EVENT =
  "inserat-ai-analytics-consent";

export default function GoogleAnalytics() {
  const pathname = usePathname();

  const previousPath =
    useRef(pathname);

  const [enabled, setEnabled] =
    useState(false);

  const measurementId =
    process.env
      .NEXT_PUBLIC_GA_MEASUREMENT_ID
      ?.trim() ?? "";

  const hasValidMeasurementId =
    /^G-[A-Z0-9]+$/i.test(
      measurementId
    );

  useEffect(() => {
    setEnabled(
      window.localStorage.getItem(
        STORAGE_KEY
      ) === "accepted"
    );

    function handleConsent(
      event: Event
    ) {
      const choice =
        (
          event as CustomEvent<ConsentChoice>
        ).detail;

      setEnabled(
        choice === "accepted"
      );
    }

    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key !== STORAGE_KEY
      ) {
        return;
      }

      setEnabled(
        event.newValue === "accepted"
      );
    }

    window.addEventListener(
      CONSENT_EVENT,
      handleConsent
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        CONSENT_EVENT,
        handleConsent
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  useEffect(() => {
    if (
      !enabled ||
      !hasValidMeasurementId
    ) {
      return;
    }

    let attempts = 0;

    const interval =
      window.setInterval(() => {
        attempts += 1;

        if (
          typeof window.gtag ===
          "function"
        ) {
          flushAnalyticsQueue();

          window.clearInterval(
            interval
          );

          return;
        }

        if (attempts >= 50) {
          window.clearInterval(
            interval
          );
        }
      }, 100);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    enabled,
    hasValidMeasurementId,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      !hasValidMeasurementId
    ) {
      return;
    }

    if (
      previousPath.current ===
      pathname
    ) {
      return;
    }

    previousPath.current =
      pathname;

    trackAnalyticsEvent(
      "page_view",
      {
        page_path: pathname,
        page_location:
          window.location.href,
        page_title:
          document.title,
      }
    );
  }, [
    enabled,
    hasValidMeasurementId,
    pathname,
  ]);
useEffect(() => {
  if (
    !enabled ||
    !hasValidMeasurementId
  ) {
    return;
  }

  function handleRegisterClick(
    event: MouseEvent
  ) {
    const target =
      event.target instanceof Element
        ? event.target
        : null;

    if (!target) {
      return;
    }

    const link =
      target.closest<HTMLAnchorElement>(
        'a[href]'
      );

    if (!link) {
      return;
    }

    let url: URL;

    try {
      url = new URL(
        link.href,
        window.location.origin
      );
    } catch {
      return;
    }

    if (
      url.origin !==
        window.location.origin ||
      url.pathname !== "/register"
    ) {
      return;
    }

    const plan =
      url.searchParams.get("plan");

    const requestedPlan =
      plan === "founder" ||
      plan === "single-object"
        ? plan
        : "none";

    trackAnalyticsEvent(
      "register_cta_click",
      {
        cta_page:
          window.location.pathname,
        requested_plan:
          requestedPlan,
        cta_text:
          link.textContent
            ?.trim()
            .replace(/\s+/g, " ")
            .slice(0, 80) ||
          "unknown",
        transport_type: "beacon",
      }
    );
  }

  document.addEventListener(
    "click",
    handleRegisterClick,
    true
  );

  return () => {
    document.removeEventListener(
      "click",
      handleRegisterClick,
      true
    );
  };
}, [
  enabled,
  hasValidMeasurementId,
]);
  if (
    !enabled ||
    !hasValidMeasurementId
  ) {
    return null;
  }

  return (
    <>
      <Script
        id="inserat-ai-google-analytics-library"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />

      <Script
        id="inserat-ai-google-analytics-config"
        strategy="afterInteractive"
      >
        {`
          window.dataLayer =
            window.dataLayer || [];

          window.gtag =
            window.gtag ||
            function () {
              window.dataLayer.push(
                arguments
              );
            };

          window.gtag(
            "js",
            new Date()
          );

          window.gtag(
            "config",
            "${measurementId}",
            {
              send_page_view: true
            }
          );
        `}
      </Script>
    </>
  );
}
