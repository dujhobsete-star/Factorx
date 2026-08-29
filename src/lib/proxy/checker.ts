import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import { config } from "../config";
import type { ProxyCandidate, ProxyChecker } from "./types";

export class RealProxyChecker implements ProxyChecker {
  async check(candidate: ProxyCandidate) {
    const started = Date.now();
    try {
      const proxyUrl = `${candidate.protocol.toLowerCase()}://${candidate.ip}:${candidate.port}`;
      const socks = candidate.protocol === "SOCKS4" || candidate.protocol === "SOCKS5";
      await axios.get(config.PROXY_VALIDATION_URL, {
        timeout: config.PROXY_TEST_TIMEOUT_MS,
        signal: AbortSignal.timeout(config.PROXY_TEST_TIMEOUT_MS),
        validateStatus: (status) => status >= 200 && status < 400,
        ...(socks ? { httpAgent: new SocksProxyAgent(proxyUrl), httpsAgent: new SocksProxyAgent(proxyUrl), proxy: false as const }
          : { proxy: { protocol: candidate.protocol.toLowerCase(), host: candidate.ip, port: candidate.port } })
      });
      return { success: true, latencyMs: Date.now() - started };
    } catch (error) {
      const code = axios.isAxiosError(error) ? (error.code ?? "proxy_error") : "unknown_error";
      return { success: false, errorType: String(code).slice(0, 80) };
    }
  }
}
