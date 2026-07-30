"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type SpeechAlternative = {
  transcript: string;
  confidence?: number;
};

type SpeechResult = {
  readonly length: number;
  readonly isFinal?: boolean;
  [index: number]: SpeechAlternative;
};

type SpeechResultList = {
  readonly length: number;
  [index: number]: SpeechResult;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechResultList;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: BrowserSpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((event: BrowserSpeechRecognitionErrorEvent) => void)
    | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor =
  new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?:
      BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?:
      BrowserSpeechRecognitionConstructor;
  }
}

const STORAGE_KEY = "inserat-ai-guide-history-v2";

type SupportedLocale = "de" | "it" | "fr" | "en";

function normalizeLocale(value: string): SupportedLocale {
  if (value === "it" || value === "fr" || value === "en") {
    return value;
  }

  return "de";
}

function getSpeechRecognitionLocale(
  locale: SupportedLocale
): string {
  const locales: Record<SupportedLocale, string> = {
    de: "de-CH",
    it: "it-CH",
    fr: "fr-CH",
    en: "en-CH",
  };

  return locales[locale];
}

function createWelcomeMessage(content: string): ChatMessage {
  return {
    id: "guide-welcome",
    role: "assistant",
    content,
  };
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStoredMessages(
  value: unknown
): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item): ChatMessage[] => {
      if (!isRecord(item)) return [];

      const role = item.role;
      const content = item.content;
      const id = item.id;

      if (
        (role !== "user" && role !== "assistant") ||
        typeof content !== "string" ||
        !content.trim()
      ) {
        return [];
      }

      return [
        {
          id:
            typeof id === "string" && id
              ? id
              : createMessageId(),
          role,
          content: content.trim().slice(0, 8_000),
        },
      ];
    })
    .slice(-30);
}

function isGuidePage(pathname: string): boolean {
  return (
    pathname !== "/impressum" &&
    pathname !== "/datenschutz"
  );
}

function getListingId(pathname: string): string | null {
  const match = pathname.match(
    /^\/(?:cockpit|expose)\/([^/]+)(?:\/(?:edit|home-staging))?\/?$/
  );

  return match?.[1]
    ? decodeURIComponent(match[1])
    : null;
}

function getPageLabelKey(pathname: string): string {
  if (pathname === "/cockpit") {
    return "pages.cockpit";
  }

  if (
    /^\/cockpit\/[^/]+\/home-staging\/?$/.test(
      pathname
    )
  ) {
    return "pages.homeStaging";
  }

  if (/^\/cockpit\/[^/]+\/edit\/?$/.test(pathname)) {
    return "pages.edit";
  }

  if (/^\/cockpit\/[^/]+\/?$/.test(pathname)) {
    return "pages.details";
  }

  if (pathname === "/dashboard/social-media") {
    return "pages.socialMedia";
  }

  if (pathname === "/dashboard/tour-guide") {
    return "pages.tourGuide";
  }

  if (pathname === "/dashboard") {
    return "pages.dashboard";
  }

  if (/^\/expose\/[^/]+\/?$/.test(pathname)) {
    return "pages.expose";
  }

  if (pathname === "/konto") {
    return "pages.account";
  }

  return "pages.default";
}

type GuideQuickAction = {
  label: string;
  prompt: string;
};

type GuideQuickActionKey = {
  labelKey: string;
  promptKey: string;
};

