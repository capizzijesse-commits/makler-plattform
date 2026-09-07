ALTER TABLE "MaklerChatConversation"
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CH',
  ADD COLUMN "languageCode" TEXT NOT NULL DEFAULT 'de',
  ADD COLUMN "directKey" TEXT;

ALTER TABLE "MaklerChatParticipant"
  ADD COLUMN "participantType" TEXT NOT NULL DEFAULT 'USER';

UPDATE "MaklerChatConversation"
SET
  "countryCode" =
    CASE
      WHEN "market" = 'DE' THEN 'DE'
      WHEN "market" = 'CH' THEN 'CH'
      ELSE "countryCode"
    END;

CREATE UNIQUE INDEX
  "MaklerChatConversation_directKey_key"
ON
  "MaklerChatConversation"("directKey");

CREATE INDEX
  "MaklerChatConversation_visibility_countryCode_idx"
ON
  "MaklerChatConversation"(
    "visibility",
    "countryCode",
    "updatedAt"
  );

CREATE INDEX
  "MaklerChatParticipant_userId_conversationId_idx"
ON
  "MaklerChatParticipant"(
    "userId",
    "conversationId"
  );