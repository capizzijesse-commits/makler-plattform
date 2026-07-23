import "./globals.css";
import type { Metadata, Viewport } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <AppDialogProvider>
          <AppShell>{children}</AppShell>
        </AppDialogProvider>
      </body>
    </html>
  );
}