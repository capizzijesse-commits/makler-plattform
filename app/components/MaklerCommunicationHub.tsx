"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  usePathname,
} from "next/navigation";


type Market =
  | "CH"
  | "DE";


type ConversationKind =
  | "AI"
  | "DIRECT"
  | "GROUP"
  | "CHANNEL"
  | "GUEST";


type Participant = {
  id: string;
  name: string;
  company:
    | string
    | null;
  emailHint:
    | string
    | null;
};


type Conversation = {
  id: string;
  kind: ConversationKind;
  title:
    | string
    | null;
  visibility?: string;
  countryCode?: string;
  languageCode?: string;
  updatedAt?: string;
  lastMessage?:
    | string
    | null;
  lastMessageAt?:
    | string
    | null;
  unreadCount?: number;
  participants?: Participant[];
};


type UserSearchResult = {
  id: string;
  name: string;
  company:
    | string
    | null;
  email:
    | string
    | null;
  emailHint:
    | string
    | null;
};


type ContactRequest = {
  id: string;
  initialMessage:
    | string
    | null;
  status: string;
  conversationId:
    | string
    | null;
  createdAt: string;
  respondedAt?:
    | string
    | null;
  user: {
    id: string;
    name: string;
    company:
      | string
      | null;
    emailHint:
      | string
      | null;
  };
};


type UiMessage = {
  id: string;
  role:
    | "user"
    | "assistant"
    | "other";
  content: string;
  senderName?:
    | string
    | null;
  senderCompany?:
    | string
    | null;
  createdAt?:
    | string
    | Date;
};


const AI_CONVERSATION:
  Conversation = {
  id: "inserat-ai",
  kind: "AI",
  title: "Inserat-AI",
  visibility: "PRIVATE",
  unreadCount: 0,
  participants: [],
};


function getMarket(): Market {
  if (
    typeof window ===
      "undefined"
  ) {
    return "CH";
  }

  const hostname =
    window.location.hostname
      .toLowerCase();

  if (
    hostname ===
      "inserat-ai.de" ||
    hostname.endsWith(
      ".inserat-ai.de"
    )
  ) {
    return "DE";
  }

  if (
    hostname ===
      "inserat-ai.ch" ||
    hostname.endsWith(
      ".inserat-ai.ch"
    )
  ) {
    return "CH";
  }

  return (
    window.localStorage
      .getItem(
        "inseratAiMarket"
      ) === "DE"
      ? "DE"
      : "CH"
  );
}


function createLocalId() {
  return `${
    Date.now()
  }-${
    Math.random()
      .toString(36)
      .slice(2, 8)
  }`;
}


function formatTime(
  value:
    | string
    | Date
    | null
    | undefined
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "de",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}


function conversationTitle(
  conversation:
    Conversation
) {
  if (
    conversation.kind ===
      "AI"
  ) {
    return "Inserat-AI";
  }

  if (
    conversation.title
  ) {
    return conversation.title;
  }

  const participant =
    conversation
      .participants?.[0];

  return (
    participant?.name ||
    "Privater Chat"
  );
}


function conversationSubtitle(
  conversation:
    Conversation
) {
  if (
    conversation.kind ===
      "AI"
  ) {
    return "Dein AI-Assistent";
  }

  const participant =
    conversation
      .participants?.[0];

  return (
    participant?.company ||
    participant?.emailHint ||
    "Inserat-AI Nutzer"
  );
}


