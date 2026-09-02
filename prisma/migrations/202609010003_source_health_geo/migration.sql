CREATE TYPE "SourceStatus" AS ENUM ('HEALTHY','DEGRADED','COOLDOWN','UNAVAILABLE');

ALTER TABLE "Proxy"
  ADD COLUMN "exitIp" TEXT,
  ADD COLUMN "countryReported" TEXT,
  ADD COLUMN "countryVerified" TEXT,
  ADD COLUMN "countryVerifiedAt" TIMESTAMP(3);

CREATE TABLE "ProxySourceRecord" (
  "id" TEXT PRIMARY KEY,
  "proxyId" TEXT NOT NULL REFERENCES "Proxy"("id") ON DELETE CASCADE,
  "source" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ProxySourceRecord_proxyId_source_key" ON "ProxySourceRecord"("proxyId", "source");
CREATE INDEX "ProxySourceRecord_source_idx" ON "ProxySourceRecord"("source");

CREATE TABLE "ProxySourceHealth" (
  "name" TEXT PRIMARY KEY,
  "status" "SourceStatus" NOT NULL DEFAULT 'HEALTHY',
  "lastAttemptAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "cooldownUntil" TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "candidatesFetched" INTEGER NOT NULL DEFAULT 0,
  "candidatesParsed" INTEGER NOT NULL DEFAULT 0,
  "candidatesBR" INTEGER NOT NULL DEFAULT 0,
  "candidatesPassed" INTEGER NOT NULL DEFAULT 0,
  "averageLatencyMs" INTEGER,
  "requestDurationMs" INTEGER,
  "lastError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
