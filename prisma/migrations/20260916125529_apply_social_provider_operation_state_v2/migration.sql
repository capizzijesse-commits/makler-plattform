ALTER TABLE "SocialPublishJob"
ADD COLUMN IF NOT EXISTS "providerOperationId" TEXT,
ADD COLUMN IF NOT EXISTS "providerOperationType" TEXT,
ADD COLUMN IF NOT EXISTS "providerOperationState" TEXT,
ADD COLUMN IF NOT EXISTS "providerOperationUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "SocialPublishJob_provider_providerOperationState_idx"
ON "SocialPublishJob"("provider", "providerOperationState");