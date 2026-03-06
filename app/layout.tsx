import type { Metadata } from "next";
import "./globals.css";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
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
        <header className="border-b" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="container-max py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="badge">Makler</div>
              <div className="font-semibold">Inserat Generator</div>
            </div>

            <ThemeSwitcher />
          </div>
        </header>

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

  <ThemeSwitcher />
</header>