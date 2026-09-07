CREATE TABLE "PublicGuideQuestionLog" (
  "id" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "pagePath" TEXT,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PublicGuideQuestionLog_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX
  "PublicGuideQuestionLog_market_createdAt_idx"
ON
  "PublicGuideQuestionLog"("market", "createdAt");

CREATE INDEX
  "PublicGuideQuestionLog_createdAt_idx"
ON
  "PublicGuideQuestionLog"("createdAt");