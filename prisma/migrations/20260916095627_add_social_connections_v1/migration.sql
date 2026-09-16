-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "externalAccountId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "displayName" TEXT,
    "username" TEXT,
    "status" TEXT NOT NULL DEFAULT 'configured',
    "credentialSource" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'test',
    "externalSubjectId" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialConnection_userId_idx" ON "SocialConnection"("userId");

-- CreateIndex
CREATE INDEX "SocialConnection_provider_channel_idx" ON "SocialConnection"("provider", "channel");

-- CreateIndex
CREATE INDEX "SocialConnection_externalAccountId_idx" ON "SocialConnection"("externalAccountId");

-- CreateIndex
CREATE INDEX "SocialConnection_status_idx" ON "SocialConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_userId_provider_channel_externalAccountId__key" ON "SocialConnection"("userId", "provider", "channel", "externalAccountId", "environment");

-- CreateIndex
CREATE INDEX "SocialCredential_userId_idx" ON "SocialCredential"("userId");

-- CreateIndex
CREATE INDEX "SocialCredential_provider_idx" ON "SocialCredential"("provider");

-- CreateIndex
CREATE INDEX "SocialCredential_provider_environment_idx" ON "SocialCredential"("provider", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "SocialCredential_userId_provider_externalSubjectId_environm_key" ON "SocialCredential"("userId", "provider", "externalSubjectId", "environment");

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCredential" ADD CONSTRAINT "SocialCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
