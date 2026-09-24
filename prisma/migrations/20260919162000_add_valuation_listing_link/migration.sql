-- Link valuations to their originating listing.
-- Additive only. Existing valuations remain valid with listingId = NULL.

ALTER TABLE
    "Valuation"
ADD COLUMN
    "listingId" TEXT;

CREATE INDEX
    "Valuation_listingId_idx"
ON
    "Valuation"("listingId");

CREATE INDEX
    "Valuation_listingId_status_idx"
ON
    "Valuation"("listingId", "status");

ALTER TABLE
    "Valuation"
ADD CONSTRAINT
    "Valuation_listingId_fkey"
FOREIGN KEY
    ("listingId")
REFERENCES
    "Listing"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
