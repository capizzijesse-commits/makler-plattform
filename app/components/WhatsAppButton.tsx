"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const message =
    "Hallo Inserat-AI, ich interessiere mich für eine Demo.";

  const jesseWhatsappUrl =
    `https://wa.me/41772323567?text=${encodeURIComponent(
      message
    )}`;

  const danjaWhatsappUrl =
    `https://wa.me/41772317259?text=${encodeURIComponent(
      message
    )}`;

  useEffect(() => {
    const openContact = () => setOpen(true);
    const closeContact = () => setOpen(false);

    window.addEventListener(
      "inserat-ai:open-contact",
      openContact
    );

    window.addEventListener(
      "inserat-ai:close-contact",
      closeContact
    );

    return () => {
      window.removeEventListener(
        "inserat-ai:open-contact",
        openContact
      );

      window.removeEventListener(
        "inserat-ai:close-contact",
        closeContact
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleMouseDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "mousedown",
        handleMouseDown
      );
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <section
      ref={panelRef}
      className="contactPanel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="contact-panel-title"
    >
      <header className="contactHeader">
        <div>
          <span>INSERAT-AI</span>
          <h2 id="contact-panel-title">Kontakt</h2>
          <p>Wir helfen dir gerne persönlich weiter.</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Kontaktfenster schliessen"
        >
          ×
        </button>
      </header>

      <div className="contactPerson">
        <strong>Jesse Capizzi</strong>

        <div className="contactActions">
          <a href="tel:+41772323567">
            Telefon
          </a>

          <a
            href={jesseWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsappAction"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div className="contactPerson">
        <strong>Danja D&apos;Angelo</strong>

        <div className="contactActions">
          <a href="tel:+41772317259">
            Telefon
          </a>

          <a
            href={danjaWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsappAction"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <style jsx>{`
        .contactPanel {
          position: fixed;
          right: 20px;
          bottom: 98px;
          z-index: 10000;
          width: min(360px, calc(100vw - 32px));
          overflow: hidden;
          border: 1px solid rgba(74, 222, 128, 0.42);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(12, 30, 56, 0.99),
              rgba(5, 16, 37, 0.99)
            );
          color: #ffffff;
          box-shadow:
            0 28px 80px rgba(2, 8, 23, 0.54),
            0 0 30px rgba(34, 197, 94, 0.12);
        }

        .contactHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.09);
        }

        .contactHeader span {
          color: #4ade80;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .contactHeader h2 {
          margin: 5px 0 0;
          font-size: 21px;
        }

        .contactHeader p {
          margin: 6px 0 0;
          color: #9eacc1;
          font-size: 11px;
        }

        .contactHeader button {
          display: grid;
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          cursor: pointer;
          font-size: 21px;
        }

        .contactPerson {
          padding: 16px 20px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.07);
        }

        .contactPerson:last-of-type {
          border-bottom: 0;
        }

        .contactPerson strong {
          display: block;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .contactActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .contactActions a {
          display: flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
          font-size: 11px;
          font-weight: 850;
          text-decoration: none;
        }

        .contactActions .whatsappAction {
          border-color: rgba(134, 239, 172, 0.4);
          background:
            linear-gradient(
              145deg,
              #22c55e,
              #15803d
            );
        }

        @media (max-width: 640px) {
          .contactPanel {
            right: 8px;
            bottom: calc(
              82px + env(safe-area-inset-bottom)
            );
            width: calc(100vw - 16px);
          }
        }

        @media print {
          .contactPanel {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
