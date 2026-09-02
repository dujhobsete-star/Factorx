import { isIP } from "node:net";
import type { ProxyProtocol } from "@prisma/client";
import type { ProxyCandidate } from "./types";

const supported = new Set<ProxyProtocol>(["HTTP", "HTTPS", "SOCKS4", "SOCKS5"]);

export function parseProxyLine(input: string, source: string, defaultProtocol: ProxyProtocol = "HTTP"): ProxyCandidate | null {
  const value = input.trim();
  if (!value || value.startsWith("#")) return null;
  try {
    const withScheme = value.includes("://") ? value : `${defaultProtocol.toLowerCase()}://${value}`;
    const parsed = new URL(withScheme);
    const protocol = parsed.protocol.slice(0, -1).toUpperCase() as ProxyProtocol;
    const explicitPort = withScheme.match(/:(\d+)(?:\/)?$/)?.[1];
    const port = Number(parsed.port || explicitPort);
    if (!supported.has(protocol) || !isIP(parsed.hostname) || !Number.isInteger(port) || port < 1 || port > 65_535) return null;
    return {
      ip: parsed.hostname,
      port,
      protocol,
      source,
      username: parsed.username ? decodeURIComponent(parsed.username) : null,
      password: parsed.password ? decodeURIComponent(parsed.password) : null,
    };
  } catch {
    return null;
  }
}
