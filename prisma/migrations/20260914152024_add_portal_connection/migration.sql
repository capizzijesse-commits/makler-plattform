-- CreateTable
CREATE TABLE "PortalConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "externalOwnerId" TEXT,
    "externalUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_configured',
    "credentialSource" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalConnection_userId_idx" ON "PortalConnection"("userId");

-- CreateIndex
CREATE INDEX "PortalConnection_provider_portal_idx" ON "PortalConnection"("provider", "portal");

-- CreateIndex
CREATE UNIQUE INDEX "PortalConnection_userId_portal_key" ON "PortalConnection"("userId", "portal");

-- AddForeignKey
ALTER TABLE "PortalConnection" ADD CONSTRAINT "PortalConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
