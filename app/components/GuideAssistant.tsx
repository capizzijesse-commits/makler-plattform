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

const STORAGE_KEY = "inserat-ai-guide-history-v1";

const WELCOME_MESSAGE: ChatMessage = {
  id: "guide-welcome",
  role: "assistant",
  content:
    "Hallo! Ich bin dein Inserat-AI Guide. Ich helfe dir bei Objekten, Inseraten, Exposés, Social Media, Tour Guide und Immobilienvermarktung. Was möchtest du als Nächstes erledigen?",
};

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

function getPageLabel(pathname: string): string {
  if (pathname === "/cockpit") {
    return "Makler-Cockpit";
  }

  if (
    /^\/cockpit\/[^/]+\/home-staging\/?$/.test(
      pathname
    )
  ) {
    return "Virtuelles Home Staging";
  }

 if (/^\/cockpit\/[^/]+\/edit\/?$/.test(pathname)) {
  return "Objekt bearbeiten";
}

if (
  /^\/cockpit\/[^/]+\/home-staging\/?$/.test(
    pathname
  )
) {
  return "Virtuelles Home Staging";
}

if (/^\/cockpit\/[^/]+\/?$/.test(pathname)) {
  return "Objektdetails";
}

  if (pathname === "/dashboard/social-media") {
    return "Social Media";
  }

  if (pathname === "/dashboard/tour-guide") {
    return "Tour Guide";
  }

  if (pathname === "/dashboard") {
    return "Inserat-Generator";
  }

  if (/^\/expose\/[^/]+\/?$/.test(pathname)) {
    return "Exposé";
  }

  if (pathname === "/konto") {
    return "Benutzerkonto";
  }

  return "Inserat-AI";
}

type GuideQuickAction = {
  label: string;
  prompt: string;
};

