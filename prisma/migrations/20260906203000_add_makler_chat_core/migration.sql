CREATE TABLE "MaklerChatConversation" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'AI',
  "title" TEXT,
  "market" TEXT NOT NULL DEFAULT 'CH',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaklerChatConversation_pkey"
    PRIMARY KEY ("id")
);

CREATE TABLE "MaklerChatParticipant" (
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaklerChatParticipant_pkey"
    PRIMARY KEY ("conversationId", "userId"),

  CONSTRAINT "MaklerChatParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId")
    REFERENCES "MaklerChatConversation"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE "MaklerChatMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderUserId" TEXT,
  "senderType" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaklerChatMessage_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "MaklerChatMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId")
    REFERENCES "MaklerChatConversation"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX
  "MaklerChatParticipant_userId_idx"
ON
  "MaklerChatParticipant"("userId");

CREATE INDEX
  "MaklerChatMessage_conversationId_createdAt_idx"
ON
  "MaklerChatMessage"("conversationId", "createdAt");

CREATE INDEX
  "MaklerChatConversation_kind_updatedAt_idx"
ON
  "MaklerChatConversation"("kind", "updatedAt");