function getQuickActionKeys(
  pathname: string
): GuideQuickActionKey[] {
  if (pathname === "/cockpit") {
    return [
      {
        labelKey: "quick.cockpit.nextStep.label",
        promptKey: "quick.cockpit.nextStep.prompt",
      },
      {
        labelKey: "quick.cockpit.prepareObject.label",
        promptKey: "quick.cockpit.prepareObject.prompt",
      },
      {
        labelKey: "quick.cockpit.planMarketing.label",
        promptKey: "quick.cockpit.planMarketing.prompt",
      },
    ];
  }

  if (
    /^\/cockpit\/[^/]+\/home-staging\/?$/.test(
      pathname
    )
  ) {
    return [
      {
        labelKey: "quick.homeStaging.recommendStyle.label",
        promptKey: "quick.homeStaging.recommendStyle.prompt",
      },
      {
        labelKey: "quick.homeStaging.formulateRequest.label",
        promptKey: "quick.homeStaging.formulateRequest.prompt",
      },
      {
        labelKey: "quick.homeStaging.furnishRoom.label",
        promptKey: "quick.homeStaging.furnishRoom.prompt",
      },
      {
        labelKey: "quick.homeStaging.reviewResult.label",
        promptKey: "quick.homeStaging.reviewResult.prompt",
      },
    ];
  }

  if (/^\/cockpit\/[^/]+\/edit\/?$/.test(pathname)) {
    return [
      {
        labelKey: "quick.edit.missingDetails.label",
        promptKey: "quick.edit.missingDetails.prompt",
      },
      {
        labelKey: "quick.edit.createHighlights.label",
        promptKey: "quick.edit.createHighlights.prompt",
      },
      {
        labelKey: "quick.edit.improveObject.label",
        promptKey: "quick.edit.improveObject.prompt",
      },
      {
        labelKey: "quick.edit.nextStep.label",
        promptKey: "quick.edit.nextStep.prompt",
      },
    ];
  }

  if (/^\/cockpit\/[^/]+\/?$/.test(pathname)) {
    return [
      {
        labelKey: "quick.details.reviewObject.label",
        promptKey: "quick.details.reviewObject.prompt",
      },
      {
        labelKey: "quick.details.nextStep.label",
        promptKey: "quick.details.nextStep.prompt",
      },
      {
        labelKey: "quick.details.prepareListing.label",
        promptKey: "quick.details.prepareListing.prompt",
      },
      {
        labelKey: "quick.details.socialMedia.label",
        promptKey: "quick.details.socialMedia.prompt",
      },
    ];
  }

  if (pathname === "/dashboard/social-media") {
    return [
      {
        labelKey: "quick.socialMedia.instagram.label",
        promptKey: "quick.socialMedia.instagram.prompt",
      },
      {
        labelKey: "quick.socialMedia.facebook.label",
        promptKey: "quick.socialMedia.facebook.prompt",
      },
      {
        labelKey: "quick.socialMedia.hashtags.label",
        promptKey: "quick.socialMedia.hashtags.prompt",
      },
      {
        labelKey: "quick.socialMedia.choosePlatform.label",
        promptKey: "quick.socialMedia.choosePlatform.prompt",
      },
    ];
  }

  if (pathname === "/dashboard/tour-guide") {
    return [
      {
        labelKey: "quick.tourGuide.planTour.label",
        promptKey: "quick.tourGuide.planTour.prompt",
      },
      {
        labelKey: "quick.tourGuide.greeting.label",
        promptKey: "quick.tourGuide.greeting.prompt",
      },
      {
        labelKey: "quick.tourGuide.roomOrder.label",
        promptKey: "quick.tourGuide.roomOrder.prompt",
      },
      {
        labelKey: "quick.tourGuide.improveTour.label",
        promptKey: "quick.tourGuide.improveTour.prompt",
      },
    ];
  }

  if (/^\/expose\/[^/]+\/?$/.test(pathname)) {
    return [
      {
        labelKey: "quick.expose.reviewExpose.label",
        promptKey: "quick.expose.reviewExpose.prompt",
      },
      {
        labelKey: "quick.expose.missingContent.label",
        promptKey: "quick.expose.missingContent.prompt",
      },
      {
        labelKey: "quick.expose.reviewLocation.label",
        promptKey: "quick.expose.reviewLocation.prompt",
      },
      {
        labelKey: "quick.expose.improveImpact.label",
        promptKey: "quick.expose.improveImpact.prompt",
      },
    ];
  }

  if (pathname === "/dashboard") {
    return [
      {
        labelKey: "quick.dashboard.startListing.label",
        promptKey: "quick.dashboard.startListing.prompt",
      },
      {
        labelKey: "quick.dashboard.improveTitle.label",
        promptKey: "quick.dashboard.improveTitle.prompt",
      },
      {
        labelKey: "quick.dashboard.description.label",
        promptKey: "quick.dashboard.description.prompt",
      },
      {
        labelKey: "quick.dashboard.nextStep.label",
        promptKey: "quick.dashboard.nextStep.prompt",
      },
    ];
  }

  if (pathname === "/konto") {
    return [
      {
        labelKey: "quick.account.reviewProfile.label",
        promptKey: "quick.account.reviewProfile.prompt",
      },
      {
        labelKey: "quick.account.contactDetails.label",
        promptKey: "quick.account.contactDetails.prompt",
      },
      {
        labelKey: "quick.account.useInseratAi.label",
        promptKey: "quick.account.useInseratAi.prompt",
      },
    ];
  }

  return [];
}

