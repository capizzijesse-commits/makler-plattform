import type { Metadata } from "next";
import "./globals.css";

import Footer from "@/app/components/Footer";
import Script from "next/script";
export const metadata: Metadata = {
  title: "Makler Plattform",
  description: "Immobilien-Inserate Generator für die Schweiz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de-CH">
     <body>
  <div className="container-max py-5 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-3">
    </div>
  </div>

  {children}

  <Script
    src="https://www.googletagmanager.com/gtag/js?id=G-8BM9S2ZME5"
    strategy="afterInteractive"
  />

  <Script id="google-analytics" strategy="afterInteractive">
    {`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-8BM9S2ZME5');
    `}
  </Script>

  <Footer />
</body>
    </html>
  );
}
<header className="container-max py-6 flex items-center justify-between">

  <div className="flex items-center gap-3">
    <div className="badge">Makler</div>
    <div className="font-semibold text-lg">
      INSERAT AI
    </div>
  </div>

  <div className="flex items-center gap-4">

    <a href="/login" className="text-sm font-medium">
      Login
    </a>

    <a 
      href="/register"
      className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium"
    >
      Kostenlos testen
    </a>

  </div>

</header>