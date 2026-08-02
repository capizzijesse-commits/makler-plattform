"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import PrivacyModeButton from "../../components/PrivacyModeButton";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

type SessionResponse = {
  success?: boolean;
  user?: {
    name?: string | null;
    email?: string;
    plan?: string;
  };
};

type SessionStatus =
  | "loading"
  | "authenticated"
  | "anonymous";

type MenuItem = {
  label: string;
  description: string;
  icon: string;
  href?: string;
  accent: string;
  comingSoon?: boolean;
  proOnly?: boolean;
};

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
  const t = useTranslations("Navbar");

  const menuItems: MenuItem[] = [
    {
      label: t("items.dashboard.label"),
      description: t("items.dashboard.description"),
      icon: "\u2728",
      href: "/dashboard",
      accent: "orange",
    },
    {
      label: t("items.projects.label"),
      description: t("items.projects.description"),
      icon: "\u{1F3E0}",
      href: "/cockpit",
      accent: "blue",
    },
    {
  label: t("items.marketingHub.label"),
  description: t("items.marketingHub.description"),
  icon: "📣",
  href: "/marketing-hub",
  accent: "gold",
},
    {
      label: t("items.about.label"),
      description: t("items.about.description"),
      icon: "\u{1F465}",
      href: "/ueber-uns",
      accent: "gold",
    },
    {
      label: t("items.account.label"),
      description: t("items.account.description"),
      icon: "\u{1F464}",
      href: "/konto",
      accent: "gold",
    },
    {
      label: t("items.social.label"),
      description: t("items.social.description"),
      icon: "\u{1F4F1}",
      href: "/dashboard/social-media",
      accent: "violet",
    },
    {
      label: t("items.tour.label"),
      description: t("items.tour.description"),
      icon: "\u{1F3AC}",
      href: "/dashboard/tour-guide",
      accent: "cyan",
      proOnly: true,
    },
    {
      label: t("items.publishing.label"),
      description: t("items.publishing.description"),
      icon: "\u{1F680}",
      accent: "green",
      proOnly: true,
      comingSoon: true,
    },
    {
      label: t("items.location.label"),
      description: t("items.location.description"),
      icon: "\u{1F4CD}",
      accent: "turquoise",
      proOnly: true,
      comingSoon: true,
    },
    {
      label: t("items.secretMarketing.label"),
      description: t("items.secretMarketing.description"),
      icon: "\u{1F512}",
      accent: "gold",
      proOnly: true,
      comingSoon: true,
    },
  ];

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userPlan, setUserPlan] = useState("free");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("loading");

 const isLoggedInArea =
  pathname?.startsWith("/dashboard") ||
  pathname?.startsWith("/cockpit") ||
  pathname?.startsWith("/marketing-hub") ||
  pathname?.startsWith("/expose") ||
  pathname?.startsWith("/konto");

  const moduleClass = getModuleClass(pathname);
  const planLabel = getPlanLabel(userPlan);

  const hasProAccess = [
    "pro",
    "agency",
    "admin",
  ].includes(
    userPlan.trim().toLowerCase()
  );

  const isAuthenticated =
    sessionStatus === "authenticated";

  const displayUserName =
    userName.trim() ||
    userEmail.trim() ||
    t("account.fallback");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setSessionStatus("loading");

      try {
        const response = await fetch("/api/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setSessionStatus("anonymous");
            setUserName("");
            setUserEmail("");
            setUserPlan("free");
          }

          return;
        }

        const data =
          (await response.json()) as SessionResponse;

        const sessionPlan =
          typeof data.user?.plan === "string"
            ? data.user.plan
            : "free";

        const sessionName =
          typeof data.user?.name === "string"
            ? data.user.name.trim()
            : "";

        const sessionEmail =
          typeof data.user?.email === "string"
            ? data.user.email.trim()
            : "";

        if (cancelled) {
          return;
        }

        setUserPlan(sessionPlan);
        setUserName(sessionName);
        setUserEmail(sessionEmail);
        setSessionStatus("authenticated");

        localStorage.setItem(
          "userPlan",
          sessionPlan
        );

        if (sessionName) {
          localStorage.setItem(
            "userName",
            sessionName
          );
        }

        if (sessionEmail) {
          localStorage.setItem(
            "userEmail",
            sessionEmail
          );
        }
      } catch (error) {
        console.warn(
          "SESSION KONNTE NICHT GELADEN WERDEN:",
          error
        );

        if (!cancelled) {
          setSessionStatus("anonymous");
          setUserName("");
          setUserEmail("");
          setUserPlan("free");
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

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
          data.error || t("logoutError")
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
          : t("logoutError")
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
            href={
              isLoggedInArea || isAuthenticated
                ? "/dashboard"
                : "/"
            }
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
<span
  aria-hidden={!isLoggedInArea}
  style={{
    display: "inline-flex",
    flex: "0 0 auto",
    visibility: isLoggedInArea
      ? "visible"
      : "hidden",
    pointerEvents: isLoggedInArea
      ? "auto"
      : "none",
  }}
>
  <PrivacyModeButton />
</span>

{/* ALWAYS_VISIBLE_ABOUT_LINK */}
<Link
  href="/ueber-uns"
  className="siteLoginLink"
>
  {t("items.about.label")}
</Link>

<LanguageSwitcher />

  {isLoggedInArea ? (
              
              <>
                <Link
                  href="/konto"
                  title={displayUserName}
                  aria-label={t("account.ariaLabel", {name: displayUserName})}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    minHeight: "40px",
                    maxWidth: "210px",
                    padding: "0 11px 0 7px",
                    border:
                      "1px solid rgba(251, 191, 36, 0.24)",
                    borderRadius: "13px",
                    background:
                      "rgba(15, 23, 42, 0.58)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 900,
                    textDecoration: "none",
                    boxShadow:
                      "0 8px 24px rgba(0, 0, 0, 0.14)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "grid",
                      placeItems: "center",
                      flex: "0 0 auto",
                      width: "28px",
                      height: "28px",
                      borderRadius: "9px",
                      background:
                        "linear-gradient(135deg, #fbbf24, #f97316)",
                      color: "#081126",
                      fontSize: "12px",
                      fontWeight: 950,
                    }}
                  >
                    {displayUserName
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayUserName}
                  </span>
                </Link>

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
                    {"\u2630"}
                  </span>

                  <span>{t("menuButton")}</span>
                </button>
              </>
            ) : sessionStatus === "loading" ? (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "280px",
                  height: "46px",
                  visibility: "hidden",
                }}
              />
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/konto"
                  className="siteLoginLink publicMobileLogin"
                  title={displayUserName}
                >
                  {displayUserName}
                </Link>

                <span className="appPlanBadge">
                  {planLabel}
                </span>

                <Link
                  href="/dashboard"
                  className="siteCtaButton publicMobileCta"
                >
                  <span className="siteCtaDesktopText">
                    {t("dashboardCta")}
                  </span>

                  <span className="siteCtaMobileText">
                    {t("dashboardShort")}
                  </span>

                  <span aria-hidden="true">{"\u2192"}</span>
                </Link>
              </>
            ) : (
              <>

                <Link
                  href="/login"
                  className="siteLoginLink publicMobileLogin"
                >
                  {t("login")}
                </Link>

                <Link
                  href="/register"
                  className="siteCtaButton publicMobileCta"
                >
                  <span className="siteCtaDesktopText">
                    {t("register")}
                  </span>

                  <span className="siteCtaMobileText">
                    {t("register")}
                  </span>

                  <span aria-hidden="true">{"\u2192"}</span>
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
            aria-label={t("closeMenu")}
          />

          <aside
            id="inserat-ai-app-menu"
            className="appMenuDrawer"
            aria-label={t("drawerLabel")}
          >
            <div className="appMenuHeader">
              <div>
                <span className="appMenuEyebrow">
                  INSERAT-AI
                </span>

                <h2>{t("workspaces")}</h2>
              </div>

              <button
                type="button"
                className="appMenuCloseButton"
                onClick={() => setMenuOpen(false)}
                aria-label={t("closeMenu")}
              >
                {"\u00D7"}
              </button>
            </div>

            <div className="appMenuPlanCard">
              <span>{t("currentPlan")}</span>
              <strong>{planLabel}</strong>

              {userPlan !== "pro" &&
                userPlan !== "agency" && (
                  <Link
                    href="/#preise"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    {t("upgradeToPro")}
                  </Link>
                )}
            </div>
<div className="appMenuPrivacyCard">
  <div className="appMenuPrivacyText">
    <strong>{t("privacyTitle")}</strong>
    <small>{t("privacyDescription")}</small>
  </div>

  <PrivacyModeButton />
</div>
            <nav className="appMenuLinks">
              {menuItems.map((item) => {
                const active = isMenuItemActive(
                  pathname,
                  item.href
                );

                const isProLocked =
                  Boolean(
                    item.proOnly &&
                    !hasProAccess
                  );

                /*
                 * Fertige Pro-Funktionen bleiben für Founder
                 * sichtbar und führen als Upgrade-Hinweis
                 * zur Preisübersicht.
                 */
                if (
                  isProLocked &&
                  item.href &&
                  !item.comingSoon
                ) {
                  return (
                    <Link
                      key={item.label}
                      href="/#preise"
                      className={`appMenuItem appMenuItem-${item.accent}`}
                      onClick={() =>
                        setMenuOpen(false)
                      }
                      aria-label={t("proOnlyAria", {label: item.label})}
                      style={{
                        border:
                          "1px solid rgba(167, 139, 250, 0.42)",
                        background:
                          "linear-gradient(135deg, rgba(30,41,59,.96), rgba(76,29,149,.34))",
                      }}
                    >
                      <span className="appMenuItemIcon">
                        {item.icon}
                      </span>

                      <span className="appMenuItemContent">
                        <strong>
                          {item.label}{" "}
                          <span aria-hidden="true">
                            {"\u{1F512}"}
                          </span>
                        </strong>

                        <small>
                          {item.description}
                          {" \u00B7 "}
                          {t("proOnly")}
                        </small>
                      </span>

                      <span className="appMenuSoon">
                        PRO
                      </span>
                    </Link>
                  );
                }

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
                          {item.proOnly
                            ? ` \u00B7 ${t("inDevelopment")}`
                            : ""}
                        </small>
                      </span>

                      <span className="appMenuSoon">
                        {item.proOnly
                          ? "PRO"
                          : t("soon")}
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
                      {"\u2192"}
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
                  ? t("loggingOut")
                  : t("logout")}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}