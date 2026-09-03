import assert from "node:assert/strict";
import { dolphinEntries } from "../src/lib/proxy/export";

async function main() {
  const started = Date.now();
  const response = await fetch("https://factorx-lime.vercel.app/api/proxies?limit=10&protocol=HTTP", { signal: AbortSignal.timeout(65_000) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert(Array.isArray(result.proxies));
  assert(result.proxies.length > 0, "No live proxies approved on this request");
  assert(result.proxies.length <= 10);
  const entries = dolphinEntries(result.proxies);
  assert.equal(entries.length, result.proxies.length);
  for (const entry of entries) {
    const address = new URL(entry.address);
    assert.equal(address.protocol, "http:");
    assert.equal(address.username, "");
    assert.equal(address.password, "");
    assert(entry.name.startsWith("Factor X | HTTP | "));
  }
  for (const proxy of result.proxies) {
    assert(Date.parse(proxy.lastCheckedAt) >= started - 10_000, "Stale validation");
  }
  console.log(JSON.stringify({ productionApi: "OK", approved: entries.length, tested: result.tested, partial: result.partial, dolphinSyntax: "OK", dolphinAppTested: false }));
}
main().catch(() => { console.error("Dolphin export production validation failed; no credentials logged."); process.exitCode = 1; });
