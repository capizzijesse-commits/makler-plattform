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
  const detectedLocale =
    useLocale();

  const t =
    useTranslations("Common");

  const locale: AppLocale =
    locales.includes(
      detectedLocale as AppLocale
    )
      ? (detectedLocale as AppLocale)
      : "de";

  const buttonRef =
    useRef<HTMLButtonElement>(null);

  const menuRef =
    useRef<HTMLDivElement>(null);

  const [mounted, setMounted] =
    useState(false);

  const [isOpen, setIsOpen] =
    useState(false);

  const [menuPosition, setMenuPosition] =
    useState<MenuPosition | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePosition() {
      const button =
        buttonRef.current;

      if (!button) {
        return;
      }

      const rect =
        button.getBoundingClientRect();

      setMenuPosition({
        top:
          rect.bottom + 8,
        right:
          Math.max(
            12,
            window.innerWidth -
              rect.right
          ),
      });
    }

    function closeOutside(
      event: PointerEvent
    ) {
      const target =
        event.target as Node;

      if (
        buttonRef.current?.contains(
          target
        ) ||
        menuRef.current?.contains(
          target
        )
      ) {
        return;
      }

      setIsOpen(false);
    }

    function closeWithEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    updatePosition();

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    document.addEventListener(
      "pointerdown",
      closeOutside
    );

    document.addEventListener(
      "keydown",
      closeWithEscape
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );

      document.removeEventListener(
        "pointerdown",
        closeOutside
      );

      document.removeEventListener(
        "keydown",
        closeWithEscape
      );
    };
  }, [isOpen]);

  function toggleMenu() {
    const button =
      buttonRef.current;

    if (button) {
      const rect =
        button.getBoundingClientRect();

      setMenuPosition({
        top:
          rect.bottom + 8,
        right:
          Math.max(
            12,
            window.innerWidth -
              rect.right
          ),
      });
    }

    setIsOpen(
      (current) => !current
    );
  }

  function changeLanguage(
    nextLocale: AppLocale
  ) {
    if (
      !locales.includes(
        nextLocale
      )
    ) {
      return;
    }

    setIsOpen(false);

    if (nextLocale === locale) {
      return;
    }

    const secure =
      window.location.protocol ===
      "https:"
        ? "; Secure"
        : "";

    document.cookie =
      `${localeCookieName}=${nextLocale}; ` +
      `Path=/; Max-Age=31536000; ` +
      `SameSite=Lax${secure}`;

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
              top:
                `${menuPosition.top}px`,
              right:
                `${menuPosition.right}px`,
              zIndex: 2147483647,
              width:
                "min(210px, calc(100vw - 24px))",
              padding: "8px",
              border:
                "1px solid rgba(255, 184, 28, 0.48)",
              borderRadius: "16px",
              background:
                "linear-gradient(160deg, #050c1f, #0d1c3a)",
              boxShadow:
                "0 24px 70px rgba(0, 0, 0, 0.62)",
            }}
          >
            <div
              style={{
                padding:
                  "8px 11px 10px",
                color: "#68e7f1",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing:
                  "0.14em",
                textTransform:
                  "uppercase",
              }}
            >
              {t("language")}
            </div>

            {locales.map(
              (item) => {
                const isActive =
                  item === locale;

                return (
                  <button
                    key={item}
                    type="button"
                    role="menuitemradio"
                    aria-checked={
                      isActive
                    }
                    onClick={() =>
                      changeLanguage(
                        item
                      )
                    }
                    style={{
                      width: "100%",
                      minHeight: "46px",
                      padding:
                        "0 12px",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: "12px",
                      border:
                        isActive
                          ? "1px solid rgba(255, 184, 28, 0.40)"
                          : "1px solid transparent",
                      borderRadius:
                        "11px",
                      background:
                        isActive
                          ? "rgba(255, 184, 28, 0.15)"
                          : "transparent",
                      color:
                        isActive
                          ? "#ffbd28"
                          : "#ffffff",
                      fontFamily:
                        "inherit",
                      fontSize: "13px",
                      fontWeight:
                        isActive
                          ? 900
                          : 750,
                      cursor:
                        "pointer",
                      textAlign:
                        "left",
                    }}
                  >
                    <span>
                      {
                        languageNames[
                          item
                        ]
                      }
                    </span>

                    <span
                      style={{
                        color:
                          isActive
                            ? "#ffbd28"
                            : "#9aa8c5",
                        fontSize:
                          "11px",
                        fontWeight:
                          900,
                        letterSpacing:
                          "0.10em",
                      }}
                    >
                      {
                        shortLabels[
                          item
                        ]
                      }
                    </span>
                  </button>
                );
              }
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
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
          justifyContent:
            "space-between",
          gap: "11px",
          border:
            isOpen
              ? "1px solid rgba(255, 184, 28, 0.95)"
              : "1px solid rgba(255, 184, 28, 0.36)",
          borderRadius: "13px",
          background:
            "linear-gradient(135deg, rgba(7, 16, 40, 0.98), rgba(18, 33, 66, 0.98))",
          color: "#ffffff",
          fontFamily: "inherit",
          fontSize: "12px",
          fontWeight: 900,
          letterSpacing:
            "0.09em",
          cursor: "pointer",
        }}
      >
        <span>
          {shortLabels[locale]}
        </span>

        <span
          aria-hidden="true"
          style={{
            display:
              "inline-block",
            color: "#ffbd28",
            fontSize: "10px",
            transform:
              isOpen
                ? "rotate(180deg)"
                : "rotate(0deg)",
            transition:
              "transform 160ms ease",
          }}
        >
          {"\u25BC"}
        </span>
      </button>

      {menu}
    </>
  );
}