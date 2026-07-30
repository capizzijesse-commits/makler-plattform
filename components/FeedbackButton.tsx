"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

type SubmitStatus =
  | "idle"
  | "sending"
  | "success"
  | "error";

export default function FeedbackButton() {
  const t = useTranslations("Feedback");

  const feedbackCategories = [
    {
      value: "Idee",
      label: t("categories.idea"),
    },
    {
      value: "Problem",
      label: t("categories.problem"),
    },
    {
      value: "Frage",
      label: t("categories.question"),
    },
    {
      value: "Sonstiges",
      label: t("categories.other"),
    },
  ];

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Idee");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] =
    useState<SubmitStatus>("idle");
  const [statusMessage, setStatusMessage] =
    useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open]);

  useEffect(() => {
    const openFeedback = () => setOpen(true);
    const closeFeedback = () => setOpen(false);

    window.addEventListener(
      "inserat-ai:open-feedback",
      openFeedback
    );

    window.addEventListener(
      "inserat-ai:close-feedback",
      closeFeedback
    );

    return () => {
      window.removeEventListener(
        "inserat-ai:open-feedback",
        openFeedback
      );

      window.removeEventListener(
        "inserat-ai:close-feedback",
        closeFeedback
      );
    };
  }, []);
  function closeDialog() {
    if (status === "sending") {
      return;
    }

    setOpen(false);
    setStatus("idle");
    setStatusMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanedMessage = message.trim();

    if (cleanedMessage.length < 5) {
      setStatus("error");
      setStatusMessage(
        t("validation.moreDetail")
      );
      return;
    }

    setStatus("sending");
    setStatusMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          email: email.trim(),
          message: cleanedMessage,
          company,
          page: window.location.href,
        }),
      });

      const result: { error?: string } =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          t("errors.sendFailed")
        );
      }

      setStatus("success");
      setStatusMessage(
        t("success.sent")
      );

      setMessage("");
      setCompany("");
    } catch (error) {
      setStatus("error");
      console.error(
        "FEEDBACK SEND ERROR:",
        error
      );
      setStatusMessage(t("errors.sendFailed"));
    }
  }

  return (
    <>
      {open ? (
        <div
          className="feedbackOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <section
            className="feedbackDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <div className="feedbackDialogHeader">
              <div>
                <p>INSERAT AI</p>
                <h2 id="feedback-title">
                  {t("title")}
                </h2>
                <span>{t("subtitle")}</span>
              </div>

              <button
                type="button"
                className="feedbackCloseButton"
                onClick={closeDialog}
                aria-label={t("close")}
              >
                ×
              </button>
            </div>

            <form
              className="feedbackForm"
              onSubmit={handleSubmit}
            >
              <label>
                <span>{t("categoryLabel")}</span>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                >
                  {feedbackCategories.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>{t("emailLabel")}</span>
                <small>{t("emailHint")}</small>

                <input
                  type="email"
                  value={email}
                  maxLength={180}
                  placeholder="name@firma.ch"
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                />
              </label>

              <label>
                <span>{t("messageLabel")}</span>

                <textarea
                  ref={textareaRef}
                  value={message}
                  maxLength={2000}
                  rows={6}
                  placeholder={t("messagePlaceholder")}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                />

                <small className="feedbackCounter">
                  {message.length}/2000
                </small>
              </label>

              <label
                className="feedbackHoneypot"
                aria-hidden="true"
              >
                <span>{t("companyLabel")}</span>
                <input
                  type="text"
                  value={company}
                  tabIndex={-1}
                  autoComplete="off"
                  onChange={(event) =>
                    setCompany(event.target.value)
                  }
                />
              </label>

              {statusMessage ? (
                <p
                  className={`feedbackStatus ${status}`}
                  aria-live="polite"
                >
                  {statusMessage}
                </p>
              ) : null}

              <div className="feedbackActions">
                <button
                  type="button"
                  className="feedbackCancelButton"
                  onClick={closeDialog}
                  disabled={status === "sending"}
                >
                  {t("actions.cancel")}
                </button>

                <button
                  type="submit"
                  className="feedbackSubmitButton"
                  disabled={status === "sending"}
                >
                  {status === "sending"
                    ? t("actions.sending")
                    : t("actions.send")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .feedbackFloatingButton {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 9998;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-height: 46px;
          padding: 0 18px;
          border: 1px solid rgba(251, 191, 36, 0.55);
          border-radius: 999px;
          background:
            linear-gradient(
              135deg,
              rgba(251, 191, 36, 0.96),
              rgba(245, 158, 11, 0.96)
            );
          box-shadow:
            0 14px 36px rgba(0, 0, 0, 0.3),
            0 0 24px rgba(251, 191, 36, 0.18);
          color: #081531;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .feedbackFloatingButton:hover {
          transform: translateY(-3px);
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.34),
            0 0 30px rgba(251, 191, 36, 0.27);
        }

        .feedbackButtonDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 11px rgba(34, 211, 238, 0.8);
        }

        .feedbackOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 7, 23, 0.78);
          backdrop-filter: blur(10px);
        }

        .feedbackDialog {
          width: min(100%, 520px);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border: 1px solid rgba(251, 191, 36, 0.36);
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(14, 28, 62, 0.99),
              rgba(6, 16, 41, 0.99)
            );
          box-shadow:
            0 32px 100px rgba(0, 0, 0, 0.55),
            0 0 45px rgba(251, 191, 36, 0.1);
          color: #ffffff;
        }

        .feedbackDialogHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 25px 25px 20px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.09);
        }

        .feedbackDialogHeader p {
          margin: 0 0 7px;
          color: #fbbf24;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .feedbackDialogHeader h2 {
          margin: 0;
          font-size: 25px;
          line-height: 1.1;
        }

        .feedbackDialogHeader span {
          display: block;
          margin-top: 8px;
          color: #98a5c0;
          font-size: 12px;
          line-height: 1.5;
        }

        .feedbackCloseButton {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-size: 22px;
          cursor: pointer;
        }

        .feedbackForm {
          display: grid;
          gap: 17px;
          padding: 24px 25px 25px;
        }

        .feedbackForm label {
          display: grid;
          gap: 7px;
        }

        .feedbackForm label > span {
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
        }

        .feedbackForm label > small {
          margin-top: -4px;
          color: #8492af;
          font-size: 10px;
        }

        .feedbackForm input,
        .feedbackForm select,
        .feedbackForm textarea {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 13px;
          background: rgba(3, 12, 34, 0.72);
          color: #ffffff;
          font: inherit;
          outline: none;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .feedbackForm input,
        .feedbackForm select {
          height: 47px;
          padding: 0 14px;
        }

        .feedbackForm textarea {
          min-height: 135px;
          padding: 13px 14px;
          resize: vertical;
          line-height: 1.55;
        }

        .feedbackForm input:focus,
        .feedbackForm select:focus,
        .feedbackForm textarea:focus {
          border-color: rgba(34, 211, 238, 0.72);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
        }

        .feedbackForm option {
          background: #0b1736;
          color: #ffffff;
        }

        .feedbackCounter {
          justify-self: end;
        }

        .feedbackHoneypot {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
        }

        .feedbackStatus {
          margin: 0;
          padding: 11px 13px;
          border-radius: 11px;
          font-size: 11px;
          line-height: 1.45;
        }

        .feedbackStatus.success {
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.1);
          color: #bbf7d0;
        }

        .feedbackStatus.error {
          border: 1px solid rgba(248, 113, 113, 0.3);
          background: rgba(248, 113, 113, 0.1);
          color: #fecaca;
        }

        .feedbackActions {
          display: flex;
          justify-content: flex-end;
          gap: 11px;
          margin-top: 3px;
        }

        .feedbackActions button {
          min-height: 43px;
          padding: 0 17px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .feedbackActions button:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        .feedbackCancelButton {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
        }

        .feedbackSubmitButton {
          border: 1px solid rgba(251, 191, 36, 0.55);
          background:
            linear-gradient(
              135deg,
              #fbbf24,
              #f59e0b
            );
          color: #081531;
        }

        @media (max-width: 600px) {
          .feedbackFloatingButton {
            right: 14px;
            bottom: 14px;
            min-height: 43px;
            padding: 0 15px;
          }

          .feedbackOverlay {
            align-items: end;
            padding: 10px;
          }

          .feedbackDialog {
            width: 100%;
            max-height: calc(100vh - 20px);
            border-radius: 21px;
          }

          .feedbackDialogHeader,
          .feedbackForm {
            padding-right: 18px;
            padding-left: 18px;
          }

          .feedbackActions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}


