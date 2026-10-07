-- CreateTable
CREATE TABLE "AutomationMonitoringRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "listingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "detectedFieldCount" INTEGER NOT NULL DEFAULT 0,
    "missingRequiredCount" INTEGER NOT NULL DEFAULT 0,
    "manualCorrectionCount" INTEGER NOT NULL DEFAULT 0,
    "textEdited" BOOLEAN NOT NULL DEFAULT false,
    "imageOrderChanged" BOOLEAN NOT NULL DEFAULT false,
    "readyReached" BOOLEAN NOT NULL DEFAULT false,
    "totalDurationMs" INTEGER,
    "errorStage" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationMonitoringRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationMonitoringEvent" (
    "id" SERIAL NOT NULL,
    "runId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationMonitoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationMonitoringRun_createdAt_idx" ON "AutomationMonitoringRun"("createdAt");

-- CreateIndex
CREATE INDEX "AutomationMonitoringRun_status_createdAt_idx" ON "AutomationMonitoringRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationMonitoringRun_userId_createdAt_idx" ON "AutomationMonitoringRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationMonitoringRun_listingId_createdAt_idx" ON "AutomationMonitoringRun"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationMonitoringRun_readyReached_createdAt_idx" ON "AutomationMonitoringRun"("readyReached", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationMonitoringEvent_runId_createdAt_idx" ON "AutomationMonitoringEvent"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationMonitoringEvent_stage_status_createdAt_idx" ON "AutomationMonitoringEvent"("stage", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationMonitoringEvent_status_createdAt_idx" ON "AutomationMonitoringEvent"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AutomationMonitoringEvent" ADD CONSTRAINT "AutomationMonitoringEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationMonitoringRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
