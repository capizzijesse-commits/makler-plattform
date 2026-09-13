"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

type Sheet =
  | "workspace"
  | "more"
  | null;

type IconName =
  | "home"
  | "objects"
  | "plus"
  | "workspace"
  | "more"
  | "map"
  | "marketing"
  | "finance"
  | "social"
  | "chat"
  | "account"
  | "settings"
  | "about"
  | "help"
  | "logout";

function Icon({
  name,
}: {
  name: IconName;
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
      {name === "home" && (
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
            rx="3"
          />
          <rect
            x="8"
            y="8"
            width="8"
            height="8"
            rx="1.5"
          />
        </>
      )}

      {name === "plus" && (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      )}

      {name === "workspace" && (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.4" />
          <rect x="14" y="4" width="6" height="6" rx="1.4" />
          <rect x="4" y="14" width="6" height="6" rx="1.4" />
          <rect x="14" y="14" width="6" height="6" rx="1.4" />
        </>
      )}

      {name === "more" && (
        <>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </>
      )}

      {name === "map" && (
        <>
          <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
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

      {name === "social" && (
        <>
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="m8 11 8-4" />
          <path d="m8 13 8 4" />
        </>
      )}

      {name === "chat" && (
        <>
          <path d="M5 5h14v10H9l-4 4Z" />
          <path d="M8 9h8" />
          <path d="M8 12h5" />
        </>
      )}

      {name === "account" && (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20c.8-4.2 3.1-6.3 7-6.3s6.2 2.1 7 6.3" />
        </>
      )}

      {name === "settings" && (
        <>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <circle cx="16" cy="7" r="2" />
          <path d="M4 17h2" />
          <path d="M10 17h10" />
          <circle cx="8" cy="17" r="2" />
        </>
      )}

      {name === "about" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </>
      )}

      {name === "help" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9a2.4 2.4 0 0 1 4.6 1c0 2-2.4 2.2-2.4 4" />
          <path d="M12 17h.01" />
        </>
      )}

      {name === "logout" && (
        <>
          <path d="M10 5H5v14h5" />
          <path d="M14 8l4 4-4 4" />
          <path d="M8 12h10" />
        </>
      )}
    </svg>
  );
}

