-- ImmoScout24 DE image identity uniqueness.
--
-- PostgreSQL permits multiple NULL values in a UNIQUE index.
-- Thus images pending confirmation remain possible.
--
-- No existing migration is modified.

CREATE UNIQUE INDEX "ImmoScout24DeImageUpload_objectLinkId_externalAttachmentId_key"
ON "ImmoScout24DeImageUpload"(
    "objectLinkId",
    "externalAttachmentId"
);