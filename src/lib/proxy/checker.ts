import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import { config } from "../config";
import type { ProxyCandidate, ProxyChecker } from "./types";
import { isPublicIPv4 } from "./public-ip";

export class RealProxyChecker implements ProxyChecker {
  constructor(private readonly options: { signal?: AbortSignal; timeoutMs?: number } = {}) {}
  async check(candidate: ProxyCandidate) {
    if (!isPublicIPv4(candidate.ip)) return { success: false, errorType: "UNSAFE_ADDRESS" };
    const started = Date.now();
    const timeout = this.options.timeoutMs ?? config.PROXY_TEST_TIMEOUT_MS;
    const signal = AbortSignal.any([AbortSignal.timeout(timeout), ...(this.options.signal ? [this.options.signal] : [])]);
    let agent: SocksProxyAgent | undefined;
    try {
      const auth = candidate.username ? `${encodeURIComponent(candidate.username)}:${encodeURIComponent(candidate.password ?? "")}@` : "";
      const proxyUrl = `${candidate.protocol.toLowerCase()}://${auth}${candidate.ip}:${candidate.port}`;
      const socks = candidate.protocol === "SOCKS4" || candidate.protocol === "SOCKS5";
      if (socks) agent = new SocksProxyAgent(proxyUrl, { timeout });
      const response = await axios.get(config.PROXY_VALIDATION_URL, {
        timeout, signal, maxRedirects: 0, maxContentLength: 16384,
        validateStatus: (status) => status >= 200 && status < 300,
        ...(socks ? { httpAgent: agent, httpsAgent: agent, proxy: false as const }
          : { proxy: { protocol: "http", host: candidate.ip, port: candidate.port, ...(candidate.username ? { auth: { username: candidate.username, password: candidate.password ?? "" } } : {}) } })
      });
      const origin = typeof response.data === "object" && response.data && "origin" in response.data ? String(response.data.origin) : "";
      if (!origin) return { success: false, errorType: "INVALID_RESPONSE" };
      const exitIp = origin.split(",")[0]?.trim();
      if (!exitIp || !isPublicIPv4(exitIp)) return { success: false, errorType: "INVALID_RESPONSE" };
      const latencyMs = Date.now() - started;
      let countryVerified: string | undefined;
      if (exitIp) {
        try {
          const geo = await fetch(`${config.GEOLOOKUP_URL}/${encodeURIComponent(exitIp)}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(2500)]), redirect: "error" });
          if (geo.ok) countryVerified = String(((await geo.json()) as { country?: string }).country ?? "").toUpperCase() || undefined;
        } catch { /* geolocation is enrichment, not proxy validity */ }
      }
      return { success: true, latencyMs, exitIp, countryVerified };
    } catch (error) {
      const code = axios.isAxiosError(error) ? (error.code ?? "PROXY_ERROR") : "UNKNOWN";
      const normalized: Record<string, string> = { ECONNABORTED: "TIMEOUT", ETIMEDOUT: "TIMEOUT", ECONNREFUSED: "CONNECTION_REFUSED", ECONNRESET: "CONNECTION_RESET", ENOTFOUND: "DNS_ERROR", EAI_AGAIN: "DNS_ERROR", ERR_BAD_RESPONSE: "INVALID_RESPONSE" };
      return { success: false, errorType: normalized[String(code)] ?? String(code).toUpperCase().slice(0, 80) };
    } finally {
      agent?.destroy();
    }
  }
}
