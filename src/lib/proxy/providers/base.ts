import type { ProxyProtocol } from "@prisma/client";
import { config } from "../../config";
import { parseProxyLine } from "../parser";
import type { ProxyCandidate, ProxySource } from "../types";

export type ProviderEndpoint = { url: string; format: "text" | "json"; protocol?: ProxyProtocol; countryReported?: string; countryFilter?: string };

function rowsFrom(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  for (const key of ["data", "proxies", "results", "items"]) if (object[key]) { const rows = rowsFrom(object[key]); if (rows.length) return rows; }
  return [];
}

function nested(object: Record<string, unknown>, ...path: string[]) {
  let value: unknown = object;
  for (const key of path) value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
  return value;
}

function parseRow(row: Record<string, unknown>, source: string, endpoint: ProviderEndpoint): ProxyCandidate | null {
  const raw = typeof row.proxy === "string" ? row.proxy : typeof row.url === "string" ? row.url : undefined;
  const parsed = raw ? parseProxyLine(raw, source, endpoint.protocol ?? "HTTP") : null;
  const ip = String(row.ip ?? row.host ?? parsed?.ip ?? "").trim();
  const port = Number(row.port ?? parsed?.port);
  const protocol = String(row.protocol ?? row.type ?? parsed?.protocol ?? endpoint.protocol ?? "HTTP").toUpperCase() as ProxyProtocol;
  const shortCountry = typeof row.country === "string" && row.country.length <= 3 ? row.country : undefined;
  const countryCode = String(row.country_code ?? row.countryCode ?? shortCountry ?? nested(row, "geolocation", "country", "iso_code") ?? nested(row, "geolocation", "country") ?? endpoint.countryReported ?? "").toUpperCase() || null;
  const candidate = parseProxyLine(`${protocol.toLowerCase()}://${ip}:${port}`, source, protocol);
  if (!candidate || (endpoint.countryFilter && countryCode !== endpoint.countryFilter)) return null;
  return { ...candidate, countryCode, countryReported: countryCode, country: typeof row.countryName === "string" ? row.countryName : typeof row.country === "string" && row.country.length > 3 ? row.country : null, city: String(row.city ?? nested(row, "geolocation", "city", "names", "en") ?? nested(row, "geolocation", "city") ?? "") || null, anonymity: typeof row.anonymity === "string" ? row.anonymity : null, sourceLatency: Number.isFinite(Number(row.latency_ms ?? row.response_ms ?? row.latencyMs ?? row.latency)) ? Math.round(Number(row.latency_ms ?? row.response_ms ?? row.latencyMs ?? row.latency)) : null, sourceUptime: Number.isFinite(Number(row.uptime ?? row.uptimePct ?? row.uptime_pct ?? row.uptime_percent)) ? Number(row.uptime ?? row.uptimePct ?? row.uptime_pct ?? row.uptime_percent) : null };
}

export abstract class EndpointProvider implements ProxySource {
  abstract name: string;
  protected abstract endpoints: ProviderEndpoint[];

  async fetchCandidates(options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<ProxyCandidate[]> {
    const candidates: ProxyCandidate[] = []; const errors: string[] = [];
    for (const endpoint of this.endpoints) {
      try {
        const response = await fetch(endpoint.url, { signal: AbortSignal.any([AbortSignal.timeout(options.timeoutMs ?? config.SOURCE_FETCH_TIMEOUT_MS), ...(options.signal ? [options.signal] : [])]), cache: "no-store", headers: { "user-agent": "FactorX-Proxys/1.0" } });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        if (endpoint.format === "text") {
          for (const line of (await response.text()).split(/\r?\n/)) {
            const candidate = parseProxyLine(line, this.name, endpoint.protocol ?? "HTTP");
            if (candidate) candidates.push({ ...candidate, countryCode: endpoint.countryReported ?? null, countryReported: endpoint.countryReported ?? null });
          }
        } else {
          for (const row of rowsFrom(await response.json())) { const candidate = parseRow(row, this.name, endpoint); if (candidate) candidates.push(candidate); }
        }
      } catch (error) { errors.push(error instanceof Error ? error.message : "UNKNOWN"); }
    }
    if (!candidates.length && errors.length === this.endpoints.length) throw new Error(`${this.name}:${errors.join(",").slice(0, 160)}`);
    return candidates;
  }
}
