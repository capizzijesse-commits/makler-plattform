"use client";

import {
  useEffect,
} from "react";

import {
  usePathname,
} from "next/navigation";

export default function PresenceTracker() {
  const pathname =
    usePathname() || "/";

  useEffect(() => {
    let active = true;

    async function heartbeat() {
      if (!active) {
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
              }),
          }
        );
      } catch {
        // Presence darf niemals
        // die App blockieren.
      }
    }

    void heartbeat();

    const timer =
      window.setInterval(
        () => {
          void heartbeat();
        },
        20000
      );

    return () => {
      active = false;
      window.clearInterval(
        timer
      );
    };
  }, [pathname]);

  return null;
}
