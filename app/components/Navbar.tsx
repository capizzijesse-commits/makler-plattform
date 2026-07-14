"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const isLoggedInArea =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/cockpit");

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Logout fehlgeschlagen.");
      }

      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userPlan");
      localStorage.removeItem("loginExpiresAt");

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout fehlgeschlagen:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Logout fehlgeschlagen."
      );

      setLoggingOut(false);
    }
  }

  return (
    <header className="siteNavbar">
      <div className="siteNavbarInner">
        <Link
          href={isLoggedInArea ? "/dashboard" : "/"}
          className="siteBrand"
        >
          <span className="siteBrandIcon" aria-hidden="true">
            <span className="siteBrandRoof" />
            <span className="siteBrandLine siteBrandLineOne" />
            <span className="siteBrandLine siteBrandLineTwo" />
            <span className="siteBrandLine siteBrandLineThree" />
          </span>

          <span className="siteBrandText">Inserat-AI</span>
        </Link>

        {!isLoggedInArea && (
          <div className="siteNavCenter">
            <a href="/#demo">So funktioniert&apos;s</a>
            <a href="/#pricing">Preise</a>
            <a href="/#benefits">Vorteile</a>
          </div>
        )}

        <nav className="siteNavActions">
          {isLoggedInArea ? (
            <>
              <Link href="/dashboard" className="siteLoginLink">
                Dashboard
              </Link>

              <Link href="/cockpit" className="siteLoginLink">
                Makler-Cockpit
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="siteLoginLink"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: loggingOut ? "wait" : "pointer",
                  font: "inherit",
                  opacity: loggingOut ? 0.65 : 1,
                }}
              >
                {loggingOut ? "Logout ..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="siteLoginLink">
                Login
              </Link>

              <Link href="/register" className="siteCtaButton">
                Kostenlos testen{" "}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
