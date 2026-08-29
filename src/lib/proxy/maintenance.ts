import { ProxyStatus, type Proxy } from "@prisma/client";
import { randomUUID } from "node:crypto";
import pLimit from "p-limit";
import { config, calculateMissing } from "../config";
import { db } from "../db";
import { dedupeCandidates, proxyKey, type ProxyCandidate, type ProxyChecker, type ProxySource } from "./types";

const LOCK_NAME = "proxy-maintenance";
const LOCK_TTL_HOURS = 2;
const log = (event: string, data: Record<string, unknown> = {}) => console.log(JSON.stringify({ scope: "maintenance", event, ...data, at: new Date().toISOString() }));

function asCandidate(p: Proxy): ProxyCandidate {
  return { ip: p.ip, port: p.port, protocol: p.protocol, source: p.source, country: p.country, countryCode: p.countryCode, city: p.city, isp: p.isp, anonymity: p.anonymity };
}

export async function runMaintenance(source: ProxySource, checker: ProxyChecker) {
  const lockOwner = randomUUID();
  const lock = await db.$queryRaw<Array<{ owner: string }>>`
    INSERT INTO "MaintenanceLock" ("name", "owner", "lockedUntil", "updatedAt")
    VALUES (${LOCK_NAME}, ${lockOwner}, NOW() + (${LOCK_TTL_HOURS} * INTERVAL '1 hour'), NOW())
    ON CONFLICT ("name") DO UPDATE SET
      "owner" = EXCLUDED."owner",
      "lockedUntil" = EXCLUDED."lockedUntil",
      "updatedAt" = NOW()
    WHERE "MaintenanceLock"."lockedUntil" < NOW()
    RETURNING "owner"`;
  if (lock[0]?.owner !== lockOwner) return { skipped: true, reason: "already_running" };
  let runId: string | undefined;
  try {
    await db.proxy.updateMany({ where: { status: ProxyStatus.TESTING, lastCheckedAt: { lt: new Date(Date.now() - 30 * 60_000) } }, data: { status: ProxyStatus.NEW } });
    const initialActiveCount = await db.proxy.count({ where: { status: ProxyStatus.ACTIVE } });
    const run = await db.proxyMaintenanceRun.create({ data: { initialActiveCount } });
    runId = run.id; log("started", { active: initialActiveCount });

    const active = await db.proxy.findMany({ where: { status: ProxyStatus.ACTIVE } });
    let survived = 0; let failed = 0;
    const limiter = pLimit(config.PROXY_TEST_CONCURRENCY);
    for (let i = 0; i < active.length; i += config.PROXY_TEST_BATCH_SIZE) {
      const batch = active.slice(i, i + config.PROXY_TEST_BATCH_SIZE);
      await Promise.all(batch.map((proxy) => limiter(async () => {
        const result = await checker.check(asCandidate(proxy));
        const now = new Date();
        await db.$transaction([
          db.proxyCheck.create({ data: { proxyId: proxy.id, success: result.success, latencyMs: result.latencyMs, errorType: result.errorType } }),
          db.proxy.update({ where: { id: proxy.id }, data: result.success ? {
            status: ProxyStatus.ACTIVE, latencyMs: result.latencyMs, lastCheckedAt: now, lastSuccessfulCheckAt: now,
            successfulChecks: { increment: 1 }, consecutiveFailures: 0, cooldownUntil: null
          } : {
            status: ProxyStatus.COOLDOWN, lastCheckedAt: now, failedChecks: { increment: 1 }, consecutiveFailures: { increment: 1 },
            cooldownUntil: new Date(now.getTime() + config.PROXY_FAILURE_COOLDOWN_HOURS * 3_600_000)
          } })
        ]);
        if (result.success) survived++; else failed++;
      })));
    }

    let tested = 0; let added = 0; let activeCount = await db.proxy.count({ where: { status: ProxyStatus.ACTIVE } });
    if (calculateMissing(config.TARGET_PROXY_STOCK, activeCount) > 0) {
      const existing = await db.proxy.findMany({ select: { ip: true, port: true, protocol: true, status: true, cooldownUntil: true } });
      const excluded = new Set(existing.filter((p) => p.status === "ACTIVE" || (p.cooldownUntil && p.cooldownUntil > new Date())).map(proxyKey));
      const candidates = dedupeCandidates(await source.fetchCandidates())
        .filter((p) => !excluded.has(proxyKey(p)))
        .sort((a, b) => (b.sourceUptime ?? 0) - (a.sourceUptime ?? 0) || (a.sourceLatency ?? Infinity) - (b.sourceLatency ?? Infinity));
      for (let i = 0; i < candidates.length && activeCount < config.TARGET_PROXY_STOCK; i += config.PROXY_TEST_BATCH_SIZE) {
        const missing = calculateMissing(config.TARGET_PROXY_STOCK, activeCount);
        const batch = candidates.slice(i, i + Math.min(config.PROXY_TEST_BATCH_SIZE, Math.max(missing, 1)));
        const results = await Promise.all(batch.map((candidate) => limiter(async () => ({ candidate, result: await checker.check(candidate) }))));
        tested += results.length;
        for (const { candidate, result } of results) {
          if (!result.success || activeCount >= config.TARGET_PROXY_STOCK) continue;
          const proxy = await db.proxy.upsert({
            where: { protocol_ip_port: { protocol: candidate.protocol, ip: candidate.ip, port: candidate.port } },
            create: { ...candidate, sourceLatencyMs: candidate.sourceLatency, sourceLastCheckedAt: candidate.sourceLastChecked, status: "ACTIVE", latencyMs: result.latencyMs, successfulChecks: 1, lastCheckedAt: new Date(), lastSuccessfulCheckAt: new Date() },
            update: { status: "ACTIVE", latencyMs: result.latencyMs, cooldownUntil: null, consecutiveFailures: 0, lastCheckedAt: new Date(), lastSuccessfulCheckAt: new Date(), successfulChecks: { increment: 1 } }
          });
          await db.proxyCheck.create({ data: { proxyId: proxy.id, success: true, latencyMs: result.latencyMs } });
          activeCount++; added++;
        }
        log("batch", { tested: batch.length, approved: added, remaining: calculateMissing(config.TARGET_PROXY_STOCK, activeCount) });
      }
    }
    await db.proxyMaintenanceRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), retestedCount: active.length, survivedCount: survived, failedCount: failed, newCandidatesTested: tested, newProxiesAdded: added, finalActiveCount: activeCount, status: "COMPLETED" } });
    log("finished", { active: activeCount });
    return { skipped: false, activeCount, added };
  } catch (error) {
    if (runId) await db.proxyMaintenanceRun.update({ where: { id: runId }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: error instanceof Error ? error.message.slice(0, 500) : "unknown" } });
    throw error;
  } finally {
    await db.maintenanceLock.deleteMany({ where: { name: LOCK_NAME, owner: lockOwner } });
  }
}
