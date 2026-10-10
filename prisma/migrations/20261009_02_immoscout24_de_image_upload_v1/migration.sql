-- ImmoScout24 DE image upload state V1.
-- New table only. Existing data is not modified.

CREATE TABLE "ImmoScout24DeImageUpload" (
    "id" TEXT NOT NULL,
    "objectLinkId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "externalAttachmentId" TEXT,
    "lastErrorCode" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImmoScout24DeImageUpload_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
    "ImmoScout24DeImageUpload_objectLinkId_imageId_key"
    ON "ImmoScout24DeImageUpload"(
        "objectLinkId", "imageId"
    );

CREATE UNIQUE INDEX
    "ImmoScout24DeImageUpload_objectLinkId_externalId_key"
    ON "ImmoScout24DeImageUpload"(
        "objectLinkId", "externalId"
    );

CREATE INDEX
    "ImmoScout24DeImageUpload_status_updatedAt_idx"
    ON "ImmoScout24DeImageUpload"(
        "status", "updatedAt"
    );

ALTER TABLE "ImmoScout24DeImageUpload"
    ADD CONSTRAINT
    "ImmoScout24DeImageUpload_objectLinkId_fkey"
    FOREIGN KEY ("objectLinkId")
    REFERENCES "ImmoScout24DeObjectLink"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;