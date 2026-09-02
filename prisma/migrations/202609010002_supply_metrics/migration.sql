ALTER TABLE "ProxyMaintenanceRun"
  ADD COLUMN "candidatesCollected" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "uniqueCandidates" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rejectedCandidates" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sourceMetrics" JSONB,
  ADD COLUMN "durationMs" INTEGER;
