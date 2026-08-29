import { ProxyProtocol } from "@prisma/client";
import { config } from "../config";
import type { ProxyCandidate, ProxySource } from "./types";

type SourceRow = Record<string, unknown>;

function protocol(value: unknown): ProxyProtocol | null {
  const normalized = String(value ?? "").toUpperCase();
  return Object.values(ProxyProtocol).includes(normalized as ProxyProtocol) ? normalized as ProxyProtocol : null;
}

export function normalizeProxyScrape(row: SourceRow): ProxyCandidate | null {
  const p = protocol(row.protocol);
  const ip = String(row.ip ?? "").trim();
  const port = Number(row.port);
  if (!p || !ip || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return {
    ip, port, protocol: p, source: "proxyscrape",
    country: typeof row.country === "string" ? row.country : null,
    countryCode: typeof row.country_code === "string" ? row.country_code.toUpperCase() : null,
    city: typeof row.city === "string" ? row.city : null,
    isp: typeof row.isp === "string" ? row.isp : null,
    anonymity: typeof row.anonymity === "string" ? row.anonymity : null,
    sourceLatency: Number.isFinite(Number(row.latency_ms)) ? Math.round(Number(row.latency_ms)) : null,
    sourceUptime: Number.isFinite(Number(row.uptime_percent)) ? Number(row.uptime_percent) : null,
    sourceLastChecked: row.last_checked ? new Date(Number(row.last_checked) * 1000) : null
  };
}

export function normalizeProxyScrapeLine(line: string): ProxyCandidate | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return normalizeProxyScrape({ protocol: parsed.protocol.replace(":", ""), ip: parsed.hostname, port: parsed.port });
  } catch {
    return null;
  }
}

export class ProxyScrapeSource implements ProxySource {
  name = "proxyscrape";
  async fetchCandidates() {
    const response = await fetch(config.PROXY_SOURCE_URL, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`source_http_${response.status}`);
    if ((response.headers.get("content-type") ?? "").includes("json")) {
      const payload = await response.json() as SourceRow[] | { proxies?: SourceRow[] };
      const rows = Array.isArray(payload) ? payload : payload.proxies ?? [];
      return rows.map(normalizeProxyScrape).filter((item): item is ProxyCandidate => Boolean(item));
    }
    const text = await response.text();
    return text.split(/\r?\n/).map(normalizeProxyScrapeLine).filter((item): item is ProxyCandidate => Boolean(item));
  }
}
