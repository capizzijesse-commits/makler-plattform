"use client";

import { useState } from "react";

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false);

  const message = "Hallo Inserat-AI, ich interessiere mich für eine Demo.";

  const jessePhone = "41772323567";
  const danjaPhone = "41772317259";

  const jesseWhatsappUrl = `https://wa.me/${jessePhone}?text=${encodeURIComponent(message)}`;
  const danjaWhatsappUrl = `https://wa.me/${danjaPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-72 rounded-2xl border border-white/10 bg-white p-4 text-slate-900 shadow-2xl">
          <p className="mb-3 text-sm font-black text-slate-700">
            Inserat-AI Kontakt
          </p>

          <a href="tel:+41772323567" className="mb-2 flex items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            📞 Jesse Capizzi anrufen
          </a>

          <a href={jesseWhatsappUrl} target="_blank" rel="noopener noreferrer" className="mb-2 flex items-center gap-3 rounded-xl bg-green-500 px-4 py-3 text-sm font-black text-white">
            💬 Jesse Capizzi WhatsApp
          </a>

          <a href="tel:+41772317259" className="mb-2 flex items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            📞 Danja D&apos;Angelo anrufen
          </a>

          <a href={danjaWhatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-green-500 px-4 py-3 text-sm font-black text-white">
            💬 Danja D&apos;Angelo WhatsApp
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Kontakt öffnen"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-2xl transition hover:scale-110 hover:bg-green-600"
      >
        💬
      </button>
    </div>
  );
}