"use client";

import {
  useEffect,
} from "react";

import {
  usePathname,
} from "next/navigation";

const LAST_PAGE_VIEW_KEY =
  "inserat-ai:last-page-view";

export default function PresenceTracker() {
  const pathname =
    usePathname() || "/";

  useEffect(() => {
    let active = true;

    async function sendPresence(
      pageView: boolean
    ) {
      if (
        !active ||
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      try {
        await fetch(
          "/api/presence/heartbeat",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                currentPath:
                  pathname,
                pageView,
              }),
          }
        );
      } catch {
        /*
         * Presence darf niemals
         * Navigation oder Nutzung
         * blockieren.
         */
      }
    }

    /*
     * Nur einen echten neuen Pfad
     * dieses Browser-Tabs als
     * page_view speichern.
     *
     * Verhindert außerdem doppelte
     * Events durch React Strict Mode
     * / Development-Remounts.
     */
    const lastPageView =
      window.sessionStorage.getItem(
        LAST_PAGE_VIEW_KEY
      );

    const isNewPageView =
      lastPageView !== pathname;

    if (isNewPageView) {
      window.sessionStorage.setItem(
        LAST_PAGE_VIEW_KEY,
        pathname
      );
    }

    void sendPresence(
      isNewPageView
    );

    /*
     * Nur Online-Status aktualisieren.
     * Kein neues page_view.
     */
    const timer =
      window.setInterval(
        () => {
          void sendPresence(
            false
          );
        },
        20000
      );

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void sendPresence(
          false
        );
      }
    }

    function handleFocus() {
      void sendPresence(
        false
      );
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      active = false;

      window.clearInterval(
        timer
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [pathname]);

  return null;
}
