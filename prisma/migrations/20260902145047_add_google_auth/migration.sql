-- Google authentication support.
-- Existing credential accounts keep their password unchanged.

ALTER TABLE "User"
ADD COLUMN "googleSub" TEXT;

ALTER TABLE "User"
ALTER COLUMN "password" DROP NOT NULL;

CREATE UNIQUE INDEX "User_googleSub_key"
ON "User"("googleSub");