"use client";

import {
  useEffect,
} from "react";
import {
  usePathname,
} from "next/navigation";

const CONTINUE_TO_PUBLISH_KEY =
  "inserat-ai:dashboard-save-start";

export default function EditAutomationBridge() {
  const pathname =
    usePathname();

  useEffect(() => {
    if (!pathname.endsWith("/edit")) {
      return;
    }

    let form:
      HTMLFormElement |
      null = null;

    let button:
      HTMLButtonElement |
      null = null;

    let observer:
      MutationObserver |
      null = null;

    const updateButton = () => {
      if (!button) {
        return;
      }

      const label =
        button.disabled
          ? "Wird gespeichert …"
          : "Speichern & weiter zur Veröffentlichung →";

      if (
        button.textContent?.trim() !==
        label
      ) {
        button.textContent =
          label;
      }

      button.setAttribute(
        "aria-label",
        label
      );
    };

    const onSubmit = () => {
      window.sessionStorage.setItem(
        CONTINUE_TO_PUBLISH_KEY,
        "1"
      );
    };

    const connect = () => {
      form =
        document.querySelector<HTMLFormElement>(
          "form.editCard"
        );

      button =
        form?.querySelector<HTMLButtonElement>(
          "button.saveButton[type='submit']"
        ) ??
        null;

      if (!form || !button) {
        return false;
      }

      updateButton();

      form.addEventListener(
        "submit",
        onSubmit,
        true
      );

      observer =
        new MutationObserver(
          updateButton
        );

      observer.observe(
        button,
        {
          attributes:
            true,
          childList:
            true,
          subtree:
            true,
        }
      );

      return true;
    };

    if (connect()) {
      return () => {
        form?.removeEventListener(
          "submit",
          onSubmit,
          true
        );

        observer?.disconnect();
      };
    }

    const pageObserver =
      new MutationObserver(() => {
        if (connect()) {
          pageObserver.disconnect();
        }
      });

    pageObserver.observe(
      document.body,
      {
        childList:
          true,
        subtree:
          true,
      }
    );

    return () => {
      pageObserver.disconnect();

      form?.removeEventListener(
        "submit",
        onSubmit,
        true
      );

      observer?.disconnect();
    };
  }, [pathname]);

  return null;
}
