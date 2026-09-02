export type ExportProxy = { ip: string; port: number; protocol: string };

export function proxyAddress(proxy: ExportProxy, withProtocol = true) {
  return `${withProtocol ? proxy.protocol.toLowerCase() + "://" : ""}${proxy.ip}:${proxy.port}`;
}

export function factorXName(proxy: ExportProxy) {
  return `Factor X | ${proxy.protocol} | ${proxy.ip}:${proxy.port}`;
}

// Mihomo uses a separate name field. Never put branding in credentials or host.
// JSON is a YAML-compatible representation and safely escapes all string values.
export function buildNamedProfile(items: ExportProxy[]) {
  const unique = new Map<string, ExportProxy>();
  for (const proxy of items) {
    if (!["HTTP", "SOCKS5"].includes(proxy.protocol)) continue;
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(proxy.ip) || proxy.ip.split(".").some(n => Number(n) > 255)) continue;
    if (!Number.isInteger(proxy.port) || proxy.port < 1 || proxy.port > 65535) continue;
    unique.set(proxyAddress(proxy), proxy);
  }
  const proxies = [...unique.values()].map(proxy => ({ name: factorXName(proxy), type: proxy.protocol.toLowerCase(), server: proxy.ip, port: proxy.port }));
  const profile = {
    "mixed-port": 7890,
    "allow-lan": false,
    "bind-address": "127.0.0.1",
    mode: "rule",
    "log-level": "warning",
    proxies,
    "proxy-groups": [{ name: "Factor X", type: "select", proxies: proxies.map(p => p.name) }],
    rules: ["MATCH,Factor X"],
  };
  return { text: proxies.length ? JSON.stringify(profile, null, 2) + "\n" : "", count: proxies.length, omitted: items.length - proxies.length };
}