function getQuickActions(
  pathname: string
): GuideQuickAction[] {
  if (pathname === "/cockpit") {
    return [
      {
        label: "Nächster Schritt",
        prompt:
          "Was ist im Makler-Cockpit mein sinnvollster nächster Arbeitsschritt?",
      },
      {
        label: "Objekt vorbereiten",
        prompt:
          "Welche Angaben sollte ich für ein vollständiges Immobilienobjekt vorbereiten?",
      },
      {
        label: "Vermarktung planen",
        prompt:
          "Wie plane ich die Vermarktung eines neuen Objekts mit Inserat-AI?",
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
        label: "Stil empfehlen",
        prompt:
          "Welcher Einrichtungsstil passt zu diesem Objekt und warum?",
      },
      {
        label: "Wunschtext formulieren",
        prompt:
          "Hilf mir, einen präzisen Wunschtext für das virtuelle Home Staging dieses Objekts zu formulieren.",
      },
      {
        label: "Raum einrichten",
        prompt:
          "Welche Möbel, Farben und Dekorationen eignen sich für ein professionelles Home Staging dieses Objekts?",
      },
      {
        label: "Ergebnis prüfen",
        prompt:
          "Worauf sollte ich beim Prüfen eines AI-visualisierten Home-Staging-Ergebnisses achten?",
      },
    ];
  }

  if (/^\/cockpit\/[^/]+\/edit\/?$/.test(pathname)) {
    return [
      {
        label: "Fehlende Angaben",
        prompt:
          "Welche Angaben fehlen bei diesem Objekt noch?",
      },
      {
        label: "Highlights erstellen",
        prompt:
          "Erstelle aus den vorhandenen Objektdaten fünf hochwertige Highlights. Erfinde keine Angaben.",
      },
      {
        label: "Objekt verbessern",
        prompt:
          "Wie kann ich die vorhandenen Objektdaten für eine bessere Vermarktung verbessern?",
      },
      {
        label: "Nächster Schritt",
        prompt:
          "Was sollte ich bei diesem Objekt als Nächstes erledigen?",
      },
    ];
  }

  if (/^\/cockpit\/[^/]+\/?$/.test(pathname)) {
    return [
      {
        label: "Objekt prüfen",
        prompt:
          "Prüfe dieses Objekt auf Vollständigkeit und Verkaufswirkung.",
      },
      {
        label: "Nächster Schritt",
        prompt:
          "Was ist bei diesem Objekt der sinnvollste nächste Arbeitsschritt?",
      },
      {
        label: "Inserat vorbereiten",
        prompt:
          "Wie sollte ich aus diesen Objektdaten ein überzeugendes Immobilieninserat aufbauen?",
      },
      {
        label: "Social Media",
        prompt:
          "Welche Social-Media-Inhalte eignen sich für dieses Objekt?",
      },
    ];
  }

  if (pathname === "/dashboard/social-media") {
    return [
      {
        label: "Instagram",
        prompt:
          "Erstelle einen hochwertigen Instagram-Text für das aktuelle Immobilienobjekt.",
      },
      {
        label: "Facebook",
        prompt:
          "Erstelle einen professionellen Facebook-Text für das aktuelle Immobilienobjekt.",
      },
      {
        label: "Hashtags",
        prompt:
          "Schlage passende Schweizer Immobilien-Hashtags vor.",
      },
      {
        label: "Plattform wählen",
        prompt:
          "Welche Social-Media-Plattform eignet sich für dieses Objekt am besten und warum?",
      },
    ];
  }

  if (pathname === "/dashboard/tour-guide") {
    return [
      {
        label: "Tour planen",
        prompt:
          "Wie baue ich eine überzeugende Besichtigungstour für dieses Objekt auf?",
      },
      {
        label: "Begrüssung",
        prompt:
          "Formuliere eine professionelle Begrüssung für die Objektbesichtigung.",
      },
      {
        label: "Raumreihenfolge",
        prompt:
          "Welche Reihenfolge der Räume erzeugt bei einer Besichtigung die beste Wirkung?",
      },
      {
        label: "Tour verbessern",
        prompt:
          "Wie kann ich den Tour Guide professioneller und verkaufsstärker machen?",
      },
    ];
  }

  if (/^\/expose\/[^/]+\/?$/.test(pathname)) {
    return [
      {
        label: "Exposé prüfen",
        prompt:
          "Prüfe dieses Exposé auf Vollständigkeit und professionelle Verkaufswirkung.",
      },
      {
        label: "Fehlende Inhalte",
        prompt:
          "Welche Inhalte fehlen in diesem Exposé noch?",
      },
      {
        label: "Lagetext prüfen",
        prompt:
          "Prüfe den vorhandenen Lagetext und schlage konkrete Verbesserungen vor.",
      },
      {
        label: "Wirkung erhöhen",
        prompt:
          "Wie kann dieses Exposé hochwertiger und verkaufsstärker wirken?",
      },
    ];
  }

  if (pathname === "/dashboard") {
    return [
      {
        label: "Inserat starten",
        prompt:
          "Welche Angaben brauche ich für ein hochwertiges Immobilieninserat?",
      },
      {
        label: "Titel verbessern",
        prompt:
          "Wie schreibe ich einen klaren und verkaufsstarken Immobilientitel?",
      },
      {
        label: "Beschreibung",
        prompt:
          "Wie sollte eine professionelle Immobilienbeschreibung aufgebaut sein?",
      },
      {
        label: "Nächster Schritt",
        prompt:
          "Was sollte ich im Inserat-Generator als Nächstes erledigen?",
      },
    ];
  }

  if (pathname === "/konto") {
    return [
      {
        label: "Profil prüfen",
        prompt:
          "Welche Profilangaben sind für professionelle Inserate und Exposés besonders wichtig?",
      },
      {
        label: "Kontaktdaten",
        prompt:
          "Wie sollten meine Kontaktdaten in einem Immobilienexposé dargestellt werden?",
      },
      {
        label: "Inserat-AI nutzen",
        prompt:
          "Wie hole ich den grössten Nutzen aus Inserat-AI heraus?",
      },
    ];
  }

  return [];
}

