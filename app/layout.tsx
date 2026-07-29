import "./globals.css";
import type {Metadata, Viewport} from "next";
import {GoogleAnalytics} from "@next/third-parties/google";
import {NextIntlClientProvider} from "next-intl";
import {getLocale} from "next-intl/server";
import AppDialogProvider from "@/components/AppDialogProvider";
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
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <AppDialogProvider>
            <AppShell>{children}</AppShell>
          </AppDialogProvider>
        </NextIntlClientProvider>
      </body>

      {gaMeasurementId ? (
        <GoogleAnalytics gaId={gaMeasurementId} />
      ) : null}
    </html>
  );
}