-- CreateTable
CREATE TABLE "PortalPublishJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "connectionId" TEXT,
    "provider" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "action" TEXT NOT NULL DEFAULT 'publish',
    "externalObjectId" TEXT,
    "listingUpdatedAtSnapshot" TIMESTAMP(3),
    "payloadSnapshot" JSONB,
    "payloadFingerprint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "scheduledFor" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "providerOperationId" TEXT,
    "providerOperationType" TEXT,
    "providerOperationState" TEXT,
    "providerOperationUpdatedAt" TIMESTAMP(3),
    "externalPublicationId" TEXT,
    "externalPublicationUrl" TEXT,
    "resultSnapshot" JSONB,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalPublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalPublishJob_idempotencyKey_key" ON "PortalPublishJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PortalPublishJob_userId_status_createdAt_idx" ON "PortalPublishJob"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PortalPublishJob_connectionId_status_idx" ON "PortalPublishJob"("connectionId", "status");

-- CreateIndex
CREATE INDEX "PortalPublishJob_listingId_idx" ON "PortalPublishJob"("listingId");

-- CreateIndex
CREATE INDEX "PortalPublishJob_status_scheduledFor_idx" ON "PortalPublishJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "PortalPublishJob_status_nextAttemptAt_idx" ON "PortalPublishJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "PortalPublishJob_provider_portal_status_idx" ON "PortalPublishJob"("provider", "portal", "status");

-- CreateIndex
CREATE INDEX "PortalPublishJob_provider_providerOperationState_idx" ON "PortalPublishJob"("provider", "providerOperationState");

-- CreateIndex
CREATE INDEX "PortalPublishJob_listingId_portal_status_idx" ON "PortalPublishJob"("listingId", "portal", "status");

-- AddForeignKey
ALTER TABLE "PortalPublishJob" ADD CONSTRAINT "PortalPublishJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalPublishJob" ADD CONSTRAINT "PortalPublishJob_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalPublishJob" ADD CONSTRAINT "PortalPublishJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PortalConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
