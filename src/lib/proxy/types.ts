import type { ProxyProtocol } from "@prisma/client";

export type ProxyCandidate = {
  ip: string; port: number; protocol: ProxyProtocol; source: string;
  username?: string | null; password?: string | null;
  sources?: string[]; countryReported?: string | null;
  country?: string | null; countryCode?: string | null; city?: string | null;
  isp?: string | null; anonymity?: string | null; sourceLatency?: number | null;
  sourceUptime?: number | null; sourceLastChecked?: Date | null;
};
export interface ProxySource { name: string; fetchCandidates(): Promise<ProxyCandidate[]>; }
export type SourceMetric = { source: string; returned: number; brReported?: number; uniqueContribution?: number; durationMs?: number; status?: string; error?: string };
export interface ReportingProxySource extends ProxySource { getLastReport(): SourceMetric[]; }
export type CheckResult = { success: boolean; latencyMs?: number; errorType?: string; exitIp?: string; countryVerified?: string };
export interface ProxyChecker { check(candidate: ProxyCandidate): Promise<CheckResult>; }

export const proxyKey = (p: Pick<ProxyCandidate, "protocol" | "ip" | "port">) =>
  `${p.protocol.toLowerCase()}:${p.ip}:${p.port}`;

export function dedupeCandidates(items: ProxyCandidate[]) {
  const map = new Map<string, ProxyCandidate>();
  for (const item of items) {
    const key = proxyKey(item); const previous = map.get(key);
    if (!previous) map.set(key, { ...item, sources: [...new Set([...(item.sources ?? []), item.source])] });
    else map.set(key, { ...previous, sources: [...new Set([...(previous.sources ?? []), ...(item.sources ?? []), item.source])] });
  }
  return [...map.values()];
}
