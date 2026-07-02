"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <header className="siteNavbar">
      <div className="siteNavbarInner">
        <Link href="/" className="siteBrand">
          <span className="siteBrandIcon" aria-hidden="true">
            <span className="siteBrandRoof" />
            <span className="siteBrandLine siteBrandLineOne" />
            <span className="siteBrandLine siteBrandLineTwo" />
            <span className="siteBrandLine siteBrandLineThree" />
          </span>

          <span className="siteBrandText">Inserat-AI</span>
        </Link>
<div className="siteNavCenter">
  <a href="/#demo">So funktioniert’s</a>
  <a href="/#pricing">Preise</a>
  <a href="/#benefits">Vorteile</a>
</div>
        <nav className="siteNavActions">
          {isDashboard ? (
            <>
              <Link href="/dashboard" className="siteLoginLink">
                Dashboard
              </Link>

              <Link href="/" className="siteLoginLink">
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="siteLoginLink">
                Login
              </Link>

              <Link href="/register" className="siteCtaButton">
                Kostenlos testen <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}