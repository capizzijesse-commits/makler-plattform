CREATE TABLE "MaklerChatContactRequest" (
  "id" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "initialMessage" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "countryCode" TEXT NOT NULL DEFAULT 'CH',
  "languageCode" TEXT NOT NULL DEFAULT 'de',
  "conversationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "MaklerChatContactRequest_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "MaklerChatContactRequest_requesterUserId_fkey"
    FOREIGN KEY ("requesterUserId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "MaklerChatContactRequest_targetUserId_fkey"
    FOREIGN KEY ("targetUserId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "MaklerChatContactRequest_conversationId_fkey"
    FOREIGN KEY ("conversationId")
    REFERENCES "MaklerChatConversation"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  CONSTRAINT "MaklerChatContactRequest_different_users_check"
    CHECK ("requesterUserId" <> "targetUserId")
);


CREATE UNIQUE INDEX
  "MaklerChatContactRequest_pairKey_pending_key"
ON
  "MaklerChatContactRequest"("pairKey")
WHERE
  "status" = 'PENDING';


CREATE INDEX
  "MaklerChatContactRequest_target_status_createdAt_idx"
ON
  "MaklerChatContactRequest"(
    "targetUserId",
    "status",
    "createdAt"
  );


CREATE INDEX
  "MaklerChatContactRequest_requester_status_createdAt_idx"
ON
  "MaklerChatContactRequest"(
    "requesterUserId",
    "status",
    "createdAt"
  );


CREATE TABLE "MaklerChatBlock" (
  "blockerUserId" TEXT NOT NULL,
  "blockedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaklerChatBlock_pkey"
    PRIMARY KEY (
      "blockerUserId",
      "blockedUserId"
    ),

  CONSTRAINT "MaklerChatBlock_blockerUserId_fkey"
    FOREIGN KEY ("blockerUserId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "MaklerChatBlock_blockedUserId_fkey"
    FOREIGN KEY ("blockedUserId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "MaklerChatBlock_different_users_check"
    CHECK ("blockerUserId" <> "blockedUserId")
);


CREATE INDEX
  "MaklerChatBlock_blockedUserId_idx"
ON
  "MaklerChatBlock"("blockedUserId");