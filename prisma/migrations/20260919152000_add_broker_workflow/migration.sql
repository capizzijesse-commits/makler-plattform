-- Broker end-to-end workflow persistence.
-- Additive only: no destructive changes.

CREATE TABLE "BrokerWorkflow" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL DEFAULT 'valuation',
    "valuationId" TEXT,
    "valuationCompletedAt" TIMESTAMP(3),
    "mandateConfirmedAt" TIMESTAMP(3),
    "packagePreparedAt" TIMESTAMP(3),
    "marketingApprovedAt" TIMESTAMP(3),
    "publicationStartedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerWorkflow_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
    "BrokerWorkflow_listingId_key"
ON
    "BrokerWorkflow"("listingId");

CREATE INDEX
    "BrokerWorkflow_currentStage_idx"
ON
    "BrokerWorkflow"("currentStage");

CREATE INDEX
    "BrokerWorkflow_updatedAt_idx"
ON
    "BrokerWorkflow"("updatedAt");

ALTER TABLE
    "BrokerWorkflow"
ADD CONSTRAINT
    "BrokerWorkflow_listingId_fkey"
FOREIGN KEY
    ("listingId")
REFERENCES
    "Listing"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
