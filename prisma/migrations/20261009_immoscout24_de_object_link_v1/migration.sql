-- CreateTable
CREATE TABLE "ImmoScout24DeObjectLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalObjectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "lastErrorCode" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImmoScout24DeObjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImmoScout24DeObjectLink_userId_status_idx" ON "ImmoScout24DeObjectLink"("userId", "status");

-- CreateIndex
CREATE INDEX "ImmoScout24DeObjectLink_status_updatedAt_idx" ON "ImmoScout24DeObjectLink"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImmoScout24DeObjectLink_connectionId_listingId_key" ON "ImmoScout24DeObjectLink"("connectionId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ImmoScout24DeObjectLink_connectionId_externalId_key" ON "ImmoScout24DeObjectLink"("connectionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ImmoScout24DeObjectLink_connectionId_externalObjectId_key" ON "ImmoScout24DeObjectLink"("connectionId", "externalObjectId");
