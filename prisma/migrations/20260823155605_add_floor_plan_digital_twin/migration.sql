-- CreateTable
CREATE TABLE "FloorPlan" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "floorLevel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "scaleLabel" TEXT,
    "scaleDenominator" INTEGER,
    "scaleSource" TEXT,
    "calibratedDistanceMeters" DOUBLE PRECISION,
    "calibrationData" JSONB,
    "floorHeightMeters" DOUBLE PRECISION,
    "analysis" JSONB,
    "analysisVersion" TEXT,
    "geometry" JSONB,
    "geometryVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlan_storageKey_key" ON "FloorPlan"("storageKey");

-- CreateIndex
CREATE INDEX "FloorPlan_listingId_idx" ON "FloorPlan"("listingId");

-- CreateIndex
CREATE INDEX "FloorPlan_listingId_floorLevel_idx" ON "FloorPlan"("listingId", "floorLevel");

-- CreateIndex
CREATE INDEX "FloorPlan_listingId_sortOrder_idx" ON "FloorPlan"("listingId", "sortOrder");

-- AddForeignKey
ALTER TABLE "FloorPlan" ADD CONSTRAINT "FloorPlan_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
