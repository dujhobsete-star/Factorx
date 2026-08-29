import { CronJob } from "cron";
import { config } from "../src/lib/config";
import { db } from "../src/lib/db";
import { RealProxyChecker } from "../src/lib/proxy/checker";
import { runMaintenance } from "../src/lib/proxy/maintenance";
import { ProxyScrapeSource } from "../src/lib/proxy/proxyscrape";
import { createFallbackSources } from "../src/lib/proxy/sources";
const source = createFallbackSources(new ProxyScrapeSource()); const checker = new RealProxyChecker();
async function execute() { return runMaintenance(source, checker); }
async function executeScheduled() { try { await execute(); } catch (error) { console.error(JSON.stringify({ scope: "worker", event: "maintenance_failed", error: error instanceof Error ? error.message : "unknown" })); } }
new CronJob(config.PROXY_MAINTENANCE_CRON, executeScheduled, null, true, config.APP_TIMEZONE);
setInterval(async () => {
  const job = await db.maintenanceJob.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  if (!job) return;
  await db.maintenanceJob.update({ where: { id: job.id }, data: { status: "RUNNING", startedAt: new Date() } });
  try { await execute(); await db.maintenanceJob.update({ where: { id: job.id }, data: { status: "COMPLETED", finishedAt: new Date() } }); }
  catch (error) { await db.maintenanceJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 300) : "unknown" } }); }
}, 15_000);
console.log(JSON.stringify({ scope: "worker", event: "ready", timezone: config.APP_TIMEZONE, cron: config.PROXY_MAINTENANCE_CRON }));
