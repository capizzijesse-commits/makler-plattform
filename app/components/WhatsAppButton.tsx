"use client";

export default function WhatsAppButton() {
  const phone = "41772317259";
  const message =
    "Hallo Inserat-AI, ich interessiere mich für eine Demo.";

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Kontakt"
      className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-2xl transition hover:scale-110 hover:bg-green-600"
    >
      💬
    </a>
  );
}