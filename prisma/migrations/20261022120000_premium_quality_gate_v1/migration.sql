CREATE TABLE "PremiumQualityAssessment" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "listingId" TEXT,
  "kind" TEXT NOT NULL, "version" TEXT NOT NULL, "snapshotHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PremiumQualityAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PremiumQualityAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PremiumQualityAssessment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PremiumQualityAssessment_userId_kind_createdAt_idx" ON "PremiumQualityAssessment"("userId", "kind", "createdAt");
CREATE INDEX "PremiumQualityAssessment_listingId_kind_createdAt_idx" ON "PremiumQualityAssessment"("listingId", "kind", "createdAt");
