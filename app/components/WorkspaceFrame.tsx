"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import AccountMenu from "./AccountMenu";
import MarketBadge from "./MarketBadge";
import { useLocale } from "next-intl";

import type {
  InseratAiMarket,
} from "@/lib/inserat-ai-market";

type WorkspaceSection =
  | "dashboard"
  | "objects"
  | "new"
  | "images"
  | "social"
  | "marketing"
  | "finance"
  | "settings";

type WorkspaceIconName =
  | "dashboard"
  | "objects"
  | "new"
  | "images"
  | "social"
  | "marketing"
  | "finance"
  | "settings"
  | "help";

type WorkspaceFrameProps = {
  children: ReactNode;
  market: InseratAiMarket;
  active: WorkspaceSection;
  title: string;
};

function WorkspaceIcon({
  name,
}: {
  name: WorkspaceIconName;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "dashboard" && (
        <>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9.5 20v-6h5v6" />
        </>
      )}

      {name === "objects" && (
        <>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
          />
          <path d="M8 8h8v8H8z" />
        </>
      )}

      {name === "new" && (
        <>
          <path d="M6 3.5h8l4 4V20H6z" />
          <path d="M14 3.5V8h4" />
          <path d="M12 11v6" />
          <path d="M9 14h6" />
        </>
      )}

      {name === "images" && (
        <>
          <rect
            x="3.5"
            y="4"
            width="17"
            height="16"
            rx="2"
          />
          <circle
            cx="9"
            cy="9"
            r="1.5"
          />
          <path d="m5.5 17 4-4 3 3 2-2 4 3" />
        </>
      )}

      {name === "social" && (
        <>
          <circle
            cx="6"
            cy="12"
            r="2.2"
          />
          <circle
            cx="18"
            cy="6"
            r="2.2"
          />
          <circle
            cx="18"
            cy="18"
            r="2.2"
          />
          <path d="m8 11 7.8-4" />
          <path d="m8 13 7.8 4" />
        </>
      )}

      {name === "marketing" && (
        <>
          <path d="M4 20V10" />
          <path d="M10 20V5" />
          <path d="M16 20v-7" />
          <path d="M22 20V3" />
        </>
      )}

      {name === "finance" && (
        <>
          <path d="M4 7h16" />
          <path d="M6 7V5h12v2" />
          <path d="M6 11h12" />
          <path d="M7 11v8" />
          <path d="M17 11v8" />
          <path d="M4 19h16" />
        </>
      )}
      {name === "settings" && (
        <>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <circle
            cx="16"
            cy="7"
            r="2"
          />
          <path d="M4 17h2" />
          <path d="M10 17h10" />
          <circle
            cx="8"
            cy="17"
            r="2"
          />
        </>
      )}

      {name === "help" && (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M9.8 9a2.4 2.4 0 0 1 4.6 1c0 2-2.4 2.2-2.4 4" />
          <path d="M12 17h.01" />
        </>
      )}
    </svg>
  );
}

