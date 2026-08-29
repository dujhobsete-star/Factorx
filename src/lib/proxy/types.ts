import type { ProxyProtocol } from "@prisma/client";

export type ProxyCandidate = {
  ip: string; port: number; protocol: ProxyProtocol; source: string;
  country?: string | null; countryCode?: string | null; city?: string | null;
  isp?: string | null; anonymity?: string | null; sourceLatency?: number | null;
  sourceUptime?: number | null; sourceLastChecked?: Date | null;
};
export interface ProxySource { name: string; fetchCandidates(): Promise<ProxyCandidate[]>; }
export type CheckResult = { success: boolean; latencyMs?: number; errorType?: string };
export interface ProxyChecker { check(candidate: ProxyCandidate): Promise<CheckResult>; }

export const proxyKey = (p: Pick<ProxyCandidate, "protocol" | "ip" | "port">) =>
  `${p.protocol.toLowerCase()}:${p.ip}:${p.port}`;

export function dedupeCandidates(items: ProxyCandidate[]) {
  return [...new Map(items.map((item) => [proxyKey(item), item])).values()];
}
