"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {createPortal} from "react-dom";
import {
  useLocale,
  useTranslations,
} from "next-intl";

import {
  localeCookieName,
  locales,
  type AppLocale,
} from "@/i18n/config";

const shortLabels: Record<AppLocale, string> = {
  de: "DE",
  it: "IT",
  fr: "FR",
  en: "EN",
};

const languageNames: Record<AppLocale, string> = {
  de: "Deutsch",
  it: "Italiano",
  fr: "Français",
  en: "English",
};

type MenuPosition = {
  top: number;
  right: number;
};

export default function LanguageSwitcher() {
  const detectedLocale = useLocale();
  const t = useTranslations("Common");

  const locale: AppLocale = locales.includes(
    detectedLocale as AppLocale
  )
    ? (detectedLocale as AppLocale)
    : "de";

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLocale, setHoveredLocale] =
    useState<AppLocale | null>(null);
  const [menuPosition, setMenuPosition] =
    useState<MenuPosition | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updateMenuPosition() {
      const button = buttonRef.current;

      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();

      setMenuPosition({
        top: rect.bottom + 10,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      const clickedButton =
        buttonRef.current?.contains(target);

      const clickedMenu =
        menuRef.current?.contains(target);

      if (!clickedButton && !clickedMenu) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "resize",
        updateMenuPosition
      );

      window.removeEventListener(
        "scroll",
        updateMenuPosition,
        true
      );

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen]);

  function changeLanguage(nextLocale: AppLocale) {
    if (!locales.includes(nextLocale)) {
      return;
    }

    setIsOpen(false);

    if (nextLocale === locale) {
      return;
    }

    const secure =
      window.location.protocol === "https:"
        ? "; Secure"
        : "";

    document.cookie =
      `${localeCookieName}=${nextLocale}; ` +
      `Path=/; Max-Age=31536000; SameSite=Lax${secure}`;

    window.location.reload();
  }

  const menu =
    mounted &&
    isOpen &&
    menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("language")}
            style={{
              position: "fixed",
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              zIndex: 2147483647,
              width: "190px",
              padding: "8px",
              border:
                "1px solid rgba(255, 184, 28, 0.42)",
              borderRadius: "16px",
              background:
                "linear-gradient(160deg, rgba(5, 12, 31, 0.995), rgba(13, 28, 58, 0.995))",
              boxShadow:
                "0 24px 70px rgba(0, 0, 0, 0.58), 0 0 30px rgba(255, 184, 28, 0.10)",
              backdropFilter: "blur(18px)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "9px 11px 10px",
                color: "#68e7f1",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {t("language")}
            </div>

            {locales.map((item) => {
              const isActive = item === locale;
              const isHovered = item === hoveredLocale;

              return (
                <button
                  key={item}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => changeLanguage(item)}
                  onMouseEnter={() =>
                    setHoveredLocale(item)
                  }
                  onMouseLeave={() =>
                    setHoveredLocale(null)
                  }
                  style={{
                    width: "100%",
                    minHeight: "46px",
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    border: isActive
                      ? "1px solid rgba(255, 184, 28, 0.34)"
                      : "1px solid transparent",
                    borderRadius: "11px",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(255, 184, 28, 0.18), rgba(255, 184, 28, 0.08))"
                      : isHovered
                        ? "rgba(255, 255, 255, 0.065)"
                        : "transparent",
                    color: isActive
                      ? "#ffbd28"
                      : "#ffffff",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: isActive ? 900 : 750,
                    cursor: "pointer",
                    textAlign: "left",
                    transition:
                      "background 150ms ease, border-color 150ms ease, color 150ms ease",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "9px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "7px",
                        height: "7px",
                        flex: "0 0 auto",
                        borderRadius: "999px",
                        background: isActive
                          ? "#ffbd28"
                          : "rgba(255, 255, 255, 0.22)",
                        boxShadow: isActive
                          ? "0 0 12px rgba(255, 184, 28, 0.75)"
                          : "none",
                      }}
                    />

                    {languageNames[item]}
                  </span>

                  <span
                    style={{
                      color: isActive
                        ? "#ffbd28"
                        : "#9aa8c5",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.10em",
                    }}
                  >
                    {shortLabels[item]}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() =>
          setIsOpen((current) => !current)
        }
        aria-label={t("language")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={t("language")}
        style={{
          height: "42px",
          minWidth: "84px",
          padding: "0 14px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "11px",
          border: isOpen
            ? "1px solid rgba(255, 184, 28, 0.90)"
            : "1px solid rgba(255, 184, 28, 0.36)",
          borderRadius: "13px",
          background:
            "linear-gradient(135deg, rgba(7, 16, 40, 0.98), rgba(18, 33, 66, 0.98))",
          boxShadow: isOpen
            ? "0 0 0 3px rgba(255, 184, 28, 0.10), 0 8px 24px rgba(0, 0, 0, 0.28)"
            : "0 6px 18px rgba(0, 0, 0, 0.20)",
          color: "#ffffff",
          fontFamily: "inherit",
          fontSize: "12px",
          fontWeight: 900,
          letterSpacing: "0.09em",
          cursor: "pointer",
          transition:
            "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
        }}
      >
        <span>{shortLabels[locale]}</span>

        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            color: "#ffbd28",
            fontSize: "10px",
            transform: isOpen
              ? "rotate(180deg)"
              : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        >
          ▼
        </span>
      </button>

      {menu}
    </>
  );
}