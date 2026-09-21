-- COMMAND_CENTER_TRANSITION_HISTORY_V1
--
-- Append-only history for PortalPublishJob status transitions.
-- Existing PortalPublishJob rows are not modified.

CREATE TABLE "PortalPublishJobTransition" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "provider" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "maxAttempts" INTEGER NOT NULL,
    "nextAttemptAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "providerOperationState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalPublishJobTransition_pkey"
        PRIMARY KEY ("id")
);

CREATE INDEX
    "PortalPublishJobTransition_jobId_createdAt_idx"
ON
    "PortalPublishJobTransition"(
        "jobId",
        "createdAt"
    );

CREATE INDEX
    "PortalPublishJobTransition_userId_createdAt_idx"
ON
    "PortalPublishJobTransition"(
        "userId",
        "createdAt"
    );

CREATE INDEX
    "PortalPublishJobTransition_listingId_createdAt_idx"
ON
    "PortalPublishJobTransition"(
        "listingId",
        "createdAt"
    );

CREATE INDEX
    "PortalPublishJobTransition_toStatus_createdAt_idx"
ON
    "PortalPublishJobTransition"(
        "toStatus",
        "createdAt"
    );

ALTER TABLE
    "PortalPublishJobTransition"
ADD CONSTRAINT
    "PortalPublishJobTransition_jobId_fkey"
FOREIGN KEY
    ("jobId")
REFERENCES
    "PortalPublishJob"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


CREATE FUNCTION
    "capture_portal_publish_job_transition"()
RETURNS TRIGGER
AS $$
DECLARE
    previous_status TEXT;
BEGIN

    IF TG_OP = 'INSERT' THEN

        previous_status :=
            NULL;

    ELSIF
        OLD."status"
            IS NOT DISTINCT FROM
        NEW."status"
    THEN

        RETURN NEW;

    ELSE

        previous_status :=
            OLD."status";

    END IF;


    INSERT INTO
        "PortalPublishJobTransition"(
            "jobId",
            "userId",
            "listingId",
            "provider",
            "portal",
            "fromStatus",
            "toStatus",
            "attemptCount",
            "maxAttempts",
            "nextAttemptAt",
            "errorCode",
            "errorMessage",
            "providerOperationState",
            "createdAt"
        )
    VALUES (
        NEW."id",
        NEW."userId",
        NEW."listingId",
        NEW."provider",
        NEW."portal",
        previous_status,
        NEW."status",
        NEW."attemptCount",
        NEW."maxAttempts",
        NEW."nextAttemptAt",
        NEW."errorCode",
        NEW."errorMessage",
        NEW."providerOperationState",
        CURRENT_TIMESTAMP
    );

    RETURN NEW;
END;
$$
LANGUAGE plpgsql;


CREATE TRIGGER
    "PortalPublishJob_transition_history"
AFTER INSERT OR UPDATE
ON
    "PortalPublishJob"
FOR EACH ROW
EXECUTE FUNCTION
    "capture_portal_publish_job_transition"();