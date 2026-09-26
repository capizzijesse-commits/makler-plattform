"use client";

import { useEffect } from "react";

const LEGACY_NEW_LISTING_HREF = "/dashboard#new-listing";
const AUTOMATION_HREF = "/automation";

export default function AutomationNavigationBridge() {
  useEffect(() => {
    const upgradeLinks = () => {
      document
        .querySelectorAll<HTMLAnchorElement>(
          `a[href="${LEGACY_NEW_LISTING_HREF}"]`
        )
        .forEach((link) => {
          if (link.getAttribute("href") !== AUTOMATION_HREF) {
            link.setAttribute("href", AUTOMATION_HREF);
          }
        });
    };

    upgradeLinks();

    const observer = new MutationObserver(upgradeLinks);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
