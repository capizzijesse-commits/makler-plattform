-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "addressLabel" TEXT NOT NULL,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "propertyType" TEXT NOT NULL,
    "livingArea" DOUBLE PRECISION NOT NULL,
    "landArea" DOUBLE PRECISION,
    "rooms" DOUBLE PRECISION,
    "buildingYear" INTEGER NOT NULL,
    "renovationYear" INTEGER,
    "condition" TEXT,
    "standard" TEXT,
    "floorNumber" INTEGER,
    "hasLift" BOOLEAN,
    "parking" TEXT,
    "outdoorArea" TEXT,
    "view" TEXT,
    "provider" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "salePrice" INTEGER,
    "salePriceLower" INTEGER,
    "salePriceUpper" INTEGER,
    "pricePerSqm" DOUBLE PRECISION,
    "confidence" TEXT,
    "locationScore" DOUBLE PRECISION,
    "valuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Valuation_userId_idx" ON "Valuation"("userId");

-- CreateIndex
CREATE INDEX "Valuation_userId_createdAt_idx" ON "Valuation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Valuation_userId_status_idx" ON "Valuation"("userId", "status");

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
