import { db } from "../src/lib/db";

async function main() {
  const [statuses, protocols, latency, brVerifiedActive, latest, sources, attributions, lockCount] = await Promise.all([
    db.proxy.groupBy({ by: ["status"], _count: true }),
    db.proxy.groupBy({ by: ["protocol"], where: { status: "ACTIVE" }, _count: true }),
    db.$queryRaw<Array<{ fast: bigint; good: bigint; medium: bigint; slow: bigint; verySlow: bigint; average: number | null; median: number | null }>>`
      SELECT
        COUNT(*) FILTER (WHERE "latencyMs" < 500)::bigint AS fast,
        COUNT(*) FILTER (WHERE "latencyMs" >= 500 AND "latencyMs" < 1000)::bigint AS good,
        COUNT(*) FILTER (WHERE "latencyMs" >= 1000 AND "latencyMs" < 2000)::bigint AS medium,
        COUNT(*) FILTER (WHERE "latencyMs" >= 2000 AND "latencyMs" < 5000)::bigint AS slow,
        COUNT(*) FILTER (WHERE "latencyMs" >= 5000)::bigint AS "verySlow",
        AVG("latencyMs")::float AS average,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "latencyMs")::float AS median
      FROM "Proxy" WHERE "status" = 'ACTIVE'::"ProxyStatus"`,
    db.proxy.count({ where: { status: "ACTIVE", countryVerified: "BR" } }),
    db.proxyMaintenanceRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.proxySourceHealth.findMany({ orderBy: { name: "asc" } }),
    db.proxySourceRecord.groupBy({ by: ["source"], _count: true, orderBy: { source: "asc" } }),
    db.maintenanceLock.count(),
  ]);
  const statusMap = Object.fromEntries(statuses.map((row) => [row.status, row._count]));
  const latencyRow = latency[0];
  console.log(JSON.stringify({
    statuses: statusMap,
    total: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
    protocols: Object.fromEntries(protocols.map((row) => [row.protocol, row._count])),
    brVerifiedActive,
    latency: {
      under500: Number(latencyRow.fast),
      from500To1000: Number(latencyRow.good),
      from1000To2000: Number(latencyRow.medium),
      from2000To5000: Number(latencyRow.slow),
      over5000: Number(latencyRow.verySlow),
      averageMs: latencyRow.average === null ? null : Math.round(latencyRow.average),
      medianMs: latencyRow.median === null ? null : Math.round(latencyRow.median),
    },
    latestRun: latest,
    sourceHealth: sources,
    sourceAttributions: Object.fromEntries(attributions.map((row) => [row.source, row._count])),
    maintenanceLocks: lockCount,
  }, (_, value) => typeof value === "bigint" ? Number(value) : value));
}

main().catch((error: unknown) => {
  const details = error && typeof error === "object"
    ? {
        name: "name" in error ? String(error.name) : "Error",
        code: "code" in error ? String(error.code) : undefined,
        message: "message" in error
          ? String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]").replace(/password\s*[=:]\s*\S+/gi, "password=[redacted]")
          : undefined,
      }
    : { name: "Error", code: undefined };
  console.error(JSON.stringify({ ok: false, error: "proxy_report_failed", ...details }));
  process.exitCode = 1;
}).finally(() => db.$disconnect());
