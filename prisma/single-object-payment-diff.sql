-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentModel" TEXT NOT NULL DEFAULT 'subscription',
ADD COLUMN     "singleObjectPriceCents" INTEGER NOT NULL DEFAULT 990,
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "unlockStatus" TEXT NOT NULL DEFAULT 'included';

-- DropTable
DROP TABLE "playing_with_neon";

-- CreateIndex
CREATE UNIQUE INDEX "Listing_stripeCheckoutSessionId_key" ON "Listing"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_stripePaymentIntentId_key" ON "Listing"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Listing_userId_unlockStatus_idx" ON "Listing"("userId", "unlockStatus");