export default function GuideAssistant() {
  const pathname = usePathname() || "/";
  const isVisible = useMemo(
    () => isGuidePage(pathname),
    [pathname]
  );

  const pageLabel = useMemo(
    () => getPageLabel(pathname),
    [pathname]
  );

  const listingId = useMemo(
    () => getListingId(pathname),
    [pathname]
  );

  const quickActions = useMemo(
    () => getQuickActions(pathname),
    [pathname]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    WELCOME_MESSAGE,
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

  useEffect(() => {
    setSpeechRecognitionSupported(
      Boolean(
        window.SpeechRecognition ||
          window.webkitSpeechRecognition
      )
    );
  }, []);

  useEffect(() => {
    try {
      const storedValue =
        window.sessionStorage.getItem(STORAGE_KEY);

      if (storedValue) {
        const parsed: unknown = JSON.parse(storedValue);
        const storedMessages =
          normalizeStoredMessages(parsed);

        if (storedMessages.length > 0) {
          setMessages(storedMessages);
        }
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-30))
      );
    } catch {
      // Der Guide funktioniert auch ohne Session-Speicher.
    }
  }, [isHydrated, messages]);

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
            : "Der Guide konnte momentan keine Antwort erstellen.";

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
          : "Der Guide ist momentan nicht erreichbar.";

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
        "Die Spracheingabe wird von diesem Browser nicht unterstützt."
      );
      return;
    }

    stopSpeaking();

    const recognition = new RecognitionConstructor();
    const originalInput = input.trim();

    recognition.lang = "de-CH";
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
      setAudioNotice("Sprache wurde erkannt.");
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
          "Bitte erlaube Inserat-AI den Zugriff auf dein Mikrofon."
        );
        return;
      }

      if (event.error === "no-speech") {
        setAudioNotice(
          "Es wurde keine Sprache erkannt. Bitte versuche es nochmals."
        );
        return;
      }

      if (event.error === "audio-capture") {
        setAudioNotice(
          "Es wurde kein verfügbares Mikrofon gefunden."
        );
        return;
      }

      setAudioNotice(
        "Die Spracheingabe konnte nicht abgeschlossen werden."
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
      setAudioNotice("Ich höre zu …");
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setAudioNotice(
        "Das Mikrofon konnte nicht gestartet werden."
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
      setAudioNotice("Sprachausgabe gestoppt.");
      return;
    }

    stopListening();
    stopSpeaking();

    const controller = new AbortController();
    speechRequestRef.current = controller;

    setSpeechLoadingMessageId(message.id);
    setAudioNotice(
      "Realistische AI-Stimme wird vorbereitet …"
    );

    try {
      const response = await fetch("/api/guide-speech", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          text: message.content,
        }),
      });

      if (!response.ok) {
        let errorMessage =
          "Die realistische Stimme konnte nicht erstellt werden.";

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
          "Die Sprachausgabe enthielt keine Audiodaten."
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
        setAudioNotice("Wiedergabe beendet.");
      };

      audio.onerror = () => {
        releaseSpeechAudio();
        setSpeakingMessageId(null);
        setAudioNotice(
          "Die Audiodatei konnte nicht abgespielt werden."
        );
      };

      setSpeechLoadingMessageId(null);
      setSpeakingMessageId(message.id);
      setAudioNotice(
        "AI-generierte Stimme wird abgespielt."
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
          : "Die Sprachausgabe ist momentan nicht verfügbar."
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
    setMessages([WELCOME_MESSAGE]);
    setInput("");

    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
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
          aria-label="Inserat-AI Guide Assistent"
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
                title="Neuen Chat starten"
                aria-label="Neuen Chat starten"
              >
                ↻
              </button>

              <button
                type="button"
                className="guide-header-button"
                onClick={() => setIsOpen(false)}
                title="Guide schliessen"
                aria-label="Guide schliessen"
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
                          ? "Sprachausgabe abbrechen"
                          : speakingMessageId === message.id
                            ? "Vorlesen stoppen"
                            : "Antwort mit realistischer Stimme vorlesen"
                      }
                      title={
                        speechLoadingMessageId === message.id
                          ? "Sprachausgabe abbrechen"
                          : speakingMessageId === message.id
                            ? "Vorlesen stoppen"
                            : "Mit realistischer AI-Stimme vorlesen"
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
                          ? "Wird geladen …"
                          : speakingMessageId === message.id
                            ? "Stoppen"
                            : "Vorlesen"}
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
              aria-label="Vorgeschlagene Fragen"
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
                  ? "Spracheingabe stoppen"
                  : "Frage sprechen"
              }
              title={
                speechRecognitionSupported
                  ? isListening
                    ? "Aufnahme stoppen"
                    : "Frage sprechen"
                  : "Spracheingabe wird nicht unterstützt"
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
              placeholder="Frage den Inserat-AI Guide …"
              aria-label="Nachricht an den Guide"
              disabled={isSending}
            />

            <button
              type="submit"
              className="guide-send"
              disabled={!input.trim() || isSending}
              aria-label="Nachricht senden"
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
            Die Stimme ist AI-generiert. Der Guide erklärt und empfiehlt. Änderungen
            erfolgen nur nach deiner Bestätigung.
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