export default function MobileAppNav() {
  const pathname =
    usePathname() || "/";

  const router =
    useRouter();

  const [
    sheet,
    setSheet,
  ] =
    useState<Sheet>(
      null
    );

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  function closeSheet() {
    setSheet(null);
  }

  function toggleSheet(
    next:
      Exclude<
        Sheet,
        null
      >
  ) {
    setSheet(
      (current) =>
        current === next
          ? null
          : next
    );
  }

  function openConnect() {
    closeSheet();

    window.dispatchEvent(
      new Event(
        "inserat-ai:open-chat"
      )
    );
  }

  function openPrivacySettings() {
    closeSheet();

    window.dispatchEvent(
      new Event(
        "inserat-ai:open-privacy-settings"
      )
    );
  }

  async function logout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      await fetch(
        "/api/logout",
        {
          method:
            "POST",

          credentials:
            "include",
        }
      );

      router.push("/");
      router.refresh();
    }
    finally {
      setLoggingOut(false);
      closeSheet();
    }
  }

  const todayActive =
    pathname === "/cockpit";

  const objectsActive =
    pathname.startsWith(
      "/cockpit/"
    );

  const workspaceActive =
    pathname === "/map" ||
    pathname.startsWith(
      "/map/"
    ) ||
    pathname.startsWith(
      "/marketing-hub"
    ) ||
    pathname.startsWith(
      "/finanzierung"
    ) ||
    pathname.startsWith(
      "/dashboard/social-media"
    );

  return (
    <>
      <div
        className={
          sheet
            ? "iaMobileSheetBackdrop visible"
            : "iaMobileSheetBackdrop"
        }
        onClick={closeSheet}
        aria-hidden="true"
      />

      {sheet ===
        "workspace" && (
        <section
          className="iaMobileAppSheet"
          aria-label="Workspace"
        >
          <div className="iaMobileSheetHandle" />

          <div className="iaMobileSheetHead">
            <div>
              <small>
                INSERAT-AI
              </small>

              <strong>
                Workspace
              </strong>
            </div>

            <button
              type="button"
              onClick={closeSheet}
              aria-label="Schließen"
              className="iaMobileSheetClose"
            >
              ×
            </button>
          </div>

          <div className="iaMobileWorkspaceGrid">
            <Link
              href="/map"
              className="iaMobileWorkspaceCard"
            >
              <span>
                <Icon name="map" />
              </span>

              <strong>
                Maps
              </strong>

              <small>
                Objekte & Regionen
              </small>
            </Link>

            <Link
              href="/marketing-hub"
              className="iaMobileWorkspaceCard"
            >
              <span>
                <Icon name="marketing" />
              </span>

              <strong>
                Marketing
              </strong>

              <small>
                Vermarktung steuern
              </small>
            </Link>

            <Link
              href="/dashboard/social-media"
              className="iaMobileWorkspaceCard"
            >
              <span>
                <Icon name="social" />
              </span>

              <strong>
                Social Media
              </strong>

              <small>
                Beiträge erstellen
              </small>
            </Link>

            <Link
              href="/finanzierung"
              className="iaMobileWorkspaceCard"
            >
              <span>
                <Icon name="finance" />
              </span>

              <strong>
                Finanzierung
              </strong>

              <small>
                Objekt & Beratung
              </small>
            </Link>

            <button
              type="button"
              onClick={openConnect}
              className="iaMobileWorkspaceCard iaMobileConnectCard"
            >
              <span>
                <Icon name="chat" />
              </span>

              <strong>
                Connect
              </strong>

              <small>
                Chat & Kontakte
              </small>
            </button>
          </div>
        </section>
      )}

      {sheet ===
        "more" && (
        <section
          className="iaMobileAppSheet"
          aria-label="Mehr"
        >
          <div className="iaMobileSheetHandle" />

          <div className="iaMobileSheetHead">
            <div>
              <small>
                INSERAT-AI
              </small>

              <strong>
                Profil & Mehr
              </strong>
            </div>

            <button
              type="button"
              onClick={closeSheet}
              aria-label="Schließen"
              className="iaMobileSheetClose"
            >
              ×
            </button>
          </div>

          <div className="iaMobileMoreList">
            <Link
              href="/konto"
              className="iaMobileMoreItem"
            >
              <span>
                <Icon name="account" />
              </span>

              <div>
                <strong>
                  Mein Konto
                </strong>

                <small>
                  Profil & Zugang
                </small>
              </div>

              <b>›</b>
            </Link>

            <Link
              href="/konto"
              className="iaMobileMoreItem"
            >
              <span>
                <Icon name="settings" />
              </span>

              <div>
                <strong>
                  Einstellungen
                </strong>

                <small>
                  Konto verwalten
                </small>
              </div>

              <b>›</b>
            </Link>

            <Link
              href="/ueber-uns"
              className="iaMobileMoreItem"
            >
              <span>
                <Icon name="about" />
              </span>

              <div>
                <strong>
                  Über uns
                </strong>

                <small>
                  Inserat-AI kennenlernen
                </small>
              </div>

              <b>›</b>
            </Link>

            <Link
              href="/kontakt"
              className="iaMobileMoreItem"
            >
              <span>
                <Icon name="help" />
              </span>

              <div>
                <strong>
                  Hilfe & Support
                </strong>

                <small>
                  Unterstützung erhalten
                </small>
              </div>

              <b>›</b>
            </Link>

            <button
              type="button"
              onClick={openPrivacySettings}
              className="iaMobileMoreItem"
            >
              <span>
                <Icon name="settings" />
              </span>

              <div>
                <strong>
                  Datenschutz
                </strong>

                <small>
                  Datenschutz-Einstellungen
                </small>
              </div>

              <b>›</b>
            </button>

            <button
              type="button"
              onClick={logout}
              className="iaMobileMoreItem iaMobileLogout"
              disabled={loggingOut}
            >
              <span>
                <Icon name="logout" />
              </span>

              <div>
                <strong>
                  {loggingOut
                    ? "Wird abgemeldet …"
                    : "Abmelden"}
                </strong>

                <small>
                  Sitzung beenden
                </small>
              </div>

              <b>›</b>
            </button>
          </div>
        </section>
      )}

      <nav
        className="iaMobileAppNav"
        aria-label="Mobile Hauptnavigation"
      >
        <Link
          href="/cockpit"
          className={
            todayActive
              ? "iaMobileNavItem active"
              : "iaMobileNavItem"
          }
        >
          <span>
            <Icon name="home" />
          </span>

          <small>
            Heute
          </small>
        </Link>

        <Link
          href="/cockpit#v2-objects"
          className={
            objectsActive
              ? "iaMobileNavItem active"
              : "iaMobileNavItem"
          }
        >
          <span>
            <Icon name="objects" />
          </span>

          <small>
            Objekte
          </small>
        </Link>

        <Link
          href="/dashboard#new-listing"
          className="iaMobileNavCreate"
          aria-label="Neues Inserat"
        >
          <span>
            <Icon name="plus" />
          </span>

          <small>
            Neu
          </small>
        </Link>

        <button
          type="button"
          className={
            workspaceActive ||
            sheet === "workspace"
              ? "iaMobileNavItem active"
              : "iaMobileNavItem"
          }
          onClick={() =>
            toggleSheet(
              "workspace"
            )
          }
        >
          <span>
            <Icon name="workspace" />
          </span>

          <small>
            Workspace
          </small>
        </button>

        <button
          type="button"
          className={
            sheet === "more"
              ? "iaMobileNavItem active"
              : "iaMobileNavItem"
          }
          onClick={() =>
            toggleSheet(
              "more"
            )
          }
        >
          <span>
            <Icon name="more" />
          </span>

          <small>
            Mehr
          </small>
        </button>
      </nav>

      <style jsx global>{`
        .iaMobileAppNav,
        .iaMobileAppSheet,
        .iaMobileSheetBackdrop {
          display: none;
        }

        @media (
          max-width: 900px
        ) {
          /*
           * Mobile = echte App-Navigation.
           * Desktop-Sidebar und alte Floating-Menüs weg.
           */

          /* IA_MOBILE_HIDE_COOKIE_GEAR_V1 */
          body:has(.iaMobileAppNav)
          .cookieSettingsButton {
            display:
              none !important;
          }

          .iaSidebar {
            display:
              none !important;
          }

          .iaWorkspace {
            display:
              block !important;

            width:
              100% !important;

            max-width:
              100% !important;
          }

          .iaWorkspaceMain {
            width:
              100% !important;

            max-width:
              100% !important;

            margin:
              0 !important;

            padding-bottom:
              calc(
                96px +
                env(
                  safe-area-inset-bottom
                )
              ) !important;
          }

          .iaGlobalLauncher,
          .iaWorkspaceBackdrop,
          .iaWorkspacePanel {
            display:
              none !important;
          }

          .iaSupportToolsShell {
            display:
              none !important;
          }

          .maplibregl-ctrl-bottom-right {
            bottom:
              86px !important;
          }

          .iaMobileSheetBackdrop {
            position:
              fixed;

            inset:
              0;

            z-index:
              9700;

            display:
              block;

            background:
              rgba(
                2,
                8,
                23,
                .56
              );

            opacity:
              0;

            visibility:
              hidden;

            pointer-events:
              none;

            backdrop-filter:
              blur(3px);

            transition:
              opacity
                180ms ease,
              visibility
                180ms ease;
          }

          .iaMobileSheetBackdrop.visible {
            opacity:
              1;

            visibility:
              visible;

            pointer-events:
              auto;
          }

          .iaMobileAppNav {
            position:
              fixed;

            z-index:
              9800;

            left:
              10px;

            right:
              10px;

            bottom:
              calc(
                8px +
                env(
                  safe-area-inset-bottom
                )
              );

            display:
              grid;

            grid-template-columns:
              1fr
              1fr
              1.12fr
              1fr
              1fr;

            align-items:
              end;

            min-height:
              68px;

            padding:
              7px 7px 6px;

            border:
              1px solid
              rgba(
                255,
                255,
                255,
                .10
              );

            border-radius:
              22px;

            background:
              rgba(
                5,
                18,
                38,
                .96
              );

            box-shadow:
              0 -2px 30px
              rgba(
                2,
                8,
                23,
                .28
              );

            backdrop-filter:
              blur(22px);
          }

          .iaMobileNavItem {
            appearance:
              none;

            display:
              flex;

            min-width:
              0;

            min-height:
              54px;

            flex-direction:
              column;

            align-items:
              center;

            justify-content:
              center;

            gap:
              4px;

            padding:
              5px 2px;

            border:
              0;

            border-radius:
              14px;

            background:
              transparent;

            color:
              #7f95ae;

            text-decoration:
              none;

            font:
              inherit;

            cursor:
              pointer;
          }

          .iaMobileNavItem
          > span {
            display:
              grid;

            width:
              25px;

            height:
              25px;

            place-items:
              center;
          }

          .iaMobileNavItem
          svg {
            width:
              23px;

            height:
              23px;
          }

          .iaMobileNavItem
          small {
            overflow:
              hidden;

            max-width:
              100%;

            font-size:
              9px;

            font-weight:
              750;

            line-height:
              1;

            text-overflow:
              ellipsis;

            white-space:
              nowrap;
          }

          .iaMobileNavItem.active {
            color:
              #fbbf24;

            background:
              rgba(
                251,
                191,
                36,
                .07
              );
          }

          .iaMobileNavCreate {
            position:
              relative;

            display:
              flex;

            min-width:
              0;

            flex-direction:
              column;

            align-items:
              center;

            justify-content:
              flex-end;

            gap:
              4px;

            padding-bottom:
              5px;

            color:
              #f8fafc;

            text-decoration:
              none;
          }

          .iaMobileNavCreate
          > span {
            display:
              grid;

            width:
              52px;

            height:
              52px;

            margin-top:
              -23px;

            place-items:
              center;

            border:
              4px solid
              #06142b;

            border-radius:
              50%;

            background:
              linear-gradient(
                145deg,
                #fbbf24,
                #f59e0b
              );

            color:
              #071426;

            box-shadow:
              0 8px 24px
              rgba(
                245,
                158,
                11,
                .34
              );
          }

          .iaMobileNavCreate
          svg {
            width:
              25px;

            height:
              25px;

            stroke-width:
              2.3;
          }

          .iaMobileNavCreate
          small {
            font-size:
              9px;

            font-weight:
              850;
          }

          .iaMobileAppSheet {
            position:
              fixed;

            z-index:
              9750;

            left:
              10px;

            right:
              10px;

            bottom:
              calc(
                86px +
                env(
                  safe-area-inset-bottom
                )
              );

            display:
              block;

            max-width:
              470px;

            max-height:
              min(
                70dvh,
                600px
              );

            margin:
              0 auto;

            padding:
              10px 12px 14px;

            overflow-y:
              auto;

            border:
              1px solid
              rgba(
                255,
                255,
                255,
                .11
              );

            border-radius:
              24px;

            background:
              linear-gradient(
                155deg,
                rgba(
                  7,
                  24,
                  49,
                  .995
                ),
                rgba(
                  3,
                  13,
                  31,
                  .995
                )
              );

            color:
              #f8fafc;

            box-shadow:
              0 28px 80px
              rgba(
                2,
                8,
                23,
                .54
              );

            animation:
              iaMobileSheetIn
              180ms ease-out;
          }

          @keyframes
          iaMobileSheetIn {
            from {
              opacity:
                0;

              transform:
                translateY(
                  14px
                );
            }

            to {
              opacity:
                1;

              transform:
                translateY(
                  0
                );
            }
          }

          .iaMobileSheetHandle {
            width:
              38px;

            height:
              4px;

            margin:
              0 auto 11px;

            border-radius:
              999px;

            background:
              rgba(
                148,
                163,
                184,
                .34
              );
          }

          .iaMobileSheetHead {
            display:
              flex;

            align-items:
              center;

            justify-content:
              space-between;

            gap:
              12px;

            padding:
              2px 3px
              12px;
          }

          .iaMobileSheetHead
          > div {
            display:
              grid;

            gap:
              2px;
          }

          .iaMobileSheetHead
          small {
            color:
              #fbbf24;

            font-size:
              8px;

            font-weight:
              900;

            letter-spacing:
              .17em;
          }

          .iaMobileSheetHead
          strong {
            font-size:
              19px;

            line-height:
              1.15;
          }

          .iaMobileSheetClose {
            display:
              grid;

            width:
              34px;

            height:
              34px;

            place-items:
              center;

            border:
              1px solid
              rgba(
                255,
                255,
                255,
                .10
              );

            border-radius:
              50%;

            background:
              rgba(
                255,
                255,
                255,
                .05
              );

            color:
              #d9e3ee;

            font-size:
              21px;

            cursor:
              pointer;
          }

          .iaMobileWorkspaceGrid {
            display:
              grid;

            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );

            gap:
              8px;
          }

          .iaMobileWorkspaceCard {
            appearance:
              none;

            display:
              flex;

            min-width:
              0;

            min-height:
              92px;

            flex-direction:
              column;

            align-items:
              flex-start;

            justify-content:
              center;

            gap:
              5px;

            padding:
              12px;

            border:
              1px solid
              rgba(
                148,
                163,
                184,
                .10
              );

            border-radius:
              17px;

            background:
              rgba(
                255,
                255,
                255,
                .035
              );

            color:
              #f8fafc;

            text-align:
              left;

            text-decoration:
              none;

            font:
              inherit;

            cursor:
              pointer;
          }

          .iaMobileWorkspaceCard
          > span {
            display:
              grid;

            width:
              31px;

            height:
              31px;

            place-items:
              center;

            border-radius:
              10px;

            background:
              rgba(
                251,
                191,
                36,
                .09
              );

            color:
              #fbbf24;
          }

          .iaMobileWorkspaceCard
          svg {
            width:
              18px;

            height:
              18px;
          }

          .iaMobileWorkspaceCard
          strong {
            font-size:
              12px;
          }

          .iaMobileWorkspaceCard
          small {
            color:
              #8195ad;

            font-size:
              8px;

            line-height:
              1.25;
          }

          .iaMobileConnectCard {
            grid-column:
              1 / -1;

            min-height:
              70px;

            background:
              linear-gradient(
                135deg,
                rgba(
                  14,
                  116,
                  144,
                  .12
                ),
                rgba(
                  124,
                  58,
                  237,
                  .11
                )
              );
          }

          .iaMobileMoreList {
            display:
              grid;

            gap:
              5px;
          }

          .iaMobileMoreItem {
            appearance:
              none;

            display:
              grid;

            grid-template-columns:
              38px
              minmax(
                0,
                1fr
              )
              auto;

            min-height:
              58px;

            align-items:
              center;

            gap:
              10px;

            width:
              100%;

            padding:
              8px 10px;

            border:
              1px solid
              transparent;

            border-radius:
              14px;

            background:
              transparent;

            color:
              #dce7f3;

            text-align:
              left;

            text-decoration:
              none;

            font:
              inherit;

            cursor:
              pointer;
          }

          .iaMobileMoreItem:active {
            background:
              rgba(
                255,
                255,
                255,
                .055
              );
          }

          .iaMobileMoreItem
          > span {
            display:
              grid;

            width:
              34px;

            height:
              34px;

            place-items:
              center;

            border-radius:
              11px;

            background:
              rgba(
                148,
                163,
                184,
                .08
              );

            color:
              #9db0c6;
          }

          .iaMobileMoreItem
          svg {
            width:
              19px;

            height:
              19px;
          }

          .iaMobileMoreItem
          > div {
            display:
              grid;

            min-width:
              0;

            gap:
              2px;
          }

          .iaMobileMoreItem
          strong {
            font-size:
              12px;
          }

          .iaMobileMoreItem
          small {
            color:
              #71859e;

            font-size:
              8px;
          }

          .iaMobileMoreItem
          > b {
            color:
              #60758f;

            font-size:
              20px;

            font-weight:
              500;
          }

          .iaMobileLogout {
            color:
              #fecaca;
          }

          .iaMobileLogout
          > span {
            color:
              #f87171;

            background:
              rgba(
                239,
                68,
                68,
                .08
              );
          }
        }
      `}</style>
    </>
  );
}
