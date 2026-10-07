"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import WhatsAppButton from "@/app/components/WhatsAppButton";
import GuideAssistant from "@/app/components/GuideAssistant";
import MaklerCommunicationHub from "@/app/components/MaklerCommunicationHub";
import GlobalWorkspaceLauncher from "@/app/components/GlobalWorkspaceLauncher";
import SupportActionDock from "@/app/components/SupportActionDock";
import AutomationPublishOverlay from "@/app/components/AutomationPublishOverlay";
import MobileAppNav from "@/app/components/MobileAppNav";
import FeedbackButton from "@/components/FeedbackButton";
import PresenceTracker from "@/app/components/PresenceTracker";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname() || "/";

  // APPSHELL_DASHBOARD_REDIRECT_GATE_V1
  // Hide global workspace/support UI while /dashboard
  // resolves whether this account redirects to /automation.
  const [
    dashboardShellReady,
    setDashboardShellReady,
  ] = useState(false);

  useEffect(() => {
    if (pathname !== "/dashboard") {
      setDashboardShellReady(true);
      return;
    }

    let active = true;

    async function resolveDashboardShell() {
      try {
        const response =
          await fetch("/api/session", {
            credentials: "include",
            cache: "no-store",
          });

        if (!active) {
          return;
        }

        if (!response.ok) {
          setDashboardShellReady(true);
          return;
        }

        const data =
          await response.json();

        if (!active) {
          return;
        }

        const plan =
          String(
            data?.user?.plan ?? ""
          )
            .trim()
            .toLowerCase();

        const redirectsToAutomation =
          plan === "pro" ||
          plan === "agency" ||
          plan === "admin";

        if (!redirectsToAutomation) {
          setDashboardShellReady(true);
        }
      } catch {
        if (active) {
          setDashboardShellReady(true);
        }
      }
    }

    void resolveDashboardShell();

    return () => {
      active = false;
    };
  }, [pathname]);

  const isExposePage =
    pathname === "/expose" ||
    pathname.startsWith("/expose/");

  const isCockpitDetailPage =
    /^\/cockpit\/[^/]+$/.test(
      pathname
    );  const isMapPage =
    pathname === "/map" ||
    pathname.startsWith("/map/");

  const isWorkspacePage =
    pathname === "/cockpit" ||
    pathname === "/dashboard" ||
    pathname === "/dashboard/social-media" ||
    pathname === "/dashboard/analyse" ||
    pathname.startsWith("/marketing-hub") ||
    pathname.startsWith("/finanzierung") ||
    isCockpitDetailPage ||
    isMapPage;
  const showSupportTools =
    !isMapPage &&
    pathname !== "/automation" &&
    !pathname.startsWith("/automation/") &&
    (
      pathname !== "/dashboard" ||
      dashboardShellReady
    );

  return (
    <>
      <PresenceTracker />
      <Navbar />

      {children}

      {!isExposePage && !isWorkspacePage ? (
        <Footer />
      ) : null}

      {isWorkspacePage &&
      (
        pathname !== "/dashboard" ||
        dashboardShellReady
      ) ? (
        <>
          <GlobalWorkspaceLauncher />
          <MaklerCommunicationHub />
          <MobileAppNav />
        </>
      ) : null}

      {showSupportTools ? (
        <div className="iaSupportToolsShell">
          <WhatsAppButton />
          <FeedbackButton />
          <GuideAssistant />
          <AutomationPublishOverlay />
          <SupportActionDock />
        </div>
      ) : null}
    </>
  );
}