CREATE TABLE "ListingFinance" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "marketingType" TEXT NOT NULL DEFAULT 'sale',
    "askingPrice" INTEGER,
    "minimumPrice" INTEGER,
    "commissionRate" DOUBLE PRECISION,
    "netRentMonthly" INTEGER,
    "additionalCostsMonthly" INTEGER,
    "heatingCostsMonthly" INTEGER,
    "depositMonths" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingFinance_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
"ListingFinance_listingId_key"
ON "ListingFinance"("listingId");

CREATE INDEX
"ListingFinance_listingId_idx"
ON "ListingFinance"("listingId");

ALTER TABLE "ListingFinance"
ADD CONSTRAINT "ListingFinance_listingId_fkey"
FOREIGN KEY ("listingId")
REFERENCES "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;