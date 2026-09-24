-- Encrypted per-user portal OAuth credential storage.
-- No plaintext access tokens or token secrets are stored.

CREATE TABLE "PortalCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalCredential_userId_portal_environment_key"
ON "PortalCredential"("userId", "portal", "environment");

CREATE INDEX "PortalCredential_userId_idx"
ON "PortalCredential"("userId");

CREATE INDEX "PortalCredential_provider_portal_idx"
ON "PortalCredential"("provider", "portal");

CREATE INDEX "PortalCredential_portal_environment_idx"
ON "PortalCredential"("portal", "environment");

ALTER TABLE "PortalCredential"
ADD CONSTRAINT "PortalCredential_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;