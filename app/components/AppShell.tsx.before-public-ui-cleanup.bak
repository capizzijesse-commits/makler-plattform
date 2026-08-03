"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import WhatsAppButton from "@/app/components/WhatsAppButton";
import GuideAssistant from "@/app/components/GuideAssistant";
import SupportActionDock from "@/app/components/SupportActionDock";
import FeedbackButton from "@/components/FeedbackButton";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const isExposePage =
    pathname === "/expose" ||
    pathname?.startsWith("/expose/");

  if (isExposePage) {
    return (
      <>
        <Navbar />
        {children}
        <WhatsAppButton />
        <FeedbackButton />
        <GuideAssistant />
        <SupportActionDock />
      </>
    );
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <WhatsAppButton />
      <FeedbackButton />
      <GuideAssistant />
      <SupportActionDock />
    </>
  );
}
