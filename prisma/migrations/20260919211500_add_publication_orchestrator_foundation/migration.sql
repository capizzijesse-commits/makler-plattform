-- Publication Orchestrator Foundation V1

CREATE TABLE "PublicationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicationTarget" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT,
    "destination" TEXT NOT NULL,
    "connectionId" TEXT,
    "externalAccountId" TEXT,
    "environment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "portalJobId" TEXT,
    "socialJobId" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationTarget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicationRun_userId_status_createdAt_idx"
ON "PublicationRun"("userId", "status", "createdAt");

CREATE INDEX "PublicationRun_listingId_createdAt_idx"
ON "PublicationRun"("listingId", "createdAt");

CREATE INDEX "PublicationRun_listingId_status_idx"
ON "PublicationRun"("listingId", "status");

CREATE UNIQUE INDEX "PublicationTarget_runId_targetKey_key"
ON "PublicationTarget"("runId", "targetKey");

CREATE INDEX "PublicationTarget_runId_status_idx"
ON "PublicationTarget"("runId", "status");

CREATE INDEX "PublicationTarget_portalJobId_idx"
ON "PublicationTarget"("portalJobId");

CREATE INDEX "PublicationTarget_socialJobId_idx"
ON "PublicationTarget"("socialJobId");

ALTER TABLE "PublicationRun"
ADD CONSTRAINT "PublicationRun_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "PublicationRun"
ADD CONSTRAINT "PublicationRun_listingId_fkey"
FOREIGN KEY ("listingId")
REFERENCES "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "PublicationTarget"
ADD CONSTRAINT "PublicationTarget_runId_fkey"
FOREIGN KEY ("runId")
REFERENCES "PublicationRun"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
