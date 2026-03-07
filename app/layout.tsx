import type { Metadata } from "next";
import "./globals.css";

import Footer from "@/app/components/Footer";

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

        <Footer />
      </body>
    </html>
  );
}
<header className="container-max py-6 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="badge">Makler</div>
    <div className="font-semibold text-lg">
      Helvetic Immobilien Capizzi
    </div>
  </div>

</header>