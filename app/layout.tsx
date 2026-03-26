import "./globals.css";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Makler Plattform",
  description: "Immobilien-Inserate Generator für die Schweiz",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de-CH">
      <body>
       <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}