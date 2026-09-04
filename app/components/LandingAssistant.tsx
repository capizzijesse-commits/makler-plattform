"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { InseratAiMarket } from "@/lib/inserat-ai-market";

type LandingAssistantProps = {
  market: InseratAiMarket;
};

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type GuideResponse = {
  success?: boolean;
  answer?: string;
  error?: string;
};

function createId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export default function LandingAssistant({
  market,
}: LandingAssistantProps) {
  const isGermany = market === "DE";

  const initialMessage = useMemo<ChatMessage>(
    () => ({
      id: `welcome-${market}`,
      role: "assistant",
      content: isGermany
        ? "Hallo! Frag mich alles zu Inserat-AI, dem Deutschland-Start, den Preisen oder dazu, wie die Plattform deinen Vermarktungsalltag erleichtern kann."
        : "Hallo! Frag mich alles zu Inserat-AI, den Preisen oder dazu, wie die Plattform deinen Vermarktungsalltag erleichtern kann.",
    }),
    [isGermany, market]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    initialMessage,
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const quickQuestions = isGermany
    ? [
        "Was kostet Inserat-AI in Deutschland?",
        "Was kann ich kostenlos testen?",
        "Für wen eignet sich Inserat-AI?",
      ]
    : [
        "Was kostet Inserat-AI?",
        "Was kann ich kostenlos testen?",
        "Was spart mir Inserat-AI im Alltag?",
      ];

  async function submitQuestion(question: string) {
    const cleanQuestion = question.trim().slice(0, 1_000);

    if (!cleanQuestion || isSending) {
      return;
    }

    const previousMessages = messages.slice(-6);
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: cleanQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);

    trackAnalyticsEvent("landing_chat_question", {
      market,
      page_path: window.location.pathname,
    });

    try {
      const response = await fetch("/api/public/guide", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanQuestion,
          market,
          messages: previousMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = (await response
        .json()
        .catch(() => null)) as GuideResponse | null;

      if (
        !response.ok ||
        !data?.success ||
        typeof data.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error(
          data?.error ||
            "Der Inserat-AI Berater ist momentan nicht erreichbar."
        );
      }

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: data.answer!.trim(),
        },
      ]);

      trackAnalyticsEvent("landing_chat_answer", {
        market,
        page_path: window.location.pathname,
      });
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Der Inserat-AI Berater ist momentan nicht erreichbar.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(input);
  }

  return (
    <section
      id="beratung"
      aria-labelledby="landing-assistant-title"
      className="relative mx-auto mt-16 max-w-6xl px-4 sm:px-6 md:mt-24"
    >
      <div className="grid overflow-hidden rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-slate-950 via-[#08142d] to-[#0a2752] shadow-2xl shadow-black/30 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative p-7 md:p-10 lg:p-12">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <span className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
              Fragen vor dem Start?
            </span>

            <h2
              id="landing-assistant-title"
              className="mt-4 text-3xl font-black tracking-[-0.04em] text-white md:text-5xl"
            >
              Frag Inserat-AI direkt.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              Keine Verkaufsschleife: Der öffentliche Inserat-AI Berater erklärt Funktionen, Preise und den Einstieg. Er hat keinen Zugriff auf Konten oder Objektdaten.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isSending}
                  onClick={() => void submitQuestion(question)}
                  className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-left text-sm font-bold text-slate-200 transition hover:border-amber-300/40 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>

            <a
              href={
                isGermany
                  ? "/register?plan=founder"
                  : "/register"
              }
              onClick={() =>
                trackAnalyticsEvent("register_cta_click", {
                  cta_page: window.location.pathname,
                  cta_text: isGermany
                    ? "Founder kostenlos testen"
                    : "Kostenlos starten",
                  requested_plan: isGermany
                    ? "founder"
                    : "none",
                })
              }
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5"
            >
              {isGermany
                ? "Founder kostenlos testen"
                : "Kostenlos starten"}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/20 p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-8">
          <div className="flex min-h-[430px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/70">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-black text-white">
                  Inserat-AI Berater
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Öffentlich · keine Kontodaten
                </div>
              </div>

              <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Online
              </span>
            </div>

            <div
              aria-live="polite"
              className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-amber-300 px-4 py-3 text-sm font-semibold leading-6 text-slate-950"
                      : "max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-6 text-slate-200"
                  }
                >
                  {message.content}
                </div>
              ))}

              {isSending && (
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-400">
                  Antwort wird erstellt …
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-white/10 p-3 sm:p-4"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  maxLength={1_000}
                  disabled={isSending}
                  placeholder="Deine Frage zu Inserat-AI …"
                  aria-label="Frage an Inserat-AI"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/50 disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Senden
                </button>
              </div>

              <p className="mt-2 px-1 text-[11px] leading-4 text-slate-500">
                Der öffentliche Berater beantwortet nur Fragen zu Inserat-AI und allgemeiner Immobilienvermarktung.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
