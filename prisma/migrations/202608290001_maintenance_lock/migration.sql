CREATE TABLE "MaintenanceLock" (
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceLock_pkey" PRIMARY KEY ("name")
);
