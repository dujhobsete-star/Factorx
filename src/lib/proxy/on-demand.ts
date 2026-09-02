import { config } from "../config";
import { EndpointProvider, type ProviderEndpoint } from "./providers/base";
import { RealProxyChecker } from "./checker";
import { isPublicIPv4 } from "./public-ip";
import { dedupeCandidates, proxyKey, type ProxyCandidate, type ProxyChecker, type CheckResult } from "./types";

export const SOURCE_TTL_MS = 5 * 60_000;
export const REQUEST_BUDGET_MS = 50_000;
class PublicSource extends EndpointProvider {
  constructor(public name: string, protected endpoints: ProviderEndpoint[]) { super(); }
}
const sources = [
  new PublicSource("proxyscrape", [{ url: config.PROXY_SOURCE_URL, format: "text" }]),
  new PublicSource("relayglass", [{ url: "https://raw.githubusercontent.com/relayglass/free-proxy-list/main/all.txt", format: "text" }]),
  new PublicSource("proxifly", [{ url: "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/all/data.json", format: "json" }]),
  new PublicSource("monosans", [{ url: "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies.json", format: "json" }]),
];
let cached: { expires: number; candidates: ProxyCandidate[]; reports: { source: string; count: number }[] } | undefined;
let fetching: Promise<NonNullable<typeof cached>> | undefined;
export async function loadCandidates() {
  if (cached && cached.expires > Date.now()) return cached;
  if (fetching) return fetching;
  fetching = (async () => {
    const lists = await Promise.all(sources.map(async source => {
      try { return await source.fetchCandidates({ timeoutMs: 6500 }); } catch { return []; }
    }));
    // Round-robin preserves fallback representation even with a large first source.
    const mixed: ProxyCandidate[] = [];
    for (let i = 0; i < Math.max(...lists.map(list => list.length)); i++) {
      for (const list of lists) if (list[i]) mixed.push(list[i]);
      if (mixed.length >= 10_000) break;
    }
    const candidates = dedupeCandidates(mixed).filter(p => isPublicIPv4(p.ip) && !p.username && !p.password).slice(0, 2500);
    const result = { candidates, reports: sources.map((s, i) => ({ source: s.name, count: lists[i].length })), expires: Date.now() + (candidates.length ? SOURCE_TTL_MS : 15_000) };
    cached = result;
    return result;
  })().finally(() => { fetching = undefined; });
  return fetching;
}

export type GenerateOptions = { limit: number; country?: string; protocol?: string; quality?: string };
export async function validateOnDemand(candidates: ProxyCandidate[], options: GenerateOptions, checker: ProxyChecker, signal: AbortSignal) {
  const target = Math.min(50, Math.max(1, options.limit));
  const filtered = dedupeCandidates(candidates).filter(p => isPublicIPv4(p.ip) && (!options.protocol || p.protocol === options.protocol));
  // Reported country is only a priority hint, never proof of location.
  filtered.sort((a, b) => Number((b.countryReported ?? b.countryCode) === options.country) - Number((a.countryReported ?? a.countryCode) === options.country));
  const proxies: { id: string; ip: string; port: number; protocol: string; countryCode?: string; brVerified: boolean; latencyMs?: number; lastCheckedAt: string }[] = [];
  let tested = 0;
  for (let i = 0; i < Math.min(filtered.length, 600) && !signal.aborted && proxies.length < target;) {
    const batch = filtered.slice(i, i + Math.min(24, target - proxies.length));
    i += batch.length;
    const results = await Promise.all(batch.map(async candidate => {
      tested++;
      let result: CheckResult;
      try { result = await checker.check(candidate); } catch { result = { success: false }; }
      return { candidate, result };
    }));
    for (const { candidate, result } of results) {
      if (!result.success || (options.country && result.countryVerified !== options.country)) continue;
      const max = options.quality === "EXCELLENT" ? config.EXCELLENT_LATENCY_MS : options.quality === "GOOD" ? config.GOOD_LATENCY_MS : Infinity;
      if ((result.latencyMs ?? Infinity) > max) continue;
      proxies.push({ id: proxyKey(candidate), ip: candidate.ip, port: candidate.port, protocol: candidate.protocol, countryCode: result.countryVerified, brVerified: result.countryVerified === "BR", latencyMs: result.latencyMs, lastCheckedAt: new Date().toISOString() });
    }
  }
  return { proxies, count: proxies.length, requested: target, tested, partial: proxies.length < target, timedOut: signal.aborted };
}

export async function generateOnDemand(options: GenerateOptions, clientSignal: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_BUDGET_MS);
  const signal = AbortSignal.any([clientSignal, controller.signal]);
  try {
    const source = await loadCandidates();
    const result = await validateOnDemand(source.candidates, options, new RealProxyChecker({ signal, timeoutMs: 3000 }), signal);
    return { ...result, sources: source.reports, mode: "on-demand", message: result.partial ? `Encontramos ${result.count} de ${result.requested} proxies aprovadas nesta tentativa. Você pode tentar novamente.` : "Todas as proxies entregues passaram no teste desta solicitação." };
  } finally { clearTimeout(timer); }
}
