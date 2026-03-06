-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'csv',
    "externalId" TEXT,
    "title" TEXT,
    "city" TEXT,
    "zipcode" TEXT,
    "address" TEXT,
    "priceCHF" INTEGER,
    "rooms" REAL,
    "livingAreaM2" REAL,
    "features" TEXT,
    "raw" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_externalId_key" ON "Listing"("externalId");

-- CreateIndex
CREATE INDEX "Listing_city_idx" ON "Listing"("city");

-- CreateIndex
CREATE INDEX "Listing_zipcode_idx" ON "Listing"("zipcode");
