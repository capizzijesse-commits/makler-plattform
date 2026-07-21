-- CreateTable
CREATE TABLE "HomeStagingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sourceImageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "roomType" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeStagingImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeStagingImage_storageKey_key" ON "HomeStagingImage"("storageKey");

-- CreateIndex
CREATE INDEX "HomeStagingImage_listingId_idx" ON "HomeStagingImage"("listingId");

-- CreateIndex
CREATE INDEX "HomeStagingImage_sourceImageId_idx" ON "HomeStagingImage"("sourceImageId");

-- CreateIndex
CREATE INDEX "HomeStagingImage_listingId_createdAt_idx" ON "HomeStagingImage"("listingId", "createdAt");

-- AddForeignKey
ALTER TABLE "HomeStagingImage" ADD CONSTRAINT "HomeStagingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeStagingImage" ADD CONSTRAINT "HomeStagingImage_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "ListingImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
