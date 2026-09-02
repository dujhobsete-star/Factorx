import { config } from "../../config";
import { db } from "../../db";
import { dedupeCandidates, proxyKey, type ProxyCandidate, type ProxySource, type ReportingProxySource, type SourceMetric } from "../types";

export class ProgressiveSourceAggregator implements ReportingProxySource {
  name = "factorx-progressive-aggregator";
  private report: SourceMetric[] = [];
  constructor(private readonly providers: ProxySource[], private readonly candidateCap = config.MAX_CANDIDATES_PER_CYCLE) {}

  getLastReport() { return [...this.report]; }

  async fetchCandidates(): Promise<ProxyCandidate[]> {
    this.report = []; const combined = new Map<string, ProxyCandidate>(); const now = new Date();
    for (const provider of this.providers) {
      if (combined.size >= this.candidateCap) break;
      const health = await db.proxySourceHealth.findUnique({ where: { name: provider.name } });
      if (health?.cooldownUntil && health.cooldownUntil > now) {
        this.report.push({ source: provider.name, returned: 0, uniqueContribution: 0, status: "COOLDOWN" }); continue;
      }
      const started = Date.now();
      try {
        const fetched = dedupeCandidates(await provider.fetchCandidates()); let uniqueContribution = 0;
        for (const candidate of fetched) {
          const key = proxyKey(candidate); const previous = combined.get(key);
          if (!previous) { combined.set(key, candidate); uniqueContribution++; }
          else combined.set(key, dedupeCandidates([previous, candidate])[0]);
          if (combined.size >= this.candidateCap) break;
        }
        const brReported = fetched.filter((candidate) => candidate.countryReported === "BR" || candidate.countryCode === "BR").length;
        const durationMs = Date.now() - started;
        this.report.push({ source: provider.name, returned: fetched.length, brReported, uniqueContribution, durationMs, status: fetched.length ? "HEALTHY" : "DEGRADED" });
        await db.proxySourceHealth.upsert({ where: { name: provider.name }, create: { name: provider.name, status: fetched.length ? "HEALTHY" : "DEGRADED", lastAttemptAt: now, lastSuccessAt: now, candidatesFetched: fetched.length, candidatesParsed: fetched.length, candidatesBR: brReported, requestDurationMs: durationMs }, update: { status: fetched.length ? "HEALTHY" : "DEGRADED", lastAttemptAt: now, lastSuccessAt: now, cooldownUntil: null, consecutiveFailures: 0, candidatesFetched: fetched.length, candidatesParsed: fetched.length, candidatesBR: brReported, requestDurationMs: durationMs, lastError: null } });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 180) : "UNKNOWN"; const failures = (health?.consecutiveFailures ?? 0) + 1;
        const cooldown = failures >= config.MAX_SOURCE_FAILURES ? new Date(Date.now() + config.SOURCE_COOLDOWN_MINUTES * 60_000) : null;
        this.report.push({ source: provider.name, returned: 0, uniqueContribution: 0, durationMs: Date.now() - started, status: cooldown ? "COOLDOWN" : "DEGRADED", error: message });
        await db.proxySourceHealth.upsert({ where: { name: provider.name }, create: { name: provider.name, status: cooldown ? "COOLDOWN" : "DEGRADED", lastAttemptAt: now, lastFailureAt: now, cooldownUntil: cooldown, consecutiveFailures: failures, lastError: message }, update: { status: cooldown ? "COOLDOWN" : "DEGRADED", lastAttemptAt: now, lastFailureAt: now, cooldownUntil: cooldown, consecutiveFailures: failures, lastError: message } });
      }
    }
    if (!combined.size) throw new Error("all_proxy_sources_unavailable");
    return [...combined.values()];
  }
}
