import type { ProxyCandidate, ProxySource } from "./types";
import { dedupeCandidates } from "./types";
import { normalizeProxyScrape } from "./proxyscrape";

type SourceRow = Record<string, unknown>;

const RELAYGLASS_JSON = "https://raw.githubusercontent.com/relayglass/free-proxy-list/main/all.json";
const PROXIFLY_JSON = "https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/all/data.json";

class StructuredJsonSource implements ProxySource {
  constructor(public name: string, private readonly url: string) {}

  async fetchCandidates(): Promise<ProxyCandidate[]> {
    const response = await fetch(this.url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`${this.name}_http_${response.status}`);
    const payload = await response.json() as SourceRow[] | { proxies?: SourceRow[] };
    const rows = Array.isArray(payload) ? payload : payload.proxies ?? [];
    return rows.map((row) => normalizeProxyScrape({
      ...row,
      latency_ms: row.latency_ms ?? row.response_ms,
      uptime_percent: row.uptime_percent ?? row.uptime_pct
    })).filter((item): item is ProxyCandidate => Boolean(item)).map((item) => ({ ...item, source: this.name }));
  }
}

export class CascadingProxySource implements ProxySource {
  name = "factorx-cascade";

  constructor(
    private readonly sources: ProxySource[],
    private readonly candidateCap = 2_500
  ) {}

  async fetchCandidates(): Promise<ProxyCandidate[]> {
    let candidates: ProxyCandidate[] = [];
    const failures: string[] = [];

    for (const source of this.sources) {
      if (candidates.length >= this.candidateCap) break;
      try {
        candidates = dedupeCandidates([...candidates, ...await source.fetchCandidates()]);
      } catch (error) {
        failures.push(`${source.name}:${error instanceof Error ? error.message : "unknown"}`);
      }
    }

    if (!candidates.length) throw new Error(`all_proxy_sources_failed:${failures.join("|").slice(0, 400)}`);
    return candidates.slice(0, this.candidateCap);
  }
}

export function createFallbackSources(primary: ProxySource) {
  return new CascadingProxySource([
    primary,
    new StructuredJsonSource("relayglass", RELAYGLASS_JSON),
    new StructuredJsonSource("proxifly", PROXIFLY_JSON)
  ]);
}
