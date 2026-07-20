import "./globals.css";
import type { Metadata } from "next";
import AppDialogProvider from "@/components/AppDialogProvider";
import AppShell from "@/app/components/AppShell";

export const metadata: Metadata = {
  title: "Inserat-AI",
  description: "Immobilien-Inserate-Generator für die Schweiz",
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
