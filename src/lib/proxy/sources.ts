import type { ProxyCandidate, ProxySource, SourceMetric } from "./types";
import { dedupeCandidates } from "./types";
import { normalizeProxyScrape } from "./proxyscrape";
import { parseProxyLine } from "./parser";

type SourceRow = Record<string, unknown>;

const RELAYGLASS_LIST = "https://raw.githubusercontent.com/relayglass/free-proxy-list/main/all.txt";
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
      ip: row.ip ?? (typeof row.proxy === "string" ? parseProxyLine(row.proxy, this.name)?.ip : undefined),
      port: row.port ?? (typeof row.proxy === "string" ? parseProxyLine(row.proxy, this.name)?.port : undefined),
      protocol: row.protocol ?? (typeof row.proxy === "string" ? parseProxyLine(row.proxy, this.name)?.protocol : undefined),
      country_code: row.country_code ?? (typeof row.geolocation === "object" && row.geolocation ? (row.geolocation as SourceRow).country : undefined),
      city: row.city ?? (typeof row.geolocation === "object" && row.geolocation ? (row.geolocation as SourceRow).city : undefined),
      latency_ms: row.latency_ms ?? row.response_ms,
      uptime_percent: row.uptime_percent ?? row.uptime_pct
    })).filter((item): item is ProxyCandidate => Boolean(item)).map((item) => ({ ...item, source: this.name }));
  }
}

class TextSource implements ProxySource {
  constructor(public name: string, private readonly url: string) {}
  async fetchCandidates(): Promise<ProxyCandidate[]> {
    const response = await fetch(this.url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`${this.name}_http_${response.status}`);
    return (await response.text()).split(/\r?\n/).map((line) => parseProxyLine(line, this.name)).filter((item): item is ProxyCandidate => Boolean(item));
  }
}

export class CascadingProxySource implements ProxySource {
  name = "factorx-cascade";
  private lastReport: SourceMetric[] = [];

  constructor(
    private readonly sources: ProxySource[],
    private readonly candidateCap = 2_500,
    private readonly candidateOffset = 0,
  ) {}

  async fetchCandidates(): Promise<ProxyCandidate[]> {
    let candidates: ProxyCandidate[] = [];
    const failures: string[] = [];
    this.lastReport = [];

    for (const source of this.sources) {
      if (candidates.length >= this.candidateCap + this.candidateOffset) break;
      try {
        const fetched = await source.fetchCandidates();
        this.lastReport.push({ source: source.name, returned: fetched.length });
        candidates = dedupeCandidates([...candidates, ...fetched]);
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 120) : "unknown";
        failures.push(`${source.name}:${message}`);
        this.lastReport.push({ source: source.name, returned: 0, error: message });
      }
    }

    if (!candidates.length) throw new Error(`all_proxy_sources_failed:${failures.join("|").slice(0, 400)}`);
    return candidates.slice(this.candidateOffset, this.candidateOffset + this.candidateCap);
  }

  getLastReport() { return [...this.lastReport]; }
}

export function createFallbackSources(primary: ProxySource) {
  const offset = Math.max(0, Number(process.env.PROXY_CANDIDATE_OFFSET ?? 0) || 0);
  return new CascadingProxySource([
    primary,
    new TextSource("relayglass", RELAYGLASS_LIST),
    new StructuredJsonSource("proxifly", PROXIFLY_JSON)
  ], 2_500, offset);
}
