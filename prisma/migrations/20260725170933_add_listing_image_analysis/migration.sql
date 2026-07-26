-- AlterTable
ALTER TABLE "ListingImage" ADD COLUMN     "analysis" TEXT,
ADD COLUMN     "analysisStatus" TEXT NOT NULL DEFAULT 'not_analyzed',
ADD COLUMN     "analyzedAt" TIMESTAMP(3);
