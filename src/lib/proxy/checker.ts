import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import { config } from "../config";
import type { ProxyCandidate, ProxyChecker } from "./types";

export class RealProxyChecker implements ProxyChecker {
  async check(candidate: ProxyCandidate) {
    const started = Date.now();
    try {
      const auth = candidate.username ? `${encodeURIComponent(candidate.username)}:${encodeURIComponent(candidate.password ?? "")}@` : "";
      const proxyUrl = `${candidate.protocol.toLowerCase()}://${auth}${candidate.ip}:${candidate.port}`;
      const socks = candidate.protocol === "SOCKS4" || candidate.protocol === "SOCKS5";
      const response = await axios.get(config.PROXY_VALIDATION_URL, {
        timeout: config.PROXY_TEST_TIMEOUT_MS,
        signal: AbortSignal.timeout(config.PROXY_TEST_TIMEOUT_MS),
        validateStatus: (status) => status >= 200 && status < 400,
        ...(socks ? { httpAgent: new SocksProxyAgent(proxyUrl), httpsAgent: new SocksProxyAgent(proxyUrl), proxy: false as const }
          : { proxy: { protocol: "http", host: candidate.ip, port: candidate.port, ...(candidate.username ? { auth: { username: candidate.username, password: candidate.password ?? "" } } : {}) } })
      });
      const origin = typeof response.data === "object" && response.data && "origin" in response.data ? String(response.data.origin) : "";
      if (!origin) return { success: false, errorType: "INVALID_RESPONSE" };
      const exitIp = origin.split(",")[0]?.trim();
      let countryVerified: string | undefined;
      if (exitIp) {
        try {
          const geo = await fetch(`${config.GEOLOOKUP_URL}/${encodeURIComponent(exitIp)}`, { signal: AbortSignal.timeout(2500) });
          if (geo.ok) countryVerified = String(((await geo.json()) as { country?: string }).country ?? "").toUpperCase() || undefined;
        } catch { /* geolocation is enrichment, not proxy validity */ }
      }
      return { success: true, latencyMs: Date.now() - started, exitIp, countryVerified };
    } catch (error) {
      const code = axios.isAxiosError(error) ? (error.code ?? "PROXY_ERROR") : "UNKNOWN";
      const normalized: Record<string, string> = { ECONNABORTED: "TIMEOUT", ETIMEDOUT: "TIMEOUT", ECONNREFUSED: "CONNECTION_REFUSED", ECONNRESET: "CONNECTION_RESET", ENOTFOUND: "DNS_ERROR", EAI_AGAIN: "DNS_ERROR", ERR_BAD_RESPONSE: "INVALID_RESPONSE" };
      return { success: false, errorType: normalized[String(code)] ?? String(code).toUpperCase().slice(0, 80) };
    }
  }
}
