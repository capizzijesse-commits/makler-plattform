-- Add one-time cardless Pro trial state to User.
-- Nullable columns keep all existing users unchanged.

ALTER TABLE "User"
ADD COLUMN "trialPlan" TEXT,
ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3);
