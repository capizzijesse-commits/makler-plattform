ALTER TABLE "SocialPublishJob"
ADD COLUMN "providerOperationId" TEXT,
ADD COLUMN "providerOperationType" TEXT,
ADD COLUMN "providerOperationState" TEXT,
ADD COLUMN "providerOperationUpdatedAt" TIMESTAMP(3);

CREATE INDEX "SocialPublishJob_provider_providerOperationState_idx"
ON "SocialPublishJob"("provider", "providerOperationState");