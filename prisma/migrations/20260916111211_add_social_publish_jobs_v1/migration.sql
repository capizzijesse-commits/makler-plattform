-- CreateTable
CREATE TABLE "SocialPublishJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "connectionId" TEXT,
    "provider" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "externalAccountId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "mediaPayload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "externalPostId" TEXT,
    "externalPostUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPublishJob_idempotencyKey_key" ON "SocialPublishJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SocialPublishJob_userId_status_createdAt_idx" ON "SocialPublishJob"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPublishJob_connectionId_status_idx" ON "SocialPublishJob"("connectionId", "status");

-- CreateIndex
CREATE INDEX "SocialPublishJob_listingId_idx" ON "SocialPublishJob"("listingId");

-- CreateIndex
CREATE INDEX "SocialPublishJob_status_scheduledFor_idx" ON "SocialPublishJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SocialPublishJob_status_nextAttemptAt_idx" ON "SocialPublishJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "SocialPublishJob_provider_channel_status_idx" ON "SocialPublishJob"("provider", "channel", "status");

-- AddForeignKey
ALTER TABLE "SocialPublishJob" ADD CONSTRAINT "SocialPublishJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPublishJob" ADD CONSTRAINT "SocialPublishJob_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPublishJob" ADD CONSTRAINT "SocialPublishJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SocialConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
