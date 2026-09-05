import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getInseratAiMarketFromHeaders } from "@/lib/inserat-ai-market";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import AppDialogProvider from "@/components/AppDialogProvider";
import CookieConsentBanner from "@/app/components/CookieConsentBanner";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import AppShell from "@/app/components/AppShell";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const market =
    getInseratAiMarketFromHeaders(requestHeaders) ??
    "CH";

  if (market === "DE") {
    return {
      title: "Inserat-AI Deutschland",
      description:
        "KI-gestützter Immobilien-Inserate-Generator für Immobilienprofis in Deutschland.",
    };
  }

  return {
    title: "Inserat-AI Schweiz",
    description:
      "KI-gestützter Immobilien-Inserate-Generator für Immobilienprofis in der Schweiz.",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050a1d",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <GoogleAnalytics />
        <NextIntlClientProvider>
          <AppDialogProvider>
            <AppShell>{children}</AppShell>
            <CookieConsentBanner />
          </AppDialogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
