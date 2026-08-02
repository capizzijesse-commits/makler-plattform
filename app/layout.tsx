import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import AppDialogProvider from "@/components/AppDialogProvider";
import LanguageLaunchDialog from "@/app/components/LanguageLaunchDialog";
import CookieConsentBanner from "@/app/components/CookieConsentBanner";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import AppShell from "@/app/components/AppShell";

export const metadata: Metadata = {
  title: "Inserat-AI",
  description: "Immobilien-Inserate-Generator für die Schweiz",
};

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
            <LanguageLaunchDialog />
            <AppShell>{children}</AppShell>
            <CookieConsentBanner />
          </AppDialogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