export default function GuideAssistant() {
  const pathname = usePathname() || "/";
  const locale = normalizeLocale(useLocale());
  const t = useTranslations("GuideAssistant");
  const welcomeMessage = useMemo(
    () => createWelcomeMessage(t("welcome")),
    [t]
  );
  const storageKey = `${STORAGE_KEY}-${locale}`;

  const isVisible = useMemo(
    () => isGuidePage(pathname),
    [pathname]
  );

  const pageLabel = useMemo(
    () => t(getPageLabelKey(pathname) as never),
    [pathname, t]
  );

  const listingId = useMemo(
    () => getListingId(pathname),
    [pathname]
  );

  const quickActions = useMemo<GuideQuickAction[]>(
    () =>
      getQuickActionKeys(pathname).map((action) => ({
        label: t(action.labelKey as never),
        prompt: t(action.promptKey as never),
      })),
    [pathname, t]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    welcomeMessage,
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [
    speechRecognitionSupported,
    setSpeechRecognitionSupported,
  ] = useState(false);
  const [
    speakingMessageId,
    setSpeakingMessageId,
  ] = useState<string | null>(null);
  const [
    speechLoadingMessageId,
    setSpeechLoadingMessageId,
  ] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(
    null
  );
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef =
    useRef<BrowserSpeechRecognition | null>(null);
  const audioRef =
    useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechRequestRef =
    useRef<AbortController | null>(null);
  const hydratedStorageKeyRef =
    useRef<string | null>(null);

  useEffect(() => {
    setSpeechRecognitionSupported(
      Boolean(
        window.SpeechRecognition ||
          window.webkitSpeechRecognition
      )
    );
  }, []);

  useEffect(() => {
    hydratedStorageKeyRef.current = null;
    setIsHydrated(false);

    try {
      const storedValue =
        window.sessionStorage.getItem(storageKey);

      if (storedValue) {
        const parsed: unknown = JSON.parse(storedValue);
        const storedMessages =
          normalizeStoredMessages(parsed);

        setMessages(
          storedMessages.length > 0
            ? storedMessages
            : [welcomeMessage]
        );
      } else {
        setMessages([welcomeMessage]);
      }
    } catch {
      window.sessionStorage.removeItem(storageKey);
      setMessages([welcomeMessage]);
    } finally {
      hydratedStorageKeyRef.current = storageKey;
      setIsHydrated(true);
    }
  }, [storageKey, welcomeMessage]);

  useEffect(() => {
    if (
      !isHydrated ||
      hydratedStorageKeyRef.current !== storageKey
    ) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-30))
      );
    } catch {
      // Der Guide funktioniert auch ohne Session-Speicher.
    }
  }, [isHydrated, messages, storageKey]);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const openGuide = () => setIsOpen(true);
    const closeGuide = () => setIsOpen(false);

    window.addEventListener(
      "inserat-ai:open-guide",
      openGuide
    );

    window.addEventListener(
      "inserat-ai:close-guide",
      closeGuide
    );

    return () => {
      window.removeEventListener(
        "inserat-ai:open-guide",
        openGuide
      );

      window.removeEventListener(
        "inserat-ai:close-guide",
        closeGuide
      );
    };
  }, []);

  useEffect(() => {
    if (isOpen) return;

    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    stopSpeaking();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      speechRequestRef.current?.abort();

      const audio = audioRef.current;

      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = "";
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const messageText = input.trim();

    if (!messageText || isSending) return;

    const previousMessages = messages;
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: messageText,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(
        "/api/guide-assistant",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Inserat-Locale": locale,
          },
          body: JSON.stringify({
            message: messageText,
            messages: previousMessages
              .slice(-12)
              .map((message) => ({
                role: message.role,
                content: message.content,
              })),
            pathname,
            listingId,
            locale,
          }),
        }
      );

      const data: unknown = await response
        .json()
        .catch(() => null);

      if (
        !response.ok ||
        !isRecord(data) ||
        typeof data.answer !== "string" ||
        !data.answer.trim()
      ) {
        const errorMessage =
          isRecord(data) &&
          typeof data.error === "string"
            ? data.error
            : t("errors.answer");

        throw new Error(errorMessage);
      }

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: data.answer.trim(),
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("errors.unreachable");

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
      return;
    }

    const RecognitionConstructor =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      setAudioNotice(
        t("speech.unsupported")
      );
      return;
    }

    stopSpeaking();

    const recognition = new RecognitionConstructor();
    const originalInput = input.trim();

    recognition.lang = getSpeechRecognitionLocale(locale);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (
      event: BrowserSpeechRecognitionEvent
    ) => {
      let transcript = "";

      for (
        let index = 0;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const alternative = result?.[0];

        if (alternative?.transcript) {
          transcript += `${alternative.transcript} `;
        }
      }

      const spokenText = transcript.trim();

      if (!spokenText) return;

      const combinedText = originalInput
        ? `${originalInput} ${spokenText}`
        : spokenText;

      setInput(combinedText.slice(0, 3_000));
      setAudioNotice(t("speech.recognized"));
    };

    recognition.onerror = (
      event: BrowserSpeechRecognitionErrorEvent
    ) => {
      setIsListening(false);
      recognitionRef.current = null;

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setAudioNotice(
          t("speech.microphonePermission")
        );
        return;
      }

      if (event.error === "no-speech") {
        setAudioNotice(
          t("speech.noSpeech")
        );
        return;
      }

      if (event.error === "audio-capture") {
        setAudioNotice(
          t("speech.noMicrophone")
        );
        return;
      }

      setAudioNotice(
        t("speech.inputFailed")
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setAudioNotice(t("speech.listening"));
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setAudioNotice(
        t("speech.microphoneStart")
      );
    }
  }

  function releaseSpeechAudio() {
    const audio = audioRef.current;

    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = "";
    }

    audioRef.current = null;

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function stopSpeaking() {
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;

    releaseSpeechAudio();

    setSpeakingMessageId(null);
    setSpeechLoadingMessageId(null);
  }

  async function toggleSpeaking(message: ChatMessage) {
    const isCurrentMessage =
      speakingMessageId === message.id ||
      speechLoadingMessageId === message.id;

    if (isCurrentMessage) {
      stopSpeaking();
      setAudioNotice(t("speech.outputStopped"));
      return;
    }

    stopListening();
    stopSpeaking();

    const controller = new AbortController();
    speechRequestRef.current = controller;

    setSpeechLoadingMessageId(message.id);
    setAudioNotice(
      t("speech.preparing")
    );

    try {
      const response = await fetch("/api/guide-speech", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Inserat-Locale": locale,
        },
        signal: controller.signal,
        body: JSON.stringify({
          text: message.content,
          locale,
        }),
      });

      if (!response.ok) {
        let errorMessage =
          t("speech.createFailed");

        const contentType =
          response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const result: unknown = await response
            .json()
            .catch(() => null);

          if (
            isRecord(result) &&
            typeof result.error === "string"
          ) {
            errorMessage = result.error;
          }
        }

        throw new Error(errorMessage);
      }

      const audioBlob = await response.blob();

      if (!audioBlob.size) {
        throw new Error(
          t("speech.emptyAudio")
        );
      }

      const audioUrl =
        URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);

      audioUrlRef.current = audioUrl;
      audioRef.current = audio;
      speechRequestRef.current = null;

      audio.preload = "auto";

      audio.onended = () => {
        releaseSpeechAudio();
        setSpeakingMessageId(null);
        setAudioNotice(t("speech.finished"));
      };

      audio.onerror = () => {
        releaseSpeechAudio();
        setSpeakingMessageId(null);
        setAudioNotice(
          t("speech.playbackFailed")
        );
      };

      setSpeechLoadingMessageId(null);
      setSpeakingMessageId(message.id);
      setAudioNotice(
        t("speech.playing")
      );

      await audio.play();
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      releaseSpeechAudio();
      setSpeakingMessageId(null);
      setSpeechLoadingMessageId(null);

      setAudioNotice(
        error instanceof Error
          ? error.message
          : t("speech.unavailable")
      );
    } finally {
      if (speechRequestRef.current === controller) {
        speechRequestRef.current = null;
      }
    }
  }

  function selectQuickAction(prompt: string) {
    setInput(prompt);
    setAudioNotice("");

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  function handleTextareaKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function startNewConversation() {
    setMessages([welcomeMessage]);
    setInput("");
    setAudioNotice("");

    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Keine weitere Aktion notwendig.
    }

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="guide-root">
      {isOpen ? (
        <section
          className="guide-panel"
          aria-label={t("aria.panel")}
        >
          <header className="guide-header">
            <div className="guide-title-area">
              <div
                className="guide-logo"
                aria-hidden="true"
              >
                AI
              </div>

              <div>
                <h2>Inserat-AI Guide</h2>

                <div className="guide-context">
                  <span
                    className="guide-status-dot"
                    aria-hidden="true"
                  />
                  <span>{pageLabel}</span>
                </div>
              </div>
            </div>

            <div className="guide-header-actions">
              <button
                type="button"
                className="guide-header-button"
                onClick={startNewConversation}
                title={t("aria.newChat")}
                aria-label={t("aria.newChat")}
              >
                ↻
              </button>

              <button
                type="button"
                className="guide-header-button"
                onClick={() => setIsOpen(false)}
                title={t("aria.close")}
                aria-label={t("aria.close")}
              >
                ×
              </button>
            </div>
          </header>

          <div
            className="guide-messages"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`guide-message-row ${
                  message.role === "user"
                    ? "guide-message-row-user"
                    : ""
                }`}
              >
                <div className="guide-message-stack">
                  <div
                    className={`guide-message ${
                      message.role === "user"
                        ? "guide-message-user"
                        : "guide-message-assistant"
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.role === "assistant" ? (
                    <button
                      type="button"
                      className={`guide-speech-button ${
                        speakingMessageId === message.id ||
                        speechLoadingMessageId === message.id
                          ? "guide-speech-button-active"
                          : ""
                      }`}
                      onClick={() =>
                        toggleSpeaking(message)
                      }
                      aria-label={
                        speechLoadingMessageId === message.id
                          ? t("speech.cancelOutput")
                          : speakingMessageId === message.id
                            ? t("speech.stopReading")
                            : t("speech.readAnswer")
                      }
                      title={
                        speechLoadingMessageId === message.id
                          ? t("speech.cancelOutput")
                          : speakingMessageId === message.id
                            ? t("speech.stopReading")
                            : t("speech.readWithAi")
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 9.5v5h3.2l4.3 3.5V6L7.2 9.5H4Z"
                          fill="currentColor"
                        />
                        <path
                          d="M15 9a4 4 0 0 1 0 6M17.8 6.5a7.2 7.2 0 0 1 0 11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>

                      <span>
                        {speechLoadingMessageId === message.id
                          ? t("speech.loading")
                          : speakingMessageId === message.id
                            ? t("speech.stop")
                            : t("speech.read")}
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {isSending ? (
              <div className="guide-message-row">
                <div className="guide-message guide-message-assistant guide-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {quickActions.length > 0 ? (
            <div
              className="guide-quick-actions"
              aria-label={t("aria.suggestions")}
            >
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="guide-quick-action"
                  onClick={() =>
                    selectQuickAction(action.prompt)
                  }
                  disabled={isSending}
                  title={action.prompt}
                >
                  <span aria-hidden="true">✦</span>
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="guide-composer"
            onSubmit={sendMessage}
          >
            <button
              type="button"
              className={`guide-audio-button ${
                isListening
                  ? "guide-audio-button-listening"
                  : ""
              }`}
              onClick={toggleListening}
              disabled={
                !speechRecognitionSupported ||
                isSending
              }
              aria-label={
                isListening
                  ? t("speech.stopInput")
                  : t("speech.speakQuestion")
              }
              title={
                speechRecognitionSupported
                  ? isListening
                    ? t("speech.stopRecording")
                    : t("speech.speakQuestion")
                  : t("speech.unsupported")
              }
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="9"
                  y="3"
                  width="6"
                  height="11"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleTextareaKeyDown}
              maxLength={3_000}
              rows={1}
              placeholder={t("composer.placeholder")}
              aria-label={t("composer.messageAria")}
              disabled={isSending}
            />

            <button
              type="submit"
              className="guide-send"
              disabled={!input.trim() || isSending}
              aria-label={t("composer.sendAria")}
            >
              ➜
            </button>
          </form>

          {audioNotice ? (
            <div
              className="guide-audio-notice"
              aria-live="polite"
            >
              <span
                className={
                  isListening
                    ? "guide-audio-live-dot"
                    : ""
                }
                aria-hidden="true"
              />
              {audioNotice}
            </div>
          ) : null}

          <div className="guide-disclaimer">
            {t("disclaimer")}
          </div>
        </section>
      ) : null}

      <style jsx>{`
        .guide-root {
          position: relative;
          z-index: 2147480000;
        }

        .guide-launcher {
          position: fixed;
          right: 24px;
          bottom: 164px;
          z-index: 2147480000;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-height: 52px;
          padding: 0 18px 0 12px;
          border: 1px solid rgba(216, 178, 92, 0.72);
          border-radius: 999px;
          background:
            linear-gradient(
              145deg,
              rgba(14, 31, 58, 0.98),
              rgba(6, 18, 38, 0.98)
            );
          color: #f6e4b4;
          box-shadow:
            0 18px 45px rgba(2, 8, 23, 0.34),
            0 0 0 1px rgba(255, 255, 255, 0.04)
              inset;
          cursor: pointer;
          font: inherit;
          font-weight: 800;
          letter-spacing: 0.02em;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .guide-launcher:hover {
          transform: translateY(-2px);
          border-color: rgba(237, 204, 128, 0.95);
          box-shadow:
            0 22px 52px rgba(2, 8, 23, 0.42),
            0 0 24px rgba(216, 178, 92, 0.16);
        }

        .guide-launcher:focus-visible,
        .guide-header-button:focus-visible,
        .guide-send:focus-visible,
        .guide-composer textarea:focus-visible {
          outline: 2px solid #e7c36b;
          outline-offset: 3px;
        }

        .guide-launcher-icon {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 50%;
          background:
            linear-gradient(145deg, #f1d184, #b8862f);
          color: #08172d;
          font-size: 17px;
          box-shadow: 0 5px 16px rgba(216, 178, 92, 0.3);
        }

        .guide-panel {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 2147480001;
          display: flex;
          width: min(400px, calc(100vw - 32px));
          height: min(650px, calc(100vh - 48px));
          max-height: 760px;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(216, 178, 92, 0.56);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at top right,
              rgba(39, 69, 111, 0.3),
              transparent 38%
            ),
            linear-gradient(
              180deg,
              #0b1d38 0%,
              #07152b 100%
            );
          color: #f8fafc;
          box-shadow:
            0 30px 90px rgba(2, 8, 23, 0.54),
            0 0 0 1px rgba(255, 255, 255, 0.035)
              inset;
        }

        .guide-header {
          display: flex;
          min-height: 82px;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px 17px;
          border-bottom: 1px solid
            rgba(216, 178, 92, 0.2);
          background: rgba(5, 17, 37, 0.52);
          backdrop-filter: blur(14px);
        }

        .guide-title-area {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
        }

        .guide-logo {
          display: grid;
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(248, 221, 154, 0.66);
          border-radius: 14px;
          background:
            linear-gradient(145deg, #e5c36e, #a97828);
          color: #07152b;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: -0.03em;
          box-shadow: 0 8px 25px rgba(216, 178, 92, 0.22);
        }

        .guide-title-area h2 {
          margin: 0;
          color: #fff8e6;
          font-size: 16px;
          font-weight: 850;
          line-height: 1.2;
        }

        .guide-context {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 7px;
          margin-top: 5px;
          color: #aebdd3;
          font-size: 12px;
          line-height: 1.2;
        }

        .guide-context span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .guide-status-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #55d68b;
          box-shadow: 0 0 10px rgba(85, 214, 139, 0.72);
        }

        .guide-header-actions {
          display: flex;
          flex: 0 0 auto;
          gap: 7px;
        }

        .guide-header-button {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border: 1px solid rgba(216, 178, 92, 0.22);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.045);
          color: #eed89e;
          cursor: pointer;
          font: inherit;
          font-size: 21px;
          line-height: 1;
          transition:
            background 150ms ease,
            border-color 150ms ease;
        }

        .guide-header-button:hover {
          border-color: rgba(216, 178, 92, 0.58);
          background: rgba(216, 178, 92, 0.11);
        }

        .guide-messages {
          flex: 1 1 auto;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 20px 16px 16px;
          scrollbar-color:
            rgba(216, 178, 92, 0.48)
            rgba(255, 255, 255, 0.03);
          scrollbar-width: thin;
        }

        .guide-message-row {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 12px;
        }

        .guide-message-row-user {
          justify-content: flex-end;
        }

        .guide-message-stack {
          display: grid;
          max-width: 88%;
          gap: 6px;
          justify-items: start;
        }

        .guide-message-row-user
          .guide-message-stack {
          justify-items: end;
        }

        .guide-message-stack .guide-message {
          max-width: 100%;
        }

        .guide-speech-button {
          display: inline-flex;
          min-height: 28px;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border: 1px solid rgba(216, 178, 92, 0.2);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.045);
          color: #9fb0c7;
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          font-weight: 750;
          transition:
            color 150ms ease,
            border-color 150ms ease,
            background 150ms ease;
        }

        .guide-speech-button svg {
          width: 14px;
          height: 14px;
        }

        .guide-speech-button:hover:not(:disabled),
        .guide-speech-button-active {
          border-color: rgba(98, 230, 255, 0.55);
          background: rgba(98, 230, 255, 0.1);
          color: #9ff4ff;
        }

        .guide-speech-button:disabled {
          cursor: not-allowed;
          opacity: 0.35;
        }

        .guide-message {
          max-width: 88%;
          padding: 11px 13px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.52;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .guide-message-assistant {
          border: 1px solid rgba(216, 178, 92, 0.18);
          border-bottom-left-radius: 5px;
          background: rgba(255, 255, 255, 0.065);
          color: #e9eef6;
        }

        .guide-message-user {
          border: 1px solid rgba(233, 199, 119, 0.48);
          border-bottom-right-radius: 5px;
          background:
            linear-gradient(
              145deg,
              rgba(205, 162, 67, 0.96),
              rgba(154, 111, 31, 0.96)
            );
          color: #07152b;
          font-weight: 650;
          box-shadow: 0 7px 18px rgba(2, 8, 23, 0.18);
        }

        .guide-thinking {
          display: flex;
          width: 60px;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 41px;
        }

        .guide-thinking span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e2c36f;
          animation: guide-bounce 1.1s infinite ease-in-out;
        }

        .guide-thinking span:nth-child(2) {
          animation-delay: 0.14s;
        }

        .guide-thinking span:nth-child(3) {
          animation-delay: 0.28s;
        }

        .guide-quick-actions {
          display: flex;
          flex: 0 0 auto;
          gap: 7px;
          overflow-x: auto;
          padding: 10px 14px 9px;
          border-top: 1px solid
            rgba(216, 178, 92, 0.14);
          background: rgba(5, 16, 35, 0.72);
          scrollbar-width: thin;
          scrollbar-color:
            rgba(126, 92, 246, 0.48)
            transparent;
        }

        .guide-quick-action {
          display: inline-flex;
          min-height: 32px;
          flex: 0 0 auto;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid
            rgba(117, 196, 255, 0.24);
          border-radius: 999px;
          background:
            linear-gradient(
              135deg,
              rgba(24, 90, 155, 0.24),
              rgba(109, 40, 217, 0.2)
            );
          color: #dcecff;
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          transition:
            transform 150ms ease,
            border-color 150ms ease,
            background 150ms ease;
        }

        .guide-quick-action span {
          color: #d7bcff;
          font-size: 11px;
        }

        .guide-quick-action:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color:
            rgba(156, 224, 255, 0.58);
          background:
            linear-gradient(
              135deg,
              rgba(17, 132, 184, 0.34),
              rgba(126, 52, 220, 0.32)
            );
        }

        .guide-quick-action:focus-visible {
          outline: 2px solid #8ce7ff;
          outline-offset: 2px;
        }

        .guide-quick-action:disabled {
          cursor: not-allowed;
          opacity: 0.42;
        }

        .guide-composer {
          display: flex;
          align-items: flex-end;
          gap: 9px;
          padding: 13px 14px 10px;
          border-top: 1px solid
            rgba(216, 178, 92, 0.18);
          background: rgba(4, 14, 31, 0.78);
        }

        .guide-audio-button {
          position: relative;
          display: grid;
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          place-items: center;
          border: 1px solid rgba(108, 229, 255, 0.3);
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              rgba(25, 82, 139, 0.72),
              rgba(81, 42, 145, 0.72)
            );
          color: #b8f5ff;
          cursor: pointer;
          transition:
            transform 150ms ease,
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .guide-audio-button svg {
          width: 21px;
          height: 21px;
        }

        .guide-audio-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(132, 240, 255, 0.72);
          box-shadow: 0 0 20px rgba(66, 210, 255, 0.18);
        }

        .guide-audio-button-listening {
          border-color: rgba(255, 115, 197, 0.9);
          background:
            linear-gradient(
              145deg,
              #7c3aed,
              #db2777
            );
          color: #ffffff;
          box-shadow:
            0 0 0 4px rgba(219, 39, 119, 0.12),
            0 0 24px rgba(219, 39, 119, 0.34);
          animation: guide-audio-pulse 1.4s ease infinite;
        }

        .guide-audio-button:disabled {
          cursor: not-allowed;
          opacity: 0.38;
        }

        .guide-audio-notice {
          display: flex;
          min-height: 27px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 5px 14px;
          background: rgba(4, 14, 31, 0.78);
          color: #9eb0c9;
          font-size: 10px;
          line-height: 1.35;
          text-align: center;
        }

        .guide-audio-live-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-radius: 50%;
          background: #ff66c4;
          box-shadow: 0 0 12px rgba(255, 102, 196, 0.86);
          animation: guide-audio-dot 1s ease infinite;
        }

        .guide-composer textarea {
          min-height: 46px;
          max-height: 120px;
          flex: 1 1 auto;
          resize: none;
          overflow-y: auto;
          border: 1px solid rgba(216, 178, 92, 0.25);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.055);
          color: #f8fafc;
          padding: 12px 13px;
          font: inherit;
          font-size: 14px;
          line-height: 1.45;
        }

        .guide-composer textarea::placeholder {
          color: #8393aa;
        }

        .guide-composer textarea:focus {
          border-color: rgba(229, 195, 110, 0.68);
          background: rgba(255, 255, 255, 0.075);
        }

        .guide-composer textarea:disabled {
          opacity: 0.66;
        }

        .guide-send {
          display: grid;
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid rgba(244, 219, 158, 0.64);
          border-radius: 15px;
          background:
            linear-gradient(145deg, #ebca78, #aa7628);
          color: #07152b;
          cursor: pointer;
          font: inherit;
          font-size: 20px;
          font-weight: 900;
          box-shadow: 0 8px 22px rgba(216, 178, 92, 0.2);
          transition:
            transform 150ms ease,
            opacity 150ms ease;
        }

        .guide-send:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .guide-send:disabled {
          cursor: not-allowed;
          opacity: 0.38;
        }

        .guide-disclaimer {
          padding: 0 16px 12px;
          background: rgba(4, 14, 31, 0.78);
          color: #718198;
          font-size: 10px;
          line-height: 1.35;
          text-align: center;
        }

        @keyframes guide-audio-pulse {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.045);
          }
        }

        @keyframes guide-audio-dot {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.82);
          }

          50% {
            opacity: 1;
            transform: scale(1.18);
          }
        }

        @keyframes guide-bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.48;
          }

          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .guide-launcher {
            right: 16px;
            bottom: calc(
              148px + env(safe-area-inset-bottom)
            );
            min-height: 50px;
          }

          .guide-panel {
            inset: 0;
            width: 100vw;
            height: 100dvh;
            max-height: none;
            border: 0;
            border-radius: 0;
          }

          .guide-header {
            padding-top: calc(
              16px + env(safe-area-inset-top)
            );
          }

          .guide-quick-actions {
          display: flex;
          flex: 0 0 auto;
          gap: 7px;
          overflow-x: auto;
          padding: 10px 14px 9px;
          border-top: 1px solid
            rgba(216, 178, 92, 0.14);
          background: rgba(5, 16, 35, 0.72);
          scrollbar-width: thin;
          scrollbar-color:
            rgba(126, 92, 246, 0.48)
            transparent;
        }

        .guide-quick-action {
          display: inline-flex;
          min-height: 32px;
          flex: 0 0 auto;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid
            rgba(117, 196, 255, 0.24);
          border-radius: 999px;
          background:
            linear-gradient(
              135deg,
              rgba(24, 90, 155, 0.24),
              rgba(109, 40, 217, 0.2)
            );
          color: #dcecff;
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          transition:
            transform 150ms ease,
            border-color 150ms ease,
            background 150ms ease;
        }

        .guide-quick-action span {
          color: #d7bcff;
          font-size: 11px;
        }

        .guide-quick-action:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color:
            rgba(156, 224, 255, 0.58);
          background:
            linear-gradient(
              135deg,
              rgba(17, 132, 184, 0.34),
              rgba(126, 52, 220, 0.32)
            );
        }

        .guide-quick-action:focus-visible {
          outline: 2px solid #8ce7ff;
          outline-offset: 2px;
        }

        .guide-quick-action:disabled {
          cursor: not-allowed;
          opacity: 0.42;
        }

        .guide-composer {
            padding-bottom: 10px;
          }

          .guide-disclaimer {
            padding-bottom: calc(
              10px + env(safe-area-inset-bottom)
            );
          }

          .guide-message {
            max-width: 92%;
          }
        }

        @media print {
          .guide-root,
          .guide-launcher,
          .guide-panel {
            display: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .guide-launcher,
          .guide-send,
          .guide-thinking span {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}






