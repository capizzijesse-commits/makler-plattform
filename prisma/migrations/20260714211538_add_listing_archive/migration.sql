-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Listing_userId_archivedAt_idx" ON "Listing"("userId", "archivedAt");
