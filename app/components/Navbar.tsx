"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import PrivacyModeButton from "../../components/PrivacyModeButton";

type SessionResponse = {
  success?: boolean;
  user?: {
    plan?: string;
  };
};

type MenuItem = {
  label: string;
  description: string;
  icon: string;
  href?: string;
  accent: string;
  comingSoon?: boolean;
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    description: "Inserate und Bilder erstellen",
    icon: "✨",
    href: "/dashboard",
    accent: "orange",
  },
 {
  label: "Makler-Cockpit",
  description: "Objekte dauerhaft verwalten",
  icon: "🏠",
  href: "/cockpit",
  accent: "blue",
},
{
  label: "Mein Konto",
  description: "Kontaktdaten für Exposés verwalten",
  icon: "👤",
  href: "/konto",
  accent: "gold",
},
{
  label: "Social Media",
    description: "Beiträge pro Objekt vorbereiten",
    icon: "📱",
    href: "/dashboard/social-media",
    accent: "violet",
  },
  {
    label: "3D-Video-Tour",
    description: "Virtuelle Besichtigungen erstellen",
    icon: "🎬",
    href: "/dashboard/tour-guide",
    accent: "cyan",
  },
  {
    label: "Publishing-Center",
    description: "Veröffentlichungen zentral planen",
    icon: "🚀",
    accent: "green",
    comingSoon: true,
  },
  {
    label: "Standort-Assistent",
    description: "Schweizer Standortdaten ergänzen",
    icon: "📍",
    accent: "turquoise",
    comingSoon: true,
  },
  {
    label: "Secret Marketing",
    description: "Diskrete Immobilienvermarktung",
    icon: "🔒",
    accent: "gold",
    comingSoon: true,
  },
];

function getModuleClass(pathname: string | null): string {
  if (pathname?.startsWith("/dashboard/tour-guide")) {
    return "appNavModuleTour";
  }

  if (pathname?.startsWith("/dashboard/social-media")) {
    return "appNavModuleSocial";
  }

  if (pathname?.startsWith("/cockpit")) {
    return "appNavModuleCockpit";
  }

  return "appNavModuleDashboard";
}

function getPlanLabel(plan: string): string {
  switch (plan.toLowerCase()) {
    case "agency":
      return "AGENCY";
    case "pro":
      return "PRO";
    case "founder":
      return "FOUNDER";
    case "standard":
      return "STANDARD";
    default:
      return "FREE";
  }
}

function isMenuItemActive(
  pathname: string | null,
  href?: string
): boolean {
  if (!pathname || !href) {
    return false;
  }

  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userPlan, setUserPlan] = useState("free");

 const isLoggedInArea =
  pathname?.startsWith("/dashboard") ||
  pathname?.startsWith("/cockpit") ||
  pathname?.startsWith("/expose") ||
  pathname?.startsWith("/konto");

  const moduleClass = getModuleClass(pathname);
  const planLabel = getPlanLabel(userPlan);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoggedInArea) {
      return;
    }

    let cancelled = false;

    async function loadPlan() {
      const localPlan =
        localStorage.getItem("userPlan") || "free";

      setUserPlan(localPlan);

      try {
        const response = await fetch("/api/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as SessionResponse;

        const sessionPlan = data.user?.plan;

        if (
          !cancelled &&
          typeof sessionPlan === "string"
        ) {
          setUserPlan(sessionPlan);
          localStorage.setItem(
            "userPlan",
            sessionPlan
          );
        }
      } catch (error) {
        console.error(
          "PLAN KONNTE NICHT GELADEN WERDEN:",
          error
        );
      }
    }

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, [isLoggedInArea]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Logout fehlgeschlagen."
        );
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
    <>
      <header
        className={`siteNavbar appCentralNavbar ${moduleClass}`}
      >
        <div className="siteNavbarInner appCentralNavbarInner">
          <Link
            href={isLoggedInArea ? "/dashboard" : "/"}
            className="siteBrand"
          >
            <span
              className="siteBrandIcon"
              aria-hidden="true"
            >
              <span className="siteBrandRoof" />
              <span className="siteBrandLine siteBrandLineOne" />
              <span className="siteBrandLine siteBrandLineTwo" />
              <span className="siteBrandLine siteBrandLineThree" />
            </span>

            <span className="siteBrandText">
              Inserat-AI
            </span>
          </Link>

          <nav className="siteNavActions">
            <PrivacyModeButton />
            {isLoggedInArea ? (
              
              <>
                <span className="appPlanBadge">
                  {planLabel}
                </span>

                <button
                  type="button"
                  className="appMenuButton"
                  onClick={() =>
                    setMenuOpen((current) => !current)
                  }
                  aria-expanded={menuOpen}
                  aria-controls="inserat-ai-app-menu"
                >
                  <span
                    className="appMenuButtonIcon"
                    aria-hidden="true"
                  >
                    ☰
                  </span>

                  <span>Menü</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="siteLoginLink"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="siteCtaButton"
                >
                  Kostenlos testen
                  <span aria-hidden="true">→</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {isLoggedInArea && menuOpen && (
        <>
          <button
            type="button"
            className="appMenuOverlay"
            onClick={() => setMenuOpen(false)}
            aria-label="Menü schliessen"
          />

          <aside
            id="inserat-ai-app-menu"
            className="appMenuDrawer"
            aria-label="Inserat-AI Menü"
          >
            <div className="appMenuHeader">
              <div>
                <span className="appMenuEyebrow">
                  INSERAT-AI
                </span>

                <h2>Arbeitsbereiche</h2>
              </div>

              <button
                type="button"
                className="appMenuCloseButton"
                onClick={() => setMenuOpen(false)}
                aria-label="Menü schliessen"
              >
                ×
              </button>
            </div>

            <div className="appMenuPlanCard">
              <span>Aktueller Plan</span>
              <strong>{planLabel}</strong>

              {userPlan !== "pro" &&
                userPlan !== "agency" && (
                  <Link
                    href="/#pricing"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    Auf Pro wechseln →
                  </Link>
                )}
            </div>

            <nav className="appMenuLinks">
              {menuItems.map((item) => {
                const active = isMenuItemActive(
                  pathname,
                  item.href
                );

                if (
                  item.comingSoon ||
                  !item.href
                ) {
                  return (
                    <div
                      key={item.label}
                      className={`appMenuItem appMenuItem-${item.accent} appMenuItemDisabled`}
                      aria-disabled="true"
                    >
                      <span className="appMenuItemIcon">
                        {item.icon}
                      </span>

                      <span className="appMenuItemContent">
                        <strong>{item.label}</strong>
                        <small>
                          {item.description}
                        </small>
                      </span>

                      <span className="appMenuSoon">
                        Bald
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`appMenuItem appMenuItem-${item.accent} ${
                      active
                        ? "appMenuItemActive"
                        : ""
                    }`}
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    <span className="appMenuItemIcon">
                      {item.icon}
                    </span>

                    <span className="appMenuItemContent">
                      <strong>{item.label}</strong>
                      <small>
                        {item.description}
                      </small>
                    </span>

                    <span className="appMenuArrow">
                      →
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="appMenuFooter">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="appLogoutButton"
              >
                {loggingOut
                  ? "Abmeldung läuft ..."
                  : "Abmelden"}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}