export default function WorkspaceFrame({
  children,
  market,
  active,
  title,
}: WorkspaceFrameProps) {
  const locale =
    useLocale();

  const isGerman =
    locale === "de";

  const labels =
    locale === "it"
      ? {
          dashboard: "Dashboard",
          objects: "I miei immobili",
          newListing: "Nuovo annuncio",
          images: "Analizza immagini",
          social: "Social Media",
          marketing: "Marketing Hub",
          finance: "Finanziamento",
          settings: "Impostazioni",
          help: "Aiuto e supporto",
          workspace: "AREA DI LAVORO",
          account: "ACCOUNT",
        }
      : locale === "fr"
        ? {
            dashboard: "Tableau de bord",
            objects: "Mes biens",
            newListing: "Nouvelle annonce",
            images: "Analyser les images",
            social: "Réseaux sociaux",
            marketing: "Marketing Hub",
            finance: "Financement",
            settings: "Paramètres",
            help: "Aide et support",
            workspace: "ESPACE DE TRAVAIL",
            account: "COMPTE",
          }
        : locale === "en"
          ? {
              dashboard: "Dashboard",
              objects: "My properties",
              newListing: "New listing",
              images: "Analyze images",
              social: "Social Media",
              marketing: "Marketing Hub",
              finance: "Financing",
              settings: "Settings",
              help: "Help & Support",
              workspace: "WORKSPACE",
              account: "ACCOUNT",
            }
          : {
              dashboard: "Dashboard",
              objects: "Meine Objekte",
              newListing: "Neues Inserat",
              images: "Bilder analysieren",
              social: "Social Media",
              marketing: "Marketing Hub",
              finance: "Finanzierung",
              settings: "Einstellungen",
              help: "Hilfe & Support",
              workspace: "ARBEITSBEREICH",
              account: "KONTO",
            };
  const navItems = [
    {
      key: "dashboard" as const,
      icon: "dashboard" as const,
      label: labels.dashboard,
      href: "/dashboard",
    },
    {
      key: "objects" as const,
      icon: "objects" as const,
      label: labels.objects,
      href: "/cockpit#v2-objects",
    },
    {
      key: "new" as const,
      icon: "new" as const,
      label: labels.newListing,
      href: "/dashboard#new-listing",
    },
    {
      key: "images" as const,
      icon: "images" as const,
      label: labels.images,
      href: "/dashboard/analyse",
    },
    {
      key: "social" as const,
      icon: "social" as const,
      label: labels.social,
      href: "/dashboard/social-media",
    },
    {
      key: "marketing" as const,
      icon: "marketing" as const,
      label: labels.marketing,
      href: "/marketing-hub",
    },
    {
      key: "finance" as const,
      icon: "finance" as const,
      label: labels.finance,
      href: "/finanzierung",
    },
  ];

  return (
    <div className="iaWorkspace">
      <aside className="iaSidebar">
        <Link
          href="/"
          className="iaBrand"
        >
          <span className="iaBrandMark">
            <svg
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <path d="M4 15.5 16 4l12 11.5" />
              <path d="M8 14v13" />
              <path d="M24 14v13" />
              <path d="M11 27h10" />
              <path d="M10 19h12" />
            </svg>
          </span>

          <span className="iaBrandCopy">
            <strong>
              Inserat-AI
            </strong>
          </span>
        </Link>

        <div className="iaNavGroupLabel">
          {labels.workspace}
        </div>

        <nav className="iaNav">
          {navItems.map(
            (item) => (
              <Link
                key={item.key}
                href={item.href}
                className={
                  active === item.key
                    ? "iaNavItem active"
                    : "iaNavItem"
                }
              >
                <span className="iaNavIcon">
                  <WorkspaceIcon
                    name={item.icon}
                  />
                </span>

                <span>
                  {item.label}
                </span>
              </Link>
            )
          )}
        </nav>

        <div className="iaSidebarBottom">
          <div className="iaNavGroupLabel">
            {labels.account}
          </div>

          <Link
            href="/konto"
            className={
              active === "settings"
                ? "iaNavItem active"
                : "iaNavItem"
            }
          >
            <span className="iaNavIcon">
              <WorkspaceIcon
                name="settings"
              />
            </span>

            <span>
              {labels.settings}
            </span>
          </Link>

          <Link
            href="/kontakt"
            className="iaNavItem"
          >
            <span className="iaNavIcon">
              <WorkspaceIcon
                name="help"
              />
            </span>

            <span>
              {labels.help}
            </span>
          </Link>

          <AccountMenu
            subtitle={
              isGerman
                ? "Makler-Account"
                : "Professional"
            }
          />
        </div>
      </aside>

      <div className="iaWorkspaceMain">
        <header className="iaWorkspaceTopbar" data-workspace-section={active}>
          <div className="iaWorkspaceTitle">
            <small>
              INSERAT-AI
            </small>

            <strong>
              {title}
            </strong>
          </div>

          <div className="iaWorkspaceTopActions">
            <div className="iaMarketPill">
              <MarketBadge
                market={market}
              />
            </div>

            <span className="iaTopAvatar">
              IA
            </span>
          </div>
        </header>

        <div className="iaWorkspaceContent">
          {children}
        </div>
      </div>

      <style jsx>{`
        .iaWorkspace {
          min-height: 100vh;
          background: #eef3f9;
          color: #0f172a;
        }

        .iaSidebar {
          position: fixed;
          z-index: 80;
          inset: 0 auto 0 0;
          display: flex;
          width: 224px;
          flex-direction: column;
          padding: 18px 12px 16px;
          overflow-y: auto;
          border-right:
            1px solid rgba(148,163,184,.09);
          background:
            linear-gradient(
              180deg,
              #06162c 0%,
              #07192f 52%,
              #041224 100%
            );
          box-shadow:
            10px 0 34px
            rgba(15,23,42,.10);
        }

        .iaBrand {
          display: flex;
          min-height: 63px;
          align-items: center;
          gap: 11px;
          margin: 0 3px 18px;
          padding: 5px 7px 15px;
          border-bottom:
            1px solid rgba(255,255,255,.075);
          color: white;
          text-decoration: none;
        }

        .iaBrandMark {
          display: grid;
          width: 39px;
          height: 39px;
          place-items: center;
          flex: 0 0 39px;
          color: #fbbf24;
        }

        .iaBrandMark svg {
          width: 38px;
          height: 38px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .iaBrandCopy {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .iaBrandCopy strong {
          color: white;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -.025em;
        }

        .iaBrandCopy small {
          margin-top: 5px;
          color: #8fa4bd;
          font-size: 9px;
          font-weight: 800;
        }

        .iaNavGroupLabel {
          margin: 0 11px 8px;
          color: #526d89;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .17em;
        }

        .iaNav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .iaNavItem {
          position: relative;
          display: flex;
          min-height: 42px;
          align-items: center;
          gap: 10px;
          padding: 0 11px;
          border:
            1px solid transparent;
          border-radius: 9px;
          color: #bac8d8;
          font-size: 11px;
          font-weight: 750;
          text-decoration: none;
          transition:
            color 160ms ease,
            background 160ms ease;
        }

        .iaNavItem:hover {
          background:
            rgba(66,109,154,.12);
          color: #f8fafc;
        }

        .iaNavItem.active {
          background:
            linear-gradient(
              90deg,
              rgba(25,63,104,.96),
              rgba(13,44,76,.78)
            );
          color: white;
          box-shadow:
            0 7px 18px
            rgba(0,0,0,.12);
        }

        .iaNavItem.active::before {
          position: absolute;
          top: 9px;
          bottom: 9px;
          left: 0;
          width: 3px;
          border-radius: 999px;
          background:
            linear-gradient(
              180deg,
              #fcd34d,
              #f59e0b
            );
          content: "";
          box-shadow:
            0 0 12px
            rgba(251,191,36,.38);
        }

        .iaNavIcon {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          flex: 0 0 28px;
          border-radius: 8px;
          background:
            rgba(116,145,173,.07);
          color: #86a0ba;
        }

        .iaNavIcon svg {
          width: 17px;
          height: 17px;
        }

        .iaNavItem.active
        .iaNavIcon {
          background:
            linear-gradient(
              135deg,
              rgba(251,191,36,.22),
              rgba(245,158,11,.10)
            );
          color: #fbbf24;
          box-shadow:
            0 0 0 1px
            rgba(251,191,36,.18);
        }

        .iaSidebarBottom {
          display: flex;
          margin-top: auto;
          flex-direction: column;
          gap: 3px;
          padding-top: 13px;
          border-top:
            1px solid rgba(255,255,255,.07);
        }

        .iaSidebarBottom
        .iaNavGroupLabel {
          margin-top: 2px;
        }

        .iaAccountCard {
          display: flex;
          min-height: 58px;
          align-items: center;
          gap: 9px;
          margin-top: 10px;
          padding: 9px;
          border:
            1px solid rgba(148,163,184,.09);
          border-radius: 10px;
          background:
            rgba(255,255,255,.028);
        }

        .iaAvatar,
        .iaTopAvatar {
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #6280a9,
              #344d73
            );
          color: white;
          font-size: 10px;
          font-weight: 900;
        }

        .iaAvatar {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
        }

        .iaAccountCard > span:last-child {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .iaAccountCard strong {
          color: #f8fafc;
          font-size: 9px;
        }

        .iaAccountCard small {
          margin-top: 3px;
          color: #687f99;
          font-size: 7px;
        }

        .iaWorkspaceMain {
          min-height: 100vh;
          margin-left: 224px;
        }

        .iaWorkspaceTopbar {
          position: sticky;
          z-index: 60;
          top: 0;
          display: flex;
          min-height: 72px;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 11px 24px;
          border-bottom:
            1px solid #dce5f0;
          background:
            rgba(247,250,253,.94);
          backdrop-filter:
            blur(18px);
        }

        .iaWorkspaceTitle {
          display: flex;
          flex-direction: column;
        }

        .iaWorkspaceTitle small {
          color: #94a3b8;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        .iaWorkspaceTitle strong {
          margin-top: 3px;
          color: #142033;
          font-size: 15px;
          font-weight: 900;
        }

        .iaWorkspaceTopActions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .iaMarketPill {
          display: flex;
          min-height: 40px;
          align-items: center;
          gap: 7px;
          padding: 0 11px;
          border: 1px solid #d6e0eb;
          border-radius: 11px;
          background: white;
        }

        .iaMarketPill strong {
          font-size: 11px;
        }

        .iaTopAvatar {
          width: 38px;
          height: 38px;
        }

        .iaWorkspaceContent {
          padding: 18px;
        }

        @media (max-width: 900px) {
          .iaSidebar {
            position: relative;
            width: 100%;
            min-height: auto;
          }

          .iaWorkspaceMain {
            margin-left: 0;
          }

          .iaNav {
            display: grid;
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }

          .iaSidebarBottom {
            display: none;
          }

          .iaWorkspaceTopbar {
            position: relative;
          }
        }

        @media (max-width: 650px) {
          .iaNav {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .iaWorkspaceContent {
            padding: 10px;
          }

          .iaMarketPill {
            display: flex !important;
            min-height: 36px !important;
            padding: 0 8px !important;
            border-radius: 10px !important;
          }
        }

        /* ======================================
           INSERAT-AI PREMIUM LIGHT HEADER
           ====================================== */

        .iaWorkspaceTopbar {
          position: sticky !important;
          z-index: 60 !important;
          top: 0 !important;

          min-height: 84px !important;
          padding:
            14px 24px !important;

          border-bottom:
            1px solid
            rgba(203,213,225,.78) !important;

          background:
            radial-gradient(
              circle at 9% 0%,
              rgba(59,130,246,.075),
              transparent 32%
            ),
            radial-gradient(
              circle at 78% 100%,
              rgba(251,191,36,.045),
              transparent 24%
            ),
            linear-gradient(
              180deg,
              rgba(247,250,253,.98) 0%,
              rgba(242,247,252,.98) 55%,
              rgba(238,244,250,.98) 100%
            ) !important;

          box-shadow:
            0 5px 18px
            rgba(15,23,42,.035) !important;

          backdrop-filter:
            blur(18px) !important;
        }


        .iaWorkspaceTopbar::after {
          position: absolute;
          right: 0;
          bottom: -1px;
          left: 0;
          height: 1px;
          pointer-events: none;

          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(37,99,235,.18) 18%,
              rgba(37,99,235,.28) 42%,
              rgba(251,191,36,.30) 70%,
              transparent 100%
            );

          content: "";
        }


        .iaWorkspaceTitle {
          position: relative;
          padding-left: 13px;
        }


        .iaWorkspaceTitle::before {
          position: absolute;
          top: 3px;
          bottom: 3px;
          left: 0;
          width: 3px;

          border-radius: 999px;

          background:
            linear-gradient(
              180deg,
              #fcd34d,
              #f59e0b
            );

          box-shadow:
            0 0 12px
            rgba(251,191,36,.22);

          content: "";
        }


        .iaWorkspaceTitle small {
          color:
            #7890aa !important;

          font-size:
            7px !important;

          font-weight:
            900 !important;

          letter-spacing:
            .18em !important;
        }


        .iaWorkspaceTitle strong {
          margin-top:
            4px !important;

          color:
            #10213a !important;

          font-size:
            16px !important;

          font-weight:
            900 !important;

          letter-spacing:
            -.025em !important;
        }


        .iaWorkspaceTopActions {
          gap:
            11px !important;
        }


        .iaMarketPill {
          min-height:
            42px !important;

          gap:
            8px !important;

          padding:
            0 13px !important;

          border:
            1px solid
            #d7e1eb !important;

          border-radius:
            12px !important;

          background:
            rgba(255,255,255,.92) !important;

          box-shadow:
            0 7px 18px
            rgba(15,23,42,.045) !important;
        }


        .iaMarketDot {
          display: block;
          width: 7px;
          height: 7px;

          border-radius:
            50%;

          background:
            linear-gradient(
              135deg,
              #fcd34d,
              #f59e0b
            );

          box-shadow:
            0 0 0 3px
            rgba(251,191,36,.10);
        }


        .iaMarketPill strong {
          color:
            #10213a !important;

          font-size:
            11px !important;

          font-weight:
            900 !important;

          letter-spacing:
            .04em;
        }


        .iaTopAvatar {
          width:
            42px !important;

          height:
            42px !important;

          border:
            1px solid
            rgba(255,255,255,.65);

          background:
            linear-gradient(
              145deg,
              #53749d,
              #2d4b73
            ) !important;

          box-shadow:
            0 8px 20px
            rgba(35,65,105,.16);
        }

        /* ======================================
           SIDEBAR TEXT COLOR LOCK
           prevents dashboard CSS collisions
           ====================================== */

        .iaWorkspace
        .iaSidebar
        .iaNavItem {
          color:
            #b9c8d9 !important;

          -webkit-text-fill-color:
            #b9c8d9 !important;

          opacity:
            1 !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaNavItem
        > span:not(.iaNavIcon) {
          color:
            inherit !important;

          -webkit-text-fill-color:
            currentColor !important;

          opacity:
            1 !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaNavItem:hover {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;

          background:
            rgba(58,92,132,.20) !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaNavItem.active {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;

          border-color:
            rgba(89,132,179,.13) !important;

          background:
            linear-gradient(
              90deg,
              rgba(26,63,103,.98) 0%,
              rgba(14,43,75,.90) 100%
            ) !important;

          box-shadow:
            0 8px 20px
            rgba(0,0,0,.14) !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaNavItem.active
        > span:not(.iaNavIcon) {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaNavIcon {
          color:
            #8ca6c0 !important;

          -webkit-text-fill-color:
            #8ca6c0 !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaNavItem.active
        .iaNavIcon {
          color:
            #fbbf24 !important;

          -webkit-text-fill-color:
            #fbbf24 !important;

          background:
            linear-gradient(
              135deg,
              rgba(251,191,36,.22),
              rgba(245,158,11,.09)
            ) !important;

          box-shadow:
            0 0 0 1px
            rgba(251,191,36,.16) !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaNavGroupLabel {
          color:
            #667f9b !important;

          -webkit-text-fill-color:
            #667f9b !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaBrandCopy strong {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;
        }


        .iaWorkspace
        .iaSidebar
        .iaBrandCopy small {
          color:
            #90a5bc !important;

          -webkit-text-fill-color:
            #90a5bc !important;
        }

        /* ======================================
           INSERAT-AI NAVY TOPBAR V3
           ====================================== */

        .iaWorkspaceTopbar {
          border-bottom:
            1px solid
            rgba(148,163,184,.12) !important;

          background:
            radial-gradient(
              circle at 82% 18%,
              rgba(59,130,246,.12),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #08192f 0%,
              #0a1d36 55%,
              #0c213d 100%
            ) !important;

          box-shadow:
            0 8px 24px
            rgba(2,6,23,.16) !important;
        }


        .iaWorkspaceTopbar::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(59,130,246,.20) 26%,
              rgba(251,191,36,.32) 70%,
              transparent 100%
            ) !important;
        }


        .iaWorkspaceTitle small {
          color:
            #7f9ab6 !important;
        }


        .iaWorkspaceTitle strong {
          color:
            #ffffff !important;
        }


        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #fcd34d,
              #f59e0b
            ) !important;

          box-shadow:
            0 0 14px
            rgba(251,191,36,.28) !important;
        }


        .iaMarketPill {
          border:
            1px solid
            rgba(255,255,255,.16) !important;

          background:
            rgba(255,255,255,.96) !important;

          box-shadow:
            0 8px 20px
            rgba(2,6,23,.22) !important;
        }


        .iaMarketPill strong {
          color:
            #10213a !important;
        }


        .iaTopAvatar {
          border:
            1px solid
            rgba(148,163,184,.24) !important;

          background:
            linear-gradient(
              145deg,
              #4f6f96,
              #2b4668
            ) !important;

          box-shadow:
            0 8px 22px
            rgba(2,6,23,.28) !important;
        }
      `}</style>

      <style jsx global>{`
        /* ======================================
           GLOBAL SIDEBAR COLOR LOCK V2
           ====================================== */

        html body
        .iaWorkspace
        .iaSidebar
        a.iaNavItem {
          color:
            #b8c8d9 !important;

          -webkit-text-fill-color:
            #b8c8d9 !important;

          opacity:
            1 !important;

          text-decoration:
            none !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        a.iaNavItem
        > span:not(.iaNavIcon) {
          color:
            #b8c8d9 !important;

          -webkit-text-fill-color:
            #b8c8d9 !important;

          opacity:
            1 !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        a.iaNavItem:hover {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;

          background:
            rgba(48,84,123,.22) !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        a.iaNavItem:hover
        > span:not(.iaNavIcon) {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        a.iaNavItem.active {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;

          background:
            linear-gradient(
              90deg,
              rgba(30,69,111,.98) 0%,
              rgba(16,48,82,.94) 100%
            ) !important;

          border-color:
            rgba(92,132,176,.16) !important;

          box-shadow:
            0 8px 20px
            rgba(0,0,0,.14) !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        a.iaNavItem.active
        > span:not(.iaNavIcon) {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;

          font-weight:
            800 !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        .iaNavIcon {
          color:
            #8ea8c2 !important;

          -webkit-text-fill-color:
            #8ea8c2 !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        a.iaNavItem.active
        .iaNavIcon {
          color:
            #fbbf24 !important;

          -webkit-text-fill-color:
            #fbbf24 !important;

          background:
            linear-gradient(
              135deg,
              rgba(251,191,36,.22),
              rgba(245,158,11,.09)
            ) !important;

          box-shadow:
            0 0 0 1px
            rgba(251,191,36,.18) !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        .iaNavGroupLabel {
          color:
            #66819d !important;

          -webkit-text-fill-color:
            #66819d !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        .iaBrandCopy strong {
          color:
            #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;
        }


        html body
        .iaWorkspace
        .iaSidebar
        .iaBrandCopy small {
          color:
            #91a6bd !important;

          -webkit-text-fill-color:
            #91a6bd !important;
        }

        /* ======================================
           INSERAT-AI NAVY TOPBAR V3
           ====================================== */

        .iaWorkspaceTopbar {
          border-bottom:
            1px solid
            rgba(148,163,184,.12) !important;

          background:
            radial-gradient(
              circle at 82% 18%,
              rgba(59,130,246,.12),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #08192f 0%,
              #0a1d36 55%,
              #0c213d 100%
            ) !important;

          box-shadow:
            0 8px 24px
            rgba(2,6,23,.16) !important;
        }


        .iaWorkspaceTopbar::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(59,130,246,.20) 26%,
              rgba(251,191,36,.32) 70%,
              transparent 100%
            ) !important;
        }


        .iaWorkspaceTitle small {
          color:
            #7f9ab6 !important;
        }


        .iaWorkspaceTitle strong {
          color:
            #ffffff !important;
        }


        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #fcd34d,
              #f59e0b
            ) !important;

          box-shadow:
            0 0 14px
            rgba(251,191,36,.28) !important;
        }


        .iaMarketPill {
          border:
            1px solid
            rgba(255,255,255,.16) !important;

          background:
            rgba(255,255,255,.96) !important;

          box-shadow:
            0 8px 20px
            rgba(2,6,23,.22) !important;
        }


        .iaMarketPill strong {
          color:
            #10213a !important;
        }


        .iaTopAvatar {
          border:
            1px solid
            rgba(148,163,184,.24) !important;

          background:
            linear-gradient(
              145deg,
              #4f6f96,
              #2b4668
            ) !important;

          box-shadow:
            0 8px 22px
            rgba(2,6,23,.28) !important;
        }

        /* =============================================
           INSERAT-AI WORKSPACE HARMONY V4
           ============================================= */

        .iaWorkspaceTopbar {
          background:
            radial-gradient(
              circle at 82% 0%,
              rgba(59,130,246,.10),
              transparent 34%
            ),
            linear-gradient(
              180deg,
              #06182c 0%,
              #071b32 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(148,163,184,.10) !important;

          box-shadow:
            none !important;
        }


        /*
         * Die Flächen unterhalb des Headers
         * bekommen dieselbe Navy-Familie.
         * Dadurch verschwinden die hellen
         * Trennstreifen zwischen Header und App.
         */

        .iaWorkspaceMain,
        .iaWorkspaceContent,
        .iaWorkspaceBody,
        .iaWorkspaceStage {
          background:
            #071a2f !important;
        }


        .iaWorkspaceTopbar::after {
          opacity:
            .55 !important;
        }

        /* =============================================
           SOCIAL MEDIA WORKSPACE ACCENT V1
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="social"] {
          background:
            radial-gradient(
              circle at 82% 18%,
              rgba(129,140,248,.22),
              transparent 28%
            ),
            radial-gradient(
              circle at 58% 120%,
              rgba(59,130,246,.14),
              transparent 38%
            ),
            linear-gradient(
              105deg,
              #06182c 0%,
              #0b2345 42%,
              #172554 72%,
              #312e81 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(129,140,248,.18) !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="social"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(59,130,246,.18) 30%,
              rgba(129,140,248,.34) 62%,
              rgba(251,191,36,.28) 82%,
              transparent 100%
            ) !important;

          opacity:
            .72 !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="social"]
        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #fde68a 0%,
              #f59e0b 100%
            ) !important;

          box-shadow:
            0 0 16px
            rgba(245,158,11,.30) !important;
        }

        /* =============================================
           DASHBOARD WORKSPACE ACCENT V1
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="dashboard"] {
          background:
            radial-gradient(
              circle at 82% 18%,
              rgba(56,189,248,.16),
              transparent 30%
            ),
            radial-gradient(
              circle at 58% 120%,
              rgba(37,99,235,.16),
              transparent 38%
            ),
            linear-gradient(
              105deg,
              #06182c 0%,
              #08213e 38%,
              #0c3158 68%,
              #124d7c 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(96,165,250,.18) !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="dashboard"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(37,99,235,.18) 30%,
              rgba(56,189,248,.30) 68%,
              rgba(251,191,36,.28) 84%,
              transparent 100%
            ) !important;

          opacity:
            .70 !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="dashboard"]
        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #fde68a 0%,
              #f59e0b 100%
            ) !important;

          box-shadow:
            0 0 16px
            rgba(245,158,11,.28) !important;
        }

        /* =============================================
           DASHBOARD WORKSPACE ACCENT V2
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="dashboard"] {
          background:
            radial-gradient(
              circle at 84% 20%,
              rgba(245,158,11,.24),
              transparent 28%
            ),
            radial-gradient(
              circle at 62% 120%,
              rgba(217,119,6,.10),
              transparent 36%
            ),
            linear-gradient(
              105deg,
              #06182c 0%,
              #0a2137 42%,
              #173248 72%,
              #4a3822 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(245,158,11,.22) !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="dashboard"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(245,158,11,.10) 34%,
              rgba(251,191,36,.34) 72%,
              rgba(249,115,22,.18) 88%,
              transparent 100%
            ) !important;

          opacity:
            .78 !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="dashboard"]
        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #fde68a 0%,
              #f59e0b 100%
            ) !important;

          box-shadow:
            0 0 18px
            rgba(245,158,11,.34) !important;
        }

        /* =============================================
           DASHBOARD WORKSPACE ACCENT V3
           GOLD BIS ZUR MITTE
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="dashboard"] {
          background:
            radial-gradient(
              circle at 76% 50%,
              rgba(245,158,11,.22),
              transparent 48%
            ),
            linear-gradient(
              90deg,
              #06182c 0%,
              #081d33 34%,
              #152b39 49%,
              #3b3526 64%,
              #62471d 82%,
              #73521c 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(245,158,11,.24) !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="dashboard"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              transparent 38%,
              rgba(251,191,36,.10) 50%,
              rgba(251,191,36,.30) 72%,
              rgba(245,158,11,.34) 100%
            ) !important;

          opacity:
            .78 !important;
        }

        /* =============================================
           DASHBOARD WORKSPACE ACCENT V4
           CLEAN PREMIUM GOLD
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="dashboard"] {
          background:
            radial-gradient(
              circle at 76% 50%,
              rgba(251,191,36,.24),
              transparent 44%
            ),
            linear-gradient(
              90deg,
              #06182c 0%,
              #081d33 34%,
              #102839 48%,
              #3a321d 60%,
              #6b4a12 78%,
              #9a6708 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(251,191,36,.26) !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="dashboard"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              transparent 36%,
              rgba(251,191,36,.08) 50%,
              rgba(251,191,36,.24) 68%,
              rgba(245,158,11,.34) 84%,
              rgba(251,191,36,.38) 100%
            ) !important;

          opacity:
            .84 !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="dashboard"]
        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #fde68a 0%,
              #fbbf24 45%,
              #f59e0b 100%
            ) !important;

          box-shadow:
            0 0 18px
            rgba(251,191,36,.34) !important;
        }

        /* =============================================
           IMAGES WORKSPACE ACCENT V1
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="images"] {
          background:
            radial-gradient(
              circle at 78% 42%,
              rgba(34,211,238,.24),
              transparent 42%
            ),
            linear-gradient(
              90deg,
              #06182c 0%,
              #072238 34%,
              #083b4d 52%,
              #075967 72%,
              #087f8c 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(34,211,238,.28) !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="images"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              transparent 34%,
              rgba(34,211,238,.10) 48%,
              rgba(34,211,238,.28) 72%,
              rgba(45,212,191,.38) 100%
            ) !important;

          opacity:
            .84 !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="images"]
        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #67e8f9 0%,
              #22d3ee 48%,
              #14b8a6 100%
            ) !important;

          box-shadow:
            0 0 18px
            rgba(34,211,238,.34) !important;
        }

        /* =============================================
           MARKETING WORKSPACE ACCENT V1
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="marketing"] {
          background:
            radial-gradient(
              circle at 78% 42%,
              rgba(249,115,22,.22),
              transparent 42%
            ),
            linear-gradient(
              90deg,
              #06182c 0%,
              #0a2138 34%,
              #3b261f 52%,
              #6b2d1a 72%,
              #9a3f18 100%
            ) !important;

          border-bottom:
            1px solid
            rgba(249,115,22,.26) !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="marketing"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              transparent 34%,
              rgba(249,115,22,.10) 48%,
              rgba(251,146,60,.28) 72%,
              rgba(245,158,11,.34) 100%
            ) !important;

          opacity:
            .84 !important;
        }


        .iaWorkspaceTopbar[data-workspace-section="marketing"]
        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #fdba74 0%,
              #f97316 52%,
              #ea580c 100%
            ) !important;

          box-shadow:
            0 0 18px
            rgba(249,115,22,.34) !important;
        }

        /* =============================================
           SWISS MARKET BADGE
           ============================================= */

        .iaSwissBadge {
          position: relative;
          display: block;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 4px;
          background: #d71920;
          box-shadow:
            inset 0 0 0 1px rgba(0,0,0,.08),
            0 2px 7px rgba(215,25,32,.22);
        }

        .iaSwissBadge::before,
        .iaSwissBadge::after {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 1px;
          background: #ffffff;
          content: "";
          transform: translate(-50%, -50%);
        }

        .iaSwissBadge::before {
          width: 10px;
          height: 3px;
        }

        .iaSwissBadge::after {
          width: 3px;
          height: 10px;
        }

        /* =============================================
           FINANCE WORKSPACE ACCENT V1
           ============================================= */

        .iaWorkspaceTopbar[data-workspace-section="finance"] {
          background:
            radial-gradient(
              circle at 78% 42%,
              rgba(52,211,153,.22),
              transparent 42%
            ),
            linear-gradient(
              90deg,
              #061a2d 0%,
              #09373a 55%,
              #0f766e 100%
            );
        }

        .iaWorkspaceTopbar[data-workspace-section="finance"]::after {
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              transparent 34%,
              rgba(52,211,153,.10) 50%,
              rgba(16,185,129,.28) 74%,
              rgba(5,150,105,.38) 100%
            );
        }

        .iaWorkspaceTopbar[data-workspace-section="finance"]
        .iaWorkspaceTitle::before {
          background:
            linear-gradient(
              180deg,
              #a7f3d0 0%,
              #34d399 48%,
              #059669 100%
            ) !important;
        }
`}</style>
    </div>
  );
}