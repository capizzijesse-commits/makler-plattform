"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type AppNoticeTone =
  | "success"
  | "error"
  | "warning"
  | "info";

export type AppConfirmTone =
  | "default"
  | "warning"
  | "danger";

export type AppDialogChoice =
  | "confirm"
  | "secondary"
  | "cancel";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  secondaryLabel?: string;
  cancelLabel?: string;
  tone?: AppConfirmTone;
  emphasizeConfirmAfterMs?: number;
};

type ToastItem = {
  id: number;
  message: string;
  tone: AppNoticeTone;
};

type AppDialogContextValue = {
  notify: (
    message: string,
    tone?: AppNoticeTone
  ) => void;

  confirmAction: (
    options: ConfirmOptions
  ) => Promise<boolean>;

  chooseAction: (
    options: ConfirmOptions
  ) => Promise<AppDialogChoice>;
};

const AppDialogContext =
  createContext<AppDialogContextValue | null>(null);

export function useAppDialog() {
  const context = useContext(AppDialogContext);

  if (!context) {
    throw new Error(
      "useAppDialog muss innerhalb von AppDialogProvider verwendet werden."
    );
  }

  return context;
}

export default function AppDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>(
    []
  );

  const [confirmOptions, setConfirmOptions] =
    useState<ConfirmOptions | null>(null);

  const [
    confirmEmphasized,
    setConfirmEmphasized,
  ] = useState(false);

  const nextToastId = useRef(1);

  const confirmResolver = useRef<
    ((result: AppDialogChoice) => void) | null
  >(null);

  const removeToast = useCallback(
    (toastId: number) => {
      setToasts((current) =>
        current.filter(
          (toast) => toast.id !== toastId
        )
      );
    },
    []
  );

  const notify = useCallback(
    (
      message: string,
      tone: AppNoticeTone = "info"
    ) => {
      const cleanedMessage = message.trim();

      if (!cleanedMessage) {
        return;
      }

      const id = nextToastId.current++;

      setToasts((current) => [
        ...current,
        {
          id,
          message: cleanedMessage,
          tone,
        },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, 4200);
    },
    [removeToast]
  );

  const openActionDialog = useCallback(
    (options: ConfirmOptions) => {
      return new Promise<AppDialogChoice>(
        (resolve) => {
          if (confirmResolver.current) {
            confirmResolver.current("cancel");
          }

          confirmResolver.current = resolve;

          setConfirmOptions({
            confirmLabel:
              options.confirmLabel || "Bestätigen",
            secondaryLabel:
              options.secondaryLabel,
            cancelLabel:
              options.cancelLabel || "Abbrechen",
            tone:
              options.tone || "default",
            title:
              options.title,
            message:
              options.message,
            emphasizeConfirmAfterMs:
              options.emphasizeConfirmAfterMs,
          });
        }
      );
    },
    []
  );

  const confirmAction = useCallback(
    async (options: ConfirmOptions) => {
      const result =
        await openActionDialog(options);

      return result === "confirm";
    },
    [openActionDialog]
  );

  const chooseAction = useCallback(
    (options: ConfirmOptions) =>
      openActionDialog(options),
    [openActionDialog]
  );

  const finishConfirmation = useCallback(
    (result: AppDialogChoice) => {
      confirmResolver.current?.(result);
      confirmResolver.current = null;
      setConfirmOptions(null);
    },
    []
  );

  useEffect(() => {
    if (!confirmOptions) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        finishConfirmation("cancel");
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [confirmOptions, finishConfirmation]);

  useEffect(() => {
    setConfirmEmphasized(false);

    const delay =
      confirmOptions
        ?.emphasizeConfirmAfterMs;

    if (
      !confirmOptions ||
      typeof delay !== "number" ||
      delay <= 0
    ) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setConfirmEmphasized(true);
      },
      delay
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [confirmOptions]);

  const contextValue = useMemo(
    () => ({
      notify,
      confirmAction,
      chooseAction,
    }),
    [
      notify,
      confirmAction,
      chooseAction,
    ]
  );

  return (
    <AppDialogContext.Provider value={contextValue}>
      {children}

      <div
        className="appToastViewport"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`appToast ${toast.tone}`}
          >
            <span className="appToastIcon">
              {toast.tone === "success"
                ? "✓"
                : toast.tone === "error"
                  ? "!"
                  : toast.tone === "warning"
                    ? "!"
                    : "i"}
            </span>

            <p>{toast.message}</p>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Hinweis schliessen"
            >
              ×
            </button>
          </article>
        ))}
      </div>

      {confirmOptions ? (
        <div
          className="appDialogOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              finishConfirmation("cancel");
            }
          }}
        >
          <section
            className={`appDialog ${
              confirmOptions.tone || "default"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby="app-dialog-message"
          >
            <div className="appDialogSymbol">
              {confirmOptions.tone === "danger"
                ? "!"
                : confirmOptions.tone === "warning"
                  ? "?"
                  : "✓"}
            </div>

            <div className="appDialogContent">
              <p className="appDialogLabel">
                INSERAT AI
              </p>

              <h2 id="app-dialog-title">
                {confirmOptions.title}
              </h2>

              <p id="app-dialog-message">
                {confirmOptions.message}
              </p>
            </div>

            <div
              className={`appDialogActions ${
                confirmOptions.secondaryLabel
                  ? "hasSecondary"
                  : ""
              }`}
            >
              {confirmOptions.secondaryLabel ? (
                <>
                  <button
                    type="button"
                    className={`appDialogConfirm ${
                      confirmEmphasized
                        ? "isEmphasized"
                        : ""
                    }`}
                    onClick={() =>
                      finishConfirmation("confirm")
                    }
                    autoFocus
                  >
                    {confirmOptions.confirmLabel}
                  </button>

                  <button
                    type="button"
                    className="appDialogSecondary"
                    onClick={() =>
                      finishConfirmation("secondary")
                    }
                  >
                    {confirmOptions.secondaryLabel}
                  </button>

                  <button
                    type="button"
                    className="appDialogCancel appDialogLater"
                    onClick={() =>
                      finishConfirmation("cancel")
                    }
                  >
                    {confirmOptions.cancelLabel}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="appDialogCancel"
                    onClick={() =>
                      finishConfirmation("cancel")
                    }
                  >
                    {confirmOptions.cancelLabel}
                  </button>

                  <button
                    type="button"
                    className="appDialogConfirm"
                    onClick={() =>
                      finishConfirmation("confirm")
                    }
                    autoFocus
                  >
                    {confirmOptions.confirmLabel}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .appToastViewport {
          position: fixed;
          top: 92px;
          right: 20px;
          z-index: 10020;
          display: grid;
          width: min(390px, calc(100vw - 28px));
          gap: 11px;
          pointer-events: none;
        }

        .appToast {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 30px;
          align-items: center;
          gap: 11px;
          padding: 13px 12px;
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(13, 29, 65, 0.98),
              rgba(5, 15, 39, 0.98)
            );
          box-shadow:
            0 18px 48px rgba(0, 0, 0, 0.4),
            0 0 24px rgba(251, 191, 36, 0.08);
          color: #ffffff;
          pointer-events: auto;
          animation: toastEnter 0.22s ease-out;
        }

        .appToast.success {
          border-color: rgba(34, 197, 94, 0.38);
        }

        .appToast.error {
          border-color: rgba(248, 113, 113, 0.42);
        }

        .appToast.warning {
          border-color: rgba(251, 191, 36, 0.48);
        }

        .appToastIcon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: rgba(96, 165, 250, 0.12);
          color: #60a5fa;
          font-size: 15px;
          font-weight: 900;
        }

        .appToast.success .appToastIcon {
          background: rgba(34, 197, 94, 0.13);
          color: #86efac;
        }

        .appToast.error .appToastIcon {
          background: rgba(248, 113, 113, 0.13);
          color: #fca5a5;
        }

        .appToast.warning .appToastIcon {
          background: rgba(251, 191, 36, 0.13);
          color: #fbbf24;
        }

        .appToast p {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
        }

        .appToast button {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #94a3b8;
          font-size: 19px;
          cursor: pointer;
        }

        .appToast button:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }

        .appDialogOverlay {
          position: fixed;
          inset: 0;
          z-index: 10030;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 7, 23, 0.82);
          backdrop-filter: blur(11px);
        }

        .appDialog {
          width: min(100%, 470px);
          padding: 26px;
          border: 1px solid rgba(251, 191, 36, 0.48);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at top right,
              rgba(251, 191, 36, 0.11),
              transparent 40%
            ),
            linear-gradient(
              145deg,
              rgba(14, 29, 64, 0.99),
              rgba(5, 15, 39, 0.99)
            );
          box-shadow:
            0 34px 100px rgba(0, 0, 0, 0.58),
            0 0 45px rgba(251, 191, 36, 0.11);
          color: #ffffff;
          animation: dialogEnter 0.2s ease-out;
        }

        .appDialog.danger {
          border-color: rgba(248, 113, 113, 0.5);
        }

        .appDialogSymbol {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          margin-bottom: 18px;
          border: 1px solid rgba(251, 191, 36, 0.42);
          border-radius: 15px;
          background: rgba(251, 191, 36, 0.11);
          color: #fbbf24;
          font-size: 20px;
          font-weight: 900;
        }

        .appDialog.danger .appDialogSymbol {
          border-color: rgba(248, 113, 113, 0.42);
          background: rgba(248, 113, 113, 0.12);
          color: #fca5a5;
        }

        .appDialogLabel {
          margin: 0 0 8px;
          color: #fbbf24;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .appDialogContent h2 {
          margin: 0;
          color: #ffffff;
          font-size: 24px;
          line-height: 1.15;
        }

        .appDialogContent > p:last-child {
          margin: 13px 0 0;
          color: #a5b0c7;
          font-size: 13px;
          line-height: 1.65;
        }

        .appDialogActions {
          display: flex;
          justify-content: flex-end;
          gap: 11px;
          margin-top: 25px;
        }

        .appDialogActions button {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .appDialogCancel {
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: rgba(255, 255, 255, 0.045);
          color: #ffffff;
        }

        .appDialogConfirm {
          border: 1px solid rgba(251, 191, 36, 0.65);
          background: linear-gradient(
            135deg,
            #fbbf24,
            #f59e0b
          );
          color: #08152f;
          box-shadow: 0 12px 25px rgba(245, 158, 11, 0.18);
        }

        .appDialog.danger .appDialogConfirm {
          border-color: rgba(248, 113, 113, 0.7);
          background: linear-gradient(
            135deg,
            #fb7185,
            #ef4444
          );
          color: #ffffff;
        }

        @keyframes toastEnter {
          from {
            opacity: 0;
            transform: translateX(20px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .appDialogActions.hasSecondary {
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            minmax(0, 1fr);
          gap: 10px;
        }

        .appDialogActions.hasSecondary
        .appDialogConfirm,
        .appDialogActions.hasSecondary
        .appDialogSecondary {
          width: 100%;
          min-height: 49px;
        }

        .appDialogSecondary {
          border: 1px solid
            rgba(251, 191, 36, 0.38);
          border-radius: 13px;
          background:
            rgba(251, 191, 36, 0.08);
          color: #fde68a;
          padding: 12px 15px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .appDialogSecondary:hover {
          transform: translateY(-1px);
          border-color:
            rgba(251, 191, 36, 0.68);
          background:
            rgba(251, 191, 36, 0.14);
        }

        .appDialogLater {
          grid-column: 1 / -1;
          justify-self: center;
          min-height: 34px;
          padding: 5px 12px;
          border-color: transparent;
          background: transparent;
          color: #94a3b8;
          font-size: 12px;
        }

        .appDialogLater:hover {
          background:
            rgba(255, 255, 255, 0.045);
          color: #ffffff;
        }

        .appDialogConfirm.isEmphasized {
          animation:
            appDialogPrimaryPulse
            1.55s ease-in-out infinite;
        }

        @keyframes appDialogPrimaryPulse {
          0%,
          100% {
            transform: translateY(0)
              scale(1);
            box-shadow:
              0 12px 28px
                rgba(245, 158, 11, 0.25);
          }

          50% {
            transform: translateY(-2px)
              scale(1.018);
            box-shadow:
              0 16px 40px
                rgba(245, 158, 11, 0.52),
              0 0 24px
                rgba(251, 191, 36, 0.27);
          }
        }

        @media (max-width: 560px) {
          .appDialogActions.hasSecondary {
            grid-template-columns: 1fr;
          }

          .appDialogLater {
            grid-column: auto;
          }
        }


        @keyframes dialogEnter {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 600px) {
          .appToastViewport {
            top: 78px;
            right: 14px;
          }

          .appDialogOverlay {
            align-items: end;
            padding: 10px;
          }

          .appDialog {
            padding: 21px 18px;
            border-radius: 21px;
          }

          .appDialogContent h2 {
            font-size: 21px;
          }

          .appDialogActions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </AppDialogContext.Provider>
  );
}
