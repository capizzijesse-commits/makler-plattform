import "./globals.css";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import type { Metadata } from "next";
import WhatsAppButton from "./components/WhatsAppButton";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: "Inserat-AI",
  description: "Immobilien-Inserate Generator für die Schweiz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        {children}
        <GoogleAnalytics gaId="G-8BM9S2ZME5" />
      </body>
    </html>
  );
}