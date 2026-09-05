CREATE TABLE "ListingViewEvent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "source" TEXT,
    "referrerHost" TEXT,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingViewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingViewEvent_listingId_idx"
ON "ListingViewEvent"("listingId");

CREATE INDEX "ListingViewEvent_listingId_createdAt_idx"
ON "ListingViewEvent"("listingId", "createdAt");

CREATE INDEX "ListingViewEvent_listingId_visitorHash_idx"
ON "ListingViewEvent"("listingId", "visitorHash");

ALTER TABLE "ListingViewEvent"
ADD CONSTRAINT "ListingViewEvent_listingId_fkey"
FOREIGN KEY ("listingId")
REFERENCES "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;