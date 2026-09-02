"use client";

import Script from "next/script";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdApi = {
  initialize: (options: {
    client_id: string;
    callback: (
      response: GoogleCredentialResponse
    ) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;

  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?:
        | "outline"
        | "filled_blue"
        | "filled_black";
      size?: "large" | "medium" | "small";
      text?:
        | "signin_with"
        | "signup_with"
        | "continue_with"
        | "signin";
      shape?:
        | "rectangular"
        | "pill"
        | "circle"
        | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    }
  ) => void;
};

type GoogleWindow = typeof window & {
  google?: {
    accounts?: {
      id?: GoogleIdApi;
    };
  };
};

type Props = {
  onCredential: (
    credential: string
  ) => void | Promise<void>;
  disabled?: boolean;
};

export default function GoogleSignInButton({
  onCredential,
  disabled = false,
}: Props) {
  const buttonRef =
    useRef<HTMLDivElement | null>(null);

  const callbackRef =
    useRef(onCredential);

  const [scriptReady, setScriptReady] =
    useState(false);

  const [scriptError, setScriptError] =
    useState(false);

  const clientId =
    process.env
      .NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ?.trim() || "";

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (
      !scriptReady ||
      !clientId ||
      !buttonRef.current
    ) {
      return;
    }

    const googleWindow =
      window as GoogleWindow;

    const googleId =
      googleWindow.google?.accounts?.id;

    if (!googleId) {
      return;
    }

    googleId.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        if (!response.credential) {
          return;
        }

        void callbackRef.current(
          response.credential
        );
      },
    });

    const renderButton = () => {
      if (!buttonRef.current) {
        return;
      }

      const measuredWidth =
        buttonRef.current
          .getBoundingClientRect()
          .width;

      const width = Math.max(
        240,
        Math.min(
          400,
          Math.floor(
            measuredWidth || 376
          )
        )
      );

      buttonRef.current.innerHTML = "";

      googleId.renderButton(
        buttonRef.current,
        {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width,
        }
      );
    };

    renderButton();

    window.addEventListener(
      "resize",
      renderButton
    );

    return () => {
      window.removeEventListener(
        "resize",
        renderButton
      );
    };
  }, [clientId, scriptReady]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => {
          setScriptError(false);
          setScriptReady(true);
        }}
        onError={() => {
          setScriptError(true);
        }}
      />

      <div
        style={{
          width: "100%",
          minHeight: "44px",
          display: "flex",
          justifyContent: "center",
          opacity: disabled ? 0.55 : 1,
          pointerEvents:
            disabled ? "none" : "auto",
        }}
      >
        {!clientId || scriptError ? (
          <div
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border:
                "1px solid rgba(255,255,255,0.15)",
              color: "#cbd5e1",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            Google Login konnte nicht
            geladen werden.
          </div>
        ) : (
          <div
            ref={buttonRef}
            style={{
              width: "100%",
              minHeight: "44px",
            }}
          />
        )}
      </div>
    </>
  );
}
