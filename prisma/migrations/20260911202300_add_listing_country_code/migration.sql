ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "countryCode" TEXT;

UPDATE "Listing"
SET "countryCode" = "market"
WHERE "countryCode" IS NULL
  AND "market" IN ('CH', 'DE');

CREATE INDEX IF NOT EXISTS "Listing_countryCode_idx"
ON "Listing"("countryCode");
