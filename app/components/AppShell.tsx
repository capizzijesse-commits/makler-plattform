"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import WhatsAppButton from "@/app/components/WhatsAppButton";
import GuideAssistant from "@/app/components/GuideAssistant";
import MaklerCommunicationHub from "@/app/components/MaklerCommunicationHub";
import SupportActionDock from "@/app/components/SupportActionDock";
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
    );

  const isWorkspacePage =
    pathname === "/cockpit" ||
    pathname === "/dashboard" ||
    pathname === "/dashboard/social-media" ||
    pathname === "/dashboard/analyse" ||
    pathname.startsWith("/marketing-hub") ||
    pathname.startsWith("/finanzierung") ||
    isCockpitDetailPage;
  const showSupportTools = true;

  return (
    <>
      <Navbar />

      {children}

      {!isExposePage && !isWorkspacePage ? (
        <Footer />
      ) : null}

      {showSupportTools ? (
        <>
          <WhatsAppButton />
          <FeedbackButton />
          <GuideAssistant />
          <SupportActionDock />
          <MaklerCommunicationHub />
        </>
      ) : null}
    </>
  );
}