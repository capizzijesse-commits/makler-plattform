"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import WhatsAppButton from "@/app/components/WhatsAppButton";
import GuideAssistant from "@/app/components/GuideAssistant";
import MaklerCommunicationHub from "@/app/components/MaklerCommunicationHub";
import GlobalWorkspaceLauncher from "@/app/components/GlobalWorkspaceLauncher";
import SupportActionDock from "@/app/components/SupportActionDock";
import MobileAppNav from "@/app/components/MobileAppNav";
import FeedbackButton from "@/components/FeedbackButton";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname() || "/";

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
    !isMapPage;

  return (
    <>
      <Navbar />

      {children}

      {!isExposePage && !isWorkspacePage ? (
        <Footer />
      ) : null}

      {isWorkspacePage ? (
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
          <SupportActionDock />
        </div>
      ) : null}
    </>
  );
}