export default function MaklerCommunicationHub() {
  const pathname =
    usePathname() || "/";

  const [open, setOpen] =
    useState(false);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [activeConversation, setActiveConversation] =
    useState<Conversation>(
      AI_CONVERSATION
    );

  const [messages, setMessages] =
    useState<UiMessage[]>([]);

  const [input, setInput] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [loadingConversations, setLoadingConversations] =
    useState(false);

  const [notice, setNotice] =
    useState("");

  const [newChatOpen, setNewChatOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<UserSearchResult[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [contactRequestsOpen, setContactRequestsOpen] =
    useState(false);

  const [incomingRequests, setIncomingRequests] =
    useState<ContactRequest[]>([]);

  const [outgoingRequests, setOutgoingRequests] =
    useState<ContactRequest[]>([]);

  const [pendingRequestCount, setPendingRequestCount] =
    useState(0);

  const [requestTarget, setRequestTarget] =
    useState<UserSearchResult | null>(null);

  const [requestMessage, setRequestMessage] =
    useState("");

  const [requestSending, setRequestSending] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );


  const directConversations =
    useMemo(
      () =>
        conversations.filter(
          (item) =>
            item.kind !== "AI"
        ),
      [conversations]
    );


  async function loadContactRequests() {
    try {
      const response =
        await fetch(
          "/api/makler-chat/contact-requests",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );

      if (!response.ok) {
        return;
      }

      const data: {
        incoming?: ContactRequest[];
        outgoing?: ContactRequest[];
      } =
        await response.json();

      const incoming =
        Array.isArray(
          data.incoming
        )
          ? data.incoming
          : [];

      const outgoing =
        Array.isArray(
          data.outgoing
        )
          ? data.outgoing
          : [];

      setIncomingRequests(
        incoming
      );

      setOutgoingRequests(
        outgoing
      );

      setPendingRequestCount(
        incoming.filter(
          (item) =>
            item.status ===
            "PENDING"
        ).length
      );
    } catch {
      // Kontaktanfragen dürfen
      // den restlichen Chat nicht blockieren.
    }
  }


  async function sendContactRequest() {
    if (
      !requestTarget ||
      requestSending
    ) {
      return;
    }

    const message =
      requestMessage.trim();

    if (
      message.length < 5
    ) {
      setNotice(
        "Bitte schreibe eine kurze persönliche Nachricht zur Kontaktanfrage."
      );

      return;
    }

    setRequestSending(
      true
    );

    setNotice("");

    try {
      const response =
        await fetch(
          "/api/makler-chat/contact-requests",
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                targetUserId:
                  requestTarget.id,

                initialMessage:
                  message,

                countryCode:
                  getMarket(),

                languageCode:
                  (
                    navigator.language ||
                    "de"
                  )
                    .slice(0, 2)
                    .toLowerCase(),
              }),
          }
        );

      const data: {
        state?: string;
        conversationId?: string;
        error?: string;
      } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Kontaktanfrage konnte nicht gesendet werden."
        );
      }

      if (
        data.state ===
          "EXISTING_CONVERSATION"
      ) {
        setRequestTarget(
          null
        );

        setRequestMessage(
          ""
        );

        setContactRequestsOpen(
          false
        );

        setNewChatOpen(
          false
        );

        setNotice(
          "Mit diesem Nutzer besteht bereits ein privater Chat."
        );

        await loadConversations();

        return;
      }

      setRequestTarget(
        null
      );

      setRequestMessage(
        ""
      );

      setNewChatOpen(
        false
      );

      setContactRequestsOpen(
        true
      );

      if (
        data.state ===
          "ALREADY_PENDING"
      ) {
        setNotice(
          "Eine Kontaktanfrage an diesen Nutzer ist bereits ausstehend."
        );
      }

      if (
        data.state ===
          "REQUEST_SENT"
      ) {
        setNotice(
          "Kontaktanfrage wurde gesendet. Ein privater Chat entsteht erst nach Annahme."
        );
      }

      await loadContactRequests();

    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Kontaktanfrage konnte nicht gesendet werden."
      );
    } finally {
      setRequestSending(
        false
      );
    }
  }


  async function respondToContactRequest(
    requestId: string,
    action:
      | "accept"
      | "decline"
      | "block"
  ) {
    setNotice("");

    try {
      const response =
        await fetch(
          "/api/makler-chat/contact-requests",
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                requestId,
                action,
              }),
          }
        );

      const data: {
        state?: string;
        conversationId?: string;
        error?: string;
      } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Kontaktanfrage konnte nicht bearbeitet werden."
        );
      }

      await loadContactRequests();

      await loadConversations();

      if (
        action ===
          "accept"
      ) {
        setContactRequestsOpen(
          false
        );

        setNotice(
          "Kontakt angenommen. Der private Chat wurde freigeschaltet."
        );
      }

      if (
        action ===
          "decline"
      ) {
        setNotice(
          "Kontaktanfrage wurde abgelehnt."
        );
      }

      if (
        action ===
          "block"
      ) {
        setNotice(
          "Nutzer wurde blockiert."
        );
      }

      window.dispatchEvent(
        new Event(
          "inserat-ai:chat-read"
        )
      );

    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Kontaktanfrage konnte nicht bearbeitet werden."
      );
    }
  }


  async function loadConversations() {
    setLoadingConversations(
      true
    );

    try {
      const response =
        await fetch(
          "/api/makler-chat/conversations",
          {
            method: "GET",
            credentials:
              "same-origin",
            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        return;
      }

      const data:
        {
          conversations?:
            Conversation[];
        } =
        await response.json();

      setConversations(
        Array.isArray(
          data.conversations
        )
          ? data.conversations
          : []
      );

      window.dispatchEvent(
        new Event(
          "inserat-ai:chat-read"
        )
      );

    } catch {
      // Die AI-Unterhaltung
      // bleibt trotzdem nutzbar.
    } finally {
      setLoadingConversations(
        false
      );
    }
  }


  async function openAiChat() {
    setActiveConversation(
      AI_CONVERSATION
    );

    setNewChatOpen(false);
    setContactRequestsOpen(false);
    setRequestTarget(null);
    setNotice("");
    setLoadingMessages(true);

    try {
      const response =
        await fetch(
          `/api/makler-chat?market=${getMarket()}`,
          {
            method: "GET",
            credentials:
              "same-origin",
            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          "AI-Chat konnte nicht geladen werden."
        );
      }

      const data:
        {
          messages?: Array<{
            id?: string;
            role?:
              | "user"
              | "assistant";
            content?: string;
            createdAt?: string;
          }>;
        } =
        await response.json();

      const normalized:
        UiMessage[] =
        Array.isArray(
          data.messages
        )
          ? data.messages
              .filter(
                (item) =>
                  typeof
                    item.content ===
                    "string" &&
                  (
                    item.role ===
                      "user" ||
                    item.role ===
                      "assistant"
                  )
              )
              .map(
                (item) => ({
                  id:
                    item.id ||
                    createLocalId(),

                  role:
                    item.role!,

                  content:
                    item.content!,

                  createdAt:
                    item.createdAt,
                })
              )
          : [];

      setMessages(
        normalized
      );

      await fetch(
        `/api/makler-chat?market=${getMarket()}`,
        {
          method: "PATCH",
          credentials:
            "same-origin",
        }
      ).catch(
        () => undefined
      );

    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Der AI-Chat konnte nicht geladen werden."
      );
    } finally {
      setLoadingMessages(
        false
      );
    }
  }


  async function loadDirectMessages(
    conversationId: string,
    showLoader = true
  ) {
    if (showLoader) {
      setLoadingMessages(
        true
      );
    }

    try {
      const response =
        await fetch(
          `/api/makler-chat/messages?conversationId=${encodeURIComponent(
            conversationId
          )}`,
          {
            method: "GET",
            credentials:
              "same-origin",
            cache:
              "no-store",
          }
        );

      const data:
        {
          messages?: Array<{
            id: string;
            senderUserId?:
              | string
              | null;
            senderType?: string;
            content: string;
            senderName?:
              | string
              | null;
            senderCompany?:
              | string
              | null;
            createdAt?: string;
            isMine?: boolean;
          }>;
          error?: string;
        } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Nachrichten konnten nicht geladen werden."
        );
      }

      const normalized:
        UiMessage[] =
        Array.isArray(
          data.messages
        )
          ? data.messages.map(
              (message) => ({
                id:
                  message.id,

                role:
                  message.isMine
                    ? "user"
                    : "other",

                content:
                  message.content,

                senderName:
                  message.senderName,

                senderCompany:
                  message.senderCompany,

                createdAt:
                  message.createdAt,
              })
            )
          : [];

      setMessages(
        normalized
      );

      setConversations(
        (current) =>
          current.map(
            (conversation) =>
              conversation.id ===
                conversationId
                ? {
                    ...conversation,
                    unreadCount: 0,
                  }
                : conversation
          )
      );

      window.dispatchEvent(
        new Event(
          "inserat-ai:chat-read"
        )
      );

    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Nachrichten konnten nicht geladen werden."
      );
    } finally {
      if (showLoader) {
        setLoadingMessages(
          false
        );
      }
    }
  }


  async function selectConversation(
    conversation:
      Conversation
  ) {
    setActiveConversation(
      conversation
    );

    setNewChatOpen(false);
    setContactRequestsOpen(false);
    setRequestTarget(null);
    setNotice("");

    if (
      conversation.kind ===
        "AI"
    ) {
      await openAiChat();
      return;
    }

    await loadDirectMessages(
      conversation.id
    );
  }


  async function sendAiMessage(
    messageText: string
  ) {
    const optimistic:
      UiMessage = {
      id:
        createLocalId(),
      role:
        "user",
      content:
        messageText,
      createdAt:
        new Date(),
    };

    setMessages(
      (current) => [
        ...current,
        optimistic,
      ]
    );

    const response =
      await fetch(
        "/api/makler-chat",
        {
          method: "POST",
          credentials:
            "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              message:
                messageText,

              pathname,

              market:
                getMarket(),
            }),
        }
      );

    const data:
      {
        answer?: string;
        assistantMessage?: {
          id?: string;
          content?: string;
        };
        error?: string;
      } =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Nachricht konnte nicht gesendet werden."
      );
    }

    const answer =
      data.assistantMessage
        ?.content ||
      data.answer;

    if (!answer) {
      throw new Error(
        "Inserat-AI hat keine Antwort geliefert."
      );
    }

    setMessages(
      (current) => [
        ...current,
        {
          id:
            data.assistantMessage
              ?.id ||
            createLocalId(),

          role:
            "assistant",

          content:
            answer,

          createdAt:
            new Date(),
        },
      ]
    );

    await fetch(
      `/api/makler-chat?market=${getMarket()}`,
      {
        method: "PATCH",
        credentials:
          "same-origin",
      }
    ).catch(
      () => undefined
    );
  }


  async function sendDirectMessage(
    messageText: string
  ) {
    const response =
      await fetch(
        "/api/makler-chat/messages",
        {
          method: "POST",
          credentials:
            "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              conversationId:
                activeConversation.id,

              content:
                messageText,
            }),
        }
      );

    const data:
      {
        message?: {
          id: string;
          content: string;
          senderName?:
            | string
            | null;
          senderCompany?:
            | string
            | null;
          createdAt?: string;
        };
        error?: string;
      } =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Nachricht konnte nicht gesendet werden."
      );
    }

    if (data.message) {
      setMessages(
        (current) => [
          ...current,
          {
            id:
              data.message!.id,

            role:
              "user",

            content:
              data.message!
                .content,

            senderName:
              data.message!
                .senderName,

            senderCompany:
              data.message!
                .senderCompany,

            createdAt:
              data.message!
                .createdAt,
          },
        ]
      );
    }

    window.dispatchEvent(
      new Event(
        "inserat-ai:chat-message"
      )
    );

    void loadConversations();
  }


  async function submitMessage(
    override?: string
  ) {
    const messageText =
      (
        override ??
        input
      ).trim();

    if (
      !messageText ||
      sending
    ) {
      return;
    }

    setInput("");
    setNotice("");
    setSending(true);

    try {
      if (
        activeConversation.kind ===
          "AI"
      ) {
        await sendAiMessage(
          messageText
        );
      } else {
        await sendDirectMessage(
          messageText
        );
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Nachricht konnte nicht gesendet werden."
      );
    } finally {
      setSending(false);
    }
  }


  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void submitMessage();
  }


  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void submitMessage();
    }
  }


  async function createDirectChat(
    target:
      UserSearchResult
  ) {
    setRequestTarget(
      target
    );

    setRequestMessage(
      ""
    );

    setNewChatOpen(
      false
    );

    setContactRequestsOpen(
      false
    );

    setNotice(
      ""
    );
  }


  useEffect(() => {
    if (
      !newChatOpen
    ) {
      return;
    }

    const query =
      searchQuery.trim();

    if (
      query.length < 2
    ) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        async () => {
          setSearching(true);

          try {
            const response =
              await fetch(
                `/api/makler-chat/users?q=${encodeURIComponent(
                  query
                )}`,
                {
                  method: "GET",
                  credentials:
                    "same-origin",
                  cache:
                    "no-store",
                }
              );

            const data:
              {
                users?:
                  UserSearchResult[];
              } =
              await response.json();

            if (
              !cancelled &&
              response.ok
            ) {
              setSearchResults(
                Array.isArray(
                  data.users
                )
                  ? data.users
                  : []
              );
            }
          } catch {
            if (!cancelled) {
              setSearchResults([]);
            }
          } finally {
            if (!cancelled) {
              setSearching(false);
            }
          }
        },
        320
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    newChatOpen,
    searchQuery,
  ]);


  useEffect(() => {
    const openChat =
      () => {
        setOpen(true);

        void loadConversations();
        void loadContactRequests();
        void openAiChat();

        window.setTimeout(
          () => {
            textareaRef
              .current
              ?.focus();
          },
          180
        );
      };

    const closeChat =
      () =>
        setOpen(false);

    window.addEventListener(
      "inserat-ai:open-chat",
      openChat
    );

    window.addEventListener(
      "inserat-ai:close-chat",
      closeChat
    );

    return () => {
      window.removeEventListener(
        "inserat-ai:open-chat",
        openChat
      );

      window.removeEventListener(
        "inserat-ai:close-chat",
        closeChat
      );
    };
  }, []);


  useEffect(() => {
    if (
      !open ||
      activeConversation.kind ===
        "AI"
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void loadDirectMessages(
            activeConversation.id,
            false
          );

          void loadConversations();
        },
        5000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    open,
    activeConversation.id,
    activeConversation.kind,
  ]);


  useEffect(() => {
    if (!open) {
      return;
    }

    messagesEndRef.current
      ?.scrollIntoView({
        behavior:
          "smooth",
        block:
          "end",
      });
  }, [
    open,
    messages,
    sending,
  ]);


  if (!open) {
    return null;
  }


  const activeParticipant =
    activeConversation
      .participants?.[0];


  return (
    <section
      className="communicationHub"
      aria-label="Inserat-AI Kommunikation"
    >
      <aside className="hubSidebar">
        <header className="hubSidebarHeader">
          <div>
            <strong>
              Inserat-AI
            </strong>

            <small>
              Kommunikation
            </small>
          </div>

          <button
            type="button"
            className="newChatButton"
            onClick={() => {
              setNewChatOpen(
                true
              );

              setContactRequestsOpen(
                false
              );

              setRequestTarget(
                null
              );

              setNotice("");
            }}
          >
            + Neuer Chat
          </button>
        </header>


        <div className="futureActions">
          <button
            type="button"
            className="contactRequestsButton"
            onClick={() => {
              setContactRequestsOpen(
                true
              );

              setNewChatOpen(
                false
              );

              setRequestTarget(
                null
              );

              setNotice(
                ""
              );

              void loadContactRequests();
            }}
          >
            🤝 Anfragen
            {pendingRequestCount > 0 ? (
              <b>
                {Math.min(
                  pendingRequestCount,
                  99
                )}
              </b>
            ) : null}
          </button>

          <button
            type="button"
            disabled
            title="Private Gruppen kommen als Nächstes"
          >
            👥 Gruppe
          </button>

          <button
            type="button"
            disabled
            title="Kundenlink kommt anschließend"
          >
            🔗 Kundenlink
          </button>
        </div>


        <div className="conversationList">
          <button
            type="button"
            className={
              activeConversation.kind ===
                "AI" &&
              !newChatOpen
                ? "conversation active"
                : "conversation"
            }
            onClick={() =>
              void openAiChat()
            }
          >
            <span className="avatar aiAvatar">
              AI
            </span>

            <span className="conversationInfo">
              <strong>
                Inserat-AI
              </strong>

              <small>
                Dein AI-Assistent
              </small>
            </span>
          </button>


          <div className="conversationSectionLabel">
            Gespräche
          </div>


          {loadingConversations ? (
            <div className="emptyList">
              Chats werden geladen …
            </div>
          ) : null}


          {!loadingConversations &&
          directConversations.length ===
            0 ? (
            <div className="emptyList">
              Noch keine privaten Chats.
            </div>
          ) : null}


          {directConversations.map(
            (conversation) => {
              const participant =
                conversation
                  .participants?.[0];

              return (
                <button
                  key={
                    conversation.id
                  }
                  type="button"
                  className={
                    activeConversation.id ===
                      conversation.id &&
                    !newChatOpen
                      ? "conversation active"
                      : "conversation"
                  }
                  onClick={() =>
                    void selectConversation(
                      conversation
                    )
                  }
                >
                  <span className="avatar">
                    {(
                      participant
                        ?.name?.[0] ||
                      "M"
                    ).toUpperCase()}
                  </span>

                  <span className="conversationInfo">
                    <strong>
                      {conversationTitle(
                        conversation
                      )}
                    </strong>

                    <small>
                      {conversation
                        .lastMessage ||
                      conversationSubtitle(
                        conversation
                      )}
                    </small>
                  </span>

                  <span className="conversationMeta">
                    <small>
                      {formatTime(
                        conversation
                          .lastMessageAt
                      )}
                    </small>

                    {(
                      conversation
                        .unreadCount ||
                      0
                    ) > 0 ? (
                      <b>
                        {Math.min(
                          conversation
                            .unreadCount ||
                            0,
                          99
                        )}
                      </b>
                    ) : null}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </aside>


      <main className="hubMain">
        {contactRequestsOpen ? (
          <>
            <header className="chatHeader">
              <div>
                <strong>
                  Kontaktanfragen
                </strong>

                <small>
                  Erst zustimmen, dann chatten
                </small>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={() =>
                  setOpen(false)
                }
              >
                ×
              </button>
            </header>

            <div className="requestsView">
              <button
                type="button"
                className="backButton"
                onClick={() => {
                  setContactRequestsOpen(
                    false
                  );

                  void openAiChat();
                }}
              >
                ← Zurück
              </button>

              <section>
                <h3>
                  Eingehende Anfragen
                </h3>

                <p>
                  Unbekannte Nutzer können dir nicht direkt schreiben.
                  Du entscheidest zuerst, ob du den Kontakt annimmst.
                </p>

                {incomingRequests.filter(
                  (item) =>
                    item.status ===
                    "PENDING"
                ).length === 0 ? (
                  <div className="requestEmpty">
                    Keine offenen Kontaktanfragen.
                  </div>
                ) : null}

                {incomingRequests
                  .filter(
                    (item) =>
                      item.status ===
                      "PENDING"
                  )
                  .map(
                    (request) => (
                      <article
                        key={
                          request.id
                        }
                        className="requestCard"
                      >
                        <div className="requestIdentity">
                          <span className="avatar">
                            {(
                              request.user
                                .name?.[0] ||
                              "M"
                            ).toUpperCase()}
                          </span>

                          <div>
                            <strong>
                              {request.user.name}
                            </strong>

                            <small>
                              {request.user.company ||
                                request.user.emailHint ||
                                "Inserat-AI Nutzer"}
                            </small>
                          </div>
                        </div>

                        <div className="requestMessage">
                          {request.initialMessage ||
                            "Möchte mit dir Kontakt aufnehmen."}
                        </div>

                        <div className="requestSafety">
                          Inserat-AI fordert niemals Passwörter oder Zahlungsdaten über den Chat an.
                        </div>

                        <div className="requestActions">
                          <button
                            type="button"
                            className="acceptRequest"
                            onClick={() =>
                              void respondToContactRequest(
                                request.id,
                                "accept"
                              )
                            }
                          >
                            Annehmen
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void respondToContactRequest(
                                request.id,
                                "decline"
                              )
                            }
                          >
                            Ablehnen
                          </button>

                          <button
                            type="button"
                            className="blockRequest"
                            onClick={() =>
                              void respondToContactRequest(
                                request.id,
                                "block"
                              )
                            }
                          >
                            Blockieren
                          </button>
                        </div>
                      </article>
                    )
                  )}
              </section>

              <section className="outgoingSection">
                <h3>
                  Gesendete Anfragen
                </h3>

                {outgoingRequests.length ===
                0 ? (
                  <div className="requestEmpty">
                    Noch keine Kontaktanfragen gesendet.
                  </div>
                ) : null}

                {outgoingRequests.map(
                  (request) => (
                    <article
                      key={
                        request.id
                      }
                      className="outgoingRequest"
                    >
                      <div>
                        <strong>
                          {request.user.name}
                        </strong>

                        <small>
                          {request.user.company ||
                            request.user.emailHint ||
                            "Inserat-AI Nutzer"}
                        </small>
                      </div>

                      <span
                        className={
                          request.status ===
                            "ACCEPTED"
                            ? "requestStatus accepted"
                            : request.status ===
                                "DECLINED" ||
                              request.status ===
                                "BLOCKED"
                              ? "requestStatus declined"
                              : "requestStatus"
                        }
                      >
                        {request.status ===
                          "ACCEPTED"
                          ? "Angenommen"
                          : request.status ===
                              "DECLINED"
                            ? "Abgelehnt"
                            : request.status ===
                                "BLOCKED"
                              ? "Nicht verfügbar"
                              : "Ausstehend"}
                      </span>
                    </article>
                  )
                )}
              </section>

              {notice ? (
                <div className="notice requestNotice">
                  {notice}
                </div>
              ) : null}
            </div>
          </>
        ) : requestTarget ? (
          <>
            <header className="chatHeader">
              <div>
                <strong>
                  Kontaktanfrage
                </strong>

                <small>
                  Kein direkter Chat ohne Zustimmung
                </small>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={() =>
                  setOpen(false)
                }
              >
                ×
              </button>
            </header>

            <div className="requestComposeView">
              <button
                type="button"
                className="backButton"
                onClick={() => {
                  setRequestTarget(
                    null
                  );

                  setNewChatOpen(
                    true
                  );

                  setNotice(
                    ""
                  );
                }}
              >
                ← Zurück zur Suche
              </button>

              <div className="requestRecipient">
                <span className="avatar">
                  {(
                    requestTarget
                      .name?.[0] ||
                    "M"
                  ).toUpperCase()}
                </span>

                <div>
                  <small>
                    Kontaktanfrage an
                  </small>

                  <strong>
                    {requestTarget.name}
                  </strong>

                  <span>
                    {requestTarget.company ||
                      requestTarget.emailHint ||
                      "Inserat-AI Nutzer"}
                  </span>
                </div>
              </div>

              <h3>
                Stell dich kurz persönlich vor.
              </h3>

              <p>
                Der Empfänger sieht diese Nachricht zuerst als
                Kontaktanfrage und entscheidet selbst, ob ein privater
                Chat freigeschaltet wird.
              </p>

              <textarea
                value={
                  requestMessage
                }
                onChange={
                  (event) =>
                    setRequestMessage(
                      event.target.value
                    )
                }
                maxLength={1000}
                rows={6}
                placeholder="z. B. Guten Tag, ich bin Jesse von … und würde mich gerne mit Ihnen über … austauschen."
              />

              <div className="requestTrustBox">
                <strong>
                  Sicherer Erstkontakt
                </strong>

                <span>
                  Vor der Annahme sind Dateien, Links, Audio-, Video-
                  und Bildschirmfreigaben gesperrt.
                </span>
              </div>

              {notice ? (
                <div className="notice">
                  {notice}
                </div>
              ) : null}

              <button
                type="button"
                className="sendRequestButton"
                disabled={
                  requestSending ||
                  requestMessage.trim()
                    .length < 5
                }
                onClick={() =>
                  void sendContactRequest()
                }
              >
                {requestSending
                  ? "Wird gesendet …"
                  : "Kontaktanfrage senden"}
              </button>
            </div>
          </>
        ) : newChatOpen ? (
          <>
            <header className="chatHeader">
              <div>
                <strong>
                  Neuer privater Chat
                </strong>

                <small>
                  Inserat-AI Nutzer suchen
                </small>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={() =>
                  setOpen(false)
                }
              >
                ×
              </button>
            </header>


            <div className="searchView">
              <button
                type="button"
                className="backButton"
                onClick={() =>
                  setNewChatOpen(
                    false
                  )
                }
              >
                ← Zurück
              </button>

              <h3>
                Makler suchen
              </h3>

              <p>
                Suche nach Name,
                Unternehmen oder
                E-Mail-Adresse.
              </p>

              <input
                autoFocus
                value={
                  searchQuery
                }
                onChange={
                  (event) =>
                    setSearchQuery(
                      event.target
                        .value
                    )
                }
                placeholder="z. B. Müller Immobilien"
              />

              {searching ? (
                <div className="searchStatus">
                  Suche …
                </div>
              ) : null}


              {!searching &&
              searchQuery.trim()
                .length >= 2 &&
              searchResults.length ===
                0 ? (
                <div className="searchStatus">
                  Keine passenden
                  Inserat-AI Nutzer
                  gefunden.
                </div>
              ) : null}


              <div className="searchResults">
                {searchResults.map(
                  (user) => (
                    <button
                      key={
                        user.id
                      }
                      type="button"
                      onClick={() =>
                        void createDirectChat(
                          user
                        )
                      }
                    >
                      <span className="avatar">
                        {(
                          user.name?.[0] ||
                          "M"
                        ).toUpperCase()}
                      </span>

                      <span>
                        <strong>
                          {user.name}
                        </strong>

                        <small>
                          {user.company ||
                            user.emailHint ||
                            "Inserat-AI Nutzer"}
                        </small>
                      </span>

                      <b>
                        Kontakt anfragen →
                      </b>
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="chatHeader">
              <div className="activeIdentity">
                <span
                  className={
                    activeConversation
                      .kind ===
                    "AI"
                      ? "avatar aiAvatar"
                      : "avatar"
                  }
                >
                  {activeConversation
                    .kind ===
                  "AI"
                    ? "AI"
                    : (
                        activeParticipant
                          ?.name?.[0] ||
                        "M"
                      ).toUpperCase()}
                </span>

                <div>
                  <strong>
                    {conversationTitle(
                      activeConversation
                    )}
                  </strong>

                  <small>
                    {activeConversation
                      .kind ===
                    "AI"
                      ? "AI-Assistent · bereit"
                      : `${
                          activeParticipant
                            ?.company ||
                          "Privater Chat"
                        } · Inserat-AI`}
                  </small>
                </div>
              </div>


              <div className="headerActions">
                <button
                  type="button"
                  disabled
                  title="Audio folgt"
                >
                  ☎
                </button>

                <button
                  type="button"
                  disabled
                  title="Video folgt"
                >
                  ◉
                </button>

                <button
                  type="button"
                  disabled
                  title="Bildschirm teilen folgt"
                >
                  ▣
                </button>

                <button
                  type="button"
                  className="closeButton"
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  ×
                </button>
              </div>
            </header>


            <div className="messages">
              {loadingMessages ? (
                <div className="loadingMessage">
                  Nachrichten werden
                  geladen …
                </div>
              ) : null}


              {!loadingMessages &&
              messages.length ===
                0 ? (
                <div className="welcomeCard">
                  <strong>
                    {activeConversation
                      .kind ===
                    "AI"
                      ? "Wie kann ich dir helfen?"
                      : `Starte das Gespräch mit ${
                          activeParticipant
                            ?.name ||
                          "diesem Makler"
                        }.`}
                  </strong>

                  <small>
                    {activeConversation
                      .kind ===
                    "AI"
                      ? "Inserate, Kundenkommunikation, Social Media und Makleralltag."
                      : "Nachrichten werden sicher in deinem Inserat-AI Chat gespeichert."}
                  </small>
                </div>
              ) : null}


              {messages.map(
                (message) => (
                  <article
                    key={
                      message.id
                    }
                    className={
                      message.role ===
                        "user"
                        ? "message mine"
                        : "message theirs"
                    }
                  >
                    {message.role !==
                      "user" ? (
                      <small className="senderName">
                        {message.role ===
                          "assistant"
                          ? "Inserat-AI"
                          : message.senderName ||
                            "Makler"}
                      </small>
                    ) : null}

                    <p>
                      {message.content}
                    </p>

                    <time>
                      {formatTime(
                        message.createdAt
                      )}
                    </time>
                  </article>
                )
              )}


              {sending ? (
                <div className="loadingMessage">
                  {activeConversation
                    .kind ===
                  "AI"
                    ? "Inserat-AI schreibt …"
                    : "Nachricht wird gesendet …"}
                </div>
              ) : null}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>


            {notice ? (
              <div className="notice">
                {notice}
              </div>
            ) : null}


            <form
              className="composer"
              onSubmit={
                handleSubmit
              }
            >
              <button
                type="button"
                className="attachmentButton"
                disabled
                title="Dateien folgen"
              >
                ＋
              </button>

              <textarea
                ref={
                  textareaRef
                }
                value={
                  input
                }
                onChange={
                  (event) =>
                    setInput(
                      event.target
                        .value
                    )
                }
                onKeyDown={
                  handleKeyDown
                }
                rows={1}
                maxLength={
                  8000
                }
                placeholder={
                  activeConversation
                    .kind ===
                  "AI"
                    ? "Frag Inserat-AI …"
                    : "Nachricht schreiben …"
                }
                disabled={
                  sending
                }
              />

              <button
                type="submit"
                className="sendButton"
                disabled={
                  sending ||
                  !input.trim()
                }
              >
                Senden
              </button>
            </form>
          </>
        )}
      </main>


      <style jsx>{`
        .communicationHub {
          position: fixed;
          right: 20px;
          bottom: 88px;
          z-index: 10030;

          display: grid;
          grid-template-columns:
            280px minmax(0, 1fr);

          width: min(
            820px,
            calc(100vw - 40px)
          );

          height: min(
            660px,
            calc(100vh - 120px)
          );

          overflow: hidden;

          border:
            1px solid
            rgba(
              251,
              191,
              36,
              0.24
            );

          border-radius: 24px;

          background:
            #071426;

          color: #ffffff;

          box-shadow:
            0 35px 100px
              rgba(
                2,
                8,
                23,
                0.62
              );
        }

        .hubSidebar {
          display: flex;
          min-width: 0;
          flex-direction: column;

          border-right:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            linear-gradient(
              180deg,
              #081a34,
              #061226
            );
        }

        .hubSidebarHeader {
          display: flex;
          align-items: center;
          justify-content:
            space-between;

          gap: 10px;

          padding: 16px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
        }

        .hubSidebarHeader strong {
          display: block;
          font-size: 14px;
          font-weight: 950;
        }

        .hubSidebarHeader small {
          color: #7f91a9;
          font-size: 9px;
        }

        .newChatButton {
          min-height: 34px;

          padding: 0 10px;

          border:
            1px solid
            rgba(
              251,
              191,
              36,
              0.36
            );

          border-radius: 10px;

          background:
            rgba(
              245,
              158,
              11,
              0.10
            );

          color: #fbbf24;

          cursor: pointer;

          font: inherit;
          font-size: 9px;
          font-weight: 900;
        }

        .futureActions {
          display: grid;
          grid-template-columns:
            1fr 1fr;

          gap: 6px;

          padding:
            10px 12px 5px;
        }

        .futureActions button {
          min-height: 32px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );

          border-radius: 9px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          color: #64748b;

          font: inherit;
          font-size: 8px;
          font-weight: 800;
        }

        .conversationList {
          flex: 1;
          overflow-y: auto;

          padding: 8px;
        }

        .conversation {
          display: grid;
          grid-template-columns:
            40px minmax(0, 1fr) auto;

          width: 100%;

          align-items: center;

          gap: 9px;

          margin-bottom: 4px;
          padding: 9px;

          border:
            1px solid
            transparent;

          border-radius: 13px;

          background:
            transparent;

          color: #ffffff;

          cursor: pointer;

          font: inherit;
          text-align: left;
        }

        .conversation:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.045
            );
        }

        .conversation.active {
          border-color:
            rgba(
              251,
              191,
              36,
              0.20
            );

          background:
            linear-gradient(
              120deg,
              rgba(
                245,
                158,
                11,
                0.11
              ),
              rgba(
                30,
                64,
                175,
                0.10
              )
            );
        }

        .avatar {
          display: grid;

          width: 40px;
          height: 40px;

          place-items: center;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );

          border-radius: 50%;

          background:
            #173356;

          color: #ffffff;

          font-size: 12px;
          font-weight: 950;
        }

        .aiAvatar {
          border-color:
            rgba(
              251,
              191,
              36,
              0.38
            );

          background:
            linear-gradient(
              145deg,
              #fbbf24,
              #f59e0b
            );

          color:
            #071426;
        }

        .conversationInfo {
          display: block;
          min-width: 0;
        }

        .conversationInfo strong {
          display: block;

          overflow: hidden;

          font-size: 10px;
          font-weight: 900;

          text-overflow:
            ellipsis;

          white-space: nowrap;
        }

        .conversationInfo small {
          display: block;

          overflow: hidden;

          margin-top: 3px;

          color: #7f91a9;

          font-size: 8px;

          text-overflow:
            ellipsis;

          white-space: nowrap;
        }

        .conversationMeta {
          display: grid;

          justify-items: end;

          gap: 5px;
        }

        .conversationMeta small {
          color: #64748b;
          font-size: 7px;
        }

        .conversationMeta b {
          display: grid;

          min-width: 18px;
          height: 18px;

          place-items: center;

          padding: 0 5px;

          border-radius: 999px;

          background: #ef4444;
          color: #ffffff;

          font-size: 7px;
        }

        .conversationSectionLabel {
          padding:
            10px 10px 5px;

          color: #64748b;

          font-size: 7px;
          font-weight: 950;

          letter-spacing:
            .12em;

          text-transform:
            uppercase;
        }

        .emptyList {
          padding: 12px;

          color: #64748b;

          font-size: 9px;
          line-height: 1.4;
        }

        .hubMain {
          display: flex;
          min-width: 0;
          flex-direction: column;

          background:
            linear-gradient(
              155deg,
              #08172c,
              #061226
            );
        }

        .chatHeader {
          display: flex;
          min-height: 68px;

          align-items: center;
          justify-content:
            space-between;

          gap: 12px;

          padding: 12px 16px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          background:
            rgba(
              2,
              10,
              27,
              0.50
            );
        }

        .activeIdentity {
          display: flex;
          min-width: 0;

          align-items: center;

          gap: 10px;
        }

        .activeIdentity strong,
        .chatHeader > div > strong {
          display: block;

          font-size: 13px;
          font-weight: 950;
        }

        .activeIdentity small,
        .chatHeader > div > small {
          display: block;

          margin-top: 2px;

          color: #7f91a9;

          font-size: 8px;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .headerActions button,
        .closeButton {
          display: grid;

          width: 32px;
          height: 32px;

          place-items: center;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );

          border-radius: 9px;

          background:
            rgba(
              255,
              255,
              255,
              0.04
            );

          color: #cbd5e1;

          font: inherit;
        }

        .headerActions button:disabled {
          opacity: .42;
        }

        .closeButton {
          cursor: pointer;
          font-size: 18px;
        }

        .messages {
          flex: 1;

          overflow-y: auto;

          padding: 18px;
        }

        .message {
          width: fit-content;
          max-width: 78%;

          margin-bottom: 10px;

          padding:
            9px 11px 7px;

          border-radius: 14px;
        }

        .message p {
          margin: 0;

          white-space: pre-wrap;

          font-size: 10px;
          line-height: 1.55;
        }

        .message time {
          display: block;

          margin-top: 4px;

          opacity: .50;

          font-size: 6px;

          text-align: right;
        }

        .message.mine {
          margin-left: auto;

          border:
            1px solid
            rgba(
              251,
              191,
              36,
              0.25
            );

          background:
            linear-gradient(
              145deg,
              rgba(
                245,
                158,
                11,
                0.24
              ),
              rgba(
                180,
                83,
                9,
                0.18
              )
            );
        }

        .message.theirs {
          margin-right: auto;

          border:
            1px solid
            rgba(
              96,
              165,
              250,
              0.17
            );

          background:
            rgba(
              30,
              64,
              175,
              0.14
            );
        }

        .senderName {
          display: block;

          margin-bottom: 4px;

          color: #93c5fd;

          font-size: 7px;
          font-weight: 900;
        }

        .loadingMessage {
          padding: 9px 0;

          color: #64748b;

          font-size: 9px;
        }

        .welcomeCard {
          max-width: 350px;

          margin:
            80px auto 0;

          padding: 20px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 18px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          text-align: center;
        }

        .welcomeCard strong {
          display: block;

          font-size: 13px;
        }

        .welcomeCard small {
          display: block;

          margin-top: 7px;

          color: #7f91a9;

          font-size: 9px;
          line-height: 1.5;
        }

        .notice {
          margin:
            0 14px 8px;

          padding:
            8px 10px;

          border:
            1px solid
            rgba(
              248,
              113,
              113,
              0.22
            );

          border-radius: 10px;

          background:
            rgba(
              127,
              29,
              29,
              0.16
            );

          color: #fecaca;

          font-size: 8px;
        }

        .composer {
          display: grid;

          grid-template-columns:
            38px
            minmax(0, 1fr)
            auto;

          align-items: end;

          gap: 7px;

          padding: 12px;

          border-top:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          background:
            rgba(
              2,
              10,
              27,
              0.56
            );
        }

        .composer textarea {
          width: 100%;
          min-height: 42px;
          max-height: 120px;

          resize: vertical;

          padding:
            11px 12px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.10
            );

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              0.045
            );

          color: #ffffff;

          outline: none;

          font: inherit;
          font-size: 10px;
        }

        .composer textarea:focus {
          border-color:
            rgba(
              251,
              191,
              36,
              0.45
            );
        }

        .attachmentButton {
          width: 38px;
          height: 42px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 11px;

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          color: #64748b;

          font-size: 18px;
        }

        .sendButton {
          min-height: 42px;

          padding: 0 14px;

          border:
            1px solid
            rgba(
              251,
              191,
              36,
              0.52
            );

          border-radius: 11px;

          background:
            linear-gradient(
              135deg,
              #fbbf24,
              #f59e0b
            );

          color: #071426;

          cursor: pointer;

          font: inherit;
          font-size: 9px;
          font-weight: 950;
        }

        .sendButton:disabled {
          cursor:
            not-allowed;

          opacity: .4;
        }

        .searchView {
          padding: 24px;

          overflow-y: auto;
        }

        .backButton {
          padding: 0;

          border: 0;

          background:
            transparent;

          color: #fbbf24;

          cursor: pointer;

          font: inherit;
          font-size: 9px;
          font-weight: 900;
        }

        .searchView h3 {
          margin:
            28px 0 5px;

          font-size: 22px;
        }

        .searchView p {
          margin: 0 0 16px;

          color: #7f91a9;

          font-size: 10px;
        }

        .searchView > input {
          width: 100%;

          padding:
            13px 14px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.10
            );

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              0.045
            );

          color: #ffffff;

          outline: none;

          font: inherit;
          font-size: 11px;
        }

        .searchView > input:focus {
          border-color:
            rgba(
              251,
              191,
              36,
              0.50
            );
        }

        .searchStatus {
          padding: 15px 3px;

          color: #64748b;

          font-size: 9px;
        }

        .searchResults {
          display: grid;

          gap: 7px;

          margin-top: 12px;
        }

        .searchResults button {
          display: grid;

          grid-template-columns:
            42px
            minmax(0, 1fr)
            auto;

          align-items: center;

          gap: 10px;

          padding: 10px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 13px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          color: #ffffff;

          cursor: pointer;

          font: inherit;

          text-align: left;
        }

        .searchResults button:hover {
          border-color:
            rgba(
              251,
              191,
              36,
              0.25
            );

          background:
            rgba(
              255,
              255,
              255,
              0.045
            );
        }

        .searchResults strong {
          display: block;

          font-size: 10px;
        }

        .searchResults small {
          display: block;

          margin-top: 3px;

          color: #7f91a9;

          font-size: 8px;
        }

        .searchResults b {
          color: #fbbf24;

          font-size: 8px;
        }


        /* INSERAT_AI_CONTACT_REQUESTS_UI_V1 */

        .contactRequestsButton {
          grid-column: 1 / -1;
          position: relative;
          cursor: pointer;
          color: #e2e8f0 !important;
          opacity: 1 !important;
        }

        .contactRequestsButton b {
          display: grid;
          min-width: 18px;
          height: 18px;
          place-items: center;
          margin-left: 5px;
          padding: 0 5px;
          border-radius: 999px;
          background: #ef4444;
          color: #ffffff;
          font-size: 7px;
        }

        .requestsView,
        .requestComposeView {
          flex: 1;
          overflow-y: auto;
          padding: 22px;
        }

        .requestsView section {
          margin-top: 24px;
        }

        .requestsView h3,
        .requestComposeView h3 {
          margin: 0 0 6px;
          font-size: 17px;
          font-weight: 950;
        }

        .requestsView section > p,
        .requestComposeView > p {
          margin: 0 0 15px;
          max-width: 520px;
          color: #8da0ba;
          font-size: 9px;
          line-height: 1.55;
        }

        .requestEmpty {
          padding: 15px;
          border: 1px dashed rgba(255,255,255,.08);
          border-radius: 12px;
          color: #64748b;
          font-size: 9px;
        }

        .requestCard {
          margin-bottom: 10px;
          padding: 14px;
          border: 1px solid rgba(251,191,36,.18);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(245,158,11,.07),
              rgba(30,64,175,.06)
            );
        }

        .requestIdentity {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .requestIdentity strong,
        .requestRecipient strong {
          display: block;
          font-size: 11px;
          font-weight: 950;
        }

        .requestIdentity small,
        .requestRecipient small,
        .requestRecipient span {
          display: block;
          margin-top: 2px;
          color: #8495ad;
          font-size: 8px;
        }

        .requestMessage {
          margin-top: 12px;
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 11px;
          background: rgba(255,255,255,.035);
          color: #dbe4ef;
          font-size: 10px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .requestSafety {
          margin-top: 8px;
          color: #64748b;
          font-size: 7px;
          line-height: 1.4;
        }

        .requestActions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }

        .requestActions button {
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          color: #dbe4ef;
          cursor: pointer;
          font: inherit;
          font-size: 8px;
          font-weight: 850;
        }

        .requestActions .acceptRequest {
          border-color: rgba(52,211,153,.35);
          background: rgba(16,185,129,.12);
          color: #6ee7b7;
        }

        .requestActions .blockRequest {
          color: #fca5a5;
        }

        .outgoingSection {
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,.06);
        }

        .outgoingRequest {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 7px;
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .outgoingRequest strong {
          display: block;
          font-size: 9px;
        }

        .outgoingRequest small {
          display: block;
          margin-top: 2px;
          color: #64748b;
          font-size: 7px;
        }

        .requestStatus {
          flex: 0 0 auto;
          padding: 5px 7px;
          border-radius: 999px;
          background: rgba(251,191,36,.10);
          color: #fbbf24;
          font-size: 7px;
          font-weight: 900;
        }

        .requestStatus.accepted {
          background: rgba(16,185,129,.10);
          color: #6ee7b7;
        }

        .requestStatus.declined {
          background: rgba(248,113,113,.08);
          color: #fca5a5;
        }

        .requestNotice {
          margin: 18px 0 0;
        }

        .requestRecipient {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background: rgba(255,255,255,.025);
        }

        .requestComposeView textarea {
          width: 100%;
          min-height: 135px;
          padding: 13px;
          resize: vertical;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 13px;
          background: rgba(255,255,255,.04);
          color: #ffffff;
          outline: none;
          font: inherit;
          font-size: 10px;
          line-height: 1.5;
        }

        .requestComposeView textarea:focus {
          border-color: rgba(251,191,36,.45);
        }

        .requestTrustBox {
          display: grid;
          gap: 4px;
          margin-top: 10px;
          padding: 11px 12px;
          border: 1px solid rgba(52,211,153,.13);
          border-radius: 11px;
          background: rgba(16,185,129,.045);
        }

        .requestTrustBox strong {
          color: #6ee7b7;
          font-size: 8px;
        }

        .requestTrustBox span {
          color: #7f91a9;
          font-size: 7px;
          line-height: 1.45;
        }

        .sendRequestButton {
          width: 100%;
          min-height: 43px;
          margin-top: 13px;
          border: 1px solid rgba(251,191,36,.55);
          border-radius: 11px;
          background:
            linear-gradient(
              135deg,
              #fbbf24,
              #f59e0b
            );
          color: #071426;
          cursor: pointer;
          font: inherit;
          font-size: 9px;
          font-weight: 950;
        }

        .sendRequestButton:disabled {
          cursor: not-allowed;
          opacity: .4;
        }
        @media (
          max-width: 720px
        ) {
          .communicationHub {
            right: 8px;
            bottom:
              calc(
                74px +
                env(
                  safe-area-inset-bottom
                )
              );

            grid-template-columns:
              132px
              minmax(
                0,
                1fr
              );

            width:
              calc(
                100vw - 16px
              );

            height:
              min(
                78vh,
                680px
              );

            border-radius:
              18px;
          }

          .hubSidebarHeader {
            display: grid;
            padding: 10px;
          }

          .newChatButton {
            width: 100%;
          }

          .futureActions {
            display: none;
          }

          .conversation {
            grid-template-columns:
              32px
              minmax(
                0,
                1fr
              );

            padding: 7px;
          }

          .conversationMeta {
            display: none;
          }

          .avatar {
            width: 32px;
            height: 32px;
          }

          .conversationInfo strong {
            font-size: 8px;
          }

          .conversationInfo small {
            font-size: 6px;
          }

          .chatHeader {
            padding: 10px;
          }

          .headerActions button:not(
            .closeButton
          ) {
            display: none;
          }

          .messages {
            padding: 11px;
          }

          .message {
            max-width: 90%;
          }

          .composer {
            grid-template-columns:
              minmax(
                0,
                1fr
              )
              auto;
          }

          .attachmentButton {
            display: none;
          }

          .searchView {
            padding: 14px;
          }

          .searchResults button {
            grid-template-columns:
              34px
              minmax(
                0,
                1fr
              );
          }

          .searchResults b {
            display: none;
          }
        }

        @media print {
          .communicationHub {
            display:
              none !important;
          }
        }
      `}</style>
    </section>
  );
}